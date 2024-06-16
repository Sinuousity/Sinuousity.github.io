console.info("[ +Module ] Running Timeouts");

export class RunningTimeout
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