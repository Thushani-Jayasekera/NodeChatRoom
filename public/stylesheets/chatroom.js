const PORT = 3000;
const SERVER = "ws://localhost"; // wss -> secure production, ws -> local development

const MESSAGE_TYPE_CONNECTION = 0;
const MESSAGE_TYPE_DISCONNECTION = 1;
const MESSAGE_TYPE_CHAT = 2;
const MESSAGE_TYPE_UPDATE = 3;

const ROOM_STATE_CLOSED = 0;
const ROOM_STATE_OPEN = 1;
const ROOM_STATE_INPROGRESS = 2;

var ws = null;
var nickname = "";
var modalActive = false;
var usersOnline = 1;

// Adds event listeners when the page is ready.
$(document).ready(function() {
    // Listens for keys being typed
    document.addEventListener('keyup', function(e) {
        
        if (e.code == "Enter" || e.code == "NumpadEnter" || e.code == "Return") {
            // Allows user to press enter to set nickname instead of pressing the set button
            if (modalActive) {
                let input = document.getElementById("nicknameInput").value
                setNickname(input)
            }
            // Allows user to press enter to send message instead of pressing the send button
            else {
                let input = document.getElementById("messageInput").value
                sendMessage(input)
            }
        }
    });

    // Nickname modal close button
    document.getElementById("nicknameClose").addEventListener("click", function() {
        document.getElementById("nicknameModal").setAttribute("style", "display: none;");
        modalActive = false;
    }, false);

    // Nickname set button
    document.getElementById("nicknameBtn").addEventListener("click", function() {
        let input = document.getElementById("nicknameInput").value
        setNickname(input);
    }, false);

    // Send message button
    document.getElementById("sendBtn").addEventListener("click", function() {
        let message = document.getElementById("messageInput").value
        sendMessage(message)
    }, false);

    // Connect/Disconnect button
    document.getElementById("connectBtn").addEventListener("click", function() {
        if (ws == null && nickname != "") {
            createConnection();
            document.getElementById("connectBtn").value = "Disconnect";
        }
        else if (ws == null && nickname == "") {
            document.getElementById("nicknameModal").setAttribute("style", "display: inline-block;");
            document.getElementById("nicknameInput").focus();
            modalActive = true;
        }
        else {
            closeConnection();
            document.getElementById("connectBtn").value = "Connect";
        }
    }, false);

    // Click on the nickname
    document.getElementById("nickname").addEventListener("click", function() {
        document.getElementById("nicknameModal").setAttribute("style", "display: inline-block;");
        document.getElementById("nicknameInput").focus();
        modalActive = true;
    }, false);
})

// Sets the users nickname to the given string.
// Params: newName -> string
function setNickname(newName) {
    if (newName != "" && newName.length >= 3 && newName.length <= 25) {
        nickname = newName.replace(/\s/g, ''); // removes whitespace.
        nickname = nickname.replace("(You)", ""); // removes '(You)' from names to prevent confusion.
        p = document.getElementById("nickname");
        p.innerText = nickname;

        // colors senders name pseudorandomly based off the first three letters of their name
        let color = randomColor(nickname);
        p.setAttribute("style", "color: rgb("+color.R+","+color.G+","+color.B+")");

        document.getElementById("nicknameModal").setAttribute("style", "display: none;");
        document.getElementById("nickname").innerText = nickname;
        modalActive = false;
    }
}

// Sends the given message to the websocket server.
// Params: message -> string
function sendMessage(message) {
    if (ws != null) {
        if (message != "") {
            let json = {"type": MESSAGE_TYPE_CHAT, "message": message};
            ws.send(JSON.stringify(json));

            document.getElementById("messageInput").value = "";
            addMessage(message, `${nickname} (You)`);

            return true;
        }
    }
    return false;
}

// Establishes a connection to the websocket server and adds websocket event listeners.
function createConnection() {
    ws = new WebSocket(`${SERVER}:${PORT}`);

    // On connection
    ws.addEventListener("open", () => {
        // Send connection confirmation to server
        let message = {"type": MESSAGE_TYPE_CONNECTION, "nickname": nickname, "message": "Successfully connected!"};
        ws.send(JSON.stringify(message));
    });

    // Receiving message
    ws.addEventListener("message", ({data}) => {
        let message = JSON.parse(data);

        updateUsersOnline(message.users);

        switch (message.type) {
            // Connection
            case MESSAGE_TYPE_CONNECTION:
                updateRoomDisplay(message.room, message.roomCount, message.roomMax, message.roomState);
                addMessage(`${message.nickname} joined.`);
                // Updates banner to show the user has been connected
                if (message.roomCount > 1) {
                    setBannerText("You have been connected to another user!");
                }
                else {
                    setBannerText("\u{1F310} Searching for other user...");
                }
                break;
            // Disconnection
            case MESSAGE_TYPE_DISCONNECTION:
                updateRoomDisplay(message.room, message.roomCount, message.roomMax, message.roomState);
                addMessage(`${message.nickname} left.`);
                if (message.roomCount == 1) {
                    setBannerText("\u{1F310} Searching for other user...")
                }
                break;
            // Chat
            case MESSAGE_TYPE_CHAT:
                addMessage(message.message, message.from);
                break;
            // Update
            case MESSAGE_TYPE_UPDATE:
                break;

            default:
                break;
        }
    });
}

// Closes the connection to the websocket server.
function closeConnection() {
    ws.close();
    ws = null;
    setBannerText("You have been disconnected :(");
    clearRoomDisplay()
}

// Adds the given message to the users chat box.
// Params: message -> string, sender? -> string
function addMessage(message, sender="") {
    let p = null;
    if (sender != "") {
        // creates span around the sender's name
        let span = document.createElement("span");
        let spanText = document.createTextNode(sender);
        span.appendChild(spanText);

        // colors senders name pseudorandomly based off the first three letters of their name
        let color = randomColor(sender);
        span.setAttribute("style", "color: rgb("+color.R+","+color.G+","+color.B+")");

        // creates p element to contain sender's name + the message
        p = document.createElement("p");
        p.appendChild(span);
        let pText = document.createTextNode(`: ${message}`);
        p.appendChild(pText);
    }
    else {
        // creates p element to contain the message
        p = document.createElement("p");
        let pText = document.createTextNode(message);
        p.appendChild(pText);
    }

    // adds new p element to the bottom of the messageContainer
    let div = document.getElementById("messageContainer");
    div.appendChild(p);

    // scrolls to bottom of messages when there is a new message.
    div.scrollTop = div.scrollHeight;
}

// Updates the displays showing the user the current room info.
// Params: roomNumber -> int, roomCount -> int, roomMax -> int, roomState -> int
function updateRoomDisplay(roomNumber, roomCount, roomMax, roomState) {
    let roomStateStr = "";
    switch (roomState) {
        default:
        case ROOM_STATE_CLOSED:
            roomStateStr = "Closed";
            break;
        case ROOM_STATE_OPEN:
            roomStateStr = "Open";
            break;
        case ROOM_STATE_INPROGRESS:
            roomStateStr = "In Progress";
            break;
    }
    document.getElementById("room").innerText = `Room ${roomNumber}: ${roomCount}/${roomMax} (${roomStateStr})`;
}

// Sets the text on the banner.
// Params: text -> string
function setBannerText(text) {
    document.getElementById("bannerText").innerText = text;
}

// Removes the room info display from the banner.
function clearRoomDisplay() {
    document.getElementById("room").innerText = "";
}

// Updates the display showing the user the number of users online.
// Params: users -> int
function updateUsersOnline(users) {
    usersOnline = users;
    document.getElementById("userCount").innerHTML = usersOnline;
}

// Generates a random color based on the first three characters of the seed.
// seed -> string
// Returns: {"R":int, "G":int, "B":int}
function randomColor(seed) {
    if (seed.length >= 3) {
        let rand = mulberry32(seed.charCodeAt(0) + seed.charCodeAt(1) + seed.charCodeAt(2));
        let r = Math.floor(rand()*255);
        let g = Math.floor(rand()*255);
        let b = Math.floor(rand()*255);

        // ;)
        if (seed == "GHC" || seed == "GHC (You)") {
            r = 36;
            g = 130;
            b = 189;
        }

        return {"R": r, "G": g, "B": b};
    }
    else {
        return {"R": 0, "G": 0, "B": 0};
    }
}

// Psuedorandom number generator
// Params: a -> int
// Returns: function
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}