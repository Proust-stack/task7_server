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
    origin: [process.env.DOMEN_ALLOWED],
    credentials: true,
  },
});

instrument(io, {
  auth: false,
  mode: "development",
});

const users = [];

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
      socket.to(currentRoom).emit("room_joined", currentUser);
      users.push(currentUser);
      if (io.sockets.adapter.rooms.get(currentRoom).size === 2) {
        socket.emit("start_game", { start: true, symbol: "x", users });
        socket
          .to(currentRoom)
          .emit("start_game", { start: false, symbol: "o", users });
      }
    }
  });
  socket.on("update_game", (message) => {
    const gameRoom = getRoom(socket);
    socket.to(gameRoom).emit("on_game_update", message);
  });
  socket.on("user_leaving", (user) => {
    const gameRoom = getRoom(socket);
    socket.to(gameRoom).emit("user_leaved", user);
  });
  socket.on("game_ended", (winner) => {
    const gameRoom = getRoom(socket);
    socket.to(gameRoom).emit("game_ended", winner);
  });
});
