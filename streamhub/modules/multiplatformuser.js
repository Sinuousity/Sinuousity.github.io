import { EventSource } from "./eventsource.js";
import { KickChannelDataCache } from "./kicklistener.js";
import { Lookup } from "./lookup.js";
import { TwitchResources } from "./twitchlistener.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import { addElement } from "./../hubscript.js";
import { RemoteDataUsage } from "./remotedata.js";

console.info("[ +Module ] MutliPlatform Users");

export class MultiPlatformUser
{
	static onAnyDataCached = new EventSource();

	static waitingForData = 0;
	static dataCacheCompletes = 0;
	static dataCacheErrors = 0;

	static nullUser = new MultiPlatformUser("NULL", "NONE", false);

	constructor(username, platform, fetchData = true)
	{
		this.username = username;
		this.displayName = username;
		this.platform = platform;
		this.platformId = -1;
		this.platformColor = "gray";
		this.color = "white";
		this.profileImageSource = "";

		this.data = {}; // platform specific data blob, direct from source
		this.dataMessage = 'pending';

		this.ParsePlatformColor();

		if (fetchData) MultiPlatformUserCache.EnqueueUserDataRequest(this);
	}

	ParsePlatformColor()
	{
		switch (this.platform)
		{
			case "twitch": this.platformColor = "purple"; break;
			case "kick": this.platformColor = "green"; break;
			case "youtube": this.platformColor = "red"; break;
			case "facebook": this.platformColor = "blue"; break;
			default: this.platformColor = "gray"; break;
		}
	}

	// checks platform respective cache for data, enqueues request if not found, waits until cached, unpacks the values
	WaitForData()
	{
		this.data = {};
		this.dataMessage = 'waiting for cache';
		var cacheIndex = -1;
		MultiPlatformUser.waitingForData += 1;

		switch (this.platform) // get platform specific cache id, if it exists
		{
			case 'twitch': cacheIndex = TwitchResources.IndexOfCachedData(this.username); break;
			case 'kick': cacheIndex = KickChannelDataCache.IndexOfCachedData(this.username); break;
			default:
				this.dataMessage = 'invalid platform: ' + this.platform;
				MultiPlatformUser.dataCacheErrors += 1;
				MultiPlatformUser.waitingForData -= 1;
				return; // exit loop, don't wait for no data
		}

		if (cacheIndex !== -1) // cached data exists
		{
			switch (this.platform)
			{
				case 'twitch': this.data = TwitchResources.profileDataCache.values[cacheIndex]; break;
				case 'kick': this.data = KickChannelDataCache.cachedData.values[cacheIndex]; break;
				default:
					this.dataMessage = 'invalid platform: ' + this.platform;
					MultiPlatformUser.dataCacheErrors += 1;
					MultiPlatformUser.waitingForData -= 1;
					return; // exit loop, don't fetch for no data
			}
			this.dataMessage = '';
			this.UnpackData();
			MultiPlatformUser.dataCacheCompletes += 1;
			MultiPlatformUser.waitingForData -= 1;
			MultiPlatformUser.onAnyDataCached.Invoke();
			return; // exit loop, the data is cached
		}

		// cached data doesn't exist, request it and wait

		switch (this.platform)
		{
			case 'twitch': TwitchResources.EnqueueProfileDataRequest(this.username); break;
			case 'kick': KickChannelDataCache.RequestData(this.username); break;
			default:
				this.dataMessage = 'invalid platform: ' + this.platform;
				MultiPlatformUser.dataCacheErrors += 1;
				MultiPlatformUser.waitingForData -= 1;
				return; // exit loop, don't request for no data
		}

		window.setTimeout(() => { this.WaitForData(); }, 33);
	}

	// this.data has been set after waiting for the respective cache to contain our key
	UnpackData()
	{
		try
		{
			switch (this.platform)
			{
				case 'twitch':
					this.platformId = this.data.id;
					this.displayName = this.data.display_name;
					this.profileImageSource = this.data.profile_image_url;
					break;
				case 'kick':
					this.platformId = this.data.id;
					this.displayName = this.data.username;
					this.profileImageSource = this.data.profilepic;
					break;
				default: console.warn("unknown user platform : " + this.platform + " : cannot get user data"); break;
			}
		}
		catch (exception)
		{
			this.dataMessage = 'error unpacking! ' + exception.toString();
		}
	}

	UpdateColor(newColor)
	{
		if (this.color == newColor) return;
		this.color = newColor;
		MultiPlatformUser.onAnyDataCached.Invoke();
	}

	static SameUser(userA, userB)
	{
		if (userA.platform != userB.platform) return false;
		if (userA.username != userB.username) return false;
		return true;
	}
}

export class MultiPlatformUserCache
{
	static users = new Lookup();
	static onNewUser = new EventSource();
	static profileDataQueue = [];
	static dataRequestQueueStarted = false;

	static StartDataRequestQueueLoop()
	{
		if (MultiPlatformUserCache.dataRequestQueueStarted) return;
		MultiPlatformUserCache.StepDataRequestQueue();
		MultiPlatformUserCache.dataRequestQueueStarted = true;
	}

	static Append(username, platform, fetchData = true)
	{
		var u = new MultiPlatformUser(username, platform, fetchData);
		MultiPlatformUserCache.users.Set(username, u);
		MultiPlatformUserCache.onNewUser.Invoke(u);
		return u;
	}

	static GetUser(username, platform = "any", addIfNew = false)
	{
		if (typeof username != 'string' || typeof platform != 'string') return null;

		username = username.trim();
		username = username.toLowerCase();

		platform = platform.trim();
		platform = platform.toLowerCase();

		if (username == '' || platform == '') return null;

		for (var userIndex = 0; userIndex < MultiPlatformUserCache.users.values.length; userIndex++)
		{
			var thisUser = MultiPlatformUserCache.users.values[userIndex];
			if (thisUser.username != username) continue;
			if (platform != "any" && thisUser.platform != platform) continue;
			return thisUser;
		}
		if (addIfNew) return this.Append(username, platform, true);
		return null;
	}

	static EnqueueUserDataRequest(user) { MultiPlatformUserCache.profileDataQueue.push(user); }

	static StepDataRequestQueue()
	{
		if (MultiPlatformUserCache.profileDataQueue.length < 1)
		{
			window.setTimeout(() => { MultiPlatformUserCache.StepDataRequestQueue(); }, 22);
			return;
		}

		MultiPlatformUserCache.profileDataQueue[0].WaitForData();
		MultiPlatformUserCache.profileDataQueue.splice(0, 1);

		window.setTimeout(() => { MultiPlatformUserCache.StepDataRequestQueue(); }, 22);
	}
}


// Window that allows the user to see data cached for use in reference to a specific viewer
export class MultiPlatformUserExplorer extends DraggableWindow
{
	static window_kind = 'hidden:ViewerCacheWindow';

	constructor(posX, posY)
	{
		super('Viewer Cache', posX, posY);
		this.window_kind = MultiPlatformUserExplorer.window_kind;

		this.e_window_root.style.minWidth = "300px";
		this.e_window_root.style.minHeight = "420px";

		this.selectedViewerIndex = -1;

		this.CreateContentContainer();
		this.SetIcon("assignment_ind");
		this.SetTitle('Viewer Cache');

		this.CreateTopBarButton("cyan", () => { this.RefreshData(); }, "Refresh", "autorenew");

		this.e_viewerListRoot = addElement("div", "viewer-list-root", this.e_content);
		this.e_viewerListCounter = addElement("div", "viewer-list-counter", this.e_content, 0);
		this.e_dataDownloadCounter = addElement("div", "viewer-list-counter", this.e_content, 0, x => x.style.top = '1.4rem');
		this.e_txt_viewerListFilter = addElement(
			"input", "viewer-list-filter", this.e_content, null,
			x =>
			{
				x.type = 'text';
				x.placeholder = 'Filter by name...';
			}
		);

		this.e_details = addElement("div", "viewer-details-root", this.e_content);
		this.e_details.style.transitionDuration = "0s";
		this.HideDetails();
		this.e_details.style.transitionDuration = "0.2s";
		this.e_details.addEventListener("click", e => { this.HideDetails(); });

		this.RefreshData();

		this.newUserSub = MultiPlatformUserCache.onNewUser.RequestSubscription(() => { this.RefreshData(); });
		this.newUserDataSub = MultiPlatformUser.onAnyDataCached.RequestSubscription(() => { this.RefreshData(); });
	}

	onWindowClose()
	{
		MultiPlatformUserCache.onNewUser.RemoveSubscription(this.newUserSub);
		MultiPlatformUser.onAnyDataCached.RemoveSubscription(this.newUserDataSub);
	}

	GetDataStr(bytes)
	{
		const inv8 = 1.0 / 8.0;
		const inv1024 = 1.0 / 1024;

		if (bytes > (1024 * 1024 * 1024)) return Math.ceil(bytes * (inv1024 * inv1024 * inv1024) * 8.0) * inv8 + 'gb';
		if (bytes > (1024 * 1024)) return Math.ceil(bytes * (inv1024 * inv1024) * 8.0) * inv8 + 'mb';
		if (bytes > 1024) return Math.ceil(bytes * inv1024 * 8.0) * inv8 + 'kb';
		return bytes + 'b';
	}

	RefreshData()
	{
		this.e_viewerListCounter.innerText = MultiPlatformUserCache.users.values.length + " cached";
		this.e_dataDownloadCounter.innerText = this.GetDataStr(RemoteDataUsage.bytesDownloaded);
		this.e_viewerListRoot.innerHTML = "";

		let searchString = this.e_txt_viewerListFilter.value.trim().toLowerCase();

		for (var viewerIndex in MultiPlatformUserCache.users.values)
		{
			const vid = MultiPlatformUserCache.users.values.length - viewerIndex - 1;
			const viewer = MultiPlatformUserCache.users.values[vid];

			let add_item = true;
			if (searchString !== '')
			{
				add_item = false;
				if (viewer.username.includes(searchString)) add_item = true;
				else if (viewer.displayName.includes(searchString)) add_item = true;
				else if (viewer.platformId.toString().includes(searchString)) add_item = true;
			}

			if (add_item)
			{
				var e_viewer = addElement("div", "viewer-list-item", this.e_viewerListRoot);
				e_viewer.innerHTML = `<span style='font-size:0.6rem; color:` + viewer.platformColor + `;'>${viewer.platform}</span>`;
				e_viewer.innerHTML += ` ${viewer.displayName}`;
				e_viewer.innerHTML += ` <span style='font-size:0.6rem; color:goldenrod;'>${viewer.dataMessage}</span>`;
				e_viewer.style.color = viewer.color;
				e_viewer.addEventListener("click", e => { this.SelectUser(vid); });
			}
		}
	}

	SelectUser(index)
	{
		this.selectedViewerIndex = index;

		if (this.selectedViewerIndex < 0) this.HideDetails();
		else
		{
			var viewer = MultiPlatformUserCache.users.values[this.selectedViewerIndex];
			this.e_details.innerHTML = "";

			var e_details_title = addElement("div", "viewer-detail-label", this.e_details, "Details");
			e_details_title.style.color = "#ffffff40";
			e_details_title.style.fontSize = "0.8rem";
			e_details_title.style.lineHeight = "1rem";
			e_details_title.style.height = "1rem";

			var e_name = addElement("div", "viewer-detail-label", this.e_details, viewer.username);
			e_name.innerHTML = `<span style='color:dimgray;font-size:0.8rem;'>${viewer.username}</span> : ${viewer.displayName}`;
			e_name.style.color = "white";

			var e_platform = addElement("div", "viewer-detail-label", this.e_details, viewer.platform + "." + viewer.platformId);
			e_platform.style.fontSize = "0.8rem";
			e_platform.style.color = viewer.platformColor;

			if (viewer.profileImageSource)
			{
				var e_img_wrap = addElement("div", "viewer-detail-label", this.e_details);
				e_img_wrap.style.objectFit = "contain";

				var e_img = addElement("img", "viewer-detail-pic", e_img_wrap);
				e_img.src = viewer.profileImageSource;
				e_img.style.position = "absolute";
				e_img.style.width = "80%";
				e_img.style.maxWidth = "30rem";
				e_img.style.left = "50%";
				e_img.style.aspectRatio = "1.0";
				e_img.style.height = "auto";
				e_img.style.transform = "translate(-50%, 0%) scale(90%)";
			}

			var e_img_url = addElement("div", "viewer-detail-label", this.e_details, viewer.profileImageSource);
			e_img_url.style.position = "absolute";
			e_img_url.style.height = "0.8rem";
			e_img_url.style.lineHeight = "0.8rem";
			e_img_url.style.left = "0px";
			e_img_url.style.right = "0px";
			e_img_url.style.bottom = "1rem";
			e_img_url.style.fontSize = "0.5rem";
			e_img_url.style.fontStyle = "italic";
			e_img_url.style.textWrap = "nowrap";
			e_img_url.style.overflow = "hidden";
			e_img_url.style.textOverflow = "ellipsis";
			e_img_url.style.letterSpacing = "0";
			e_img_url.style.color = "#ffffff50";

			this.ShowDetails();
		}
	}

	ShowDetails()
	{
		this.e_details.style.pointerEvents = "all";
		this.e_details.style.opacity = "1.0";
		this.e_viewerListRoot.style.filter = "blur(3px)";
	}

	HideDetails()
	{
		this.e_details.style.pointerEvents = "none";
		this.e_details.style.opacity = "0.0";
		this.e_viewerListRoot.style.filter = "none";
	}
}



WindowManager.instance.windowTypes.push(
	{
		key: MultiPlatformUserExplorer.window_kind,
		icon: "assignment_ind",
		desc: "Browse all the cached viewer data from this session including names, IDs, and profile images. This data is not saved.",
		model: (x, y) => { return new MultiPlatformUserExplorer(x, y); },
		shortcutKey: 'v'
	}
);




// called on module import
MultiPlatformUserCache.StartDataRequestQueueLoop();