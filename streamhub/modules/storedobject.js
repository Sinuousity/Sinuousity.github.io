import { EventSource } from "./eventsource.js";
import { RunningTimeout } from "./runningtimeout.js";
import { SaveIndicator } from "./saveindicator.js";
console.info("[ +Module ] Stored Objects");

export class StoredObject
{
	onStored = new EventSource();
	onRestored = new EventSource();
	onDirtied = new EventSource();

	constructor(storeDelaySeconds = 0.5, autostart = false)
	{
		this.storeKey = "";
		this.storeTimeout = new RunningTimeout(() => { this.Store(); }, storeDelaySeconds, autostart, 70);
		this.logJSON = false;
	}

	GetState() { return {}; }
	ApplyState() { }

	ExtendTimer()
	{
		this.onDirtied.Invoke();
		this.storeTimeout.ExtendTimer();
	}

	Store()
	{
		this.modified = false;
		this.modifiedTimer = 0.0;

		if (this.storeKey == "")
		{
			console.warn("empty store key! failed to store object: " + this);
			return;
		}
		localStorage.setItem(this.storeKey, JSON.stringify(this.GetState()));

		SaveIndicator.AddShowTime();
		this.AfterStore();
		this.onStored.Invoke();
	}
	AfterStore() { }

	Restore()
	{
		this.modified = false;
		this.modifiedTimer = 0.0;

		if (this.storeKey == "")
		{
			console.warn("empty store key! failed to restore object: " + this);
			return;
		}

		var stored_json = localStorage.getItem(this.storeKey);
		if (!stored_json) return;
		if (this.logJSON === true) console.info("JSON LOAD: " + stored_json);
		var storedObject = JSON.parse(stored_json);
		if (storedObject == null) return;
		this.ApplyState(storedObject);
		this.AfterRestore();
		this.onRestored.Invoke();
	}
	AfterRestore() { }
}
