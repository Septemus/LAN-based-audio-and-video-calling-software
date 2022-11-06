// 导入 express
const express = require('express');
// 创建服务器的实例对象
const app = express();
const joi = require('@hapi/joi');
const os = require('os');
// 获取IP地址
function getIpAddress() {
  var interfaces = os.networkInterfaces() //获取网络接口
  for (var dev in interfaces) {
    let iface = interfaces[dev]

    for (let i = 0; i < iface.length; i++) {
      let { family, address, internal } = iface[i]

      if (family === 'IPv4' && address !== '127.0.0.1' && !internal) {
        return address
      }
    }
  }
}
const ip = getIpAddress();
//引入socket.io
const { createServer } = require("http");
const httpServer = createServer(app);
const { Server } = require("socket.io");
const io = new Server(httpServer, {
  cors: {
    origin: "http://" + ip + ":3007",
  }
});
// 导入并配置 cors 中间件
const cors = require('cors');
app.use(cors());



//设置静态登陆界面
const path = require('path')
app.use(express.static(path.join(__dirname, 'public')));

// 配置解析表单数据的中间件，只能解析 application/x-www-form-urlencoded 格式的表单数据
app.use(express.urlencoded({ extended: false }));

// 封装 res.cc 函数
app.use((req, res, next) => {
  // status 默认值为 1，表示失败的情况
  // err 的值，可能是一个错误对象，也可能是一个错误的描述字符串
  res.cc = function (err, status = 1, url) {
    res.send({
      status,
      message: err instanceof Error ? err.message : err,
      url: url
    })
  }
  next();
})


//导入并配置jwt解析的中间件
const config = require('./config');
const jwt = require('express-jwt');
//app.use(jwt({ secret: config.jwtSecretKey }).unless({ path: [/^\/api\//] }));

// 导入并使用用户路由模块
const userRouter = require('./router/user');
app.use('/api', userRouter);
const userinfo = require('./router/userinfo');
app.use('/my', userinfo);

// 定义错误级别的中间件
app.use((err, req, res, next) => {
  // 验证失败导致的错误
  if (err instanceof joi.ValidationError) return res.cc(err);
  if (err.name === 'UnauthorizedError') return res.cc('身份验证失败')
  // 未知的错误
  res.cc(err);
})

const L = require("list");
var l = L.list(); //用户列表

io.on('connect', (socket) => {
  io.to(socket.id).emit('init', L.toArray(l));

  socket.on('login', (data) => {
    const info = JSON.parse(data);
    l = L.append({ 'sid': info.sid, 'id': info.id, 'name': info.name }, l);//当io监听到有人登录 将sid、id和名字添加到list
    io.emit('online', data);
  })

  socket.on('disconnect', () => {
    io.emit('offline', socket.id);
    var a = L.toArray(l);
    for (var i = 0; i < a.length; i++) {  //监听到有人退出，从列表中把推出的用户信息删除
      if (a[i].sid === socket.id) {
        l = L.remove(i, 1, l);
        return;
      }
    }
  })

  socket.on('calling', (data) => {
    io.emit('called', data);
  });

  socket.on('refuse', (data) => {
    var info = JSON.parse(data);
    io.to(info.callingSid).emit('refuse', info.name); //
  });

  socket.on('agree', callingSid => {
    console.log(callingSid);
    io.to(callingSid).emit('agree',);
  })
})

// 启动服务器
httpServer.listen(3007, () => {
  console.log('api server running at http://' + ip + ':3007');
})
