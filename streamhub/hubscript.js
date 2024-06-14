import { GlobalSettings } from "./modules/globalsettings.js";
import { WindowManager } from "./modules/windowmanager.js";
import { TwitchListener } from "./modules/twitchlistener.js";
import { KickState } from "./modules/kicklistener.js";
import { ViewerInventoryManager } from "./modules/viewerinventory.js";
import { ItemLibrary } from "./modules/itemlibrary.js";
import { RaffleState } from "./modules/raffle.js";
import { CreatureRoster } from "./modules/creatures.js";
import { EventSource } from "./modules/eventsource.js";
import { CreatureCatchingWindow } from "./modules/creaturecatch.js";

export function RequestWindow(windowKind) { WindowManager.instance.GetNewOrExistingWindow(windowKind); }


const hub_version = "v0.2.0";
const resetStoredWindowState = false;
var e_background_log = {};
var e_menu_windows = {};
var e_site_tag = {};

console.info("Module Added: Hub Core");
OnBodyLoad();
//(() => { OnBodyLoad(); })(); // lol nice

function OnBodyLoad()
{
	FindBuiltInElements();
	SetLogProxies();
	SetWindowMenuOptions();
	RestoreLocalStorageContent();
	TwitchListener.CheckWindowLocationHashForAccessToken();
	RestoreWindowState();
	//AddCssReloadButton();
	UpdateSiteTag();
}

function FindBuiltInElements()
{
	e_background_log = document.getElementById("background-log");
	e_menu_windows = document.getElementById("menu-windows");
	e_site_tag = document.getElementById("site-tag");
	e_site_tag.innerText = "streamhub " + hub_version;
}

function UpdateSiteTag()
{
	var username = GlobalSettings.instance.text_twitchUsername;
	var usernameEmpty = username == "";
	e_site_tag.innerText = "streamhub " + hub_version + (usernameEmpty ? "" : (" | " + username));
}

function RestoreLocalStorageContent()
{
	RaffleState.instance.TryRestore();
	ItemLibrary.instance.Restore();
	ViewerInventoryManager.instance.Restore();
	CreatureRoster.instance.Restore();
	GlobalSettings.RestoreOrGetInitialState();
	KickState.instance.RefreshChannel();
}

function RestoreWindowState()
{
	WindowManager.instance.ClearAll();
	if (resetStoredWindowState) WindowManager.instance.TryStoreState();
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

function SetLogProxies()
{
	//console logging proxies for appending to in-html log
	console.warn = proxy(console, console.warn, "warn >> ");
	console.error = proxy(console, console.error, "error >> ");
}

function proxy(context, method, message)
{
	return function ()
	{
		var fullMessage = [message].concat(Array.prototype.slice.apply(arguments));
		if (e_background_log) e_background_log.innerHTML = fullMessage.join(' ') + "<br>" + e_background_log.innerHTML;
		method.apply(context, fullMessage);
	}
}
