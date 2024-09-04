import { Rewards } from "./rewards.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] Subathon Tools");

export class SubathonWindow extends DraggableWindow
{
	static window_kind = "Subathon Tools";
	static window_icon = "all_inclusive";
	static instance = null;

	constructor(pos_x, pos_y)
	{
		super(SubathonWindow.window_kind, pos_x, pos_y);
		this.window_kind = SubathonWindow.window_kind;
		this.e_window_root.style.minHeight = "180px";
		this.e_window_root.style.minWidth = "320px";
		this.SetTitle(SubathonWindow.window_kind);
		this.SetIcon(SubathonWindow.window_icon);
		this.CreateContentContainer();
	}
}

export class SubathonEvent
{
	constructor()
	{
		this.type = 'Generic';
		this.trigger = '[Unknown]';
		this.message = 'Something happened.';
	}
}

export class TimeAddEvent extends SubathonEvent
{
	constructor(username = '', secondsAdded = 300)
	{
		this.secondsAdded = secondsAdded;
		this.minutesAdded = Math.floor(secondsAdded / 60);

		if (minutesAdded < 1)
		{
			this.trigger = username;
			this.type = 'TimeAdd';
			this.message = `${username} added ${secondsAdded} seconds`;
		}
		else
		{
			this.trigger = username;
			this.type = 'TimeAdd';
			this.message = `${username} added ${minutesAdded} minutes and ${(secondsAdded - minutesAdded * 60)} seconds`;
		}
	}

	Trigger()
	{
		SubathonStateManager.AddTime(this.secondsAdded);
	}
}

export class RewardWheelEvent extends SubathonEvent
{
	constructor(username = '', spinCount = 1)
	{
		if (spinCount > 1)
		{
			this.trigger = username;
			this.type = 'WheelSpin';
			this.message = `${username} earned ${spinCount} wheel spins`;
		}
		else
		{
			this.trigger = username;
			this.type = 'WheelSpin';
			this.message = `${username} earned a wheel spin`;
		}
	}
}

export class PlinkoDropEvent extends SubathonEvent
{
	constructor(username = '', dropCount = 1)
	{
		if (dropCount > 1)
		{
			this.trigger = username;
			this.type = 'PlinkoDrop';
			this.message = `${username} earned ${dropCount} plinko drops`;
		}
		else
		{
			this.trigger = username;
			this.type = 'PlinkoDrop';
			this.message = `${username} earned a plinko drop`;
		}
	}
}

export class SubathonEventLog
{
	constructor()
	{
		this.events = [];
	}

	AddEvent(event = new SubathonEvent())
	{
		if (event.Trigger) event.Trigger();
		this.events.push(event);
	}

	Clear()
	{
		this.events = [];
	}
}

export class SubathonState
{
	constructor()
	{
		this.started = false;
		this.stopped = false;
		this.intervalId_Update = -1;
		this.durationTarget = 0;
		this.durationRemaining = 0;
		this.timestampStarted = 0;
		this.timestampLatest = 0;
		this.timestampDelta = 0;
		this.eventLog = new SubathonEventLog();
	}

	Start()
	{
		if (this.started) // resume from stop
		{
			this.stopped = false;
			this.StartUpdateInterval();
			return;
		}
		this.started = true;

		this.timestampStarted = new Date().getUTCSeconds;
		this.timestampLatest = this.timestampStarted;
		this.timestampDelta = 0;

		this.durationRemaining = 0;
		this.durationTarget = 0;

		this.StartUpdateInterval();
		this.eventLog.Clear();
	}

	Stop()
	{
		if (!this.started) return;
		if (this.stopped) return;
		this.StopUpdateInterval();
		this.stopped = true;
	}

	Reset()
	{
		this.StopUpdateInterval();
		this.started = false;
		this.stopped = false;

		this.timestampStarted = 0;
		this.timestampLatest = 0;
		this.timestampDelta = 0;

		this.durationRemaining = 0;
		this.durationTarget = 0;
	}

	StartUpdateInterval()
	{
		if (this.intervalId_Update !== -1) return;
		this.intervalId_Update = window.setInterval(this.Update, 356);
	}

	StopUpdateInterval()
	{
		if (this.intervalId_Update === -1) return;
		window.clearInterval(this.intervalId_Update);
		this.intervalId_Update = -1;
	}

	Update()
	{
		if (!this.started) return;
		this.timestampLatest = new Date().getUTCSeconds;
		this.timestampDelta = this.timestampLatest - this.timestampStarted;
		this.durationRemaining = this.durationTarget - this.timestampDelta;
	}

	AddTime(seconds = 300)
	{
		this.durationTarget += seconds;
	}
}

export class SubathonStateManager
{
	static activeState = new SubathonState();

	static Start() { SubathonStateManager.activeState.Start(); }
	static Stop() { SubathonStateManager.activeState.Stop(); }
	static Update() { SubathonStateManager.activeState.Update(); }
	static Reset() { SubathonStateManager.activeState.Reset(); }
	static AddTime(seconds) { SubathonStateManager.activeState.AddTime(seconds); }
	static AddEvent(e) { SubathonStateManager.activeState.eventLog.AddEvent(e); }
}

WindowManager.instance.windowTypes.push(
	{
		key: SubathonWindow.window_kind,
		icon: SubathonWindow.window_icon,
		desc: "Initiate and manage a subathon.",
		model: (x, y) => { return new SubathonWindow(x, y); },
		comingSoon: true,
		shortcutKey: 't'
	}
);


Rewards.Register(
	"Subathon Add Time",
	(user, options) =>
	{
		if (options.secondsMin && options.secondsMax)
		{
			var seconds = Math.random() * Math.abs(options.secondsMax - options.secondsMin) + options.secondsMin;
			var timeAddEvent = new TimeAddEvent(user.username, seconds);
			SubathonStateManager.AddEvent(timeAddEvent);
		}
		else if (options.seconds)
		{
			var timeAddEvent = new TimeAddEvent(user.username, options.seconds);
			SubathonStateManager.AddEvent(timeAddEvent);
		}
		else console.warn("Unable to add Subathon Time : Reward needs either 'min'/'max' or 'points'");
	}
);

Rewards.Register(
	"Subathon Wheel Spin",
	(user, options) =>
	{
		SubathonStateManager.AddEvent(new RewardWheelEvent(user.username, options.spinCount ?? 1));
	}
);

Rewards.Register(
	"Subathon Plinko Drop",
	(user, options) =>
	{
		SubathonStateManager.AddEvent(new PlinkoDropEvent(user.username, options.dropCount ?? 1));
	}
);