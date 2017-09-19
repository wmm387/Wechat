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
		fetch: prefix + 'media/get?',//获取临时素材
	},
	permanent: {
		upload: prefix + 'material/add_material?',//上传永久素材(非图文)
		fetch: prefix + 'material/get_material?',//获取永久素材
		uploadNews: prefix + 'material/add_news?',//新增永久图文素材
		uploadNewsPic: prefix + 'media/uploadimg?',//上传图文消息内的图片获取URL
		del: prefix + 'material/del_material?',//删除永久素材
		update: prefix + 'material/update_news?',//修改永久素材
		count: prefix + 'material/get_materialcount?',//获取素材总数
		batch: prefix + 'material/batchget_material?',//获取素材列表
	},
	tag: {
		create: prefix + 'tags/create?',//创建标签
		getAll: prefix + 'tags/get?',//获取所有标签
		check: prefix + 'tags/getidlist?',//查询某用户的所有标签
		update: prefix + 'tags/update?',//更新标签
		del: prefix + 'tags/delete?',//删除标签
		getOne: prefix + 'user/tag/get?',//查询某标签下的所有用户
		batch: prefix + 'tags/members/batchtagging?',//批量为用户打标签
		move: prefix + 'tags/members/batchuntagging?',//批量为用户取消标签
	},
	user: {
		fetch: prefix + 'user/info?',//获取单个用户信息
		batch: prefix + 'user/info/batchget?',//批量获取用户信息
		getList: prefix + 'user/get?',//获取用户列表
	},
	mass: {
		sendByTag: prefix + 'message/mass/sendall?',//根据标签进行群发
		del: prefix + 'message/mass/delete?',//删除群发
		preview: prefix + 'message/mass/preview?',//预览
		check: prefix + 'message/mass/get?',//查询群发信息状态
	},
	menu: {
		create: prefix + 'menu/create?',//创建菜单
		fetch: prefix + 'menu/get?',//获取菜单
		del: prefix + 'menu/delete?',//删除菜单
		current: prefix + 'get_current_selfmenu_info?',//菜单配置
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
			}).catch(function(err) {
				reject(err)
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
				body: options,
				json: true
			}).then(function(response) {
				var _data = response.body

				if (_data) {
					resolve(_data)
				}else {
					throw new Error('batch material fails')
				}
			}).catch(function(err) {
				reject(err)
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

//创建标签
Wechat.prototype.createTag = function(name) {
	var that = this;
	return new Promise(function(resolve, reject) {
		that.fetchAccessToken().then(function(data) {

			var url = api.tag.create + 'access_token=' + data.access_token

			var form = {
				tag: {
					name: name
				}
			}

			request({method:'POST', url: url, body: form, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('create tag failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//获取所有标签
Wechat.prototype.getAllTags = function() {
	var that = this

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {
			var url = api.tag.getAll + 'access_token=' + data.access_token

			request({method:'GET', url: url, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('create tag failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//删除标签
Wechat.prototype.deleteTag = function(tagId) {
	var that = this

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.tag.del + 'access_token=' + data.access_token

			var form = {
				tag: {
					id: tagId
				}
			}

			request({method:'POST', url: url, body: form, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data.errmsg === 'ok') {
						resolve(_data)
					}else {
						throw new Error('delete tag failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//获取某用户的标签
Wechat.prototype.checkTag = function(userId) {
	var that = this

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.tag.check + 'access_token=' + data.access_token

			var form = { openid: userId }

			request({method:'POST', url: url, body: form, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('check tag failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//批量为用户打标签
Wechat.prototype.batchTag = function(userIdLsit, tagId) {
	var that = this

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.tag.batch + 'access_token=' + data.access_token

			var form = {
				openid_list: userIdLsit,
				tagid: tagId
			}

			request({method:'POST', url: url, body: form, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('batch tag failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//批量为用户移除标签
Wechat.prototype.unbatchTag = function(userIdLsit, tagId) {
	var that = this

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.tag.move + 'access_token=' + data.access_token

			var form = {
				openid_list: userIdLsit,
				tagid: tagId
			}

			request({method:'POST', url: url, body: form, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('move tag failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//获取用户基本信息
Wechat.prototype.fetchUserInfo = function(userIds, lang) {
	var that = this
	var lang = lang || 'zh_CN'
	var url = ''
	var options = {}

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			if (!Array.isArray(userIds)) { //单个获取
				url = api.user.fetch + 'access_token=' + data.access_token
						+ '&openid=' + userIds + '&lang=' + lang
				options = {
					url: url,
					json: true
				}
			}else {
				url = api.user.batch + 'access_token=' + data.access_token
				var user_list = []
				for (var i = 0; i < userIds.length; i++) {
					user_list.push({
						openid: userIds[i],
						lang: lang
					})
				}

				options = {
					method: 'POST',
					url: url,
					body: {
						user_list: user_list
					},
					json: true
				}
			}

			request(options).then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('get userinfo failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//获取用户列表
Wechat.prototype.fetchUserInfoList = function(nextOpenId) {
	var that = this

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

				var url = api.user.getList + 'access_token=' + data.access_token

				if (nextOpenId) {
					url += '&next_openid=' + nextOpenId
				}


			request({url: url, json: true}).then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('get userinfolsit failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//根据标签进行群发
Wechat.prototype.sendByTag = function(type, message, tagId) {
	var that = this
	var msg = {
		filter: {},
		msgtype: type,
		send_ignore_reprint: 0
	}

	if (!tagId) {
		msg.filter.is_to_all = true
	}else {
		msg.filter = {
			is_to_all: false,
			tag_id: tagId
		}
	}

	msg[type] = message

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.mass.sendByTag + 'access_token=' + data.access_token

			request({method: 'POST', url: url, body: msg, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('send message by tag failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//删除群发
Wechat.prototype.delMass = function(msgId, artIdx = 0) {
	var that = this
	var msg = {
		msg_id: msgId,
		article_idx: artIdx,
	}

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.mass.del + 'access_token=' + data.access_token

			request({method: 'POST', url: url, body: msg, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('del message failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

// 预览
Wechat.prototype.previewMass = function(type, message, openId) {
	var that = this
	var msg = {
		msgtype: type,
		touser: openId
	}

	msg[type] = message
	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.mass.preview + 'access_token=' + data.access_token

			request({method: 'POST', url: url, body: msg, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('Preview message failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//查询群发信息状态
Wechat.prototype.checkMass = function(messageId) {
	var that = this
	var msg = {
		msg_id: messageId
	}

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			console.log(data)

			var url = api.mass.check + 'access_token=' + data.access_token

			request({method: 'POST', url: url, body: msg, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('check message statu failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//创建菜单
Wechat.prototype.createMenu = function(menu) {
	var that = this

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.menu.create + 'access_token=' + data.access_token

			request({method: 'POST', url: url, body: menu, json: true})
				.then(function(response) {
					var _data = response.body
					if (_data) {
						resolve(_data)
					}else {
						throw new Error('create menu failed')
					}
				}).catch(function(err) {
					reject(err)
				})
		})
	})
}

//获取菜单
Wechat.prototype.getMenu = function() {
	var that = this

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.menu.fetch + 'access_token=' + data.access_token

			request({url: url, json: true}).then(function(response) {
				var _data = response.body
				if (_data) {
					resolve(_data)
				}else {
					throw new Error('get menu failed')
				}
			}).catch(function(err) {
				reject(err)
			})
		})
	})
}

//删除菜单
Wechat.prototype.deleteMenu = function() {
	var that = this

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			console.log('del' + data)

			var url = api.menu.del + 'access_token=' + data.access_token

			request({url: url, json: true}).then(function(response) {
				var _data = response.body
				if (_data) {
					resolve(_data)
				}else {
					throw new Error('delete menu failed')
				}
			}).catch(function(err) {
				reject(err)
			})
		})
	})
}

//菜单配置
Wechat.prototype.getCurrentMenu = function() {
	var that = this

	return new Promise(function(resolve,reject) {

		that.fetchAccessToken().then(function(data) {

			var url = api.menu.current + 'access_token=' + data.access_token

			request({url: url, json: true}).then(function(response) {
				var _data = response.body
				if (_data) {
					resolve(_data)
				}else {
					throw new Error('get current menu failed')
				}
			}).catch(function(err) {
				reject(err)
			})
		})
	})
}

module.exports = Wechat