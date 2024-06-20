import { EventSource } from "./eventsource.js";
import { KickChannelDataCache } from "./kicklistener.js";
import { Lookup } from "./lookup.js";
import { TwitchResources } from "./twitchlistener.js";

console.info("[ +Module ] MutliPlatform Users");

export class MultiPlatformUser
{
	constructor(username, platform, fetchData = true)
	{
		this.username = username;
		this.displayName = username;
		this.platform = platform;
		this.platformId = -1;
		this.color = "white";
		this.profileImageSource = "";

		this.data = {}; // platform specific data blob, direct from source

		if (fetchData) MultiPlatformUserCache.EnqueueUserDataRequest(this);
	}

	FetchProfileData()
	{
		var cacheIndex = -1;
		switch (this.platform)
		{
			case 'twitch':
				cacheIndex = TwitchResources.profileDataCache.IndexOf(this.username);
				if (cacheIndex > -1)
				{
					this.data = TwitchResources.profileDataCache.values[cacheIndex];
					this.platformId = this.data.id;
					this.displayName = this.data.display_name;
					this.profileImageSource = this.data.profile_image_url;
					/*
					//this is for extracting display name + color from a PRIVMSG received from twitch,
					//not for extracting those values from the user data object
					var color_check = this.data.match(TwitchResources.rgx_twitch_usercolor);
					var displayName_check = this.data.match(TwitchResources.rgx_twitch_displayName);
					this.color = color_check ? color_check[1] : "white";
					this.displayName = displayName_check ? displayName_check[1] : this.username;
					*/
				}
				break;
			case 'kick':
				cacheIndex = KickChannelDataCache.GetOrRequestProfileData(username);
				if (cacheIndex > -1)
				{
					this.data = KickChannelDataCache.cachedData.values[cacheIndex];
					this.platformId = this.data.id;
					this.displayName = this.data.user.username;
					this.profileImageSource = this.data.user.profile_pic;
				}
				break;
			default:
				console.warn("unknown user platform : " + this.platform + " : cannot get user data");
				break;
		}
	}

	UpdateColor(newColor) { this.color = newColor; }
}

export class MultiPlatformUserCache
{
	static users = new Lookup();
	static onNewUser = new EventSource();
	static profileDataQueue = [];

	static Start

	static Append(username, platform)
	{
		var u = new MultiPlatformUser(username, platform);
		MultiPlatformUserCache.users.Add(username, u);
		MultiPlatformUserCache.onNewUser.Invoke(u);
	}

	static GetUser(username, platform)
	{
		for (var userIndex in MultiPlatformUserCache.users)
		{
			var thisUser = MultiPlatformUserCache.users[userIndex];
			if (thisUser.username != username || thisUser.platform != platform) continue;
			return thisUser;
		}
		var newUser = new MultiPlatformUser(username, platform, true);
		this.Append(newUser);
		return newUser;
	}

	static EnqueueUserDataRequest(user)
	{
		MultiPlatformUserCache.profileDataQueue.push(user);
	}

	static StepDataRequestQueue()
	{
		var u = MultiPlatformUserCache.profileDataQueue[0];
		u.FetchProfileData();
		MultiPlatformUserCache.profileDataQueue.splice(0, 1);
	}
}