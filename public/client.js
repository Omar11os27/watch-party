window.addEventListener('load', ()=>{

    const socket = io("https://watch-party-v2gx.onrender.com")

    // html element
    const msginput = document.querySelector('#msginput')
    const msgform = document.querySelector('#msgform')
    const msgcon = document.querySelector('#msgcon')

    msgform.addEventListener('submit', (e)=>{
        e.preventDefault()
        let msg = msginput.value
        msginput.value = ""

        // send
        socket.emit('msg', msg)
    })

    socket.on('msg', (msg)=>{
        msgcon.innerHTML += `
            <div>${msg}</div>
        `
    })
    
})