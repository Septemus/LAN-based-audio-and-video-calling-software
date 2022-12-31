const HTTPS_PORT = 8443;
const fs = require('fs');

const serverConfig = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

// ----------------------------------------------------------------------------------------

var express = require('express');
const app = express();
const https = require('https');
// const httpsServer = https.createServer(serverConfig, handleRequest);
const httpsServer = https.createServer(serverConfig, app);
const { Server } = require('socket.io');
const io = new Server(httpsServer);
//io.listen(httpsServer).sockets;
const path = require('path')
app.use(express.static(path.join(__dirname, '../public')));
// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls
//const io = new WebSocketServer({ server: httpsServer });
const os=require('os')
function getIpAddress() {
  var interfaces = os.networkInterfaces() //获取网络接口
  for (var dev in interfaces) {
    let iface = interfaces[dev]
    for (let i = 0; i < iface.length; i++) {
      let { family, address, internal } = iface[i]
      if (dev.search('WLAN')!=-1&&family === 'IPv4' && address !== '127.0.0.1' && !internal) {
        return address
      }
    }
  }
}
const ip=getIpAddress()
io.on('connection', function (socket) {
  // const sockets = io.allSockets();
  // console.log(sockets);
  // const sockets = io.fetchSockets();
  // for (const socket of sockets)
  //   console.log(socket.id);

  socket.on('message', function (message) {
    var data = JSON.parse(message);
    io.to(data.rooms).emit('message', message);
  });

  socket.on('error', (err) => {
    console.log(err);
  })

  socket.on('rooms', function (rooms) {
    var count = 0;
    var message = JSON.parse(rooms);
    socket.join(message.rooms);
    console.log(socket.id + '成功加入' + message.rooms);
    io.in(message.rooms).allSockets().then(items => {
      items.forEach(item => {
        count = count + 1;
      })
    });
    console.log(count);
  })

  socket.on("disconnect", async () => {
    const sockets = await io.fetchSockets();
    for (const socket of sockets)
      console.log(socket.id);
  });
});


httpsServer.listen(HTTPS_PORT, ip);
console.log(`Server running. Visit https://${ip}:` + HTTPS_PORT + ' in Firefox/Chrome'
);
