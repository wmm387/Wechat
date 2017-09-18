'use strict'

var sha1 = require('sha1')
var getRawBody = require('raw-body')
var Wechat = require('./wechat')
var util = require('./util')

module.exports = function(opts, handler) {
	var wechat = new Wechat(opts)

	return async (ctx, next) => {
		// 获取微信配置信息
		var that = ctx
		var token = opts.token
		var signature = ctx.query.signature
		var nonce = ctx.query.nonce
		var timestamp = ctx.query.timestamp
		var echostr = ctx.query.echostr
		var str = [token, timestamp, nonce].sort().join('')
		var sha = sha1(str)

		//判断请求方法
		if (ctx.method === 'GET') {
			if (sha == signature) {
				ctx.body = echostr + ''
			}else {
				ctx.body = 'error'
			}
		}else if (ctx.method === 'POST') {
			if (sha !== signature) {
				ctx.body = 'error'
				return false
			}

			// 获取收到信息
			var data = await getRawBody(ctx.req, {
				length: ctx.length,
				limit: "1mb",
				encoding: ctx.charset,
			})

			// 处理收到的信息,使其容易使用
			var content = await util.parseXMLAsync(data)
			var message = util.formatMessage(content.xml)

			ctx.weixin = message //信息传递

			console.log(message)

			await handler(ctx, next) //等待业务层

			wechat.reply.call(ctx) //实现回复

		}
	}
}