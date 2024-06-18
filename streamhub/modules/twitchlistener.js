import { OptionManager } from "./globalsettings.js";
import { ChatCollector } from "./chatcollector.js";
import { Lookup } from "./lookup.js";
import { EventSource } from "./eventsource.js";

console.info("[ +Module ] Twitch Listener");

const url_twitch_host = "irc.twitch.tv";
const url_twitch_tmi = "tmi.twitch.tv";

const url_twitch_ws = "wss://irc-ws.chat.twitch.tv:443";

const url_twitch_id = "https://id.twitch.tv";
const url_twitch_oauth = url_twitch_id + "/oauth2";
const url_twitch_oauth_validate = url_twitch_oauth + "/validate";
const url_twitch_oauth_authorize = url_twitch_oauth + "/authorize";

const url_twitch_api = "https://api.twitch.tv";
const url_twitch_kraken = url_twitch_api + "/kraken";
const url_twitch_helix = url_twitch_api + "/helix";

const url_twitch_users = url_twitch_helix + "/users";

const rgx_twitch_access_token = /\#access\_token\=([\w]+)/;
const rgx_twitch_privmsg = /\:(.+)\!\1\@\1\.tmi\.twitch\.tv PRIVMSG \#([^\s]+) \:(.+)/;
const rgx_twitch_usercolor = /color\=(\#\w{6})\;/;

export class TwitchListener
{
	static instance = new TwitchListener();

	static GetAuthURL()
	{
		var redirect = TwitchListener.GetRedirectUri();
		redirect = redirect.replace("http://", "https://");
		var user_auth_url = url_twitch_oauth_authorize;
		user_auth_url += "?response_type=token";
		user_auth_url += "&client_id=" + OptionManager.GetOptionValue("twitch.bot.clientId", "");
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

		try
		{
			this.ws.onopen = () =>
			{
				this.ws.send("PASS oauth:" + OptionManager.GetOptionValue("twitch.bot.accessToken", ""));
				this.ws.send("NICK " + OptionManager.GetOptionValue("twitch.bot.username", "nobody"));
				window.setTimeout(
					() =>
					{
						this.ws.send("CAP REQ :twitch.tv/tags");
						this.ws.send("JOIN #" + OptionManager.GetOptionValue("twitch.channel", "twitch"));
					}, 42
				);

				this.connected = true;
			};
		} catch (error)
		{
			this.connected = false;
			return;
		}

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
				if (OptionManager.GetOptionValue("twitch.listen", false))
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

			if (event.data.includes(":tmi.twitch.tv NOTICE * :Invalid NICK"))
			{
				console.warn(`[ Twitch ] Please Set Your Bot Username In Authentication Settings!`);

			}
			console.log(`[ Twitch ] ( ${event.type} ) ${event.data}`);
		};

		this.ws.onclose = () =>
		{
			console.warn("[ Twitch ] Connection Closed");
			this.connected = false;
		};

		this.ws.onerror = (error) =>
		{
			console.error("[ Twitch ] Connection Error", error.toString());
		};
	}

	UpdateChannel()
	{
		if (!this.connected) return;
		if (OptionManager.GetOptionValue("twitch.channel", "") == this.joinedChannel) return;

		if (this.joinedChannel != null && this.joinedChannel.length > 0) this.ws.send("PART #" + this.joinedChannel);
		this.joinedChannel = OptionManager.GetOptionValue("twitch.channel", "");
		this.ws.send("JOIN #" + this.joinedChannel);
	}

	static CheckWindowLocationHashForAccessToken()
	{
		var got_access_token = window.location.hash.match(rgx_twitch_access_token);
		if (got_access_token != null)
		{
			OptionManager.SetOptionValue("twitch.bot.accessToken", got_access_token[1]);

			//fetch("accesstoken" + got_access_token[1], { method: "POST" });
			window.location.hash = "";
		}
	}
}


export class TwitchResources
{
	static profileDataCache = new Lookup();
	static onCacheUpdated = new EventSource();

	static profileDataQueue = [];

	static Initialize()
	{
		window.setInterval(() => { TwitchResources.StepProfileDataQueue(); }, 100);
	}

	static StepProfileDataQueue() { if (TwitchResources.profileDataQueue.length > 0) TwitchResources.GetProfileDataBatch(); }

	static HasCachedProfileData(username) { return TwitchResources.profileDataCache.Contains(username); }
	static GetCachedProfileData(username) { return TwitchResources.profileDataCache.Get(username); }

	static HasDataRequest(username)
	{
		if (!username) return;
		for (var ii = 0; ii < TwitchResources.profileDataQueue.length; ii++)
		{
			if (TwitchResources.profileDataQueue[ii].username == username) return true;
		}
		return false;
	}

	static EnqueueProfileDataRequest(username, withData = x => { })
	{
		if (!username) return;
		if (TwitchResources.HasDataRequest(username)) return;
		TwitchResources.profileDataQueue.push({
			username: username,
			withData: withData
		});
	}

	static GetOrRequestData(username, withData = x => { })
	{
		if (!username) return;
		var cacheIndex = TwitchResources.profileDataCache.IndexOf(username);
		if (cacheIndex > -1) // exists in cache
		{
			withData(TwitchResources.profileDataCache.Get(cacheIndex));
			return;
		}

		// does not exist in cache
		TwitchResources.EnqueueProfileDataRequest(username, withData);
	}

	static async GetProfileDataBatch()
	{
		var reqCount = Math.min(50, TwitchResources.profileDataQueue.length);
		var reqs = TwitchResources.profileDataQueue.splice(0, reqCount);
		if (reqs.length < 1) return;


		var url = url_twitch_users + "?login=" + reqs[0].username;
		if (reqs.length > 1)
		{
			for (var ii = 1; ii < reqs.length; ii++)
				url += "&login=" + reqs[ii].username;
		}

		await TwitchResources.UserDataRequest(url);

		for (var ii = 0; ii < reqs.length; ii++)
		{
			var reqIndex = ii;
			var newCacheData = TwitchResources.GetCachedProfileData(reqs[reqIndex].username);
			reqs[reqIndex].withData(newCacheData);
		}
	}

	static async UserDataRequest(url)
	{
		await fetch(
			url,
			{
				method: "GET",
				cache: "default",
				headers: {
					'Authorization': "Bearer " + OptionManager.GetOptionValue("twitch.bot.accessToken", "oops"),
					'Client-Id': OptionManager.GetOptionValue("twitch.bot.clientId", "oops")
				}
			}
		).then(x => x.json()).then(
			x =>
			{
				if (!x || !x.data)
				{
					console.warn(x);
					return;
				}
				var data = x.data;
				for (var ii = 0; ii < data.length; ii++)
				{
					TwitchResources.profileDataCache.Set(data[ii].login, data[ii]);
				}
				TwitchResources.onCacheUpdated.Invoke();
			}
		);
	}
}


TwitchResources.Initialize();

OptionManager.AppendOption("twitch.listen", false, "Listen To Twitch");
OptionManager.AppendOption("twitch.channel", "", "Join Channel");
OptionManager.AppendOption("twitch.bot.username", "", "Bot Username");
OptionManager.AppendOption("twitch.bot.clientId", "", "Bot Client ID");
OptionManager.AppendOption("twitch.bot.accessToken", "", "Access Token");