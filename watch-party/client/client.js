const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

const video = document.getElementById("video");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false;

// إدارة الدخول للغرفة
if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("أدخل رابط الفيلم المباشر (Direct Link):");
    if (!movieUrl) window.location.reload();
    window.history.pushState({}, '', `?room=${roomId}`);
    socket.emit("join-room", { roomId, movieUrl });
} else {
    socket.emit("join-room", { roomId });
}

// المزامنة عند دخول شخص جديد
socket.on("sync-state", state => {
    if (state.movieUrl && video.src !== state.movieUrl) {
        video.src = state.movieUrl;
    }
    // إذا الفرق بالوقت أكثر من 3 ثواني، سوي Seek
    if (Math.abs(video.currentTime - state.time) > 3) {
        video.currentTime = state.time;
    }
});

// إرسال الأوامر للسيرفر (عندما يقوم المستخدم بفعل)
video.onplay = () => {
    if (!isRemoteAction) socket.emit("play", { roomId, time: video.currentTime });
};
video.onpause = () => {
    if (!isRemoteAction) socket.emit("pause", { roomId, time: video.currentTime });
};
video.onseeking = () => {
    if (!isRemoteAction) socket.emit("seek", { roomId, time: video.currentTime });
};

// استقبال الأوامر من السيرفر (عندما يقوم صديق بفعل)
socket.on("play", time => {
    isRemoteAction = true;
    video.currentTime = time;
    video.play().finally(() => isRemoteAction = false);
});
socket.on("pause", time => {
    isRemoteAction = true;
    video.pause();
    setTimeout(() => isRemoteAction = false, 500);
});
socket.on("seek", time => {
    isRemoteAction = true;
    video.currentTime = time;
    setTimeout(() => isRemoteAction = false, 500);
});

// نظام الشات
function sendMessage() {
    const input = document.getElementById("msg");
    if (!input.value) return;
    socket.emit("chat", { roomId, message: input.value });
    input.value = "";
}

socket.on("chat", msg => {
    const messages = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "msg-item";
    div.textContent = msg;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
});