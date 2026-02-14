window.addEventListener('load', ()=>{
    const mainPath = "https://watch-party-v2gx.onrender.com";
    const socket = io(mainPath)
    // const socket = io()

    // html element
    const msginput = document.querySelector('#msginput')
    const msgform = document.querySelector('#msgform')
    const msgcon = document.querySelector('#msgcon')
    

    msgform.addEventListener('submit', (e)=>{
        e.preventDefault()
        let msg = msginput.value
        msginput.value = ""

        let username = localStorage.getItem("username");
        // send
        socket.emit('msg', msg,username)
    })

    socket.on('msg', (msg)=>{
        msgcon.innerHTML += msg
    })

    
    
})