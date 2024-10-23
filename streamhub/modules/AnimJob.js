

export class AnimJob
{
	constructor(minFrameDeltaMs = 16, frameCallback = dt => { })
	{
		this.tsLast = -1;
		this.tsLastDelta = 0;
		this.animReqId = null;
		this.running = false;
		this.runDuration = 0;

		this.minFrameDeltaMs = minFrameDeltaMs;
		this.frameCallback = frameCallback;
	}

	Start()
	{
		if (this.running === true) return;
		this.running = true;

		this.RequestNextTick();
	}

	Stop()
	{
		if (this.running === false) return;
		this.running = false;

		cancelAnimationFrame(this.animReqId);
		this.animReqId = null;
	}

	Tick(ts)
	{
		if (this.running === false) 
		{
			this.tsLast = -1;
			return;
		}

		if (this.tsLast < 0) this.tsLast = ts;

		let dt = ts - this.tsLast;
		if (dt >= this.minFrameDeltaMs)
		{
			let frame_dt = Math.min(0.2, dt * 0.001); // longest simulation frame duration is 0.2 seconds
			this.tsLastDelta = dt;
			this.tsLast = ts;

			this.runDuration += frame_dt;
			if (this.frameCallback) this.frameCallback(frame_dt);
		}

		this.RequestNextTick();
	}

	RequestNextTick()
	{
		this.animReqId = requestAnimationFrame(ts => this.Tick(ts));
	}
}
