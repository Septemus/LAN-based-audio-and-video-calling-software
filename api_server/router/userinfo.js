const userinfo = require('../router_handler/userinfo');
const express = require('express');
const router = express.Router();

router.get('/userinfo', userinfo.userinfo);
router.get('/updatepwd', userinfo.userinfo);

module.exports = router;