import { WindowManager } from "./windowmanager.js";
import "./storedobject.js";
import { ViewerInventoryManager } from "./viewerinventory.js";
import { Rewards } from "./rewards.js";

import { ItemStoreBase } from "./ItemStoreBase.js";
import { ItemStoreWindowBase } from "./ItemStoreWindowBase.js";

console.info("[ +Module ] Item Library");

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
		this.defaultListPath = './files/default_item_library_items.json';
		this.PrepareItemStoreWindowContent();
	}
}




WindowManager.instance.windowTypes.push(
	{
		key: ItemLibraryWindow.window_kind,
		icon: "toys",
		icon_color: 'cyan',
		desc: "Create, edit, or remove items from the Item Library!",
		model: (x, y) => { return new ItemLibraryWindow(x, y); },
		wip: true,
		shortcutKey: 'l'
	}
);

Rewards.Register(
	"Add Random Item",
	(user, options) =>
	{
		if (options.minTradeValue) 
		{
			while (true)
			{
				let itemId = Math.round(Math.random() * (ItemLibrary.builtIn.items.length - 1));
				let item = ItemLibrary.builtIn.items[itemId];
				let itemTradeValue = item.tradeValue ?? -1;
				if (itemTradeValue >= options.minTradeValue)
				{
					ViewerInventoryManager.AddItemCount(user.platform, user.username, item, 1);
					return;
				}
			}
		}
		else 
		{
			let itemId = Math.round(Math.random() * (ItemLibrary.builtIn.items.length - 1));
			let item = ItemLibrary.builtIn.items[itemId];
			ViewerInventoryManager.AddItemCount(user.platform, user.username, item, 1);
		}
	},
	'Add a random item from the Item Library to the inventory of the winner'
);