const express = require('express');
const http = require('http'); 
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); // نربط Express بسيرفر الـ HTTP
// const db = require('./database'); // ملف الاتصال اللي سويناه


app.use(express.static("public"));
// هنا الربط الحقيقي لـ Socket.io مع حل مشكلة الـ CORS
const io = new Server(server, {
  cors: {
    origin: "*", // هذا يسمح لأي متصفح يتصل بيك (ضروري للتطوير)
    methods: ["GET", "POST"]
  }
});


//view engine setup 
app.set("view engine", "ejs");


//Routes
app.get("/", (req, res) => {
    //input url and some data before watch video
    res.render('watch')
})

app.get("/watch", (req, res) => {
    res.render('watch')
})


let global = {
    masterid: '',
    id: 0,
    time: [],
    indexTime: 0,

}

let interval = null


io.on('connection', (socket)=>{

    console.log(`${socket.id}, connnected`)
    global.id++
    io.to(socket.id).emit('myID', {id: global.id})

        //save master id
    socket.on('master', ()=>{
        global.masterid = socket.id
        console.log(`set [${socket.id}] as master`)
    })
        //wait client click on async then async time
    socket.on('async', ()=>{
        io.to(global.masterid).emit('getCurTime', {all: false})
    })
    socket.on('getCurTime', (data)=>{
        io.emit('setCurTime', {time: data.time})
    })   
        //

    socket.on('howTimeAll', ()=>{
        io.emit('getCurTime', {all: true});
    })
    socket.on('getCurTimeAll', (data)=>{
        global.time[global.indexTime] = data.time
        global.indexTime++
        // console.log(`id ${data.id}=> ${data.time.min}:${data.time.sec}`)
        if(global.time.length == 2){
            let time = global.time
            global.time = []
            global.indexTime = 0

            if(dif(time[0].min,time[1].min) >= 1 || dif(time[0].sec,time[1].sec) >= 2){
                io.emit('async')
                console.log('interval checked and async')
            }else{
                console.log('interval checked and no async, OK')
            }
        }
    })
     
    
    socket.on('play', ()=>{
        socket.broadcast.emit('play')
        // clearInterval(interval)
        // interval = setInterval(()=>{
        //     io.emit('getCurTime', {all: true});
        // }, 3000)
    })

    socket.on('pause', ()=>{
        // clearInterval(interval)
        socket.broadcast.emit('pause')
    })

    socket.on('subtitle',()=>{io.emit('subtitle')})


        //chat msg
    socket.on('sendmsg', (data)=>{
        // let msg = data.msg
        // let time = data.time
        socket.broadcast.emit('sendmsg', data)
    })
        //'newURL'
    socket.on('newURL', (data)=>{
        let url = data.url
        socket.broadcast.emit('newURL', {url: url})
    })











    //functions
    function dif(num1,num2){
        if(num1 > num2){
            return num1-num2
        }else{
            return num2-num1
        }
    }











    
    socket.on('disconnect', ()=>{
        console.log('disconnect:', socket.id)
    })
    
})//end connection





const port = process.env.PORT || 8000

server.listen(port, () => {
    console.log(`listening on port ${port}`)
})