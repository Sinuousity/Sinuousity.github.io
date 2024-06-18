import { GlobalSettings, OptionManager } from "./modules/globalsettings.js";
import { DebugWindow } from "./modules/debugwindow.js";
import { WindowManager } from "./modules/windowmanager.js";
import { TwitchListener } from "./modules/twitchlistener.js";
import { KickState } from "./modules/kicklistener.js";
import { ViewerInventoryManager } from "./modules/viewerinventory.js";
import { ItemLibrary } from "./modules/itemlibrary.js";
import { RaffleState } from "./modules/raffle.js";
import { CreatureRoster } from "./modules/creatures.js";
import { EventSource } from "./modules/eventsource.js";
import { CreatureCatchingWindow } from "./modules/creaturecatch.js";
import { SaveIndicator } from "./modules/saveindicator.js";

export function RequestWindow(windowKind) { WindowManager.instance.GetNewOrExistingWindow(windowKind); }


const hub_version = "v0.2.0";
const resetStoredState = false;
var e_background_log = {};
var e_menu_windows = {};
var e_site_tag = {};
var e_save_indicator = {};

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
}

function FindBuiltInElements()
{
	e_background_log = document.getElementById("background-log");
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
		ItemLibrary.instance.Store();
		ViewerInventoryManager.instance.Store();
		CreatureRoster.instance.Store();
	}

	if (GlobalSettings.instance.bool_resetAllData || GlobalSettings.instance.bool_resetAllSettings)
	{
		GlobalSettings.instance = new GlobalSettings();
		GlobalSettings.instance.StoreState();
	}

	RaffleState.instance.TryRestore();
	ItemLibrary.instance.Restore();
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
		if (wt.key.startsWith("hidden:")) continue;

		var e_btn_open = addElement("div", "menu-windows-button", e_btn_open, "", x => { x.addEventListener("click", () => { RequestWindow(wt.key); }); });
		addElement("div", null, e_btn_open, wt.key);
		if (wt.icon) addElement("i", "menu-windows-button-icon", e_btn_open, wt.icon, x => { x.setAttribute("draggable", "false"); });

		e_menu_windows.appendChild(e_btn_open);
	}
}

function addElement(kind = "div", className = null, parent = null, innerText = null, extra = x => { })
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
