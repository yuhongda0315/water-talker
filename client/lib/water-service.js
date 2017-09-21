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

	var getConversationId = (type, targetId) => {
		return [type, targetId].join('_');
	};

	var userStore = {}

	var conversations = null;

	var messageStore = {};

	var sendCommand = (data) => {
		currentWs.send(tools.toJSON(data));
	};

	var queryLocal = (params, resolve, reject) => {
		var topic = params.topic;
		var topics = {
			qryRelation: () => {
				return conversations;
			},
			qryPMsg: () => {
				var {
					type,
					targetId
				} = params;
				var messageKey = getConversationId(type, targetId);
				return messageStore[messageKey];
			},
			qryUser: () => {
				var {
					userId
				} = params;
				return userStore[userId];
			}
		};
		var handler = topics[topic] || tools.noop;
		return handler();
	};

	var publish = (params) => {
		var {
			data
		} = params;
		var uId = getMessageId();
		data.uId = uId;
		return new Promise((resolve, reject) => {
			promiseCache.set(uId, (list) => {
				resolve(list);
			}, (error) => {
				reject(error);
			});
			var ret = queryLocal(data);
			if (ret) {
				resolve(ret);
				return;
			}
			sendCommand(data);
		});
	};

	/*
		params.userId
	*/
	var getUserInfo = (params) => {
		var _params = {
			topic: 'qryUser'
		};
		tools.extend(_params, params);
		return publish({
			data: _params
		}).then((ret) => {
			var user = ret.user || ret;
			userStore[user.userId] = user;
			return user;
		});
	};

	/*
		params.targetId
		params.type
	*/
	var createConversation = (params) => {
		var has = tools.some(conversations, (item) => {
			return tools.isMatch(item, params);
		});

		if (!has) {
			getUserInfo({
				userId: targetId
			}).then((user) => {
				var conversation = {
					target: user,
					sentTime: Date.now(),
					_sentTime: ''
				};
				tools.extend(conversation, params);
				conversations.unshit(conversation);
			});
		}
	};

	var getConversations = (params) => {
		var data = {
			topic: 'qryRelation'
		};
		return publish({
			data: data
		}).then((ret) => {
			var list = ret.list || ret;
			conversations = tools.map(list, (item) => {
				item._sentTime = tools.date2Hour(item.sentTime);
				var content = item.content;
				if (content) {
					item.content = content.substr(0, 10) + '...';
				}
				return item;
			});
			return conversations;
		});
	};

	var getConversationInfo = (params) => {
		return getUserInfo({
			userId: params.targetId
		});
	};
	var _timestamp = 0;

	var setPullHisMsgsTime = (params) => {
		var {
			timestamp
		} = params;
		_timestamp = timestamp;
	};

	var getHistoryMessages = (params) => {
		var _params = {
			limit: 20,
			timestamp: _timestamp,
			topic: 'qryPMsg'
		};
		tools.extend(params, _params);
		return publish({
			data: params
		}).then((ret) => {
			return tools.map(ret.list, (item) => {
				item._sentTime = tools.date2Hour(item.sentTime);
				return item;
			}).reverse();
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

	var apis = {
		message: {
			send: sendMessage,
			getList: getHistoryMessages,
			setPullHisMsgsTime: setPullHisMsgsTime
		},
		conversation: {
			getInfo: getConversationInfo,
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