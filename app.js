'use strict'
// 引入koa模板
var Koa = require('koa')
// 引入微信中间件
var wechat = require('./wechat/g')
// 引入util工具
var util = require('./libs/util')
// 引入微信配置文件
var config = require('./config')
// 引入微信模块
var reply = require('./weixin/reply')

var app = new Koa()
//使用wechat中间件,并传入微信配置信息
app.use(wechat(config.wechat, reply.reply))
//设置自定义菜单
app.use(reply.setMenu)

app.listen(1234)
console.log('Listening: 1234')