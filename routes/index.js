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

/********************主前台页面 *********************/

/**
 * 获取轮播图
 */
router.get('/api/homebanner', (req, res) => {
    let sqlStr = 'SELECT * FROM homebanner';
    conn.query(sqlStr, (error, results, fields) => {
        if (error) {
            res.json({ err_code: 0, message: '请求轮播图失败' });
            console.log(error);
        } else {
            results = JSON.parse(JSON.stringify(results));
            res.json({ success_code: 200, message: results });
        }
    });
});

/**
 * 获取商品的类别数量
 */
router.get('/api/category', (req, res) => {
    let sqlStr = 'SELECT * FROM category';
    conn.query(sqlStr, (error, results, fields) => {
        if (error) {
            res.json({ err_code: 0, message: '请求商品类别数失败' });
            console.log(error);
        } else {
            results = JSON.parse(JSON.stringify(results));
            res.json({ success_code: 200, message: results });
        }
    });
});

/**
 * 获取首页商品数据
 */
router.get('/api/homeproductlist', (req, res) => {
    // 获取总分类
    let cateSqlStr = 'SELECT COUNT(*) FROM category';
    conn.query(cateSqlStr, (error, results, fields) => {
        if (!error) {
            let sqlStr = '';
            for (let i = 0; i < results[0]['COUNT(*)']; i++) {
                sqlStr += 'SELECT * FROM recommend WHERE category = ' + (i + 1) + ' LIMIT 3;';
            }
            conn.query(sqlStr, (error, results, fields) => {
                if (!error) {
                    results = JSON.parse(JSON.stringify(results));
                    res.json({ success_code: 200, message: results });
                }
            });
        }
    });
});

/**
 * 获取商品详细数据
*/
router.get('/api/goodsdetail', (req, res) => {
    // 获取参数
    let goodsNo = req.query.goodsNo;
    let sqlStr = 'SELECT * FROM recommend WHERE goods_id = ' + goodsNo;
    conn.query(sqlStr, (error, results, fields) => {
        if (!error) {
            results = JSON.parse(JSON.stringify(results));
            res.json({ success_code: 200, message: results });
        }
    });
});

/**
 *请求商品评论
*/
router.get('/api/comment', (req, res) => {
    // 获取参数
    let goodsId = req.query.goodsId;
    let sqlStr = 'SELECT user_info.id, user_info.user_name, user_info.user_nickname, comments.comment_detail, comments.comment_id, comments.comment_rating, comments.goods_id FROM user_info INNER JOIN comments ON user_info.id = comments.user_id WHERE goods_id = ' + goodsId;
    conn.query(sqlStr, (error, results, fields) => {
        if (!error) {
            results = JSON.parse(JSON.stringify(results));
            res.json({ success_code: 200, message: results });
        }
    });
});

/**
 * 提交商品评论
*/
router.post('/api/postcomment', (req, res) => {
    // 获取参数
    let goods_id = req.body.goods_id;
    let comment_detail = req.body.comment_detail;
    let comment_rating = req.body.comment_rating;
    let user_id = req.body.user_id;
    const addSql = "INSERT INTO comments(goods_id, comment_detail, comment_rating, user_id) VALUES (?, ?, ?, ?)";
    const addSqlParams = [goods_id, comment_detail, comment_rating, user_id];
    conn.query(addSql, addSqlParams, (error, results, fields) => {
        results = JSON.parse(JSON.stringify(results));
        if (!error) {
            // 更新数据
            let sqlStr = "UPDATE recommend SET comments_count = comments_count + 1 WHERE goods_id = " + goods_id;
            conn.query(sqlStr, (error, results, fields) => {
                if (error) {
                    console.log(error);
                } else {
                    res.json({ success_code: 200, message: "评论发布成功" });
                }
            });
        }
    });
});





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

/**
*  根据session中的用户id获取用户信息
* */
router.get('/api/user_info', (req, res) => {
    // 获取参数
    let userId = req.query.user_id || req.session.userId;

    let sqlStr = "SELECT * FROM user_info WHERE id = " + userId + " LIMIT 1";
    conn.query(sqlStr, (error, results, fields) => {
        if (error) {
            res.json({ err_code: 0, message: '请求用户数据失败' });
        } else {
            results = JSON.parse(JSON.stringify(results));
            if (!results[0]) {
                delete req.session.userId;
                res.json({ error_code: 1, message: '请先登录' });
            } else {
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
                });
            }
        }
    });
});


/**
 * 修改/更新用户信息
 */
router.post('/api/update_user_info', (req, res) => {
    // 获取客户端传过来的信息
    const form = new formidable.IncomingForm();
    form.uploadDir = config.uploadsAvatarPath;  // 上传图片放置的文件夹
    form.keepExtensions = true; // 保持文件的原始扩展名
    form.parse(req, (err, fields, files) => {
        if (err) {
            return next(err);
        }
        let id = fields.id;
        let user_phone = fields.user_phone || '';
        let user_nickname = fields.user_nickname || '';
        let user_sex = fields.user_sex || '';
        let user_address = fields.user_address || '';
        let user_birthday = fields.user_birthday || '';
        let user_sign = fields.user_sign || '';
        let user_avatar = 'http://localhost:' + config.port + '/avatar_uploads/avatar_default.jpg';
        if (files.user_avatar) {
            user_avatar = 'http://localhost:' + config.port + '/avatar_uploads/' + basename(files.user_avatar.path);
        } else {
            //用户未修改头像，保留原头像
            user_avatar = fields.user_avatar
        }

        // 验证
        if (!id) {
            res.json({ err_code: 0, message: '修改用户信息失败!' });
        }

        // 更新数据
        let sqlStr = "UPDATE user_info SET user_phone = ? , user_nickname = ? , user_sex = ?, user_address = ?, user_birthday = ?, user_sign = ?, user_avatar = ? WHERE id = " + id;
        let strParams = [user_phone, user_nickname, user_sex, user_address, user_birthday, user_sign, user_avatar];
        conn.query(sqlStr, strParams, (error, results, fields) => {
            if (error) {
                console.log(error);
                res.json({ err_code: 0, message: '修改用户信息失败!' });
            } else {
                res.json({ success_code: 200, message: '修改用户信息成功!' });
            }
        });
    });
});


/**
 * 修改用户密码
 */
router.post('/api/update_user_password', (req, res) => {
    // 获取数据
    let id = req.body.id;
    let originPw = '';
    let newPw = md5(md5(req.body.newPw) + S_KEY);
    if (req.body.originPw) {
        originPw = md5(md5(req.body.originPw) + S_KEY);
    }

    let sqlStr = "SELECT * FROM user_info WHERE id = " + id;
    conn.query(sqlStr, (error, results, fields) => {
        if (error) {
            console.log(error);
            res.json({ err_code: 0, message: '查询失败!' });
        } else {
            results = JSON.parse(JSON.stringify(results));
            if (results[0]) {
                // 用户存在
                if (!results[0].user_pwd || (results[0].user_pwd && originPw === results[0].user_pwd)) {
                    let sqlStr = "UPDATE user_info SET user_pwd = ? WHERE id = " + id;
                    conn.query(sqlStr, [newPw], (error, results, fields) => {
                        if (!error) {
                            res.json({ success_code: 200, message: '修改密码成功!' });
                        }
                    });
                } else if (originPw != results[0].user_pwd) {
                    res.json({ err_code: 0, message: '输入的原密码错误!' });
                }
            } else {
                res.json({ err_code: 0, message: '用户不存在!' });
            }
        }
    });
});


// module.exports = router
export default router



