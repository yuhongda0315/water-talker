(function(win, depends) {
	var {
		_
	} = depends;

	var currentWs = null;

	var tools = {
		stringFormat: (temp, data, regexp) => {
			if (!(Object.prototype.toString.call(data) === "[object Array]")) data = [data];
			var ret = [];
			for (var i = 0, j = data.length; i < j; i++) {
				ret.push(replaceAction(data[i]));
			}
			return ret.join("");

			function replaceAction(object) {
				return temp.replace(regexp || (/\\?\{([^}]+)\}/g), function(match, name) {
					if (match.charAt(0) == '\\') return match.slice(1);
					return (object[name] != undefined) ? object[name] : '{' + name + '}';
				});
			}
		},
		/*
			params.protocol
			params.url
			params.userId
		*/
		socket: (params, callbacks) => {
			var tpl = '{protocol}//{server}?userId={userId}';
			var url = tools.stringFormat(tpl, params);
			var ws = new WebSocket(url);
			ws.onmessage = callbacks.onmessage;
			ws.onerror = callbacks.onerror;
			return ws;
		},
		toJSON: (val) => {
			return _.isString(val) ? val : JSON.stringify(val);
		},
		// 一次使用
		date2Hour: (timestamp) => {
			var date = new Date(timestamp);
			return date.getHours() + ':' + date.getMinutes();
		}
	};

	_.extend(tools, _);

	var getMessageId = () => {
		var messageId = 0;
		return function() {
			return messageId++;
		};
	};

	getMessageId = getMessageId();

	var promiseCache = (() => {
		var cache = {};
		var set = (key, resolve, reject) => {
			cache[key] = {
				resolve,
				reject
			};
		};

		var get = (key) => {
			return cache[key];
		};

		return {
			set,
			get
		};
	})();

	var publish = (params) => {
		var {
			data
		} = params;
		var uId = getMessageId();
		data.uId = uId;
		return new Promise((resolve, reject) => {
			promiseCache.set(uId, (list) => {
					resolve(list);
				},(error) => {
					reject(error);
				});
			currentWs.send(tools.toJSON(data));
		});
	};

	var createConversation = (params) => {
		
	};

	var getConversations = (params) => {
		var data = {
			topic: 'qryRelation'
		};
		return publish({
			data: data
		}).then((ret) => {
			var list = ret.list;
			return tools.map(list, (item) => {
				item._sentTime = tools.date2Hour(item.sentTime);
				return item;
			});
		});
	};

	// var getConversations = (params) => {
	// 	return new Promise((resolve, reject) => {
	// 		var list = [{"topic":"pMsgP","objectName":"WT:TxtMsg","content":"hello 1002","messageId":1,"type":1,"targetId":"1002","user":{"name":"朱之晴","portraitUri":"http://7xogjk.com1.z0.glb.clouddn.com/Frvl4caHWNcn3HirhUH-4VUfeZh5","userId":"1001"},"sentTime":1505880736602,"senderUserId":"1001","direction":1,"userId":"1001","_id":"HHDZVBb4pfUY93IN"}];
	// 		resolve(list);
	// 	});
	// };


	var _timestamp = 0;

	var setPullHisMsgsTime = (params) => {
		var {
			timestamp
		} = params;
		_timestamp = timestamp;
	};

	var getHistoryMessages = (params) => {
		var _params = {
			timestamp: _timestamp,
			topic: 'qryPMsg'
		};
		tools.extend(params, _params);
		return publish({
			data: params
		});
	};
	/*
		var message = {
            objectName: 'WT:TxtMsg',
            content: 'test',
            type: 1,
            targetId: 'id'
        };
	*/
	var sendMessage = (message) => {
		var params = {
			topic: 'pMsgP'
		};
		tools.extend(message, params)

		return publish({
			data: message
		});
	};

	var getUserInfo = (params) => {
		var _params = {
			topic: 'qryUser'
		};
		tools.extend(_params, params);
		return publish({
			data: _params
		});
	};

	var apis = {
		message: {
			send: sendMessage,
			getList: getHistoryMessages,
			setPullHisMsgsTime: setPullHisMsgsTime
		},
		conversation: {
			create: createConversation,
			getList: getConversations
		},
		user: {
			get: getUserInfo
		}
	};

	/*
		params.url
		params.userId
	*/
	var connect = (params) => {
		var promise = new Promise((resolve, reject) => {
			params.protocol = 'ws:';
			currentWs = tools.socket(params, {
				onmessage: (event) => {
					var data = JSON.parse(event.data);
					var {
						uId
					} = data;
					var promise = promiseCache.get(uId);
					promise.resolve(data);
				},
				onerror: (error) => {
					console.log(error);
				}
			});
			var uId = getMessageId();
			promiseCache.set(uId, () => {
				resolve(apis);
			}, reject);
		});
		return promise;
	};

	win.WaterService = {
		connect: connect,
		tools: tools
	};
})(this, {
	_: _
});