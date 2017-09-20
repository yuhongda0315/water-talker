((WaterIM) => {
	var components = WaterIM.components;
	components.getConversation = (resolve, reject) => {
		resolve({
			name: 'conversation',
			template: '#water-conversation'
		});
	};

})(WaterIM);