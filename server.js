require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const connectDB = require('./db');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
connectDB()

const privateKey = fs.readFileSync('./localhost+2-key.pem', 'utf8');
const certificate = fs.readFileSync('./localhost+2.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8080;

const userRoutes = require("./routes/users")
const authRoutes = require("./routes/auth")
const recipeRoutes = require("./routes/recipes")
const commentRoutes = require("./routes/comments")

app.use("/api", userRoutes)
app.use("/api/auth", authRoutes)
app.use("/api", recipeRoutes)
app.use("/api", commentRoutes)

const server = http.createServer(app);
const httpsServer = https.createServer(credentials, app);
server.listen(8080, () => console.log(`Server is running on port ${PORT}`));
httpsServer.listen(8443, () => console.log(`Server is running on port 8443`));