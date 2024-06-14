console.info("[ +Module ] Lookup");

export class Lookup
{
	constructor()
	{
		this.keys = [];
		this.values = [];
		this.length = 0;
	}

	Contains(key) { return this.keys.includes(key); }
	Get(key) { return this.values[this.keys.indexOf(key)]; }

	Add(key, value)
	{
		this.keys.push(key);
		this.values.push(value);
		this.length += 1;
	}

	Remove(key) { return RemoveAt(this.keys.indexOf(key)); }

	RemoveAt(id)
	{
		if (key_index < 0 || key_index >= length) return false;
		this.length -= 1;
		return this.values.splice(id, 1)[0];
	}

	KeepLast(count)
	{
		if (this.keys.length <= count) return;

		var toTrim = this.keys.length - count;
		this.keys.splice(0, toTrim);
		this.values.splice(0, toTrim);
		this.length = count;
	}

	Clear()
	{
		this.keys = [];
		this.values = [];
		this.length = 0;
	}
}