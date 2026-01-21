const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

const io = new Server(server, { 
    cors: { origin: "*", methods: ["GET", "POST"] } 
});

const rooms = {};

io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, movieUrl, subContent }) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = { 
                time: 0, 
                playing: false, 
                movieUrl: movieUrl || "", 
                subContent: subContent || "" 
            };
        }
        // إرسال حالة الغرفة كاملة للعضو الجديد فور انضمامه
        socket.emit("sync-state", rooms[roomId]);
    });

    socket.on("play", (data) => {
        if (rooms[data.roomId]) {
            rooms[data.roomId].playing = true;
            rooms[data.roomId].time = data.time;
            socket.to(data.roomId).emit("play", data.time);
        }
    });

    socket.on("pause", (data) => {
        if (rooms[data.roomId]) {
            rooms[data.roomId].playing = false;
            rooms[data.roomId].time = data.time;
            socket.to(data.roomId).emit("pause", data.time);
        }
    });

    socket.on("seek", (data) => {
        if (rooms[data.roomId]) {
            rooms[data.roomId].time = data.time;
            socket.to(data.roomId).emit("seek", data.time);
        }
    });

    socket.on("chat", (data) => {
        if (data.roomId && data.message.trim()) {
            io.to(data.roomId).emit("chat", { 
                user: data.user, 
                message: data.message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Master Server running on port ${PORT}`));