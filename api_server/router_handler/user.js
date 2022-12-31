// 导入数据库操作模块
const db = require('../db/index');
// 导入 bcryptjs 这个包
const bcrypt = require('bcryptjs');
//生成token
const jwttoken = require('jsonwebtoken');
const jwtconfig = require('../config');
const fs = require('fs');
const os = require('os');

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

var ip = getIpAddress();

// 注册新用户的处理函数
exports.regUser = (req, res) => {
  // 获取客户端提交到服务器的用户信息
  const userinfo = req.body;

  // 定义 SQL 语句，查询用户名是否被占用
  const sqlStr = 'select * from users where id=?';
  db.query(sqlStr, userinfo.id, (err, results) => {
    // 执行 SQL 语句失败
    if (err) {
      return res.cc(err);
    }
    // 判断用户名是否被占用
    if (results.length > 0) {
      return res.cc('用户名被占用，请更换其他用户名！', 2);
    }
    // 调用 bcrypt.hashSync() 对密码进行加密
    userinfo.password = bcrypt.hashSync(userinfo.password, 10);

    // 定义插入新用户的 SQL 语句
    const sql = 'insert into users set ?';
    // 调用 db.query() 执行 SQL 语句
    db.query(sql, { id: userinfo.id, password: userinfo.password, name: userinfo.name }, (err, results) => {
      // 判断 SQL 语句是否执行成功
      // if (err) return res.send({ status: 1, message: err.message })
      if (err) return res.cc(err);
      // 判断影响行数是否为 1
      if (results.affectedRows !== 1) return res.cc('注册用户失败，请稍后再试！', 1);
      // 注册用户成功
      res.cc('注册成功！', 0, 'http://' + ip + ':3007');
    })
  })
}

// 登录的处理函数
exports.login = (req, res) => {
  console.log("login post received!")
  const userinfo = req.body;
  console.log(userinfo)
  const sql = 'select * from users where id = ?';
  db.query(sql, userinfo.id, (err, results) => {
    if (err) {
      console.log("error!")
      return res.cc(err);
    }
    if (results.length !== 1) return res.cc('登陆失败');

    //比较密码是否正确
    const compare = bcrypt.compareSync(userinfo.password, results[0].password);
    if (!compare) return res.cc('密码输入错误');
    //else return res.cc('登陆成功', 0);

    const user = { ...results[0], password: '', user_pic: '' };//...为展开运算符，将results[0]中所有元素赋给user
    //利用用户信息生成token
    const token = jwttoken.sign(user, jwtconfig.jwtSecretKey, { expiresIn: jwtconfig.expiresIn });//有效期为3小时
    res.send({
      status: 0,
      message: '登陆成功！',
      token: 'Bearer ' + token,
      url: 'http://' + ip + ':3007/HomePage.html',
      name: results[0].name,
      id: results[0].id,
      serverIP: ip
    })
  })
}

// exports.index = (req, res) => {
//   console.log(req.url)

//   if (req.url === '/index') {
//     res.writeHead(200, { 'Content-Type': 'text/html' });
//     res.end(fs.readFileSync('./index.html'));
//   } else if (req.url === '/index/index.css') {
//     res.writeHead(200, { 'Content-Type': 'text/css' });
//     res.end(fs.readFileSync('./index.css'));
//   }
// }