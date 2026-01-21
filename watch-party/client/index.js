const authBox = document.getElementById("auth-box");
const setupBox = document.getElementById("setup-box");
const nameInput = document.getElementById("user-name");

// قراءة الـ Room ID من الرابط (إذا موجود)
const urlParams = new URLSearchParams(window.location.search);
const existingRoomId = urlParams.get("room");

// إذا الاسم محفوظ مسبقاً، نمليه تلقائياً
if (localStorage.getItem("name")) {
    nameInput.value = localStorage.getItem("name");
}

function handleNextStep() {
    const name = nameInput.value.trim();
    if (!name) return alert("الاسم مطلوب حبيب قلبي");
    
    localStorage.setItem("name", name);

    if (existingRoomId) {
        // إذا هو داخل عبر رابط غرفة موجودة، نوديه قبل للغرفة
        window.location.href = `room.html?room=${existingRoomId}`;
    } else {
        // إذا هو ديدخل للموقع الرئيسي، نظهر له خيارات إنشاء الغرفة
        authBox.style.display = "none";
        setupBox.style.display = "block";
    }
}

let subContent = "";
// معالجة ملف الترجمة قبل الرفع
document.getElementById("sub-file").addEventListener("change", e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
        subContent = file.name.endsWith(".srt") 
            ? "WEBVTT\n\n" + ev.target.result.replace(/,/g, ".") 
            : ev.target.result;
    };
    reader.readAsText(file);
});

function createNewRoom() {
    const movieUrl = document.getElementById("movie-url").value.trim();
    if (!movieUrl) return alert("لازم تخلي رابط فيديو عيني");

    const roomId = Math.random().toString(36).substring(7);
    
    // خزن البيانات محلياً حتى تسحبها صفحة الـ room
    sessionStorage.setItem("init_movie", movieUrl);
    sessionStorage.setItem("init_subs", subContent);

    window.location.href = `room.html?room=${roomId}&owner=1`;
}