//const http = require("http");
const express = require('express');
const app = express();
const PORT = 3000;
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

app.use(authMiddleware);

// Root Route
app.get("/", (req, res) => {
    res.status(200).send("Hello World! This is an API Server running with Express Framework");
})

// Error Middleware
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
});

app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`)
});