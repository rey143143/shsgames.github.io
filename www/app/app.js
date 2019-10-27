import React from "react";
import JSEncrypt from "jsencrypt";
import LAST_BUILD from "../src/LAST_BUILD.txt";

global.PORT = {
    frontend: parseInt(location.port || 80),
    backend: parseInt(location.port || 80) === 8080 ? ":9000" : ""
};

global.service = service => data => done => {

	let mprogress = new Mprogress();
	mprogress.start();

	let sparse = din => {
		din = JSON.stringify(din);
		din = encodeURIComponent(din);
		din = window.btoa(din);
		din = din.match(/.{1,32}/g);

		let encrypt = new JSEncrypt();
        encrypt.setPublicKey(app.pubkey);

		for (let part of din) {
			din[din.indexOf(part)] = encrypt.encrypt(part);
		}

		din = din.join(":")
		return { din };
	}

	let finished = false;

	$.ajax({
		type: "POST",
		url: `${app.service}/${service}`,
		data: sparse({
			...data,
			...{ cookie: document.cookie }
		}),
		success(args) {
			finished = true;
			mprogress.end();
			done(args);
		}
	});

	setTimeout(() => {
		service === "games" && finished === false && Photon.toast(`<i class="material-icons red-text">error_outline</i><span>Could not refresh. Are you online?</span>`, 7500);
		mprogress.end();
	}, 15000);
}

$("*").on("keypress keydown keyup", e => {
	e.which === 9 && e.preventDefault() && e.stopPropagation();
})

$(() => $.ajax({
	url: "/src/LAST_BUILD.txt?" + Date.now(),
	success: data => data !== LAST_BUILD && app.update()
}));

global.app = {
	NAME: "SHS Games",
	events: ["blur", "change", "click", "dblclick", "error", "focus", "focusin", "focusout", "hover", "keydown", "keypress", "keyup", "load", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup", "mousewheel", "resize", "scroll", "select", "submit", "wheel"],
	service: `//${location.hostname}${PORT.backend}/service`,
	pubkey: "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3Lblv+neygQC4vvG6qPARg39S\nVQHmGdoOcz6GIWoFdRt6yW5T5VSAPRpaVF9c1Qt19a7JsqhVRwLG5nnOmrmOAzy5\nk4DD9qAxrjnhpcJW4LyUWxGoaBxcvU2UBOgSrATQ2V/nrdySpMyi7RkBgubyOGdp\n+/eiknG6PnofX1vW+wIDAQAB\n-----END PUBLIC KEY-----",
	version: 1,
	game: null,
	games: null,
	state: { nesready: false },

	setDarkMode(mode) {
		if(mode === true) {
			$("body").addClass("theme-dark");
			$("meta[name=\"theme-color\"]").attr("content", "#242424");
		} else {
			$("body").removeClass("theme-dark");
			$("meta[name=\"theme-color\"]").attr("content", "#ffffff");
		}
	},

	getGames() {
		return new Promise(resolve => {
			(function loop() {
				if(app.games !== null && app.games.hasOwnProperty("groups")) {
					let games = [];
					for (let group of app.games.groups) games.push(...group.games);
					games = games.sort((a,b) => a.name.localeCompare(b.name));
					resolve(games);
				} else setTimeout(loop);
			}())
		});
	},

	random() {
		return new Promise(resolve => {
			app.getGames().then(games => {
				const game = games[Math.floor(games.length * Math.random())];
				resolve(game);
			})
		});
	},

	slug(string) {
		string = string.replace(/\s/g,"-");
		string = string.replace(/\'/g,"");
		string = string.replace(/\./g,"");
		string = string.toLowerCase();
		return string;
	},

	update() {
		Photon.toast(`<i class="material-icons primary-text">system_update_alt</i><span>Updating</span>`, 2500);
		caches.delete("application-cache").then(() => {
			setTimeout(() => location.reload(), 1500);
		}).catch(e => console.error(e));
	},

	launch(game, redirector) {
		const path = app.slug(game.name);
		if(localStorage.getItem("hidewarn") !== "true"){
			let dialog = new Photon.dialog({
				type:"alert",
				title:"Warning",
				transition: "grow",
				message:"This game might make sound. If you\'re undercover, make sure your computer is on mute.",
				actions: [{
					name:"don't show again",
					role: "primary",
					click() {
						localStorage.setItem("hidewarn","true");
						setTimeout(() => {
							redirector instanceof React.Component ? redirector.setState({ redirect: `/game/${path}` }) : location.pathname = `/game/${path}`;
							dialog.destroy();
						},250);
					}
				},
				{
					name:"proceed",
					click() {
						redirector instanceof React.Component ? redirector.setState({ redirect: `/game/${path}` }) : location.pathname = `/game/${path}`;
						dialog.destroy();
					}
				},
				{
					name:"cancel",
					click() {
						dialog.destroy();
					}
				}]
			});

			dialog.open();
		} else {
			redirector instanceof React.Component ? redirector.setState({ redirect: `/game/${path}` }) : location.pathname = `/game/${path}`;
		}
	},

	setCookie(cname, cvalue, seconds = 7 * 24 * 60 * 60) {
        let d = new Date();
        d.setTime(d.getTime() + (seconds * 1000));
        let expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    },

    getCookie(name) {
        let value = "; " + document.cookie;
        let parts = value.split("; " + name + "=");
        if (parts.length == 2) return parts.pop().split(";").shift();
    }

}

if(document.referrer.indexOf("goguardian") > 0) while(true) throw new Error("bad referrer");
app.setDarkMode(localStorage.getItem("darkmode") === "true")
