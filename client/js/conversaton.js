((WaterIM) => {
	var components = WaterIM.components;
	components.getConversation = (resolve, reject) => {
		var {_service, _im, tools} = WaterIM;
		resolve({
			name: 'conversation',
			template: '#water-conversation',
			data: function(){
				return {
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


})(WaterIM);