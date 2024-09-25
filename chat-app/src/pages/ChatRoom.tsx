import React, { useState } from "react";
import "./styles.css";
import { Button, TextField, Box, Grid, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const SERVER =
  "wss://61fc25eb-66b2-4f09-8b21-68fee9e0e03f-prod.e1-us-east-azure.choreoapis.dev/mediationproject/nodechatapp/v1.0/";

const MESSAGE_TYPE_CONNECTION = 0;
const MESSAGE_TYPE_DISCONNECTION = 1;
const MESSAGE_TYPE_CHAT = 2;
// Function to generate a color based on the user's nickname
const getColorFromNickname = (nickname: string): string => {
  const hash = Array.from(nickname).reduce(
    (acc, char: string) => acc + char.charCodeAt(0),
    0
  );
  const hue = hash % 360; // Generate a hue based on the hash
  return `hsl(${hue}, 70%, 50%)`; // Return a color in HSL format
};

interface ChatMessage {
  message: string;
  sender: string;
  color: string;
}

const ChatRoom = ({
  chatroomId,
  bearerAccessToken,
  nickname,
}: {
  chatroomId: string;
  bearerAccessToken: string;
  nickname: string;
}) => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [accessToken] = useState(bearerAccessToken);

  const sendMessage = (message: string) => {
    if (ws && message) {
      const json = { type: MESSAGE_TYPE_CHAT, message };
      ws?.send(JSON.stringify(json));
      setInput("");
      addMessage(message, `${nickname} (You)`, getColorFromNickname(nickname));
    }
  };
  const addMessage = (
    message: string,
    sender: string = "",
    color: string = "black"
  ) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { message, sender, color },
    ]);
  };

  const createConnection = () => {
    if (accessToken == undefined || accessToken == "") {
        window.location.reload();
    }
    const socket = new WebSocket(`${SERVER}`, ["choreo-internal-API-Key", accessToken]);
    setWs(socket);

    socket.onopen = () => {
      const message = {
        type: MESSAGE_TYPE_CONNECTION,
        nickname,
        message: "Successfully connected!",
      };
      socket.send(JSON.stringify(message));
    };

    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      switch (message.type) {
        case MESSAGE_TYPE_CONNECTION:
          addMessage(
            `${message.nickname} joined.`,
            message.nickname,
            getColorFromNickname(message.nickname)
          );
          break;
        case MESSAGE_TYPE_DISCONNECTION:
          addMessage(
            `${message.nickname} left.`,
            message.nickname,
            getColorFromNickname(message.nickname)
          );
          break;
        case MESSAGE_TYPE_CHAT:
          addMessage(
            message.message,
            message.from,
            getColorFromNickname(message.from)
          );
          break;
        default:
          break;
      }
    };

    socket.onclose = () => {
      setWs(null);
      addMessage("You have been disconnected :(");
    };
  };

  const closeConnection = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  return (
    <Box
      sx={{
        padding: 2,
        maxWidth: 600,
        margin: "auto",
        border: "1px solid #ccc",
        borderRadius: 2,
      }}
    >
<div>
    <h2 style={{alignItems: 'center'}}>Personal Chat Room (1to1) </h2> {/* Add this line for Chatroom ID */}
    <Grid container spacing={2} sx={{ margin: 2, justifyContent: 'center' }}> {/* Center the content */}
    <Grid item xs={6}>
        <Button
            variant="outlined"
            onClick={ws ? closeConnection : createConnection}
            fullWidth
        >
            {ws ? "Disconnect" : "Connect"}
        </Button>
    </Grid>
</Grid>
</div>
      <Box
        sx={{
          height: 400,
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: 1,
          padding: 1,
          marginBottom: 2,
        }}
      >
        {messages.map((msg, index) => (
          <Typography key={index} variant="body1" style={{ color: msg.color }}>
            <strong>{msg.sender}:</strong> {msg.message}
          </Typography>
        ))}
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={8}>
          <TextField
            fullWidth
            variant="outlined"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message"
          />
        </Grid>
        <Grid item xs={4}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => sendMessage(input)}
            fullWidth
            style={{ marginTop: "10px" }}
          >
            Send
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChatRoom;
