window.addEventListener('load', ()=>{
    const mainPath = "https://watch-party-v2gx.onrender.com";
    const socket = io(mainPath)

    // html element
    const msginput = document.querySelector('#msginput')
    const msgform = document.querySelector('#msgform')
    const msgcon = document.querySelector('#msgcon')
    const tochat = document.querySelector('#tochat')
    const name = document.querySelector('#name')

    msgform.addEventListener('submit', (e)=>{
        e.preventDefault()
        let msg = msginput.value
        msginput.value = ""

        // send
        socket.emit('msg', msg)
    })

    socket.on('msg', (msg)=>{
        let username =  localStorage.getItem("username");
        msgcon.innerHTML += `
            <div><h3>${username}</h3> : ${msg}</div>
        `
    })

    tochat.addEventListener('click', ()=>{
        localStorage.setItem("username", name.value);
        window.location.href = `${mainPath}/chat`
    })
    
})