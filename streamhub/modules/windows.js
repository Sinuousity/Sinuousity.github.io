import { GlobalSettings, OptionManager } from "./globalsettings.js";
import { WindowManager } from "./windowmanager.js";
import { DraggableWindow } from "./windowcore.js";
import { Notifications } from "./notifications.js";
import { Lookup } from "./lookup.js";
import { TwitchListener } from "./twitchlistener.js";
import { GlobalTooltip } from "./globaltooltip.js";

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

		this.e_window_root.style.minWidth = "420px";
		this.e_window_root.style.minHeight = "460px";

		this.SetIcon("link");
		this.SetTitle("Credentials");

		this.CreateContentContainer(false);
		this.CreateControlsColumn();

		this.AddTwitchSettings();
		this.AddStreamElementsSettings();
	}

	AddStreamElementsSettings()
	{
		this.AddSectionTitle("StreamElements");

		var str_openaccpage = 'Open StreamElements Account Page';
		var str_openaccpage_tip = 'Open StreamElements Account Page';
		var btn_goto_se_account = this.AddButton('', str_openaccpage, () => { window.open('https://streamelements.com/dashboard/account/channels', '_blank') });
		btn_goto_se_account.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(btn_goto_se_account, str_openaccpage_tip);

		const accountIdOption = OptionManager.GetOption("se.account.id");
		var txt_seAccountId = this.AddTextField("Account ID", accountIdOption.value, (e) => { OptionManager.SetOptionValue("se.account.id", e.value); });
		txt_seAccountId.style.height = "2rem";
		txt_seAccountId.style.lineHeight = "2rem";
		txt_seAccountId.children[1].className += " hover-obscure";
		const str_se_account_id_tip = "Your StreamElements Account ID. You can find this in your StreamElements Account page.";
		GlobalTooltip.RegisterReceiver(txt_seAccountId, str_se_account_id_tip);

		const jwtTokenOption = OptionManager.GetOption("se.jwt.token");
		var txt_seJwtToken = this.AddTextArea("JWT Token", jwtTokenOption.value, (e) => { OptionManager.SetOptionValue("se.jwt.token", e.value); });
		txt_seJwtToken.style.height = "10rem";
		txt_seJwtToken.children[1].className += " hover-obscure";
		const str_se_jwt_token_tip = "Your StreamElements Account JWT Token. You can find this in your StreamElements Account page.";
		GlobalTooltip.RegisterReceiver(txt_seJwtToken, str_se_jwt_token_tip);
	}

	AddTwitchSettings()
	{
		this.AddSectionTitle("Twitch");

		var str_openaccpage = 'Open Twitch Developer Apps Page';
		var str_openaccpage_tip = 'Open Twitch Developer Console, to the Apps Page';
		var btn_goto_se_account = this.AddButton('', str_openaccpage, () => { window.open('https://dev.twitch.tv/console/apps', '_blank') });
		btn_goto_se_account.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(btn_goto_se_account, str_openaccpage_tip);

		const usernameOption = OptionManager.GetOption("twitch.bot.username");
		var txt_username = this.AddTextField("Bot Username", usernameOption.value, (e) => { OptionManager.SetOptionValue("twitch.bot.username", e.value); });
		txt_username.style.height = "2rem";
		txt_username.style.lineHeight = "2rem";
		const str_botusername_tip =
			"This is your bot's username.<br>"
			+ "You can find this in the Twitch Developer Console under Applications (if you're logged in with your human account).";
		GlobalTooltip.RegisterReceiver(txt_username, str_botusername_tip);

		const clientIdOption = OptionManager.GetOption("twitch.bot.clientId");
		var txt_clientId = this.AddTextField("Client ID", clientIdOption.value, (e) => { OptionManager.SetOptionValue("twitch.bot.clientId", e.value); });
		txt_clientId.style.height = "2rem";
		txt_clientId.style.lineHeight = "2rem";
		txt_clientId.children[1].className += " hover-obscure";
		const str_clientid_tip =
			"This is your bot's ClientId.<br>"
			+ "You can find this in the Twitch Developer Console under Applications (if you're logged in with your human account).";
		GlobalTooltip.RegisterReceiver(txt_clientId, str_clientid_tip);

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
		const str_new_token_tip = "Request a new access token from Twitch. This allows us to utilize your bot account to interact with Twitch. Clicking this button will open the authorization page. Once you authorize the bot, you will be returned to this page.";
		GlobalTooltip.RegisterReceiver(btn_twitchAccessToken, str_new_token_tip);

		var btn_twitchAccessTokenClear = this.AddButton("", "Clear Access Token", () =>
		{
			OptionManager.SetOptionValue("twitch.bot.accessToken", "");
		});
		btn_twitchAccessTokenClear.style.height = "2rem";
		btn_twitchAccessTokenClear.style.lineHeight = "2rem";
		const str_clear_token_tip = "Clear the stored access token.";
		GlobalTooltip.RegisterReceiver(btn_twitchAccessTokenClear, str_clear_token_tip);
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: "hidden:Credentials",
		model: (x, y) => { return new ServiceCredentialWindow(x, y); }
	}
);