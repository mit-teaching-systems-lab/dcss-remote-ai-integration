const express = require('express');
const emojiRegexRGI = require('emoji-regex/RGI_Emoji.js');
const fs = require('fs/promises');
const SocketIO = require('socket.io');
const PORT = process.env.PORT || 3003;

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
  socket.join(socket.handshake.auth.chat.id);

  socket.on('disconnect', () => {
    socket.leave(socket.handshake.auth.chat.id);
  });

  /*
    THIS IS THE IMPORTANT PART FOR CONSTRUCTING AN AGENT THAT
    TEACHER MOMENTS CAN INTERACT WITH
  */
  socket.on('request', data => {
    const remoji = emojiRegexRGI();
    const result = remoji.test(data.message);
    io.to(data.chat.id).emit('response', {
      ...data,
      result
    });
  });
  /*
    END
  */
});

setInterval(() => io.emit('time', new Date().toTimeString()), 1000);
