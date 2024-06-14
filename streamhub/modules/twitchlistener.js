import { RemoteDataConnection } from "./remotedata.js";
import { GlobalSettings } from "./globalsettings.js";
import { ChatCollector } from "./chatcollector.js";

console.info("Module Added: Twitch Listener");

const url_twitch_host = "irc.twitch.tv";
const url_twitch_tmi = "tmi.twitch.tv";

const url_twitch_ws = "ws://irc-ws.chat.twitch.tv:80";

const url_twitch_id = "https://id.twitch.tv";
const url_twitch_oauth = url_twitch_id + "/oauth2";
const url_twitch_oauth_validate = url_twitch_oauth + "/validate";
const url_twitch_oauth_authorize = url_twitch_oauth + "/authorize";

const url_twitch_api = "https://api.twitch.tv";
const url_twitch_kraken = url_twitch_api + "/kraken";
const url_twitch_helix = url_twitch_api + "/helix";

const url_local_redirect = "http://localhost:23754/";

const rgx_twitch_access_token = /\#access\_token\=([\w]+)/;
const rgx_twitch_privmsg = /\:(.+)\!\1\@\1\.tmi\.twitch\.tv PRIVMSG \#([^\s]+) \:(.+)/;
const rgx_twitch_usercolor = /color\=(\#\w{6})\;/;

export class TwitchListener
{
	static instance = new TwitchListener();

	static GetAuthURL()
	{
		var user_auth_url = url_twitch_oauth_authorize;
		user_auth_url += "?response_type=token";
		user_auth_url += "&client_id=" + GlobalSettings.instance.text_twitchClientId;
		user_auth_url += "&redirect_uri=" + TwitchListener.GetRedirectUri();
		user_auth_url += "&scope=chat%3Aread+chat%3Aedit";
		return user_auth_url;
	}

	static GetRedirectUri()
	{
		var n = window.location.toString();
		n = n.replace(window.location.search, "");
		n = n.replace(window.location.hash, "");
		return n;
	}

	constructor()
	{
		this.ws = new WebSocket(url_twitch_ws);
		this.connected = false;
		this.joinedChannel = "";

		this.ws.onopen = () =>
		{
			this.ws.send("PASS oauth:" + GlobalSettings.instance.text_twitchAccessToken);
			this.ws.send("NICK " + GlobalSettings.instance.text_twitchUsername);
			window.setTimeout(
				() =>
				{
					this.ws.send("CAP REQ :twitch.tv/tags");
					this.ws.send("JOIN #" + GlobalSettings.instance.text_twitchChannel);
				}, 42
			);

			this.connected = true;
		};

		this.ws.onmessage = (event) =>
		{
			if (event.data.startsWith(":tmi.twitch.tv 001"))
			{
				return;
			}

			if (event.data.startsWith("PING"))
			{
				this.ws.send("PONG :tmi.twitch.tv");
				return;
			}

			var privmsg_check = event.data.match(rgx_twitch_privmsg);
			if (privmsg_check)
			{
				if (GlobalSettings.instance.bool_listenToTwitch)
				{
					var color_check = event.data.match(rgx_twitch_usercolor);
					if (color_check)
					{
						ChatCollector.Append(privmsg_check[1], privmsg_check[3], "twitch", color_check[1]);
					}
					else
					{
						ChatCollector.Append(privmsg_check[1], privmsg_check[3], "twitch", "white");
					}
				}
				return;
			}
			console.log(`TwitchWS [${event.type}] :: ${event.data}`);
		};

		this.ws.onclose = () =>
		{
			console.warn("Twitch WebSocket Closed");
			this.connected = false;
		};

		this.ws.onerror = (error) =>
		{
			console.error("Twitch WS Error", error.toString());
		};
	}

	UpdateChannel()
	{
		if (GlobalSettings.instance.text_twitchChannel == this.joinedChannel) return;
		if (this.joinedChannel != null && this.joinedChannel.length > 0) this.ws.send("PART #" + this.joinedChannel);
		this.joinedChannel = GlobalSettings.instance.text_twitchChannel;
		this.ws.send("JOIN #" + GlobalSettings.instance.text_twitchChannel);
	}

	CheckWindowLocationHashForAccessToken()
	{
		var got_access_token = window.location.hash.match(rgx_twitch_access_token);
		if (got_access_token != null)
		{
			GlobalSettings.instance.text_twitchAccessToken = got_access_token[1];
			GlobalSettings.instance.StoreState();

			//fetch("accesstoken" + got_access_token[1], { method: "POST" });
			window.location.hash = "";
		}
	}
}