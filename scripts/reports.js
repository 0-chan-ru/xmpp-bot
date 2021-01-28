console.log("Скрипт жалоб загружен");
const xmpp = require("simple-xmpp");
const fs = require("fs");
const util = require("util");
//const writeFile = util.promisify(fs.writeFile);
//const readFile = util.promisify(fs.readFile);


const https = require('https');
const HTMLParser = require('node-html-parser');

const unloadCode = {
	events: [],
	intervals: []
};

const SECOND = 1000;

// структура жалоб
const REPORT = {
	ID: 0,
	BOARD: 1,
	POSTLINK: 2,
	ILLEGAL: 3,
	REASON: 4,
	TIME: 5,
}

function getReports() {
	https.get("https://4.0-chan.ru/html/reports/", (res) => {
		//console.log("statusCode:", res.statusCode);
		res.setEncoding('utf8');
		let data = "";
		res.on('data', (chunk) => { data += chunk; });
		res.on('end', () => {
			//process.stdout.write(data);
			const reportsHTML = HTMLParser.parse(data);

			let reports = [];
			let newReports = false;
			const rows = reportsHTML.querySelectorAll("table tr");

			for (let i = rows.length-1; i !== 0; i--) {
				let row = rows[i];
				const columns = row.querySelectorAll("td");
				const id = parseInt(columns[REPORT.ID].text, 10);
				if (id > global.lastCheckInfoData.reportsLastId) {
					global.lastCheckInfoData.reportsLastId = id;
				} else {
					continue;
				}
				const postidDOM = columns[REPORT.POSTLINK].querySelector(".post-link");
				const board = columns[REPORT.BOARD].text;
				const postlink = `https://4.0-chan.ru${postidDOM.getAttribute("href")}`;
				const reason = columns[REPORT.REASON].text;
				const illegal = columns[REPORT.ILLEGAL].text;
				const time = columns[REPORT.TIME].text;
				const fullReportsBoard = ["meta", "media", "sci", "self", "life", "world"];
				
				if (illegal === "false" && !(fullReportsBoard.includes(board))) {
					continue;
				}
				reports.push([
					id, board, postlink, illegal, reason, time
				]);
			}

			if (reports.length >= 1) {
				let reportsFormat = [];
				for (let i = 0; i < reports.length; i++) {
					const curReport = reports[i];
					reportsFormat.push(`Ид жалобы: ${curReport[REPORT.ID]}`);
					reportsFormat.push(`Раздел: ${curReport[REPORT.BOARD]}`);
					reportsFormat.push(`Пост: ${curReport[REPORT.POSTLINK]}`);
					reportsFormat.push(`Причина: ${curReport[REPORT.REASON]}`);
					reportsFormat.push(`Время: ${curReport[REPORT.TIME]}`);
					if (curReport[REPORT.ILLEGAL] === "true") {
						reportsFormat.push(`Запрещёнка!!!`);
					}
				}
				let reportMessage = `Поступили новые жалобы:\n${reportsFormat.join("\n")}\nultrasemen: mya: следует обратить внимание!`
				console.log(reportMessage);
				let options = global.options;
				let conference = `${options.main.conference}@conference.${options.connection.host}`;
				xmpp.send(conference, reportMessage, true);

				/*setTimeout(() => {
					console.log("Мы сюда вообще попали");
					xmpp.send(conference, `ultrasemen: ЧИСТИ ДАВАЙ ЧИСТИ, ВЗЯЛ ВИЛКУ И ПОЧИСТИЛ`, true);
				}, 1500);*/

				fs.writeFile(
					"./lastcheckinfo.json",
					JSON.stringify(global.lastCheckInfoData), (error) => {
						if (error) { 
							console.log("global.lastCheckInfoData", global.lastCheckInfoData);
							console.error(error);
							throw error
						};
					}
				);
			} else {
				//console.log(`Новых жалоб нет`);
			}
		});
	}).on("error", (error) => {
		console.error(error);
	});
}



Promise.all([global.lastCheckInfo]).then(() => {
	console.log("Задание проверки жалоб поставлено");
	let timeUpdate = 10 * SECOND;
	let getReportsTask = setInterval(getReports, timeUpdate);
	unloadCode.intervals.push(getReportsTask);
});


module.exports = unloadCode;
