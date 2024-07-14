import { StoredObject } from "./storedobject.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import "./storedobject.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { ItemStoreBase, ItemStoreWindowBase } from "./itemlibrary.js";

console.info("[ +Module ] Creatures");

export class Creature
{
	constructor(name, rarity, duration, description = "")
	{
		this.name = name;
		this.description = description;
		this.rarity = rarity;
		this.duration = duration;
		this.imageSrc = "";
		this.canAppear = true;
		this.pointValue = 15;
		this.pointValueMax = 15;
		this.usePointValueMax = false;
		this.evasionChance = 0.0;
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
		this.e_window_root.style.minHeight = "420px";
	}

	//override
	ApplyEditedProperties()
	{
		if (this.currentEditTargetIndex < 0) return;
		var targetItem = this.store.items[this.currentEditTargetIndex];
		targetItem.name = this.e_edit_field_name.value;
		targetItem.description = this.e_edit_field_desc.value;
		targetItem.rarity = this.e_edit_field_rarity.value;
		targetItem.duration = this.e_edit_field_duration.value;
		targetItem.imageSrc = this.e_edit_field_imageSrc.value;
		targetItem.canAppear = this.e_edit_tgl_canAppear.checked;
		targetItem.evasionChance = this.e_edit_field_evadeChance.value;
		targetItem.pointValue = this.e_edit_field_pointValue.value;
		this.store.MarkDirty();
	}

	//override
	PopulateEditOverlay()
	{
		let creature = this.currentEditTarget;

		this.AppendEditOverlayTitle("Editing " + creature.name);
		this.e_edit_field_name = this.AppendEditOverlayTextField("Name", creature.name ?? "Mysterious Creature", "Enter Creature Name");
		GlobalTooltip.RegisterReceiver(
			this.e_edit_field_name.parentElement,
			"Creature Name",
			"A name for this creature."
		);

		this.e_edit_field_desc = this.AppendEditOverlayTextArea("Description", creature.description ?? "", "Enter Creature Description");
		GlobalTooltip.RegisterReceiver(
			this.e_edit_field_desc.parentElement,
			"Creature Description",
			"A more detailed description of the creature, for fun."
		);

		const imgSrcDefault = "./../streamhub/images/nobody.png";
		this.e_edit_field_imageSrc = this.AppendEditOverlayTextField("Image Source", creature.imageSrc ?? imgSrcDefault, "Enter Creature Image Source");
		GlobalTooltip.RegisterReceiver(
			this.e_edit_field_imageSrc.parentElement,
			"Creature Image Source",
			"You can use a URL or any other valid HTML img src attribute value."
		);

		this.e_edit_field_rarity = this.AppendEditOverlayNumberField("Rarity", creature.rarity ?? 1.0, 0.01);
		GlobalTooltip.RegisterReceiver(
			this.e_edit_field_rarity.parentElement,
			"Appearance Rarity",
			"A number that represents how rare this creature is, relative to all other creatures."
		);

		this.e_edit_field_duration = this.AppendEditOverlayNumberField("Duration", creature.duration ?? 5, 1);
		GlobalTooltip.RegisterReceiver(
			this.e_edit_field_duration.parentElement,
			"Appearance Duration (seconds)",
			"The number of seconds this creature stays for during appearances."
		);

		this.e_edit_field_pointValue = this.AppendEditOverlayNumberField("SE Points", creature.pointValue ?? 0, 1);
		GlobalTooltip.RegisterReceiver(
			this.e_edit_field_pointValue.parentElement,
			"StreamElements Points",
			"The number of StreamElements Loyalty Points awarded for catching this creature."
		);

		this.e_edit_field_evadeChance = this.AppendEditOverlaySliderField("Evade Chance", creature.evasionChance ?? 0.0, 0.0, 1.0, 0.01);
		GlobalTooltip.RegisterReceiver(
			this.e_edit_field_evadeChance.parentElement,
			"Evasion Chance ( 0.0 - 1.0 )",
			"The chance this creature evades all attempts to be caught."
		);

		this.e_edit_tgl_canAppear = this.AppendEditOverlayToggle("Can Appear", creature.canAppear ?? true);
		GlobalTooltip.RegisterReceiver(
			this.e_edit_tgl_canAppear.parentElement,
			"Can Appear",
			"Can this creature appear at all?"
		);
	}

	//override
	ApplyListItemTooltip(e_btn, targetItem)
	{
		GlobalTooltip.RegisterReceiver(e_btn, "Edit " + targetItem.name, targetItem.description);
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: CreatureRosterWindow.window_kind,
		icon: "bug_report",
		desc: "Create, modify, or remove creatures from the Creature Roster!",
		model: (x, y) => { return new CreatureRosterWindow(x, y); },
		wip: true,
		shortcutKey: 'm'
	}
);