import { GlobalSettings, OptionManager } from "./globalsettings.js";
import { WindowManager } from "./windowmanager.js";
import { DraggableWindow } from "./windowcore.js";
import { Notifications } from "./notifications.js";
import { Lookup } from "./lookup.js";
import { TwitchListener } from "./twitchlistener.js";

console.info("[ +Module ] Windows");

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
		this.messages.Set(message_id, m);

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
		super("Credentials", position_x, position_y);
		super.window_kind = "hidden:Credentials";

		this.e_window_root.style.minWidth = "720px";
		this.e_window_root.style.maxWidth = "720px";
		this.e_window_root.style.minHeight = "480px";
		this.e_window_root.style.maxHeight = "480px";

		this.SetIcon("link");
		this.SetTitle("Credentials");

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

		const usernameOption = OptionManager.GetOption("twitch.bot.username");
		var txt_username = this.AddTextField("Bot Username", usernameOption.value, (e) => { OptionManager.SetOptionValue("twitch.bot.username", e.value); });
		txt_username.style.height = "2rem";
		txt_username.style.lineHeight = "2rem";

		const clientIdOption = OptionManager.GetOption("twitch.bot.clientId");
		var txt_clientId = this.AddTextField("Client ID", clientIdOption.value, (e) => { OptionManager.SetOptionValue("twitch.bot.clientId", e.value); });
		txt_clientId.style.height = "2rem";
		txt_clientId.style.lineHeight = "2rem";
		txt_clientId.children[1].className += " hover-obscure";

		var hasAccessToken = clientIdOption.value != "";
		var lbl_twitchAccessToken = this.AddTextReadonly("Access Token", hasAccessToken ? "GOT ACCESS TOKEN!" : "INVALID ACCESS TOKEN - PLEASE RENEW");
		lbl_twitchAccessToken.style.height = "2rem";
		lbl_twitchAccessToken.style.lineHeight = "2rem";
		lbl_twitchAccessToken.children[1].children[0].style.color = hasAccessToken ? "#00ff00cc" : "#ffcc00cc";

		var btn_twitchAccessToken = this.AddButton("", "Renew Access Token", () =>
		{
			if (clientIdOption.value == "")
			{
				Notifications.instance.Add("Twitch Bot ClientID Required To Renew Access Token!", "#ff000040");
				return;
			}
			var auth_url = TwitchListener.GetAuthURL();
			console.warn(auth_url);
			window.open(auth_url, "_self");
		});
		btn_twitchAccessToken.style.height = "2rem";
		btn_twitchAccessToken.style.lineHeight = "2rem";
		btn_twitchAccessToken.title = "Request a new access token from Twitch. This allows us to utilize your bot account to interact with Twitch. Clicking this button will open the authorization page. Once you authorize the bot, you will be returned to this page.";

		var btn_twitchAccessTokenClear = this.AddButton("", "Clear Access Token", () =>
		{
			OptionManager.SetOptionValue("twitch.bot.accessToken", "");
		});
		btn_twitchAccessTokenClear.style.height = "2rem";
		btn_twitchAccessTokenClear.style.lineHeight = "2rem";
		btn_twitchAccessTokenClear.title = "Clear the stored access token.";
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: "hidden:Credentials",
		model: (x, y) => { return new ServiceCredentialWindow(x, y); }
	}
);