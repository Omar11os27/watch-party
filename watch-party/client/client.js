const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

const video = document.getElementById("video");
const messagesDiv = document.getElementById("messages");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false;

if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("أدخل رابط الفيلم المباشر (Direct Link):");
    if (!movieUrl) window.location.reload();
    window.history.pushState({}, '', `?room=${roomId}`);
    socket.emit("join-room", { roomId, movieUrl });
} else {
    socket.emit("join-room", { roomId });
}

// مزامنة حالة الفيديو والرابط عند الدخول
socket.on("sync-state", state => {
    if (state.movieUrl && video.src !== state.movieUrl) {
        video.src = state.movieUrl;
        video.load(); // إعادة تحميل الفيديو للتأكد من اشتغاله
    }
    if (Math.abs(video.currentTime - state.time) > 2) {
        video.currentTime = state.time;
    }
    if (state.playing) video.play().catch(e => console.log("Auto-play blocked"));
});

// إرسال الأوامر
video.onplay = () => { if (!isRemoteAction) socket.emit("play", { roomId, time: video.currentTime }); };
video.onpause = () => { if (!isRemoteAction) socket.emit("pause", { roomId, time: video.currentTime }); };
video.onseeking = () => { if (!isRemoteAction) socket.emit("seek", { roomId, time: video.currentTime }); };

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

// ===== نظام الشات =====
function sendMessage() {
    const input = document.getElementById("msg");
    if (!input.value.trim()) return;
    socket.emit("chat", { roomId, message: input.value });
    input.value = "";
}

socket.on("chat", msg => {
    const div = document.createElement("div");
    div.className = "msg-item";
    div.textContent = msg;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// إرسال عند ضغط Enter
document.getElementById("msg").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});