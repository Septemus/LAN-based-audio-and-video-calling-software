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
   socket.on("sendMsg",function (data) {
     //data 为客户端发送的消息，可以是 字符串，json对象或buffer
    // 使用 emit 发送消息，broadcast 表示 除自己以外的所有已连接的socket客户端。
    console.log('1');
    socket.broadcast.to('rooms').emit('receiveMsg', data);
     io.sockets.emit("receiveMsg",data);
  })
});


httpsServer.listen(HTTPS_PORT, '0.0.0.0');
console.log('Server running. Visit https://localhost:' + HTTPS_PORT + ' in Firefox/Chrome'
);
