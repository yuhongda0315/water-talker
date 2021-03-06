exports._ = require('underscore');

exports.getUserInfo = (userId) => {

	var nameList = "梦琪忆柳之桃慕青问兰尔岚元香初夏沛菡傲珊曼文乐菱痴珊恨玉惜文香寒新柔语蓉海安夜蓉涵柏水桃醉蓝春儿语琴从彤傲晴语兰又菱碧彤元霜怜梦紫寒妙彤曼易南莲紫翠雨寒易烟如萱若南寻真晓亦向珊慕灵以蕊寻雁映易雪柳孤岚笑霜海云";
	var nameSize = nameList.length;

	var xingList = "赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张于";
	var xingSize = xingList.length;

	var portraits = [
			'https://rongcloud-image.cn.ronghub.com/11b5634363a0d64375.gif?e=2147483647&token=livk5rb3__JZjCtEiMxXpQ8QscLxbNLehwhHySnX:KXWfwD_8iNCsvyOtDFjviEMVAZI=',
			'http://7xogjk.com1.z0.glb.clouddn.com/01fac54313ad977d6e.gif',
			'http://7xogjk.com1.z0.glb.clouddn.com/Uz6Sw8GXx1480657489396230957',
			'http://7xogjk.com1.z0.glb.clouddn.com/Uz6Sw8GXx1480657489396230957',
			'http://7xogjk.com1.z0.glb.clouddn.com/FrHE6oexmBYCQu1mArslDmSXSpjt',
			'http://7xogjk.com1.z0.glb.clouddn.com/N5zNVXSAL1468383079822445801',
			'http://7xogjk.com1.z0.glb.clouddn.com/Fh4fnCvnO_SOwpuMPYGBnzBwrx6A',
			'http://7xogjk.com1.z0.glb.clouddn.com/FhNGcU1t9fqeY8RNU9YLxB_uC0CW',
			'http://7xogjk.com1.z0.glb.clouddn.com/VvnIxO8tV1466543937625991943',
			'http://7xogjk.com1.z0.glb.clouddn.com/8ydpAQGf31466593526225904053',
			'http://7xogjk.com1.z0.glb.clouddn.com/J7XqKPint1465875994761060059',
			'http://7xogjk.com1.z0.glb.clouddn.com/FuN4PYLWgl5-dc7kjMrVTaGrmvWy',
			'http://7xogjk.com1.z0.glb.clouddn.com/E1IoyL5Pj1474883226760875000',
			'http://7xogjk.com1.z0.glb.clouddn.com/Fs9ncOF6YdUFm41MLaaW3Le9kCUi',
			'http://7xogjk.com1.z0.glb.clouddn.com/40qHVS1mE1466594886916926758',
			'http://7xogjk.com1.z0.glb.clouddn.com/FnD5DPrQ4zEuxdfoQph3I_GbREXT',
			'http://7xogjk.com1.z0.glb.clouddn.com/sIY8bjZD41488598710906941895',
			'http://7xogjk.com1.z0.glb.clouddn.com/uQkgVavwI1487366848354141846',
			'http://7xogjk.com1.z0.glb.clouddn.com/6LTeWiKdO1466687530424623047',
			'http://7xogjk.com1.z0.glb.clouddn.com/dF4rToXYc1480663399693231201',
			'http://7xogjk.com1.z0.glb.clouddn.com/RhkYq7by11466683458989444092',
			'http://7xogjk.com1.z0.glb.clouddn.com/RhkYq7by11466683458989444092',
			'http://7xogjk.com1.z0.glb.clouddn.com/dCbdBuAEY1466683558456824951',
			'http://7xogjk.com1.z0.glb.clouddn.com/1wqmFbjA11487060547968788086',
			'http://7xogjk.com1.z0.glb.clouddn.com/Frvl4caHWNcn3HirhUH-4VUfeZh5',
			'http://7xogjk.com1.z0.glb.clouddn.com/IuDkFprSQ1493563384017406982',
			'http://7xogjk.com1.z0.glb.clouddn.com/FoT92qisblAl4-fNyRFhsMvx_1Re',
			'http://7xogjk.com1.z0.glb.clouddn.com/jxngOLzx81490001167151286133',
			'http://7xogjk.com1.z0.glb.clouddn.com/jAR4Mcond1466728471015025146',
			'http://7xogjk.com1.z0.glb.clouddn.com/Uz6Sw8GXx1466575289048886963'
		];

	var portraitSize = portraits.length;


	var getIndex = (max) => {
		return Math.floor(Math.random() * max) || 1;
	};

	var getName = (len) => {
		var names = [];
		for(var i = 0; i<len; i++){
			var index = getIndex(nameSize);
			names.push(nameList[index]);
		}
		return names.join('');
	};

	var getXing = (index) => {
		return xingList.split('')[index];
	};

	var getPortrait = (index) => {
		return portraits[index];
	};

	var nameIndexs = getIndex(3);
	var xingIndex = getIndex(xingSize);
	var name = getXing(xingIndex) + getName(nameIndexs);

	var portraitIndex = getIndex(portraitSize);

	var portrait = getPortrait(portraitIndex);

	return {
		userId: userId,
		name: name,
		portraitUri: portrait
	};
};

exports.stringFormat = (temp, data, regexp) => {
	if (!(Object.prototype.toString.call(data) === "[object Array]")) data = [data];
	var ret = [];
	for (var i = 0, j = data.length; i < j; i++) {
		ret.push(replaceAction(data[i]));
	}
	return ret.join("");

	function replaceAction(object) {
		return temp.replace(regexp || (/\\?\{([^}]+)\}/g), function(match, name) {
			if (match.charAt(0) == '\\') return match.slice(1);
			return (object[name] != undefined) ? object[name] : '{' + name + '}';
		});
	}
};