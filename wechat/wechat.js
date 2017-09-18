'use strict'

var Promise = require('bluebird')
var _ = require('lodash')
var request = Promise.promisify(require('request'))
var util = require('./util')
var fs = require('fs')

var prefix = 'https://api.weixin.qq.com/cgi-bin/'
var api = {
	accessToken: prefix + 'token?grant_type=client_credential',
	temporary: {
		upload: prefix + 'media/upload?',//上传临时素材
		fetch: prefix + 'media/get?'//获取临时素材
	},
	permanent: {
		upload: prefix + 'material/add_material?',//上传永久素材(非图文)
		fetch: prefix + 'material/get_material?',//获取永久素材
		uploadNews: prefix + 'material/add_news?',//新增永久图文素材
		uploadNewsPic: prefix + 'media/uploadimg?',//上传图文消息内的图片获取URL
		del: prefix + 'material/del_material?',//删除永久素材
		update: prefix + 'material/update_news?',//修改永久素材
		count: prefix + 'material/get_materialcount?',//获取素材总数
		batch: prefix + 'material/batchget_material?'//获取素材列表
	},
	tag: {
		create: prefix + 'tags/create?',//创建标签
		getall: prefix + 'tags/get?',//获取所有标签
		check: prefix + 'tags/getidlist?',//查询某用户的所有标签
		update: prefix + 'tags/update?',//更新标签
		del: prefix + 'tags/delete?',//删除标签
		getone: prefix + 'user/tag/get?',//查询某标签下的所有用户
		batch: prefix + 'tags/members/batchtagging?',//批量为用户打标签
		move: prefix + 'tags/members/batchuntagging?',//批量为用户取消标签
	}
}

//票据更新
function Wechat(opts) {
	var that = this
	this.appID = opts.appID
	this.appSecret = opts.appSecret
	this.getAccessToken = opts.getAccessToken
	this.saveAccessToken = opts.saveAccessToken

	this.fetchAccessToken()
}

// 获取票据
Wechat.prototype.fetchAccessToken = function() {
	var that = this

	if (this.access_token && this.expires_in) {
		if (that.isValidAccessToken(this)) {
			return Promise.resolve(this)
		}
	}

	this.getAccessToken()
		.then(function(data) {
			try {
				data = JSON.parse(data)
			}catch(e) {
				return that.updateAccessToken(data)
			}

			if (that.isValidAccessToken(data)) {
				return Promise.resolve(data)
			}else {
				return that.updateAccessToken()
			}
		})
		.then(function(data) {
			that.access_token = data.access_token
			that.expires_in = data.expires_in

			that.saveAccessToken(data)

			return Promise.resolve(data)
		})
}

// 判断票据是否合法
Wechat.prototype.isValidAccessToken = function(data) {
	if (!data || !data.access_token || !data.expires_in) {
		return false
	}

	var access_token = data.access_token
	var expires_in = data.expires_in
	var now = (new Date().getTime())

	if (now < expires_in) {
		return true
	}else {
		return false
	}
}

// 更新票据
Wechat.prototype.updateAccessToken = function() {
	var appID = this.appID
	var appSecret = this.appSecret
	var url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret

	return new Promise(function(resolve, reject) {
		request({
			url: url,
			json: true
		}).then(function(response) {
			var data = response.body
			var now = (new Date().getTime())
			var expires_in = now + (data.expires_in - 20) * 1000
			data.expires_in = expires_in

			resolve(data)
		})
	})
}

// 上传素材
Wechat.prototype.uploadMaterial = function(type, material, permanent) {
	var that = this
	var form = {}
	// 默认上传方式为临时素材
	var uploadUrl = api.temporary.upload
	// 如果有永久选项,则为永久素材
	if (permanent) {
		uploadUrl = api.permanent.upload
		_.extend(form, permanent)
	}
	// 再次进行永久素材类型判断
	if (type === 'pic') {
		uploadUrl = api.permanent.uploadNewsPic
	}
	if (type === 'news') {
		uploadUrl = api.permanent.uploadNews
		form = material
	}else {
		form.media = fs.createReadStream(material)
	}

	return new Promise(function(resolve, reject) {
		// 返回一个Promise,获取票据后,进行接口调用
		that.fetchAccessToken().then(function(data) {
			var url = uploadUrl + 'access_token=' + data.access_token

			if (!permanent) {
				url += '&type=' + type
			}else {
				form.access_token = data.access_token
			}

			var options = {
				method: 'POST',
				url: url,
				json: true
			}

			if (type === 'news') {
				options.body = form
			}else {
				options.formData = form
			}

			request(options).then(function(response) {
				var _data = response.body
				if (_data) {
					resolve(_data)
				}else {
					throw new Error('Upload material fails')
				}
			}).catch(function(err) {
				reject(err)
			})
		})
	})
}

// 获取素材
Wechat.prototype.fetchMaterial = function(mediaId, type, permanent) {
	var that = this
	var form = {}
	var fetchUrl = api.temporary.fetch

	if (permanent) {
		fetchUrl = api.permanent.fetch
	}

	return new Promise(function(resolve, reject) {

		that.fetchAccessToken().then(function(data) {

			var url = fetchUrl + 'access_token=' + data.access_token

			var options = {method: 'POST', url: url, json: true}
			var form = {}

			if (permanent) {
				form.media_id = mediaId
				form.access_token = data.access_token
				options.body = form
			}else {
				if (type === 'video') {
					url = url.replace('https://', 'http://')
				}
				url += '&media_id=' + mediaId
			}

			if (type === 'news' || type === 'video') {
				request(options).then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('get material fails')
					}
				}).catch(function(err) {
					reject(err)
				})
			}else {
				resolve(url)
			}
		})
	})
}

// 删除永久素材
Wechat.prototype.deleteMaterial = function(mediaId) {
	var that = this
	var form = {
		media_id: mediaId
	}

	return new Promise(function(resolve, reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.permanent.del + 'access_token=' + data.access_token
						+ '&media_id=' + mediaId

			request({
				method: 'POST',
				url: url,
				body: form,
				json: true
			}).then(function(response) {
				var _data = response.body
				if (_data) {
					resolve(_data)
				}else {
					throw new Error('Delete material fails')
				}
			}).catch(function(err) {
				reject(err)
			})
		})
	})
}

// 更新永久图文素材
Wechat.prototype.deleteMaterial = function(mediaId, news) {
	var that = this
	var form = {
		media_id: mediaId
	}

	_.extend(form, news)

	return new Promise(function(resolve, reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.permanent.update + 'access_token=' + data.access_token
						+ '&media_id=' + mediaId

			request({
				method: 'POST',
				url: url,
				body: form,
				json: true
			}).then(function(response) {
				var _data = response.body
				if (_data) {
					resolve(_data)
				}else {
					throw new Error('Update material fails')
				}
			}).catch(function(err) {
				reject(err)
			})
		})
	})
}

// 获取素材总数
Wechat.prototype.countMaterial = function() {
	var that = this

	return new Promise(function(resolve, reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.permanent.count + 'access_token=' + data.access_token

			request({
				method: 'GET',
				url: url,
				json: true
			}).then(function(response) {
				var _data = response.body

				if (_data) {
					resolve(_data)
				}else {
					throw new Error('Update material fails')
				}
			})
		})
	})
}

// 获取素材列表
Wechat.prototype.batchMaterial = function(options) {
	var that = this

	options.type = options.type || 'image'
	options.offset = options.offset || 0
	options.count = options.count || 1

	return new Promise(function(resolve, reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.permanent.batch + 'access_token=' + data.access_token

			request({
				method: 'POST',
				url: url,
				boay: options,
				json: true
			}).then(function(response) {
				var _data = response.body

				if (_data) {
					resolve(_data)
				}else {
					throw new Error('batch material fails')
				}
			})
		})
	})
}

// 自动回复
Wechat.prototype.reply = function() {

	// 获取收到的信息
	var content = this.body
	var message = this.weixin

	// 通过tpl,获取回复xml
	// 传入回复内容content和收到请求数据
	var xml = util.tpl(content, message)

	this.status = 200
	this.type = 'application/xml'
	this.body = xml

	console.log(xml)
}

module.exports = Wechat