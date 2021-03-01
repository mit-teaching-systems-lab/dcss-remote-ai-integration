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

This event is triggered when a DCSS client _connects_ or _reconnects_. The callback receives the `socket` object, whose `handshake` object which *must* contain an `auth` property, whose value is an object. 

The `auth` object *must* contain: 

- a `token` property, whose value is some uniquely identifying string value that is provided by a DCSS client. This value *must* be used as the "Room" id for this connecting client. 

- an `agent` property, whose value is an `Agent` object that indicates which `Agent` the DCSS client the intends to engage with. An `Agent` object, at minium, contains a property called `name`, whose value is a string that meaningfully identifies which Agent the remote service should activate. 


**`connection` events with socket objects that do not provide both `socket.handshake.auth.token` and `socket.handshake.auth.agent` _must_ be ignored.** 

`connection` callbacks are allowed to complete any arbitrary operations, however they *must* complete a _join_ for the "Room" identified by the value of `socket.handshake.auth.token`: 

```js
io.on('connection', socket => {
  socket.join(socket.handshake.auth.token);

  // 
  // ...Activate the agent that corresponds to `socket.handshake.auth.agent`
  // 
});
```

### `disconnect` 

- Client to Server
- Provided by Socket.io, see more [here](https://socket.io/docs/v3/client-socket-instance/#disconnect)


This event is triggered when a DCSS client _disconnects_. The callback receives the `socket` object, whose `handshake` object which *must* contain an `auth` property, whose value is an object. The `auth` object *must* contain a `token` property, whose value is some uniquely identifying string value that is provided by a DCSS client. This value *must* be used as the "Room" id for this disconnecting client. 


**`disconnect` messages that do not provide `socket.handshake.auth.token` _must_ be ignored.** 

`disconnect` callbacks are allowed to complete any arbitrary operations, however they *must* complete a _leave_ for the "Room" identified by the value of `socket.handshake.auth.token`: 

```js
io.on('connection', socket => {
  socket.join(socket.handshake.auth.token);
  // 
  // ...Activate the agent that corresponds to `socket.handshake.auth.agent`
  // 
  socket.on('disconnect', () => {
    socket.leave(socket.handshake.auth.token);
    // 
    // ...Deactivate the agent that corresponds to `socket.handshake.auth.agent`
    // 
  });
});
```

### `request` 

- Client to Server

This event is triggered when a DCSS client sends a `request` message. The callback receives a `payload` object which contains the following properties: 

| Property Name | Type   | Description | Required |
| ------------- | ------ | ----------- | -------- |
| `token`       | String | The value corresponding to `socket.handshake.auth.token` | Yes |
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
      token: "c22b5f9178342609428d6f51b2c5af4c0bde6a42", 
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

This event is emitted when the service has new data for a DCSS client. The `payload.token` (which *must* correspond to `socket.handshake.auth.token`) is used to message the correct client. The response object must include the following properties: : 

| Property Name | Type   | Description | Required |
| ------------- | ------ | ----------- | -------- |
| `token`       | String | The value corresponding to `socket.handshake.auth.token`; provided in the `payload` received when the `request` event was triggered. | Yes |
| `key`    | String | The variable name to associate with the result value; provided in the `payload` received when the `request` event was triggered. | Yes |
| `value`       | String | The data to operate on, which may be typed text input, an audio transcript, a button value, a slide id, etc; provided in the `payload` received when the `request` event was triggered.  | Yes |
| `result`       | Boolean | The result of the operation provided by the service must be either `true` or `false`. | Yes |

Example: 

```js
socket.on('request', payload => {
  const remoji = emojiRegexRGI();
  const result = remoji.test(payload.value);
  const response = {
    ...payload,
    result
  };
  console.log(response);
  /*
    {
      token: "c22b5f9178342609428d6f51b2c5af4c0bde6a42", 
      key: "userInput", 
      value: "something the user typed with an emoji 👍", 
      result: true, 
    }
   */  
  io.to(payload.token).emit('response', response);
});
```

### `interjection` 

- Server to Client

This event is emitted when the service has new data for a DCSS client. `interjection` messages can be emitted at any time (whereas `response` messages are initiated by a `request`). The `payload.token` (which *must* correspond to `socket.handshake.auth.token`) is used to message the correct client. The interjection object must include the following properties:

| Property Name | Type   | Description | Required |
| ------------- | ------ | ----------- | -------- |
| `token`       | String | The value corresponding to `socket.handshake.auth.token`. | Yes |
| `message`    | String | The interjection message content. | Yes |

Example: 

```js
io.on('connection', (socket) => {
  socket.join(socket.handshake.auth.token);

  socket.on('disconnect', () => {
    socket.leave(socket.handshake.auth.token);
  });

  socket.on('request', payload => {
    const {
      token, 
      value,
    } = payload;

    // "Process" the incoming data
    const remoji = emojiRegexRGI();
    const result = remoji.test(value);
    const response = {
      ...payload,
      result
    };

    // Send the response
    io.to(token).emit('response', response);
    
    // Store the response for async analysis
    // Use the socket as the key, since this 
    // is unique to each connection. 
    store.set(socket, [
      ...(store.get(socket) || []),
      response
    ]);
  });
});

// The following should serve only to illustrate
// how a service might use `interjection` events
// to asyncronously analyze data and interact with
// the client. 
const store = new Map();
const defaultThreshold = 2;
const thresholdMap = {};

setInterval(() => {
  const log = {};
  for (const [socket, responses] of store) {
    for (const response of responses) {
      const {
        token,
        result,
        value,
      } = response;

      if (!thresholdMap[token]) {
        thresholdMap[token] = defaultThreshold;
      }
      const threshold = thresholdMap[token];

      if (!log[response.token]) {
        log[response.token] = [];
      }

      if (response.result) {
        log[response.token].push(response);
      }

      if (log[response.token].length === threshold) {
        thresholdMap[token] += 2;
        const message = `
        You've used emojis in ${threshold} messages. You will trigger this message again if you use emojis in ${thresholdMap[token]} messages.
        `.trim();
        console.log(message);
        io.to(token).emit('interjection', {
          token,
          message
        });
        log[response.token].length = 0;
      }
    }
  }
}, 3000);
```
