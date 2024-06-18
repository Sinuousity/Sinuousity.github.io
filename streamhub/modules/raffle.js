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
		TwitchResources.GetOrRequestData([newName], x => { RaffleOverlay.instance.RefreshEntryImages(); });
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
		this.running = false;
		window.clearInterval(this.runIntervalId);
		this.TryStore();

		this.showingWinner = true;
		RaffleState.onRaffleRunEnd.Invoke();
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
	constructor(cellIndex)
	{
		this.cellIndex = cellIndex;
		this.indexOffsetChanged = false;

		this.selected = false;
		this.entryIndex = -1;
		this.cellIndexOffset = 99999;
		this.relativeCellIndex = 9999999;
		this.offsetPosition = 0;

		this.username = "";
		this.profileImageUrl = "";
		this.waitingOnImage = false;

		this.e_root = document.createElement("div");
		this.e_root.className = "raffle-entry-root";
		this.e_root.draggable = false;

		this.e_name = document.createElement("div");
		this.e_name.className = "raffle-entry-name";
		this.e_name.draggable = false;

		this.e_name_span = document.createElement("span");
		this.e_name_span.innerText = "";
		this.e_name_span.draggable = false;
		this.e_name.appendChild(this.e_name_span);

		this.e_image = document.createElement("img");
		this.e_image.src = "";
		this.e_image.draggable = false;

		this.e_root.appendChild(this.e_image);
		this.e_root.appendChild(this.e_name);
	}

	UpdateIndices(slideIndex, slideIndexReal, slidePosition, nameCount, cellPad)
	{
		const halfCount = 3;

		var newCellIndexOffset = this.cellIndex - slideIndex;
		this.indexOffsetChanged = this.cellIndexOffset != newCellIndexOffset;
		this.cellIndexOffset = newCellIndexOffset;

		this.selected = this.cellIndexOffset == 0;
		this.offsetPosition = this.cellIndexOffset + (slidePosition - 0.5);
		this.offsetPosition = RaffleOverlay.WrapIndex(this.offsetPosition, -halfCount, halfCount);
		this.offsetPosition *= 1.0 + cellPad;

		this.relativeCellIndex = RaffleOverlay.WrapIndex(this.cellIndexOffset, -halfCount, halfCount);

		var newEntryIndex = RaffleOverlay.WrapIndex(slideIndexReal + this.relativeCellIndex, 0, nameCount);
		var entryIndexChanged = newEntryIndex != this.entryIndex;
		this.entryIndex = newEntryIndex;

		this.username = RaffleState.instance.names[this.entryIndex];
		this.e_name_span.innerText = this.username;

		if (entryIndexChanged) this.RefreshImageProfile();
	}

	UpdateTransform(slidePosition, cellSize, cellRootWidth, bend, scalePercentX, scalePercentY, transitionDuration)
	{
		var twist = `rotate3d(0,1,1,${(this.relativeCellIndex + slidePosition - 0.5) * bend}deg)`;
		var lift = `${(1.0 - Math.pow(Math.abs(this.relativeCellIndex + slidePosition - 0.5), 2)) * -bend}`;

		this.e_root.style.transform = `translate(-50%,${lift}%) scale(${scalePercentX}%, ${scalePercentY}%) ${twist}`;
		this.e_root.style.left = `${this.offsetPosition * cellSize + cellRootWidth * 0.5}px`;
		this.e_root.style.transitionDuration = transitionDuration + "s";
		this.e_root.style.outline = "solid transparent 3px";
		this.e_root.style.outlineOffset = "-16px";
		this.e_root.style.boxShadow = (this.selected && RaffleState.instance.showingWinner) ? "goldenrod 0px 0px 32px 8px" : "none";
	}

	UpdateImageStyle(stretch)
	{
		this.e_image.style.opacity = (this.selected ? 0.95 : 0.2) - 0.1 * stretch;
	}

	UpdateNameStyle()
	{
		var nameShow = 1.0 - 0.7 * Math.abs(this.relativeCellIndex);
		var isWinner = this.selected && RaffleState.instance.showingWinner;

		this.e_name.style.opacity = `${100 * nameShow}%`;
		this.e_name.style.maxWidth = this.selected ? "200%" : "80%";
		//this.e_name.style.overflow = this.selected ? "visible" : "hidden";
		this.e_name.style.transform = `translate(-50%, 0%) scale(${70 + 30 * nameShow}%)`;
		//this.e_name.style.backgroundBlendMode = "normal";
		this.e_root.style.backgroundImage = "unset";
		this.e_root.style.animation = "unset";

		this.e_name_span.style.webkitTextFillColor = isWinner ? "#ffffff30" : "#ffffffff";
	}

	RefreshImageProfile()
	{
		if (this.username == "") return;

		const lowerUsername = this.username.toLowerCase();

		var cacheIndex = TwitchResources.profileDataCache.IndexOf(lowerUsername);
		if (cacheIndex < 0) 
		{
			TwitchResources.GetOrRequestData(lowerUsername, x => { RaffleOverlay.instance.RefreshEntryImages(); });
			return;
		}

		this.e_image.src = TwitchResources.profileDataCache.values[cacheIndex].profile_image_url;
	}
}

export class RaffleOverlay
{
	static instance = new RaffleOverlay();
	static canRefreshImages = true;

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

		this.e_zone_entry_count = document.createElement("div");
		this.e_zone_entry_count.className = "raffle-title-count";
		this.e_zone_entry_count.innerText = RaffleState.instance.names.length + " ENTERED";
		this.e_zone_entry_count.draggable = false;
		this.e_zone_title.appendChild(this.e_zone_entry_count);

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
		this.e_names_slider.addEventListener("mousedown", () =>
		{
			this.draggingEntries = true;
			this.e_names_slider.style.cursor = "grabbing";
		});
		window.addEventListener("mouseup", () =>
		{
			this.draggingEntries = false;
			this.e_names_slider.style.cursor = "grab";
		});
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

		this.animationDeltaTime = 0.0;
		this.animationTimeLast = 0.0;
		this.animationTime = 0.0;

		this.lastMousePositionX = UserInput.instance.mousePositionX;

		this.sub_raffleRunStart = RaffleState.onRaffleRunStart.RequestSubscription(() => { this.OnRaffleStarted(); });
		this.sub_raffleRunEnd = RaffleState.onRaffleRunEnd.RequestSubscription(() => { this.OnRaffleConcluded(); });

		requestAnimationFrame(x => { this.UpdateEntryPositions(x); });
	}

	OnRaffleStarted()
	{
		this.slideIndex = Math.round(Math.random() * RaffleState.instance.names.length);
		if (Math.abs(this.slideVelocity) > 2.0)
			this.slideVelocity = Math.sign(this.slideVelocity) * 30.0 * (Math.random() * 0.3 + 0.7);
		else
			this.slideVelocity = (Math.random() > 0.5 ? -1.0 : 1.0) * 30.0 * (Math.random() * 0.3 + 0.7);
		this.showingWinner = false;
		this.UpdateStyle();
	}

	OnRaffleConcluded()
	{
		this.slideVelocity = 0.0;
		this.UpdateStyle();
	}

	RefreshEntryImages()
	{
		if (!RaffleOverlay.canRefreshImages) return;
		if (Math.abs(this.slideVelocity) > 42.0) return;
		for (var nameIndex = 0; nameIndex < this.e_entries.length; nameIndex++)
		{
			this.e_entries[nameIndex].RefreshImageProfile();
		}
		RaffleOverlay.canRefreshImages = false;
	}

	CheckDragInput()
	{
		var mouseDeltaX = (this.draggingEntries && !RaffleState.instance.showingWinner && !RaffleState.instance.running) ? (UserInput.instance.mousePositionX - this.lastMousePositionX) : 0.0;
		this.lastMousePositionX = UserInput.instance.mousePositionX;
		if (this.draggingEntries) this.slideVelocity += mouseDeltaX * 0.01;

		var canRun = !RaffleState.instance.open && !RaffleState.instance.showingWinner && !RaffleState.instance.running;

		var canRunFromDrag = canRun && OptionManager.GetOptionValue("raffle.drag.run", true);
		if (canRunFromDrag && Math.abs(this.slideVelocity) > 10.0 && Math.abs(mouseDeltaX) > 150.0 && canRun) RaffleState.instance.TryRun();

	}

	UpdateEntryPositions(timestamp)
	{
		var overlayAllowed = OptionManager.GetOptionValue("raffle.visible") === true;
		this.e_zone_root.style.display = overlayAllowed ? "block" : "none";

		var deltaTimeMs = timestamp - this.animationTimeLast;
		this.animationTimeLast = timestamp;
		this.animationDeltaTime += deltaTimeMs;

		if (this.animationDeltaTime < 15)
		{
			requestAnimationFrame(x => { this.UpdateEntryPositions(x); });
			return;
		}

		var deltaTime = this.animationDeltaTime * 0.001;
		this.animationTime += deltaTime;
		this.animationDeltaTime = 0;

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
			if (RaffleState.instance.open) this.slideVelocity += (Math.sign(this.slideVelocity - 0.00001) - this.slideVelocity) * deltaTime * 2.9;
		}

		//drag
		this.slideVelocity -= Math.min(deltaTime * (stick * 0.5 + (RaffleState.instance.showingWinner ? 0.3 : 0.15)), 1.0) * this.slideVelocity;

		//entry midpoint stickiness
		this.slideVelocity += midoffset * Math.min(1.0, deltaTime * 20.0 * stick);

		if (Math.abs(this.slideVelocity) < 0.03) 
		{
			this.slideVelocity = 0.0;
		}


		this.CheckDragInput();
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
		//var doImages = Math.abs(this.slideVelocity) < 42.0;

		var scalePercentY = 100;
		var scalePercentX = scalePercentY + stretch * 100.0;
		var transitionDuration = Math.max(0.0, 0.12 - 6.0 * stretch);

		for (var nameIndex = 0; nameIndex < cellCount; nameIndex++)
		{
			var thisEntry = this.e_entries[nameIndex];
			thisEntry.UpdateIndices(this.slideIndex, this.slideIndexReal, this.slidePosition, nameCount, cellPad);
			thisEntry.UpdateTransform(this.slidePosition, cellSize, cellRootWidth, bend, scalePercentX, scalePercentY, transitionDuration);
			if (thisEntry.indexOffsetChanged)
			{
				thisEntry.UpdateImageStyle(stretch);
				thisEntry.UpdateNameStyle();
			}
			thisEntry.e_root.style.filter = `blur(${blur}px)`;
			/*
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

			var twist = `rotate3d(0,1,1,${(thisEntry.relativeCellIndex + this.slidePosition - 0.5) * bend}deg)`;
			var lift = `${(1.0 - Math.pow(Math.abs(thisEntry.relativeCellIndex + this.slidePosition - 0.5), 2)) * -bend}`;
			thisEntry.e_root.style.transform = `translate(-50%,${lift}%) scale(${scalePercentX}%, ${scalePercentY}%) ${twist}`;
			thisEntry.e_root.style.left = `${thisEntry.offsetPosition * cellSize + cellRootWidth * 0.5}px`;
			thisEntry.e_root.style.transitionDuration = transitionDuration + "s";
			thisEntry.e_root.style.outline = "solid transparent 3px";
			thisEntry.e_root.style.outlineOffset = "-16px";
			thisEntry.e_root.style.filter = `blur(${blur}px)`;

			if (doImages) thisEntry.SetImageProfile(nameActual);
			thisEntry.e_image.style.opacity = (thisEntry.selected ? 0.95 : 0.2) - 0.1 * stretch;

			var nameShow = 1.0 - 0.7 * Math.abs(thisEntry.relativeCellIndex);
			thisEntry.e_name.style.opacity = `${100 * nameShow}%`;
			thisEntry.e_name.style.maxWidth = thisEntry.selected ? "200%" : "80%";
			thisEntry.e_name.style.overflow = thisEntry.selected ? "visible" : "hidden";
			thisEntry.e_name.style.transform = `translate(-50%, 0%) scale(${70 + 30 * nameShow}%)`;
			thisEntry.e_name.style.backgroundBlendMode = "normal";
			thisEntry.e_root.style.backgroundImage = "unset";
			thisEntry.e_root.style.animation = "unset";
			//thisEntry.e_root.children[0].innerHTML = `name ${nameIdActual + 1}`;
			*/
		}


		var highlightedEntry = this.e_entries[this.slideIndex];
		if (RaffleState.instance.showingWinner)
		{
			highlightedEntry.e_image.style.backgroundBlendMode = "multiply";
			highlightedEntry.e_root.style.outline = "solid white 6px";
			highlightedEntry.e_root.style.backgroundImage = "radial-gradient(red, purple, blue, green, yellow, red)";
			highlightedEntry.e_root.style.outlineOffset = "8px";

			highlightedEntry.e_root.style.animation = "huerotate-outline";
			highlightedEntry.e_root.style.animationTimingFunction = "linear";
			highlightedEntry.e_root.style.animationDuration = "2s";
			highlightedEntry.e_root.style.animationIterationCount = "infinite";

			highlightedEntry.e_name_span.style.animation = "huerotate-outline";
			highlightedEntry.e_name_span.style.animationTimingFunction = "linear";
			highlightedEntry.e_name_span.style.animationDuration = "1.5s";
			highlightedEntry.e_name_span.style.animationIterationCount = "infinite";
		}
		else
		{
			highlightedEntry.e_root.style.backgroundImage = "unset";
			highlightedEntry.e_image.style.backgroundBlendMode = "normal";
			highlightedEntry.e_root.style.outline = "solid orange 3px";
			highlightedEntry.e_root.style.outlineOffset = "4px";
			highlightedEntry.e_root.style.animation = "unset";
			highlightedEntry.e_name_span.style.animation = "unset";
		}


		RaffleOverlay.canRefreshImages = true;


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
		var autohidden = OptionManager.GetOptionValue("raffle.autohide") === true;
		var overlayAllowed = OptionManager.GetOptionValue("raffle.visible") === true;
		this.e_zone_root.style.display = overlayAllowed ? "block" : "none";

		var showing = (!autohidden) || (RaffleState.instance.open || RaffleState.instance.names.length > 0);
		this.e_zone_root.style.opacity = showing ? "100%" : "0%";
		this.e_zone_root.style.zIndex = showing ? "all" : "none";

		this.e_zone_title_span.innerText = RaffleState.instance.title;

		this.e_zone_subtitle.innerText = RaffleState.instance.running ? "RUNNING" : (RaffleState.instance.open ? "OPEN" : "CLOSED");
		this.e_zone_subtitle.style.textShadow = RaffleState.instance.running ? "#ffff00c0 0px 0px 11px" : "unset";
		this.e_zone_subtitle.style.color = RaffleState.instance.running ? "goldenrod" : (RaffleState.instance.open ? "lightgreen" : "red");

		this.e_zone_entry_count.innerText = RaffleState.instance.names.length + " ENTERED";
	}

	Recreate()
	{
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

		if (RaffleState.instance.names.length < 1) return;

		var cellCount = 6;//Math.min(6, RaffleState.instance.names.length);
		for (var ii = 0; ii < cellCount; ii++)
		{
			const id = ii;
			var entry = new RaffleOverlayEntry(id);
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

		this.e_window_root.style.minHeight = "380px";
		this.e_window_root.style.minWidth = "320px";

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

		this.option_autohide = OptionManager.GetOption("raffle.autohide");
		this.e_control_autohide = this.AddToggle(
			this.option_autohide.label,
			this.option_autohide.value,
			x =>
			{
				OptionManager.SetOptionValue("raffle.autohide", x.checked);
				RaffleOverlay.instance.UpdateStyle();
			},
			true
		);

		this.option_drag_run = OptionManager.GetOption("raffle.drag.run");
		this.e_control_drag_run = this.AddToggle(
			this.option_drag_run.label,
			this.option_drag_run.value,
			x =>
			{
				OptionManager.SetOptionValue("raffle.drag.run", x.checked);
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


OptionManager.AppendOption("raffle.visible", true, "Enable Overlay");
OptionManager.AppendOption("raffle.autohide", true, "AutoHide Overlay");
OptionManager.AppendOption("raffle.title", "New Raffle", "Title");
OptionManager.AppendOption("raffle.keyword", "joinraffle", "Join Key Phrase");
OptionManager.AppendOption("raffle.slide.bend", 0.0, "Slide Bend");
OptionManager.AppendOption("raffle.slide.pad", 0.0, "Entry Padding");
OptionManager.AppendOption("raffle.drag.run", true, "Run By Dragging");
