((WaterIM) => {
	var components = WaterIM.components;

	WaterIM.routes = {
		linkActiveClass: 'water-selected',
		maps: [
			{
				path: '/conversation/:type/:id',
				name: 'conversation',
				components: {
					list: components.getConversationList,
					main: components.getConversation
				}
			},
			{
				path: '*',
				component: components.getConversationList
			}
		]
	}
})(WaterIM);