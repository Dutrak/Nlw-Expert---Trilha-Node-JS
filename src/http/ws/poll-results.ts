import { FastifyInstance } from "fastify";
import { voting } from "../../utils/voting-pub-sub";
import z from "zod";

export async function getPollResults(app: FastifyInstance) { 
  app.get('/polls/:pollid/results', { websocket: true }, (connection, request) => { 

    const getPollResultsParams = z.object({
      pollid: z.string().uuid(),
    })

    const { pollid } = getPollResultsParams.parse(request.params);

    voting.subscribe(pollid, (message) => {
      connection.socket.send(JSON.stringify(message))
     })
  })
}