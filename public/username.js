const mainPath = "https://watch-party-v2gx.onrender.com";
// const mainPath = "";
const tochat = document.querySelector('#tochat')
const username = document.querySelector('#username')

tochat.addEventListener('click', ()=>{
    localStorage.setItem("username", username.value);
    window.location.href = `${mainPath}/chat`;
})