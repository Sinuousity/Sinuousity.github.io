import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import { Notifications } from "./notifications.js";

console.info("Module Added: Global Settings");

const key_global_settings_store = "global_settings_store";

export class GlobalSettings
{
	static window_kind = "Settings";
	static instance = new GlobalSettings();
	static changeListeners = [];

	static RestoreOrGetInitialState()
	{
		GlobalSettings.instance = new GlobalSettings();
		var stored = localStorage.getItem(key_global_settings_store);
		if (!stored) 
		{
			console.log("global settings initialized");
			return GlobalSettings.instance;
		}
		var state = JSON.parse(stored);

		for (const prop in state) GlobalSettings.instance[prop] = state[prop];
		GlobalSettings.instance.ClearDirty();

		console.log("global settings restored");
		GlobalSettings.instance.ApplyState();
		return GlobalSettings.instance;
	}

	constructor()
	{
		this.modified = false;
		this.modifiedTimer = 0.0;
		this.delayedStoreIntervalId = -1;

		this.bool_listenToKick = true;
		this.text_kickChannel = "";

		this.text_seAccountId = "";
		this.text_seJwtToken = "";

		this.bool_listenToTwitch = true;
		this.text_twitchChannel = "";
		this.text_twitchUsername = "";
		this.text_twitchClientId = "";
		//this.text_twitchClientSecret = "";
		this.text_twitchAccessToken = "";

		this.bool_cornerGlowShow = true;
		this.text_cornerGlowColor = "#ffa600";
		this.num_cornerGlowPositionX = 0;
		this.num_cornerGlowPositionY = 100;
	}

	MarkDirty()
	{
		this.modifiedTimer = 0.5;
		if (this.modified) return;
		this.modified = true;
		this.delayedStoreIntervalId = window.setInterval(() => { this.step_DelayedStateStore(); }, 50);
	}

	ClearDirty()
	{
		this.modified = false;
		this.modifiedTimer = 0.0;
		if (this.delayedStoreIntervalId != -1) window.clearInterval(this.delayedStoreIntervalId);
		this.delayedStoreIntervalId = -1;
	}

	step_DelayedStateStore()
	{
		this.modifiedTimer -= 0.05;
		if (this.modifiedTimer <= 0.0)
		{
			this.ClearDirty();
			this.StoreState();
		}
	}

	StoreState()
	{
		localStorage.setItem(key_global_settings_store, JSON.stringify(this));
		Notifications.instance.Add("Settings Saved", "#00ff0030");
	}

	ApplyState()
	{
		var e_cornerGlow = document.getElementById("effect-corner-glow");
		if (!e_cornerGlow) return;
		e_cornerGlow.style.display = this.bool_cornerGlowShow ? "block" : "none";
		e_cornerGlow.style.transformOrigin = `${this.num_cornerGlowPositionX}% ${this.num_cornerGlowPositionY}%`;
		e_cornerGlow.style.background = this.GetCornerGlowGradient(this.num_cornerGlowPositionX, this.num_cornerGlowPositionY, this.text_cornerGlowColor);

		for (var ii = 0; ii < GlobalSettings.changeListeners.length; ii++)
		{
			var cl = GlobalSettings.changeListeners[ii];
			if (!cl) continue;
			if (!cl.onSettingsChange) continue;
			cl.onSettingsChange();
		}
	}

	GetCornerGlowGradient(posx, posy, col)
	{
		return `radial-gradient(circle at ${posx}% ${posy}%, ${col}90 0%, ${col}50 8%, ${col}00 20%)`;
	}
}

export class GlobalSettingsWindow extends DraggableWindow
{
	constructor(position_x, position_y)
	{
		super("Settings", position_x, position_y);
		super.window_kind = GlobalSettings.window_kind;

		this.e_window_root.style.minHeight = "460px";
		this.e_window_root.style.minWidth = "320px";
		this.e_window_root.style.maxWidth = "640px";

		this.SetIcon("settings");
		this.SetTitle("Settings");

		this.CreateContentContainer();
		this.CreateControlsColumn();

		this.AddAuthSection();
		this.AddChatSection();
		this.AddCornerGlowControls();

		/*
		this.e_filedrop = this.CreateDropZone(
			e =>
			{
				var droppedFiles = e.dataTransfer.files;
				for (var ii = 0; ii < droppedFiles.length; ii++)
				{
					var f = droppedFiles[ii];
					console.warn(f.name);
				}
			}
		);
		this.e_filedrop.style.width = "100%";
		this.e_filedrop.style.height = "5rem";
		this.e_filedrop.style.bottom = "0";
		*/
	}

	AddCornerGlowControls()
	{
		this.AddSectionTitle("Corner Glow");
		this.AddToggle("Visible", GlobalSettings.instance.bool_cornerGlowShow, (e) => { GlobalSettings.instance.bool_cornerGlowShow = e.checked; });
		this.AddSlider("Position X", GlobalSettings.instance.num_cornerGlowPositionX, 0, 100, (e) => { GlobalSettings.instance.num_cornerGlowPositionX = e.value; });
		this.AddSlider("Position Y", GlobalSettings.instance.num_cornerGlowPositionY, 0, 100, (e) => { GlobalSettings.instance.num_cornerGlowPositionY = e.value; });
		this.AddColorPicker("Color", GlobalSettings.instance.text_cornerGlowColor, (e) => { GlobalSettings.instance.text_cornerGlowColor = e.value; });
	}

	AddChatSection()
	{

		this.AddSectionTitle("Twitch");
		var e_tgl_twitch = this.AddToggle("Listen To Twitch", GlobalSettings.instance.bool_listenToTwitch, (e) => { GlobalSettings.instance.bool_listenToTwitch = e.checked; });
		e_tgl_twitch.title = "Whether or not the bot ignores messages coming from Twitch";

		var txt_channel = this.AddTextField("Twitch Channel", GlobalSettings.instance.text_twitchChannel, (e) => { GlobalSettings.instance.text_twitchChannel = e.value; });
		txt_channel.style.height = "2rem";
		txt_channel.style.lineHeight = "2rem";

		this.AddSectionTitle("Kick");
		var e_tgl_kick = this.AddToggle("Listen To Kick", GlobalSettings.instance.bool_listenToKick, (e) => { GlobalSettings.instance.bool_listenToKick = e.checked; });
		e_tgl_kick.title = "Whether or not the bot ignores messages coming from Kick";

		var txt_channel_kick = this.AddTextField("Kick Channel", GlobalSettings.instance.text_kickChannel, (e) => { GlobalSettings.instance.text_kickChannel = e.value; });
		txt_channel_kick.style.height = "2rem";
		txt_channel_kick.style.lineHeight = "2rem";
	}

	AddAuthSection()
	{
		this.AddSectionTitle("Authentication");
		var e_cntrl_creds = this.AddButton("Credentials", "Edit", (e) => { WindowManager.instance.GetNewOrExistingWindow("hidden:settings-credentials") }, false);
		e_cntrl_creds.style.height = "2rem";
		e_cntrl_creds.style.lineHeight = "2rem";
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: GlobalSettings.window_kind,
		icon: "settings",
		model: (x, y) => { return new GlobalSettingsWindow(x, y); }
	}
);