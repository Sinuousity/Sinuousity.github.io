console.info("[ +Module ] Save Indicator");

export class SaveIndicator
{
	static element = null;

	static showing = false;
	static showTime = 0.0;
	static previousTimestamp = -1.0;
	static stepIntervalId = -1;

	static SetElement(e)
	{
		SaveIndicator.element = e;
		SaveIndicator.element.style.color = "#00ff00ff";
		SaveIndicator.element.style.opacity = "0.0";
	}

	static AddShowTime(showTime = 2.0)
	{
		SaveIndicator.showTime = showTime;
		SaveIndicator.element.style.opacity = 0.6;
		if (!SaveIndicator.showing) 
		{
			SaveIndicator.showing = true;
			SaveIndicator.stepIntervalId = window.setInterval(() => { this.StepShowTime(); }, 20);
		}
	}

	static StepShowTime(timestamp)
	{
		var dt = 0.02;
		SaveIndicator.previousTimestamp = timestamp;
		SaveIndicator.showTime -= dt;

		if (SaveIndicator.showTime <= 0.0)
		{
			SaveIndicator.showTime = 0.0;
			SaveIndicator.FinishShowing();
			return;
		}
	}

	static FinishShowing()
	{
		SaveIndicator.showing = false;
		window.clearInterval(SaveIndicator.stepIntervalId);
		if (SaveIndicator.element) SaveIndicator.element.style.opacity = 0.0;
	}
}