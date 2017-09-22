((WaterIM) => {
	var components = WaterIM.components;
	components.getConversation = (resolve, reject) => {
		var {_service, _im, tools} = WaterIM;
		resolve({
			name: 'conversation',
			template: '#water-conversation',
			data: function(){
				return {
					content: '',
					conversation: { },
					messageList: []
				};
			},
			methods: {
				isReceiver: function(message){
					return isReceiver(message) ? 'water-message-receiver' : 'water-message-sender';
				},
				getPortrait: function(message){
					var user = message.sender;
					return user.portraitUri;
				},
				send: function(){
					sendMessage(this, _service, tools);
				}
			},
			mounted: function(){
				var route = this.$route;
				var {type, id:targetId} = route.params;
				mounted(this, {type, targetId}, _service);
			},
			watch:{
				$route: function(){
					var route = this.$route;
					var {type, id:targetId} = route.params;
					updateTitle(this, {type, targetId}, _service);
					getMessageList(this, {type, targetId}, _service);
				}
			}
		});
	};

	function isReceiver(message){
		return message.direction == 2;
	}

	function mounted(context, params, service){
		updateTitle(context, params, service);
		getMessageList(context, params, service);
	};

	function getMessageList(context, params, service){
		var message = service.message;
		message.getList(params).then((list) => {
			context.messageList = list;
		});
	}

	function updateTitle(context, params, service){
		var conversation = service.conversation;
		conversation.getInfo(params).then((info) => {
			context.conversation = info;
		});
	}

	function resetEditor(context){
		context.content = '';
	}

	function sendMessage(context, service, tools){
		var content = context.content;
		content = content.replace(/\n/g, '');
		if (tools.isEqual(content.length, 0)) {
			resetEditor(context);
			return;
		}
		var {$route: {params:{id: targetId, type}}} = context;
		var params = {
            content: content,
            type: +type,
            targetId: targetId
        };
        resetEditor(context);
        service.message.sendText(params);
	}

})(WaterIM);