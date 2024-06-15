import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import { Notifications } from "./notifications.js";
import { EventSource } from "./eventsource.js";

console.info("[ +Module ] Global Settings");

const key_global_settings_store = "global_settings_store";

export class Option
{
	constructor(name, value, label)
	{
		this.name = name;
		this.label = label;
		this.value = value;
	}
}

export class OptionManager
{
	static instance = new OptionManager();

	static key_option_value_store = "store-option-values";

	static GetOptionIndex(name) { return OptionManager.instance.GetOptionIndex(name); }
	static GetOption(name)
	{
		var optionIndex = OptionManager.instance.GetOptionIndex(name);
		if (optionIndex < 0) return false;
		return OptionManager.instance.options[optionIndex];
	}
	static HasOption(name) { return OptionManager.instance.HasOption(name); }
	static AppendOption(name, defaultValue, label = "") { return OptionManager.instance.AppendOption(name, defaultValue, label); }
	static SetOptionValue(name, newValue, emitChangeEvent = () => { })
	{
		OptionManager.instance.SetOptionValue(name, newValue, emitChangeEvent);
		GlobalSettings.instance.MarkDirty();
	}
	static GetOptionValue(name, defaultValue = null) { return OptionManager.instance.GetOptionValue(name, defaultValue); }

	static Load() { OptionManager.DeserializeOptions(localStorage.getItem(OptionManager.key_option_value_store)); }
	static Save() { localStorage.setItem(OptionManager.key_option_value_store, OptionManager.SerializeOptions()); }

	static SerializeOptions() { return JSON.stringify(OptionManager.instance); }
	static DeserializeOptions(json)
	{
		if (typeof json == 'string' && json != "" && json != "{}")
		{
			var prevInstance = JSON.parse(json);
			console.log("restoring " + prevInstance.options.length + " option values");
			for (var optionId in prevInstance.options)
			{
				var prevOption = prevInstance.options[optionId];
				this.instance.SetOptionValue(prevOption.name, prevOption.value);
			}
		}
	}

	constructor() { this.options = []; }

	GetOptionIndex(name)
	{
		for (var optionId in this.options)
		{
			if (this.options[optionId].name != name) continue;
			return optionId;
		}
		return -1;
	}

	HasOption(name) { return this.GetOptionIndex(name) > -1; }

	AppendOption(name, defaultValue, label = "")
	{
		var existingOptionIndex = this.GetOptionIndex(name);
		if (existingOptionIndex > -1) return this.options[existingOptionIndex];


		var option = new Option(name, defaultValue, (label == "" ? name : label));
		this.options.push(option);
		return option;
	}

	SetOptionValue(name, newValue, emitChangeEvent = () => { })
	{
		var optionIndex = this.GetOptionIndex(name);
		if (optionIndex < 0) 
		{
			AppendOption(name, newValue, name);
		}
		else
		{
			this.options[optionIndex].value = newValue;
		}
		if (emitChangeEvent) emitChangeEvent({ data: this.options[optionIndex] });
	}

	GetOptionValue(name, defaultValue = null)
	{
		var optionIndex = this.GetOptionIndex(name);
		if (optionIndex < 0) return defaultValue;
		return this.options[optionIndex].value;
	}
}

export class GlobalSettings
{
	static window_kind = "Settings";
	static instance = new GlobalSettings();
	static changeListeners = [];

	static onSettingsChanged = new EventSource();

	static onTwitchListenToggled = new EventSource();
	static onTwitchChannelChanged = new EventSource();

	static onKickListenToggled = new EventSource();
	static onKickChannelChanged = new EventSource();

	static RestoreOrGetInitialState(initialLoad = false)
	{
		GlobalSettings.instance = new GlobalSettings();
		var stored = localStorage.getItem(key_global_settings_store);
		if (!stored) 
		{
			if (!initialLoad) console.log("global settings initialized");
			return GlobalSettings.instance;
		}
		var state = JSON.parse(stored);

		for (const prop in state) GlobalSettings.instance[prop] = state[prop];
		GlobalSettings.instance.ClearDirty();

		if (!initialLoad) console.log("global settings restored");

		if (!initialLoad) OptionManager.Load();

		GlobalSettings.instance.ApplyState();
		return GlobalSettings.instance;
	}

	constructor()
	{
		this.modified = false;
		this.modifiedTimer = 0.0;
		this.delayedStoreIntervalId = -1;

		this.bool_resetAllData = false;
		this.bool_resetAllSettings = false;

		this.text_seAccountId = "";
		this.text_seJwtToken = "";

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
		GlobalSettings.onSettingsChanged.Invoke();
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
		OptionManager.Save();
	}

	ApplyState()
	{
		var e_cornerGlow = document.getElementById("effect-corner-glow");
		if (!e_cornerGlow) return;
		e_cornerGlow.style.display = OptionManager.GetOptionValue("fx.glow.visible") ? "block" : "none";
		var glowPosX = OptionManager.GetOptionValue("fx.glow.position.x");
		var glowPosY = OptionManager.GetOptionValue("fx.glow.position.y");
		e_cornerGlow.style.transformOrigin = `${glowPosX}% ${glowPosY}%`;
		e_cornerGlow.style.background = this.GetCornerGlowGradient(glowPosX, glowPosY, OptionManager.GetOptionValue("fx.glow.color"));

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

		this.e_window_root.style.minHeight = "620px";
		this.e_window_root.style.minWidth = "320px";
		this.e_window_root.style.maxWidth = "640px";

		this.SetIcon("settings");
		this.SetTitle("Settings");

		this.CreateContentContainer();
		this.CreateControlsColumn();

		this.AddChatSection();
		this.AddCornerGlowControls();
		this.AddAuthSection();
		this.AddStoreResetControls();

		GlobalSettings.instance.ApplyState();
	}

	AddCornerGlowControls()
	{
		this.AddSectionTitle("Corner Glow");
		this.AddToggle("Visible", OptionManager.GetOptionValue("fx.glow.visible"), (e) => { OptionManager.SetOptionValue("fx.glow.visible", e.checked); });
		this.AddSlider("Position X", OptionManager.GetOptionValue("fx.glow.position.x"), 0, 100, (e) => { OptionManager.SetOptionValue("fx.glow.position.x", e.value); });
		this.AddSlider("Position Y", OptionManager.GetOptionValue("fx.glow.position.y"), 0, 100, (e) => { OptionManager.SetOptionValue("fx.glow.position.y", e.value); });
		this.AddColorPicker("Color", OptionManager.GetOptionValue("fx.glow.color"), (e) => { OptionManager.SetOptionValue("fx.glow.color", e.value); });
	}

	AddStoreResetControls()
	{
		this.AddSectionTitle("Settings Settings");
		this.AddToggle("Reset All Data", GlobalSettings.instance.bool_resetAllData,
			(e) =>
			{
				if (e.checked) console.warn("All Data Will Be Reset The Next Time This Page Is Loaded");
				else console.warn("All Data Will Be NOT Reset");
				GlobalSettings.instance.bool_resetAllData = e.checked;
			}
		);
		this.AddToggle("Reset All Settings", GlobalSettings.instance.bool_resetAllSettings,
			(e) =>
			{
				if (e.checked) console.warn("Settings & Credentials Will Be Reset The Next Time This Page Is Loaded");
				else console.warn("Settings & Credentials Will Be NOT Reset");
				GlobalSettings.instance.bool_resetAllSettings = e.checked;
			}
		);
	}

	AddChatSection()
	{
		this.AddSectionTitle("Twitch");
		this.AddOptionToggle("twitch.listen", "Whether or not the bot ignores messages coming from Twitch");
		this.AddOptionText("twitch.channel");

		this.AddSectionTitle("Kick");
		this.AddOptionToggle("kick.listen", "Whether or not the bot ignores messages coming from Kick");
		this.AddOptionText("kick.channel");
	}

	AddOptionToggle(optionName, hint = "")
	{
		const opt = OptionManager.GetOption(optionName);
		var e_tgl = this.AddToggle(
			opt.label,
			opt.value,
			(e) => { OptionManager.SetOptionValue(optionName, e.checked); }
		);
		e_tgl.title = hint;
		return e_tgl;
	}

	AddOptionText(optionName, hint = "")
	{
		const opt = OptionManager.GetOption(optionName);
		var e_txt = this.AddTextField(
			opt.label,
			opt.value,
			(e) => { OptionManager.SetOptionValue(optionName, e.checked); }
		);
		e_txt.style.height = "2rem";
		e_txt.style.lineHeight = "2rem";
		e_txt.title = hint;
		return e_txt;
	}

	AddAuthSection()
	{
		this.AddSectionTitle("Extra Settings");

		var e_cntrl_creds = this.AddButton("Credentials", "Show", (e) => { WindowManager.instance.GetNewOrExistingWindow("hidden:Credentials") }, false);
		e_cntrl_creds.style.height = "2rem";
		e_cntrl_creds.style.lineHeight = "2rem";

		var e_cntrl_creds = this.AddButton("Log Window", "Show", (e) => { WindowManager.instance.GetNewOrExistingWindow("hidden:Debug") }, false);
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

OptionManager.AppendOption("fx.glow.visible", true, "Visible");
OptionManager.AppendOption("fx.glow.position.x", 0.0, "Position X");
OptionManager.AppendOption("fx.glow.position.y", 0.0, "Position Y");
OptionManager.AppendOption("fx.glow.color", "#ffa600", "Color");