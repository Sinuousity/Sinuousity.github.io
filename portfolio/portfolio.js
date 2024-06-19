
import { OptionsManager } from "./optionsmenu.js";
import { SaveIndicator } from "./saveindicator.js";

import "./options_appearance.js";
import { PhasedGallery } from "./gallery_phased.js";

export function SaveState()
{
	OptionsManager.SaveOptions();
}

export function LoadState()
{
	OptionsManager.LoadOptions();
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

var autosaveEnabled = false;
var optionSaveEventSub = {};
export function EnableAutoSave()
{
	if (autosaveEnabled) return;
	autosaveEnabled = true;
	optionSaveEventSub = OptionsManager.onSavedOptions.RequestSubscription(() => { SaveIndicator.AddShowTime(); });
}

export function DisableAutoSave()
{
	if (!autosaveEnabled) return;
	autosaveEnabled = false;
	OptionsManager.onSavedOptions.RemoveSubscription(optionSaveEventSub);
}





var initialized = false;
var e_save_indicator = {};
var optionChangeEventSub = {};
function InitializePortfolio()
{
	if (initialized) return;
	initialized = true;

	LoadState();
	window.addEventListener("keydown", e => { OnWindowKeyDown(e); });
	CreateSaveIndicator();
	EnableAutoSave();

	optionChangeEventSub = OptionsManager.onApplyOptions.RequestSubscription(() => { RefreshPageStyle(); });

	var gall = new PhasedGallery(7);
	gall.AppendRoot(document.body);
}

function OnWindowKeyDown(e)
{
	if (e.key === 's' && (e.ctrlKey || e.metaKey))
	{
		e.preventDefault();
		e.stopPropagation();
		OptionsManager.ForceSaveOptions();
		return;
	}
}

function CreateSaveIndicator()
{
	e_save_indicator = addElement("i", "save-indicator", document.body, "save");
	e_save_indicator.style.fontFamily = "'Material Icons'";
	SaveIndicator.SetElement(e_save_indicator);
}

function RefreshPageStyle()
{
	const fakeBlack = "#0a0a0aff";
	const trueBlack = "#000000ff";
	var root = document.getElementById(":root");
	if (!root) return;

	var useTrueBlack = OptionsManager.GetOptionValue("appearance.use-deep-black", false) === true;
	root.style.setProperty('--black', useTrueBlack ? trueBlack : fakeBlack);
}

InitializePortfolio();