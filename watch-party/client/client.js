const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

const video = document.getElementById("video");
const messagesDiv = document.getElementById("messages");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false;

// طلب الاسم
let userName = localStorage.getItem("userName") || prompt("أدخل اسمك:") || "مستخدم";
localStorage.setItem("userName", userName);

if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("أدخل رابط الفيلم المباشر (m3u8 أو mp4):");
    if (!movieUrl) window.location.reload();
    window.history.pushState({}, '', `?room=${roomId}`);
    socket.emit("join-room", { roomId, movieUrl });
} else {
    socket.emit("join-room", { roomId });
}

// استخدام مكتبة Hls.js لدعم الجودات والترجمة تلقائياً
function initPlayer(url) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log("تم تحميل الجودات والترجمة بنجاح");
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
    }
}

socket.on("sync-state", state => {
    if (state.movieUrl && video.src !== state.movieUrl) {
        initPlayer(state.movieUrl);
    }
    if (Math.abs(video.currentTime - state.time) > 2) video.currentTime = state.time;
    if (state.playing) video.play().catch(() => {});
});

// تزامن الأوامر
video.onplay = () => { if (!isRemoteAction) socket.emit("play", { roomId, time: video.currentTime }); };
video.onpause = () => { if (!isRemoteAction) socket.emit("pause", { roomId, time: video.currentTime }); };
video.onseeked = () => { if (!isRemoteAction) socket.emit("seek", { roomId, time: video.currentTime }); };

socket.on("play", t => { isRemoteAction = true; video.currentTime = t; video.play().finally(() => isRemoteAction = false); });
socket.on("pause", t => { isRemoteAction = true; video.pause(); setTimeout(() => isRemoteAction = false, 500); });
socket.on("seek", t => { isRemoteAction = true; video.currentTime = t; setTimeout(() => isRemoteAction = false, 500); });

// الشات مع حل مشكلة الكيبورد
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

// تثبيت الرؤية عند فتح الكيبورد
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        document.body.style.height = window.visualViewport.height + 'px';
        window.scrollTo(0, 0);
    });
}