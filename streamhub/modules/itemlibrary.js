import { StoredObject } from "./storedobject.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import "./storedobject.js";
import { ViewerInventoryManager } from "./viewerinventory.js";
import { Notifications } from "./notifications.js";
import { SaveIndicator } from "./saveindicator.js";

console.info("[ +Module ] Item Library");

export class ItemLibrary extends StoredObject
{
	static instance = new ItemLibrary();

	constructor()
	{
		super(0.369, false);
		this.storeKey = "data_item_library";
		this.items = [];
	}

	AddNew(item)
	{
		this.items.push(item);
		this.MarkDirty();
	}

	Remove(id)
	{
		if (id > -1)
		{
			this.items.splice(id, 1);
			this.MarkDirty();
		}
	}

	IndexOf(name)
	{
		for (var ii = 0; ii < this.items.length; ii++)
		{
			if (this.items[ii].name == name) return ii;
		}
		return -1;
	}

	GetItem(id)
	{
		if (id < 0) return null;
		return this.items[id];
	}

	MarkDirty() { this.ExtendTimer(); }
	GetState() { return { items: this.items }; }
	ApplyState(x) { this.items = x.items; }
}

export class ItemGiverWindow extends DraggableWindow
{
	static window_kind = "Item Giver";
	constructor(pos_x, pos_y)
	{
		super("Item Giver", pos_x, pos_y);
		this.e_window_root.style.minHeight = "180px";
		this.e_window_root.style.maxHeight = "180px";
		this.e_window_root.style.minWidth = "420px";
		this.e_window_root.style.maxWidth = "420px";
		this.e_window_root.style.resize = "none";
		this.SetTitle("Item Giver");
		this.SetIcon("card_giftcard");
		this.window_kind = ItemGiverWindow.window_kind;
		this.CreateContentContainer();

		this.CreateControlsColumn();
		this.e_username = this.AddTextField("Username", "",
			() =>
			{
				var can_add = this.e_username.children[1].children[0].value.length > 0;
				this.e_btn_give.style.filter = can_add ? "none" : "opacity(20%)";
				this.e_btn_give.style.pointerEvents = can_add ? "all" : "none";
			}
		);
		this.e_username.children[1].children[0].placeholder = "";
		this.e_username.style.height = "2rem";
		this.e_username.style.lineHeight = "2rem";

		this.e_source_selection = this.AddDropDown("Viewer Source", () => { });
		this.AppendSelectOption(this.e_source_selection.children[1].children[0], "Twitch");
		this.AppendSelectOption(this.e_source_selection.children[1].children[0], "Kick");
		this.e_source_selection.style.height = "2rem";
		this.e_source_selection.style.lineHeight = "2rem";

		this.e_item_selection = this.AddDropDown("Item", () => { });
		for (var ii = 0; ii < ItemLibrary.instance.items.length; ii++)
		{
			const i = ItemLibrary.instance.items[ii];
			this.AppendSelectOption(this.e_item_selection.children[1].children[0], i.name);
		}
		this.e_item_selection.style.height = "2rem";
		this.e_item_selection.style.lineHeight = "2rem";

		this.e_btn_give = this.AddButton("Give Item", "Give Item",
			() =>
			{
				const source = this.e_source_selection.children[1].children[0].value.toLowerCase();
				const username = this.e_username.children[1].children[0].value.trim().toLowerCase();
				const itemName = this.e_item_selection.children[1].children[0].value;
				var itemId = ItemLibrary.instance.IndexOf(itemName);
				var item = ItemLibrary.instance.GetItem(itemId);
				ViewerInventoryManager.AddItemCount(
					source,
					username,
					item,
					1
				);
				SaveIndicator.AddShowTime(3);
				//Notifications.instance.Add(`Added ${itemName} to ${username}`);
			}
		);
		this.e_btn_give.style.filter = "opacity(20%)";
		this.e_btn_give.style.pointerEvents = "none";
		this.e_btn_give.style.height = "2.5rem";
		this.e_btn_give.style.lineHeight = "2.5rem";
	}
}

export class ItemLibraryWindow extends DraggableWindow
{
	static window_kind = "Item Library";

	constructor(pos_x, pos_y)
	{
		super("Item Library", pos_x, pos_y);
		this.SetTitle("Item Library");
		this.SetIcon("toys");
		this.window_kind = ItemLibraryWindow.window_kind;
		this.e_window_root.style.minWidth = "260px";
		this.e_window_root.style.maxWidth = "560px";
		this.e_window_root.style.minHeight = "360px";

		this.e_items = [];
		this.e_edit_overlay = {};
		this.currentEditTargetIndex = -1;
		this.currentEditTarget = {};

		this.CreateContentContainer();
		this.e_content.overflowY = "hidden";
		this.e_content.style.display = "flex";
		this.e_content.style.flexDirection = "column";

		this.CreateMenu();

		this.RefreshItemList();
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
		this.e_btn_add.addEventListener("click", () => { ItemLibrary.instance.AddNew({ name: "New Item", weight: 0.0, tradeValue: 0.0 }); this.RefreshItemList(); });

		var e_plus = document.createElement("span");
		e_plus.innerText = "+";
		this.e_btn_add.appendChild(e_plus);

		this.e_root.appendChild(this.e_btn_add);
	}

	ClearItemListElements()
	{
		if (this.e_items.length < 1) return;
		for (var ii = 0; ii < this.e_items.length; ii++)
		{
			this.e_items[ii].remove();
		}
		this.e_items.length = [];
	}

	RefreshItemList()
	{
		this.ClearItemListElements();

		for (var ii = 0; ii < ItemLibrary.instance.items.length; ii++)
		{
			const thisItemIndex = ii;
			const creature = ItemLibrary.instance.items[thisItemIndex];

			const e_btn = document.createElement("div");
			e_btn.className = "window-content-button"
			e_btn.innerText = (thisItemIndex + 1) + ") " + creature.name;
			e_btn.addEventListener("click", () => { this.StartEditing(thisItemIndex); });

			const e_spn = document.createElement("span");
			e_spn.innerText = "➜";
			e_btn.appendChild(e_spn);

			this.e_root.insertBefore(e_btn, this.e_btn_add);
			this.e_items.push(e_btn);
		}
	}

	StartEditing(itemIndex)
	{
		if (this.currentEditTargetIndex > -1) return;
		this.currentEditTargetIndex = itemIndex;
		this.currentEditTarget = {};
		if (itemIndex < 0) return;
		this.currentEditTarget = ItemLibrary.instance.items[this.currentEditTargetIndex];
		this.CreateEditOverlay();
	}

	StopEditing(saveChanges = true)
	{
		if (this.currentEditTargetIndex < 0) return;
		if (saveChanges) this.ApplyEditedProperties();
		this.currentEditTargetIndex = -1;
		this.currentEditTarget = {};
		this.RemoveEditOverlay();
		this.RefreshItemList();
	}

	ApplyEditedProperties()
	{
		if (this.currentEditTargetIndex < 0) return;
		ItemLibrary.instance.items[this.currentEditTargetIndex].name = this.e_edit_field_name.value;
		ItemLibrary.instance.items[this.currentEditTargetIndex].weight = this.e_edit_field_weight.value;
		ItemLibrary.instance.items[this.currentEditTargetIndex].tradeValue = this.e_edit_field_tradeValue.value;
		ItemLibrary.instance.MarkDirty();
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
		this.e_edit_field_name.placeholder = "Enter Item Name";
		this.e_edit_overlay.appendChild(this.e_edit_field_name);

		this.AppendEditOverlayLabel("Weight");
		this.e_edit_field_weight = document.createElement("input");
		this.e_edit_field_weight.type = "number";
		this.e_edit_field_weight.step = "0.1";
		this.e_edit_field_weight.value = this.currentEditTarget.weight;
		this.e_edit_overlay.appendChild(this.e_edit_field_weight);

		this.AppendEditOverlayLabel("Trade Value");
		this.e_edit_field_tradeValue = document.createElement("input");
		this.e_edit_field_tradeValue.type = "number";
		this.e_edit_field_tradeValue.step = "0.1";
		this.e_edit_field_tradeValue.value = this.currentEditTarget.tradeValue;
		this.e_edit_overlay.appendChild(this.e_edit_field_tradeValue);

		var e_spacer = document.createElement("span");
		this.e_edit_overlay.appendChild(e_spacer);

		var e_btn_delete = document.createElement("div");
		e_btn_delete.className = "window-content-button"
		e_btn_delete.innerText = "Delete Item";
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
			ItemLibrary.instance.Remove(deleteTargetIndex);
			this.RefreshItemList();
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

WindowManager.instance.windowTypes.push({ key: ItemLibraryWindow.window_kind, icon: "toys", model: (x, y) => { return new ItemLibraryWindow(x, y); } });
WindowManager.instance.windowTypes.push({ key: ItemGiverWindow.window_kind, icon: "card_giftcard", model: (x, y) => { return new ItemGiverWindow(x, y); } });