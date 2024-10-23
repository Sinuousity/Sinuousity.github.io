import { ItemStoreManager } from "./ItemStoreManager.js";
import { StoredObject } from "./storedobject.js";


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

	RemoveAll()
	{
		this.items = [];
		this.MarkDirty();
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

	GetFilteredItems(searchString = '', searchDescription = false)
	{
		if (searchString === '') return undefined;
		return this.items.filter(x => x.name.toLowerCase().includes(searchString) || (searchDescription && x.description.toLowerCase().includes(searchString)));
	}

	GetFilteredItemFirst(searchString = '', searchDescription = false)
	{
		if (searchString === '') return undefined;
		return this.items.find(x => x.name.toLowerCase().includes(searchString) || (searchDescription && x.description.toLowerCase().includes(searchString)));
	}
}
