//const http = require("http");
const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const note = require("./models/note");

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
app.use(express.json());

// const server = http.createServer((req, res) => {
//     // Log incoming request
//     console.log(`${req.method} ${req.url}`)

//     // Set Response Headers
//     res.statusCode = 200;
//     res.setHeader('Content-Type', 'text/plain');

//     // Send Response
//     res.end('Hello World! This is an API server running on Node.js\n');
// });

// Logger Middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`)
    next();
});

// Auth Middleware
const authMiddleware = (req, res, next) => {
    console.log('Auth check: no real logic yet');
    next();
}
// app.use(authMiddleware);

// Add Notes
app.post("/api/v1/notes", async (req, res) => {
    const { title, content } = req.body;
    const newNote = new note({ title, content });
    await newNote.save();
    res.status(201).send("Note Created Successfully");
});

// Get All Notes
app.get("/api/v1/notes", (req, res) => {
    res.status(200).send("Get All Notes Request Received");
});

// Root Route
app.get("/", (req, res) => {
    res.status(200).send("Hello World! This is an API Server running with Express Framework");
})

// Error Middleware
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
});

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        })
    })
    .catch(err => console.error('Connection Error:', err));