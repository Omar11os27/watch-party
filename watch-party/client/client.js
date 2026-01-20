const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);
const video = document.getElementById("video");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false; 

if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("أدخل رابط الفيلم:");
    if (!movieUrl) window.location.reload();
    window.history.pushState({}, '', `?room=${roomId}`);
    socket.emit("join-room", { roomId, movieUrl });
} else {
    socket.emit("join-room", { roomId });
}

// استقبال الأوامر وتطبيقها بقوة
socket.on("play", time => {
    isRemoteAction = true;
    video.currentTime = time;
    video.play().finally(() => setTimeout(() => isRemoteAction = false, 500));
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

// إرسال الأوامر فقط إذا كان المستخدم هو من حرك الفيديو يدوياً
video.onplay = () => { if (!isRemoteAction) socket.emit("play", { roomId, time: video.currentTime }); };
video.onpause = () => { if (!isRemoteAction) socket.emit("pause", { roomId, time: video.currentTime }); };
video.onseeked = () => { if (!isRemoteAction) socket.emit("seek", { roomId, time: video.currentTime }); };

// مزامنة حالة الدخول
socket.on("sync-state", state => {
    if (state.movieUrl) video.src = state.movieUrl;
    video.currentTime = state.time;
    if (state.playing) video.play().catch(() => {});
});

// الشات
function sendMessage() {
    const input = document.getElementById("msg");
    if (input.value.trim()) socket.emit("chat", { roomId, message: input.value });
    input.value = "";
}
socket.on("chat", msg => {
    const div = document.createElement("div");
    div.className = "msg-item"; div.textContent = msg;
    document.getElementById("messages").appendChild(div);
});