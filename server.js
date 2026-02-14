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
app.get("/", (req, res) => {
    res.render('username')
})

app.get("/chat", (req, res) => {
    res.render('home')
})


io.on('connection', (socket)=>{
    console.log('new connection', socket.id)

    socket.on('msg', (msg,username)=>{
        msg = `
            <div><h3>${username}</h3> <p style="border: 1px solid black; padding: 5px; background-color: lightgreen;">${msg}</p></div>
        `
        io.emit('msg', (msg))
    })

    socket.on('disconnect', ()=>{
        console.log('disconnect:', socket.id)
    })
})
