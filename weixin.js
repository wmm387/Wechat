'use strict'

var config = require('./config')
var Wechat = require('./wechat/wechat')
var wechatApi = new Wechat(config.wechat)

// 回复信息控制
exports.reply = async (ctx,next) => {

	var message = ctx.weixin

	if (message.MsgType === 'event') {
		//信息类型是推送
		if (message.Event === 'subscribe') {
			//订阅操作
			if (message.EventKey) {
				console.log('扫描二维码进来: ' + message.EventKey + ' ' + message.ticket)
			}
			ctx.body = '感谢您订阅了这个号\r\n'

		}else if (message.Event === 'unsubscribe') {
			//取消订阅
			console.log('取消订阅')
		}else if (message.Event === 'LOCATION') {
			ctx.body = '您当前的位置是: ' + message.Latitude + ''  + message.Longitude
						+ '-' + message.Precision
		}else if (message.Event === 'CLICK') {
			ctx.body = '您点击了菜单: ' + message.EventKey
		}else if (message.Event === 'SCAN') {
			console.log('关注后扫二维码' + message.EventKey + ' ' + message.Ticket)
			ctx.body = '看到你扫了一下哦'
		}else if (message.Event === '') {
			ctx.body = '您点击了菜单中的链接: ' + message.EventKey
		}

	}else if (message.MsgType === 'text') {
		var content = message.Content
		var  reply = '您输入了 ' + message.Content

		if (content === '1') {
			reply = '第一'
		}else if (content === '2') {
			reply = '第二'
		}else if (content === '3') {
			reply = '第三'
		}else if (content === '4') {
			reply = [{
				title: '科技改变世界1',
				description: 'ctx is description1',
				picUrl: 'http://res.cloudinary.com/moveha/image/upload/v1441184110/assets/images/Mask-min.png',
				url: 'https://github.com/'
			},{
				title: '科技改变世界2',
				description: 'ctx is description2',
				picUrl: 'http://res.cloudinary.com/moveha/image/upload/v1431337192/index-img2_fvzeow.png',
				url: 'https://nodejs.org/'
			}]
		}else if (content === '5') {
			var data = await wechatApi.uploadMaterial('image', __dirname + '/2.png')

			reply = {
				type: 'image',
				mediaId: data.media_id
			}
		}else if (content === '6') {
			var data = await wechatApi.uploadMaterial('image', __dirname + '/2.png')

			reply = {
				type: 'music',
				title: 'music',
				description: '音乐',
				musicUrl: 'http://mpge.5nd.com/2015/2015-9-12/66325/1.mp3',
				thumbMediaId: data.media_id
			}
		}else if (content === '7') {
			var data = await wechatApi.uploadMaterial('image',
							__dirname + '/2.png', {type: 'image'})

			reply = {
				type: 'image',
				mediaId: data.media_id
			}
		}else if (content === '8') {
			var picData = await wechatApi.uploadMaterial('image',
							__dirname + '/2.png', {})

			var media = {
				articles: [{
					title: 'test',
					thumb_media_id: picData.media_id,
					author: 'wmm',
       				digest: 'DIGEST',
       				show_cover_pic: 1,
      				content: 'CONTENT',
       				content_source_url: 'https://github.com'
				}]
			}

			data = await wechatApi.uploadMaterial('news', media, {})
			data = await wechatApi.fetchMaterial(data.media_id, 'news', {})

			console.log(data)

			var items = data.news_item
			var news = []

			items.forEach(function(item) {
				news.push({
					title: item.title,
					decription: item.digest,
					picUrl: picData.url,
					url: item.url
				})
			})

			reply = news
		}

		ctx.body = reply
	}
}