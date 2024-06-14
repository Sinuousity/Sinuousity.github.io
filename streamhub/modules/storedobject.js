console.info("[ +Module ] Stored Objects");

class RunningTimeout
{
	constructor(completionAction, duration, start = false, msDeltaTime = 25)
	{
		this.duration = duration;
		this.completionAction = completionAction;
		this.msDeltaTime = msDeltaTime;
		this.tickIntervalId = -1;
		this.ticking = false;
		this.timer = 0.0;
		if (start) this.ExtendTimer();
	}

	ExtendTimer()
	{
		this.timer = this.duration;

		if (!this.ticking) 
		{
			this.ticking = true;
			this.tickIntervalId = window.setInterval(() => { this.Tick(); }, this.msDeltaTime);
		}
	}

	Tick()
	{
		var deltaTime = this.msDeltaTime / 1000.0;
		this.timer -= deltaTime;
		if (this.timer <= 0.0) this.Complete();
	}

	Complete()
	{
		this.timer = 0.0;
		this.ticking = false;
		window.clearInterval(this.tickIntervalId);
		this.tickIntervalId = -1;
		this.completionAction();
	}
}


export class StoredObject
{
	constructor(storeDelaySeconds = 0.5, autostart = false)
	{
		this.storeKey = "";
		this.storeTimeout = new RunningTimeout(() => { this.Store(); }, storeDelaySeconds, autostart, 70);
	}

	GetState() { return {}; }
	ApplyState() { }

	ExtendTimer() { this.storeTimeout.ExtendTimer(); }

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

		this.AfterStore();
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
		var storedObject = JSON.parse(stored_json);
		if (storedObject == null) return;
		this.ApplyState(storedObject);
		this.AfterRestore();
	}
	AfterRestore() { }
}
