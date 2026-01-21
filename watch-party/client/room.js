const socket = io("https://watch-party-v2gx.onrender.com");
const roomId = new URLSearchParams(location.search).get("room");
const isOwner = new URLSearchParams(location.search).get("owner");

const player = videojs("player");
let remote = false;

if (isOwner) {
  socket.emit("create-room", {
    roomId,
    movieUrl: localStorage.getItem("movie")
  });
}

socket.emit("join-room", roomId);

socket.on("sync-state", state => {
  player.src({ src: state.movieUrl, type: "video/mp4" });
  player.currentTime(state.time);
  if (state.playing) player.play();
});

player.on("play", () => {
  if (!remote) socket.emit("play", { roomId, time: player.currentTime() });
});

player.on("pause", () => {
  if (!remote) socket.emit("pause", { roomId, time: player.currentTime() });
});

player.on("seeked", () => {
  if (!remote) socket.emit("seek", { roomId, time: player.currentTime() });
});

socket.on("play", t => {
  remote = true; player.currentTime(t); player.play(); remote = false;
});
socket.on("pause", () => { remote = true; player.pause(); remote = false; });
socket.on("seek", t => { remote = true; player.currentTime(t); remote = false; });

function send(e){
  e.preventDefault();
  socket.emit("chat", {
    roomId,
    user: localStorage.getItem("name"),
    message: msg.value
  });
  msg.value="";
}

socket.on("chat", d => {
  messages.innerHTML += `<div>${d.user}: ${d.message}</div>`;
});
