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
	POSTLINK: 1,
	REASON: 2,
	TIME: 3
}

function getReports() {
	https.get("https://4.0-chan.ru/html/reports/", (res) => {
		//console.log("statusCode:", res.statusCode);
		res.on("data", (data) => {
			if (res.statusCode === 200) {
				//process.stdout.write(data);
				const reportsHTML = HTMLParser.parse(data);

				let reports = [];
				let newReports = false;
				const rows = reportsHTML.querySelectorAll("table tr");

				for (let i = rows.length-1; i !== 0; i--) {
					const row = rows[i];
					//console.log(row.toString());
					const columns = row.querySelectorAll("td");
					const id = parseInt(columns[REPORT.ID].text, 10);
					if (id > global.lastCheckInfoData.reportsLastId) {
						global.lastCheckInfoData.reportsLastId = id;
						newReports = true;
					} else {
						continue;
					}
					const postidDOM = columns[REPORT.POSTLINK].querySelector(".post-link");
					const postlink = `https://4.0-chan.ru${postidDOM.getAttribute("href")}`;
					const reason = columns[REPORT.REASON].text;
					const time = columns[REPORT.TIME].text;
					reports.push([
						id, postlink, reason, time
					]);
				}

				if (newReports) {
					let reportsFormat = [];
					for (let i = 0; i < reports.length; i++) {
						const curReport = reports[i];
						reportsFormat.push(`Ид жалобы: ${curReport[REPORT.ID]}`);
						reportsFormat.push(`Пост: ${curReport[REPORT.POSTLINK]}`);
						reportsFormat.push(`Причина: ${curReport[REPORT.REASON]}`);
						reportsFormat.push(`Время: ${curReport[REPORT.TIME]}`);
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