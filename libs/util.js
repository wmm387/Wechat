'use strict'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var fs = require('fs')
var Promise = require('bluebird')

// 读取文件数据
exports.readFileAsync = function(fpath, encoding) {
	return new Promise(function(resolve, reject) {
		fs.readFile(fpath, encoding, function(err, content) {
			if (err) reject(err)
			else resolve(content)
		})
	})
}

// 写入文件数据
exports.writeFileAsync = function(fpath, content) {
	return new Promise(function(resolve, reject) {
		fs.writeFile(fpath, content, function(err) {
			if (err) reject(err)
			else resolve()
		})
	})
}