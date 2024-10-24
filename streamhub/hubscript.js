import { OptionManager } from "./modules/globalsettings.js";
import { AboutWindow } from "./modules/aboutwindow.js";
import { GlobalSettings } from "./modules/globalsettings.js";
import { SaveIndicator } from "./modules/saveindicator.js";
import { DebugWindow } from "./modules/debugwindow.js";
import { WindowManager } from "./modules/windowmanager.js";
import "./modules/featureprogress.js";
import { BackgroundSceneSettingsWindow } from "./modules/backgroundscene.js";
import { TwitchListener } from "./modules/twitchlistener.js";
import { KickState } from "./modules/kicklistener.js";
import { RaffleState } from "./modules/raffle.js";
import "./modules/communityfeud.js";
import { SubathonWindow } from "./modules/subathon.js";
import { MultiPlatformUserExplorer } from "./modules/multiplatformuser.js";
import { ViewerInventoryManager } from "./modules/viewerinventory.js";
import { ItemLibrary } from "./modules/itemlibrary.js";
import { CreatureRoster } from "./modules/creatures.js";
import { CreatureCatchingWindow } from "./modules/creaturecatch.js";
import { EventSource } from "./modules/eventsource.js";
import { StreamElements, StreamElementsWindow } from "./modules/streamelementslistener.js";
import { OpenAIWindow } from "./modules/openaiwindow.js";
import "./modules/globaltooltip.js";
import { GlobalTooltip } from "./modules/globaltooltip.js";
import { UserInput } from "./modules/userinput.js";
import { LocalStorageBrowserWindow } from "./modules/localstoragebrowser.js";
import "./modules/rewardbrowser.js";
import "./modules/tablelistview.js";
import { AnimJob } from "./modules/AnimJob.js";
import { GLUtils } from "./modules/webglutils.js";

export function RequestWindow(windowKind) { WindowManager.instance.GetNewOrExistingWindow(windowKind); }


window.hub_version = "v0.3.1";
window.last_update_date = "October 23 2024";

window.targetFrameDeltaMs = 15;
window.targetFrameRate = 1000 / window.targetFrameDeltaMs;

const resetStoredState = false;
var e_menu_windows = {};
var e_site_tag = {};
var e_save_indicator = {};
var sub_mouse_motion;
var e_doc_root = document.querySelector(':root');

console.info("[ +Module ] Hub Core");

window.RefreshFPSCounterVisibility = () =>
{
	let show_fps = OptionManager.GetOptionValue(opt_key_show_fps);
	window.e_fps_stats_root.style.display = show_fps === true ? 'block' : 'none';
}

function OnBodyLoad()
{
	//extract browser standard font size
	var style = window.getComputedStyle(document.body, null).getPropertyValue('font-size');
	window.font_size_px = parseFloat(style) / 2; // body font-size is 2rem 

	FindBuiltInElements();
	SetWindowMenuOptions();
	RestoreLocalStorageContent();

	TwitchListener.CheckWindowLocationHashForAccessToken();
	KickState.instance.RefreshChannel();

	RestoreWindowState();
	UpdateSiteTag();

	window.mouse_position_x = 0;
	window.mouse_position_y = 0;
	window.mouse_position_x_opp = 0;
	window.mouse_position_y_opp = 0;

	sub_mouse_motion = UserInput.afterMousePositionChanged.RequestSubscription(
		() =>
		{
			window.mouse_position_x = UserInput.instance.mousePositionX;
			window.mouse_position_y = UserInput.instance.mousePositionY;
			window.mouse_position_x_opp = (document.documentElement.clientWidth - UserInput.instance.mousePositionX);
			window.mouse_position_y_opp = (document.documentElement.clientHeight - UserInput.instance.mousePositionY);
		}
	);

	let animjob_update_mouse_position = new AnimJob(
		window.targetFrameDeltaMs * 2,
		() =>
		{
			document.documentElement.style.setProperty('--mouse-x', window.mouse_position_x + 'px');
			document.documentElement.style.setProperty('--mouse-y', window.mouse_position_y + 'px');
			document.documentElement.style.setProperty('--mouse-x-neg', window.mouse_position_x_opp + 'px');
			document.documentElement.style.setProperty('--mouse-y-neg', window.mouse_position_y_opp + 'px');
		}
	);
	animjob_update_mouse_position.Start();

	CheckFirstTimeVisit();
	CreateFPSCounter();
	//AddCssReloadButton();
}

function CheckFirstTimeVisit()
{
	const key_hasVisited = 'not.new.visitor';
	//localStorage.setItem(key_hasVisited, 'false');
	var hasVisited = localStorage.getItem(key_hasVisited);
	if (hasVisited == null || hasVisited === 'false')
	{
		const e_new_visitor_popup = addElement('div', 'new-user-popup', document.body);
		e_new_visitor_popup.id = 'new-visitor-popup';

		var e_new_visitor_message = addElement('div', 'new-user-popup-lbl', e_new_visitor_popup);
		e_new_visitor_message.id = 'new-visitor-message';

		e_new_visitor_message.innerHTML =
			"<span style='font-size:1.5rem;'>Hey there!</span><br><br>"
			+ "Is this your first time here?<br><br>"
			+ "You can use the menu at the bottom left to start exploring!";

		var e_new_visitor_button = addElement('input', 'new-user-popup-btn', e_new_visitor_popup);
		e_new_visitor_button.id = 'new-visitor-button';
		e_new_visitor_button.type = 'button';
		e_new_visitor_button.title = 'Got it!';
		e_new_visitor_button.value = 'Got it!';
		e_new_visitor_button.addEventListener('click', () =>
		{
			console.log('closing popup'); e_new_visitor_popup.remove();
			localStorage.setItem(key_hasVisited, 'true');
		});
	}
}

var global_time_seconds = 0.0;
var last_dt = 0.0;
var last_dt_ms = 0;
var max_dt = -1.0;
var min_dt = 1.0;
var avg_dt = 0.02;

function animstep_timeloop(dt)
{
	global_time_seconds += dt;
	last_dt = dt;
	last_dt_ms = Math.ceil(dt * 1000);

	avg_dt += (dt - avg_dt) * 0.05;
	max_dt = Math.max(max_dt, dt);
	min_dt = Math.min(min_dt, dt);
	if (global_time_seconds % 5.0 < 0.02) 
	{
		max_dt = -1.0;
		min_dt = 1.0;
	}

	UpdateFPSCounter();

	document.documentElement.style.setProperty('--time', global_time_seconds + 's');
	document.documentElement.style.setProperty('--time-percent-1s', ((global_time_seconds % 1.0) * 100.0) + '%');
	document.documentElement.style.setProperty('--time-angle', (((global_time_seconds / 60.0) % 1.0) * 360.0) + 'deg');
	document.documentElement.style.setProperty('--time-percent-offset-1s', (((global_time_seconds + 0.5) % 1.0) * 100.0) + '%');

	return;
	document.documentElement.style.setProperty('--time-percent-10s', (((global_time_seconds * 0.1) % 1.0) * 100.0) + '%');
	document.documentElement.style.setProperty('--time-percent-offset-10s', (((global_time_seconds * 0.1 + 0.5) % 1.0) * 100.0) + '%');
	document.documentElement.style.setProperty('--time-angle-45s', (((global_time_seconds / 45.0) % 1.0) * 360.0) + 'deg');
	document.documentElement.style.setProperty('--time-angle-10s', (((global_time_seconds / 10.0) % 1.0) * 360.0) + 'deg');
	document.documentElement.style.setProperty('--time-angle-1s', (((global_time_seconds / 1.0) % 1.0) * 360.0) + 'deg');
}

function CreateFPSCounter()
{
	window.e_fps_stats_root = addElement(
		'div', null, document.body, null,
		x =>
		{
			x.style.zIndex = '1000000';
			x.style.opacity = '0.75';
			x.style.userSelect = 'none';
			x.style.pointerEvents = 'none';
			x.style.position = 'fixed';
			x.style.display = 'flex';
			x.style.flexDirection = 'column';
			x.style.top = '2rem';
			x.style.right = '2rem';
			x.style.width = '8rem';
			x.style.minHeight = '3rem';
			x.style.padding = '0';
			x.style.margin = '0';
		}
	);

	/*
	window.e_frametime_graph = addElement(
		'canvas', null, window.e_fps_stats_root, '---',
		x => 
		{
			x.style.position = 'relative';
			x.style.top = '0';
			x.style.left = '0';

			x.style.width = 'calc(100% - 4px)';
			x.style.height = '2rem';
			x.style.border = 'solid black 2px';
			x.style.backgroundColor = '#fffa';
			x.style.pointerEvents = 'none';
			x.style.fontWeight = 'bold';
			x.style.textAlign = 'right';
			x.style.borderRadius = '0.2rem';
		}
	);
	*/


	window.e_fps_counter = addElement(
		'div', null, window.e_fps_stats_root, '---',
		x => 
		{
			x.style.position = 'relative';
			x.style.top = '0';
			x.style.left = '0';

			x.style.minHeight = '1rem';
			x.style.lineHeight = '1rem';
			x.style.fontSize = '0.8rem';
			x.style.color = 'red';
			x.style.backgroundColor = '#000';
			x.style.pointerEvents = 'none';
			x.style.fontWeight = 'bold';
			x.style.textAlign = 'right';
			x.style.padding = '0.25rem';
			x.style.borderRadius = '0.2rem';
			x.style.border = 'solid black 2px';
		}
	);

	window.setTimeout(
		() =>
		{
			window.RefreshFPSCounterVisibility();
			//InitWebGL();
		}, 30
	); // wait until user settings are loading

}

function InitWebGL()
{
	let gfx =
	{
		gl: window.e_frametime_graph.getContext('webgl2')
	};
	window.gfx_ftgraph = gfx;

	if (!gfx.gl) 
	{
		console.warn('Missing WebGL support!');
		return;
	}

	let gfxw = gfx.gl.drawingBufferWidth;
	let gfxh = gfx.gl.drawingBufferHeight;

	// create a bound framebuffer with a bound texture2D
	let tuid_maintex = 0;
	gfx.textureBuffer = GLUtils.CreateFrameBufferTexture2D(gfx.gl, gfxw, gfxh, tuid_maintex);

	// create rendering program
	gfx.program = GLUtils.CreateProgram(gfx.gl, GLUtils.program_vs_core, GLUtils.program_fs_core, true);
	gfx.uloc_color = GLUtils.GetULocation(gfx.gl, gfx.program, 'color');
	gfx.uloc_maintex = GLUtils.GetULocation(gfx.gl, gfx.program, 'maintex');

	GLUtils.SetColorParam(gfx.gl, gfx.uloc_color, [Math.random(), Math.random(), Math.random(), 1]);
	GLUtils.SetTUForTextureParam(gfx.gl, gfx.uloc_maintex, tuid_maintex);

	gfx.vattr_position = GLUtils.SetVertexAttributeArray(gfx.gl, gfx.program, 2, gfx.gl.FLOAT, GLUtils.vertex_list_quad);

	// clear texture
	gfx.gl.bindFramebuffer(gfx.gl.FRAMEBUFFER, gfx.textureBuffer.framebuffer);
	GLUtils.ClearColor(gfx.gl, 0, 1, 0, 1);

	// clear canvas
	gfx.gl.bindFramebuffer(gfx.gl.FRAMEBUFFER, null);

	gfx.gl.bindVertexArray(gfx.vattr_position.vao);

	gfx.gl.disable(gfx.gl.CULL_FACE);
	gfx.gl.drawArrays(gfx.gl.TRIANGLES, 0, 6);
}

function UpdateFPSCounter()
{
	let avg_fps = Math.round(1.0 / avg_dt);
	let half_target_fps = window.targetFrameRate * 0.5;
	let fps_phase = Math.max(0.0, 1.0 - (Math.max(0, avg_fps - half_target_fps) / half_target_fps));

	if (window.e_fps_counter)
	{
		window.e_fps_counter.style.color = `rgb(${fps_phase * 255}, ${(1.0 - fps_phase) * 255}, 0)`;
		window.e_fps_counter.innerHTML = `${Math.round(1.0 / max_dt)} - ${Math.round(1.0 / min_dt)} ||  ${avg_fps} fps`;
		window.e_fps_counter.innerHTML += `<br>${Math.round(max_dt * 1000)} - ${Math.round(min_dt * 1000)} || ${Math.round(avg_dt * 1000)} ms`;
		window.e_fps_counter.innerHTML += `<br>target ${Math.round(window.targetFrameRate)} fps`;
	}
}



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
		localStorage.clear();
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
	WindowManager.instance.windowTypes.sort(WindowManager.CompareWindowTypesBySortOrder);
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
					let existing_window = WindowManager.instance.GetExistingWindow(wt.key);
					if (existing_window) existing_window.Close();
					else 
					{
						WindowManager.instance.GetNewWindowAnywhere(wt.key);
						//if (wt.icon_color) new_window.e_window_icon.style.color = wt.icon_color;
					}
				}
			});
		}

		if (wt.key.startsWith("hidden:")) continue;

		var e_btn_open = addElement("div", "menu-windows-button", null, "", x => { if (!wt.comingSoon) x.addEventListener("click", () => { RequestWindow(wt.key); }); });
		addElement("div", "menu-windows-button-label", e_btn_open, wt.key);
		if (wt.comingSoon) 
		{
			addElement("div", "menu-windows-button-band-large", e_btn_open, "COMING SOON");
			e_btn_open.className = "menu-windows-button menu-windows-button-disabled";
		}

		if (wt.wip) addElement("div", "menu-windows-button-band-small", e_btn_open, "WIP");

		if (wt.new)
		{
			addElement(
				"div", "menu-windows-button-band-small", e_btn_open, "NEW!",
				x =>
				{
					if (wt.wip) x.style.transform = 'translate(28%, -50%) rotateZ(38deg)';
					x.style.backgroundColor = '#160';
				}
			);
		}
		if (wt.icon) 
		{
			addElement("i", "menu-windows-button-icon", e_btn_open, wt.icon, x =>
			{
				x.setAttribute("draggable", "false");
				if (wt.icon_color) x.style.color = wt.icon_color;
			});
		}

		if (wt.desc) 
		{
			let desc = "";
			if (wt.shortcutKey) desc += "[ Hotkey: " + wt.shortcutKey.toUpperCase() + " ]<br>";
			desc += wt.desc;
			if (wt.comingSoon) desc += "<br>( Coming Soon! )";
			if (wt.wip) desc += "<br>( Work-In-Progress! )";
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

var opt_key_show_fps = 'hub.show.fps';
OptionManager.AppendOption(opt_key_show_fps, false, "Show FPS");






OnBodyLoad();
// (() => { OnBodyLoad(); })();

window.animjob_timeloop = new AnimJob(window.targetFrameDeltaMs - 1, dt => { animstep_timeloop(dt); });
window.animjob_timeloop.Start();