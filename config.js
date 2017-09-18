'use strict'

var path = require('path')
var util = require('./libs/util')
var wechat_file = path.join(__dirname, './config/wechat.txt')

// 微信配置
var config = {
	wechat: {
		appID: 'wx9dde0694c01cc015',
		appSecret: '294fe7ec5853bf407664973fa4d580b0',
		token: 'wangyuanwmm1991mmwnauygnaw',
		// 获取票据
		getAccessToken: function() {
			return util.readFileAsync(wechat_file)
		},
		// 保存票据
		saveAccessToken: function(data) {
			data = JSON.stringify(data)
			return util.writeFileAsync(wechat_file, data)
		},
	}
}

module.exports = config