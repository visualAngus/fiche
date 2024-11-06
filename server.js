const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('certs/server.key'),
    cert: fs.readFileSync('certs/server.crt')
};


https.createServer(options, (req, res) => {
    res.writeHead(200);
    res.end('Hello World!');
}).listen(3000, () => {
    console.log('Server is running at https://localhost:3000');
});
