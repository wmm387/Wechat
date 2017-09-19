'use strict'

module.exports = {
	'button':[{
        'type':'click',
        'name':'点击事件',
        'key':'menu_click'
    }, {
        'name':'点出菜单',
        'sub_button':[{
            'type': 'view',
            'name': '跳转URL',
            'url' : 'http://github.com'
        }, {
            'type': 'pic_sysphoto',
            'name': '拍照',
            'key' : 'pic_photo'
        }, {
            'type':'scancode_push',
            'name':'扫码推送事件时间是技术',
            'key':'qr_scan'
        }]
    }, {
    	'name': '点出菜单2',
    	'sub_button': [{
    		'name': '微信相册发图',
    		'type': 'pic_weixin',
    		'key' : 'pic_weixin'
    	}, {
    		'name': '地理位置选择',
    		'type': 'location_select',
    		'key' : 'location_select'
    	}]
    }]
}