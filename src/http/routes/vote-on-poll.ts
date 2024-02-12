import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';
import { FastifyInstance } from 'fastify';
import { redis } from '../../lib/redis';
import { voting } from '../../utils/voting-pub-sub';

export async function voteOnPoll(app: FastifyInstance) { 
  app.post('/polls/:pollId/votes', async (request, reply) => { 

    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid(),
    }) 

    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    })
  
    const { pollId } = voteOnPollParams.parse(request.params);
    const { pollOptionId } = voteOnPollBody.parse(request.body);

    let { sessionId } = request.cookies;


    // Check if the user has already voted
    if (sessionId) {
      const userPreviousVote = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId,
          },
        }
      })

      // if the previous vote is the same as the current vote, return an error
      if (userPreviousVote && userPreviousVote.pollOptionId == pollOptionId) {
        return reply.status(400).send({ error: 'User has already voted' });
      }

      // if the previous vote is different from the current vote, delete the previous vote
      if (userPreviousVote && userPreviousVote.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: {
            id: userPreviousVote.id,
          }
        })
        const votes = await redis.zincrby(pollId, -1, userPreviousVote.pollOptionId)
        
        voting.publish(pollId, {
          pollOptionId: userPreviousVote.pollOptionId,
          votes: Number(votes),
        })
      }
    }

    // If the user has not voted, create a new cookie for the user
    if (!sessionId) {
      sessionId = randomUUID();
      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true,
        httpOnly: true,
      })
    }

    // Create a new vote
    await prisma.vote.create({
      data: {
        sessionId,
        pollOptionId,
        pollId,
      }
    });

    // Increment the vote count for the poll option in Redis
    const votes = await redis.zincrby(pollId, 1, pollOptionId)
    
    // Publish the vote to the WebSocket
    voting.publish(pollId, {
      pollOptionId,
      votes: Number(votes),
    })

  return reply.status(201).send({ success: true});
  })
}