var WebSocket = require('faye-websocket');
var http = require('http');
var server = http.createServer();

var urlParser = require('urlparser');
var util = require('underscore');

var nedb = require('nedb');

var ErrorCode = {
    getError: function(code) {
        var info = {
            3001: {
                code: 3001,
                msg: '参数不正确,请检查 userId'
            }
        };
        return info[code];
    },
    empty_userId: 3001
};

var ConnectState = {
    connected: 0
};

var toJSON = function(obj) {
    return util.isString(obj) ? obj : JSON.stringify(obj);
};

var getDistinct = (list) => {
    return util.sortBy(util.map(util.groupBy(list, (item) => {
        return [item.type, item.targetId].join('_');
    }), function(items) {
        return util.max(items, (item) => {
            return item.sentTime;
        });
    }), (item) => {
        return -item.sentTime;
    });
};

var checkQuery = function(url, callback) {
    var url = urlParser.parse(url);
    var query = url.query;
    var code = ErrorCode.empty_userId;
    var reason = ErrorCode.getError(code);
    if (util.isEmpty(query)) {
        callback.reject(reason);
        return;
    }
    var params = query.params;
    var userId = params.userId;
    if (util.isUndefined(userId)) {
        callback.reject(reason);
        return;
    }

    var user = {
        id: userId
    };
    callback.resolve(user);
};

function Cache(config) {
    config = config || {};
    var prefix = config.prefix || '';

    var store = {};

    var getKey = (key) => {
        return [prefix, key].join('_');
    };

    var get = (key) => {
        key = getKey(key);
        return store[key];
    };

    var set = (key, val) => {
        key = getKey(key);
        store[key] = val;
    };

    var remove = (key) => {
        key = getKey(key);
        delete store[key];
    };

    return {
        get: get,
        set: set,
        remove: remove
    };
}

var socketCache = Cache();


var MessageDirection = {
    SENT: 1,
    RECEIVED: 2
};

var database = new nedb({
    filename: './data/storage.db',
    autoload: true
});

var DBUtil = {
    insertMessage: (params) => {
        database.insert(params);
    },
    findMessageList: (params) => {
        var promise = new Promise((resolve, reject) => {
            var condition = {
                type: params.type,
                targetId: params.targetId,
                sentTime: {
                    $lt: params.sentTime
                }
            };
            database.find(condition).sort({
                sentTime: -1
            }).limit(params.limit).exec((error, messageList) => {
                if (error) {
                    reject(error);
                }
                resolve(messageList);
            });
        });
        return promise;
    },
    findRelationList: (params) => {
        params = params || {};
        var promise = new Promise((resolve, reject) => {
            database.find(params, (error, messageList) => {
                if (error) {
                    reject(error);
                }
                resolve(messageList);
            });
        });
        return promise;
    }
};

var sendResponse = (socket, data) => {
    socket.send(toJSON(data));
};

/*
    params.message
    params.sentTime
    params.direction
    params.senderUserId
*/
var sendMessage = (socket, params) => {
    if (!socket) {
        return;
    }

    params = JSON.parse(toJSON(params));
    var message = params.message;
    delete params.message;
    util.extend(message, params);

    message.userId = socket.currentUserId;

    DBUtil.insertMessage(message);

    message = toJSON(message);

    socket.send(message);

};

var messageHandler = (ws, message) => {
    message = JSON.parse(message);
    var topic = {
        /* 
        var message = {
            topic: 'pMsgP',
            content: {
                objectName: 'WT:TxtMsg',
                content: 'test'
            },
            uId: 1,
            type: '会话类型',
            targetId: ''
        };
        */
        pMsgP: () => {
            var senderUserId = ws.currentUserId;
            var params = {
                message: message,
                sentTime: Date.now(),
                senderUserId: senderUserId,
                direction: MessageDirection.SENT
            };
            sendMessage(ws, params);

            var targetId = message.targetId;
            var socket = socketCache.get(targetId);
            params.direction = MessageDirection.RECEIVED;
            message.targetId = senderUserId;
            sendMessage(socket, params);
        },
        /*
            var message = {
                topic: 'qryRelation',
                uId: 2
            };
        */
        qryRelation: () => {
            var userId = ws.currentUserId;
            message.userId = userId;
            var uId = message.uId;

            DBUtil.findRelationList().then(function(messageList) {
                messageList = getDistinct(messageList);
                sendResponse(ws, {
                    uId: uId,
                    list: messageList
                });
            });
        },
        /*
            var message = {
                topic: 'qryPMsg',
                type: 1,
                targetId: '',
                timestamp: 1505548686194,
                limit: 20,
                uId: 3
            };
        */
        qryPMsg: () => {
            var uId = message.uId;
            message.userId = ws.currentUserId;
            var params = {
                type: message.type,
                targetId: message.targetId,
                sentTime: message.timestamp || Date.now(),
                limit: message.limit || 20
            };
            DBUtil.findMessageList(params).then(function(messageList) {
                sendResponse(ws, {
                    uId: uId,
                    list: messageList
                });
            });
        }
    };
    var _topic = topic[message.topic] || util.noop;
    _topic();
};

var sendConnectAck = (socket, params) => {
    socket.send(toJSON(params));
};

server.on('upgrade', (request, socket, body) => {
    if (WebSocket.isWebSocket(request)) {

        var ws = new WebSocket(request, socket, body);

        var emitEnd = (reason) => {
            ws.end(toJSON(reason));
        };
        var url = request.url;
        checkQuery(url, {
            resolve: (user) => {
                var userId = user.id;
                ws.currentUserId = userId;
                socketCache.set(userId, ws);

                sendConnectAck(ws, {
                    userId: userId,
                    stauts: ConnectState.connected
                });

                ws.on('message', (event) => {
                    messageHandler(ws, event.data);
                });
                ws.on('close', (event) => {
                    socketCache.remove(userId);
                    emitEnd(event.data);
                });
            },
            reject: (reason) => {
                emitEnd(reason);
            }
        });
    }
});

server.listen(8585);