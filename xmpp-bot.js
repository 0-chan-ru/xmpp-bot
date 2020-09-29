const xmpp = require("simple-xmpp");

const fs = require("fs");
const path = require("path");
const util = require("util");
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

const scriptsFolder = "./scripts/";

global.unloadCode = []; // TODO: добавить парсер исходного кода чтобы в скриптах не надо было вручную указывать что отписывать


// загрузка 
// TODO: доработать потом нормана
const requireDir = function(dir, callback) {
	let aret = [];
	fs.readdirSync(dir).forEach(function(library) {
		let isLibrary = library.split(".").length > 0 && library.split(".")[1] === "js";
		// let libName = library.split(".")[0].toLowerCase();
		let libPath = dir + library; // TODO: разобраться почему path усекает ./
		if (isLibrary) {
			aret.push([libPath, require(libPath)]);
		}
	});
	if (callback) process.nextTick(function() {
		for (let i = 0; i < aret.length; i++) {
			const modret = [path.normalize(path.join("./", aret[i][0])), aret[i][1]];
			callback(modret);
		}
	});
	return aret;
}

function removeAllEventListener(unloadevents) {
	for (let i = 0; i < unloadevents.length; i++) {
		const unloadevent = unloadevents[i];
		const unloadeventsType = unloadevent[0];
		const unloadeventsFunc = unloadevent[1];
		xmpp.removeListener(unloadeventsType, unloadeventsFunc);
	}
}
function removeAllIntervals(unloadintervals) {
	for (let i = 0; i < unloadintervals.length; i++) {
		clearInterval(unloadintervals[i]);
	}
}


global.options = {};
let optionsPromise = readFile("./options.json")
.then(data => {
	return new Promise(function(resolve, reject) {
		try {
			global.options = JSON.parse(data);
			resolve(true);
		} catch (error) {
			if (error) {
				reject(error);
			}
		}
	});
})
.catch(error => { console.error(error); });


function loadScripts() {
	requireDir(scriptsFolder, (unloaddata_module) => {
		global.unloadCode.push(unloaddata_module);
		console.log("loadScripts,global.unloadCode",global.unloadCode);
	});
}

Promise.all([optionsPromise]).then(() => {
	console.log(global.options);
	let options = global.options;
	xmpp.connect(options.connection);
	//xmpp.subscribe('your.friend@gmail.com');
	// check for incoming subscription requests
	xmpp.getRoster();
	xmpp.on("online", function(data) { // TODO: добавить сюда промиз чтобы скрипты стартовали только когда мы подключены!
		console.log("Подключён с JID: " + data.jid.user);

		// TODO: добавить список подключаемых конф
		let to = `${options.main.conference}@conference.${options.connection.host}/${options.main.nick}`;
		// disable chat history ПОЧЕМУ-ТО НЕ РАБОТАЕТ СУКА, но это тупая копипаста с github issues
		/*let stanza = new xmpp.Element('presence', {"to": to}).
			c('x', { xmlns: 'http://jabber.org/protocol/muc' }).
			c('history', { maxstanzas: 0, seconds: 1});
			xmpp.conn.send(stanza);
		*/	
		// join the group chat
		xmpp.join(to);
	});
	
	xmpp.on("error", function(err) {
		console.error(err);
	});
	/*
	xmpp.on("subscribe", function(from) {
		if (from === "mya@0-chan.ru") {
			xmpp.acceptSubscription(from);
		}
	});
	*/
	xmpp.on("close", function() {
		console.log("соединение закрытось!");
	});

	// Загрузить скрипты
	loadScripts();
});
// перезагрузка на лету
const chokidar = require("chokidar");
const watcher = chokidar.watch(scriptsFolder);
watcher.on("ready", function() {
	watcher.on("all", function(event, relpath) {
		console.log("Перезагрузка скриптов...");
		console.log(event, relpath);
		Object.keys(require.cache).forEach(function(id) {
			//Get the local path to the module
			const localId = id.substr(process.cwd().length);
			//Ignore anything not in scripts
			if(!localId.match(/.*scripts.*/)) { 
				return;
			}
			//console.log("localId", path.normalize(localId));
			//console.log("id", id);
			//let scriptPath = path.normalize(localId);

			//Remove the module from the cache
			delete require.cache[id];
		});
		let scriptPath = path.normalize(relpath);
		// Удалить все подписки и интервалы изменившихся скриптов при перезапуске
		for (let i = 0; i < global.unloadCode.length; i++) {
			const scriptUnloadCode = global.unloadCode[i];
			//console.log("scriptUnloadCode",scriptUnloadCode);
			//console.log(scriptUnloadCode[0],scriptPath);

			if (scriptUnloadCode[0] === scriptPath) {
				removeAllEventListener(scriptUnloadCode[1].events);
				removeAllIntervals(scriptUnloadCode[1].intervals);
				global.unloadCode.splice(i, 1); // удаляем
				i--; // сдвигаем назад текущий индекс так как массив сместился
			}
		}
	
		// Загрузить заново скрипт
		global.unloadCode.push([scriptPath, require("./" + scriptPath)]);
		//console.log("global.unloadCode", global.unloadCode);
		
		console.log("Скрипты перезагружены.");
	});
});


function setDefaultLastInfo() {
	console.log("Выставляем инфу по умолчанию");
	global.lastCheckInfoData = { // это надо сделать через плагиновый расширающий интерфейс! (на самом деле не сложно) но пока пусть будет так
		"reportsLastId": 0
	};
}

global.lastCheckInfoData = {};
global.lastCheckInfo = readFile("./lastcheckinfo.json")
.then(data => {
	return new Promise(function(resolve, reject) {
		try {
			let lastCheckInfoData = JSON.parse(data);
			if (
				Object.keys(lastCheckInfoData).length === 0 &&
				lastCheckInfoData.constructor === Object
			) {
				reject("empty object");
			}
			global.lastCheckInfoData = lastCheckInfoData;
			resolve(true);
		} catch (error) {
			if (error) {
				setDefaultLastInfo();
				reject(error);
			}
		}
	});
})
.catch(error => { 
	console.error(error);
	setDefaultLastInfo();
});

const exit = function(errors) {
	/*fs.writeFile( // TODO: аварийный сброс не работает почему-то
		"./lastcheckinfo.json",
		JSON.stringify(global.lastCheckInfoData), (error) => {
			if (error) { 
				console.log("global.lastCheckInfoData", global.lastCheckInfoData);
				console.error(error);
				throw error
			};
		}
	);*/
	if (errors) {
		console.error(errors);
		throw errors;
	}
	process.exit(true);
}

process.on("exit", exit);
process.on('SIGINT', exit);