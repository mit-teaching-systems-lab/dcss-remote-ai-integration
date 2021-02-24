/*
  This is an example of a remote process client
  that interacts with a valid AI Service.

  Concretely, this is how Teacher Moment's DCSS
  application server will interact with third
  party services.
*/
const {
  performance
} = require('perf_hooks');
const objectHash = require('object-hash');
const io = require('socket.io-client');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

const key = 'userInput';
const token = objectHash(performance.now()).slice(0, 10);
const endpoint = 'ws://emoji-analysis-production.herokuapp.com';
const transports = ['websocket', 'polling'];

console.log('token', token);
console.log('endpoint', endpoint);

const socket = io(endpoint, {
  transports,
  auth: {
    token
  }
});

socket.on('response', ({value, result}) => {
  console.log(`The text "${value}" ${result ? 'contains an emoji' : 'does not contain an emoji'}`);
});

socket.on('interjection', ({message}) => {
  console.log(message);
});

rl.prompt();

rl.on('line', (line) => {
  const value = line.trim();
  socket.emit('request', {
    token,
    key,
    value
  });
  rl.prompt();
}).on('close', () => {
  console.log('Goodbye!');
  process.exit(0);
});
