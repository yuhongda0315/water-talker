var WebSocket = require('faye-websocket');
var http = require('http');
var server = http.createServer();
var config = require('../config.json');
var urlParser = require('urlparser');
var utils = require('./utils');

var _ = utils._;
var getUserInfo = utils.getUserInfo;
var stringFormat = utils.stringFormat;

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
    return _.isString(obj) ? obj : JSON.stringify(obj);
};

var getDistinct = (list) => {
    return _.sortBy(_.map(_.groupBy(list, (item) => {
        return [item.type, item.targetId].join('_');
    }), function(items) {
        return _.max(items, (item) => {
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
    if (_.isEmpty(query)) {
        callback.reject(reason);
        return;
    }
    var params = query.params;
    var userId = params.userId;
    if (_.isUndefined(userId)) {
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

var messageDB = new nedb({
    filename: 'data/storage.db',
    autoload: true
});

var userDB = new nedb({
    filename: 'data/user.db',
    autoload: true
});

var DBUtil = {
    message: {
        insert: (params) => {
            messageDB.insert(params);
        },
        findList: (params) => {
            var promise = new Promise((resolve, reject) => {
                var condition = {
                    type: params.type,
                    targetId: params.targetId,
                    sentTime: {
                        $lt: params.sentTime
                    }
                };
                messageDB.find(condition).sort({
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
                messageDB.find(params, (error, messageList) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(messageList);
                });
            });
            return promise;
        }
    },
    user: {
        /*
            user.id
            user.name
            user.portraitUri
        */
        insert: (user) => {
            userDB.insert(user);
        },
        findAll: (params) => {
            var userIds = params.userIds;
            var promise = new Promise((resolve, reject) => {
                userDB.find({
                    id: {
                        $in: userIds
                    }
                }, (error, ret) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(ret);
                });
            });
            return promise;
        },
        find: (params) => {
            var promise = new Promise((resolve, reject) => {
                userDB.find(params, (error, ret) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(ret);
                });
            });
            return promise;
        }
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
    _.extend(message, params);

    message.userId = socket.currentUserId;

    DBUtil.message.insert(message);

    message = toJSON(message);

    socket.send(message);

};

var messageHandler = (ws, message) => {
    message = JSON.parse(message);
    var topic = {
        /* 
        var message = {
            topic: 'pMsgP',
            objectName: 'WT:TxtMsg',
            content: 'test',
            uId: 1,
            type: '会话类型',
            senderUserId: '',
            senderUserName: '',
            targetId: ''
        };
        */
        pMsgP: () => {
            var senderUserId = ws.currentUserId;
            var params = {
                message: message,
                sentTime: Date.now(),
                direction: MessageDirection.SENT
            };
            sendMessage(ws, params);

            var targetId = message.targetId;
            var socket = socketCache.get(targetId);
            params.direction = MessageDirection.RECEIVED;
            message.targetId = senderUserId;
            DBUtil.user.find({
                userId: senderUserId
            }).then((users) => {
                var user = users[0];
                delete message.uId;
                message.target = user;
                sendMessage(socket, params);
            });
        },
        /*
            var message = {
                topic: 'qryRelation',
                uId: 2
            };
        */
        qryRelation: () => {
            var uId = message.uId;

            var userId = ws.currentUserId;
            var params = {
                userId: userId
            };
            DBUtil.message.findRelationList(params).then(function(messageList) {
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
                type: +message.type,
                targetId: message.targetId,
                sentTime: message.timestamp || Date.now(),
                limit: message.limit || 20
            };
            DBUtil.message.findList(params).then((messageList) => {
                sendResponse(ws, {
                    uId: uId,
                    list: messageList
                });
            });
        },
        /*
            var message = {
                topic: 'qryUser',
                userId: '1001',
                uId: 4
            };
        */
        qryUser: () => {
            var user = DBUtil.user;
            var uId = message.uId;
            var userId = message.userId;
            var params = {
                userId: userId
            };
            user.find(params).then((userInfo) => {
                userInfo = userInfo[0];
                if (!userInfo) {
                    userInfo = getUserInfo(userId);
                    user.insert(userInfo);
                }
                sendResponse(ws, {
                    uId: uId,
                    user: userInfo
                });
            });
        }
    };
    var _topic = topic[message.topic] || _.noop;
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
                DBUtil.user.find({
                    userId: userId
                }).then((userInfo) => {
                    userInfo = userInfo[0];
                    if (!userInfo) {
                        userInfo = getUserInfo(userId);
                        DBUtil.user.insert(userInfo);
                    }
                    sendConnectAck(ws, {
                        user: userInfo,
                        uId: 0,
                        stauts: ConnectState.connected
                    });
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

server.listen(config.port);
var tmpl = '启动成功，Server 地址 http://127.0.0.1:{port}';
console.log(stringFormat(tmpl, {
    port: config.port
}));