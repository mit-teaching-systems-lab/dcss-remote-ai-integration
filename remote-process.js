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

const token = objectHash(performance.now());
const endpoint = 'ws://emoji-analysis-production.herokuapp.com';
// const endpoint = 'http://localhost:4000';
const transports = ['websocket', 'polling'];
const agent = {
  name: 'Emoji Analysis'
};
const auth = {
  agent,
  token,
};

console.log('auth', auth);
console.log('endpoint', endpoint);

const socket = io(endpoint, {
  transports,
  auth
});

const annotations = [];

socket.on('response', ({value, result}) => {
  console.log(`The text "${value}" ${result ? 'contains an emoji' : 'does not contain an emoji'}`);
});

socket.on('interjection', ({message}) => {
  console.log(message);
});

rl.prompt();

rl.on('line', (line) => {
  const value = line.trim();
  const key = 'userInput';
  socket.emit('request', {
    annotations,
    key,
    token,
    value
  });
  rl.prompt();
}).on('close', () => {
  console.log('Goodbye!');
  process.exit(0);
});
