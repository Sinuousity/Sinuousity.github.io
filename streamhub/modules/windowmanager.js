import { DraggableWindow } from "./windowcore.js";
console.info("Module Added: Window Manager");

const key_window_state_store = "window_state_store";

export class WindowManager
{
	static instance = new WindowManager();

	constructor()
	{
		this.windowTypes = [];
		this.windows = [];
		this.dirtyIntervalId = -1;
		this.dirtyTimer = 0.0;
		this.dirtyState = false;
		this.restoringState = false;
		this.storingState = false;
	}

	ClearAll()
	{
		for (var wi = 0; wi < this.windows.length; wi++) this.windows[wi].Close();
		this.windows = [];
	}

	SetStateDirty()
	{
		this.dirtyState = true;
		this.dirtyTimer = 0.5;
		if (this.dirtyIntervalId != -1) return;
		this.dirtyIntervalId = window.setInterval(() => { this.StepDirtyTimer(); }, 50);
	}

	StepDirtyTimer()
	{
		this.dirtyTimer -= 0.05;
		if (this.dirtyTimer <= 0.0)
		{
			this.dirtyState = false;
			this.TryStoreState();
			window.clearInterval(this.dirtyIntervalId);
			this.dirtyIntervalId = -1;
		}
	}

	TryStoreState()
	{
		if (this.storingState) return;
		this.storingState = true;
		var windowStates = [];
		if (this.windows.length > 0)
		{
			for (var wi = 0; wi < this.windows.length; wi++)
			{
				if (this.windows[wi].window_kind == "null") continue;
				if (!this.windows[wi].GetStateData) 
				{
					console.warn("could not get window state data >> " + this.window_kind + "  :: " + this.window_name);
					continue;
				}
				windowStates.push(this.windows[wi].GetStateData());
			}
			localStorage.setItem(key_window_state_store, JSON.stringify({ windowStates: windowStates }));
		}
		else
		{
			localStorage.setItem(key_window_state_store, JSON.stringify({ windowStates: [] }));
		}
		this.storingState = false;
	}

	TryRestoreState()
	{
		this.restoringState = true;

		var windowStatesObjJson = localStorage.getItem(key_window_state_store);
		//console.log("loaded window states: " + windowStatesObjJson);
		if (!windowStatesObjJson)
		{
			this.restoringState = false;
			return;
		}
		var windowStatesObj = JSON.parse(windowStatesObjJson);
		if (!windowStatesObj.windowStates)
		{
			this.restoringState = false;
			return;
		}

		var windowStates = windowStatesObj.windowStates;
		for (var wi = 0; wi < windowStates.length; wi++) this.GetNewWindowFromState(windowStates[wi]);

		for (var wi = 0; wi < this.windows.length; wi++)
		{
			var w = this.windows[wi];
			w.SetOrderIndex(wi - this.windows.length);
		}

		this.restoringState = false;
	}

	GetExistingWindow(window_kind)
	{
		for (var wi = 0; wi < this.windows.length; wi++)
		{
			if (this.windows[wi].window_kind != window_kind) continue;
			return this.windows[wi];
		}
		return false;
	}

	GetNewOrExistingWindow(window_kind)
	{
		var existing_window = this.GetExistingWindow(window_kind);
		if (existing_window) 
		{
			existing_window.position_x = document.documentElement.clientWidth / 2.0 - existing_window.e_window_root.offsetWidth / 2.0;
			existing_window.position_y = document.documentElement.clientHeight / 2.0 - existing_window.e_window_root.offsetHeight / 2.0;
			existing_window.ApplyPosition();
			this.BringToFront(existing_window);
			return existing_window;
		}
		return this.GetNewWindowAnywhere(window_kind);
	}

	GetNewWindowAnywhere(window_kind)
	{
		var xPosition = Math.random() * document.documentElement.clientWidth * 0.5;
		var yPosition = Math.random() * document.documentElement.clientHeight * 0.5;
		return this.GetNewWindow(window_kind, xPosition, yPosition);
	}

	GetNewWindow(window_kind, xPosition, yPosition)
	{
		this.SetStateDirty();
		for (var wti = 0; wti < this.windowTypes.length; wti++)
		{
			var kvp = this.windowTypes[wti];
			if (!kvp.model) continue;
			if (kvp.key == window_kind) return kvp.model();
		}
		return new DraggableWindow("Unknown Window", xPosition, yPosition);
	}

	GetNewWindowFromState(windowState)
	{
		var w = this.GetNewWindow(windowState.window_kind, windowState.pos_x, windowState.pos_y);
		w.ApplyStateData(windowState);
		return w;
	}

	BringToFront(targetWindow)
	{
		if (targetWindow.orderOffset == 0) return;
		for (var wi = 0; wi < this.windows.length; wi++)
		{
			var w = this.windows[wi];
			if (w == targetWindow) continue;
			w.SetOrderIndex(Math.max(-10, w.orderOffset - 1));
		}
		targetWindow.SetOrderIndex(0);

		this.SetStateDirty();
	}
}