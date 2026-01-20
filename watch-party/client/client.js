const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

const video = document.getElementById("video");
const statusMsg = document.getElementById("status-msg");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false;

// إدارة الغرفة ورابط الفيلم
if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("أدخل رابط الفيلم المباشر لبدء الغرفة:");
    if (!movieUrl) window.location.reload();
    window.history.pushState({}, '', `?room=${roomId}`);
    socket.emit("join-room", { roomId, movieUrl });
} else {
    socket.emit("join-room", { roomId });
}

// استلام الحالة الابتدائية
socket.on("sync-state", state => {
    if (state.movieUrl && video.src !== state.movieUrl) {
        video.src = state.movieUrl;
    }
    if (Math.abs(video.currentTime - state.time) > 2) {
        video.currentTime = state.time;
    }
});

// التعامل مع ضعف النت
video.onwaiting = () => {
    if (!isRemoteAction) socket.emit("buffering", { roomId });
};

video.onplaying = () => {
    if (!isRemoteAction) socket.emit("resume", { roomId });
};

socket.on("show-buffer", (msg) => {
    isRemoteAction = true;
    video.pause();
    statusMsg.innerText = msg;
    statusMsg.style.display = "block";
});

socket.on("hide-buffer", () => {
    statusMsg.style.display = "none";
    video.play().finally(() => isRemoteAction = false);
});

// أحداث الفيديو الأساسية
video.onplay = () => {
    if (!isRemoteAction) socket.emit("play", { roomId, time: video.currentTime });
};

video.onpause = () => {
    if (!isRemoteAction) socket.emit("pause", { roomId, time: video.currentTime });
};

video.onseeking = () => {
    if (!isRemoteAction) socket.emit("seek", { roomId, time: video.currentTime });
};

// استقبال الأوامر
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
    addMessage("أنت: " + input.value);
    input.value = "";
}

socket.on("chat", msg => addMessage("صديقك: " + msg));

function addMessage(text) {
    const messages = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "msg-item";
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}