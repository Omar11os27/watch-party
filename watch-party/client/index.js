const nameBox = document.getElementById("name-box");
const roomBox = document.getElementById("room-box");

const savedName = localStorage.getItem("name");

if (savedName) {
  nameBox.style.display = "none";
  roomBox.style.display = "block";
}

function saveName() {
  const name = document.getElementById("name").value.trim();
  if (!name) return alert("اكتب اسمك");
  localStorage.setItem("name", name);
  location.reload();
}

function createRoom() {
  const movie = document.getElementById("movie").value.trim();
  if (!movie) return alert("ضع رابط الفيلم");

  const roomId = Math.random().toString(36).substring(7);
  localStorage.setItem("movie", movie);

  window.location.href = `room.html?room=${roomId}&owner=1`;
}
