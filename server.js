// Requirements
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const bodyParser = require('body-parser');
const res = require('express/lib/response');
const path = require('path');
const { WebSocket } = require('ws');
const { runInNewContext } = require('vm');
const { send } = require('process');

const PORT = 3000;
const MESSAGE_TYPE_CONNECTION = 0;
const MESSAGE_TYPE_DISCONNECTION = 1;
const MESSAGE_TYPE_CHAT = 2;

// Http server
app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.json())
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Views
app.get('/', (req, res) => res.render('pages/chatroom'));

server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`)
});

// Websocket server
var clientIDs = Array();
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

const ROOM_STATE_CLOSED = 0;
const ROOM_STATE_OPEN = 1;
const ROOM_STATE_INPROGRESS = 2;

var roomIDs = Array();
class Room {
    constructor(client = null, maxClients = 2, roomState = ROOM_STATE_OPEN) {
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
        let json = {"type": 1, "room": this.id, "roomCount": this.clients.length, "roomMax": this.maxClients, "roomState": this.roomState, "nickname": client.nickname};
        this.broadcastMessage(JSON.stringify(json));
    }
    broadcastMessage(message, sender=null) {
        for (let i = 0; i < this.clients.length; i++) {
            if (this.clients[i] !== sender) {
                this.clients[i].ws.send(message);
            }
        }
    }
}

var wsClients = Array();
var rooms = Array();

const wss = new WebSocket.Server({ server:server });
wss.on('connection', (ws) => {
    console.log('Client websocket connected');
    ws.on('message', (message) => {
        let strMessage = parseSocketData(message);
        let jsonMessage = JSON.parse(strMessage);
        console.log('Message received from client websocket: ' + strMessage);

        switch (jsonMessage.type) {
            case MESSAGE_TYPE_CONNECTION:
                // Create new client.
                let newClient = new Client(ws, jsonMessage.nickname);
                wsClients.push(newClient);

                // Attemps to place client into a prexisting open room.
                let foundRoom = null;
                for (let i = 0; i < rooms.length; i++) {
                    let room = rooms[i];
                    // Room must have less than the maximum number of clients and be in the 'open' state.
                    if (room.clients.length < room.maxClients && room.roomState == ROOM_STATE_OPEN) {
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
                let json = {"type": MESSAGE_TYPE_CONNECTION, "room": foundRoom.id, "roomCount": foundRoom.clients.length, "roomMax": foundRoom.maxClients, "roomState": foundRoom.roomState, "nickname": newClient.nickname};
                newClient.room.broadcastMessage(JSON.stringify(json));
                break;

            case MESSAGE_TYPE_DISCONNECTION:
                break;

            case MESSAGE_TYPE_CHAT:                
                for (let i = 0; i < wsClients.length; i++) {
                    if (wsClients[i].ws == ws) {
                        let sender = wsClients[i];
                        let json = {"type": 2, "from": sender.nickname, "message": jsonMessage.message};
                        sender.room.broadcastMessage(JSON.stringify(json), sender);
                        break;
                    }
                }
                break;

            default:
                break;
        }
    });
    ws.on('close', () => {
        console.log('Client websocket disconnected');
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


// Converts websocket raw data into a string.
function parseSocketData(message) {
    let str = "";
    for (let n = 0; n < message.length; n += 1) {
        str += String.fromCharCode(message[n]);
    }
    return str;
}