# Chatroom
W.I.P. WebSocket-based chatroom application with Node.js + Express.js backend

![Cover](https://i.imgur.com/0I5RSGE.png)

## Message protocol
**message type codes**
- CONNECTION = 0
- DISCONNECTION = 1
- CHAT = 2
- UPDATE = 3

**server-to-client formats**
- **room connection:** {"type": 0, "room": \<room\>, "roomCount": \<roomCount\>, "roomMax": \<roomMax\>, "roomState": \<roomState\>, "nickname": "\<nickname\>"}
- **room disconnection:** {"type": 1, "room": \<room\>, "roomCount": \<roomCount\>, "roomMax": \<roomMax\>, "roomState": \<roomState\>, "nickname": "\<nickname\>"} 
- **chat relay:** {"type": 2, "from": "\<sender\>", "message": "\<message\>"}

**client-to-server formats**
- **established connection:** {"type": 0, "nickname": "\<nickname\>", "message": "\<message\>"}
- **disconnecting:** {"type": 1, "message": "\<message\>"}
- **chat:** {"type": 2, "message": "\<message\>"}
- **update user settings:** {"type": 3, "nickname": "\<nickname\>", "filter": \<Integer 0-2\>}
