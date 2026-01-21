const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);
let player, roomId = new URLSearchParams(window.location.search).get('room'), isRemote = false, subContent = "";

document.addEventListener("DOMContentLoaded", () => {
    player = videojs('my-video');
    
    // منع حدوث تكرار بالأوامر (Loop)
    const setRemote = () => { isRemote = true; setTimeout(() => isRemote = false, 1000); };

    if (roomId) {
        document.getElementById('movie-url').style.display = 'none';
        document.querySelector('.file-upload').style.display = 'none';
    }

    // استقبال المزامنة
    socket.on("play", t => { if(!player.playing()) { setRemote(); player.currentTime(t); player.play(); } });
    socket.on("pause", t => { if(player.playing()) { setRemote(); player.currentTime(t); player.pause(); } });
    socket.on("seek", t => { setRemote(); player.currentTime(t); });

    socket.on("sync-state", state => { if (state.movieUrl) initPlayer(state.movieUrl, state.subContent); });

    // إرسال المزامنة
    player.on('play', () => { if (!isRemote) socket.emit("play", { roomId, time: player.currentTime() }); });
    player.on('pause', () => { if (!isRemote) socket.emit("pause", { roomId, time: player.currentTime() }); });
    player.on('seeked', () => { if (!isRemote) socket.emit("seek", { roomId, time: player.currentTime() }); });
});

function initPlayer(url, sub) {
    player.src({ type: 'video/mp4', src: url });
    if (sub) {
        const blob = new Blob([sub], { type: 'text/vtt' });
        player.addRemoteTextTrack({ kind: 'captions', label: 'العربية', src: URL.createObjectURL(blob), default: true }, false);
    }
}

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
}

function sendMessage() {
    const input = document.getElementById("msg");
    if (input.value.trim()) {
        socket.emit("chat", { roomId, message: input.value, user: localStorage.getItem("userName") });
        input.value = "";
    }
}

socket.on("chat", d => {
    const item = `<div class="msg-item"><strong>${d.user}:</strong> ${d.message}</div>`;
    document.getElementById("messages").innerHTML += item;
    document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
});