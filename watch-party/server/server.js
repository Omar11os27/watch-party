const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });
const rooms = {};

io.on("connection", socket => {
  socket.on("join-room", ({ roomId, movieUrl }) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { time: 0, playing: false, movieUrl: movieUrl || "" };
    }
    socket.emit("sync-state", rooms[roomId]);
  });

  // التحكم الشامل: نرسل لكل الغرفة (io.to) مو بس للآخرين (socket.to)
  socket.on("play", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].playing = true;
      rooms[roomId].time = time;
      io.to(roomId).emit("play", time);
    }
  });

  socket.on("pause", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].playing = false;
      rooms[roomId].time = time;
      io.to(roomId).emit("pause", time);
    }
  });

  socket.on("seek", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].time = time;
      io.to(roomId).emit("seek", time);
    }
  });

  socket.on("chat", ({ roomId, message }) => {
    io.to(roomId).emit("chat", message);
  });
});

server.listen(process.env.PORT || 3000);