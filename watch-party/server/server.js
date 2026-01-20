const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// مسار رئيسي حتى تتأكد إن السيرفر شغال وما تطلعلك رسالة خطأ بالمتصفح
app.get("/", (req, res) => {
  res.send("Watch Party Server is Running Successfully!");
});

// إعدادات الـ Socket.io مع السماح لـ Netlify بالاتصال (CORS)
const io = new Server(server, {
  cors: {
    origin: "*", // يسمح لكل المواقع بالاتصال، وهذا ضروري لـ Netlify
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // عند انضمام مستخدم لغرفة
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        time: 0,
        playing: false
      };
    }

    // مزامنة الحالة الحالية للغرفة للمنضم الجديد
    socket.emit("sync-state", rooms[roomId]);
  });

  // التحكم في التشغيل (Play)
  socket.on("play", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId] = { time, playing: true };
      socket.to(roomId).emit("play", time);
    }
  });

  // التحكم في الإيقاف (Pause)
  socket.on("pause", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId] = { time, playing: false };
      socket.to(roomId).emit("pause", time);
    }
  });

  // التحكم في التقديم والتأخير (Seek)
  socket.on("seek", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].time = time;
      socket.to(roomId).emit("seek", time);
    }
  });

  // الشات (Chat)
  socket.on("chat", ({ roomId, message }) => {
    socket.to(roomId).emit("chat", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// استخدام البورت اللي يوفره Render تلقائياً أو 3000 للتجربة المحلية
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});