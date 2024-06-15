console.info("[ +Module ] Lookup");

export class Lookup
{
	constructor()
	{
		this.keys = [];
		this.values = [];
		this.length = 0;
	}

	IndexOf(key) { return this.keys.indexOf(key); }
	Contains(key) { return this.IndexOf(key) > -1; }
	Get(key)
	{
		var id = this.IndexOf(key);
		if (id < 0) return null;
		return this.values[id];
	}
	Set(key, value)
	{
		var id = this.IndexOf(key);
		if (id < 0) 
		{
			this.keys.push(key);
			this.values.push(value);
			this.length += 1;
			return;
		}
		this.values[id] = value;
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