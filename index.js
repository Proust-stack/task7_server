const express = require("express");
const cors = require("cors");
const socket = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");
require("dotenv").config();

const getRoom = require("./utils/getRoom");

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

const server = app.listen(PORT, () =>
  console.log(`Server started on port ${PORT}`)
);

const io = socket(server, {
  cors: {
    origin: ["https://admin.socket.io", "http://localhost:3000"],
    credentials: true,
  },
});

instrument(io, {
  auth: false,
  mode: "development",
});

const rooms = {};

io.on("connection", (socket) => {
  socket.on("join_game", (currentRoom, currentUser) => {
    const connectedSockets = io.sockets.adapter.rooms.get(currentRoom);
    const socketRooms = Array.from(socket.rooms.values()).filter(
      (r) => r !== socket.id
    );
    if (
      socketRooms.length > 0 ||
      (connectedSockets && connectedSockets.size === 2)
    ) {
      socket.emit("room_join_error", {
        error: "Room is full please choose another room to play!",
      });
    } else {
      socket.join(currentRoom);
      socket.emit("room_joined", currentUser);
      if (io.sockets.adapter.rooms.get(currentRoom).size === 2) {
        socket.emit("start_game", { start: true, symbol: "x" });
        socket
          .to(currentRoom)
          .emit("start_game", { start: false, symbol: "o" });
      }
    }
  });
  socket.on("update_game", (board) => {
    console.log(board);
    const gameRoom = getRoom(socket);
    socket.to(gameRoom).emit("on_game_update", board);
  });
});
