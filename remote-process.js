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


const endpoint = process.env.NODE_ENV && process.env.NODE_ENV === 'production'
  ? 'ws://emoji-analysis-production.herokuapp.com'
  : 'http://localhost:4000';

const transports = ['websocket'];
const agent = {
  id: 1,
  name: 'Emoji Analysis'
};
const chat = {};
const user = {
  id: 2,
  personalname: 'Remote Process User',
  username: 'remote-process-user'
};
const auth = {
  agent,
  chat,
  user,
};
const configuration = {
  transports,
  auth
};

console.log('endpoint', endpoint);
console.log('configuration', configuration);

const socket = io(endpoint, configuration);

const annotations = [];

socket.on('response', ({value, result}) => {
  console.log(`The text "${value}" ${result ? 'contains an emoji' : 'does not contain an emoji'}`);
});

socket.on('interjection', ({message}) => {
  console.log(`Agent says: "${message}"`);
});

rl.prompt();

rl.on('line', (line) => {
  const value = line.trim();
  if (value === 'end') {
    socket.emit('end', auth);
    return;
  }

  const key = 'userInput';
  socket.emit('request', {
    annotations,
    key,
    value
  });
  rl.prompt();
}).on('close', () => {
  console.log('Goodbye!');
  process.exit(0);
});
