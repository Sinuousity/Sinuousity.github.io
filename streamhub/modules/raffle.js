import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import { OptionManager } from "./globalsettings.js";
import { UserInput } from "./userinput.js";
import { ChatCollector } from "./chatcollector.js";
import { EventSource } from "./eventsource.js";
import { MultiPlatformUser, MultiPlatformUserCache } from "./multiplatformuser.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { AnimJob } from "./AnimJob.js";

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

		//this.runIntervalId = -1;
		this.runTime = 0.0;

		this.modified = false;
		this.modifiedTimer = 0.0;
		this.delayedStoreIntervalId = -1;

		this.newMessageSubscription = ChatCollector.onMessageReceived.RequestSubscription(m => { this.CheckMessageForKeyPhrase(m); });
	}

	CheckMessageForKeyPhrase(m)
	{
		if (!RaffleState.instance.open) return;

		var keywordRequired = this.keyword != "";
		if (!keywordRequired)
		{
			this.AddName(m.username, m.source, false);
			return;
		}

		var opt_keyword = OptionManager.GetOption("raffle.keyword");
		var opt_keyword_first = OptionManager.GetOption("raffle.keyword.first");
		var opt_keyword_casesens = OptionManager.GetOption("raffle.keyword.case.sensitive");
		var doCaseSensitive = opt_keyword_casesens.value === true;

		var actualKeyPhase = doCaseSensitive ? opt_keyword.value : opt_keyword.value.toLowerCase();
		var actualMessage = doCaseSensitive ? m.message : m.message.toLowerCase();

		var keyPhraseMatch = false;
		if (opt_keyword_first.value === true) keyPhraseMatch = actualMessage.startsWith(actualKeyPhase);
		else keyPhraseMatch = actualMessage.includes(actualKeyPhase);

		if (keyPhraseMatch) this.AddName(m.username, m.source, false);
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
		if (this.showingWinner) this.showingWinner = false;
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

	IndexOfEntry(username, platform = "any")
	{
		for (var entryIndex in this.names)
		{
			var entry = this.names[entryIndex];
			if (username == entry.username && (platform == "any" || entry.platform == platform)) return entryIndex;
		}
		return -1;
	}

	AddName(newName, platform = "any", force = false)
	{
		if (!force && (this.running || !this.open)) return;
		if (this.IndexOfEntry(newName, platform) > -1) return;
		this.names.push({ username: newName, platform: platform });
		this.TryStore();
		RaffleOverlay.instance.Recreate();
	}

	RemoveEntry(entryIndex)
	{
		this.names.splice(entryIndex, 1);
		this.TryStore();
		RaffleOverlay.instance.Recreate();
	}

	RemoveName(oldName, force = false)
	{
		if (!force && this.running) return;
		var entryIndex = this.IndexOfEntry(oldName);
		if (entryIndex < 0) return;
		this.RemoveEntry(entryIndex);
	}

	static msFrameDuration = 20;
	TryRun()
	{
		if (this.showingWinner) return;
		if (this.running) return;

		this.Close();
		this.running = true;
		this.runTime = 0.0;
		RaffleState.onRaffleRunStart.Invoke();


		console.log('raffle started');
		if (this.anim_run) { this.anim_run.Start(); }
		else
		{
			this.anim_run = new AnimJob(window.targetFrameDeltaMs, dt => this.RunStep(dt));
			this.anim_run.Start();
		}

		//this.runIntervalId = window.setInterval(() => { this.RunStep(); }, RaffleState.msFrameDuration);
	}

	RunStep(dt)
	{
		//var deltaTime = RaffleState.msFrameDuration / 1000.0;

		this.runTime += dt;
		this.slidePhase += RaffleOverlay.instance.slideVelocity * dt;

		if (Math.abs(RaffleOverlay.instance.slideVelocity) < 0.011) this.FinishRun();
	}

	FinishRun()
	{
		console.log('raffle ended');

		this.running = false;

		this.anim_run.Stop();
		//window.clearInterval(this.runIntervalId);

		this.TryStore();

		this.showingWinner = true;
		RaffleState.onRaffleRunEnd.Invoke();
		//show winner for 10 seconds
		window.setTimeout(() => { this.showingWinner = false; }, 10000);
	}

	ClearNames()
	{
		if (this.showingWinner) return;
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

		this.user = {};
		this.username = "";
		this.platform = "";
		this.profileImageUrl = "";
		this.waitingOnImage = false;

		this.e_root = document.createElement("div");
		this.e_root.className = "raffle-entry-root";
		this.e_root.draggable = false;

		this.e_name = document.createElement("div");
		this.e_name.className = "raffle-entry-name";
		this.e_name.draggable = false;

		this.e_btn_remove = document.createElement("div");
		this.e_btn_remove.title = "Remove Entry";
		this.e_btn_remove.style.cursor = "pointer";
		this.e_btn_remove.style.position = "absolute";
		this.e_btn_remove.style.left = "50%";
		this.e_btn_remove.style.bottom = "0%";
		this.e_btn_remove.style.transform = "translate(-50%,0%)";
		//this.e_btn_remove.style.fontFamily = "'Material Icons'";
		this.e_btn_remove.style.width = "6rem";
		this.e_btn_remove.style.letterSpacing = "0.15rem";
		this.e_btn_remove.style.height = "1rem";
		this.e_btn_remove.style.lineHeight = "1rem";
		this.e_btn_remove.style.fontSize = "0.8rem";
		this.e_btn_remove.style.textAlign = "center";
		this.e_btn_remove.style.borderRadius = "0.5rem 0.5rem 0rem 0rem";
		this.e_btn_remove.style.backgroundColor = "#ffffff20";
		this.e_btn_remove.style.color = "#ffffff40";
		this.e_btn_remove.style.transitionProperty = "opacity, height, line-height";
		this.e_btn_remove.style.transitionDuration = "0.1s";
		this.e_btn_remove.innerText = "REMOVE";
		this.e_btn_remove.draggable = false;
		this.e_btn_remove.addEventListener("click", () => { RaffleState.instance.RemoveEntry(this.entryIndex); });
		this.e_btn_remove.addEventListener(
			"mouseenter",
			() =>
			{
				this.e_btn_remove.style.color = "#ffffffff";
				this.e_btn_remove.style.backgroundColor = "#ff0000ff";
				this.e_btn_remove.style.height = "1.5rem";
				this.e_btn_remove.style.lineHeight = "1.5rem";
			}
		);
		this.e_btn_remove.addEventListener(
			"mouseleave",
			() =>
			{
				this.e_btn_remove.style.color = "#ffffff40";
				this.e_btn_remove.style.backgroundColor = "#ffffff20";
				this.e_btn_remove.style.height = "1rem";
				this.e_btn_remove.style.lineHeight = "1rem";
			}
		);

		this.e_name_span = document.createElement("span");
		this.e_name_span.innerText = "";
		this.e_name_span.draggable = false;
		this.e_name.appendChild(this.e_name_span);

		this.e_image = document.createElement("img");
		this.e_image.src = "";
		this.e_image.draggable = false;

		this.e_root.appendChild(this.e_image);
		this.e_root.appendChild(this.e_name);
		this.e_root.appendChild(this.e_btn_remove);

		this.ClearProfileImage();
	}

	UpdateIndices(slideIndex, slideIndexReal, slidePosition, nameCount, cellPad)
	{
		const halfCount = 4;

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

		this.username = RaffleState.instance.names[this.entryIndex].username;
		this.platform = RaffleState.instance.names[this.entryIndex].platform;
		this.user = MultiPlatformUserCache.GetUser(this.username, this.platform);
		this.e_name_span.innerText = this.username;

		if (entryIndexChanged) this.RefreshImageProfile();
	}

	UpdateTransform(slidePosition, cellSize, cellRootWidth, scalePercentX, scalePercentY, transitionDuration)
	{
		var posdelta = this.relativeCellIndex + slidePosition - 0.5;
		var bothSides = Math.pow(Math.abs(posdelta) * 0.7, 2);
		var bothSidesSigned = bothSides * Math.sign(posdelta);

		var lift = `${(1.0 - bothSides) * -RaffleOverlay.instance.bend}`;
		var scaleMult = 1.0 + bothSidesSigned * RaffleOverlay.instance.zoom * 0.05;

		var styleTransform = `translate(-50%, ${lift}%)`;
		styleTransform += ` perspective(60rem)`;
		styleTransform += ` scale(${scalePercentX * scaleMult}%, ${scalePercentY * scaleMult}%)`;
		styleTransform += ` rotate3d(0,0,1,${posdelta * RaffleOverlay.instance.bend + bothSidesSigned * RaffleOverlay.instance.turn * 5.0}deg)`;
		styleTransform += ` rotate3d(0,1,0,${bothSidesSigned * RaffleOverlay.instance.flipX * 15}deg)`;
		styleTransform += ` rotate3d(1,0,0,${bothSidesSigned * RaffleOverlay.instance.flipY * 15 * 0.3333}deg)`;

		this.e_root.style.transform = styleTransform;
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

		this.e_btn_remove.style.opacity = `${100 * nameShow * nameShow}%`;

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
		if (!this.user) { this.ClearProfileImage(); return; }
		if (!this.user.profileImageSource) { this.ClearProfileImage(); return; }

		this.e_image.src = this.user.profileImageSource;
		this.e_image.style.filter = "none";
	}

	ClearProfileImage()
	{
		this.e_image.src = "./images/nobody.png";
		this.e_image.style.filter = "hue-rotate(" + this.entryIndex * 78.135 + "deg)";
	}
}

export class RaffleOverlay
{
	static instance = new RaffleOverlay();
	static canRefreshImages = true;

	constructor()
	{

		MultiPlatformUserCache.onNewUser.RequestSubscription(() => { RaffleOverlay.instance.RefreshEntryImages(); });
		MultiPlatformUser.onAnyDataCached.RequestSubscription(() => { RaffleOverlay.instance.RefreshEntryImages(); });

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
		this.e_zone_entry_count.draggable = false;
		this.e_zone_title.appendChild(this.e_zone_entry_count);

		this.e_zone_entry_count_text = document.createElement("div");
		this.e_zone_entry_count_text.innerText = RaffleState.instance.names.length + " ENTERED";
		this.e_zone_entry_count_text.draggable = false;
		this.e_zone_entry_count.appendChild(this.e_zone_entry_count_text);

		this.e_zone_clear_all = document.createElement("div");
		this.e_zone_clear_all.className = "raffle-title-clear";
		this.e_zone_clear_all.innerText = "CLEAR ALL";
		this.e_zone_clear_all.draggable = false;
		this.e_zone_clear_all.addEventListener("click", e => { RaffleState.instance.ClearNames(); });
		this.e_zone_entry_count.appendChild(this.e_zone_clear_all);

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
		var e_fader = document.getElementById("site-fader");
		document.body.appendChild(e_fader);

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


		this.UpdateStyle();

		this.animJob_raffle_animation = new AnimJob(window.targetFrameDeltaMs, dt => this.UpdateAnimation(dt));
		this.OnShowOverlay();
	}

	OnShowOverlay()
	{
		this.animJob_raffle_animation.Start();
	}

	OnHideOverlay()
	{
		this.animJob_raffle_animation.Stop();
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
		var mouseDeltaX = (this.draggingEntries && !RaffleState.instance.running) ? (UserInput.instance.mousePositionX - this.lastMousePositionX) : 0.0;
		this.lastMousePositionX = UserInput.instance.mousePositionX;
		if (this.draggingEntries) this.slideVelocity += mouseDeltaX * 0.01;

		if (RaffleState.instance.showingWinner)
		{
			if (Math.abs(this.slideVelocity) > 1.0) RaffleState.instance.showingWinner = false;
		}

		var canRun = !RaffleState.instance.open && !RaffleState.instance.running;
		var canRunFromDrag = canRun && OptionManager.GetOptionValue("raffle.drag.run", true);
		if (canRunFromDrag && Math.abs(this.slideVelocity) > 10.0 && Math.abs(mouseDeltaX) > 150.0 && canRun) RaffleState.instance.TryRun();

	}

	UpdateAnimation(dt)
	{
		const key_raffle_visible = 'raffle.visible';
		let overlayAllowed = OptionManager.GetOptionValue(key_raffle_visible) === true;
		this.e_zone_root.style.display = overlayAllowed ? "block" : "none";

		if (overlayAllowed === false) return;
		if (dt <= 0.0) return;

		var nameCount = RaffleState.instance.names.length;
		if (nameCount < 1) return;

		var midoffset = 0.5 - this.slidePosition;
		var stick = 1.0 - Math.min(1.0, Math.abs(this.slideVelocity) * 2.0);

		// idle cruise
		if (!RaffleState.instance.running && !RaffleState.instance.showingWinner) 
		{
			//no stickiness during cruise
			stick = 0.0;
			//add 'cruising' velocity
			if (RaffleState.instance.open) this.slideVelocity += (Math.sign(this.slideVelocity - 0.00001) - this.slideVelocity) * dt * 2.9;
		}

		//drag
		this.slideVelocity -= Math.min(dt * (stick * 0.5 + (RaffleState.instance.showingWinner ? 0.3 : 0.15)), 1.0) * this.slideVelocity;

		//entry midpoint stickiness
		this.slideVelocity += midoffset * Math.min(1.0, dt * 20.0 * stick);

		if (Math.abs(this.slideVelocity) < 0.03) 
		{
			this.slideVelocity = 0.0;
		}


		this.CheckDragInput();
		var clampedVelocity = Math.sign(this.slideVelocity) * Math.min(dt * Math.abs(this.slideVelocity), 0.99);

		var cellCount = 8;
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

		this.bend = OptionManager.GetOptionValue("raffle.slide.bend");
		this.zoom = OptionManager.GetOptionValue("raffle.slide.zoom");
		this.turn = OptionManager.GetOptionValue("raffle.slide.turn");
		this.flipX = OptionManager.GetOptionValue("raffle.slide.flipx");
		this.flipY = OptionManager.GetOptionValue("raffle.slide.flipy");
		//var doImages = Math.abs(this.slideVelocity) < 42.0;

		var scalePercentY = 100;
		var scalePercentX = scalePercentY + stretch * 100.0;
		var transitionDuration = Math.max(0.0, 0.12 - 6.0 * stretch);

		for (var cellIndex = 0; cellIndex < cellCount; cellIndex++)
		{
			var thisEntry = this.e_entries[cellIndex];
			thisEntry.UpdateIndices(this.slideIndex, this.slideIndexReal, this.slidePosition, nameCount, cellPad);
			thisEntry.UpdateTransform(this.slidePosition, cellSize, cellRootWidth, scalePercentX, scalePercentY, transitionDuration);
			if (thisEntry.indexOffsetChanged)
			{
				thisEntry.UpdateImageStyle(stretch);
				thisEntry.UpdateNameStyle();
			}
			thisEntry.e_root.style.filter = `blur(${blur}px)`;
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
	}

	/*
	UpdateEntryPositions(timestamp)
	{
		var overlayAllowed = OptionManager.GetOptionValue("raffle.visible") === true;
		this.e_zone_root.style.display = overlayAllowed ? "block" : "none";

		var deltaTimeMs = timestamp - this.animationTimeLast;
		this.animationTimeLast = timestamp;
		this.animationDeltaTime += deltaTimeMs;

		if (this.animationDeltaTime > 16)
		{
			var deltaTime = this.animationDeltaTime * 0.001;
			this.animationTime += deltaTime;
			this.animationDeltaTime = 0;
		}

		requestAnimationFrame(x => { this.UpdateEntryPositions(x); });
	}
	*/

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
		var autohide = OptionManager.GetOptionValue("raffle.autohide") === true;
		var overlayAllowed = OptionManager.GetOptionValue("raffle.visible") === true;
		this.e_zone_root.style.display = overlayAllowed ? "block" : "none";

		var showing = overlayAllowed && (!autohide || (RaffleState.instance.open || RaffleState.instance.names.length > 0));
		this.e_zone_root.style.opacity = showing ? "100%" : "0%";
		this.e_names_slider.style.pointerEvents = showing ? "all" : "none";
		this.e_zone_entry_count.style.pointerEvents = showing ? "all" : "none";
		this.e_zone_subtitle.style.pointerEvents = showing ? "all" : "none";

		this.e_zone_title_span.innerText = RaffleState.instance.title === "" ? "Raffle" : RaffleState.instance.title;

		this.e_zone_subtitle.innerText = RaffleState.instance.showingWinner ? "COMPLETE!" : (RaffleState.instance.running ? "RUNNING" : (RaffleState.instance.open ? "OPEN" : "CLOSED"));
		this.e_zone_subtitle.style.textShadow = RaffleState.instance.running ? "#ffff00c0 0px 0px 11px" : "unset";
		this.e_zone_subtitle.style.color = RaffleState.instance.running ? "goldenrod" : (RaffleState.instance.open ? "lightgreen" : "red");

		this.e_zone_entry_count_text.innerText = RaffleState.instance.names.length + " ENTERED";
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

		var cellCount = 8;
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

		this.e_window_root.style.maxHeight = "730px";
		this.e_window_root.style.minWidth = "320px";

		this.CreateContentContainer();
		this.SetIcon("confirmation_number");
		this.SetTitle("Raffle Options");

		this.e_form = {};
		this.e_info = {};
		this.e_raffle_toggle = {};

		this.CreateControlsColumn();

		this.AddSectionTitle("General");

		this.e_control_visible = this.AddOptionToggle("raffle.visible", "Show the raffle overlay at all?");
		this.e_control_drag_run = this.AddOptionToggle("raffle.drag.run", "Whether the raffle can be started by dragging quickly.");

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
		this.e_control_title.children[1].children[0].placeholder = "Just 'Raffle'";
		this.e_control_title.style.lineHeight = "2rem";
		this.e_control_title.style.height = "2rem";
		const title_desc = "The title of the raffle, shown atop the overlay.";
		GlobalTooltip.RegisterReceiver(this.e_control_title, title_desc, title_desc);


		this.e_control_keyword = this.AddTextField(
			"Key Phrase",
			OptionManager.GetOptionValue("raffle.keyword", "joinraffle"),
			e =>
			{
				var trimmedValue = e.value.trim();
				OptionManager.SetOptionValue("raffle.keyword", trimmedValue);
				RaffleState.instance.SetKeyword(trimmedValue);
			},
			true
		);
		this.e_control_keyword.children[1].children[0].placeholder = "No Phrase Required";
		const keyword_desc = "The key phrase viewers must type to join.";
		GlobalTooltip.RegisterReceiver(this.e_control_keyword, keyword_desc, keyword_desc);
		this.e_control_keyword.style.lineHeight = "2rem";
		this.e_control_keyword.style.height = "2rem";


		this.AddSectionTitle("Key Phrase Options");
		this.e_control_keyword_first = this.AddOptionToggle("raffle.keyword.first", "Require that the key phrase be the first thing in a message to join?");
		this.e_control_keyword_case_sensitive = this.AddOptionToggle("raffle.keyword.case.sensitive", "Is the key phrase case sensitive?");

		this.AddSectionTitle("Appearance");

		this.e_control_autohide = this.AddOptionToggle("raffle.autohide", "Hides the overlay when it is closed and there are no entries.");


		this.e_control_slide_curve = this.AddOptionSlider("raffle.slide.bend", -13, 13, "How curved is the entry slide, and which direction?", true);
		this.e_control_slide_curve = this.AddOptionSlider("raffle.slide.zoom", -10.0, 10.0, "How zoomy is the entry slide, and which direction?", true);
		this.e_control_slide_pad = this.AddOptionSlider("raffle.slide.pad", 0, 20, "Extra spacing between entries in the slide.", true);
		this.e_control_slide_turn = this.AddOptionSlider("raffle.slide.turn", -12, 12, "How much entries turn facing you as they slide.", true);
		this.e_control_slide_flipX = this.AddOptionSlider("raffle.slide.flipx", -12, 12, "How much entries turn horizontally as they slide.", true);
		this.e_control_slide_flipY = this.AddOptionSlider("raffle.slide.flipy", -12, 12, "How much entries turn vertically as they slide.", true);


		this.AddSectionTitle("Manual Add");
		this.e_control_addName = this.AddTextField(
			"Manual Add",
			"",
			e => { this.e_btn_addName.children[1].children[0].disabled = e.value == "" || RaffleState.instance.running; },
			false
		);
		this.txt_addName = this.e_control_addName.children[1].children[0];
		this.txt_addName.placeholder = "Enter Username";
		this.e_control_addName.style.lineHeight = "2rem";
		this.e_control_addName.style.height = "2rem";

		this.e_btn_addName = this.AddButton("", "Add", e =>
		{
			RaffleState.instance.AddName(this.txt_addName.value, "any", true);
			this.e_btn_addName.children[1].children[0].disabled = true;
			this.txt_addName.value = "";
		}, false);
		this.e_btn_addName.children[1].children[0].disabled = true;
		this.e_btn_addName.style.lineHeight = "2rem";
		this.e_btn_addName.style.height = "2rem";

		const addname_desc = "Add a name manually! Enter any username and it will be added. The user doesn't have to exist, but it helps if they do.";
		GlobalTooltip.RegisterReceiver(this.e_control_addName, addname_desc, addname_desc);


		this.AddSectionTitle("Controls");
		this.e_btn_toggleOpen = this.AddControlButton("Join From Chat", RaffleState.instance.open ? "Close" : "Open", e =>
		{
			RaffleState.instance.ToggleOpen();
			this.e_btn_toggleOpen.style.backgroundColor = RaffleState.instance.open ? "#ffcc0050" : "#00ffcc50";
			this.e_btn_toggleOpen.value = RaffleState.instance.open ? "Close" : "Open";
		}, false);
		this.e_btn_toggleOpen.style.backgroundColor = RaffleState.instance.open ? "#ffcc0050" : "#00ffcc50";

		this.e_btn_clearNames = this.AddControlButton("Clear All Names", "Clear", e =>
		{
			RaffleState.instance.ClearNames();
		}, false);
		this.e_btn_clearNames.style.backgroundColor = "#ff330050";
		this.e_btn_clearNames.style.color = "#ffffffaa";

		this.e_btn_run = this.AddControlButton("Run Raffle", "Run", e =>
		{
			RaffleState.instance.TryRun();
		}, false);

		this.e_btn_run.style.backgroundColor = "#00ff0050";
		this.e_btn_run.style.color = "#ffffffaa";


		this.sub_raffleRunStart = RaffleState.onRaffleRunStart.RequestSubscription(() => { this.DisableLiveControls(); });
		this.sub_raffleRunEnd = RaffleState.onRaffleRunEnd.RequestSubscription(() => { this.EnableLiveControls(); });
		this.EnableLiveControls();
	}



	AddOptionSlider(option_key, min, max, tooltip = "", roundValue = false)
	{
		var opt = OptionManager.GetOption(option_key);
		var control = this.AddSlider(
			opt.label,
			opt.value,
			min, max,
			x =>
			{
				OptionManager.SetOptionValue(option_key, roundValue ? Math.round(x.value) : x.value);
			},
			true
		);
		GlobalTooltip.RegisterReceiver(control, tooltip, tooltip);
	}

	AddOptionToggle(option_key, tooltip = "")
	{
		var opt = OptionManager.GetOption(option_key);
		var control = this.AddToggle(
			opt.label,
			opt.value,
			x =>
			{
				OptionManager.SetOptionValue(option_key, x.checked);
				RaffleOverlay.instance.UpdateStyle();
			},
			true
		);
		GlobalTooltip.RegisterReceiver(control, tooltip, tooltip);
		return control;
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

	EnableLiveControls()
	{
		this.e_btn_run.disabled = false;
		this.e_btn_addName.disabled = this.txt_addName.value == "";
		this.e_btn_toggleOpen.disabled = false;
		this.e_btn_clearNames.disabled = false;
	}

	DisableLiveControls()
	{
		this.e_btn_run.disabled = true;
		this.e_btn_addName.disabled = true;
		this.e_btn_toggleOpen.disabled = true;
		this.e_btn_clearNames.disabled = true;
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: "Raffle",
		icon: "confirmation_number",
		icon_color: 'orange',
		desc: "Spin a wheel! Kinda! Viewers can join! You can add any name! It twists!",
		model: (x, y) => { return new RaffleSettingsWindow(x, y); },
		sort_order: -1,
		shortcutKey: 'r'
	}
);


OptionManager.AppendOption("raffle.visible", true, "Enable Overlay");
OptionManager.AppendOption("raffle.autohide", true, "AutoHide Overlay");
OptionManager.AppendOption("raffle.keyword.first", true, "Must Be First");
OptionManager.AppendOption("raffle.keyword.case.sensitive", true, "Case Sensitive");
OptionManager.AppendOption("raffle.title", "New Raffle", "Title");
OptionManager.AppendOption("raffle.keyword", "joinraffle", "Join Key Phrase");
OptionManager.AppendOption("raffle.slide.bend", 0.0, "Slide Bend");
OptionManager.AppendOption("raffle.slide.zoom", 0.0, "Slide Zoom");
OptionManager.AppendOption("raffle.slide.turn", 0.0, "Slide Turn");
OptionManager.AppendOption("raffle.slide.flipx", 0.0, "Slide Flip X");
OptionManager.AppendOption("raffle.slide.flipy", 0.0, "Slide Flip Y");
OptionManager.AppendOption("raffle.slide.pad", 0.0, "Entry Padding");
OptionManager.AppendOption("raffle.drag.run", true, "Run By Dragging");