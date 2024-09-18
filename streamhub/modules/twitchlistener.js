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
const url_twitch_channels = url_twitch_helix + '/channels';

const url_twitch_get_channelinfo = url_twitch_channels + '?broadcaster_id=';

const rgx_twitch_access_token = /\#access\_token\=([\w]+)/;
const rgx_twitch_privmsg = /\:(.+)\!\1\@\1\.tmi\.twitch\.tv PRIVMSG \#([^\s]+) \:(.+)/;
const rgx_twitch_usercolor = /color\=(\#\w{6})\;/;
const rgx_twitch_displayName = /display\-name\=(\w+)\;/;

const optkey_twitch_token = 'twitch.bot.accessToken';
const optkey_twitch_clientId = 'twitch.bot.clientId';
const optkey_twitch_username = 'twitch.bot.username';
const optkey_twitch_channel = 'twitch.channel';
const optkey_twitch_listen = 'twitch.listen';


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
		this.joinedChannelData = {};
		this.joinedChannelUserData = {};

		try
		{
			this.ws.onopen = () =>
			{
				this.ws.send("PASS oauth:" + OptionManager.GetOptionValue(optkey_twitch_token, ""));
				this.ws.send("NICK " + OptionManager.GetOptionValue(optkey_twitch_username, "nobody"));
				window.setTimeout(
					() =>
					{
						this.ws.send("CAP REQ :twitch.tv/tags");
						this.UpdateChannel();
						//this.ws.send("JOIN #" + OptionManager.GetOptionValue("twitch.channel", "twitch"));
					}, 42
				);

				this.connected = true;
			};
		} catch (error)
		{
			this.connected = false;
			console.warn(`TWITCH WS OPEN ERROR: '${error}'`);
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
				if (OptionManager.GetOptionValue(optkey_twitch_listen, false))
				{
					var color_check = event.data.match(rgx_twitch_usercolor);
					var displayName_check = event.data.match(rgx_twitch_displayName);

					var nameColor = color_check ? color_check[1] : "white";
					var displayName = displayName_check ? displayName_check[1] : privmsg_check[1];

					ChatCollector.Append(displayName, privmsg_check[3], "twitch", nameColor);
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

	async UpdateChannel()
	{
		if (!this.connected) return;
		var newChannelValue = OptionManager.GetOptionValue(optkey_twitch_channel, "");
		if (newChannelValue === this.joinedChannel) return;
		if (this.joinedChannel && this.joinedChannel !== "") this.ws.send("PART #" + this.joinedChannel);

		this.joinedChannel = newChannelValue;
		if (newChannelValue !== '')
		{
			this.ws.send("JOIN #" + newChannelValue);
			console.log("JOINED TWITCH CHANNEL NAME : " + newChannelValue);

			this.joinedChannelUserData = await TwitchResources.SingleUserDataRequest(newChannelValue);
			if (this.joinedChannelUserData == null)
			{
				console.log('this.joinedChannelUserData==null');

			}
			else
			{
				var channelId = this.joinedChannelUserData.id;
				console.log("JOINED TWITCH CHANNEL ID : " + channelId);

				this.joinedChannelData = await TwitchResources.SingleChannelDataRequest(channelId);
				console.log(this.joinedChannelData);
			}
		}
		else
		{
			this.joinedChannelData = {};
		}
	}

	SendMessageAsBot(message = "I am a robot. Beep. Boop.")
	{
		this.ws.send("PRIVMSG #" + this.joinedChannel + " :" + message);
	}

	static CheckWindowLocationHashForAccessToken()
	{
		var got_access_token = window.location.hash.match(rgx_twitch_access_token);
		if (got_access_token != null)
		{
			OptionManager.SetOptionValue(optkey_twitch_token, got_access_token[1]);
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

	static IndexOfCachedData(username) { return TwitchResources.profileDataCache.IndexOf(username); }

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
		var authValue = OptionManager.GetOptionValue(optkey_twitch_token, '');
		var clientIdValue = OptionManager.GetOptionValue(optkey_twitch_clientId, '');

		if (authValue === '' || clientIdValue === '') return null;

		await fetch(
			url,
			{
				method: "GET",
				cache: "default",
				headers: { 'Authorization': "Bearer " + authValue, 'Client-Id': clientIdValue }
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

	static async SingleUserDataRequest(username)
	{
		username = username.trim().toLowerCase();
		var authValue = OptionManager.GetOptionValue(optkey_twitch_token, '');
		var clientIdValue = OptionManager.GetOptionValue(optkey_twitch_clientId, '');

		if (authValue === '' || clientIdValue === '') return null;

		return await fetch(
			url_twitch_users + '?login=' + username,
			{
				method: "GET",
				cache: "default",
				headers: { 'Authorization': "Bearer " + authValue, 'Client-Id': clientIdValue }
			}
		).then(
			x => x.json()
		).then(
			x =>
			{
				if (!x || !x.data)
				{
					console.warn(x);
					return;
				}
				return x.data[0];
			}
		);
	}

	static async SingleChannelDataRequest(channelId)
	{
		channelId = channelId.trim().toLowerCase();
		var authValue = OptionManager.GetOptionValue(optkey_twitch_token, '');
		var clientIdValue = OptionManager.GetOptionValue(optkey_twitch_clientId, '');

		if (authValue === '' || clientIdValue === '') return null;
		return await fetch(
			url_twitch_get_channelinfo + channelId,
			{
				method: "GET",
				cache: "default",
				headers: { 'Authorization': "Bearer " + authValue, 'Client-Id': clientIdValue }
			}
		).then(
			x => x.json()
		).then(
			x =>
			{
				if (!x || !x.data)
				{
					console.warn(x);
					return null;
				}
				return x.data[0];
			}
		);
	}
}


TwitchResources.Initialize();

OptionManager.AppendOption(optkey_twitch_listen, false, "Listen To Twitch");
OptionManager.AppendOption(optkey_twitch_channel, "", "Join Channel");
OptionManager.AppendOption(optkey_twitch_username, "", "Bot Username");
OptionManager.AppendOption(optkey_twitch_clientId, "", "Bot Client ID");
OptionManager.AppendOption(optkey_twitch_token, "", "Access Token");