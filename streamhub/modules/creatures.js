import { StoredObject } from "./storedobject.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import "./storedobject.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { ItemStoreBase, ItemStoreWindowBase } from "./itemlibrary.js";

console.info("[ +Module ] Creatures");

export class Creature
{
	constructor(name, rarity, duration, desc = "")
	{
		this.name = name;
		this.desc = desc;
		this.rarity = rarity;
		this.duration = duration;
		this.imageSrc = "";
		this.canAppear = true;
	}

	static GetDefault()
	{
		return new Creature("Unknown Creature", 1.0, 30.0, "Unknown");
	}
}

export class CreatureRoster extends ItemStoreBase
{
	static instance = new CreatureRoster();
	constructor() { super("data_creature_roster"); }
}

export class CreatureRosterWindow extends ItemStoreWindowBase
{
	static window_kind = "Creature Roster";

	constructor(pos_x, pos_y)
	{
		super(CreatureRosterWindow.window_kind, "bug_report", pos_x, pos_y, CreatureRoster.instance);
		var help = "A list of creatures you have added.";
		help += " Creatures have a name, description, rarity, and appearance duration.";
		help += " Each creature can also be excluded from random appearances.";
		this.SetWindowHelpText(help);
	}

	ApplyEditedProperties()
	{
		if (this.currentEditTargetIndex < 0) return;
		this.store.items[this.currentEditTargetIndex].name = this.e_edit_field_name.value;
		this.store.items[this.currentEditTargetIndex].desc = this.e_edit_field_desc.value;
		this.store.items[this.currentEditTargetIndex].rarity = this.e_edit_field_rarity.value;
		this.store.items[this.currentEditTargetIndex].duration = this.e_edit_field_duration.value;
		this.store.items[this.currentEditTargetIndex].imageSrc = this.e_edit_field_imageSrc.value;
		this.store.items[this.currentEditTargetIndex].canAppear = this.e_edit_tgl_canAppear.checked;
		this.store.MarkDirty();
	}

	PopulateEditOverlay()
	{
		this.AppendEditOverlayTitle("Editing " + this.currentEditTarget.name);
		this.e_edit_field_name = this.AppendEditOverlayTextField("Name", this.currentEditTarget.name ?? "Mysterious Creature", "Enter Creature Name");
		GlobalTooltip.RegisterReceiver(this.e_edit_field_name.parentElement, "Creature Name", "A name for this creature.");

		this.e_edit_tgl_canAppear = this.AppendEditOverlayToggle("Can Appear", this.currentEditTarget.canAppear);
		GlobalTooltip.RegisterReceiver(this.e_edit_tgl_canAppear.parentElement, "Can Appear", "Can this creature appear at all?");

		this.e_edit_field_rarity = this.AppendEditOverlayNumberField("Rarity", this.currentEditTarget.rarity ?? 1.0, 0.01);
		GlobalTooltip.RegisterReceiver(this.e_edit_field_rarity.parentElement, "Appearance Rarity", "A number that represents how rare this creature is, relative to all other creatures.");

		this.e_edit_field_duration = this.AppendEditOverlayNumberField("Duration", this.currentEditTarget.duration ?? 5, 1);
		GlobalTooltip.RegisterReceiver(this.e_edit_field_duration.parentElement, "Appearance Duration (seconds)", "The number of seconds this creature stays for during appearances.");

		this.e_edit_field_desc = this.AppendEditOverlayTextArea("Description", this.currentEditTarget.description ?? "", "Enter Creature Description");
		GlobalTooltip.RegisterReceiver(this.e_edit_field_desc.parentElement, "Creature Description", "A more detailed description of the creature, for fun.");

		this.e_edit_field_imageSrc = this.AppendEditOverlayTextField("Image Source", this.currentEditTarget.imageSrc, "Enter Creature Image Source");
		GlobalTooltip.RegisterReceiver(this.e_edit_field_imageSrc.parentElement, "Creature Image Source", "You can use a URL or any other valid HTML img src attribute value.")
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: CreatureRosterWindow.window_kind,
		icon: "bug_report",
		model: (x, y) => { return new CreatureRosterWindow(x, y); },
		wip: true
	}
);