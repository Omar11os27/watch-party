const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });
const rooms = {};

io.on("connection", socket => {
  socket.on("join-room", ({ roomId, movieUrl, subUrl }) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { time: 0, playing: false, movieUrl: movieUrl || "", subUrl: subUrl || "" };
    }
    socket.emit("sync-state", rooms[roomId]);
  });

  socket.on("play", ({ roomId, time }) => { if (rooms[roomId]) { rooms[roomId].playing = true; socket.to(roomId).emit("play", time); } });
  socket.on("pause", ({ roomId, time }) => { if (rooms[roomId]) { rooms[roomId].playing = false; socket.to(roomId).emit("pause", time); } });
  socket.on("seek", ({ roomId, time }) => { if (rooms[roomId]) { rooms[roomId].time = time; socket.to(roomId).emit("seek", time); } });
  socket.on("chat", (data) => { io.to(data.roomId).emit("chat", data); });
});

server.listen(process.env.PORT || 3000);