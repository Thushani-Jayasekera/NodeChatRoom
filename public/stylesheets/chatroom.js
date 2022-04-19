var PORT = 3000;

var MESSAGE_TYPE_CONNECTION = 0;
var MESSAGE_TYPE_DISCONNECTION = 1;
var MESSAGE_TYPE_CHAT = 2;

var ROOM_STATE_CLOSED = 0;
var ROOM_STATE_OPEN = 1;
var ROOM_STATE_INPROGRESS = 2;

var ws = null;
var nickname = "";
var modalActive = false;

// Listens for keys being typed
document.addEventListener('keyup', function(e) {
    console.log(e.code)
    // Allows user to press enter to send message instead of pressing the send button
    if (e.code == "Enter" || e.code == "NumpadEnter" || e.code == "Return") {
        if (modalActive) {
            let input = document.getElementById("nicknameInput").value
            setNickname(input)
        }
        else {
            let input = document.getElementById("messageInput").value
            sendMessage(input)
        }
    }
});

$(document).ready(function() {
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

function setNickname(name) {
    if (name != "" && name.length >= 3 && name.length <= 25) {
        nickname = name;
        p = document.getElementById("nickname");
        p.innerText = name;

        // colors senders name pseudorandomly based off the first three letters of their name
        rand = mulberry32(name.charCodeAt(0) + name.charCodeAt(1) + name.charCodeAt(2));
        let r = Math.floor(rand()*255);
        let g = Math.floor(rand()*255);
        let b = Math.floor(rand()*255);

        // ;)
        if (name == "GHC") {
            r = 36;
            g = 130;
            b = 189;
        }

        p.setAttribute("style", "color: rgb("+r+","+g+","+b+")");

        document.getElementById("nicknameModal").setAttribute("style", "display: none;");
        document.getElementById("nickname").innerText = name;
        modalActive = false;
    }
}

function sendMessage(message) {
    if (ws != null) {
        if (message != "") {
            let json = {"type": MESSAGE_TYPE_CHAT, "message": message};
            ws.send(JSON.stringify(json));

            document.getElementById("messageInput").value = "";
            addMessage(message, nickname + " (You)");

            return true;
        }
    }
    return false;
}

function createConnection() {
    ws = new WebSocket("ws://localhost:" + PORT); // wss -> secure production; ws -> local development

    // On connection
    ws.addEventListener("open", () => {
        // Send connection confirmation to server
        let message = {"type": MESSAGE_TYPE_CONNECTION, "nickname": nickname, "message": "Successfully connected!"};
        ws.send(JSON.stringify(message));
    });

    // Receiving message
    ws.addEventListener("message", ({data}) => {
        console.log(data);
        let message = JSON.parse(data);

        switch (message.type) {
            // Connection
            case MESSAGE_TYPE_CONNECTION:
                updateRoomDisplay(message.room, message.roomCount, message.roomMax, message.roomState);
                addMessage(message.nickname + " joined.");
                // Updates banner to show the player has been connected
                if (message.roomCount > 1) {
                    setBannerText("You have been connected to another player! ...or have you \u{1f440}");
                }
                else {
                    setBannerText("\u{1F310} Searching for other player...");
                }
                break;
            // Disconnection
            case MESSAGE_TYPE_DISCONNECTION:
                updateRoomDisplay(message.room, message.roomCount, message.roomMax, message.roomState);
                addMessage(message.nickname + " left.");
                if (message.roomCount == 1) {
                    setBannerText("\u{1F310} Searching for other player...")
                }
                break;
            // Chat
            case MESSAGE_TYPE_CHAT:
                addMessage(message.message, message.from);
                break;

            default:
                break;
        }
    });
}

function closeConnection() {
    ws.close();
    ws = null;
    setBannerText("You have been disconnected :(");
    clearRoomDisplay()
}

function addMessage(message, sender="") {
    let p = null;
    if (sender != "") {
        // creates span around the sender's name
        let span = document.createElement("span");
        let spanText = document.createTextNode(sender);
        span.appendChild(spanText);

        // colors senders name pseudorandomly based off the first three letters of their name
        rand = mulberry32(sender.charCodeAt(0) + sender.charCodeAt(1) + sender.charCodeAt(2));
        let r = Math.floor(rand()*255);
        let g = Math.floor(rand()*255);
        let b = Math.floor(rand()*255);
        console.log("color: rgb("+r+","+g+","+b+")");
        span.setAttribute("style", "color: rgb("+r+","+g+","+b+")");

        // creates p element to contain sender's name + the message
        p = document.createElement("p");
        p.appendChild(span);
        let pText = document.createTextNode(": " + message);
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

function updateRoomDisplay(roomNumber, roomCount, roomMax, roomState) {
    let roomStateStr = "";
    switch (roomState) {
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
    document.getElementById("room").innerText = "Room " + roomNumber + ": " + roomCount + "/" + roomMax + " (" + roomStateStr + ")";
}

function setBannerText(text) {
    document.getElementById("bannerText").innerText = text;
}

function clearRoomDisplay() {
    document.getElementById("room").innerText = "";
}

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}