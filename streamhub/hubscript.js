import { GlobalSettings } from "./modules/globalsettings.js";
import { WindowManager } from "./modules/windowmanager.js";
import { TwitchListener } from "./modules/twitchlistener.js";
import { KickState } from "./modules/kicklistener.js";
import { ViewerInventoryManager } from "./modules/viewerinventory.js";
import { ItemLibrary } from "./modules/itemlibrary.js";
import { RaffleState } from "./modules/raffle.js";
import { CreatureRoster } from "./modules/creatures.js";
import { CreatureCatchingWindow } from "./modules/creaturecatch.js";

const resetStoredWindowState = false;
var e_background_log = {};
var e_menu_windows = {};

OnBodyLoad();

function proxy(context, method, message)
{
	return function ()
	{
		var fullMessage = [message].concat(Array.prototype.slice.apply(arguments));
		if (e_background_log) e_background_log.innerHTML = fullMessage.join(' ') + "<br>" + e_background_log.innerHTML;
		method.apply(context, fullMessage);
	}
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

function OnBodyLoad()
{
	e_background_log = document.getElementById("background-log");
	e_menu_windows = document.getElementById("menu-windows");
	for (var wti = 0; wti < WindowManager.instance.windowTypes.length; wti++)
	{
		const wt = WindowManager.instance.windowTypes[wti];
		if (wt.key.startsWith("hidden:")) continue;

		var e_btn_open = document.createElement("div");
		e_btn_open.className = "menu-windows-button";
		e_btn_open.innerText = "";
		e_btn_open.addEventListener("click", () => { RequestWindow(wt.key); });

		var e_lbl_open = document.createElement("div");
		e_lbl_open.innerText = wt.key;
		e_btn_open.appendChild(e_lbl_open);

		if (wt.icon)
		{
			var e_icon = document.createElement("i");
			e_icon.className = "menu-windows-button-icon";
			e_icon.innerText = wt.icon;
			e_icon.setAttribute("draggable", "false");
			e_btn_open.appendChild(e_icon);
		}

		e_menu_windows.appendChild(e_btn_open);
	}

	//console logging proxies for appending to in-html log
	console.warn = proxy(console, console.warn, "warn >> ");
	console.error = proxy(console, console.error, "error >> ");

	RaffleState.instance.TryRestore();
	ItemLibrary.instance.Restore();
	ViewerInventoryManager.instance.Restore();
	CreatureRoster.instance.Restore();
	GlobalSettings.RestoreOrGetInitialState();
	KickState.instance.RefreshChannel();

	TwitchListener.instance.CheckWindowLocationHashForAccessToken();

	WindowManager.instance.ClearAll();
	if (resetStoredWindowState) WindowManager.instance.TryStoreState();
	WindowManager.instance.TryRestoreState();

	/*
	var e_btn_reload_css = document.createElement("div");
	e_btn_reload_css.className = "debug-button";
	e_btn_reload_css.addEventListener("click", () => { ReloadCss(); });
	document.body.appendChild(e_btn_reload_css);
	*/
}

export function RequestWindow(windowKind)
{
	WindowManager.instance.GetNewOrExistingWindow(windowKind);
}