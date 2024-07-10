import { StoredObject } from "./storedobject.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import "./storedobject.js";
import { ViewerInventoryManager } from "./viewerinventory.js";
import { Notifications } from "./notifications.js";
import { SaveIndicator } from "./saveindicator.js";
import { Lookup } from "./lookup.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { addElement } from "../hubscript.js";

console.info("[ +Module ] Item Library");

export class ItemStoreManager
{
	static stores = new Lookup();

	static RegisterStore(storeKey = "", itemStore = {})
	{
		if (typeof storeKey != 'string') return;
		if (storeKey == "") return;
		ItemStoreManager.stores.Set(storeKey, itemStore);
	}
}

export class ItemStoreBase extends StoredObject
{
	constructor(storeKey = "")
	{
		super(0.369, false);
		this.storeKey = storeKey;
		this.items = [];
		ItemStoreManager.RegisterStore(this.storeKey, this);
	}

	AddNew(item)
	{
		this.items.push(item);
		this.MarkDirty();
	}

	Remove(id = -1)
	{
		if (id > -1)
		{
			this.items.splice(id, 1);
			this.MarkDirty();
		}
	}

	IndexOf(name = "")
	{
		if (name == "") return -1;
		for (var ii = 0; ii < this.items.length; ii++)
		{
			if (!this.items[ii]) continue;
			if (!this.items[ii].name) continue;
			if (this.items[ii].name == name) return ii;
		}
		return -1;
	}

	GetItem(id = -1)
	{
		if (id < 0) return null;
		return this.items[id];
	}

	MarkDirty() { this.ExtendTimer(); }
	GetState() { return { items: this.items }; }
	ApplyState(x) { this.items = x.items ?? []; }
}

export class ItemStoreWindowBase extends DraggableWindow
{
	store = ItemLibrary.builtIn;
	searchString = "";

	constructor(windowKind, icon, pos_x, pos_y, store)
	{
		super(windowKind, pos_x, pos_y);

		this.store = store;
		this.sub_dataRestored = this.store.onRestored.RequestSubscription(() => { this.RefreshItemList(); });
		this.sub_dataDirty = this.store.onDirtied.RequestSubscription(() => { this.RefreshItemList(); });

		this.SetTitle(windowKind);
		this.SetIcon(icon);

		this.window_kind = windowKind;
		this.e_window_root.style.minWidth = "360px";
		this.e_window_root.style.maxWidth = "960px";
		this.e_window_root.style.minHeight = "360px";

		this.e_items = [];
		this.e_edit_overlay = {};
		this.currentEditTargetIndex = -1;
		this.currentEditTarget = {};

		this.CreateContentContainer();
		this.e_content.overflowX = "hidden";
		this.e_content.overflowY = "auto";
		this.e_content.style.display = "flex";
		this.e_content.style.flexDirection = "column";

		this.CreateFilterElements();
		this.CreateListElements();

		this.AddWindowHelpButton();
		this.SetWindowHelpText("A library of items you have created. These items can be anything you can imagine! Custom item attributes are a planned feature, but for now all items have a name, weight, and trade value.");

		this.RefreshItemList();
	}

	onWindowClose()
	{
		super.onWindowClose();
		this.store.onRestored.RemoveSubscription(this.sub_dataRestored);
		this.store.onDirtied.RemoveSubscription(this.sub_dataDirty);
	}

	CreateFilterElements()
	{
		this.e_filter_root = document.createElement("div");
		this.e_filter_root.style.position = "relative";
		this.e_filter_root.style.height = "2rem";
		this.e_filter_root.style.flexShrink = "0.0";
		this.e_content.appendChild(this.e_filter_root);

		this.e_filter_input = addElement("input", null, this.e_filter_root);
		this.e_filter_input.style.textAlign = "center";
		this.e_filter_input.style.fontWeight = "bold";
		this.e_filter_input.style.borderRadius = "0";
		this.e_filter_input.style.position = "absolute";
		this.e_filter_input.style.inset = "0";
		this.e_filter_input.type = "text";
		this.e_filter_input.placeholder = "Filter Items";
		GlobalTooltip.RegisterReceiver(
			this.e_filter_input,
			"Search by item name or description",
			"Filter all items in this list to items that contain the text entered here. Not case sensitive"
		);

		this.e_filter_input.addEventListener(
			"change",
			e =>
			{
				this.searchString = this.e_filter_input.value.toLowerCase().trim();
				if (this.searchString == "")
				{
					this.e_filter_input.style.background = "unset";
				}
				else
				{
					this.e_filter_input.style.background = "linear-gradient(0deg, #fff0 -10%, #fc08 110%)";
				}
				this.RefreshItemList();
			}
		);
	}

	CreateListElements()
	{
		this.e_root = document.createElement("div");
		this.e_root.style.display = "flex";
		this.e_root.style.flexDirection = "column";
		this.e_root.style.flexShrink = "1";
		this.e_root.style.flexGrow = "1";
		this.e_root.style.overflowX = "hidden";
		this.e_root.style.overflowY = "auto";
		this.e_root.style.padding = "0.25rem";
		this.e_root.style.borderRadius = "1rem";
		this.e_content.appendChild(this.e_root);

		this.e_btn_add = document.createElement("div");
		this.e_btn_add.className = "window-content-button";
		this.e_btn_add.style.backgroundColor = "#00ff0030";
		this.e_btn_add.style.color = "#00ff00";
		this.e_btn_add.innerText = "ADD NEW";
		this.e_btn_add.addEventListener(
			"click",
			e =>
			{
				this.store.AddNew(this.GetDefaultItem());
				this.RefreshItemList();
			}
		);

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
			GlobalTooltip.ReleaseAllReceivers(this.e_items[ii]);
			this.e_items[ii].remove();
		}
		this.e_items = [];
	}

	RefreshItemList()
	{
		this.ClearItemListElements();

		for (var ii = 0; ii < this.store.items.length; ii++)
		{
			const thisItemIndex = ii;
			const targetItem = this.store.items[thisItemIndex];

			if (this.searchString != "")
			{
				let match = false;
				if (!match && targetItem.name.toLowerCase().includes(this.searchString)) match = true;
				if (!match && targetItem.description.toLowerCase().includes(this.searchString)) match = true;
				if (!match) continue;
			}

			const e_btn = document.createElement("div");
			e_btn.className = "window-content-button";
			e_btn.style.height = "1.5rem";
			e_btn.style.lineHeight = "1.5rem";
			e_btn.style.fontSize = "0.9rem";
			e_btn.innerText = (thisItemIndex + 1) + ") " + targetItem.name;
			e_btn.addEventListener("click", () => { this.StartEditing(thisItemIndex); });

			const e_spn = document.createElement("span");
			e_spn.innerText = "edit ➜";
			e_spn.style.fontSize = "0.555rem";
			e_btn.appendChild(e_spn);

			this.e_root.insertBefore(e_btn, this.e_btn_add);
			this.e_items.push(e_btn);

			this.ApplyListItemTooltip(e_btn, targetItem);
		}

		this.e_btn_add.style.display = this.searchString == "" ? "block" : "none";
	}

	//override please
	ApplyListItemTooltip(e_btn, targetItem)
	{
		GlobalTooltip.RegisterReceiver(e_btn, "Edit " + targetItem.name, targetItem.description);
	}

	StartEditing(itemIndex)
	{
		if (this.currentEditTargetIndex > -1) return;
		this.currentEditTargetIndex = itemIndex;
		this.currentEditTarget = {};
		if (itemIndex < 0) return;
		this.currentEditTarget = this.store.items[this.currentEditTargetIndex];

		this.e_edit_overlay = document.createElement("div");
		this.e_edit_overlay.className = "creature-edit-root";
		this.e_edit_overlay.style.overflowX = "hidden";
		this.e_edit_overlay.style.overflowY = "auto";

		//this.e_root.style.overflowY = "hidden";
		this.e_root.style.filter = "blur(4px)";

		this.e_content.appendChild(this.e_edit_overlay);

		this.PopulateEditOverlay();

		var e_spacer = document.createElement("span");
		//e_spacer.style.flexGrow = "0.0";
		e_spacer.style.flexShrink = "0.0";
		this.e_edit_overlay.appendChild(e_spacer);

		this.AppendEditOverlayControls();
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

	AppendEditOverlayLabel(parent, labelText, fontSize = "0.8rem", labelHeight = "1.4rem")
	{
		var e_lbl = document.createElement("div");
		e_lbl.innerText = labelText;
		e_lbl.style.fontSize = fontSize;
		e_lbl.style.height = labelHeight;
		e_lbl.style.lineHeight = labelHeight;
		parent.appendChild(e_lbl);
		return e_lbl;
	}

	RemoveEditOverlay()
	{
		GlobalTooltip.ReleaseAllReceivers(this.e_edit_overlay);
		this.e_edit_overlay.remove();
		this.e_edit_overlay = null;
		this.e_root.style.filter = "none";
		this.e_root.style.overflowY = "auto";
	}

	// override please
	GetDefaultItem()
	{
		return { name: "New Item", description: "", weight: 0.0, tradeValue: 0.0 };
	}

	// override please
	PopulateEditOverlay()
	{
		this.AppendEditOverlayTitle("Editing " + this.currentEditTarget.name);

		this.e_edit_field_name = this.AppendEditOverlayTextField("Name", this.currentEditTarget.name ?? "NULL", "Enter Item Name");
		GlobalTooltip.RegisterReceiver(this.e_edit_field_name, "Item Name", "A name for this item.");

		this.e_edit_field_desc = this.AppendEditOverlayTextArea("Description", this.currentEditTarget.description ?? "", "Enter Item Description");
		GlobalTooltip.RegisterReceiver(this.e_edit_field_desc, "Item Description", "A more detailed description for this item.");

		this.e_edit_field_weight = this.AppendEditOverlayNumberField("Weight", this.currentEditTarget.weight ?? 1.0, 0.05);
		GlobalTooltip.RegisterReceiver(this.e_edit_field_weight, "Item Weight", "How much this item weighs, in your unit of choice.");

		this.e_edit_field_tradeValue = this.AppendEditOverlayNumberField("Trade Value", this.currentEditTarget.tradeValue ?? 0.0, 0.05);
		GlobalTooltip.RegisterReceiver(this.e_edit_field_tradeValue, "Item Trade Value", "How much this item is worth, in your currency of choice.");

	}

	AppendEditOverlayControls()
	{
		const deleteTargetIndex = this.currentEditTargetIndex;

		var e_controls_root = addElement("div", null, this.e_edit_overlay);
		//e_controls_root.style.zIndex = "10";
		//e_controls_root.style.position = "absolute";
		//e_controls_root.style.top = "0.25rem";
		e_controls_root.style.left = "0.25rem";
		e_controls_root.style.right = "0.25rem";
		e_controls_root.style.display = "flex";
		e_controls_root.style.flexDirection = "row";
		e_controls_root.style.height = "2rem";
		e_controls_root.style.padding = "0";

		var e_btn_delete = this.AddItemEditButton(
			"Delete",
			"#ff0000",
			"delete_forever",
			e =>
			{
				this.StopEditing();
				this.store.Remove(deleteTargetIndex);
				this.RefreshItemList();
			}, false
		);
		var e_btn_discard = this.AddItemEditButton("Discard", "#ffff00", "chevron_left", e => { this.StopEditing(false); }, true);
		var e_btn_save = this.AddItemEditButton("Save", "#00ff00", "save", e => { this.StopEditing(); }, true);

		GlobalTooltip.RegisterReceiver(e_btn_delete, "Delete Item", "Delete this item from existence. Cannot be undone!");
		GlobalTooltip.RegisterReceiver(e_btn_discard, "Discard Changes", "Discard the changes made above and return to the item list.");
		GlobalTooltip.RegisterReceiver(e_btn_save, "Save Changes", "Apply and save the changes made above and return to the item list.");

		e_btn_discard.style.borderRadius = "0.4rem 0rem 0rem 0.4rem";
		e_btn_delete.style.borderRadius = "0rem 0rem 0rem 0rem";
		e_btn_save.style.borderRadius = "0rem 0.4rem 0.4rem 0rem";

		e_controls_root.appendChild(e_btn_discard);
		e_controls_root.appendChild(e_btn_delete);
		e_controls_root.appendChild(e_btn_save);
	}

	AddItemEditButton(label = "", color = "#ffff00", iconText = "?", clickAction = x => { }, flexGrow = true)
	{
		var e_btn = document.createElement("div");
		e_btn.className = "list-item-button";
		e_btn.style.width = "6rem";
		e_btn.style.flexGrow = flexGrow ? "1" : "0";
		e_btn.style.flexShrink = "1";
		e_btn.style.lineHeight = "2rem";
		e_btn.style.height = "2rem";
		e_btn.style.fontSize = "1rem";
		e_btn.style.backgroundColor = color + "30";
		e_btn.style.color = color + "f0";
		e_btn.addEventListener("click", clickAction);

		var e_lbl = document.createElement("span");
		e_lbl.className = "list-item-label";
		e_lbl.innerText = label;
		e_btn.appendChild(e_lbl);

		var e_icon = document.createElement("span");
		e_icon.className = "list-item-icon";
		e_icon.style.fontFamily = "'Material Icons'";
		e_icon.style.fontSize = "1.5rem";
		e_icon.innerText = iconText;
		e_btn.appendChild(e_icon);


		return e_btn;
	}

	// override please
	ApplyEditedProperties()
	{
		if (this.currentEditTargetIndex < 0) return;
		this.store.items[this.currentEditTargetIndex].name = this.e_edit_field_name.value;
		this.store.items[this.currentEditTargetIndex].description = this.e_edit_field_desc.value;
		this.store.items[this.currentEditTargetIndex].weight = this.e_edit_field_weight.value;
		this.store.items[this.currentEditTargetIndex].tradeValue = this.e_edit_field_tradeValue.value;
		this.store.MarkDirty();
	}


	AppendEditOverlayTitle(text = "")
	{
		var e_pageTitle = this.AppendEditOverlayLabel(this.e_edit_overlay, text);
		e_pageTitle.style.textAlign = "center";
		e_pageTitle.style.height = "1.5rem";
		e_pageTitle.style.lineHeight = "1.5rem";
		e_pageTitle.style.fontSize = "0.9rem";
		e_pageTitle.style.color = "white";
	}

	AppendEditOverlayTextField(fieldName = "NULL", fieldValue = "", placeholder = "")
	{
		var e_row = this.PrepareEditRow(this.e_edit_overlay);
		var e_lbl = this.AppendEditOverlayLabel(e_row, fieldName);
		this.PrepareRowLabel(e_lbl);

		var e = document.createElement("input");
		e.type = "text";
		e.value = fieldValue;
		e.placeholder = placeholder;
		this.PrepareRowField(e);

		e_row.appendChild(e);
		return e;
	}

	AppendEditOverlayTextArea(fieldName = "NULL", fieldValue = "", placeholder = "")
	{
		var e_row = this.PrepareEditRow(this.e_edit_overlay);
		e_row.style.height = "auto";
		e_row.style.palceItems = "top";

		var e_lbl = this.AppendEditOverlayLabel(e_row, fieldName);
		this.PrepareRowLabel(e_lbl);

		var e = document.createElement("textarea");
		e.rows = 3;
		e.columns = 32;
		e.style.wordBreak = "break-word";
		e.style.resize = "vertical";
		e.style.left = "0";
		e.style.right = "0";
		e.value = fieldValue ?? "";
		e.placeholder = placeholder;
		this.PrepareRowField(e);

		e_row.appendChild(e);
		return e;
	}

	AppendEditOverlayNumberField(fieldName = "NULL", fieldValue = 0.0, step = "1")
	{
		var e_row = this.PrepareEditRow(this.e_edit_overlay);
		var e_lbl = this.AppendEditOverlayLabel(e_row, fieldName);
		this.PrepareRowLabel(e_lbl);

		var e = document.createElement("input");
		e.type = "number";
		e.step = step;
		e.value = fieldValue;
		this.PrepareRowField(e);

		e_row.appendChild(e);
		return e;
	}

	PrepareEditRow(parent)
	{
		var e_row = addElement("div", null, parent);
		e_row.style.display = "flex";
		e_row.style.alignItems = "center";
		e_row.style.justifyItems = "center";
		e_row.style.flexDirection = "row";
		e_row.style.paddingLeft = "0";
		return e_row;
	}

	PrepareRowLabel(e_lbl)
	{
		e_lbl.style.flexGrow = "0.0";
		e_lbl.style.flexShrink = "1.0";
		e_lbl.style.wordBreak = "break-word";
		e_lbl.style.textOverflow = "ellipsis";
		e_lbl.style.textWrap = "nowrap";
		e_lbl.style.overflow = "hidden";
		e_lbl.style.minWidth = "6rem";
		e_lbl.style.maxWidth = "8rem";
		e_lbl.style.height = "2rem";
		e_lbl.style.lineHeight = "2rem";
		e_lbl.style.textAlign = "right";
		e_lbl.style.paddingLeft = "0.5rem";
		e_lbl.style.paddingRight = "0.5rem";

		e_lbl.addEventListener(
			"mouseenter",
			e =>
			{
				e_lbl.style.maxWidth = "unset";
				e_lbl.style.flexShrink = "0.0";
			}
		);
		e_lbl.addEventListener(
			"mouseleave",
			e =>
			{
				e_lbl.style.maxWidth = "8rem";
				e_lbl.style.flexShrink = "1.0";
			}
		);
	}

	PrepareRowField(e_field)
	{
		e_field.style.flexGrow = "1.0";
		e_field.style.flexShrink = "1.0";
		e_field.style.minWidth = "1rem";
		e_field.style.paddingLeft = "0.5rem";
		e_field.style.paddingRight = "0.5rem";
	}

	AppendEditOverlayToggle(fieldName = "NULL", fieldValue = false)
	{
		var e_row = this.PrepareEditRow(this.e_edit_overlay);
		var e_lbl = this.AppendEditOverlayLabel(e_row, fieldName);
		this.PrepareRowLabel(e_lbl);

		var e = document.createElement("input");
		e.type = "checkbox";
		e.checked = fieldValue ?? true;
		e.style.cursor = "pointer";
		e.style.maxWidth = "3rem";
		e.style.height = "60%";
		this.PrepareRowField(e);

		e_row.appendChild(e);
		return e;
	}
}




export class ItemLibrary extends ItemStoreBase
{
	static builtIn = new ItemLibrary();
	constructor() { super("data_item_library"); }
}

export class ItemLibraryWindow extends ItemStoreWindowBase
{
	static window_kind = "Item Library";

	constructor(pos_x, pos_y)
	{
		super(ItemLibraryWindow.window_kind, "toys", pos_x, pos_y, ItemLibrary.builtIn);
	}
}


/// to be deprecated
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
		for (var ii = 0; ii < ItemLibrary.builtIn.items.length; ii++)
		{
			const i = ItemLibrary.builtIn.items[ii];
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
				var itemId = ItemLibrary.builtIn.IndexOf(itemName);
				var item = ItemLibrary.builtIn.GetItem(itemId);
				ViewerInventoryManager.AddItemCount(
					source,
					username,
					item,
					1
				);
				SaveIndicator.AddShowTime();
				//Notifications.instance.Add(`Added ${itemName} to ${username}`);
			}
		);
		this.e_btn_give.style.filter = "opacity(20%)";
		this.e_btn_give.style.pointerEvents = "none";
		this.e_btn_give.style.height = "2.5rem";
		this.e_btn_give.style.lineHeight = "2.5rem";
	}
}




WindowManager.instance.windowTypes.push({ key: ItemLibraryWindow.window_kind, icon: "toys", model: (x, y) => { return new ItemLibraryWindow(x, y); }, wip: true });
WindowManager.instance.windowTypes.push({ key: ItemGiverWindow.window_kind, icon: "card_giftcard", model: (x, y) => { return new ItemGiverWindow(x, y); }, wip: true });