const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);
const video = document.getElementById('my-video');
let roomId = new URLSearchParams(window.location.search).get('room');
let isRemote = false;
let subContent = "";

// رفع الترجمة
document.getElementById('sub-file').onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
        let text = ev.target.result;
        subContent = file.name.endsWith('.srt') ? "WEBVTT\n\n" + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2") : text;
    };
    reader.readAsText(file);
};

function startParty() {
    const name = document.getElementById('user-name').value;
    const movieUrl = document.getElementById('movie-url').value;
    if (!name) return alert("أدخل اسمك!");
    localStorage.setItem("userName", name);

    if (!roomId) {
        roomId = Math.random().toString(36).substring(7);
        window.history.pushState({}, '', `?room=${roomId}`);
        socket.emit("join-room", { roomId, movieUrl, subContent });
    } else {
        socket.emit("join-room", { roomId });
    }
    document.getElementById('setup-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
}

function initPlayer(url, sub) {
    video.src = url;
    if (sub) {
        const blob = new Blob([sub], { type: 'text/vtt' });
        const track = document.createElement('track');
        track.kind = 'captions';
        track.label = 'العربية';
        track.srclang = 'ar';
        track.src = URL.createObjectURL(blob);
        track.default = true;
        video.appendChild(track);
    }
}

// مزامنة الفيديو
video.onplay = () => { if (!isRemote) socket.emit("play", { roomId, time: video.currentTime }); };
video.onpause = () => { if (!isRemote) socket.emit("pause", { roomId, time: video.currentTime }); };
video.onseeked = () => { if (!isRemote) socket.emit("seek", { roomId, time: video.currentTime }); };

socket.on("play", (t) => { isRemote = true; video.currentTime = t; video.play(); setTimeout(() => isRemote = false, 500); });
socket.on("pause", (t) => { isRemote = true; video.currentTime = t; video.pause(); setTimeout(() => isRemote = false, 500); });
socket.on("seek", (t) => { isRemote = true; video.currentTime = t; setTimeout(() => isRemote = false, 500); });

socket.on("sync-state", state => { if (state.movieUrl) initPlayer(state.movieUrl, state.subContent); });

// الشات
function sendMessage() {
    const input = document.getElementById("msg");
    if (input.value.trim()) {
        socket.emit("chat", { roomId, message: input.value, user: localStorage.getItem("userName") });
        input.value = "";
    }
}

socket.on("chat", d => {
    const messages = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "msg-item";
    div.innerHTML = `<strong>${d.user}</strong>${d.message}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
});