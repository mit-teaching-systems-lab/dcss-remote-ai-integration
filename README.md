# emoji-analysis

This repository contains an example websocket service that demonstrates the required functionality for a service to interact with the DCSS platform's AI integrations. 

## Requirements

### Socket.io

All services built to interact with DCSS's AI integrations are required to use [Socket.io](https://socket.io/) v3.0.0 (or greater). Socket.io provides "Room" capabilities that are used to determine which clients receive which messages, and must be used to send [`response`](#response) messages back to a DCSS client. 


## Events

### `connection`

- Client to Server
- Provided by Socket.io, see more [here](https://socket.io/docs/v3/server-api/#Event-%E2%80%98connection%E2%80%99)

This event is triggered when a DCSS client _connects_ or _reconnects_. The callback receives the `socket` object, whose `handshake` object which *must* contain an `auth` property, whose value is an object. The `auth` object *must* contain a `token` property, whose value is some uniquely identifying string value that is provided by a DCSS client. This value *must* be used as the "Room" id for this connecting client. `connection` events with socket objects that do not provide `socket.handshake.auth.token` *must* be ignored. 

`connection` callbacks are allowed to complete any arbitrary operations, however they *must* complete a _join_ for the "Room" identified by the value of `socket.handshake.auth.token`: 

```js
io.on('connection', socket => {
  socket.join(socket.handshake.auth.token);
});
```

### `disconnect` 

- Client to Server
- Provided by Socket.io, see more [here](https://socket.io/docs/v3/client-socket-instance/#disconnect)


This event is triggered when a DCSS client _disconnects_. The callback receives the `socket` object, whose `handshake` object which *must* contain an `auth` property, whose value is an object. The `auth` object *must* contain a `token` property, whose value is some uniquely identifying string value that is provided by a DCSS client. This value *must* be used as the "Room" id for this disconnecting client. `disconnect` messages that do not provide `socket.handshake.auth.token` *must* be ignored. 

`disconnect` callbacks are allowed to complete any arbitrary operations, however they *must* complete a _leave_ for the "Room" identified by the value of `socket.handshake.auth.token`: 

```js
io.on('connection', socket => {
  socket.join(socket.handshake.auth.token);

  socket.on('disconnect', () => {
    socket.leave(socket.handshake.auth.token);
  });
});
```

### `request` 

- Client to Server

This event is triggered when a DCSS client sends a `request` message. The callback receives a `payload` object which contains the following properties: 

| Property Name | Type   | Description | Required |
| ------------- | ------ | ----------- | -------- |
| `token`       | String | The value corresponding to `socket.handshake.auth.token` | Yes |
| `key`    | String | The variable name to associate with the result value. | Yes |
| `value`       | String | The data to operate on, which may be typed text input, an audio transcript, a button value, a slide id, etc.  | Yes |

Example: 

```js
socket.on('request', payload => {
  console.log(payload);
  /*
    {
      token: "c22b5f9178342609428d6f51b2c5af4c0bde6a42", 
      key: "userInput", 
      value

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
  io.to(payload.token).emit('response', {
    ...payload,
    result
  });
});
```



