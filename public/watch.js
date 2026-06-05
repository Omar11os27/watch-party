const srtUrl = "/subtitles/distant.srt";

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
const reMsg = document.querySelector('.msgInput .reMsg')


//startup
video.src = defualturl

//global storage
let client = {
    id: 0,
    master: false,
    reChat: false,

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
inputmsg.addEventListener('keydown', (e)=>{
    if(e.key == 'Enter'){
        e.preventDefault()
        sendmsg.click()
        inputmsg.blur();
        let lastmsg = msglist.lastElementChild
        lastmsg.scrollIntoView({ behavior: 'smooth' });
    }
})
sendmsg.addEventListener('click', ()=>{
    let msg = inputmsg.value
    inputmsg.value = ''
    if(msg == '') return

    if(msg == '/url'){
        let url = prompt('enter url: ')
        console.log(url)
        video.src = url
        socket.emit('newURL', {url: url})
        return
    }
    
    let now = new Date()
    const time = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
    });

    let nameR = ''
    let textR = ''
    let timeR = ''
    if(client.reChat){
        const msgR = document.querySelector('.reMsg')
        nameR = msgR.querySelector('.name p').innerText
        textR = msgR.querySelector('.text').innerText
        timeR = msgR.querySelector('.time').innerText

        if(textR.length >=20){
            textR = textR.slice(0,30)
            textR += ` . . . `
        }
    }

    msglist.innerHTML += `
        <div class="msg">
            ${(client.reChat)?
                `<div class="msgReChat">
                    <h4 class="name">
                        <p style="color: #4c016e;">${nameR}</p>
                        <span class="time">${timeR}</span>
                    </h4>
                    <p class="text">${textR}</p>
                </div>`: ''
            }
            
            
            <div class="mainmsg">
                <h2 class="name">
                    <p>انت</p>
                    <span class="time">${time}</span>
                </h2>
                <p class="text">${msg}</p>
                <button class="reChat" onclick="reChatmsg(this)"><img src="/icons/reChat.png" alt="reChat"></button>
            </div>
        </div>
    `

    // if(client.reChat){

    // }


    let lastmsg = msglist.lastElementChild
    lastmsg.scrollIntoView({ behavior: 'smooth' });
    reMsg.style.display = 'none'
    socket.emit('sendmsg', {
        msg: msg, time: time
        ,nameR: nameR, timeR: timeR, textR: textR ,reChat: client.reChat
    })
    client.reChat = false
})
socket.on('sendmsg', (data)=>{
    let msg = data.msg


    let nameR = ''
    let textR = ''
    let timeR = ''
    if(data.reChat){
        nameR = data.nameR
        textR = data.textR
        timeR = data.timeR

        if(textR.length >=20){
            textR = textR.slice(0,30)
            textR += ` . . . `
        }
    }

    msglist.innerHTML += `

        <div class="msg leftmsg friendBg">
            ${(data.reChat)?
                `<div class="msgReChat reChatfriend">
                    <h4 class="name">
                        <p style="color: #9c0000;">${nameR}</p>
                        <span class="time">${timeR}</span>
                    </h4>
                    <p class="text">${textR}</p>
                </div>`: ''
            }
        
            <div class="mainmsg">
                <h2 class="name friendname">
                    <p>صديقك</p>
                    <span class="time">${data.time}</span>
                </h2>
                <p class="text">${msg}</p>
                <button class="reChat" onclick="reChatmsg(this)"><img src="/icons/reChat.png" alt="reChat"></button>
            </div>
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


//reChat
function reChatmsg(btn){
    const msg = btn.closest('.msg')
    const name = msg.querySelector('.name p').innerText
    let text = msg.querySelector('.text').innerText
    const time = msg.querySelector('.time').innerText

    if(text.length >=20){
        text = text.slice(0,30)
        text += ` . . . `
    }

    reMsg.innerHTML = `
        <h2 class="name friendname">
            <p>${name}</p>

            <span class="time">${time}</span>
        </h2>
        <p class="text">${text}</p>
        <button class="canncel" onclick="canncel()">X</button>
    `
    client.reChat = true
    reMsg.style.display = 'flex'
    inputmsg.focus();
}

function canncel(){
    client.reChat = false
    reMsg.style.display = 'none'
}



//subtitle
const subBox = document.getElementById('subBox');


let subtitles = [];

// تحميل وقراءة الملف
fetch(srtUrl)
    // هنا السحر: نحول الملف إلى Blob وبعدين نقراه بترميز عربي صحيح
    .then(response => response.blob())
    .then(blob => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const srtContent = e.target.result;
            
            // تشغيل المكتبة لتفكيك الملف بعد ما انقره صح
            subtitles = Subtitle.parse(srtContent);
            console.log("الترجمة جاهزة ومفهومة:", subtitles);
        };
        
        // جرب أول شي windows-1256 (هو الأغلب لملفات الـ SRT العربية)
        reader.readAsText(blob, 'windows-1256'); 
        
        // 💡 ملاحظة: إذا جربت وطلعت بعده شخابيط، بس بدل 'windows-1256' الفوق وسويها 'utf-8'
    })
    .catch(err => console.error("خطأ في تحميل ملف الترجمة:", err));
// تحديث الكلام وية مشي الفيديو
video.addEventListener('timeupdate', () => {
    // نحول وقت الفيديو الحالي إلى ملي ثانية
    const currentTimeMs = video.currentTime * 1000;

    // نبحث عن السطر المناسب للوقت الحالي (بالنسخة v2 الكائن يرجع كـ start و end مباشرة داخل الـ item)
    const currentCue = subtitles.find(item => 
        currentTimeMs >= item.start && 
        currentTimeMs <= item.end
    );

    if (currentCue) {
        subBox.innerHTML = currentCue.text;
    } else {
        subBox.innerHTML = "";
    }
});
//end subtitle




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








