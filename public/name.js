const tochat = document.querySelector('#tochat')
const username = document.querySelector('#name')

tochat.addEventListener('click', ()=>{
    localStorage.setItem("username", username.value);
    window.location.href = `${mainPath}/chat`
})