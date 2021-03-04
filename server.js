let fs;

try {
  // Node 14.x
  fs = require('fs/promises');
} catch (error) {
  // Node 12.x
  fs = require('fs').promises;
}

const express = require('express');
const emojiRegexRGI = require('emoji-regex/RGI_Emoji.js');
const SocketIO = require('socket.io');
const PORT = process.env.PORT || 4000;

const files = {
  '/': '/index.html',
  '/object_hash.js': '/node_modules/object-hash/dist/object_hash.js',
};

const app = express();

app.get('*', async (req, res) => {
  let file = files['/'];
  if (files[req.path]) {
    file = files[req.path];
  }
  const contents = await fs.readFile(`${__dirname}${file}`, 'utf8');
  res.send(contents.replace('/***PORT***/', `${PORT}`));
});

const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));
const io = SocketIO(server);

const cache = {};
const count = 0;

io.on('connection', (socket) => {
  const {
    token,
    agent,
    user,
    chat
  } = socket.handshake.auth;

  socket.join(user.id);

  console.log('Received token:', token);
  console.log('Received agent:', agent);
  console.log('Received chat:', chat);
  console.log('Received user:', user);
  console.log('socket.id', socket.id);

  if (!cache[user.id]) {
    cache[user.id] = {
      agent,
      chat,
      user,
      count,
      rx: [],
      tx: []
    };
    // Only send the welcome message when this is the
    // first time the specific user is connecting.
    //
    // Send the response to the specified private
    // channel for this client socket connection.
    io.to(user.id).emit('interjection', {
      message: `Hello ${user.name}, I will analyze all of your messages`
    });
  }

  /*
    THIS IS THE IMPORTANT PART FOR CONSTRUCTING AN AGENT THAT
    TEACHER MOMENTS CAN INTERACT WITH
  */
  socket.on('request', payload => {
    console.log('request', payload);
    if (!cache[user.id]) {
      // The session has been ended!
      return;
    }

    // Save user inputs for later. This
    // currently does nothing at all.
    cache[user.id].rx.push([
      'request', payload
    ]);

    // "Process" the incoming data
    const remoji = emojiRegexRGI();
    const result = remoji.test(payload.value);
    const response = {
      ...payload,
      result
    };

    // Send the response to the specified private
    // channel for this client socket connection.
    io.to(user.id).emit('response', response);

    // Store the response for async analysis
    // Use the socket as the key, since this
    // is unique to each connection.
    //
    // This is for demonstration only.
    cache[user.id].tx.push(response);
  });

  socket.on('end', ({ auth, chat, user }) => {
    if (cache[user.id]) {
      io.to(user.id).emit('interjection', {
        message: 'Goodbye!'
      });
      cache[user.id] = null;
    }
  });
  /*
    END
  */
});

setInterval(() => {
  const log = {};

  for (const {count, socket, user, tx} of Object.values(cache).filter(Boolean)) {
    const total = tx.reduce((accum, response) => accum + Number(response.result), 0);

    if (total > 0 && total !== count) {
      cache[user.id].count = total;
      const message = `You've used emojis in ${total} messages!`.trim();
      // Send the response to the specified private
      // channel for this client socket connection.
      io.to(user.id).emit('interjection', {
        message
      });
    }
  }
}, 1000);
