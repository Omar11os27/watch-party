const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// رسالة للتأكد من أن السيرفر شغال
app.get("/", (req, res) => {
  res.send("Watch Party Server is Active and Running!");
});

const io = new Server(server, {
  cors: {
    origin: "*", // يسمح لـ Netlify بالاتصال
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-room", ({ roomId, movieUrl }) => {
    socket.join(roomId);
    
    // إذا كانت الغرفة جديدة، نخزن الرابط
    if (!rooms[roomId]) {
      rooms[roomId] = {
        time: 0,
        playing: false,
        movieUrl: movieUrl || ""
      };
    }
    // إرسال حالة الغرفة للمستخدم الجديد (الرابط والوقت الحالي)
    socket.emit("sync-state", rooms[roomId]);
  });

  // مزامنة التشغيل (Play)
  socket.on("play", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].playing = true;
      rooms[roomId].time = time;
      socket.to(roomId).emit("play", time);
    }
  });

  // مزامنة الإيقاف (Pause)
  socket.on("pause", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].playing = false;
      rooms[roomId].time = time;
      socket.to(roomId).emit("pause", time);
    }
  });

  // مزامنة التقديم والتأخير (Seek)
  socket.on("seek", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].time = time;
      socket.to(roomId).emit("seek", time);
    }
  });

  // نظام الشات
  socket.on("chat", ({ roomId, message }) => {
    // نرسل الرسالة لكل الموجودين بالغرفة
    io.to(roomId).emit("chat", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});