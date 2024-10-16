import { addElement } from "../hubscript.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { ItemLibrary } from "./itemlibrary.js";
import { StoredObject } from "./storedobject.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

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
		if (itemSlot.item.weight) return itemSlot.item.weight;
		return 0.0;
	}

	static GetItemValue(itemSlot = {})
	{
		if (itemSlot.item.tradeValue) return itemSlot.item.tradeValue;
		return 0.0;
	}

	static GetTotalWeight(itemSlot = {})
	{
		if (itemSlot.item.weight) return itemSlot.count * itemSlot.item.weight;
		return 0.0;
	}

	static GetTotalValue(itemSlot = {})
	{
		if (itemSlot.item.tradeValue) return itemSlot.count * itemSlot.item.tradeValue;
		return 0.0;
	}

	static CompareName(a = {}, b = {}) { return b.item.name.localeCompare(a.item.name); }

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



	static UserMatch(inv = {}, viewerSource = "", username = "")
	{
		return inv.viewerSource == viewerSource && inv.username == username;
	}

	static IndexOfItem(inv = {}, item = {})
	{
		if (typeof item == 'string')
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

	static AddItemCount(viewerSource = "", username = "", item = {}, count = 1)
	{
		var inventoryId = ViewerInventoryManager.IndexOfInventory(viewerSource, username);
		if (inventoryId < 0)
		{
			ViewerInventoryManager.inventories.push(new ViewerInventory(viewerSource, username, [new ViewerInventorySlot(item, count)]));
			ViewerInventoryManager.EmitChange();
			return;
		}

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
		this.e_window_root.style.minHeight = "250px";

		this.sortBy = "";
		this.sortArrow = "↧";
		this.sortDescending = false;
		this.useImperialWeight = false;

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

		//this.CreateAddViewerButton();

		var e_section_title = document.createElement("div");
		e_section_title.className = "window-section-title";
		e_section_title.innerText = "Viewers";
		this.e_viewer_list_container.appendChild(e_section_title);

		this.e_viewer_list = document.createElement("div");
		this.e_viewer_list.className = "inventory-list-item";
		this.e_viewer_list_container.appendChild(this.e_viewer_list);
		this.RefreshViewerList();
	}

	PrettyNum(value = 0)
	{
		var valueRounded = Math.round(value * 100);
		return valueRounded / 100;
	}

	GetValueStr(value = 0.0)
	{
		if (value > 1_000_000) return this.PrettyNum(value * 0.001 * 0.001).toLocaleString() + "M gp";
		if (value > 1_000) return this.PrettyNum(value * 0.001).toLocaleString() + "k gp";
		return this.PrettyNum(value).toLocaleString() + " gp";
	}

	GetWeightStr(weight = 0.0)
	{
		if (this.useImperialWeight === true) return this.GetWeightStrImperial(weight);
		return this.GetWeightStrMetric(weight);
	}

	GetWeightStrMetric(weight = 0.0)
	{
		const kilogram = 1.0;
		const gram = 0.001;
		const milligram = gram * gram;
		const megagram = 1000;
		const gigagram = megagram * megagram;

		if (weight <= 0.0) return '0 mg';
		if (weight < milligram * 0.01) return `< 0.01 mg`;
		if (weight < milligram) return `${this.PrettyNum(weight * gigagram)} mg`;
		if (weight < gram) return `${this.PrettyNum(weight * gigagram).toLocaleString()} mg`;
		if (weight < kilogram) return `${this.PrettyNum(weight * megagram).toLocaleString()} g`;
		if (weight < megagram) return `${this.PrettyNum(weight).toLocaleString()} kg`;
		if (weight < gigagram) return `${this.PrettyNum(weight * gram).toLocaleString()} Mg`;
		return `${this.PrettyNum(weight * milligram).toLocaleString()} Gg`;
	}

	GetWeightStrImperial(weight = 0.0)
	{
		const pound = 1.0;
		const ounce = 1.0 / 16.0;
		const ton = 2240;
		const invton = 1.0 / ton;

		if (weight <= 0.0) return '0 oz';
		if (weight < ounce * 0.01) return `< 0.01 oz`;
		if (weight <= ounce) return `${this.PrettyNum(weight)} oz`;
		if (weight < pound) return `${this.PrettyNum(weight * ounce).toLocaleString()} oz`;
		if (weight < ton) return `${this.PrettyNum(weight).toLocaleString()} lb`;
		return `${this.PrettyNum(weight * invton).toLocaleString()} t`;
	}

	CreateAddViewerButton()
	{
		this.e_field_username = document.createElement("input");
		this.e_field_username.type = "text";
		this.e_field_username.spellcheck = false;
		this.e_field_username.value = "sinuousity";
		this.e_field_username.placeholder = "Username";
		this.e_field_username.style.borderRadius = "0.4rem 0.4rem 0rem 0rem";
		this.e_viewer_list_container.appendChild(this.e_field_username);

		this.e_field_source = document.createElement("input");
		this.e_field_source.type = "text";
		this.e_field_source.value = "twitch";
		this.e_field_source.style.borderRadius = "0";
		this.e_field_source.placeholder = "Source (e.g. 'twitch' or 'kick')";
		this.e_viewer_list_container.appendChild(this.e_field_source);

		this.e_field_itemName = document.createElement("input");
		this.e_field_itemName.type = "text";
		this.e_field_itemName.value = "apple";
		this.e_field_itemName.style.borderRadius = "0";
		this.e_field_itemName.placeholder = "Item Name";
		this.e_viewer_list_container.appendChild(this.e_field_itemName);

		this.e_field_weight = document.createElement("input");
		this.e_field_weight.type = "number";
		this.e_field_weight.value = 1.0;
		this.e_field_weight.step = 0.1;
		this.e_field_weight.style.borderRadius = "0";
		this.e_field_weight.name = "Weight (kg)";
		this.e_viewer_list_container.appendChild(this.e_field_weight);

		this.e_field_tradeValue = document.createElement("input");
		this.e_field_tradeValue.type = "number";
		this.e_field_tradeValue.value = 1.0;
		this.e_field_tradeValue.step = 0.1;
		this.e_field_tradeValue.style.borderRadius = "0";
		this.e_field_tradeValue.name = "Trade Value (gp)";
		this.e_viewer_list_container.appendChild(this.e_field_tradeValue);

		this.e_btn_add = document.createElement("div");
		this.e_btn_add.className = "inventory-list-item-button"
		this.e_btn_add.innerText = "ADD";
		this.e_btn_add.style.fontSize = "0.8rem";
		this.e_btn_add.style.lineHeight = "1.5rem";
		this.e_btn_add.style.height = "1.5rem";
		this.e_btn_add.style.backgroundColor = "#00ff0020";
		this.e_btn_add.style.borderRadius = "0rem 0rem 0.4rem 0.4rem";
		this.e_btn_add.style.color = "#00ff00";
		this.e_btn_add.addEventListener("click",
			() =>
			{
				ViewerInventoryManager.AddItemCount(
					this.e_field_source.value,
					this.e_field_username.value,
					{
						name: this.e_field_itemName.value,
						weight: this.e_field_weight.value,
						tradeValue: this.e_field_tradeValue.value,
					},
					1
				);
				this.RefreshViewerList();
			}
		);

		var e_plus = document.createElement("span");
		e_plus.innerText = "+";
		this.e_btn_add.appendChild(e_plus);

		this.e_viewer_list_container.appendChild(this.e_btn_add);
	}

	RefreshViewerList()
	{
		this.ClearViewerList();

		for (var ii = 0; ii < ViewerInventoryManager.inventories.length; ii++)
		{
			const viewerIndex = ii;
			var i = ViewerInventoryManager.inventories[ii];

			var totalItemCount = ViewerInventory.GetTotalItemCount(i);
			var totalItemWeight = ViewerInventory.GetTotalWeight(i);
			var totalItemValue = ViewerInventory.GetTotalTradeValue(i);

			var e_user = document.createElement("div");
			e_user.className = "window-content-button inventory-list-item-button";
			e_user.style.paddingBottom = "0.5rem";
			var styleColor = "white";
			switch (i.viewerSource)
			{
				case "twitch": styleColor = "#cc00ff"; break;
				case "kick": styleColor = "#00ff00"; break;
			}
			e_user.innerHTML = i.username + "<span style='color:" + styleColor + "'>(" + i.viewerSource + ")</span>";
			e_user.addEventListener("click", () => { this.StartViewingViewer(viewerIndex); });

			var e_summary = document.createElement("div");
			e_summary.className = "viewer-info-summary";
			e_summary.innerHTML = `<span>${totalItemCount} items</span>|<span>${this.GetWeightStr(totalItemWeight)}</span>|<span>${this.GetValueStr(totalItemValue)}</span>`;

			var e_arrow = document.createElement("span");
			e_arrow.innerText = "➜";

			e_user.appendChild(e_summary);
			e_user.appendChild(e_arrow);
			this.e_viewer_list.appendChild(e_user);
			this.e_viewers.push(e_user);
		}
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

		this.CreateItemListColumns();
		this.CreateItemListView();
		this.CreateItemAddUI();
		this.CreateItemListTotals();
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

	CreateItemListColumn(e_columns = {}, columnName = 'Column', justifyContent = 'center', width = '5rem', defaultDescending = false)
	{
		return addElement("div", "viewer-item-row-item", e_columns, this.GetItemListColumnText(columnName), e =>
		{
			e.style.display = "flex";
			e.style.justifyContent = justifyContent;
			e.style.flexGrow = '1.0';
			e.style.width = width;
			e.style.cursor = "pointer";
			e.addEventListener('click', e => this.SetSortBy(columnName, defaultDescending));
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

	CreateItemListColumns()
	{
		let e_columns = addElement("div", "viewer-item-row window-section-title", this.e_viewer_info, null);
		addElement("div", "viewer-item-row-item", e_columns, "", e =>
		{
			e.style.display = "flex";
			e.style.width = "2rem";
			e.style.flexGrow = "0.0";
		});
		this.e_list_column_name = this.CreateItemListColumn(e_columns, 'Item Name', 'left', '10rem', true);
		this.e_list_column_totalweight = this.CreateItemListColumn(e_columns, 'Weight');
		this.e_list_column_totalvalue = this.CreateItemListColumn(e_columns, 'Value');

		addElement("div", "viewer-item-row-item", e_columns, "", e =>
		{
			e.style.display = "flex";
			e.style.width = "1.7rem";
			e.style.flexGrow = "0.0";
		});

		this.UpdateItemListColumns();
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
		this.e_list_totalweight_val = this.CreateItemListTotal(e_total_values, this.GetWeightStr(ViewerInventory.GetTotalWeight(this.targetViewer)));
		this.e_list_totalvalue_val = this.CreateItemListTotal(e_total_values, this.GetValueStr(ViewerInventory.GetTotalTradeValue(this.targetViewer)));
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
				let matchingItem = ItemLibrary.builtIn.GetFilteredItemFirst(searchString);
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
				let matchingItem = ItemLibrary.builtIn.GetFilteredItemFirst(searchString);
				if (matchingItem) 
				{
					ViewerInventoryManager.AddItemCount(this.targetViewer.viewerSource, this.targetViewer.username, matchingItem, 1);
					this.PopulateItemList();
				}
			}
		);
	}

	SetSortBy(sortBy = '', defaultDescending = false)
	{
		if (sortBy == this.sortBy)
		{
			this.sortDescending = !this.sortDescending;
		}
		else
		{
			this.sortBy = sortBy;
			this.sortDescending = defaultDescending;
		}

		this.sortArrow = this.sortDescending ? '↧' : '↥';
		this.PopulateItemList();
		this.UpdateItemListColumns();
	}

	CreateItemListView()
	{
		this.e_viewer_info_scrollview = addElement(
			"div", null, this.e_viewer_info, null,
			e =>
			{
				e.style.overflowX = "hidden";
				e.style.overflowY = "scroll";
				e.style.flexGrow = "1.0";
				e.style.flexShrink = "1.0";
				e.style.borderTop = "solid #575757 2px";
				e.style.borderBottom = "solid #575757 2px";
			}
		);

		this.PopulateItemList();
	}

	PopulateItemList()
	{
		this.e_viewer_info_scrollview.innerText = '';

		let targetItemSlots = this.targetViewer.itemSlots;
		switch (this.sortBy)
		{
			case 'Item Name':
				targetItemSlots.sort(ViewerInventorySlot.CompareName);
				if (this.sortDescending) targetItemSlots.reverse();
				break;
			case 'Weight':
				targetItemSlots.sort(ViewerInventorySlot.CompareTotalWeight);
				if (this.sortDescending) targetItemSlots.reverse();
				break;
			case 'Value':
				targetItemSlots.sort(ViewerInventorySlot.CompareTotalValue);
				if (this.sortDescending) targetItemSlots.reverse();
				break;
		}

		for (let ii = 0; ii < targetItemSlots.length; ii++)
		{
			const item_id = ii;
			this.CreateItemRow(item_id, targetItemSlots[item_id]);
		}
	}

	StopViewingViewer()
	{
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

	AddItemRowLabel(e_parent, text = '')
	{
		return addElement(
			"div", "viewer-item-row-item", e_parent, '',
			e =>
			{
				e.innerHTML = text;
				e.style.justifyContent = "right";
				e.style.width = '5rem';
				e.style.flexGrow = "1.0";
			}
		);
	}

	CreateItemRow(item_id = 0, itemSlot = {})
	{
		let e_item_info = document.createElement("div");
		e_item_info.className = "viewer-item-row";
		if (itemSlot.item)
		{
			let e_slot_count = this.AddItemRowLabel(e_item_info, itemSlot.count);
			e_slot_count.style.width = '2rem';
			e_slot_count.style.flexGrow = '0.0';
			e_slot_count.style.pointerEvents = "none";

			addElement(
				"div", "viewer-item-row-item", e_item_info, this.GetItemSlotString(itemSlot),
				e =>
				{
					e.style.justifyContent = "left";
					e.style.width = "8rem";
				}
			);

			const subValueSpan = '<span style="font-weight:normal;font-style:italic;font-size: 0.6825rem;padding-right:1rem;opacity:60%">';

			let item_weight_ind = this.GetWeightStr(ViewerInventorySlot.GetItemWeight(itemSlot));
			if (itemSlot.count > 1)
			{
				let item_weight_tot = this.GetWeightStr(ViewerInventorySlot.GetTotalWeight(itemSlot));
				this.AddItemRowLabel(e_item_info, `${subValueSpan}${item_weight_ind}</span>${item_weight_tot}`);
			}
			else this.AddItemRowLabel(e_item_info, item_weight_ind);

			let str_value_item = this.GetValueStr(ViewerInventorySlot.GetItemValue(itemSlot));
			let str_value_slot = this.GetValueStr(ViewerInventorySlot.GetTotalValue(itemSlot));
			this.AddItemRowLabel(e_item_info, `${subValueSpan}${str_value_item}</span>${str_value_slot}`);
		}
		else
			e_item_info.innerText = "NULL ITEM :?";


		let e_btn_delete = addElement("div", "window-content-button viewer-item-button", e_item_info, "-1");
		e_btn_delete.style.backgroundColor = "#ff000030";
		e_btn_delete.style.outlineColor = "#f00";
		e_btn_delete.style.color = "#f55";
		e_btn_delete.addEventListener("click", () =>
		{
			ViewerInventoryManager.TryRemoveItem(this.targetViewerIndex, item_id);
			this.RecreateViewerInfoContent();
		});

		this.e_viewer_info_scrollview.appendChild(e_item_info);

		if (itemSlot.item) GlobalTooltip.RegisterReceiver(e_item_info, itemSlot.item.name, itemSlot.item.description);
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: "Viewer Inventories",
		icon: "inbox",
		desc: "View who has what and how much of it!",
		model: (x, y) => { return new ViewerInventoryWindow(x, y); },
		wip: true,
		shortcutKey: 'i'
	}
);
