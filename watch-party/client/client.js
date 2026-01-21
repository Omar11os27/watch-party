const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);
let player;
let roomId = new URLSearchParams(window.location.search).get('room');
let isRemoteAction = false;
let subContent = "";

document.addEventListener("DOMContentLoaded", () => {
    // إبقاء نفس المشغل Video.js
    player = videojs('my-video');

    // إذا الرابط يحتوي على RoomId، نخفي حقول الإدخال لأن البيانات ستأتي من السيرفر
    if (roomId) {
        document.getElementById('movie-url').style.display = 'none';
        document.querySelector('.file-upload').style.display = 'none';
        document.querySelector('.setup-box p').innerText = "أنت مدعو لمشاهدة سهرة جماعية!";
    }

    document.getElementById('sub-file').onchange = (e) => {
        const file = e.target.files[0];
        document.getElementById('file-name').innerText = file.name;
        let reader = new FileReader();
        reader.onload = (ev) => {
            let text = ev.target.result;
            if (file.name.endsWith('.srt')) {
                text = "WEBVTT\n\n" + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
            }
            subContent = text;
        };
        reader.readAsText(file);
    };
});

function startParty() {
    const name = document.getElementById('user-name').value;
    const movieUrl = document.getElementById('movie-url').value;
    if (!name) return alert("الرجاء إدخال اسمك!");
    localStorage.setItem("userName", name);

    if (!roomId) {
        // أنت صاحب الرابط (الأدمن)
        if (!movieUrl) return alert("الرجاء وضع رابط الفيديو!");
        roomId = Math.random().toString(36).substring(7);
        window.history.pushState({}, '', `?room=${roomId}`);
        socket.emit("join-room", { roomId, movieUrl, subContent });
    } else {
        // أنت الضيف
        socket.emit("join-room", { roomId });
    }
    
    document.getElementById('setup-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
}

function setupVideo(url, sub) {
    player.src({ type: (url.includes('m3u8') ? 'application/x-mpegURL' : 'video/mp4'), src: url });
    if (sub) {
        const blob = new Blob([sub], { type: 'text/vtt' });
        player.addRemoteTextTrack({ kind: 'captions', label: 'العربية', src: URL.createObjectURL(blob), default: true }, false);
    }
}

// استلام البيانات وتجهيز المشغل عند الصديق
socket.on("sync-state", state => {
    if (state.movieUrl) {
        setupVideo(state.movieUrl, state.subContent);
    }
});

// استقبال الرسائل
socket.on("chat", data => {
    const messages = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "msg-item";
    div.innerHTML = `<strong>${data.user}:</strong> ${data.message}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
});

function sendMessage() {
    const input = document.getElementById("msg");
    const name = localStorage.getItem("userName");
    if (input.value.trim() && roomId) {
        socket.emit("chat", { roomId, message: input.value, user: name });
        input.value = "";
    }
}

// التزامن (Play/Pause/Seek)
player.on('play', () => { if(!isRemoteAction) socket.emit("play", {roomId, time: player.currentTime()}); });
player.on('pause', () => { if(!isRemoteAction) socket.emit("pause", {roomId, time: player.currentTime()}); });
player.on('seeked', () => { if(!isRemoteAction) socket.emit("seek", {roomId, time: player.currentTime()}); });

socket.on("play", t => { isRemoteAction=true; player.currentTime(t); player.play().finally(()=>isRemoteAction=false); });
socket.on("pause", t => { isRemoteAction=true; player.pause(); setTimeout(()=>isRemoteAction=false, 500); });
socket.on("seek", t => { isRemoteAction=true; player.currentTime(t); setTimeout(()=>isRemoteAction=false, 500); });