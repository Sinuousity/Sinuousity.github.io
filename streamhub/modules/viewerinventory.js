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
}

export class ViewerInventory
{
	constructor(viewerSource, username, itemSlots = [])
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

	static IndexOfInventory(viewerSource, username)
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



	static UserMatch(inv, viewerSource, username)
	{
		return inv.viewerSource == viewerSource && inv.username == username;
	}

	static IndexOfItem(inv, item)
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

	static HasItem(inv, item)
	{
		return ViewerInventoryManager.IndexOfItem(inv, item) > -1;
	}

	static GetItemCount(inv, item)
	{
		var id = ViewerInventoryManager.IndexOfItem(inv, item);
		if (id < 0) return 0;
		if (inv.itemSlots[id].count) return inv.itemSlots[id].count;
		return 1;
	}

	static AddItemCount(viewerSource, username, item, count = 1)
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

		this.CreateContentContainer();

		this.SetTitle("Inventories");
		this.SetIcon("inbox");

		this.e_viewers = [];
		this.targetViewerIndex = -1;
		this.targetViewer = {};

		this.e_viewer_info = {};

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
			e_summary.innerHTML = `<span>${totalItemCount} items</span>|<span>${totalItemWeight}kg</span>|<span>${totalItemValue}gp</span>`;

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

		this.RecreateViewerInfoContent();

		this.e_content.appendChild(this.e_viewer_info);

		this.e_viewer_list_container.style.filter = "blur(6px)";
	}

	RecreateViewerInfoContent()
	{
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
		e_section_title.innerHTML = "Inventory of " + this.targetViewer.username + "<span>( " + this.targetViewer.viewerSource + " )</span>";
		this.e_viewer_info.appendChild(e_section_title);

		for (var ii = 0; ii < this.targetViewer.itemSlots.length; ii++)
		{
			const item_id = ii;
			this.CreateItemRow(item_id, this.targetViewer.itemSlots[item_id]);
		}
	}

	StopViewingViewer()
	{
		this.targetViewer = {};
		this.targetViewerIndex = -1;
		this.targetBag = {};
		this.targetBagIndex = -1;

		this.e_viewer_list_container.style.filter = "none";
		this.e_viewer_info.remove();
		this.e_viewer_info = {};

		this.RefreshViewerList();
	}

	CreateItemRow(item_id = 0, itemSlot = {})
	{
		var e_item_info = document.createElement("div");
		e_item_info.className = "viewer-item-row";
		if (itemSlot.item)
		{

			e_item_info.innerText = itemSlot.count + " " + itemSlot.item.name;
			if (itemSlot.count > 1) e_item_info.innerText += "s";
			if (itemSlot.item.weight) e_item_info.innerText += ` | ${itemSlot.item.weight} kg`;
			if (itemSlot.item.tradeValue) e_item_info.innerText += ` | ${itemSlot.item.tradeValue} gp`;
		}
		else
			e_item_info.innerText = "NULL ITEM :?";


		var e_btn_delete = document.createElement("div");
		e_btn_delete.className = "window-content-button viewer-item-button";
		e_btn_delete.style.backgroundColor = "#ff000030";
		e_btn_delete.style.outlineColor = "#ff0000";
		e_btn_delete.innerText = "-1";
		e_btn_delete.addEventListener("click", () =>
		{
			ViewerInventoryManager.TryRemoveItem(this.targetViewerIndex, item_id);
			this.RecreateViewerInfoContent();
		});
		e_item_info.appendChild(e_btn_delete);

		this.e_viewer_info.appendChild(e_item_info);
	}

	onWindowShow() { };
	onWindowClose() { };
}

WindowManager.instance.windowTypes.push(
	{
		key: "Viewer Inventories",
		icon: "inbox",
		model: (x, y) => { return new ViewerInventoryWindow(x, y); },
		wip: true
	}
);