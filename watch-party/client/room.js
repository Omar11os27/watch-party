const socket = io("https://watch-party-v2gx.onrender.com");
const params = new URLSearchParams(location.search);
const roomId = params.get("room");
const isOwner = params.get("owner") === "1";
const userName = localStorage.getItem("name");

if (!userName) location.href = `index.html?room=${roomId}`;

const player = videojs("player", { fluid: true });
let isRemote = false;

// 1. المالك يرسل البيانات للسيرفر أول ما يفتح الصفحة
if (isOwner) {
    const movieUrl = sessionStorage.getItem("init_movie");
    const subContent = sessionStorage.getItem("init_subs");

    if (movieUrl) {
        socket.emit("create-room", { roomId, movieUrl, subContent });
    }
}

// 2. الكل يسوي Join بعد إرسال البيانات
socket.emit("join-room", roomId);

// 3. استقبال حالة الغرفة وتشغيل الفيديو
socket.on("sync-state", state => {
    if (!state || !state.movieUrl) return;

    document.getElementById("app").style.display = "flex";
    
    const type = state.movieUrl.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4";
    player.src({ src: state.movieUrl, type: type });

    player.ready(() => {
        player.muted(true); // لضمان عمل الـ Autoplay
        player.currentTime(state.time || 0);
        if (state.playing) player.play().catch(() => {});
    });

    if (state.subContent) {
        const blob = new Blob([state.subContent], { type: "text/vtt" });
        player.addRemoteTextTrack({
            kind: "captions",
            label: "العربية",
            src: URL.createObjectURL(blob),
            default: true
        }, true);
    }
});

// التزامن (Play/Pause/Seek)
player.on("play", () => { if (!isRemote) socket.emit("play", { roomId, time: player.currentTime() }); });
player.on("pause", () => { if (!isRemote) socket.emit("pause", { roomId, time: player.currentTime() }); });
player.on("seeked", () => { if (!isRemote) socket.emit("seek", { roomId, time: player.currentTime() }); });

socket.on("play", t => { isRemote = true; player.currentTime(t); player.play().finally(() => isRemote = false); });
socket.on("pause", () => { isRemote = true; player.pause(); isRemote = false; });
socket.on("seek", t => { isRemote = true; player.currentTime(t); isRemote = false; });

// الشات
function sendMsg(e) {
    e.preventDefault();
    const input = document.getElementById("msg");
    if (!input.value.trim()) return;
    socket.emit("chat", { roomId, user: userName, message: input.value });
    input.value = "";
}

socket.on("chat", d => {
    const div = document.createElement("div");
    div.className = "msg-item";
    div.innerHTML = `<b>${d.user}:</b> ${d.message}`;
    document.getElementById("messages").appendChild(div);
    document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
});