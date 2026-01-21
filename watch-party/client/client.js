const socket = io("https://watch-party-v2gx.onrender.com");

const roomId =
  new URLSearchParams(window.location.search).get("room") ||
  Math.random().toString(36).substring(7);

history.replaceState({}, "", "?room=" + roomId);

let player = videojs("player");
let isRemote = false;
let subText = "";

const ownerFields = document.getElementById("owner-fields");

socket.emit("check-room", roomId);

socket.on("sync-state", state => {
  if (state.movieUrl) {
    initPlayer(state.movieUrl, state.subContent, state);
    ownerFields.style.display = "none";
  }
});

document.getElementById("sub").onchange = e => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = ev => {
    subText = file.name.endsWith(".srt")
      ? "WEBVTT\n\n" + ev.target.result.replace(/,/g, ".")
      : ev.target.result;
  };
  reader.readAsText(file);
};

function start() {
  const name = document.getElementById("name").value;
  const movie = document.getElementById("movie").value;

  if (!name) return alert("اكتب اسمك");

  socket.emit("join-room", {
    roomId,
    name,
    movieUrl: movie || null,
    subContent: subText || null
  });

  document.getElementById("setup").style.display = "none";
  document.getElementById("app").style.display = "flex";
}

function initPlayer(url, sub, state) {
  player.src({ src: url, type: "video/mp4" });

  if (sub) {
    const blob = new Blob([sub], { type: "text/vtt" });
    player.addRemoteTextTrack({
      kind: "captions",
      label: "Arabic",
      src: URL.createObjectURL(blob),
      default: true
    });
  }

  player.ready(() => {
    player.currentTime(state.time || 0);
    if (state.playing) player.play();
  });
}

// مزامنة
player.ready(() => {
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
});

socket.on("play", t => {
  isRemote = true;
  player.currentTime(t);
  player.play().finally(() => (isRemote = false));
});

socket.on("pause", t => {
  isRemote = true;
  player.pause();
  isRemote = false;
});

socket.on("seek", t => {
  isRemote = true;
  player.currentTime(t);
  isRemote = false;
});

// الشات
function sendMsg(e) {
  e.preventDefault();
  const input = document.getElementById("msg");
  if (!input.value.trim()) return;

  socket.emit("chat", {
    roomId,
    user: document.getElementById("name").value,
    message: input.value
  });

  input.value = "";
}

socket.on("chat", d => {
  const div = document.createElement("div");
  div.className = "msg";
  div.innerHTML = `<b>${d.user}</b>: ${d.message}`;
  document.getElementById("messages").appendChild(div);
});
