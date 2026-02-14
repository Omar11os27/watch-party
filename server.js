const express = require("express")
const app = express()

app.use(express.static("public"));
// sockect.io
const http = require('http').Server(app)
const io = require('socket.io')(http)

const port = 3000
// start server
http.listen(port, () => {
    console.log(`listening on port ${port}`)
})

//view engine setup 
app.set("view engine", "ejs");

//Routes 
app.get("/chat", (req, res) => {
    res.render('home')
})


io.on('connection', (socket)=>{
    console.log('new connection', socket.id)

    socket.on('msg', (msg)=>{
        let msgshow = `<h3>${socket.id}</h3> msg: ${msg}`;
        io.emit('msg', (msgshow))
    })

    socket.on('disconnect', ()=>{
        console.log('disconnect:', socket.id)
    })
})
