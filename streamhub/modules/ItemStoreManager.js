import { Lookup } from "./lookup.js";


export class ItemStoreManager
{
	static stores = new Lookup();

	static RegisterStore(storeKey = "", itemStore = {})
	{
		if (typeof storeKey != 'string') return;
		if (storeKey == "") return;
		ItemStoreManager.stores.Set(storeKey, itemStore);
	}

	static GetFilteredItems(searchString = '', searchDescription = false)
	{
		if (searchString === '') return undefined;

		let found_items = [];
		for (let ii = 0; ii < ItemStoreManager.stores.length; ii++)
		{
			found_items.push(ItemStoreManager.stores[ii].GetFilteredItems(searchString, searchDescription));
		}
		return found_items;
	}

	static GetFilteredItemFirst(searchString = '', searchDescription = false)
	{
		if (searchString === '') return undefined;

		for (let ii = 0; ii < ItemStoreManager.stores.keys.length; ii++)
		{
			let this_store = ItemStoreManager.stores.Get(ItemStoreManager.stores.keys[ii]);
			let found_item = this_store.GetFilteredItemFirst(searchString, searchDescription);
			if (found_item) return found_item;
		}
		return undefined;
	}
}
