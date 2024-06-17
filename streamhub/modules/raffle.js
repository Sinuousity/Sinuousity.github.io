import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import { Notifications } from "./notifications.js";
import { OptionManager } from "./globalsettings.js";
import { UserInput } from "./userinput.js";
import { ChatCollector } from "./chatcollector.js";
import { TwitchResources } from "./twitchlistener.js";
import { EventSource } from "./eventsource.js";
import { SaveIndicator } from "./saveindicator.js";

console.info("[ +Module ] Raffle");

const key_raffle_state_store = "raffle_state_store";

export class RaffleState
{
	static instance = new RaffleState();
	static onRaffleRunStart = new EventSource();
	static onRaffleRunEnd = new EventSource();

	constructor()
	{
		this.running = false;
		this.showingWinner = false;
		this.open = false;

		this.title = "New Raffle";
		this.keyword = "joinraffle";

		this.names = [];
		this.winnerHistory = [];

		this.runIntervalId = -1;
		this.runTime = 0.0;

		this.modified = false;
		this.modifiedTimer = 0.0;
		this.delayedStoreIntervalId = -1;

		this.newMessageSubscription = ChatCollector.onMessageReceived.RequestSubscription(m => { this.CheckMessageForKeyPhrase(m); });
	}

	CheckMessageForKeyPhrase(m)
	{
		if (!RaffleState.instance.open) return;
		if (m.message.startsWith(this.keyword)) this.AddName(m.username, false);
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
		//RaffleOverlay.instance.UpdateStyle();
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
		RaffleOverlay.instance.Recreate();
	}

	SetTitle(title)
	{
		this.title = title;
		this.TryStore();
		RaffleOverlay.instance.UpdateStyle();
	}

	SetKeyword(keyword)
	{
		this.keyword = keyword;
		this.TryStore();
		RaffleOverlay.instance.UpdateStyle();
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
		RaffleOverlay.instance.UpdateStyle();
	}

	Close()
	{
		if (!this.open) return;
		this.open = false;
		this.TryStore();
		RaffleOverlay.instance.UpdateStyle();
	}

	AddName(newName, force = false)
	{
		if (!force && (this.running || !this.open)) return;
		if (this.names.indexOf(newName) > -1) return;
		this.names.push(newName);
		this.TryStore();
		RaffleOverlay.instance.Recreate();
		TwitchResources.GetProfileDataMultiple([newName]);
	}

	RemoveName(oldName, force = false)
	{
		if (!force && this.running) return;
		if (!this.names.contains(oldName)) return;
		var spliceId = this.names.indexOf(oldName);
		if (spliceId < 0) return;
		this.names.splice(spliceId, 1);
		this.TryStore();
		RaffleOverlay.instance.Recreate();
	}

	static msFrameDuration = 20;
	TryRun()
	{
		if (this.running) return;

		this.Close();
		this.running = true;
		this.runTime = 0.0;
		RaffleState.onRaffleRunStart.Invoke();

		this.runIntervalId = window.setInterval(() => { this.RunStep(); }, RaffleState.msFrameDuration);
	}

	RunStep()
	{
		var deltaTime = RaffleState.msFrameDuration / 1000.0;

		this.runTime += deltaTime;
		this.slidePhase += RaffleOverlay.instance.slideVelocity * deltaTime;

		if (Math.abs(RaffleOverlay.instance.slideVelocity) < 0.011) this.FinishRun();
	}

	FinishRun()
	{
		if (!this.running) return;
		RaffleState.onRaffleRunEnd.Invoke();
		this.running = false;
		window.clearInterval(this.runIntervalId);
		this.TryStore();

		this.showingWinner = true;
		//show winner for 10 seconds
		window.setTimeout(() => { this.showingWinner = false; }, 10000);
	}

	ClearNames()
	{
		if (this.running) return;
		this.names = [];
		this.TryStore();
		RaffleOverlay.instance.Recreate();
	}
}

export class RaffleOverlayEntry
{
	constructor(username)
	{
		this.username = username;
		this.e_root = document.createElement("div");
		this.e_root.className = "raffle-entry-root";
		this.e_root.draggable = false;

		this.e_name = document.createElement("div");
		this.e_name.innerText = username;
		this.e_name.className = "raffle-entry-name";
		this.e_name.draggable = false;

		this.e_image = document.createElement("img");
		this.e_image.src = "";
		this.e_image.draggable = false;

		this.e_root.appendChild(this.e_image);
		this.e_root.appendChild(this.e_name);
	}
}

export class RaffleOverlay
{
	static instance = new RaffleOverlay();

	constructor()
	{
		window.addEventListener("keypress", e =>
		{
			var pressedToggleKey = e.key == 'r';
		});

		this.option_slide_curve = OptionManager.GetOption("raffle.slide.bend");

		this.e_zone_root = document.createElement("div");
		this.e_zone_root.className = "rafflezone";
		this.e_zone_root.draggable = false;

		this.e_zone_background = document.createElement("div");
		this.e_zone_background.className = "rafflebackground";
		this.e_zone_background.draggable = false;
		this.e_zone_root.appendChild(this.e_zone_background);

		this.e_zone_title = document.createElement("div");
		this.e_zone_title.className = "raffletitle";
		this.e_zone_title.draggable = false;
		this.e_zone_root.appendChild(this.e_zone_title);

		this.e_zone_title_span = document.createElement("span");
		this.e_zone_title_span.draggable = false;
		this.e_zone_title.appendChild(this.e_zone_title_span);

		this.e_zone_subtitle = document.createElement("div");
		this.e_zone_subtitle.className = "rafflesubtitle";
		this.e_zone_subtitle.draggable = false;
		this.e_zone_subtitle.addEventListener("click", () => { RaffleState.instance.ToggleOpen(); });
		this.e_zone_title.appendChild(this.e_zone_subtitle);

		this.e_names_root = document.createElement("div");
		this.e_names_root.className = "rafflenameroot";
		this.e_names_root.draggable = false;
		this.e_names_root.style.userSelect = "none";
		window.addEventListener("mouseup", () => { this.draggingEntries = false; });
		this.e_zone_root.appendChild(this.e_names_root);

		this.e_names_slider = document.createElement("div");
		this.e_names_slider.className = "rafflenameslide";
		this.e_names_slider.draggable = false;
		this.e_names_slider.style.pointerEvents = "all";
		this.e_names_slider.style.userSelect = "none";
		this.e_names_slider.style.cursor = "grab";
		this.e_names_slider.addEventListener("mousedown", () => { this.draggingEntries = true; this.e_names_slider.style.cursor = "grabbing"; });
		window.addEventListener("mouseup", () => { this.draggingEntries = false; this.e_names_slider.style.cursor = "grab"; });
		this.e_names_root.appendChild(this.e_names_slider);

		document.body.appendChild(this.e_zone_root);

		this.e_entries = [];
		this.draggingEntries = false;

		this.updateTimeoutId = -1;
		//this.CreateNameElements();

		this.slidePosition = 0.5;
		this.slideVelocity = 0.0;
		this.slideIndex = 0;
		this.slideIndexReal = 0;

		this.animationStartTime = -1.0;
		this.animationTime = 0.0;
		requestAnimationFrame(x => { this.UpdateEntryPositions(x); });

		this.lastMousePositionX = UserInput.instance.mousePositionX;


		this.sub_raffleRunStart = RaffleState.onRaffleRunStart.RequestSubscription(() => { this.OnRaffleStarted(); });
		this.sub_raffleRunEnd = RaffleState.onRaffleRunEnd.RequestSubscription(() => { this.OnRaffleConcluded(); });
	}

	OnRaffleStarted()
	{
		this.slideVelocity = (Math.random() > 0.5 ? -1.0 : 1.0) * 30.0 * (Math.random() * 0.3 + 0.7);
		this.UpdateStyle();
	}

	OnRaffleConcluded()
	{
		this.slideVelocity = 0.0;
		this.UpdateStyle();
	}

	UpdateEntryPositions(timestamp)
	{
		if (this.animationStartTime <= 0) this.animationStartTime = timestamp;
		var newTime = (timestamp - this.animationStartTime) / 1000.0;
		var deltaTime = (newTime - this.animationTime);
		this.animationTime = newTime;

		var nameCount = RaffleState.instance.names.length;
		if (nameCount < 1)
		{
			requestAnimationFrame(x => { this.UpdateEntryPositions(x); });
			return;
		}

		var midoffset = 0.5 - this.slidePosition;
		var stick = 1.0 - Math.min(1.0, Math.abs(this.slideVelocity) * 2.0);

		// idle cruise
		if (!RaffleState.instance.running && !RaffleState.instance.showingWinner) 
		{
			//no stickiness during cruise
			stick = 0.0;
			//add 'cruising' velocity
			if (RaffleState.instance.open) this.slideVelocity += (Math.sign(this.slideVelocity - 0.00001) * 0.7 - this.slideVelocity) * deltaTime;
		}

		//drag
		this.slideVelocity -= Math.min(deltaTime * (stick * 0.5 + (RaffleState.instance.showingWinner ? 0.5 : 0.15)), 1.0) * this.slideVelocity;

		//entry midpoint stickiness
		this.slideVelocity += midoffset * Math.min(1.0, deltaTime * 20.0 * stick);

		if (Math.abs(this.slideVelocity) < 0.01) 
		{
			this.slideVelocity = 0.0;
		}


		if (!RaffleState.instance.showingWinner && !RaffleState.instance.running)
		{
			var mouseDeltaX = UserInput.instance.mousePositionX - this.lastMousePositionX;
			this.lastMousePositionX = UserInput.instance.mousePositionX;
			if (this.draggingEntries) this.slideVelocity += mouseDeltaX * 0.01;
		}
		var clampedVelocity = Math.sign(this.slideVelocity) * Math.min(deltaTime * Math.abs(this.slideVelocity), 0.99);

		var cellCount = 6;//Math.min(6, nameCount);
		var halfCount = cellCount * 0.5;

		this.slidePosition += clampedVelocity;
		while (this.slidePosition < 0.0)
		{
			this.slidePosition += 1.0;
			this.slideIndex += 1;
			this.slideIndexReal += 1;
		}
		while (this.slidePosition > 1.0)
		{
			this.slidePosition -= 1.0;
			this.slideIndex -= 1;
			this.slideIndexReal -= 1;
		}
		this.slideIndex = RaffleOverlay.WrapIndex(this.slideIndex, 0, cellCount);
		this.slideIndexReal = RaffleOverlay.WrapIndex(this.slideIndexReal, 0, nameCount);

		var pad = OptionManager.GetOptionValue("raffle.slide.pad");
		var cellPad = 0.025 * pad;
		var cellSize = this.e_names_slider.offsetHeight;
		var cellRootWidth = this.e_names_root.offsetWidth;
		var stretch = Math.min(Math.pow(Math.abs(this.slideVelocity) * 0.02, 5) * 200.0, 2);
		var blur = Math.min(1.0, Math.abs(this.slideVelocity) * 0.002) * 100.0;
		blur = Math.min(blur, 20);
		cellPad += 0.1 * stretch;

		var bend = OptionManager.GetOptionValue("raffle.slide.bend");
		var doImages = Math.abs(this.slideVelocity) < 42.0;

		var scalePercentY = 100;
		var scalePercentX = scalePercentY + stretch * 100.0;
		var transitionDuration = Math.max(0.0, 0.12 - 3.0 * stretch);

		for (var nameIndex = 0; nameIndex < cellCount; nameIndex++)
		{
			var offsetIndex = nameIndex - this.slideIndex;
			var selected = offsetIndex == 0;
			var offsetPosition = offsetIndex + (this.slidePosition - 0.5);
			offsetPosition = RaffleOverlay.WrapIndex(offsetPosition, -halfCount, halfCount);
			offsetPosition *= 1.0 + cellPad;

			var relativeIndex = RaffleOverlay.WrapIndex(offsetIndex, -halfCount, halfCount);
			var nameIdActual = RaffleOverlay.WrapIndex(this.slideIndexReal + relativeIndex, 0, nameCount);
			var nameActual = RaffleState.instance.names[nameIdActual];
			this.e_entries[nameIndex].username = nameActual;
			this.e_entries[nameIndex].e_name.innerText = nameActual;

			var twist = `rotate3d(0,1,1,${(relativeIndex + this.slidePosition - 0.5) * bend}deg)`;
			var lift = `${(1.0 - Math.pow(Math.abs(relativeIndex + this.slidePosition - 0.5), 2)) * -bend}`;
			this.e_entries[nameIndex].e_root.style.transform = `translate(-50%,${lift}%) scale(${scalePercentX}%, ${scalePercentY}%) ${twist}`;
			this.e_entries[nameIndex].e_root.style.left = `${offsetPosition * cellSize + cellRootWidth * 0.5}px`;
			this.e_entries[nameIndex].e_root.style.transitionDuration = transitionDuration + "s";
			this.e_entries[nameIndex].e_root.style.outline = "solid transparent 3px";
			this.e_entries[nameIndex].e_root.style.outlineOffset = "-16px";
			this.e_entries[nameIndex].e_root.style.filter = `blur(${blur}px)`;

			if (doImages)
			{
				var userData = TwitchResources.GetCachedProfileData(nameActual)
				if (userData) this.e_entries[nameIndex].e_image.src = userData.profile_image_url;
				else this.e_entries[nameIndex].e_image.src = "";
			}
			this.e_entries[nameIndex].e_image.style.opacity = (selected ? 0.95 : 0.2) - 0.1 * stretch;

			var nameShow = 1.0 - 0.7 * Math.abs(relativeIndex);
			this.e_entries[nameIndex].e_name.style.opacity = `${100 * nameShow}%`;
			this.e_entries[nameIndex].e_name.style.maxWidth = selected ? "200%" : "80%";
			this.e_entries[nameIndex].e_name.style.overflow = selected ? "visible" : "hidden";
			this.e_entries[nameIndex].e_name.style.transform = `translate(-50%, 0%) scale(${70 + 30 * nameShow}%)`;
			this.e_entries[this.slideIndex].e_name.style.backgroundBlendMode = "normal";
			this.e_entries[this.slideIndex].e_root.style.backgroundImage = "unset";
			this.e_entries[this.slideIndex].e_root.style.animation = "unset";
			//this.e_entries[nameIndex].e_root.children[0].innerHTML = `name ${nameIdActual + 1}`;
		}

		if (RaffleState.instance.showingWinner)
		{
			this.e_entries[this.slideIndex].e_name.style.backgroundBlendMode = "multiply";
			this.e_entries[this.slideIndex].e_root.style.outline = "solid white 6px";
			this.e_entries[this.slideIndex].e_root.style.backgroundImage = "radial-gradient(90deg, red,purple,blue,green,yellow,red)";
			this.e_entries[this.slideIndex].e_root.style.animation = "huerotate";
			this.e_entries[this.slideIndex].e_root.style.animationTimingFunction = "linear";
			this.e_entries[this.slideIndex].e_root.style.animationDuration = "1s";
			this.e_entries[this.slideIndex].e_root.style.animationIterationCount = "infinite";
			this.e_entries[this.slideIndex].e_root.style.outlineOffset = "8px";
		}
		else
		{
			this.e_entries[this.slideIndex].e_root.style.outline = "solid orange 3px";
			this.e_entries[this.slideIndex].e_root.style.outlineOffset = "4px";
		}



		requestAnimationFrame(x => { this.UpdateEntryPositions(x); });
	}

	static WrapIndex(id, minId, maxId)
	{
		var idRange = maxId - minId;
		if (idRange <= 1) return minId;
		while (id < minId) id += idRange;
		while (id >= maxId) id -= idRange;
		return id;
	}

	UpdateStyle()
	{
		var showing = OptionManager.GetOptionValue("raffle.visible") === true && (RaffleState.instance.open || RaffleState.instance.names.length > 0);
		this.e_zone_root.style.opacity = showing ? "100%" : "0%";
		this.e_zone_root.style.zIndex = showing ? "all" : "none";

		this.e_zone_title_span.innerText = RaffleState.instance.title;
		this.e_zone_subtitle.innerText = RaffleState.instance.running ? "RUNNING" : (RaffleState.instance.open ? "OPEN" : "CLOSED");
		this.e_zone_subtitle.style.color = RaffleState.instance.running ? "yellow" : (RaffleState.instance.open ? "lightgreen" : "red");
	}

	Recreate()
	{
		window.setTimeout(() => { TwitchResources.GetProfileDataMultiple(RaffleState.instance.names); }, 100);
		this.UpdateStyle();
		this.CreateNameElements();
	}

	CreateNameElements()
	{
		//delete existing
		if (this.e_entries.length > 0)
		{
			for (var ii = 0; ii < this.e_entries.length; ii++)
			{
				if (this.e_entries[ii].remove) this.e_entries[ii].remove();
			}
		}
		this.e_names_slider.innerHTML = "";
		this.e_entries = [];

		var cellCount = 6;//Math.min(6, RaffleState.instance.names.length);
		for (var ii = 0; ii < cellCount; ii++)
		{
			var entry = new RaffleOverlayEntry("");
			entry.e_root.style.transform = "translate(-50%, 0%)";

			entry.e_root.draggable = false;
			this.e_names_slider.appendChild(entry.e_root);

			this.e_entries.push(entry);
		}
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

		this.option_visible = OptionManager.GetOption("raffle.visible");
		this.e_control_visible = this.AddToggle(
			this.option_visible.label,
			this.option_visible.value,
			x =>
			{
				OptionManager.SetOptionValue("raffle.visible", x.checked);
				RaffleOverlay.instance.UpdateStyle();
			},
			true
		);

		this.option_slide_curve = OptionManager.GetOption("raffle.slide.bend");
		this.e_control_slide_curve = this.AddSlider(
			this.option_slide_curve.label,
			this.option_slide_curve.value,
			-13, 13,
			x => { OptionManager.SetOptionValue("raffle.slide.bend", Math.round(x.value)); },
			true
		);

		this.option_slide_pad = OptionManager.GetOption("raffle.slide.pad");
		this.e_control_slide_pad = this.AddSlider(
			this.option_slide_pad.label,
			this.option_slide_pad.value,
			0, 20,
			x => { OptionManager.SetOptionValue("raffle.slide.pad", Math.round(x.value)); },
			true
		);

		this.e_control_title = this.AddTextField(
			"Raffle Title",
			OptionManager.GetOptionValue("raffle.title", "New Raffle"),
			e =>
			{
				var trimmedValue = e.value.trim();
				OptionManager.SetOptionValue("raffle.title", trimmedValue);
				RaffleState.instance.SetTitle(trimmedValue);
			},
			true
		);
		this.e_control_title.style.lineHeight = "2rem";
		this.e_control_title.style.height = "2rem";

		this.e_control_keyword = this.AddTextField(
			"Join Key Phrase",
			OptionManager.GetOptionValue("raffle.keyword", "joinraffle"),
			e =>
			{
				var trimmedValue = e.value.trim();
				OptionManager.SetOptionValue("raffle.keyword", trimmedValue);
				RaffleState.instance.SetKeyword(trimmedValue);
			},
			true
		);
		this.e_control_keyword.style.lineHeight = "2rem";
		this.e_control_keyword.style.height = "2rem";

		this.e_control_addName = this.AddTextField(
			"Manual Add",
			"",
			e => { this.e_btn_addName.children[1].children[0].disabled = e.value == ""; },
			false
		);
		this.txt_addName = this.e_control_addName.children[1].children[0];
		this.txt_addName.placeholder = "Enter Username";
		this.e_control_addName.style.lineHeight = "2rem";
		this.e_control_addName.style.height = "2rem";

		this.e_btn_addName = this.AddButton("", "Add", e =>
		{
			RaffleState.instance.AddName(this.txt_addName.value, true);
			//SaveIndicator.AddShowTime(3);
			//Notifications.instance.Add("Raffle Name Added : " + this.txt_addName.value, "#00ff0030");
			//onSubmitRaffleName(txt_add_name.value);
			this.e_btn_addName.children[1].children[0].disabled = true;
			this.txt_addName.value = "";
		}, false);
		this.e_btn_addName.children[1].children[0].disabled = true;
		this.e_btn_addName.style.lineHeight = "2rem";
		this.e_btn_addName.style.height = "2rem";

		this.e_btn_toggleOpen = this.AddControlButton("Join From Chat", RaffleState.instance.open ? "Close" : "Open", e =>
		{
			RaffleState.instance.ToggleOpen();
			this.e_btn_toggleOpen.style.backgroundColor = RaffleState.instance.open ? "#ffcc0050" : "#00ffcc50";
			this.e_btn_toggleOpen.value = RaffleState.instance.open ? "Close" : "Open";
			//SaveIndicator.AddShowTime(3);
			//Notifications.instance.Add(RaffleState.instance.open ? "Raffle Open" : "Raffle Closed", "#ffff0030");
		}, false);
		this.e_btn_toggleOpen.style.backgroundColor = RaffleState.instance.open ? "#ffcc0050" : "#00ffcc50";

		var e_btn_clearNames = this.AddControlButton("Clear All Names", "Clear", e =>
		{
			RaffleState.instance.ClearNames();
			//SaveIndicator.AddShowTime(3);
			//Notifications.instance.Add("Raffle Names Cleared", "#ffff0050");
		}, false);
		e_btn_clearNames.style.backgroundColor = "#ff330050";
		e_btn_clearNames.style.color = "#ffffffaa";

		this.e_btn_run = this.AddControlButton("Run Raffle", "Run", e =>
		{
			RaffleState.instance.TryRun();
			this.e_btn_run.disabled = RaffleState.instance.running;
		}, false);
		this.e_btn_run.disabled = RaffleState.instance.running;
		this.e_btn_run.style.backgroundColor = "#00ff0050";
		this.e_btn_run.style.color = "#ffffffaa";


		this.sub_raffleRunStart = RaffleState.onRaffleRunStart.RequestSubscription(() => { this.e_btn_run.disabled = true; });
		this.sub_raffleRunEnd = RaffleState.onRaffleRunEnd.RequestSubscription(() => { this.e_btn_run.disabled = false; });
	}

	onWindowClose()
	{
		RaffleState.onRaffleRunStart.RemoveSubscription(this.sub_raffleRunStart);
		RaffleState.onRaffleRunEnd.RemoveSubscription(this.sub_raffleRunEnd);
	}

	AddControlButton(label, buttonText, action, dirtiesSettings = false)
	{
		var e_ctrl = this.AddButton(label, buttonText, action, dirtiesSettings);
		var e_btn = e_ctrl.children[1].children[0];
		e_ctrl.style.lineHeight = "2rem";
		e_ctrl.style.height = "2rem";
		return e_btn;
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


OptionManager.AppendOption("raffle.visible", true, "Show Overlay");
OptionManager.AppendOption("raffle.title", "New Raffle", "Title");
OptionManager.AppendOption("raffle.keyword", "joinraffle", "Join Key Phrase");
OptionManager.AppendOption("raffle.slide.bend", 0.0, "Slide Bend");
OptionManager.AppendOption("raffle.slide.pad", 0.0, "Entry Padding");
