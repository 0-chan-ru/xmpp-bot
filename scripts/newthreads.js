console.log("Скрипт новых тем загружен");
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

//https://4.0-chan.ru/json/boards/all/
// обработать список тредов, взять ид последнего, это будет самый свежий, всё что новее высирать в конфу






module.exports = unloadCode;