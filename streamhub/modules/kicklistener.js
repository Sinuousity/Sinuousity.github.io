import { Lookup } from "./lookup.js";
import { RemoteDataConnection, RemoteDataUsage } from "./remotedata.js";
import { ChatCollector } from "./chatcollector.js";
import { GlobalSettings, OptionManager } from "./globalsettings.js";
import { EventSource } from "./eventsource.js";

console.info("[ +Module ] Kick Listener");

const rgx_kick_message_emote = /\[emote\:(\d+)\:(\w+)\]/g;



const url_kick_v2_channels = "https://kick.com/api/v2/channels/";
const url_kick_v1_users = "https://kick.com/api/v1/users/";
export class KickChannelDataCache
{
	static cachedData = new Lookup();
	static onNewData = new EventSource();
	static requestedChannels = [];

	static IndexOfCachedData(channel) { return KickChannelDataCache.cachedData.IndexOf(channel); }
	static HasDataCached(channel) { return KickChannelDataCache.cachedData.Contains(channel); }
	static HasDataRequested(channel) { return KickChannelDataCache.requestedChannels.includes(channel); }

	static async RequestData(channel, useCache = true, skipCacheCheck = false)
	{
		if (!skipCacheCheck && KickChannelDataCache.HasDataCached(channel)) return;
		if (KickChannelDataCache.HasDataRequested(channel)) return;

		KickChannelDataCache.requestedChannels.push(channel);

		var path = url_kick_v1_users + channel;
		var resp = await fetch(path, { cache: (useCache ? "default" : "no-store") });
		if (!resp.ok)
		{
			console.warn("fetch() error for : " + channel);
			return null;
		}

		let header_content_length = Number(resp.headers.get('content-length'));
		if (header_content_length > 0) RemoteDataUsage.RegisterBytesDownloaded(header_content_length);

		var obj = await resp.json();
		KickChannelDataCache.cachedData.Set(channel, obj);

		var reqId = KickChannelDataCache.requestedChannels.indexOf(channel);
		KickChannelDataCache.requestedChannels.splice(reqId, 1);
		KickChannelDataCache.onNewData.Invoke();
	}

	static GetOrRequestProfileData(channel)
	{
		var cacheIndex = KickChannelDataCache.IndexOfCachedData(channel);
		if (cacheIndex < 0) 
		{
			KickChannelDataCache.RequestData(channel, true, true);
			return {};
		}
		return KickChannelDataCache.cachedData[cacheIndex];
	}
}




export class KickState extends RemoteDataConnection
{
	static instance = new KickState();
	static messageReceivers = [];
	static messageCache = new Lookup();

	constructor()
	{
		super("Kick Chat", 1111);

		this.channelName = "";
		this.gotChannelData = false;
		this.gotChatData = false;
		this.channelData = {};
		this.chatData = {};

		this.onRefreshData = async () => { await this.GetKickDataAsync(); };
		this.afterRefreshData = () => { this.CheckForNewMessages(); };

		GlobalSettings.changeListeners.push(this);
	}

	//received from GlobalSettings.changeListeners subscription
	onSettingsChange()
	{
		this.RefreshChannel();
	}

	static GetTargetChannelName()
	{
		var channelValue = OptionManager.GetOptionValue("kick.channel");
		if (channelValue) return channelValue;
		return "";
	}
	static IsString(thing) { return typeof thing === 'string'; }

	RefreshChannel()
	{
		var targetChannelName = KickState.GetTargetChannelName();
		if (targetChannelName == this.channelName) return;

		this.StopRefreshLoop();
		this.channelName = targetChannelName;
		this.gotChannelData = false;
		this.gotChatData = false;
		this.channelData = {};
		this.chatData = {};

		if (!KickState.IsString(this.channelName)) return;
		this.StartRefreshLoop();
	}

	async GetKickDataAsync()
	{
		if (OptionManager.GetOptionValue("kick.listen"))
		{
			if (!this.gotChannelData)
			{
				this.channelData = await this.GetData(url_kick_v2_channels + this.channelName, true);
				if (this.channelData) this.gotChannelData = true;
			}

			this.chatData = await this.GetData(url_kick_v2_channels + this.channelData.id + "/messages", false);
			if (this.chatData) this.gotChatData = true;
		}
		else
		{

		}
	}

	CleanChatMessage(content)
	{
		var msg = content;
		msg = msg.replace(rgx_kick_message_emote, "☺");
		msg = msg.trim();
		return msg;
	}

	EmitMessage(username, message, color)
	{
		if (KickState.messageReceivers.length > 0)
		{
			for (var ii = 0; ii < KickState.messageReceivers.length; ii++)
			{
				var recv = KickState.messageReceivers[ii];
				if (recv == null) continue;
				if (!recv.AppendMessageElement) continue;
				recv.AppendMessageElement(username, message, color);
			}
		}

		if (OptionManager.GetOptionValue("kick.listen"))
			ChatCollector.Append(username, message, "kick", color);
	}

	CheckForNewMessages()
	{
		if (!this.chatData) return;
		if (!this.chatData.data) return;
		if (!this.chatData.data.messages) return;
		var allMessages = this.chatData.data.messages;
		var newMessagesReceived = false;
		for (var ii = allMessages.length - 1; ii > -1; ii--)
		{
			var m = allMessages[ii];
			if (KickState.messageCache.Contains(m.id)) continue;
			KickState.messageCache.Set(m.id, m);
			this.EmitMessage(m.sender.username, this.CleanChatMessage(m.content), m.sender.identity.color);
			newMessagesReceived = true;
		}

		if (!newMessagesReceived) return false;

		KickState.messageCache.KeepLast(50);
		return true;
	}
}

OptionManager.AppendOption("kick.listen", false, "Listen To Kick");
OptionManager.AppendOption("kick.channel", "", "Join Channel");