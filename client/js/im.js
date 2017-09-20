((WaterIM, depends) => {
	var isInit = () => {
		return !WaterIM._im;
	};

	function getRouter() {
		var routes = WaterIM.routes;
		var router = new VueRouter({
			routes: routes.maps
		});
		router.beforeEach(function (to, from, next) {
			if (isInit()) {
				WaterIM._im = router.app;
			}
		  	next();
		});

		return router;
	}

	var init = () => {
		var { WaterService } = depends;
		var { tools } = WaterService;
		var { config } = WaterIM;

		var { search } = location;
		var userId = search.split('?')[1];
		if(!tools.isString(userId)) {
			throw new Error('userId is undefined.');
		}
		config.userId = userId;
		WaterService.connect(config).then((service) => {
			WaterIM._service = service;
			var im = WaterIM._im = new Vue({
				el: config.el,
				router: getRouter()
			});
		});

	};

	WaterIM.init = init;
})(WaterIM, {
	WaterService: WaterService
});