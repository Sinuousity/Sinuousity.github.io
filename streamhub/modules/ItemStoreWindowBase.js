import { addElement } from "../hubscript.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { Gobbledy } from "./gobbledy.js";
import { ItemLibrary } from "./itemlibrary.js";
import { RunningTimeout } from "./runningtimeout.js";
import { TableListView, TableListViewColumn } from "./tablelistview.js";
import { DraggableWindow } from "./windowcore.js";


export class ItemStoreWindowBase extends DraggableWindow
{
	store = ItemLibrary.builtIn;
	searchString = "";

	IsDefaultListPathValid()
	{
		if (this.defaultListPath)
		{
			return typeof this.defaultListPath === 'string' && this.defaultListPath.length > 0;
		}
		return false;
	}

	CompareByID = (a, b) => b.id - a.id;
	CompareByName = (a, b) => b.name.localeCompare(a.name);
	OrCompareByID = (c, a, b) => c === 0 ? b.id - a.id : c;
	OrCompareByName = (c, a, b) => c === 0 ? b.name.localeCompare(a.name) : c;
	CompareByValue = (a, b) => this.OrCompareByID(this.OrCompareByName(b.tradeValue - a.tradeValue, a, b), a, b);
	//CompareByRarity = (a, b) => this.OrCompareByID(this.OrCompareByName(b.rarity - a.rarity, a, b), a, b);
	CompareByWeight = (a, b) => this.OrCompareByID(this.OrCompareByName(b.weight - a.weight, a, b), a, b);
	CompareByCategory = (a, b) => this.OrCompareByID(this.OrCompareByName((b.category ?? '').localeCompare(a.category ?? ''), a, b), a, b);
	CompareByDesc = (a, b) => this.OrCompareByID(this.OrCompareByName((b.description ?? '').localeCompare(a.description ?? ''), a, b), a, b);

	AppendDefaultItemList()
	{
		fetch(
			this.defaultListPath
		).then(
			x => x.json()
		).then(
			x =>
			{
				for (const item in x.items)
				{
					let this_item = x.items[item];
					if (this.store.IndexOf(this_item.name) > -1) continue;
					this.store.AddNew(this_item);
				}
				this.store.MarkDirty();
				this.RefreshTableData();
			}
		);
	}

	constructor(windowKind, icon, pos_x, pos_y, store)
	{
		super(windowKind, pos_x, pos_y);

		this.store = store;
		this.sub_dataRestored = this.store.onRestored.RequestSubscription(() => { if (this.table) this.table.PopulateView(); });
		this.sub_dataDirty = this.store.onDirtied.RequestSubscription(() => { if (this.table) this.table.PopulateView(); });

		this.SetTitle(windowKind);
		this.SetIcon(icon);

		this.hide_content_while_dragging = true;

		this.window_kind = windowKind;
		this.e_window_root.style.minWidth = "340px";
		this.e_window_root.style.minHeight = "340px";

		this.e_items = [];
		this.e_edit_overlay = {};
		this.currentEditTargetIndex = -1;
		this.currentEditTarget = {};

		this.defaultListPath = '';
		this.readonlyItemFields = [];

		this.CreateContentContainer();
		this.e_content.style.display = "flex";
		this.e_content.style.flexDirection = "column";
	}

	PrepareItemStoreWindowContent()
	{
		this.AddWindowHelpButton();
		this.SetWindowHelpText("A library of items you have created. These items can be anything you can imagine! Custom item properties are a planned feature, but for now items start with a few default properties.");

		this.PopulateMenuBar();
		this.CreateContentRootElement();
		this.CreateTableView();
	}

	GetNewBlankItem()
	{
		return {
			name: 'BLANK ITEM',
			description: '',
			weight: null,
			tradeValue: null,
			category: '',
			rarity: null
		};
	}

	GetNewRandomizedItem()
	{
		return {
			name: Gobbledy.GetPhrase(),
			description: Gobbledy.GetSentence(),
			weight: Math.random() * 150 + 0.001,
			tradeValue: Math.random() * 15000 + 0.1,
			category: 'misc',
			rarity: 0.0
		};
	}

	PopulateMenuBar()
	{
		this.CreateMenuBar();
		let menuBarItems = [];

		if (this.IsDefaultListPathValid())
		{
			menuBarItems.push(
				{
					label: 'Add Default Items',
					action: () => { this.AppendDefaultItemList(); },
				}
			);
		}

		menuBarItems.push(
			{
				label: 'Add Blank Item',
				action: () =>
				{
					let new_blank_item = this.GetNewBlankItem();
					while (this.store.IndexOf(new_blank_item.name) > -1) new_blank_item.name += '+';
					this.store.AddNew(new_blank_item);
					this.RefreshTableData();
				},
			}
		);

		menuBarItems.push(
			{
				label: 'Add Randomized Item',
				action: () =>
				{
					this.store.AddNew(this.GetNewRandomizedItem());
					this.RefreshTableData();
				},
			}
		);

		menuBarItems.push(
			{
				label: 'Delete All Items',
				action: () =>
				{
					this.StopEditing(false);
					this.store.RemoveAll();
					this.RefreshTableData();
				},
			}
		);

		this.AddMenuBarMenu('Utilities', menuBarItems);
	}

	CreateTableView()
	{
		this.table = new TableListView();
		this.table.searchMethod = (entry, searchString) => entry.name.toLowerCase().includes(searchString);

		this.RegisterTableViewColumns();
		this.RegisterTableViewControlColumns();
		this.RegisterTableViewQuickFilters();

		this.table.CreateRoot(this.e_root);
		this.RefreshTableData();
	}

	RegisterTableViewColumns()
	{
		let col_name = this.table.RegisterColumn('name', "Item Name", this.CompareByName);
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
		col_name.width = '10rem';

		let col_value = this.table.RegisterColumn('tradeValue', "Value", this.CompareByValue, TableListView.GetValueStr);
		col_value.textAlign = 'right';
		col_value.fixedWidth = true;
		col_value.width = '5rem';

		let col_weight = this.table.RegisterColumn('weight', "Weight", this.CompareByWeight, TableListView.GetWeightStr);
		col_weight.textAlign = 'right';
		col_weight.fixedWidth = true;
		col_weight.width = '5rem';

		//let col_rarity = this.table.RegisterColumn('rarity', "Rarity", this.CompareByRarity);
		//col_rarity.textAlign = 'center';
		//col_rarity.fixedWidth = true;
		//col_rarity.width = '5rem';
		let col_category = this.table.RegisterColumn('category', "Category", this.CompareByCategory);
		col_category.default_descending = true;
		col_category.textAlign = 'center';
		col_category.width = '8rem';
	}

	RegisterTableViewControlColumns()
	{
		let col_edit = this.table.RegisterColumn('item_edit', "Edit", null, null, TableListViewColumn.iconButtonContentProvider);
		col_edit.buttonIcon = 'edit';
		col_edit.buttonColor = 'darkgreen';
		col_edit.fontSize = '0.6rem';
		col_edit.textAlign = 'center';
		col_edit.fixedWidth = true;
		col_edit.width = '1.5rem';
		col_edit.tooltipMethod = entry => "Edit " + entry.name;
		col_edit.buttonMethod = entry =>
		{
			let item_id = this.store.IndexOf(entry.name);
			this.StartEditing(item_id);
		};

		let col_copy = this.table.RegisterColumn('item_copy', "Copy", null, null, TableListViewColumn.iconButtonContentProvider);
		col_copy.buttonIcon = 'content_copy';
		col_copy.buttonColor = 'darkcyan';
		col_copy.fontSize = '0.6rem';
		col_copy.textAlign = 'center';
		col_copy.fixedWidth = true;
		col_copy.width = '1.5rem';
		col_copy.tooltipMethod = entry => "Copy " + entry.name;
		col_copy.buttonMethod = entry =>
		{
			let item_id = this.store.IndexOf(entry.name);
			let item_original = this.store.GetItem(item_id);
			let item_copy = {};
			for (let prop in item_original) item_copy[prop] = item_original[prop];
			item_copy.name = item_copy.name.replaceAll('+', '');
			while (this.store.IndexOf(item_copy.name) > -1) item_copy.name += '+';
			this.store.AddNew(item_copy);
			this.RefreshTableData();
		};

		let col_delete = this.table.RegisterColumn('item_delete', "Delete", null, null, TableListViewColumn.iconButtonContentProvider);
		col_delete.buttonIcon = 'delete';
		col_delete.buttonColor = 'darkred';
		col_delete.fontSize = '0.6rem';
		col_delete.textAlign = 'center';
		col_delete.fixedWidth = true;
		col_delete.width = '1.5rem';
		col_delete.tooltipMethod = entry => "Delete " + entry.name;
		col_delete.buttonMethod = entry => { this.store.Remove(this.store.IndexOf(entry.name)); this.RefreshTableData(); };
	}

	RegisterTableViewQuickFilters()
	{
		this.table.RegisterQuickFilter('plumbing', entry => entry.category && entry.category.indexOf('tool') > -1, 'crimson', 'Tools');
		this.table.RegisterQuickFilter('shield', entry => entry.category && entry.category.indexOf('clothing') > -1, 'gold', 'Clothing');
		this.table.RegisterQuickFilter('egg', entry => entry.category && entry.category.indexOf('ingredient') > -1, 'lightgreen', 'Ingredients');
		this.table.RegisterQuickFilter('fastfood', entry => entry.category && entry.category.indexOf('food') > -1, 'burlywood', 'Food');
		this.table.RegisterQuickFilter('workspaces', entry => entry.category && entry.category.indexOf('misc') > -1, 'blueviolet', 'Misc');
		this.table.RegisterQuickFilter('savings', entry => entry.category && entry.category.indexOf('currency') > -1, 'hotpink', 'Currency');
		//this.table.RegisterQuickFilter('pets', entry => entry.category && entry.category.indexOf('creature') > -1, 'orange', 'Creatures');
	}

	RefreshTableData()
	{
		if (this.table)
		{
			this.table.SetData(this.store.items.slice(0, this.store.items.length));
			this.table.PopulateView();
		}
	}

	onWindowResize()
	{
		if (this.resize_timeout) this.resize_timeout.ExtendTimer();
		else this.resize_timeout = new RunningTimeout(() => { if (this.table) this.table.PopulateView(); }, 0.05, true, 20);
	}

	onWindowClose()
	{
		super.onWindowClose();
		this.store.onRestored.RemoveSubscription(this.sub_dataRestored);
		this.store.onDirtied.RemoveSubscription(this.sub_dataDirty);
	}

	CreateContentRootElement()
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
			e_spn.style.fontWeight = "normal";
			e_spn.style.letterSpacing = "0.06rem";
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
		this.RefreshTableData();
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

		this.edit_overlay_fields = [];
		for (const prop in this.currentEditTarget)
		{
			if (this.readonlyItemFields.indexOf(prop) > -1) continue;

			this.edit_overlay_fields[prop] = this.AppendEditOverlayTextField(prop, this.currentEditTarget[prop] ?? "-", "Edit " + prop + "...");
			GlobalTooltip.RegisterReceiver(this.e_edit_field_name, prop);
		}
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
				this.StopEditing(false);
				this.store.Remove(deleteTargetIndex);
				this.RefreshTableData();
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

		const target_item = this.store.items[this.currentEditTargetIndex];
		if (!target_item) return;

		for (const prop in target_item)
		{
			let propval = this.edit_overlay_fields[prop].value.trim();
			if (propval.toLowerCase() === 'true') target_item[prop] = true;
			else if (propval.toLowerCase() === 'false') target_item[prop] = false;
			else target_item[prop] = propval;
		}
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

	AppendEditOverlaySliderField(fieldName = "NULL", fieldValue = 0.0, sliderMin = 0.0, sliderMax = 1.0, sliderStep = 0.05)
	{
		var e_row = this.PrepareEditRow(this.e_edit_overlay);
		var e_lbl = this.AppendEditOverlayLabel(e_row, fieldName);
		this.PrepareRowLabel(e_lbl);

		var e = document.createElement("input");
		e.type = "range";
		e.min = sliderMin;
		e.max = sliderMax;
		e.step = sliderStep;
		e.value = fieldValue;
		this.PrepareRowField(e);

		var e_min = document.createElement("div");
		e_min.style.color = "#fff5";
		e_min.style.fontSize = "0.7rem";
		e_min.innerText = sliderMin;
		e_min.style.minWidth = "1rem";
		e_min.style.textAlign = "center";

		var e_max = document.createElement("div");
		e_max.style.color = "#fff5";
		e_max.style.fontSize = "0.7rem";
		e_max.innerText = sliderMax;
		e_max.style.minWidth = "1rem";
		e_max.style.textAlign = "center";

		e_row.appendChild(e_min);
		e_row.appendChild(e);
		e_row.appendChild(e_max);

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
