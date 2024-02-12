import fastify from 'fastify';
import cookie from '@fastify/cookie';
import { createPoll } from './routes/create-poll';
import { getPoll } from './routes/get-poll';
import { voteOnPoll } from './routes/vote-on-poll';
import Websocket from '@fastify/websocket';
import { getPollResults } from './ws/poll-results';

const app = fastify();

app.register(cookie, {
  secret: "pools-app-dutrak", 
  hook: 'onRequest', 
});

app.register(Websocket)

app.register(createPoll);
app.register(getPoll);
app.register(voteOnPoll);

app.register(getPollResults)

app.listen({ port: 3333 }).then(() => {
  console.log('Server is running on port 3333');
});



