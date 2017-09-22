((WaterIM) => {
	var {
		components
	} = WaterIM;
	components.getConversationList = (resolve, reject) => {
		var {
			_service,
			_im,
			tools
		} = WaterIM;
		var options = {
			name: 'conversation-list',
			template: '#water-conversation-list',
			data: function() {
				return {
					targetId: '',
					isStart: false,
					conversations: []
				};
			},
			methods: {
				showStart: function() {
					this.isStart = !this.isStart;
				},
				start: function() {
					create(this, _service, tools);
				},
				show: function(item) {
					go(this, item);
				},
				isSelected: function(item) {
					var route = this.$route;
					var {
						type,
						id: targetId
					} = route.params;
					return tools.isMatch(item, {
						type: +type,
						targetId
					});
				}
			},
			mounted: function() {
				getList(this, _service);
			}
		};
		resolve(options);
	};

	var getList = (context, service) => {
		var {
			conversation
		} = service;
		conversation.getList().then((list) => {
			context.$data.conversations = list;
		});
	};

	var create = (context, service, tools) => {
		var {
			targetId
		} = context;
		var isNull = tools.isEqual(targetId.length, 0);
		if (isNull) {
			return;
		}

		var params = {
			type: 1,
			targetId: targetId
		};
		service.conversation.create(params);
		context.isStart = false;
		go(context, params);
	};

	var go = (context, params) => {
		var {type, targetId: id, name = 'conversation'} = params;
		var router = context.$router;
		router.push({
			name: name,
			params: {
				type,
				id
			}
		});
	};
})(WaterIM);