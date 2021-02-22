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

io.on('connection', (socket) => {
  socket.join(socket.handshake.auth.token);

  socket.on('disconnect', () => {
    socket.leave(socket.handshake.auth.token);
  });

  /*
    THIS IS THE IMPORTANT PART FOR CONSTRUCTING AN AGENT THAT
    TEACHER MOMENTS CAN INTERACT WITH
  */
  socket.on('request', payload => {
    /*


     */

    const remoji = emojiRegexRGI();
    const result = remoji.test(payload.value);
    io.to(payload.token).emit('response', {
      ...payload,
      result
    });
  });
  /*
    END
  */
});

setInterval(() => io.emit('time', new Date().toTimeString()), 1000);
