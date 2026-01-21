const socket = io("https://watch-party-v2gx.onrender.com");

const params = new URLSearchParams(location.search);
const roomId = params.get("room");
const isOwner = params.get("owner") === "1";

const userName = localStorage.getItem("name");
if (!userName) location.href = "/";

const player = videojs("player");
let isRemote = false;
let subContent = "";

/* إخفاء أدوات المالك عن غيره */
if (!isOwner) {
  document.getElementById("owner-controls").style.display = "none";
  socket.emit("join-room", roomId);
  document.getElementById("app").style.display = "flex";
}

/* تحميل الترجمة */
document.getElementById("sub-file")?.addEventListener("change", e => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = ev => {
    subContent = file.name.endsWith(".srt")
      ? "WEBVTT\n\n" + ev.target.result.replace(/,/g, ".")
      : ev.target.result;
  };
  reader.readAsText(file);
});

/* المالك يشغل الغرفة */
function initRoom() {
  const movieUrl = document.getElementById("movie-url").value.trim();
  if (!movieUrl) return alert("ضع رابط الفيديو");

  socket.emit("create-room", {
    roomId,
    movieUrl,
    subContent
  });

  socket.emit("join-room", roomId);

  document.getElementById("owner-controls").style.display = "none";
  document.getElementById("app").style.display = "flex";
}

/* استلام حالة الغرفة */
socket.on("sync-state", state => {
  if (!state) return;

  player.src({ src: state.movieUrl, type: "video/mp4" });

  player.ready(() => {
    player.currentTime(state.time || 0);
    if (state.playing) player.play();
  });

  if (state.subContent) {
    const blob = new Blob([state.subContent], { type: "text/vtt" });
    player.addRemoteTextTrack({
      kind: "captions",
      label: "Arabic",
      src: URL.createObjectURL(blob),
      default: true
    });
  }
});

/* ===== التزامن ===== */
player.on("play", () => {
  if (!isRemote)
    socket.emit("play", { roomId, time: player.currentTime() });
});

player.on("pause", () => {
  if (!isRemote)
    socket.emit("pause", { roomId, time: player.currentTime() });
});

player.on("seeked", () => {
  if (!isRemote)
    socket.emit("seek", { roomId, time: player.currentTime() });
});

socket.on("play", t => {
  isRemote = true;
  player.currentTime(t);
  player.play().finally(() => isRemote = false);
});

socket.on("pause", () => {
  isRemote = true;
  player.pause();
  isRemote = false;
});

socket.on("seek", t => {
  isRemote = true;
  player.currentTime(t);
  isRemote = false;
});

/* ===== الشات ===== */
function sendMsg(e) {
  e.preventDefault();
  const input = document.getElementById("msg");
  if (!input.value.trim()) return;

  socket.emit("chat", {
    roomId,
    user: userName,
    message: input.value
  });

  input.value = "";
}

socket.on("chat", d => {
  const div = document.createElement("div");
  div.innerHTML = `<b>${d.user}</b>: ${d.message}`;
  document.getElementById("messages").appendChild(div);
});
