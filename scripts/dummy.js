console.log("Скрипт примера загружен");
const xmpp = require("simple-xmpp");

const unloadCode = {
	events: [],
	intervals: []
};

/*
const SECOND = 1000;

function sampleTaskFunc() {
	console.log("Пример действия выполнен")
}

Promise.all([global.lastCheckInfo]).then(() => {
	console.log("Задание примера поставлено");
	let timeUpdate = 10 * SECOND;
	let sampleTask = setInterval(sampleTaskFunc, timeUpdate);
	unloadCode.intervals.push(sampleTask);
});*/

const groupchatFunc = function(conference, from, message, stamp, delay) {
	if (delay && delay.stamp) { // TODO: костыль надо править библиотеку
		stamp = delay.stamp;
	}
	if (stamp == null) { // TODO: сейчас дата есть от MUC истории только, игнорим историю
		if (from !== options.main.nick) {
			if (message === "тест") {
				xmpp.send(conference, from +': пройден: ' + message, true);
			}
		}
	}
};
xmpp.on("groupchat", groupchatFunc);
unloadCode.events.push(["groupchat", groupchatFunc]);


const chatFunc = function(from, message) { // TODO: не работает надо разобраться в чём дело
	console.log("%s говорит %s", from, message);
	xmpp.send(from, "эхо: " + message);
}
xmpp.on("chat", chatFunc);
unloadCode.events.push(["chat", chatFunc]);





module.exports = unloadCode;