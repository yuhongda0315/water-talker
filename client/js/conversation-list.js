((WaterIM) => {
	var {components} = WaterIM;
	components.getConversationList = (resolve, reject) => {
		var {_service, _im} = WaterIM;
		var options = {
			name: 'conversation-list',
			template: '#water-conversation-list',
			data: function(){
				return {
					isStart: false,
					conversations: []
				};
			},
			methods: {
				start: function() {
					this.isStart = !this.isStart;
				}
			},
			mounted: function() {
				getList(this, _service);
			}
		};
		resolve(options);
	};

	var getList = (context, service) => {
		var {conversation} = service;
		conversation.getList().then((list) => {
			context.$data.conversations = list;
		});
	};
})(WaterIM);