const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

let player;
let roomId = new URLSearchParams(window.location.search).get('room');
let isRemoteAction = false;
let subContent = "";

document.addEventListener("DOMContentLoaded", () => {
    player = videojs('my-video', {
        html5: { vhs: { overrideNative: true }, nativeAudioTracks: false, nativeVideoTracks: false }
    });

    // التعامل مع رفع ملف الترجمة
    document.getElementById('sub-file').onchange = (e) => {
        const file = e.target.files[0];
        document.getElementById('file-name').innerText = file.name;
        let reader = new FileReader();
        reader.onload = (event) => { 
            let text = event.target.result;
            // تحويل SRT إلى VTT (ضروري جداً للمتصفح)
            if (file.name.endsWith('.srt')) {
                subContent = "WEBVTT\n\n" + text.replace(/\r/g, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
            } else {
                subContent = text;
            }
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
        if (!movieUrl) return alert("الصق رابط الفيديو!");
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
    player.src({ type: 'video/mp4', src: url });
    if (sub) {
        let blob = new Blob([sub], { type: 'text/vtt' });
        let urlSub = URL.createObjectURL(blob);
        player.addRemoteTextTrack({ kind: 'captions', label: 'العربية', srclang: 'ar', src: urlSub, default: true }, false);
    }
}

socket.on("sync-state", state => {
    if (state.movieUrl) setupVideo(state.movieUrl, state.subContent);
});

// مزامنة الأوامر
player.on('play', () => { if(!isRemoteAction) socket.emit("play", {roomId, time: player.currentTime()}); });
player.on('pause', () => { if(!isRemoteAction) socket.emit("pause", {roomId, time: player.currentTime()}); });
player.on('seeked', () => { if(!isRemoteAction) socket.emit("seek", {roomId, time: player.currentTime()}); });

socket.on("play", t => { isRemoteAction=true; player.currentTime(t); player.play().finally(()=>isRemoteAction=false); });
socket.on("pause", t => { isRemoteAction=true; player.pause(); setTimeout(()=>isRemoteAction=false, 500); });
socket.on("seek", t => { isRemoteAction=true; player.currentTime(t); setTimeout(()=>isRemoteAction=false, 500); });

// الشات - تعديل العرض
function sendMessage() {
    const input = document.getElementById("msg");
    const name = localStorage.getItem("userName");
    if (input.value.trim()) {
        socket.emit("chat", { roomId, message: input.value, user: name });
        input.value = "";
    }
}

socket.on("chat", data => {
    const messagesDiv = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "msg-item";
    div.innerHTML = `<strong>${data.user}:</strong> ${data.message}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});