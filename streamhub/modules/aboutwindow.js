import { addElement } from "../hubscript.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] About Window");

export class AboutWindow extends DraggableWindow
{
	static window_kind = "About";
	static instance = null;

	constructor(pos_x, pos_y)
	{
		super("About", pos_x, pos_y);
		this.e_window_root.style.minHeight = "564px";
		this.e_window_root.style.minWidth = "520px";
		this.SetTitle("About");
		this.SetIcon("info_i");
		this.window_kind = AboutWindow.window_kind;
		this.CreateContentContainer();
		this.e_content.style.paddingLeft = "0.5rem";
		this.e_content.style.paddingRight = "0.5rem";
		this.e_content.style.overflowY = "auto";
		this.e_content.style.overflowX = "hidden";

		this.AddAboutSection(
			"<br>What is this place?",
			"This is a <b>100% client-side</b> multi-platform livestreaming bot frontend.<br>" +
			"In other words, it's a website that <b>runs on your computer</b> that helps you utilize bot accounts which can interact with your livestream chats.<br><br>"
		);

		this.AddAboutSection(
			"What platforms are supported?",
			"Currently, you can hook up your <b>Twitch bot</b> account to listen to redemptions, donations, and other chat messages. " +
			"While more platforms are planned, the frontend currently <b>only allows listening to Twitch and Kick chat channels</b>.<br><br>" +
			"You can attach your StreamElements account to listen to donations.<br>" +
			"In the future, additional streaming platforms and their bots will be supported.<br><br>"
		);

		let url_portfolio = window.location.href.replace("/streamhub", "");
		const url_patreon = "https://www.patreon.com/SinuousityMakes?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink";
		this.AddAboutSection(
			"Who are you?",
			"A software engineer with a propensity for technical art and visual effects work.<br>" +
			"I have recently been exploring web development <b>extensively</b> and this is one result of that. " +
			"If you're interested to know more, this site is actually hosted alongside my portfolio! It may be rudimentary but it is mine.<br>" +
			"To see some of my other work, visit my <a href='" + url_portfolio + "'>Portfolio</a> or <a href='" + url_patreon + "'>Patreon</a>!<br><br>"
		);

		const url_donate = "https://www.paypal.com/donate/?business=7V2RLS5ZJHJS2&no_recurring=0&item_name=Building+publicly+available+software+to+solve+niche+problems+for+the+online+community%21&currency_code=USD";

		this.AddAboutSection(
			"How much does it cost to use this?",
			"Nothing.<br>" +
			"I provide this site as-is and free of charge for anyone interested in using it.<br>" +
			"However... you <b><i>can</i></b> charitably donate to my efforts via <a href='" + url_donate + "'>PayPal</a> or <a href='" + url_patreon + "'>Patreon</a>!<br><br>"
		);

		this.AddAboutSection(
			"Who was first?",
			"Qoioqx was first."
		);
	}

	AddAboutSection(title = "", body = "")
	{
		var e_title = addElement("div", null, this.e_content, null);
		e_title.innerHTML = title;
		e_title.style.textAlign = "center";
		e_title.style.color = "#ffaa00";

		var e_body = addElement("div", null, this.e_content, null);
		e_body.style.textAlign = "center";
		e_body.style.fontSize = "0.9rem";
		e_body.style.fontWeight = "normal";
		e_body.innerHTML = body;
	}

	onWindowShow() { AboutWindow.instance = this; }
	onWindowClose() { AboutWindow.instance = null; }
}

WindowManager.instance.windowTypes.push(
	{
		key: AboutWindow.window_kind,
		icon: "info_i",
		desc: "Find out more about this site and its creator.",
		model: (x, y) => { return new AboutWindow(x, y); },
		shortcutKey: '/'
	}
);