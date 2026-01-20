// 🔴 عدّل هذا الرابط بعد ما ترفع السيرفر على Render
const SERVER_URL = "https://YOUR-RENDER-APP.onrender.com";

const socket = io(SERVER_URL);

const roomId = "room1"; // تگدر تخليه ديناميكي لاحقًا
const video = document.getElementById("video");

socket.emit("join-room", roomId);

socket.on("sync-state", state => {
  video.currentTime = state.time;
  state.playing ? video.play() : video.pause();
});

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
  const text = input.value;

  if (!text) return;

  socket.emit("chat", { roomId, message: text });
  addMessage("أنت: " + text);
  input.value = "";
}

socket.on("chat", msg => {
  addMessage("صديقك: " + msg);
});

function addMessage(text) {
  const div = document.createElement("div");
  div.textContent = text;
  messages.appendChild(div);
}
