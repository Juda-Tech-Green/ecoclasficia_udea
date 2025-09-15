const express = require('express');
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Redirige la raíz (/) a home.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/home.html');
});

// Redirige /juego a index.html
app.get('/juego', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Ruta comodín para manejar cualquier otra solicitud no encontrada
app.get('*', (req, res) => {
    res.status(404).sendFile(__dirname + '/public/404.html');
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});