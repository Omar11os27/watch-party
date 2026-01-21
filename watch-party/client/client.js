const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);
let player, roomId = new URLSearchParams(window.location.search).get('room'), isRemote = false, subContent = "";

document.addEventListener("DOMContentLoaded", () => {
    player = videojs('my-video');
    
    if (roomId) {
        document.getElementById('movie-url').style.display = 'none';
        document.querySelector('.file-upload').style.display = 'none';
    }

    document.getElementById('sub-file').onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            let text = ev.target.result;
            subContent = file.name.endsWith('.srt') ? "WEBVTT\n\n" + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2") : text;
        };
        reader.readAsText(file);
    };
});

function startParty() {
    const name = document.getElementById('user-name').value;
    const movieUrl = document.getElementById('movie-url').value;
    if (!name) return alert("أدخل اسمك!");
    localStorage.setItem("userName", name);

    if (!roomId) {
        if (!movieUrl) return alert("ضع رابط الفيلم!");
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
    player.src({ type: (url.includes('m3u8') ? 'application/x-mpegURL' : 'video/mp4'), src: url });
    if (sub) {
        const blob = new Blob([sub], { type: 'text/vtt' });
        player.addRemoteTextTrack({ kind: 'captions', label: 'العربية', src: URL.createObjectURL(blob), default: true }, false);
    }
}

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
    const div = document.createElement("div"); div.className = "msg-item";
    div.innerHTML = `<strong>${d.user}</strong>${d.message}`;
    document.getElementById("messages").appendChild(div);
    document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
});

// المزامنة
player.on('play', () => { if (!isRemote) socket.emit("play", { roomId, time: player.currentTime() }); });
player.on('pause', () => { if (!isRemote) socket.emit("pause", { roomId, time: player.currentTime() }); });
player.on('seeked', () => { if (!isRemote) socket.emit("seek", { roomId, time: player.currentTime() }); });

socket.on("play", t => { isRemote = true; player.currentTime(t); player.play().finally(() => isRemote = false); });
socket.on("pause", t => { isRemote = true; player.pause(); setTimeout(() => isRemote = false, 500); });
socket.on("seek", t => { isRemote = true; player.currentTime(t); setTimeout(() => isRemote = false, 500); });