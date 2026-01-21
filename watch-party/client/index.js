function saveName() {
  const name = document.getElementById("name").value;
  if (!name) return;
  localStorage.setItem("name", name);
  document.querySelector(".box").style.display = "none";
  document.getElementById("rooms").style.display = "block";
}

function createRoom() {
  const movie = document.getElementById("movie").value;
  const roomId = Math.random().toString(36).substring(7);
  localStorage.setItem("movie", movie);
  window.location = `room.html?room=${roomId}&owner=1`;
}
