const mysql = require('mysql'); //引入数据库

const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '123456',
  database: 'mysql1',
});

module.exports = db;
