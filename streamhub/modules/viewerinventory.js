import { addElement } from "../hubscript.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { RunningTimeout } from "./runningtimeout.js";
import { StoredObject } from "./storedobject.js";
import { TableListView, TableListViewColumn } from "./tablelistview.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import { ItemStoreManager } from "./ItemStoreManager.js";

console.info("[ +Module ] Viewer Inventories");

export class ViewerInventorySlot
{
	constructor(item, count = 1)
	{
		this.item = item;
		this.count = count;
	}

	static GetItemWeight(itemSlot = {})
	{
		if (itemSlot.weight) return itemSlot.weight;
		return 0.0;
	}

	static GetItemValue(itemSlot = {})
	{
		if (itemSlot.tradeValue) return itemSlot.tradeValue;
		return 0.0;
	}

	static GetTotalWeight(itemSlot = {})
	{
		if (itemSlot.weight) return itemSlot.count * itemSlot.weight;
		return 0.0;
	}

	static GetTotalValue(itemSlot = {})
	{
		if (itemSlot.tradeValue) return itemSlot.count * itemSlot.tradeValue;
		return 0.0;
	}

	static CompareName(a = {}, b = {}) { return b.name.localeCompare(a.name); }

	static CompareWeight(a = {}, b = {})
	{
		return ViewerInventorySlot.GetItemWeight(b) - ViewerInventorySlot.GetItemWeight(a);
	}

	static CompareValue(a = {}, b = {})
	{
		return ViewerInventorySlot.GetItemValue(b) - ViewerInventorySlot.GetItemValue(a);
	}

	static CompareTotalWeight(a = {}, b = {})
	{
		return ViewerInventorySlot.GetTotalWeight(b) - ViewerInventorySlot.GetTotalWeight(a);
	}

	static CompareTotalValue(a = {}, b = {})
	{
		return ViewerInventorySlot.GetTotalValue(b) - ViewerInventorySlot.GetTotalValue(a);
	}
}


export class ViewerInventory
{
	constructor(viewerSource = "", username = "", itemSlots = [])
	{
		this.viewerSource = viewerSource;
		this.username = username;
		this.itemSlots = itemSlots;
	}

	static GetTotalItemCount(inv)
	{
		var sum = 0;
		for (var ii in inv.itemSlots)
		{
			if (!inv.itemSlots[ii].item) continue;
			if (inv.itemSlots[ii].count) sum += Number(inv.itemSlots[ii].count);
		}
		return sum;
	}

	static GetTotalWeight(inv)
	{
		var sum = 0.0;
		for (var ii in inv.itemSlots)
		{
			if (!inv.itemSlots[ii].item) continue;
			var x = 0.0;
			if (inv.itemSlots[ii].item.weight) x += Number(inv.itemSlots[ii].item.weight);
			if (inv.itemSlots[ii].count) x *= Number(inv.itemSlots[ii].count);
			sum += x;
		}
		return sum;
	}

	static GetTotalTradeValue(inv)
	{
		var sum = 0.0;
		for (var ii in inv.itemSlots)
		{
			if (!inv.itemSlots[ii].item) continue;
			var x = 0.0;
			if (inv.itemSlots[ii].item.tradeValue) x += Number(inv.itemSlots[ii].item.tradeValue);
			if (inv.itemSlots[ii].count) x *= Number(inv.itemSlots[ii].count);
			sum += x;
		}
		return sum;
	}


	static CompareByTotalWeight = (a, b) => ViewerInventory.GetTotalWeight(b) - ViewerInventory.GetTotalWeight(a);
	static CompareByTotalTradeValue = (a, b) => ViewerInventory.GetTotalTradeValue(b) - ViewerInventory.GetTotalTradeValue(a);
}


export class ViewerInventoryManager extends StoredObject
{
	static instance = new ViewerInventoryManager();
	static inventories = [];
	static changeReceivers = [];

	static IndexOfInventory(viewerSource = "", username = "")
	{
		if (viewerSource.length < 1) return;
		if (username.length < 1) return;

		if (ViewerInventoryManager.inventories.length < 1) return -1;
		for (var ii = 0; ii < ViewerInventoryManager.inventories.length; ii++)
		{
			var i = ViewerInventoryManager.inventories[ii];
			if (i.viewerSource == viewerSource && i.username == username) return ii;
		}
		return -1;
	}

	static EmitChange()
	{
		for (var ii = 0; ii < ViewerInventoryManager.changeReceivers.length; ii++)
		{
			var recv = ViewerInventoryManager.changeReceivers[ii];
			if (recv.onInventoryChange) recv.onInventoryChange();
		}
		ViewerInventoryManager.instance.ExtendTimer();
	}

	static TryRemoveItem(inventoryIndex = -1, itemSlotIndex = -1, count = 1)
	{
		if (inventoryIndex < 0) return;
		if (itemSlotIndex < 0) return;
		var prevCount = ViewerInventoryManager.inventories[inventoryIndex].itemSlots[itemSlotIndex].count;
		if (!prevCount || prevCount <= count) ViewerInventoryManager.inventories[inventoryIndex].itemSlots.splice(itemSlotIndex, 1);
		else ViewerInventoryManager.inventories[inventoryIndex].itemSlots[itemSlotIndex].count -= count;
		ViewerInventoryManager.EmitChange();
	}

	static TryRemoveItemByName(inventoryIndex = -1, itemName = '', count = 1)
	{
		if (inventoryIndex < 0) return;
		let inv = ViewerInventoryManager.inventories[inventoryIndex];
		let itemSlotIndex = ViewerInventoryManager.IndexOfItem(inv, itemName);
		if (itemSlotIndex < 0) return;
		var prevCount = inv.itemSlots[itemSlotIndex].count;
		if (!prevCount || prevCount <= count) inv.itemSlots.splice(itemSlotIndex, 1);
		else inv.itemSlots[itemSlotIndex].count -= count;
		ViewerInventoryManager.EmitChange();
	}

	static TryAddItemByName(inventoryIndex = -1, itemName = '', count = 1)
	{
		if (inventoryIndex < 0) return;
		let inv = ViewerInventoryManager.inventories[inventoryIndex];
		let itemSlotIndex = ViewerInventoryManager.IndexOfItem(inv, itemName);
		if (itemSlotIndex < 0)
		{
			let item = null;
			for (let item_store_key in ItemStoreManager.stores)
			{
				let store = ItemStoreManager.stores[item_store_key];
				let store_item_id = store.IndexOf(itemName);
				if (store_item_id >= 0)
				{
					item = store.GetItem(store_item_id);
					break;
				}
			}
			if (item) inv.itemSlots.push(new ViewerInventorySlot(item, count));
		}
		else
		{
			inv.itemSlots[itemSlotIndex].count += count;
		}
		ViewerInventoryManager.EmitChange();
	}



	static UserMatch(inv = {}, viewerSource = "", username = "")
	{
		return inv.viewerSource == viewerSource && inv.username == username;
	}

	static IndexOfItem(inv = {}, item = {})
	{
		if (typeof item === 'string')
		{
			for (var ii = 0; ii < inv.itemSlots.length; ii++)
			{
				if (!inv.itemSlots[ii].item) continue;
				if (!inv.itemSlots[ii].item.name) continue;
				if (inv.itemSlots[ii].item.name == item) return ii;
			}
		}
		else
		{
			for (var ii = 0; ii < inv.itemSlots.length; ii++)
			{
				if (!inv.itemSlots[ii].item) continue;
				if (!inv.itemSlots[ii].item.name) continue;
				if (inv.itemSlots[ii].item.name == item.name) return ii;
			}
		}
		return -1;
	}

	static HasItem(inv = {}, item = {})
	{
		return ViewerInventoryManager.IndexOfItem(inv, item) > -1;
	}

	static GetItemCount(inv = {}, item = {})
	{
		var id = ViewerInventoryManager.IndexOfItem(inv, item);
		if (id < 0) return 0;
		if (inv.itemSlots[id].count) return inv.itemSlots[id].count;
		return 1;
	}

	static EnsureInventory(viewerSource = "", username = "")
	{
		var inventoryId = ViewerInventoryManager.IndexOfInventory(viewerSource, username);
		if (inventoryId < 0)
		{
			ViewerInventoryManager.inventories.push(new ViewerInventory(viewerSource, username, []));
			ViewerInventoryManager.EmitChange();
			return ViewerInventoryManager.inventories.length - 1;
		}
		return inventoryId;
	}

	static AddItemCount(viewerSource = "", username = "", item = {}, count = 1)
	{
		var inventoryId = ViewerInventoryManager.EnsureInventory(viewerSource, username);

		var itemSlotId = ViewerInventoryManager.IndexOfItem(ViewerInventoryManager.inventories[inventoryId], item);
		if (itemSlotId < 0)
		{
			ViewerInventoryManager.inventories[inventoryId].itemSlots.push(new ViewerInventorySlot(item, count));
			ViewerInventoryManager.EmitChange();
			return;
		}


		ViewerInventoryManager.inventories[inventoryId].itemSlots[itemSlotId].item = item;
		if (ViewerInventoryManager.inventories[inventoryId].itemSlots[itemSlotId].count)
			ViewerInventoryManager.inventories[inventoryId].itemSlots[itemSlotId].count += count;
		else
			ViewerInventoryManager.inventories[inventoryId].itemSlots[itemSlotId].count = count;
		ViewerInventoryManager.EmitChange();
	}


	constructor()
	{
		super(0.369, false);
		this.logJSON = false;
		this.storeKey = "data_viewer_inventories";
	}

	GetState() { return { inventories: ViewerInventoryManager.inventories }; }
	ApplyState(x) { ViewerInventoryManager.inventories = x.inventories; }
}


export class ViewerInventoryWindow extends DraggableWindow
{
	constructor(pos_x, pos_y)
	{
		super("Inventories", pos_x, pos_y);
		super.window_kind = "Viewer Inventories";

		this.e_window_root.style.minWidth = "360px";
		this.e_window_root.style.minHeight = "360px";

		this.hide_content_while_dragging = true;

		this.sortBy = "";
		this.sortArrow = "↧";
		this.sortDescending = false;
		this.useImperialWeight = false;

		this.table_viewers = new TableListView();
		this.table_viewers.searchMethod = (entry, searchString) => entry.username.toLowerCase().includes(searchString);
		this.RegisterViewerTableColumns();

		this.table_inventory = new TableListView();
		this.table_inventory.searchMethod = (entry, searchString) => entry.name.toLowerCase().includes(searchString);
		this.RegisterInventoryTableColumns();

		this.CreateContentContainer();

		this.SetTitle("Inventories");
		this.SetIcon("inbox");

		this.e_viewers = [];
		this.targetViewerIndex = -1;
		this.targetViewer = {};

		this.e_viewer_info = {};
		this.e_viewer_info_scrollview = {};

		this.e_viewer_list_container = document.createElement("div");
		this.e_viewer_list_container.className = "inventory-window-content";
		this.e_content.appendChild(this.e_viewer_list_container);


		var e_section_title = document.createElement("div");
		e_section_title.className = "window-section-title";
		e_section_title.innerText = "Viewers";
		this.e_viewer_list_container.appendChild(e_section_title);

		//this.e_viewer_list = document.createElement("div");
		//this.e_viewer_list.className = "inventory-list-item";
		//this.e_viewer_list_container.appendChild(this.e_viewer_list);

		this.table_viewers.CreateRoot(this.e_viewer_list_container);
		this.RefreshViewerList();

		this.CreateAddViewerButton();
	}

	stackedValueColumnContentProvider =
		(e_parent, column, entry, key) => 
		{
			return addElement(
				"div", "tablelist-row-item", e_parent, null,
				x =>
				{
					if (entry && key in entry)
					{
						let valstr1 = '';
						if (column.toStringMethod) valstr1 = column.toStringMethod(entry[key]);
						else valstr1 = entry[key];

						if (entry.count < 2)
						{
							x.innerHTML = valstr1;
						}
						else
						{
							let valstr2 = '';
							if (column.toStringMethod) valstr2 = column.toStringMethod(entry[key] * entry.count);
							else valstr2 = entry[key] * entry.count;

							const subValueSpan = '<span style="font-weight:normal;font-style:italic;font-size: 0.6825rem;padding-right:1rem;opacity:60%">';
							x.innerHTML = subValueSpan + valstr1 + '</span>' + valstr2;
						}
					}
					else
					{
						x.innerHTML = '-';
					}
					if (column.width) x.style.width = column.width;
					if (column.fixedWidth) x.style.flexGrow = '0.0';
					if (column.textAlign) x.style.textAlign = column.textAlign;
					if (column.fontSize) x.style.fontSize = column.fontSize;
					if (column.tooltipMethod) GlobalTooltip.RegisterReceiver(x, column.tooltipMethod(entry));
				}
			);
		};

	totalWeightColumnContentProvider =
		(e_parent, column, entry, key) => 
		{
			return addElement(
				"div", "tablelist-row-item", e_parent, null,
				x =>
				{
					if (entry)
					{
						let str = ViewerInventory.GetTotalWeight(entry);
						x.innerHTML = column.toStringMethod ? column.toStringMethod(str) : str;
					}
					else
					{
						x.innerHTML = '???';
					}
					if (column.width) x.style.width = column.width;
					if (column.fixedWidth) x.style.flexGrow = '0.0';
					if (column.textAlign) x.style.textAlign = column.textAlign;
					if (column.fontSize) x.style.fontSize = column.fontSize;
					if (column.tooltipMethod) GlobalTooltip.RegisterReceiver(x, column.tooltipMethod(entry));
				}
			);
		};

	totalValueColumnContentProvider =
		(e_parent, column, entry, key) => 
		{
			return addElement(
				"div", "tablelist-row-item", e_parent, null,
				x =>
				{
					if (entry)
					{
						let str = ViewerInventory.GetTotalTradeValue(entry);
						x.innerHTML = column.toStringMethod ? column.toStringMethod(str) : str;
					}
					else
					{
						x.innerHTML = '???';
					}
					if (column.width) x.style.width = column.width;
					if (column.fixedWidth) x.style.flexGrow = '0.0';
					if (column.textAlign) x.style.textAlign = column.textAlign;
					if (column.fontSize) x.style.fontSize = column.fontSize;
					if (column.tooltipMethod) GlobalTooltip.RegisterReceiver(x, column.tooltipMethod(entry));
				}
			);
		};

	CompareByCount = (a, b) => this.OrCompareByName(b.count - a.count, a, b);
	CompareByValue = (a, b) => this.OrCompareByName(b.tradeValue * b.count - a.tradeValue * a.count, a, b);
	CompareByCategory = (a, b) => this.OrCompareByName((b.category ?? '').localeCompare(a.category ?? ''), a, b);
	CompareByWeight = (a, b) => this.OrCompareByName(b.weight * b.count - a.weight * a.count, a, b);
	CompareByName = (a, b) => b.name.localeCompare(a.name);
	OrCompareByName = (c, a, b) => c === 0 ? b.name.localeCompare(a.name) : c;

	RegisterViewerTableColumns()
	{
		this.table_viewers.ClearColumns();

		let col_username = this.table_viewers.RegisterColumn('username', "Username", (a, b) => b.username.localeCompare(a.username));
		col_username.buttonMethod = entry => this.StartViewingViewer(ViewerInventoryManager.IndexOfInventory(entry.viewerSource, entry.username));
		col_username.default_descending = true;
		col_username.textAlign = 'left';
		col_username.width = '6rem';

		let col_totalWeight = this.table_viewers.RegisterColumn(
			'total_weight', "Total Weight", ViewerInventory.CompareByTotalWeight, TableListView.GetWeightStr,
			this.totalWeightColumnContentProvider
		);
		col_totalWeight.textAlign = 'right';
		col_totalWeight.fixedWidth = true;
		col_totalWeight.width = '6rem';

		let col_totalValue = this.table_viewers.RegisterColumn(
			'total_value', "Total Value", ViewerInventory.CompareByTotalTradeValue, TableListView.GetValueStr,
			this.totalValueColumnContentProvider
		);
		col_totalValue.textAlign = 'right';
		col_totalValue.fixedWidth = true;
		col_totalValue.width = '6rem';

		this.table_viewers.RegisterQuickFilter('workspaces', entry => entry.category && entry.category.indexOf('misc') > -1, 'blueviolet', 'Misc');
	}

	RegisterInventoryTableColumns()
	{
		this.table_inventory.ClearColumns();

		let col_count = this.table_inventory.RegisterColumn('count', "Count", this.CompareByCount);
		col_count.default_descending = true;
		col_count.textAlign = 'right';
		col_count.fixedWidth = true;
		col_count.width = '3.2rem';

		let col_name = this.table_inventory.RegisterColumn('name', "Name", this.CompareByName);
		col_name.default_descending = true;
		col_name.textAlign = 'left';
		col_name.width = '4rem';

		let col_weight = this.table_inventory.RegisterColumn('weight', "Weight", this.CompareByWeight, TableListView.GetWeightStr, this.stackedValueColumnContentProvider);
		col_weight.textAlign = 'right';
		col_weight.width = '3rem';

		let col_value = this.table_inventory.RegisterColumn('tradeValue', "Value", this.CompareByValue, TableListView.GetValueStr, this.stackedValueColumnContentProvider);
		col_value.textAlign = 'right';
		col_value.width = '3rem';

		let col_category = this.table_inventory.RegisterColumn('category', "Category", this.CompareByCategory);
		col_category.textAlign = 'center';
		col_category.width = '4rem';

		let col_take = this.table_inventory.RegisterColumn('item_remove', "", null, null, TableListViewColumn.iconButtonContentProvider);
		col_take.buttonIcon = 'exposure_neg_1';
		col_take.buttonColor = '#500';
		col_take.fontSize = '0.6rem';
		col_take.textAlign = 'center';
		col_take.fixedWidth = true;
		col_take.width = '2rem';
		col_take.tooltipMethod = entry => "Remove " + entry.name;
		col_take.buttonMethod = entry =>
		{
			ViewerInventoryManager.TryRemoveItemByName(this.targetViewerIndex, entry.name);
			this.RecreateViewerInfoContent();
		};

		let col_add = this.table_inventory.RegisterColumn('item_add', "", null, null, TableListViewColumn.iconButtonContentProvider);
		col_add.buttonIcon = 'exposure_plus_1';
		col_add.buttonColor = '#050';
		col_add.fontSize = '0.6rem';
		col_add.textAlign = 'center';
		col_add.fixedWidth = true;
		col_add.width = '2rem';
		col_add.tooltipMethod = entry => "Add " + entry.name;
		col_add.buttonMethod = entry =>
		{
			ViewerInventoryManager.TryAddItemByName(this.targetViewerIndex, entry.name);
			this.RecreateViewerInfoContent();
		};

		this.table_inventory.RegisterQuickFilter('plumbing', entry => entry.category && entry.category.indexOf('tool') > -1, 'crimson', 'Tools');
		this.table_inventory.RegisterQuickFilter('shield', entry => entry.category && entry.category.indexOf('clothing') > -1, 'gold', 'Clothing');
		this.table_inventory.RegisterQuickFilter('egg', entry => entry.category && entry.category.indexOf('ingredient') > -1, 'lightgreen', 'Ingredients');
		this.table_inventory.RegisterQuickFilter('fastfood', entry => entry.category && entry.category.indexOf('food') > -1, 'burlywood', 'Food');
		this.table_inventory.RegisterQuickFilter('workspaces', entry => entry.category && entry.category.indexOf('misc') > -1, 'blueviolet', 'Misc');
		this.table_inventory.RegisterQuickFilter('savings', entry => entry.category && entry.category.indexOf('currency') > -1, 'hotpink', 'Currency');
		this.table_inventory.RegisterQuickFilter('pets', entry => entry.category && entry.category.indexOf('creature') > -1, 'orange', 'Creatures');
	}

	RefreshViewerListData()
	{
		let viewer_data = [];
		for (let ii = 0; ii < ViewerInventoryManager.inventories.length; ii++) 
		{
			const inv = ViewerInventoryManager.inventories[ii];
			viewer_data.push(inv);
		}
		this.table_viewers.SetData(viewer_data);
	}

	RefreshInventoryListData()
	{
		let slot_data = [];
		for (let ii = 0; ii < this.targetViewer.itemSlots.length; ii++) 
		{
			const itemSlot = this.targetViewer.itemSlots[ii];
			let slotData = { count: itemSlot.count };
			for (const prop in itemSlot.item)
			{
				slotData[prop] = itemSlot.item[prop];
			}
			slot_data.push(slotData);
		}
		this.table_inventory.SetData(slot_data);
	}

	CreateAddViewerButton()
	{
		this.e_add_user_root = document.createElement('div');
		this.e_add_user_root.style.display = 'flex';
		this.e_add_user_root.style.flexDirection = 'row';
		this.e_add_user_root.style.alignItems = 'center';
		this.e_add_user_root.style.justifyContent = 'center';
		this.e_add_user_root.style.justifyItems = 'center';
		this.e_add_user_root.style.lineHeight = "2.5rem";
		this.e_add_user_root.style.height = "2.5rem";
		this.e_add_user_root.style.fontSize = "0.8rem";
		this.e_add_user_root.style.paddingLeft = '0.5rem';
		this.e_add_user_root.style.paddingRight = '0.5rem';

		this.e_field_source = document.createElement('input');
		this.e_field_source.type = "text";
		this.e_field_source.value = "";
		this.e_field_source.style.width = "12rem";
		this.e_field_source.style.height = "1.8rem";
		this.e_field_source.style.textAlign = "center";
		this.e_field_source.style.flexGrow = "0.0";
		this.e_field_source.style.flexShrink = "0.0";
		this.e_field_source.placeholder = "Viewer Source ( twitch / kick )";
		this.e_add_user_root.appendChild(this.e_field_source);

		this.e_field_username = document.createElement('input');
		this.e_field_username.type = 'text';
		this.e_field_username.spellcheck = false;
		this.e_field_username.value = '';
		this.e_field_username.placeholder = 'Viewer Username';
		this.e_field_username.style.height = "1.8rem";
		this.e_field_username.style.flexGrow = "1.0";
		this.e_field_username.style.flexShrink = "1.0";
		this.e_field_username.style.width = "7rem";
		this.e_add_user_root.appendChild(this.e_field_username);

		this.e_btn_add = document.createElement("div");
		this.e_btn_add.className = "window-content-button"
		this.e_btn_add.innerText = "ADD";
		this.e_btn_add.style.width = "4rem";
		this.e_btn_add.style.flexGrow = "0.0";
		this.e_btn_add.style.flexShrink = "0.0";
		this.e_btn_add.style.backgroundColor = "#00ff0020";
		this.e_btn_add.style.color = "#00ff00";
		this.e_btn_add.addEventListener("click",
			() =>
			{
				ViewerInventoryManager.EnsureInventory(this.e_field_source.value, this.e_field_username.value);
				this.RefreshViewerList();
			}
		);

		var e_plus = document.createElement("span");
		e_plus.innerText = "+";
		this.e_btn_add.appendChild(e_plus);

		this.e_add_user_root.appendChild(this.e_btn_add);

		this.e_viewer_list_container.appendChild(this.e_add_user_root);
	}

	RefreshViewerList()
	{
		this.RefreshViewerListData();
		this.table_viewers.PopulateView();
	}

	ClearViewerList()
	{
		if (this.e_viewers.length < 1) return;
		for (var ii = 0; ii < this.e_viewers.length; ii++)
		{
			var v = this.e_viewers[ii];
			GlobalTooltip.ReleaseAllReceivers(v);
			v.remove();
		}
		this.e_viewers = [];
	}

	StartViewingViewer(viewerIndex)
	{
		this.targetViewerIndex = viewerIndex;
		this.targetViewer = ViewerInventoryManager.inventories[viewerIndex];

		this.e_viewer_info = document.createElement("div");
		this.e_viewer_info.className = "viewer-info-overlay";
		this.e_viewer_info.style.display = "flex";
		this.e_viewer_info.style.flexDirection = "column";
		this.e_viewer_info.style.overflowX = "hidden";
		this.e_viewer_info.style.overflowY = "hidden";

		this.RecreateViewerInfoContent();

		this.e_content.appendChild(this.e_viewer_info);

		this.e_viewer_list_container.style.filter = "blur(6px)";
	}

	RecreateViewerInfoContent()
	{
		GlobalTooltip.ReleaseAllReceivers(this.e_viewer_info);
		this.e_viewer_info.innerHTML = "";

		var e_back = document.createElement("div");
		e_back.className = "window-content-button";
		e_back.innerText = "Go Back";
		e_back.addEventListener("click", () => { this.StopViewingViewer(); });
		var e_arrow = document.createElement("span");
		e_arrow.innerText = "➜";
		e_arrow.style.rotate = "180deg";
		e_arrow.style.translate = "0% -100%";
		e_back.appendChild(e_arrow);
		this.e_viewer_info.appendChild(e_back);

		var e_section_title = document.createElement("div");
		e_section_title.className = "window-section-title";
		e_section_title.style.borderBottom = "unset";
		e_section_title.style.marginBottom = "0";
		e_section_title.style.marginTop = "0";
		e_section_title.innerHTML = "Inventory of " + this.targetViewer.username + "<span>( " + this.targetViewer.viewerSource + " )</span>";
		this.e_viewer_info.appendChild(e_section_title);


		this.RefreshInventoryListData();
		this.table_inventory.CreateRoot(this.e_viewer_info);

		this.CreateItemAddUI();
		this.CreateItemListTotals();

		window.setTimeout(() => this.table_inventory.PopulateView(), 20);
	}

	GetItemListColumnText(columnName = 'Column')
	{
		let colText = columnName;
		if (this.sortBy == columnName)
		{
			colText = this.sortArrow + ' ' + colText + ' ' + this.sortArrow;
		}
		return colText;
	}

	CreateItemListTotal(e_columns = {}, columnName = 'Column', justifyContent = 'center', width = '5rem')
	{
		return addElement("div", "", e_columns, columnName, e =>
		{
			e.style.display = "flex";
			e.style.justifyContent = justifyContent;
			e.style.flexGrow = '1.0';
			e.style.width = width;
		});
	}

	UpdateItemListColumnText(e_col = {}, text = '')
	{
		if (e_col)
		{
			e_col.innerText = this.GetItemListColumnText(text);
			if (text == this.sortBy) e_col.style.color = this.sortDescending ? 'orange' : 'cyan';
			else e_col.style.color = 'unset';
		}
	}

	UpdateItemListColumns()
	{
		this.UpdateItemListColumnText(this.e_list_column_name, 'Item Name');
		this.UpdateItemListColumnText(this.e_list_column_totalweight, 'Weight');
		this.UpdateItemListColumnText(this.e_list_column_totalvalue, 'Value');
	}

	CreateItemListTotals()
	{
		const totals_borderStyle = 'solid';
		const totals_borderColor = '#575757';
		const totals_borderWidth_top = '2px 2px 0px 2px';
		const totals_borderWidth_bottom = '0px 2px 2px 2px';

		let e_totals = addElement("div", "viewer-item-row", this.e_viewer_info, null, e => e.style.marginTop = '0.5rem');
		e_totals.style.borderStyle = totals_borderStyle;
		e_totals.style.borderWidth = totals_borderWidth_top;
		e_totals.style.borderColor = totals_borderColor;

		this.e_list_totalweight = this.CreateItemListTotal(e_totals, 'Total Weight');
		this.e_list_totalvalue = this.CreateItemListTotal(e_totals, 'Total Value');

		let e_total_values = addElement("div", "viewer-item-row ", this.e_viewer_info, null);
		this.e_list_totalweight_val = this.CreateItemListTotal(e_total_values, TableListView.GetWeightStr(ViewerInventory.GetTotalWeight(this.targetViewer)));
		this.e_list_totalvalue_val = this.CreateItemListTotal(e_total_values, TableListView.GetValueStr(ViewerInventory.GetTotalTradeValue(this.targetViewer)));
		e_total_values.style.borderStyle = totals_borderStyle;
		e_total_values.style.borderWidth = totals_borderWidth_bottom;
		e_total_values.style.borderColor = totals_borderColor;
	}

	CreateItemAddUI()
	{
		let e_add_item = addElement("div", "viewer-item-row", this.e_viewer_info, null, e => { e.style.margin = '0.5rem'; e.style.height = '2rem'; e.style.lineHeight = '2rem'; });

		this.e_add_item_input = addElement('input', null, e_add_item, null, e => { e.type = 'text'; e.placeholder = 'Search by name...'; e.style.width = '3rem'; e.style.flexGrow = '1.0'; });
		this.e_add_item_input.style.textAlign = 'center';

		this.e_add_item_match_name = addElement('div', null, e_add_item, null, e => { e.innerText = '---'; e.style.textAlign = 'center'; e.style.width = '5rem'; e.style.flexGrow = '1.0'; });

		this.e_add_item_btn = addElement('button', 'window-content-button', e_add_item, null, e => e.innerText = 'Add Item');
		this.e_add_item_btn.style.pointerEvents = 'none';
		this.e_add_item_btn.style.opacity = '20%';

		this.e_add_item_input.addEventListener(
			'change',
			x =>
			{
				let searchString = this.e_add_item_input.value.toLowerCase().trim();
				let matchingItem = ItemStoreManager.GetFilteredItemFirst(searchString);
				if (matchingItem)
				{
					this.e_add_item_match_name.innerText = matchingItem.name;
					this.e_add_item_match_name.style.color = "lightgreen";
					this.e_add_item_btn.style.pointerEvents = 'all';
					this.e_add_item_btn.style.opacity = '100%';
				}
				else
				{
					this.e_add_item_match_name.style.color = "grey";
					this.e_add_item_match_name.innerText = '---';
					this.e_add_item_btn.style.pointerEvents = 'none';
					this.e_add_item_btn.style.opacity = '20%';
				}
			}
		);

		this.e_add_item_btn.addEventListener(
			'click',
			x =>
			{
				let searchString = this.e_add_item_input.value.toLowerCase().trim();
				let matchingItem = ItemStoreManager.GetFilteredItemFirst(searchString);
				if (matchingItem) 
				{
					ViewerInventoryManager.AddItemCount(this.targetViewer.viewerSource, this.targetViewer.username, matchingItem, 1);
					this.RefreshInventoryListData();
					this.table_inventory.PopulateView();
				}
			}
		);
	}

	StopViewingViewer()
	{
		this.table_inventory.RemoveRoot();

		this.targetViewer = {};
		this.targetViewerIndex = -1;
		this.targetBag = {};
		this.targetBagIndex = -1;

		this.e_viewer_list_container.style.filter = "none";
		GlobalTooltip.ReleaseAllReceivers(this.e_viewer_info);
		this.e_viewer_info.remove();
		this.e_viewer_info = {};

		this.RefreshViewerList();
	}

	GetItemSlotString(itemSlot = {})
	{
		let slotStr = itemSlot.item.name;

		if (itemSlot.count > 1)
		{
			if (slotStr.endsWith("y"))
			{
				slotStr = slotStr.substring(0, slotStr.length - 1) + "ies";
			}
			else if (slotStr.endsWith("o"))
			{
				slotStr += "es";
			}
			else if (slotStr.endsWith("s"))
			{
			}
			else
			{
				if (slotStr.endsWith("x") || slotStr.endsWith("z"))
					slotStr += "e";
				slotStr += "s";
			}
		}

		return slotStr;
	}

	onWindowResize()
	{
		if (this.resize_timeout) this.resize_timeout.ExtendTimer();
		else this.resize_timeout = new RunningTimeout(
			() =>
			{
				if (this.table_viewers.e_root) this.table_viewers.PopulateView();
				if (this.table_inventory.e_root) this.table_inventory.PopulateView();
			}, 0.03, true, 20
		);
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: "Viewer Inventories",
		icon: "inbox",
		icon_color: 'cyan',
		desc: "View who has what and how much of it!",
		model: (x, y) => { return new ViewerInventoryWindow(x, y); },
		shortcutKey: 'i'
	}
);
