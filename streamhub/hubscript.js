import { GlobalSettings, OptionManager } from "./modules/globalsettings.js";
import { DebugWindow } from "./modules/debugwindow.js";
import { AboutWindow } from "./modules/aboutwindow.js";
import { WindowManager } from "./modules/windowmanager.js";
import "./modules/featureprogress.js";
import { BackgroundSceneSettingsWindow } from "./modules/backgroundscene.js";
import { StreamElements, StreamElementsWindow } from "./modules/streamelementslistener.js";
import { TwitchListener } from "./modules/twitchlistener.js";
import { KickState } from "./modules/kicklistener.js";
import { RaffleState } from "./modules/raffle.js";
import { SubathonWindow } from "./modules/subathon.js";
import { MultiPlatformUserExplorer } from "./modules/multiplatformuser.js";
import { ViewerInventoryManager } from "./modules/viewerinventory.js";
import { ItemLibrary } from "./modules/itemlibrary.js";
import { CreatureRoster } from "./modules/creatures.js";
import { EventSource } from "./modules/eventsource.js";
import { CreatureCatchingWindow } from "./modules/creaturecatch.js";
import { SaveIndicator } from "./modules/saveindicator.js";
import { OpenAIWindow } from "./modules/openaiwindow.js";
import "./modules/globaltooltip.js";
import { GlobalTooltip } from "./modules/globaltooltip.js";
import { UserInput } from "./modules/userinput.js";

export function RequestWindow(windowKind) { WindowManager.instance.GetNewOrExistingWindow(windowKind); }


window.hub_version = "v0.2.4";
window.last_update_date = "September 14 2024";

const resetStoredState = false;
var e_menu_windows = {};
var e_site_tag = {};
var e_save_indicator = {};
var sub_mouse_motion;

var e_doc_root = document.querySelector(':root');

console.info("[ +Module ] Hub Core");
OnBodyLoad();
//(() => { OnBodyLoad(); })(); // lol nice

function OnBodyLoad()
{
	FindBuiltInElements();
	SetWindowMenuOptions();
	RestoreLocalStorageContent();

	TwitchListener.CheckWindowLocationHashForAccessToken();
	KickState.instance.RefreshChannel();

	RestoreWindowState();
	//AddCssReloadButton();
	UpdateSiteTag();

	sub_mouse_motion = UserInput.afterMousePositionChanged.RequestSubscription(
		() =>
		{
			document.documentElement.style.setProperty('--mouse-x', UserInput.instance.mousePositionX + 'px');
			document.documentElement.style.setProperty('--mouse-y', UserInput.instance.mousePositionY + 'px');
			document.documentElement.style.setProperty('--mouse-x-neg', (document.documentElement.clientWidth - UserInput.instance.mousePositionX) + 'px');
			document.documentElement.style.setProperty('--mouse-y-neg', (document.documentElement.clientHeight - UserInput.instance.mousePositionY) + 'px');
		}
	);
}

var ts_time_prev = -1;
var global_time_seconds = 0.0;
function anim_time_loop(timestamp)
{
	if (ts_time_prev == -1) ts_time_prev = timestamp;
	if (ts_time_prev == timestamp) 
	{
		requestAnimationFrame(t => { anim_time_loop(t); });
		return;
	}
	var dtMs = timestamp - ts_time_prev;

	if (dtMs < 12) 
	{
		requestAnimationFrame(t => { anim_time_loop(t); });
		return;
	}

	var dtSeconds = dtMs * 0.001;
	ts_time_prev = timestamp;
	global_time_seconds += dtSeconds;

	document.documentElement.style.setProperty('--time', global_time_seconds + 's');
	document.documentElement.style.setProperty('--time-percent-1s', ((global_time_seconds % 1.0) * 100.0) + '%');
	document.documentElement.style.setProperty('--time-percent-10s', (((global_time_seconds * 0.1) % 1.0) * 100.0) + '%');
	document.documentElement.style.setProperty('--time-percent-offset-1s', (((global_time_seconds + 0.5) % 1.0) * 100.0) + '%');
	document.documentElement.style.setProperty('--time-percent-offset-10s', (((global_time_seconds * 0.1 + 0.5) % 1.0) * 100.0) + '%');
	document.documentElement.style.setProperty('--time-angle', (((global_time_seconds / 60.0) % 1.0) * 360.0) + 'deg');
	document.documentElement.style.setProperty('--time-angle-45s', (((global_time_seconds / 45.0) % 1.0) * 360.0) + 'deg');
	document.documentElement.style.setProperty('--time-angle-10s', (((global_time_seconds / 10.0) % 1.0) * 360.0) + 'deg');
	document.documentElement.style.setProperty('--time-angle-1s', (((global_time_seconds / 1.0) % 1.0) * 360.0) + 'deg');

	requestAnimationFrame(t => { anim_time_loop(t); });
}
requestAnimationFrame(t => { anim_time_loop(t); });

function FindBuiltInElements()
{
	var e_fader = document.getElementById("site-fader");
	document.body.appendChild(e_fader);
	window.setTimeout(() => { e_fader.style.opacity = "0%"; }, 250);

	e_menu_windows = document.getElementById("menu-windows");
	e_site_tag = document.getElementById("site-tag");
	e_site_tag.innerText = "sHub " + hub_version;
	document.title = "sHub";

	e_save_indicator = addElement("i", "save-indicator", document.body, "save");
	e_save_indicator.style.fontFamily = "'Material Icons'";
	SaveIndicator.SetElement(e_save_indicator);
}

function UpdateSiteTag()
{
	var username = OptionManager.GetOptionValue("twitch.bot.username");
	var usernameEmpty = username == "";
	e_site_tag.innerText = (usernameEmpty ? "" : (username + "  |  ")) + "sHub " + hub_version;

	document.title = "sHub " + (usernameEmpty ? "" : (" | " + username));
}

function RestoreLocalStorageContent()
{
	GlobalSettings.RestoreOrGetInitialState(true);

	if (GlobalSettings.instance.bool_resetAllData)
	{
		RaffleState.instance.TryStore();
		ItemLibrary.builtIn.Store();
		ViewerInventoryManager.instance.Store();
		CreatureRoster.instance.Store();
	}

	if (GlobalSettings.instance.bool_resetAllData || GlobalSettings.instance.bool_resetAllSettings)
	{
		GlobalSettings.instance = new GlobalSettings();
		GlobalSettings.instance.StoreState();
	}

	RaffleState.instance.TryRestore();
	ItemLibrary.builtIn.Restore();
	ViewerInventoryManager.instance.Restore();
	CreatureRoster.instance.Restore();
	GlobalSettings.RestoreOrGetInitialState();
}

function RestoreWindowState()
{
	WindowManager.instance.ClearAll();
	if (resetStoredState) WindowManager.instance.TryStoreState();
	WindowManager.instance.TryRestoreState();
}

function SetWindowMenuOptions()
{
	for (var wti = 0; wti < WindowManager.instance.windowTypes.length; wti++)
	{
		const wt = WindowManager.instance.windowTypes[wti];

		if (wt.shortcutKey)
		{
			window.addEventListener("keydown", e =>
			{
				if (e.key === wt.shortcutKey) 
				{
					if (document.activeElement !== document.body) return;
					var w = WindowManager.instance.GetExistingWindow(wt.key);
					if (w) w.Close();
					else WindowManager.instance.GetNewWindowAnywhere(wt.key);
				}
			});
		}

		if (wt.key.startsWith("hidden:")) continue;

		var e_btn_open = addElement("div", "menu-windows-button", null, "", x => { if (!wt.comingSoon) x.addEventListener("click", () => { RequestWindow(wt.key); }); });
		var e_lbl = addElement("div", "menu-windows-button-label", e_btn_open, wt.key);
		if (wt.comingSoon) 
		{
			var e_comingSoon = addElement("div", "menu-windows-button-band-coming-soon", e_btn_open, "COMING SOON");
			e_btn_open.className = "menu-windows-button menu-windows-button-disabled";
		}
		if (wt.wip) var e_wip = addElement("div", "menu-windows-button-band-wip", e_btn_open, "WIP");
		if (wt.icon) addElement("i", "menu-windows-button-icon", e_btn_open, wt.icon, x => { x.setAttribute("draggable", "false"); });

		if (wt.desc) 
		{
			let desc = "";
			if (wt.shortcutKey) desc += "[ Hotkey: " + wt.shortcutKey.toUpperCase() + " ] ";
			desc += wt.desc;
			if (wt.comingSoon) desc += " ( Coming Soon! )";
			if (wt.wip) desc += " ( Work-In-Progress! )";
			GlobalTooltip.RegisterReceiver(e_btn_open, desc, null);
		}

		e_menu_windows.appendChild(e_btn_open);
	}
}

export function addElement(kind = "div", className = null, parent = null, innerText = null, extra = x => { })
{
	var e = document.createElement(kind);
	if (className) e.className = className;
	if (innerText) e.innerText = innerText;
	if (parent) parent.appendChild(e);
	if (extra) extra(e);
	return e;
}

function AddCssReloadButton()
{
	var e_btn_reload_css = document.createElement("div");
	e_btn_reload_css.className = "debug-button";
	e_btn_reload_css.addEventListener("click", () => { ReloadCss(); });
	document.body.appendChild(e_btn_reload_css);
}

function ReloadCss()
{
	var all_links = document.getElementsByTagName("link");
	for (var li in all_links)
	{
		var l = all_links[li];
		if (l.rel != "stylesheet") continue;
		l.href += "";
	}
}
