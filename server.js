const express = require('express');
const bodyParser = require("body-parser");

const app = express()
const port = process.env.PORT || 3000

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.get('/juego', (req,res)=>{
    res.sendFile(__dirname + '/index.html');
});

app.get('/',(req,res)=>{
    res.sendFile(__dirname + '/home.html')
})


app.listen(port, ()=>{
    console.log(`Server started on port ${port}`)
});