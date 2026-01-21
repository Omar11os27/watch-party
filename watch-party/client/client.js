const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

const messagesDiv = document.getElementById("messages");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let isRemoteAction = false;

// تهيئة المشغل
let player = videojs('my-video');

let userName = localStorage.getItem("userName") || prompt("أدخل اسمك:") || "مستخدم";
localStorage.setItem("userName", userName);

if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    let movieUrl = prompt("الصق رابط الفيديو المباشر:");
    
    // سؤاله عن ملف الترجمة
    let hasSub = confirm("هل تريد رفع ملف ترجمة (SRT/VTT)؟");
    
    if (hasSub) {
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = '.vtt,.srt';
        input.onchange = e => {
            let file = e.target.files[0];
            let reader = new FileReader();
            reader.onload = function(event) {
                // نرسل محتوى الملف للسيرفر حتى يوزعه
                socket.emit("join-room", { roomId, movieUrl, subContent: event.target.result });
            };
            reader.readAsText(file);
        };
        input.click();
    } else {
        socket.emit("join-room", { roomId, movieUrl });
    }
    window.history.pushState({}, '', `?room=${roomId}`);
} else {
    socket.emit("join-room", { roomId });
}

function setupVideo(url, subContent) {
    player.src({ type: 'video/mp4', src: url });

    if (subContent) {
        let blob = new Blob([subContent], { type: 'text/vtt' });
        let subURL = URL.createObjectURL(blob);
        player.addRemoteTextTrack({
            kind: 'captions',
            label: 'العربية',
            srclang: 'ar',
            src: subURL,
            default: true
        }, false);
    }
}

socket.on("sync-state", state => {
    if (state.movieUrl) setupVideo(state.movieUrl, state.subContent);
});

// أوامر المزامنة
player.on('play', () => { if(!isRemoteAction) socket.emit("play", {roomId, time: player.currentTime()}); });
player.on('pause', () => { if(!isRemoteAction) socket.emit("pause", {roomId, time: player.currentTime()}); });
player.on('seeked', () => { if(!isRemoteAction) socket.emit("seek", {roomId, time: player.currentTime()}); });

socket.on("play", t => { isRemoteAction=true; player.currentTime(t); player.play(); setTimeout(()=>isRemoteAction=false,500); });
socket.on("pause", t => { isRemoteAction=true; player.pause(); setTimeout(()=>isRemoteAction=false,500); });
socket.on("seek", t => { isRemoteAction=true; player.currentTime(t); setTimeout(()=>isRemoteAction=false,500); });

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