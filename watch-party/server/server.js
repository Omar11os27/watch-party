const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// مسار للتأكد من عمل السيرفر على الرابط الأساسي
app.get("/", (req, res) => {
  res.send("Watch Party Server Pro is Running...");
});

const io = new Server(server, {
  cors: {
    origin: "*", // يسمح لـ Netlify بالاتصال
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // الانضمام لغرفة (أو إنشاؤها)
  socket.on("join-room", ({ roomId, movieUrl }) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = {
        time: 0,
        playing: false,
        movieUrl: movieUrl || ""
      };
    }
    // إرسال البيانات الحالية للمنضم الجديد
    socket.emit("sync-state", rooms[roomId]);
  });

  // مزامنة التشغيل
  socket.on("play", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].playing = true;
      rooms[roomId].time = time;
      socket.to(roomId).emit("play", time);
    }
  });

  // مزامنة الإيقاف
  socket.on("pause", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].playing = false;
      rooms[roomId].time = time;
      socket.to(roomId).emit("pause", time);
    }
  });

  // مزامنة التقديم والتأخير
  socket.on("seek", ({ roomId, time }) => {
    if (rooms[roomId]) {
      rooms[roomId].time = time;
      socket.to(roomId).emit("seek", time);
    }
  });

  // معالجة ضعف النت (Buffering)
  socket.on("buffering", ({ roomId }) => {
    io.to(roomId).emit("show-buffer", "أحد الأصدقاء يعاني من بطء في التحميل... يرجى الانتظار");
  });

  socket.on("resume", ({ roomId }) => {
    io.to(roomId).emit("hide-buffer");
  });

  // الشات
  socket.on("chat", ({ roomId, message }) => {
    socket.to(roomId).emit("chat", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});