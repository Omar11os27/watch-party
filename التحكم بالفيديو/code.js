let video = document.querySelector('.video')
let start = document.querySelector('.start')
let pause = document.querySelector('.pause')
let time = document.querySelector('.time')

start.addEventListener('click', ()=>{
    video.play()
})

pause.addEventListener('click', ()=>{
    video.pause()
})

time.addEventListener('click', ()=>{
    // goto(62,43)
    // gettime()
})

function goto(m,s){
    let totalSeconds = (m * 60) + s;        
    video.currentTime = totalSeconds;
}

function gettime(){
    let curtime = video.currentTime
    let m = Math.floor((curtime)/60)
    let s = Math.floor(curtime-(m*60))
    console.log( `time: ${m} : ${s}`)
}


