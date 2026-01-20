const SERVER_URL = "https://watch-party-v2gx.onrender.com";
const socket = io(SERVER_URL);

const video = document.getElementById("video");
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let movieUrl = "";

// إذا ماكو ID غرفة بالرابط، نسوي واحد جديد ونطلب رابط الفيلم
if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    movieUrl = prompt("أدخل رابط ملف الفيلم (Direct Link):");
    if (!movieUrl) {
        alert("لازم تخلي رابط حتى تبدي الغرفة!");
        window.location.reload();
    }
    window.history.pushState({}, '', `?room=${roomId}`);
    alert("انسخ رابط المتصفح وادزه لأصدقائك حتى يشوفون وياك!");
}

// الانضمام للغرفة
socket.emit("join-room", { roomId, movieUrl });

socket.on("sync-state", state => {
    // تحديث رابط الفيلم إذا كان موجوداً
    if (state.movieUrl && video.src !== state.movieUrl) {
        video.src = state.movieUrl;
    }
    video.currentTime = state.time;
    if (state.playing) video.play();
});

// الأحداث (Events)
video.addEventListener("play", () => {
  socket.emit("play", { roomId, time: video.currentTime });
});

video.addEventListener("pause", () => {
  socket.emit("pause", { roomId, time: video.currentTime });
});

video.addEventListener("seeked", () => {
  socket.emit("seek", { roomId, time: video.currentTime });
});

socket.on("play", time => {
  video.currentTime = time;
  video.play();
});

socket.on("pause", time => {
  video.currentTime = time;
  video.pause();
});

socket.on("seek", time => {
  video.currentTime = time;
});

// ===== CHAT =====
const messages = document.getElementById("messages");
function sendMessage() {
  const input = document.getElementById("msg");
  if (!input.value) return;
  socket.emit("chat", { roomId, message: input.value });
  addMessage("أنت: " + input.value);
  input.value = "";
}

socket.on("chat", msg => {
  addMessage("صديقك: " + msg);
});

function addMessage(text) {
  const div = document.createElement("div");
  div.className = "msg-item";
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}