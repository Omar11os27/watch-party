const SERVER_URL = "https://watch-party-v2gx.onrender.com"; // تأكد من وضع رابط الـ Render الخاص بك
const socket = io(SERVER_URL);

const videoPlayer = document.getElementById("video");
const youtubeContainer = document.getElementById("youtube-container");
const messagesDiv = document.getElementById("messages");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false;
let ytPlayer; // لمشغل يوتيوب

// طلب الاسم
let userName = localStorage.getItem("userName") || prompt("أدخل اسمك:") || "مستخدم";
localStorage.setItem("userName", userName);

if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("أدخل رابط الفيديو (YouTube أو رابط مباشر):");
    if (!movieUrl) window.location.reload();
    window.history.pushState({}, '', `?room=${roomId}`);
    socket.emit("join-room", { roomId, movieUrl });
} else {
    socket.emit("join-room", { roomId });
}

// التعرف على نوع الرابط
function loadVideo(url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let videoId = url.includes("v=") ? url.split("v=")[1].split("&")[0] : url.split("/").pop();
        videoPlayer.style.display = "none";
        youtubeContainer.style.display = "block";
        initYouTube(videoId);
    } else {
        videoPlayer.style.display = "block";
        youtubeContainer.style.display = "none";
        videoPlayer.src = url;
    }
}

function initYouTube(id) {
    if (window.YT) {
        ytPlayer = new YT.Player('youtube-container', {
            height: '100%', width: '100%', videoId: id,
            events: { 'onStateChange': onPlayerStateChange }
        });
    }
}

socket.on("sync-state", state => {
    if (state.movieUrl) loadVideo(state.movieUrl);
    // مزامنة الوقت (للفيديو العادي حالياً)
    if (Math.abs(videoPlayer.currentTime - state.time) > 2) videoPlayer.currentTime = state.time;
});

// أوامر الفيديو العادي
videoPlayer.onplay = () => { if (!isRemoteAction) socket.emit("play", { roomId, time: videoPlayer.currentTime }); };
videoPlayer.onpause = () => { if (!isRemoteAction) socket.emit("pause", { roomId, time: videoPlayer.currentTime }); };
videoPlayer.onseeked = () => { if (!isRemoteAction) socket.emit("seek", { roomId, time: videoPlayer.currentTime }); };

socket.on("play", t => { isRemoteAction = true; videoPlayer.currentTime = t; videoPlayer.play().finally(() => isRemoteAction = false); });
socket.on("pause", t => { isRemoteAction = true; videoPlayer.pause(); setTimeout(() => isRemoteAction = false, 500); });
socket.on("seek", t => { isRemoteAction = true; videoPlayer.currentTime = t; setTimeout(() => isRemoteAction = false, 500); });

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