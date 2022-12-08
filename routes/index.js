import express from 'express'
const router = express.Router({})

import conn from './../db/db'
import config from '../src/config'
import sms_util from './../utils/sms_util'

// import svgCaptcha from 'svg-captcha'
import md5 from 'blueimp-md5'
import formidable from 'formidable'
import { basename } from 'path'

const S_KEY = '@WaLQ1314?.LqFtK.Com.#'; // 盐
const users = {} //用户信息

/********************前台页面 *********************/

/**
 * 用户名+密码登录
 */
router.post('/api/login', (req, res) => {
    // console.log(req.session.captcha);
    // console.log(tmp_captcha);
    // 获取数据
    const user_name = req.body.username;
    const user_pwd = md5(md5(req.body.password) + S_KEY);

    // 查询数据
    let sqlStr = "SELECT * FROM user_info WHERE user_name = '" + user_name + "' LIMIT 1";
    conn.query(sqlStr, (error, results, fields) => {
        if (!results[0]) {
            res.json({ err_code: 0, message: '该用户不存在!' });
        } else {
            results = JSON.parse(JSON.stringify(results));

            if (results[0]) {  // 用户已经存在
                // 验证密码是否正确
                if (results[0].user_pwd !== user_pwd) {
                    res.json({ err_code: 0, message: '密码不正确!' });
                } else {
                    req.session.userId = results[0].id;

                    res.json({
                        success_code: 200,
                        message: {
                            id: results[0].id,
                            user_name: results[0].user_name || '',
                            user_nickname: results[0].user_nickname || '',
                            user_phone: results[0].user_phone || '',
                            user_sex: results[0].user_sex || '',
                            user_address: results[0].user_address || '',
                            user_sign: results[0].user_sign || '',
                            user_birthday: results[0].user_birthday || '',
                            user_avatar: results[0].user_avatar || ''
                        },
                        info: '登录成功!'
                    });
                }
            }
        }
    });
});

/**
 * 用户注册
 */
router.post('/api/register', (req, res) => {
    const user_name = req.body.username
    const user_pwd = md5(md5(req.body.password) + S_KEY);

    const sqlStr = "SELECT * FROM user_info WHERE user_name = '" + user_name + "' LIMIT 1"
    conn.query(sqlStr, (error, results, fields) => {
        
        if (results[0]) {
            res.json({ err_code: 0, message: '该用户已存在!' });
        } else {
            // 新用户
            const addSql = "INSERT INTO user_info(user_name, user_pwd, user_avatar) VALUES (?, ?, ?)";
            const addSqlParams = [user_name, user_pwd, 'http://localhost:' + config.port + '/avatar_uploads/avatar_default.jpg'];
            conn.query(addSql, addSqlParams, (error, results, fields) => {
                results = JSON.parse(JSON.stringify(results));
                if (!error) {
                    req.session.userId = results.insertId;
                    let sqlStr = "SELECT * FROM user_info WHERE id = '" + results.insertId + "' LIMIT 1";
                    conn.query(sqlStr, (error, results, fields) => {
                        if (error) {
                            res.json({ err_code: 0, message: '注册失败' });
                        } else {
                            results = JSON.parse(JSON.stringify(results));

                            res.json({
                                success_code: 200,
                                message: {
                                    id: results[0].id,
                                    user_name: results[0].user_name || '',
                                    user_nickname: results[0].user_nickname || '',
                                    user_avatar: results[0].user_avatar || ''
                                },
                                info: '注册成功！'
                            });
                        }
                    });
                }
            });
        }
    })







})

module.exports = router



