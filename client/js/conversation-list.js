((WaterIM) => {
	var {components} = WaterIM;
	components.getConversationList = (resolve, reject) => {
		var {_service, _im, tools} = WaterIM;
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
				showStart: function() {
					this.isStart = !this.isStart;
				},
				start: function(){
					create(this, _service);
				},
				show: function(item){
					this.$router.push({
						 name: 'conversation',
						 params:{
						 	type: item.type,
						 	id: item.targetId
						 }
					});
				},
				isSelected: function(item){
					var route = this.$route;
					var {type, id:targetId} = route.params;
					return tools.isMatch(item, {type: +type, targetId});
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

	var create = (context, service) => {

	};
})(WaterIM);