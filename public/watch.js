// window.location.href = `name page`
const socket = io('https://watch-party-v2gx.onrender.com')

//varible
const url = 'https://cdn.shabakaty.com/vascin24-mp4/C81F5AD3-D3E9-4617-8EC2-F9FEFD923833_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1780608755&Signature=EaNRjmEDHmpd2cHXLYntkG4Sbj4%3D'
const video = document.querySelector('.video')
const master = document.querySelector('.master')
const async = document.querySelector('.async')

//startup
video.src = url

//global storage
let client = {
    id: 0,
}

//sockets
socket.on('myID', (data)=>{
    client.id = data.id
})
    //send master id
master.addEventListener('click', ()=>{
    socket.emit('master')
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
    socket.emit('play')
})
socket.on('play', ()=>{
    video.play()
})
    //pause
video.addEventListener('pause', ()=>{
    socket.emit('pause')
})
socket.on('pause', ()=>{
    video.pause()
})

video.addEventListener('seeked', ()=>{
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








