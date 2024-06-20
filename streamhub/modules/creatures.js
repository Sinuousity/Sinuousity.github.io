import { StoredObject } from "./storedobject.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import "./storedobject.js";

console.info("[ +Module ] Creatures");

export class Creature
{
	constructor(name, rarity, duration)
	{
		this.name = name;
		this.rarity = rarity;
		this.duration = duration;
	}
}

export class CreatureRoster extends StoredObject
{
	static instance = new CreatureRoster();

	constructor()
	{
		super(0.369, false);
		this.storeKey = "data_creature_roster";
		this.creatures = [];
	}

	AddNew(name, rarity, duration)
	{
		this.creatures.push(new Creature(name, rarity, duration));
		this.MarkDirty();
	}

	Remove(id)
	{
		if (id > -1)
		{
			this.creatures.splice(id, 1);
			this.MarkDirty();
		}
	}

	MarkDirty()
	{
		this.ExtendTimer();
	}

	GetState()
	{
		return { creatures: this.creatures };
	}

	ApplyState(x)
	{
		this.creatures = x.creatures;
	}
}

export class CreatureRosterWindow extends DraggableWindow
{
	static window_kind = "Creature Roster";

	constructor(pos_x, pos_y)
	{
		super("Creature Roster", pos_x, pos_y);
		this.SetTitle("Creature Roster");
		this.SetIcon("bug_report");
		this.window_kind = CreatureRosterWindow.window_kind;
		this.e_window_root.style.minHeight = "360px";

		this.e_creatures = [];
		this.e_edit_overlay = {};
		this.currentEditTargetIndex = -1;
		this.currentEditTarget = {};

		this.CreateContentContainer();
		this.e_content.overflowY = "hidden";
		this.e_content.style.display = "flex";
		this.e_content.style.flexDirection = "column";

		this.CreateMenu();

		this.RefreshCreatureList();
	}

	CreateMenu()
	{
		this.e_root = document.createElement("div");
		this.e_root.className = "creature-menu-root"
		this.e_content.appendChild(this.e_root);

		this.e_btn_add = document.createElement("div");
		this.e_btn_add.className = "window-content-button"
		this.e_btn_add.style.backgroundColor = "#00ff0030";
		this.e_btn_add.style.color = "#00ff00";
		this.e_btn_add.innerText = "ADD NEW";
		this.e_btn_add.addEventListener("click", () => { CreatureRoster.instance.AddNew("Mysterious Creature", 0.1, 15.0); this.RefreshCreatureList(); });

		var e_plus = document.createElement("span");
		e_plus.innerText = "+";
		this.e_btn_add.appendChild(e_plus);

		this.e_root.appendChild(this.e_btn_add);
	}

	ClearCreatureListElements()
	{
		if (this.e_creatures.length < 1) return;
		for (var ii = 0; ii < this.e_creatures.length; ii++)
		{
			this.e_creatures[ii].remove();
		}
		this.e_creatures.length = [];
	}

	RefreshCreatureList()
	{
		this.ClearCreatureListElements();

		for (var ii = 0; ii < CreatureRoster.instance.creatures.length; ii++)
		{
			const thisCreatureIndex = ii;
			const creature = CreatureRoster.instance.creatures[thisCreatureIndex];

			const e_btn = document.createElement("div");
			e_btn.className = "window-content-button"
			e_btn.innerText = (thisCreatureIndex + 1) + ") " + creature.name;
			e_btn.addEventListener("click", () => { this.StartEditing(thisCreatureIndex); });

			const e_spn = document.createElement("span");
			e_spn.innerText = "➜";
			e_btn.appendChild(e_spn);

			this.e_root.insertBefore(e_btn, this.e_btn_add);
			this.e_creatures.push(e_btn);
		}
	}

	StartEditing(creatureIndex)
	{
		if (this.currentEditTargetIndex > -1) return;
		this.currentEditTargetIndex = creatureIndex;
		this.currentEditTarget = {};
		if (creatureIndex < 0) return;
		this.currentEditTarget = CreatureRoster.instance.creatures[this.currentEditTargetIndex];
		this.CreateEditOverlay();
	}

	StopEditing(saveChanges = true)
	{
		if (this.currentEditTargetIndex < 0) return;
		if (saveChanges) this.ApplyEditedProperties();
		this.currentEditTargetIndex = -1;
		this.currentEditTarget = {};
		this.RemoveEditOverlay();
		this.RefreshCreatureList();
	}

	ApplyEditedProperties()
	{
		if (this.currentEditTargetIndex < 0) return;
		CreatureRoster.instance.creatures[this.currentEditTargetIndex].name = this.e_edit_field_name.value;
		CreatureRoster.instance.creatures[this.currentEditTargetIndex].rarity = this.e_edit_field_rarity.value;
		CreatureRoster.instance.creatures[this.currentEditTargetIndex].duration = this.e_edit_field_duration.value;
		CreatureRoster.instance.MarkDirty();
	}

	AppendEditOverlayLabel(labelText, fontSize = "0.8rem", labelHeight = "1.4rem")
	{
		var e_lbl = document.createElement("div");
		e_lbl.innerText = labelText;
		e_lbl.style.fontSize = fontSize;
		e_lbl.style.height = labelHeight;
		e_lbl.style.lineHeight = labelHeight;
		this.e_edit_overlay.appendChild(e_lbl);
		return e_lbl;
	}

	CreateEditOverlay()
	{
		const deleteTargetIndex = this.currentEditTargetIndex;

		this.e_edit_overlay = document.createElement("div");
		this.e_edit_overlay.className = "creature-edit-root";

		var e_pageTitle = this.AppendEditOverlayLabel("Editing " + this.currentEditTarget.name);
		e_pageTitle.style.textAlign = "center";
		e_pageTitle.style.height = "1rem";
		e_pageTitle.style.lineHeight = "1rem";
		e_pageTitle.style.fontSize = "0.9rem";
		e_pageTitle.style.color = "white";
		this.AppendEditOverlayLabel("Name");
		this.e_edit_field_name = document.createElement("input");
		this.e_edit_field_name.type = "text";
		this.e_edit_field_name.value = this.currentEditTarget.name;
		this.e_edit_field_name.placeholder = "Enter Creature Name";
		this.e_edit_overlay.appendChild(this.e_edit_field_name);

		this.AppendEditOverlayLabel("Appearance Rarity");
		this.e_edit_field_rarity = document.createElement("input");
		this.e_edit_field_rarity.type = "number";
		this.e_edit_field_rarity.step = "0.1";
		this.e_edit_field_rarity.value = this.currentEditTarget.rarity;
		this.e_edit_overlay.appendChild(this.e_edit_field_rarity);

		this.AppendEditOverlayLabel("Appearance Duration (seconds)");
		this.e_edit_field_duration = document.createElement("input");
		this.e_edit_field_duration.type = "number";
		this.e_edit_field_duration.step = "0.1";
		this.e_edit_field_duration.value = this.currentEditTarget.duration;
		this.e_edit_overlay.appendChild(this.e_edit_field_duration);

		var e_spacer = document.createElement("span");
		this.e_edit_overlay.appendChild(e_spacer);

		var e_btn_delete = document.createElement("div");
		e_btn_delete.className = "window-content-button"
		e_btn_delete.innerText = "Delete Creature";
		e_btn_delete.style.backgroundColor = "#ff000020";
		e_btn_delete.style.color = "#ff0000";
		e_btn_delete.style.flexGrow = "0.0";
		e_btn_delete.style.borderRadius = "0.4rem 0.4rem 0rem 0rem";
		e_btn_delete.style.width = "8rem";
		e_btn_delete.style.lineHeight = "1.5rem";
		e_btn_delete.style.height = "1.5rem";
		e_btn_delete.style.fontSize = "0.8rem";
		e_btn_delete.addEventListener("click", () =>
		{
			this.StopEditing();
			CreatureRoster.instance.Remove(deleteTargetIndex);
			this.RefreshCreatureList();
		});
		var e_spn = document.createElement("span");
		e_spn.innerText = "🗑";
		e_btn_delete.appendChild(e_spn);
		this.e_edit_overlay.appendChild(e_btn_delete);

		var e_btn_cancel = document.createElement("div");
		e_btn_cancel.className = "window-content-button"
		e_btn_cancel.innerText = "Discard Changes";
		e_btn_cancel.style.lineHeight = "2rem";
		e_btn_cancel.style.height = "2rem";
		e_btn_cancel.style.fontSize = "0.8rem";
		e_btn_cancel.style.borderRadius = "0rem 0.4rem 0rem 0rem";
		e_btn_cancel.style.backgroundColor = "#ffcc0020";
		e_btn_cancel.style.color = "#ffcc00";
		e_btn_cancel.addEventListener("click", () => { this.StopEditing(false); });
		var e_spn = document.createElement("span");
		e_spn.innerText = "✖";
		e_btn_cancel.appendChild(e_spn);
		this.e_edit_overlay.appendChild(e_btn_cancel);

		var e_btn_done = document.createElement("div");
		e_btn_done.className = "window-content-button"
		e_btn_done.innerText = "Save Changes";
		e_btn_done.style.lineHeight = "3rem";
		e_btn_done.style.height = "3rem";
		e_btn_done.style.fontSize = "1.2rem";
		e_btn_done.style.borderRadius = "0rem 0rem 0.4rem 0.4rem";
		e_btn_done.style.backgroundColor = "#00ff0020";
		e_btn_done.style.color = "#00ff00";
		e_btn_done.addEventListener("click", () => { this.StopEditing(); });
		var e_spn = document.createElement("span");
		e_spn.innerText = "✓";
		e_btn_done.appendChild(e_spn);
		this.e_edit_overlay.appendChild(e_btn_done);

		this.e_root.overflowY = "hidden";
		this.e_root.style.filter = "blur(4px)";
		this.e_content.appendChild(this.e_edit_overlay);
	}

	RemoveEditOverlay()
	{
		this.e_edit_overlay.remove();
		this.e_edit_overlay = null;
		this.e_root.style.filter = "none";
		this.e_root.overflowY = "auto";
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: CreatureRosterWindow.window_kind,
		icon: "bug_report",
		model: (x, y) => { return new CreatureRosterWindow(x, y); },
		comingSoon: true
	}
);