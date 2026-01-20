const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

const video = document.getElementById("video");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false; // لمنع حلقة التكرار بين الأجهزة

if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("أدخل رابط الفيلم المباشر:");
    if (!movieUrl) window.location.reload();
    window.history.pushState({}, '', `?room=${roomId}`);
    socket.emit("join-room", { roomId, movieUrl });
} else {
    socket.emit("join-room", { roomId });
}

socket.on("sync-state", state => {
    if (state.movieUrl && video.src !== state.movieUrl) {
        video.src = state.movieUrl;
    }
    // مزامنة الوقت فقط إذا كان الفرق كبير (أكثر من ثانيتين) لتجنب التقطيع
    if (Math.abs(video.currentTime - state.time) > 2) {
        video.currentTime = state.time;
    }
    if (state.playing) video.play().catch(() => {});
});

// إرسال الأوامر مع حماية
video.onplay = () => {
    if (isRemoteAction) return;
    socket.emit("play", { roomId, time: video.currentTime });
};

video.onpause = () => {
    if (isRemoteAction) return;
    socket.emit("pause", { roomId, time: video.currentTime });
};

video.onseeking = () => {
    if (isRemoteAction) return;
    socket.emit("seek", { roomId, time: video.currentTime });
};

// استقبال الأوامر مع حماية
socket.on("play", time => {
    isRemoteAction = true;
    video.currentTime = time;
    video.play().then(() => isRemoteAction = false).catch(() => isRemoteAction = false);
});

socket.on("pause", time => {
    isRemoteAction = true;
    video.currentTime = time;
    video.pause();
    setTimeout(() => isRemoteAction = false, 500);
});

socket.on("seek", time => {
    isRemoteAction = true;
    video.currentTime = time;
    setTimeout(() => isRemoteAction = false, 500);
});

// الشات
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