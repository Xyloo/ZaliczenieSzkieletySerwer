require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const connectDB = require('./db');
const http = require('http');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
connectDB()

const privateKey = fs.readFileSync('./localhost+2-key.pem', 'utf8');
const certificate = fs.readFileSync('./localhost+2.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080;

const userRoutes = require("./routes/users")
const authRoutes = require("./routes/auth")
const recipeRoutes = require("./routes/recipes")
const commentRoutes = require("./routes/comments")

app.use("/api/users", userRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/recipes", recipeRoutes)
app.use("/api/comments", commentRoutes)

const server = http.createServer(app);
const httpsServer = https.createServer(credentials, app);
server.listen(8080, () => console.log(`Server is running on port ${PORT}`));
httpsServer.listen(8443, () => console.log(`Server is running on port 8443`));