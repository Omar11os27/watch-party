const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);
const video = document.getElementById('my-video');

let roomId = new URLSearchParams(window.location.search).get('room');
let isRemoteAction = false;
let subContent = "";

// رفع ملف الترجمة وتحويله لـ VTT
document.getElementById('sub-file').onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
        let text = ev.target.result;
        subContent = file.name.endsWith('.srt') ? "WEBVTT\n\n" + text.replace(/,/g, '.') : text;
    };
    reader.readAsText(file);
};

function startParty() {
    const name = document.getElementById('user-name').value;
    const movieUrl = document.getElementById('movie-url').value;
    if (!name) return alert("أدخل اسمك أولاً!");
    localStorage.setItem("userName", name);

    if (!roomId) {
        if (!movieUrl) return alert("رابط الفيلم مطلوب!");
        roomId = Math.random().toString(36).substring(7);
        window.history.pushState({}, '', `?room=${roomId}`);
        socket.emit("join-room", { roomId, movieUrl, subContent });
    } else {
        socket.emit("join-room", { roomId });
    }
    document.getElementById('setup-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
}

function setupVideo(url, sub) {
    video.src = url;
    if (sub) {
        const blob = new Blob([sub], { type: 'text/vtt' });
        const track = document.createElement('track');
        track.kind = 'captions';
        track.label = 'العربية';
        track.src = URL.createObjectURL(blob);
        track.default = true;
        video.appendChild(track);
    }
}

// استلام المزامنة من السيرفر
socket.on("sync-state", state => { if (state.movieUrl) setupVideo(state.movieUrl, state.subContent); });

socket.on("play", t => { isRemoteAction = true; video.currentTime = t; video.play(); setTimeout(()=>isRemoteAction=false, 500); });
socket.on("pause", t => { isRemoteAction = true; video.pause(); setTimeout(()=>isRemoteAction=false, 500); });
socket.on("seek", t => { isRemoteAction = true; video.currentTime = t; setTimeout(()=>isRemoteAction=false, 500); });

// إرسال الحركات للسيرفر
video.onplay = () => { if (!isRemoteAction) socket.emit("play", { roomId, time: video.currentTime }); };
video.onpause = () => { if (!isRemoteAction) socket.emit("pause", { roomId, time: video.currentTime }); };
video.onseeked = () => { if (!isRemoteAction) socket.emit("seek", { roomId, time: video.currentTime }); };

// الشات
function sendMessage() {
    const input = document.getElementById("msg");
    const name = localStorage.getItem("userName") || "مستخدم";
    if (input.value.trim() && roomId) {
        socket.emit("chat", { roomId, message: input.value, user: name });
        input.value = "";
    }
}

socket.on("chat", data => {
    const div = document.createElement("div");
    div.className = "msg-item";
    div.innerHTML = `<strong>${data.user}</strong>${data.message}`;
    const messages = document.getElementById("messages");
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
});