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
			var tpl = '{protocol}//{url}?userId={userId}';
			var url = tools.stringFormat(tpl, params);
			var ws = new WebSocket(url);
			ws.onmessage = callbacks.onmessage;
			ws.onerror = callbacks.onerror;
			return ws;
		}
	};

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

	var createConversation = (params) => {

	};

	var getConversations = (params) => {
		var uId = getMessageId();
		var promise = new Promise((resolve, reject) => {
			var params = {
				topic: 'qryRelation',
				uId: uId
			};
			promiseCache.set(uId, resolve, reject);
			currentWs.send(toJSON(params));
		});
	};

	var setPullHisMsgsTime = (params) => {

	};

	var getHistoryMessages = (params) => {

	};

	var sendMessage = (params) => {

	};

	var apis = {
		message: {
			send: sendMessage,
			getList: getHistoryMessages,
			setPullHisMsgsTime: setPullHisMsgsTime
		},
		conversation: {
			create: createConversation,
			get: getConversations
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
					var {uId} = data;
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

	win.WaterIMLib = {
		connect: connect,
		tools: tools
	};
})(this, {
	_: _
});