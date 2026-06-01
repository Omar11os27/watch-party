// window.location.href = `name page`
// const socket = io('https://watch-party-v2gx.onrender.com')
const socket = io()

//varible
const defualturl = 'https://cdn.shabakaty.com/vascin24-mp4/C81F5AD3-D3E9-4617-8EC2-F9FEFD923833_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1780608755&Signature=EaNRjmEDHmpd2cHXLYntkG4Sbj4%3D'
const video = document.querySelector('.video')
const master = document.querySelector('.master')
const async = document.querySelector('.async')
const msglist = document.querySelector('.msglist')
const inputmsg = document.querySelector('.inputmsg')
const sendmsg = document.querySelector('.sendmsg')

//startup
video.src = defualturl

//global storage
let client = {
    id: 0,
    master: false,

}

//sockets
socket.on('myID', (data)=>{
    client.id = data.id
})
    //send master id
master.addEventListener('click', ()=>{
    client.master = true
    socket.emit('master')
})

    //send msg and newURL
sendmsg.addEventListener('click', ()=>{
    let msg = inputmsg.value
    inputmsg.value = ''

    if(msg == '/url'){
        let url = prompt('enter url: ')
        video.src = url
        socket.emit('newURL', {url: url})
        return
    }

    msglist.innerHTML += `
        <div class="msg">
            <h2 class="name">name</h2>
            <p class="text">${msg}</p>
        </div>
    `
    let lastmsg = msglist.lastElementChild
    lastmsg.scrollIntoView({ behavior: 'smooth' });
    socket.emit('sendmsg', {msg: msg})
})
socket.on('sendmsg', (data)=>{
    let msg = data.msg

    msglist.innerHTML += `
        <div class="msg leftmsg friendBg">
            <h2 class="name friendname">name</h2>
            <p class="text">${msg}</p>
        </div>
    `
    let lastmsg = msglist.lastElementChild
    lastmsg.scrollIntoView({ behavior: 'smooth' });
})
socket.on('newURL', (data)=>{
    video.src = data.url
})

async.addEventListener('click', ()=>{
    socket.emit('async')
})
socket.on('async', ()=>{
    socket.emit('async')
})

    //send current time to server for async with friends
socket.on('getCurTime', (data)=>{
    let time = gettime()
    if(data.all){
        socket.emit('getCurTimeAll', {time: time, id: client.id})
    }else{
        socket.emit('getCurTime', {time: time})
    }
})

    //async time with all friends
socket.on('setCurTime', (data)=>{
    let time = data.time
    goto(time.min, time.sec)
})

    //play
video.addEventListener('play', ()=>{
    if(!client.master) return
    socket.emit('play')
})
socket.on('play', ()=>{
    video.play()
})
    //pause
video.addEventListener('pause', ()=>{
    if(!client.master) return
    socket.emit('pause')
})
socket.on('pause', ()=>{
    video.pause()
})

video.addEventListener('seeked', ()=>{
    if(!client.master) return
    socket.emit('howTimeAll')
})


//functions
function goto(m,s){
    let totalSeconds = (m * 60) + s;        
    video.currentTime = totalSeconds;
}

function gettime(){
    let curtime = video.currentTime
    let m = Math.floor((curtime)/60)
    let s = Math.floor(curtime-(m*60))

    return {
        min: m,
        sec: s
    }
}








