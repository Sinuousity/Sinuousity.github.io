import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import { Notifications } from "./notifications.js";
import { OptionManager } from "./globalsettings.js";

console.info("[ +Module ] Raffle");

const key_raffle_state_store = "raffle_state_store";

export class RaffleState
{
	static instance = new RaffleState();

	constructor()
	{
		this.running = false;
		this.open = false;

		this.title = "New Raffle";
		this.keyword = "joinraffle";

		this.names = [];
		this.winnerHistory = [];

		this.runIntervalId = -1;
		this.runTime = 0.0;
		this.slidePhase = 0.0;
		this.slideVelocity = 0.0;
		this.nameIndexOffset = 0;

		this.modified = false;
		this.modifiedTimer = 0.0;
		this.delayedStoreIntervalId = -1;

	}

	MarkDirty()
	{
		this.modifiedTimer = 0.5;
		if (this.delayedStoreIntervalId != -1) return;
		this.modified = true;
		this.delayedStoreIntervalId = window.setInterval(() => { this.step_DelayedTryStore(); }, 50);
	}

	ClearDirty()
	{
		this.modified = false;
		this.modifiedTimer = 0.0;
	}

	step_DelayedTryStore()
	{
		this.modifiedTimer -= 0.05;
		if (this.modifiedTimer <= 0.0)
		{
			this.ClearDirty();
			this.TryStore();

			window.clearInterval(this.delayedStoreIntervalId);
			this.delayedStoreIntervalId = -1;
		}
	}

	TryStore()
	{
		var json = JSON.stringify(
			{
				open: this.open,
				title: this.title,
				keyword: this.keyword,
				names: this.names,
				winnerHistory: this.winnerHistory
			}
		);
		localStorage.setItem(key_raffle_state_store, json);
		RaffleOverlay.instance.UpdateElements();
	}

	TryRestore()
	{
		var stored_state_json = localStorage.getItem(key_raffle_state_store);
		if (stored_state_json != null) 
		{
			var stored_state = JSON.parse(stored_state_json);
			if (stored_state != null)
			{
				for (const prop in stored_state)
					this[prop] = stored_state[prop];
			}
		}
		RaffleOverlay.instance.UpdateElements();
	}

	SetTitle(title)
	{
		this.title = title;
		this.TryStore();
	}

	SetKeyword(keyword)
	{
		this.keyword = keyword;
		this.TryStore();
	}

	ToggleOpen()
	{
		if (this.open) this.Close();
		else this.Open();
	}

	Open()
	{
		if (this.open || this.running) return;
		this.open = true;
		this.TryStore();
	}

	Close()
	{
		if (!this.open) return;
		this.open = false;
		this.TryStore();
	}

	AddName(newName, force = false)
	{
		if (!force && (this.running || !this.open)) return;
		if (this.names.indexOf(newName) < 0) return;
		this.names.push(newName);
		this.TryStore();
	}

	RemoveName(oldName, force = false)
	{
		if (!force && this.running) return;
		if (!this.names.contains(oldName)) return;
		var spliceId = this.names.indexOf(oldName);
		if (spliceId < 0) return;
		this.names.splice(spliceId, 1);
		this.TryStore();
	}

	static msFrameDuration = 20;
	TryRun()
	{
		if (this.running) return;
		this.running = true;
		this.runTime = 0.0;

		this.slideVelocity = (Math.random() > 0.5 ? -1.0 : 1.0) * 10.0;
		this.runIntervalId = window.setInterval(() => { this.RunStep(); }, msFrameDuration);
	}

	RunStep()
	{
		var deltaTime = msFrameDuration / 1000.0;

		this.runTime += deltaTime;
		this.slidePhase += this.slideVelocity * deltaTime;

		if (Math.abs(this.slideVelocity) < 0.01) this.FinishRun();
	}

	FinishRun()
	{
		if (!this.running) return;
		this.running = false;
		window.clearInterval(this.runIntervalId);
		this.TryStore();
	}

	ClearNames()
	{
		if (this.running) return;
		this.names = [];
		this.TryStore();
	}
}

export class RaffleOverlay
{
	static instance = new RaffleOverlay();

	constructor()
	{
		this.e_zone_root = document.createElement("div");
		this.e_zone_root.className = "rafflezone";

		this.e_zone_background = document.createElement("div");
		this.e_zone_background.className = "rafflebackground";
		this.e_zone_root.appendChild(this.e_zone_background);

		this.e_zone_title = document.createElement("div");
		this.e_zone_title.className = "raffletitle";
		this.e_zone_root.appendChild(this.e_zone_title);

		this.e_zone_subtitle = document.createElement("div");
		this.e_zone_subtitle.className = "rafflesubtitle";
		this.e_zone_subtitle.addEventListener("click", () => { RaffleState.instance.ToggleOpen(); });
		this.e_zone_root.appendChild(this.e_zone_subtitle);

		this.e_names_root = document.createElement("div");
		this.e_names_root.className = "rafflenameroot";
		this.e_zone_root.appendChild(this.e_names_root);

		document.body.appendChild(this.e_zone_root);

		this.updateTimeoutId = -1;
		this.UpdateElements();
	}

	UpdateElements()
	{
		if (this.updateTimeoutId != -1) return;

		if (RaffleState.instance == null) 
		{
			this.updateTimeoutId = window.setTimeout(
				() =>
				{
					this.updateTimeoutId = -1;
					this.UpdateElements();
				}, 25
			);
			return;
		}

		this.e_zone_root.style.opacity = RaffleState.instance.open ? "100%" : "0%";

		this.e_zone_title.innerText = RaffleState.instance.title;
		this.e_zone_subtitle.innerText = RaffleState.instance.open ? "OPEN" : "CLOSED";
		this.e_zone_subtitle.style.color = RaffleState.instance.open ? "lightgreen" : "red";
	}
}

export class RaffleSettingsWindow extends DraggableWindow
{
	constructor(pos_x, pos_y)
	{
		super("Raffle", pos_x, pos_y);
		super.window_kind = "Raffle";

		this.e_window_root.style.minHeight = "300px";
		this.e_window_root.style.minWidth = "300px";

		this.CreateContentContainer();
		this.SetIcon("confirmation_number");
		this.SetTitle("Raffle Options");

		this.e_form = {};
		this.e_info = {};
		this.e_raffle_toggle = {};

		this.CreateControlsColumn();

		this.e_control_title = this.AddTextField(
			"Raffle Title",
			OptionManager.GetOptionValue("raffle.title", "New Raffle"),
			e => { OptionManager.SetOptionValue("raffle.title", e.value); }
		);
		this.e_control_title.style.lineHeight = "2rem";
		this.e_control_title.style.height = "2rem";

		this.e_control_keyword = this.AddTextField(
			"Join Key Phrase",
			OptionManager.GetOptionValue("raffle.keyword", "joinraffle"),
			e => { OptionManager.SetOptionValue("raffle.title", e.value); }
		);
		this.e_control_keyword.style.lineHeight = "2rem";
		this.e_control_keyword.style.height = "2rem";

		this.txt_addName = this.AddTextField("Manual Add", "", e =>
		{
			this.e_btn_addName.children[1].children[0].disabled = e.value == "";
		});
		this.txt_addName.children[1].children[0].placeholder = "Enter Username";
		this.txt_addName.style.lineHeight = "2rem";
		this.txt_addName.style.height = "2rem";

		this.e_btn_addName = this.AddButton("", "Add", e =>
		{
			RaffleState.instance.AddName(this.txt_addName.value, true);
			Notifications.instance.Add("Raffle Name Added : " + this.txt_addName.value, "#00ff0030");
			//onSubmitRaffleName(txt_add_name.value);
			this.txt_addName.value = "";
		}, false);
		this.e_btn_addName.children[1].children[0].disabled = true;
		this.e_btn_addName.style.lineHeight = "2rem";
		this.e_btn_addName.style.height = "2rem";

		this.e_btn_toggleOpen = this.AddControlButton("Join From Chat", RaffleState.instance.open ? "Close" : "Open", e =>
		{
			RaffleState.instance.ToggleOpen();
			this.e_btn_toggleOpen.style.backgroundColor = RaffleState.instance.open ? "#ffcc00aa" : "#00ffccaa";
			this.e_btn_toggleOpen.value = RaffleState.instance.open ? "Close" : "Open";
			Notifications.instance.Add(RaffleState.instance.open ? "Raffle Open" : "Raffle Closed", "#ffff0030");
		}, false);
		this.e_btn_toggleOpen.style.backgroundColor = RaffleState.instance.open ? "#ffcc00aa" : "#00ffccaa";

		var e_btn_clearNames = this.AddControlButton("Clear All Names", "Clear", e =>
		{
			RaffleState.instance.ClearNames();
			Notifications.instance.Add("Raffle Names Cleared", "#ffff0030");
		}, false);
		e_btn_clearNames.style.backgroundColor = "#ff330066";
		e_btn_clearNames.style.color = "#ffffffaa";


		//this.CreateForm();

	}

	AddControlButton(label, buttonText, action, dirtiesSettings = false)
	{
		var e_ctrl = this.AddButton(label, buttonText, action, dirtiesSettings);
		var e_btn = e_ctrl.children[1].children[0];
		e_ctrl.style.lineHeight = "2rem";
		e_ctrl.style.height = "2rem";
		return e_btn;
	}

	CreateForm()
	{
		this.e_form = document.createElement("div");
		this.e_form.id = "hubinfo-raffle-form";
		this.e_form.className = "hubinfo-raffle-form flex-col";
		this.e_content.appendChild(this.e_form);

		this.e_info = document.createElement("div");
		this.e_info.id = "hubinfo-raffle";
		this.e_info.className = "hubinfo-raffle";
		this.e_form.appendChild(this.e_info);

		var e_row_a = this.CreateFormRow();
		var cntrl_title = this.CreateInput(e_row_a, "text", "txt_raffle_title");
		cntrl_title.placeholder = RaffleState.instance.title.length < 1 ? "Change Raffle Title" : RaffleState.instance.title;

		var btn_set_title = this.CreateInput(e_row_a, "button", "btn_raffle_set_title");
		btn_set_title.className = "btn-raffle btn-raffle-set-title";
		btn_set_title.value = "Set Title";
		btn_set_title.addEventListener("click", () =>
		{
			RaffleState.instance.SetTitle(cntrl_title.value);
			//onChangeRaffleTitle(cntrl_title.value);
			Notifications.instance.Add("Raffle Title Updated : " + cntrl_title.value, "#00ffff30");
			cntrl_title.placeholder = cntrl_title.value;
			cntrl_title.value = "";
		});

		var e_row_b = this.CreateFormRow();
		var cntrl_keyword = this.CreateInput(e_row_b, "text", "txt_raffle_keyword");
		cntrl_keyword.placeholder = RaffleState.instance.keyword.length < 1 ? "Change Raffle Keyword" : RaffleState.instance.keyword;

		var btn_set_title = this.CreateInput(e_row_b, "button", "btn_raffle_set_keyword");
		btn_set_title.className = "btn-raffle btn-raffle-set-keyword";
		btn_set_title.value = "Set Keyword";
		btn_set_title.addEventListener("click", () =>
		{
			RaffleState.instance.SetKeyword(cntrl_keyword.value);
			Notifications.instance.Add("Raffle Keyword Updated : " + cntrl_keyword.value, "#00ffff30");
			//onChangeRaffleKeyword(cntrl_keyword.value);
			cntrl_keyword.placeholder = cntrl_keyword.value;
			cntrl_keyword.value = "";
		});

		var e_row_c = this.CreateFormRow();
		var txt_add_name = this.CreateInput(e_row_c, "text", "txt_raffle_add_name");
		txt_add_name.placeholder = "Manually Add Name";

		var btn_add_name = this.CreateInput(e_row_c, "button", "btn_raffle_add_name");
		btn_add_name.className = "btn-raffle btn-raffle-add-name";
		btn_add_name.value = "Add Name";
		btn_add_name.addEventListener("click", () =>
		{
			RaffleState.instance.AddName(txt_add_name.value, true);
			Notifications.instance.Add("Raffle Name Added : " + txt_add_name.value, "#00ff0030");
			//onSubmitRaffleName(txt_add_name.value);
			txt_add_name.value = "";
		});

		var e_row_d = this.CreateFormRow();

		var btn_clear_entries = this.CreateInput(e_row_d, "button", "btn_raffle_clean");
		btn_clear_entries.className = "btn-raffle";
		btn_clear_entries.value = "Clear Entries";
		btn_clear_entries.addEventListener("click", () =>
		{
			Notifications.instance.Add("Raffle Names Cleared", "#ffbb0030");
			RaffleState.instance.ClearNames();
			//onClearRaffle()
		});

		var btn_pick_winner = this.CreateInput(e_row_d, "button", "btn_raffle_run");
		btn_pick_winner.className = "btn-raffle";
		btn_pick_winner.value = "Pick Winner";
		btn_pick_winner.addEventListener("click", () =>
		{
			RaffleState.instance.TryRun();
			//onRunRaffle();
		});

		this.e_raffle_toggle = this.CreateInput(e_row_d, "button", "btn_raffle_toggle");
		this.e_raffle_toggle.className = "btn-raffle";
		this.UpdateToggleButtonText();
		this.e_raffle_toggle.addEventListener("click", () =>
		{
			RaffleState.instance.ToggleOpen();
			this.UpdateToggleButtonText();
		});
	}

	UpdateToggleButtonText()
	{
		if (RaffleState.instance.open) this.e_raffle_toggle.value = "Close Raffle";
		else this.e_raffle_toggle.value = "Open Raffle";
	}

	CreateFormRow()
	{
		var e_row = document.createElement("div");
		e_row.className = "flex-row";
		this.e_form.appendChild(e_row);
		return e_row;
	}

	CreateInput(e_row, controlType, controlName)
	{
		var e_control = document.createElement("input");
		e_control.id = controlName;
		e_control.name = controlName;
		e_control.type = controlType;
		e_row.appendChild(e_control);
		return e_control;
	}
}

WindowManager.instance.windowTypes.push({ key: "Raffle", icon: "confirmation_number", model: (x, y) => { return new RaffleSettingsWindow(x, y); } });