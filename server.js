const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// Sirve la carpeta "public" con ruta absoluta
app.use(express.static(path.join(__dirname, "public")));

// Ruta raíz → home.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/instructions", (req, res) => {
  res.sendFile(path.join(__dirname, "instructions.html"));
});

// Ruta /juego → index.html
app.get("/juego", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

// Necesario para Vercel
module.exports = app;
