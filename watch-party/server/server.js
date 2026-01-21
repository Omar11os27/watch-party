const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {}; 
// roomId: { movieUrl, subContent, time, playing }

io.on("connection", socket => {

  socket.on("create-room", data => {
    rooms[data.roomId] = {
      movieUrl: data.movieUrl,
      subContent: data.subContent,
      time: 0,
      playing: false
    };
  });

  socket.on("join-room", roomId => {
    socket.join(roomId);
    socket.emit("sync-state", rooms[roomId]);
  });

  socket.on("play", d => {
    rooms[d.roomId].playing = true;
    rooms[d.roomId].time = d.time;
    socket.to(d.roomId).emit("play", d.time);
  });

  socket.on("pause", d => {
    rooms[d.roomId].playing = false;
    rooms[d.roomId].time = d.time;
    socket.to(d.roomId).emit("pause", d.time);
  });

  socket.on("seek", d => {
    rooms[d.roomId].time = d.time;
    socket.to(d.roomId).emit("seek", d.time);
  });

  socket.on("chat", d => {
    io.to(d.roomId).emit("chat", d);
  });
});

server.listen(process.env.PORT || 3000);
