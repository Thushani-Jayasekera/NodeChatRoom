const PORT = 9090;

const MESSAGE_TYPE_CONNECTION = 0;
const MESSAGE_TYPE_DISCONNECTION = 1;
const MESSAGE_TYPE_CHAT = 2;

const ROOM_STATE_OPEN = 1;

const express = require("express");
const app = express();
const server = require("http").createServer(app);
const bodyParser = require("body-parser");
const path = require("path");
const { WebSocket } = require("ws");

var clientIDs = Array();
var roomIDs = Array();
var wsClients = Array();
var rooms = Array();

class Client {
  constructor(ws, nickname) {
    this.ws = ws;
    this.nickname = nickname;
    this.room = null;

    // Generates unique nonzero id ranging from 1 to 999999999
    this.id = 0;
    while (this.id == 0 || clientIDs.includes(this.id)) {
      this.id = Math.floor(Math.random() * 1000000000);
    }
    clientIDs.push(this.id);
  }
}
class Room {
  constructor(client = null, maxClients = 5, roomState = ROOM_STATE_OPEN) {
    this.clients = Array();
    this.maxClients = maxClients;
    this.roomState = roomState;
    if (client != null) {
      this.clients.push(client);
    }

    // Generates unique nonzero id ranging from 1 to 999999999
    this.id = 0;
    while (this.id == 0 || roomIDs.includes(this.id)) {
      this.id = Math.floor(Math.random() * 1000000000);
    }
    roomIDs.push(this.id);
  }

  addClient(client) {
    this.clients.push(client);
  }


  removeClient(client) {
    let index = this.clients.indexOf(client);
    this.clients.splice(index, 1);
    let json = {
      type: 1,
      room: this.id,
      roomCount: this.clients.length,
      roomMax: this.maxClients,
      roomState: this.roomState,
      nickname: client.nickname,
      users: wsClients.length,
    };
    this.broadcastMessage(JSON.stringify(json));
  }


  broadcastMessage(message, sender = null) {
    for (let i = 0; i < this.clients.length; i++) {
      let client = this.clients[i];
      if (client !== sender) {
        client.ws.send(message);
      }
    }
  }
}

// Converts websocket raw data into a string.
function parseSocketData(message) {
  let str = "";
  for (let n = 0; n < message.length; n += 1) {
    str += String.fromCharCode(message[n]);
  }
  return str;
}


app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Binds server to the port and stars listening.
server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

// ----- Websocket server -----
const wss = new WebSocket.Server({ server: server });


wss.on("connection", (ws, req) => {
  console.log(`Client websocket connected (${req.socket.remoteAddress})`);


  ws.on("message", (message) => {
    let strMessage = parseSocketData(message);
    let jsonMessage = JSON.parse(strMessage);
    console.log(
      `Message received from client websocket (${req.socket.remoteAddress}): ${strMessage}`
    );

    switch (jsonMessage.type) {
      case MESSAGE_TYPE_CONNECTION:
        let newClient = new Client(ws, jsonMessage.nickname);
        wsClients.push(newClient);

        let foundRoom = null;
        for (let i = 0; i < rooms.length; i++) {
          let room = rooms[i];
          if (
            room.clients.length < room.maxClients &&
            room.roomState == ROOM_STATE_OPEN
          ) {
            room.addClient(newClient);
            newClient.room = room;
            foundRoom = room;
            break;
          }
        }
        // If no rooms are found for the client, create a new one.
        if (foundRoom == null) {
          let newRoom = new Room(newClient);
          rooms.push(newRoom);
          newClient.room = newRoom;
          foundRoom = newRoom;
        }

        // Broadcast to room that a new client has joined.
        let json = {
          type: MESSAGE_TYPE_CONNECTION,
          room: foundRoom.id,
          roomCount: foundRoom.clients.length,
          roomMax: foundRoom.maxClients,
          roomState: foundRoom.roomState,
          nickname: newClient.nickname,
          users: wsClients.length,
        };
        newClient.room.broadcastMessage(JSON.stringify(json));
        break;

      case MESSAGE_TYPE_DISCONNECTION:
        break;

      case MESSAGE_TYPE_CHAT:
        for (let i = 0; i < wsClients.length; i++) {
          if (wsClients[i].ws == ws) {
            let sender = wsClients[i];
            let json = {
              type: 2,
              from: sender.nickname,
              message: jsonMessage.message,
              users: wsClients.length,
            };
            sender.room.broadcastMessage(JSON.stringify(json), sender);
            break;
          }
        }
        break;
      default:
        break;
    }
  });
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
  // Listens for when the client disconnects.
  ws.on("close", () => {
    console.log(`Client websocket disconnected (${req.socket.remoteAddress})`);
    for (let i = wsClients.length - 1; i >= 0; i--) {
      if (wsClients[i].ws == ws) {
        let client = wsClients[i];

        // Frees the clients id so that it can be reused.
        let idIndex = clientIDs.indexOf(client.id);
        clientIDs.splice(idIndex, 1);

        // Removes client from its room
        client.room.removeClient(client);

        // Destroys the client's room if it is now empty.
        if (client.room.clients.length < 1) {
          // Removes room from global rooms array
          let room = client.room;
          for (let j = rooms.length - 1; j >= 0; j--) {
            if (rooms[j] === room) {
              rooms.splice(j, 1);
            }
          }

          // Frees the rooms id so that it can be reused.
          let roomIndex = roomIDs.indexOf(room.id);
          roomIDs.splice(roomIndex, 1);
        }

        // Removes client from global wsClients array.
        wsClients.splice(i, 1);
      }
    }
  });
});
