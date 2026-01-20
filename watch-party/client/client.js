const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

const video = document.getElementById("video");
const messagesDiv = document.getElementById("messages");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false;

// 1. طلب اسم المستخدم عند الدخول
let userName = localStorage.getItem("userName");
if (!userName) {
    userName = prompt("الرجاء إدخال اسمك:") || "مستخدم مجهول";
    localStorage.setItem("userName", userName);
}

// 2. إعداد الغرفة
if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("أدخل رابط الفيلم المباشر:");
    if (!movieUrl) window.location.reload();
    window.history.pushState({}, '', `?room=${roomId}`);
    socket.emit("join-room", { roomId, movieUrl });
} else {
    socket.emit("join-room", { roomId });
}

// مزامنة الفيديو
socket.on("sync-state", state => {
    if (state.movieUrl && video.src !== state.movieUrl) {
        video.src = state.movieUrl;
    }
    if (Math.abs(video.currentTime - state.time) > 1.5) {
        video.currentTime = state.time;
    }
    if (state.playing) video.play().catch(() => {});
});

// إرسال الأوامر (Play / Pause / Seek)
video.onplay = () => { if (!isRemoteAction) socket.emit("play", { roomId, time: video.currentTime }); };
video.onpause = () => { if (!isRemoteAction) socket.emit("pause", { roomId, time: video.currentTime }); };
video.onseeked = () => { if (!isRemoteAction) socket.emit("seek", { roomId, time: video.currentTime }); };

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

// ===== نظام الشات المتطور =====
function sendMessage() {
    const input = document.getElementById("msg");
    const text = input.value.trim();
    if (!text) return;

    const msgData = { roomId, message: text, user: userName };
    
    // إرسال للسيرفر
    socket.emit("chat", msgData);
    
    // إظهار الرسالة فوراً عندي (لتقليل التأخير)
    // ملاحظة: السيرفر راح يرسلها للبقية فقط
    input.value = "";
}

socket.on("chat", data => {
    addMessageToUI(data.user, data.message);
});

function addMessageToUI(user, message) {
    const div = document.createElement("div");
    div.className = "msg-item";
    // تمييز رسائلي بلون مختلف برمجياً
    if(user === userName) div.style.borderRight = "3px solid #e50914";
    
    div.innerHTML = `<strong>${user}:</strong> ${message}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

document.getElementById("msg").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});