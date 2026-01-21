const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);
let player, roomId = new URLSearchParams(window.location.search).get('room'), isRemote = false, subContent = "";

document.addEventListener("DOMContentLoaded", () => {
    player = videojs('my-video', {
        controls: true,
        fluid: false,
        playbackRates: [0.5, 1, 1.5, 2]
    });

    // تحويل الترجمة SRT -> VTT
    document.getElementById('sub-file').onchange = (e) => {
        const file = e.target.files[0];
        document.getElementById('file-status').innerText = file.name;
        const reader = new FileReader();
        reader.onload = (ev) => {
            let content = ev.target.result;
            if (file.name.endsWith('.srt')) {
                subContent = "WEBVTT\n\n" + content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
            } else { subContent = content; }
        };
        reader.readAsText(file);
    };
});

function startParty() {
    const name = document.getElementById('user-name').value;
    const movieUrl = document.getElementById('movie-url').value;
    if (!name) return alert("الرجاء إدخال اسمك");

    localStorage.setItem("userName", name);
    if (!roomId) {
        if (!movieUrl) return alert("الصق رابط الفيديو المباشر أولاً!");
        roomId = Math.random().toString(36).substring(7);
        window.history.pushState({}, '', `?room=${roomId}`);
        socket.emit("join-room", { roomId, movieUrl, subContent });
    } else {
        socket.emit("join-room", { roomId });
    }
    document.getElementById('setup-container').style.fadeOut = 500;
    setTimeout(() => {
        document.getElementById('setup-container').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
    }, 500);
}

function initPlayer(url, sub) {
    player.src({ type: url.includes(".m3u8") ? 'application/x-mpegURL' : 'video/mp4', src: url });
    if (sub) {
        const blob = new Blob([sub], { type: 'text/vtt' });
        player.addRemoteTextTrack({ kind: 'captions', label: 'العربية', src: URL.createObjectURL(blob), default: true }, false);
    }
}

// استلام البيانات من السيرفر
socket.on("sync-state", state => { if (state.movieUrl) initPlayer(state.movieUrl, state.subContent); });

socket.on("chat", d => {
    const messages = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "msg-item";
    div.innerHTML = `<strong>${d.user} • ${d.time}</strong>${d.message}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
});

function sendMessage() {
    const input = document.getElementById("msg");
    const name = localStorage.getItem("userName");
    if (input.value.trim()) {
        socket.emit("chat", { roomId, message: input.value, user: name });
        input.value = "";
    }
}

// التحكم الذكي في المزامنة لمنع الـ Infinite Loops
player.on('play', () => { if (!isRemote) socket.emit("play", { roomId, time: player.currentTime() }); });
player.on('pause', () => { if (!isRemote) socket.emit("pause", { roomId, time: player.currentTime() }); });
player.on('seeked', () => { if (!isRemote) socket.emit("seek", { roomId, time: player.currentTime() }); });

socket.on("play", t => { isRemote = true; player.currentTime(t); player.play().finally(() => isRemote = false); });
socket.on("pause", t => { isRemote = true; player.pause(); setTimeout(() => isRemote = false, 500); });
socket.on("seek", t => { isRemote = true; player.currentTime(t); setTimeout(() => isRemote = false, 500); });