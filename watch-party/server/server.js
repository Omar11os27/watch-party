const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const rooms = {};

io.on("connection", socket => {

  socket.on("join-room", roomId => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        time: 0,
        playing: false
      };
    }

    socket.emit("sync-state", rooms[roomId]);
  });

  socket.on("play", ({ roomId, time }) => {
    rooms[roomId] = { time, playing: true };
    socket.to(roomId).emit("play", time);
  });

  socket.on("pause", ({ roomId, time }) => {
    rooms[roomId] = { time, playing: false };
    socket.to(roomId).emit("pause", time);
  });

  socket.on("seek", ({ roomId, time }) => {
    rooms[roomId].time = time;
    socket.to(roomId).emit("seek", time);
  });

  socket.on("chat", ({ roomId, message }) => {
    socket.to(roomId).emit("chat", message);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
