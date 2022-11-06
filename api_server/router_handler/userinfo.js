const { result } = require('@hapi/joi/lib/base');
const db = require('../db/index');

exports.userinfo = (req, res) => {
    const sql = 'select id,name,phone,user_pic from users where id=?';
    db.query(sql, req.user.id, (err, results) => {
        if (err) return res.cc(err);
        if (results.length !== 1) return res.cc('查询用户信息失败！');
        res.send({
            status: 0,
            message: '查询成功！',
            data: results[0],
        })
    });
}