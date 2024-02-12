import z from 'zod';
import { prisma } from '../../lib/prisma';
import { FastifyInstance } from 'fastify';
import { redis } from '../../lib/redis';

export async function getPoll(app: FastifyInstance) { 
  app.get('/polls/:pollid', async (request, reply) => { 
    const getPollParams = z.object({
      pollid: z.string().uuid(),
    }) 
  
    const { pollid } = getPollParams.parse(request.params);
  
    const poll = await prisma.poll.findUnique({
      where: {
        id: pollid,
      },

      include: {
        options: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    });

    // If the poll is not found, return an error
    if (!poll) {
      return reply.status(404).send({ error: 'Poll not found' });
    }

    // Get the votes for the poll from redis
    const result = await redis.zrange(pollid, 0, -1, 'WITHSCORES');
    
    // Convert the result to a object
    const votes = result.reduce((obj, line, i) => {
      if (i % 2 === 0) {
        const score = result[i + 1];
        Object.assign(obj, {[line]: parseInt(score)});
      }
      return obj;
    }, {} as Record<string, number>)

    // Return the poll with the votes
    return reply.send({
      id: poll.id,
      title: poll.title,
      options: poll.options.map(option => {
        return {
          id: option.id,
          title: option.title,
          score: votes[option.id] || 0,
        }
      })
    });
  })
}