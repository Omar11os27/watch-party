const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.get("/", (req, res) => {
  res.send("Watch Party Server is Active!");
});

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("join-room", ({ roomId, movieUrl }) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { time: 0, playing: false, movieUrl: movieUrl || "" };
    }
    socket.emit("sync-state", rooms[roomId]);
  });

  socket.on("play", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].playing = true;
      rooms[roomId].time = time;
      socket.to(roomId).emit("play", time);
    }
  });

  socket.on("pause", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].playing = false;
      rooms[roomId].time = time;
      socket.to(roomId).emit("pause", time);
    }
  });

  socket.on("seek", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].time = time;
      socket.to(roomId).emit("seek", time);
    }
  });

  socket.on("chat", ({ roomId, message }) => {
    // إرسال الرسالة لكل الغرفة لضمان ظهورها عند الجميع
    io.to(roomId).emit("chat", message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));