'use strict'

var xml2js = require('xml2js')
var Promise = require('bluebird')
var tpl = require('./tpl')

// 将xml数据转换为json数据
exports.parseXMLAsync = function(xml) {
	return new Promise(function(resolve, reject) {
		xml2js.parseString(xml, {trim: true}, function(err, content) {
			if (err) reject(err)
			else resolve(content)
		})
	})
}

// 格式化数据
function formatMessage(result) {
	var message = {}
	if (typeof result === 'object') {
		var keys = Object.keys(result)

		for (var i = 0; i < keys.length; i++) {
			var item = result[keys[i]]
			var key = keys[i]

			if (!(item instanceof Array) || item.length === 0) {
				continue
			}

			if (item.length === 1) {
				var val = item[0]

				if (typeof val === 'object') {
					message[key] = formatMessage(val)
				} else {
					message[key] = (val || '').trim()
				}
			} else {
				message[key] = []
				for (var j = 0; j < item.length; j++) {
					message[key].push(formatMessage(item[j]))
				}
			}
		}
	}
	return message
}
exports.formatMessage = formatMessage

// 根据传入的数据信息,返回需要回复的数据信息
exports.tpl = function(content, message) {

	var info = {}
	var type = 'text'
	// 默认回复类型为文本
	if (content.type) {
		type = content.type
	}
 	var fromUserName = message.FromUserName
 	var toUserName = message.ToUserName

 	//判断回复内容,如果是数组,则是图文类型
 	if (Array.isArray(content)) {
 		type = 'news'
 	}

 	info.content = content
 	info.createTime = new Date().getTime()
 	info.msgType = type
 	info.toUserName = fromUserName
 	info.fromUserName = toUserName

 	return tpl.compiled(info)
}