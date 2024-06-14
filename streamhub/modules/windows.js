import { GlobalSettings } from "./globalsettings.js";
import { WindowManager } from "./windowmanager.js";
import { DraggableWindow } from "./windowcore.js";
import { Notifications } from "./notifications.js";
import { Lookup } from "./lookup.js";
import { TwitchListener } from "./twitchlistener.js";

console.info("Module Added: Windows");

export class ChatWindow extends DraggableWindow
{
	constructor(title, pos_x, pos_y)
	{
		super(title, pos_x, pos_y);
		this.max_entries = 50;
		this.messages = new Lookup();
		this.getMessageId = m => m.id;
	}

	CheckAddMessage(m)
	{
		var message_id = this.getMessageId(m);
		var message_exists = this.messages.Contains(message_id);
		if (message_exists) return;
		this.messages.Add(message_id, m);

		if (this.messages.length >= this.max_entries)
		{
			var toSplice = this.max_entries - this.messages.length;
			this.messages.splice(0, toSplice);
		}
	}
}

export class ServiceCredentialWindow extends DraggableWindow
{
	constructor(position_x, position_y)
	{
		super("Services", position_x, position_y);
		super.window_kind = "hidden:settings-credentials";

		this.e_window_root.style.minWidth = "720px";
		this.e_window_root.style.maxWidth = "720px";
		this.e_window_root.style.minHeight = "460px";
		this.e_window_root.style.maxHeight = "460px";

		this.SetIcon("link");
		this.SetTitle("Services");

		this.CreateContentContainer(true);
		this.CreateControlsColumn();

		this.AddTwitchSettings();
		this.AddStreamElementsSettings();
	}

	AddStreamElementsSettings()
	{
		this.AddSectionTitle("StreamElements");

		var txt_seAccountId = this.AddTextField("Account ID", GlobalSettings.instance.text_seAccountId, (e) => { GlobalSettings.instance.text_seAccountId = e.value; });
		txt_seAccountId.style.height = "2rem";
		txt_seAccountId.style.lineHeight = "2rem";
		txt_seAccountId.children[1].className += " hover-obscure";

		var txt_seJwtToken = this.AddTextArea("JWT Token", GlobalSettings.instance.text_seJwtToken, (e) => { GlobalSettings.instance.text_seJwtToken = e.value; });
		txt_seJwtToken.style.height = "10rem";
		txt_seJwtToken.children[1].className += " hover-obscure";
	}

	AddTwitchSettings()
	{
		this.AddSectionTitle("Twitch");

		var txt_username = this.AddTextField("Bot Username", GlobalSettings.instance.text_twitchUsername, (e) => { GlobalSettings.instance.text_twitchUsername = e.value; });
		txt_username.style.height = "2rem";
		txt_username.style.lineHeight = "2rem";

		var txt_clientId = this.AddTextField("Client ID", GlobalSettings.instance.text_twitchClientId, (e) => { GlobalSettings.instance.text_twitchClientId = e.value; });
		txt_clientId.style.height = "2rem";
		txt_clientId.style.lineHeight = "2rem";
		txt_clientId.children[1].className += " hover-obscure";

		var hasAccessToken = GlobalSettings.instance.text_twitchAccessToken != "";
		var lbl_twitchAccessToken = this.AddTextReadonly("Access Token", hasAccessToken ? "GOT ACCESS TOKEN!" : "INVALID ACCESS TOKEN - PLEASE RENEW");
		lbl_twitchAccessToken.style.height = "2rem";
		lbl_twitchAccessToken.style.lineHeight = "2rem";
		lbl_twitchAccessToken.children[1].children[0].style.color = hasAccessToken ? "#00ff00cc" : "#ffcc00cc";

		var btn_twitchAccessToken = this.AddButton("", "Renew Access Token", () =>
		{
			if (GlobalSettings.instance.text_twitchClientId == "") { Notifications.instance.Add("Twitch Bot ClientID Required To Renew Access Token!", "#ff000040"); return; }
			//if (GlobalSettings.instance.text_twitchClientSecret == "") { Notifications.instance.Add("Twitch Bot Secret Required To Renew Access Token!", "#ff000040"); return; }
			var auth_url = TwitchListener.GetAuthURL();
			console.warn(auth_url);
			window.open(auth_url, "_self");
		});
		btn_twitchAccessToken.style.height = "2rem";
		btn_twitchAccessToken.style.lineHeight = "2rem";
		btn_twitchAccessToken.title = "Request a new access token from Twitch. This allows us to utilize your bot account to interact with Twitch. Clicking this button will open the authorization page. Once you authorize the bot, you will be returned to this page.";
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: "hidden:settings-credentials",
		model: (x, y) => { return new ServiceCredentialWindow(x, y); }
	}
);