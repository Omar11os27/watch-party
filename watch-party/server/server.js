const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {}; 

io.on("connection", socket => {
  // إنشاء الغرفة أو تحديث بياناتها
  socket.on("create-room", data => {
    rooms[data.roomId] = {
      movieUrl: data.movieUrl,
      subContent: data.subContent,
      time: 0,
      playing: false
    };
    console.log(`Room Created: ${data.roomId}`);
  });

  socket.on("join-room", roomId => {
    socket.join(roomId);
    // إذا الغرفة موجودة، نرسل البيانات فوراً للشخص الجديد
    if (rooms[roomId]) {
      socket.emit("sync-state", rooms[roomId]);
    }
  });

  socket.on("play", d => {
    if (rooms[d.roomId]) {
      rooms[d.roomId].playing = true;
      rooms[d.roomId].time = d.time;
      socket.to(d.roomId).emit("play", d.time);
    }
  });

  socket.on("pause", d => {
    if (rooms[d.roomId]) {
      rooms[d.roomId].playing = false;
      rooms[d.roomId].time = d.time;
      socket.to(d.roomId).emit("pause", d.time);
    }
  });

  socket.on("seek", d => {
    if (rooms[d.roomId]) {
      rooms[d.roomId].time = d.time;
      socket.to(d.roomId).emit("seek", d.time);
    }
  });

  socket.on("chat", d => {
    io.to(d.roomId).emit("chat", d);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));