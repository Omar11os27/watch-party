const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

const video = document.getElementById("video");
const messagesDiv = document.getElementById("messages");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false;

// طلب الاسم وحفظه
let userName = localStorage.getItem("userName") || prompt("أدخل اسمك للمشاركة:") || "مستخدم";
localStorage.setItem("userName", userName);

// إعداد الغرفة
if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("أدخل رابط m3u8 من سينمانا (Network -> m3u8):");
    if (!movieUrl) window.location.reload();
    window.history.pushState({}, '', `?room=${roomId}`);
    socket.emit("join-room", { roomId, movieUrl });
} else {
    socket.emit("join-room", { roomId });
}

// تشغيل روابط سينمانا والجودات تلقائياً
function loadSource(url) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
    }
}

socket.on("sync-state", state => {
    if (state.movieUrl && video.src !== state.movieUrl) {
        loadSource(state.movieUrl);
    }
    if (Math.abs(video.currentTime - state.time) > 2) video.currentTime = state.time;
    if (state.playing) video.play().catch(() => {});
});

// التزامن
video.onplay = () => { if (!isRemoteAction) socket.emit("play", { roomId, time: video.currentTime }); };
video.onpause = () => { if (!isRemoteAction) socket.emit("pause", { roomId, time: video.currentTime }); };
video.onseeked = () => { if (!isRemoteAction) socket.emit("seek", { roomId, time: video.currentTime }); };

socket.on("play", t => { isRemoteAction = true; video.currentTime = t; video.play().finally(() => isRemoteAction = false); });
socket.on("pause", t => { isRemoteAction = true; video.pause(); setTimeout(() => isRemoteAction = false, 500); });
socket.on("seek", t => { isRemoteAction = true; video.currentTime = t; setTimeout(() => isRemoteAction = false, 500); });

// الشات
function sendMessage() {
    const input = document.getElementById("msg");
    if (input.value.trim()) socket.emit("chat", { roomId, message: input.value, user: userName });
    input.value = "";
}

socket.on("chat", data => {
    const div = document.createElement("div");
    div.className = "msg-item";
    div.innerHTML = `<strong>${data.user}:</strong> ${data.message}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// حل مشكلة الكيبورد بالموبايل
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        document.body.style.height = window.visualViewport.height + 'px';
        window.scrollTo(0, 0);
    });
}