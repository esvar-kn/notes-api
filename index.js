const http = require("http");

const PORT = 3000;

const server = http.createServer((req, res) => {
    // Log incoming request
    console.log(`${req.method} ${req.url}`)

    // Set Response Headers
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');

    // Send Response
    res.end('Hello World! This is an API server running on Node.js\n');
});

server.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`)
});