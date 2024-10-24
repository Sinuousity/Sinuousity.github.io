import { StoredObject } from "./storedobject.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import "./storedobject.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { ItemStoreWindowBase } from "./ItemStoreWindowBase.js";
import { ItemStoreBase } from "./ItemStoreBase.js";
import { Gobbledy } from "./gobbledy.js";
import { TableListView, TableListViewColumn } from "./tablelistview.js";

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

	static GetCount() { return CreatureRoster.instance.items.length; }
	static GetRaritySum()
	{
		var raritySum = 0;
		var creatureCount = CreatureRoster.GetCount();
		for (var cid = 0; cid < creatureCount; cid++)
		{
			var creature = CreatureRoster.instance.items[cid];
			if (creature.rarity) raritySum += 1.0 / Math.max(1.0, Number(creature.rarity));
			else raritySum += 1;
		}
		return raritySum;
	}

	static GetWeightedRandomIndex()
	{
		var raritySum = CreatureRoster.GetRaritySum();
		var creatureCount = CreatureRoster.GetCount();
		var selectRarity = Math.random() * raritySum;

		var rarityPrev = 0;
		for (var cid = 0; cid < creatureCount; cid++)
		{
			var creature = CreatureRoster.instance.items[cid];
			var minRarity = rarityPrev;
			var maxRarity = minRarity + 1.0 / Math.max(1.0, Number(creature.rarity));
			rarityPrev = maxRarity;

			if (minRarity <= selectRarity && maxRarity >= selectRarity)
			{
				return cid;
			}
		}

		console.warn("it happened");
		return -1; // shouldn't happen
	}
}

export class CreatureRosterWindow extends ItemStoreWindowBase
{
	static window_kind = "Creature Roster";

	CompareByID = (a, b) => b.id - a.id;
	CompareByName = (a, b) => b.name.localeCompare(a.name);
	OrCompareByID = (c, a, b) => c === 0 ? b.id - a.id : c;
	OrCompareByName = (c, a, b) => c === 0 ? b.name.localeCompare(a.name) : c;
	CompareByValue = (a, b) => this.OrCompareByID(this.OrCompareByName(b.se_points - a.se_points, a, b), a, b);
	CompareByRarity = (a, b) => this.OrCompareByID(this.OrCompareByName(b.rarity - a.rarity, a, b), a, b);
	CompareByEvadeChance = (a, b) => this.OrCompareByID(this.OrCompareByName(b.evasion_chance - a.evasion_chance, a, b), a, b);
	CompareByDesc = (a, b) => this.OrCompareByID(this.OrCompareByName((b.description ?? '').localeCompare(a.description ?? ''), a, b), a, b);
	CompareByCanAppear = (a, b) => this.OrCompareByID(this.OrCompareByName(b.can_appear.toString().localeCompare(a.can_appear.toString()), a, b), a, b);

	constructor(pos_x, pos_y)
	{
		super(CreatureRosterWindow.window_kind, "pets", pos_x, pos_y, CreatureRoster.instance);
		var help = "A list of creatures you have added.";
		help += " Creatures have a name, description, rarity, and appearance duration.";
		help += " Each creature can also be excluded from random appearances.";
		this.SetWindowHelpText(help);
		this.e_window_root.style.minHeight = "420px";

		this.defaultListPath = './files/default_creature_library_items.json';
		this.readonlyItemFields = ['category'];

		this.PrepareItemStoreWindowContent();
	}

	/*
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
	*/

	//override
	ApplyListItemTooltip(e_btn, targetItem)
	{
		GlobalTooltip.RegisterReceiver(e_btn, "Edit " + targetItem.name, targetItem.description);
	}

	//override
	GetNewBlankItem()
	{
		return {
			name: 'BLANK CREATURE',
			description: '',
			evasion_chance: 0.0,
			can_appear: false,
			image_source: '',
			duration: 15,
			se_points: 5,
			rarity: 0,
			category: 'creature'
		};
	}

	//override
	GetNewRandomizedItem()
	{
		return {
			name: Gobbledy.GetPhrase(),
			description: Gobbledy.GetSentence(),
			evasion_chance: Math.random() * 0.5,
			can_appear: false,
			image_source: '',
			duration: Math.ceil(Math.random() * 35 + 10),
			se_points: Math.ceil(Math.random() * 15 + 5),
			rarity: Math.round(Math.random() * 1000.0),
			category: 'creature'
		};
	}

	RegisterTableViewColumns()
	{
		let col_name = this.table.RegisterColumn('name', "Name", this.CompareByName);
		col_name.tooltipMethod = entry => 
		{
			let name_str = entry.name ? entry.name : 'this item might be broken';
			if (entry.description)
			{
				return `${name_str}<br><span style='color:orange'>${entry.description}</span>`;
			}
			return name_str;
		};
		col_name.default_descending = true;
		col_name.width = '9rem';

		let col_value = this.table.RegisterColumn('se_points', "Points", this.CompareByValue);
		col_value.textAlign = 'right';
		col_value.fixedWidth = true;
		col_value.width = '6rem';

		let col_rarity = this.table.RegisterColumn('rarity', "Rarity", this.CompareByRarity);
		col_rarity.textAlign = 'right';
		col_rarity.fixedWidth = true;
		col_rarity.width = '6rem';

		let col_evasion_chance = this.table.RegisterColumn('evasion_chance', "Evade %", this.CompareByEvadeChance, null, TableListViewColumn.percentageContentProvider);
		col_evasion_chance.textAlign = 'right';
		col_evasion_chance.fixedWidth = true;
		col_evasion_chance.width = '6rem';

		let col_can_appear = this.table.RegisterColumn('can_appear', "Can Appear", this.CompareByCanAppear, null, TableListViewColumn.booleanContentProvider);
		col_can_appear.textAlign = 'center';
		col_can_appear.fixedWidth = true;
		col_can_appear.width = '6rem';
	}

	RegisterTableViewQuickFilters()
	{
		this.table.RegisterQuickFilter('visibility', entry => entry.can_appear == true, 'lightgreen', 'CAN Appear');
		this.table.RegisterQuickFilter('visibility_off', entry => entry.can_appear != true, 'crimson', 'CANNOT Appear');
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: CreatureRosterWindow.window_kind,
		icon: "pets",
		icon_color: 'cyan',
		desc: "Create, modify, or remove creatures from the Creature Roster!",
		model: (x, y) => { return new CreatureRosterWindow(x, y); },
		sort_order: 0,
		shortcutKey: 'm'
	}
);