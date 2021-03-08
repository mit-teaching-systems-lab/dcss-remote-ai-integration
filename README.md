# DCSS Remote AI Service Integration 

This repository contains an example websocket service that demonstrates the required functionality for a service to interact with the DCSS platform's AI integrations. 

## Requirements

### Socket.io

All services built to interact with DCSS's AI integrations are required to use [Socket.io](https://socket.io/) v3.0.0 (or greater). Socket.io provides "Room" capabilities that are used to determine which clients receive which messages, and must be used to send [`response`](#response) messages back to a DCSS client. 

**Socket connections are created on a per-user basis by the DCSS client.**

## Terms

### client

Throughout this document, the word *client* always refers to the DCSS application, which is connecting and sending `request` messages to a service.

### server

Throughout this document, the word *server* always refers to the remote service. This repository contains a demonstration of a *server* in this context.

## Events

### `connection`

- Client to Server
- Provided by Socket.io, see more [here](https://socket.io/docs/v3/server-api/#Event-%E2%80%98connection%E2%80%99)

This event is triggered when a DCSS client _connects_ or _reconnects_. The callback receives the `socket` object, whose `handshake` property contains an object which *must* contain an `auth` property, whose value is an object. 

The `auth` object *must* contain: 

- an `agent` property, whose value is an `Agent` object that indicates which `Agent` the DCSS client the intends to engage with. An `Agent` object, at minium, contains a property called `name`, whose value is a string that meaningfully identifies which Agent the remote service should activate.
  
  **`connection` events with socket objects that do not provide a `socket.handshake.auth.agent` _must_ be ignored.** 

  ```
  auth {
    agent {
      id, 
      name, 
      configuration {
        ..
      }
    }
  }
  ```
    - The `agent` object may also contain a `configuration` property, whose value is an object containing key/value pairs that correspond to configuration options of the remote agent. 
- a `user` property, whose value is an object that indicates which client user is currently connecting. **Because a socket client may disconnect and reconnect, with differing `user.id` values on each connection, services _must_ use `user.id` as the private channel (ie. Socket.io's "Room") identifier**. 

  ```
  auth {
    user {
      id, 
      name, 
    }
  }
  ```
    - The `user` object may also contain properties that allow the service to create personalized messages.


The `auth` object *may* contain: 


- a `chat` property, whose value is a `Chat` object that indicates which `Chat` the user is currently in (the same user may engage in several scenarios over time, and each will have its own `Chat`). 
  ```
  auth {
    chat {
      id, 
    }
  }
  ```
    - The `chat` property will only be provided to agents that provide chat services. 

`connection` callbacks are allowed to complete any arbitrary operations, however **it _must_ call `socket.join(socket.handshake.auth.user.id)` to create or join a private channel for the client socket connection**. Not doing so will result in all messages being emitted to all client connections. Using `socket.id` will also result result in all messages being emitted to all client connections (See: [Socket.io's Emit cheatsheet
](https://socket.io/docs/v3/emit-cheatsheet/)).

```js
io.on('connection', socket => {
  socket.join(socket.handshake.auth.user.id);
  // 
  // ...Activate the agent that corresponds to `socket.handshake.auth.agent`
  // 
});
```

### `disconnect` 

- Client to Server
- Provided by Socket.io, see more [here](https://socket.io/docs/v3/client-socket-instance/#disconnect)

This event is triggered when a DCSS client _disconnects_. This event does not explicitly indicate that the session is over. There may be several `connect` and `disconnect` events during a given session. See [`end`](#end).

`disconnect` callbacks are allowed to complete any arbitrary operations, however they *must* call `socket.leave(socket.handshake.auth.user.id)` to leave the private channel for the client socket connection. 

```js
io.on('connection', socket => {
  socket.join(socket.handshake.auth.user.id);
  // 
  // ...Activate the agent that corresponds to `socket.handshake.auth.agent`
  // 
  socket.on('disconnect', () => {
    socket.leave(socket.handshake.auth.user.id);
    // 
    // ...Deactivate the agent that corresponds to `socket.handshake.auth.agent`
    // 
  });
});
```

### `end` 

- Client to Server

When the client is ready to end a specific engagement with an agent, the client must send an `end` event, with contents of the `auth`. The server may use the contents of `auth` to determine how to shut down the agent: 

| Property Name | Type   | Description | Required |
| ------------- | ------ | ----------- | -------- |
| `agent` | Object | The currently active **agent** for this socket.  | Yes |
| `chat`    | Object | The currently active **chat** for this socket.  | No |
| `user`    | Object | The currently active **user** for this socket.  | No |

Example: 
:
```js
socket.on('end', auth => {
  console.log(auth);
  /*
  {
    agent {
      id, 
      name, 
    },
    user {
      id, 
      username, 
      personalname 
    },
    chat {
      id, 
    }
  }
   */
});
```

### `request` 

- Client to Server

This event is triggered when a DCSS client sends a `request` message. The callback receives a `payload` object which contains the following properties: 

| Property Name | Type   | Description | Required |
| ------------- | ------ | ----------- | -------- |
| `annotations` | Array | An array of objects that describe prior outcomes of other services, if this request is being chained through services.  | Yes |
| `key`    | String | The variable name to associate with the result value. | Yes |
| `value`       | String | The data to operate on, which may be typed text input, an audio transcript, a button value, a slide id, etc.  | Yes |

Example: 
:
```js
socket.on('request', payload => {
  console.log(payload);
  /*
    {
      key: "userInput", 
      value: "something the user typed with an emoji 👍", 
      annotations: [
        // ...
      ]
    }
   */
});
```

### `response` 

- Server to Client

This event is emitted when the service has new data for a DCSS client. The response object *must* include the following properties: : 

| Property Name | Type   | Description | Required |
| ------------- | ------ | ----------- | -------- |
| `key`    | String | The variable name to associate with the result value; provided in the `payload` received when the `request` event was triggered. | Yes |
| `value`       | String | The data to operate on, which may be typed text input, an audio transcript, a button value, a slide id, etc; provided in the `payload` received when the `request` event was triggered.  | Yes |
| `result`       | Boolean | The result of the operation provided by the service *must* be either `true` or `false`. | Yes |

Example: 

```js
socket.on('request', payload => {
  const remoji = emojiRegexRGI();
  const result = remoji.test(payload.value);
  const response = {
    ...payload,
    result
  };
  /*
    {
      key: "userInput", 
      value: "something the user typed with an emoji 👍", 
      result: true, 
    }
   */  
  io.to(user.id).emit('response', response);
});
```

### `interjection` 

- Server to Client

This event is emitted when the service has new data for a DCSS client. `interjection` messages can be emitted at any time (whereas `response` messages are initiated by a `request`). The `payload.token` (which *must* correspond to `socket.handshake.auth.token`) is used to message the correct client. The interjection object *must* include the following properties:

| Property Name | Type   | Description | Required |
| ------------- | ------ | ----------- | -------- |
| `message`    | String | The interjection message content. | Yes |

Example: 

Basic...

```js
const message = 'Hello!';
socket.to(user.id).emit('interjection', {
  message
});
```

A bite more complex...

```js
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
      message: `Hello ${user.personalname || user.username}, I will analyze all of your messages`
    });
  }

  /*
    THIS IS THE IMPORTANT PART FOR CONSTRUCTING AN AGENT THAT
    TEACHER MOMENTS CAN INTERACT WITH
  */
  socket.on('request', payload => {
    if (!cache[user.id]) {
      // The session has been ended!
      return;
    }

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
```
