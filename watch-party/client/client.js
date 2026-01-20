// استبدل هذا الرابط برابط الـ Render الخاص بك
const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

const video = document.getElementById("video");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false; // لمنع تكرار الأوامر

// إذا دخل المستخدم بدون رابط غرفة، ننشئ واحدة ونطلب رابط الفيلم
if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("أدخل رابط الفيلم المباشر (Direct Link):");
    if (!movieUrl) {
        alert("يجب إدخال رابط لبدء الغرفة!");
        window.location.reload();
    }
    window.history.pushState({}, '', `?room=${roomId}`);
    socket.emit("join-room", { roomId, movieUrl });
} else {
    socket.emit("join-room", { roomId });
}

// استلام الحالة من السيرفر عند الدخول أو التغيير
socket.on("sync-state", state => {
    if (state.movieUrl && video.src !== state.movieUrl) {
        video.src = state.movieUrl;
    }
    // مزامنة الوقت إذا كان الفرق أكثر من ثانيتين
    if (Math.abs(video.currentTime - state.time) > 2) {
        video.currentTime = state.time;
    }
    if (state.playing) video.play().catch(() => {});
});

// إرسال الأوامر للسيرفر
video.onplay = () => {
    if (!isRemoteAction) socket.emit("play", { roomId, time: video.currentTime });
};

video.onpause = () => {
    if (!isRemoteAction) socket.emit("pause", { roomId, time: video.currentTime });
};

video.onseeking = () => {
    if (!isRemoteAction) socket.emit("seek", { roomId, time: video.currentTime });
};

// استقبال الأوامر من السيرفر وتنفيذها
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
    if (!input.value) return;
    // نرسل الرسالة للسيرفر وهو يوزعها
    socket.emit("chat", { roomId, message: input.value });
    input.value = "";
}

socket.on("chat", msg => {
    const messages = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "msg-item";
    div.textContent = msg;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight; // نزول تلقائي لآخر رسالة
});

// دعم الإرسال عند ضغط Enter
document.getElementById("msg").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});