import { DraggableWindow, WindowBase } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import { CreatureRoster } from "./creatures.js";
import "./storedobject.js";
import { OptionManager } from "./globalsettings.js";
import { addElement } from "../hubscript.js";
import { EventSource } from "./eventsource.js";
import { ChatCollector } from "./chatcollector.js";
import { ViewerInventoryManager } from "./viewerinventory.js";
import { MultiPlatformUser, MultiPlatformUserCache } from "./multiplatformuser.js";
import { StreamElements } from "./streamelementslistener.js";
import { Rewards } from "./rewards.js";
import { TwitchListener } from "./twitchlistener.js";
import { GlobalTooltip } from "./globaltooltip.js";

console.info("[ +Module ] Creature Catching");


export class CreatureCatchEntry
{
	username = "nobody";
	constructor(username = "nobody", count = 1)
	{
		this.username = username;
		this.count = count;
	}
}

export class CreatureAppearance
{
	flipInterval = -1;
	spriteFlip = false;
	willEvadeAll = false;
	entries = [new CreatureCatchEntry()];

	constructor(creatureId = -1)
	{
		this.creatureId = (creatureId == -1) ? Math.round(Math.random() * (CreatureRoster.instance.items.length - 1)) : creatureId;
		this.creature = CreatureRoster.instance.items[this.creatureId];
		this.willEvadeAll = this.creature.evasionChance >= Math.random();

		this.spriteFlip = Math.random() > 0.5;
		this.entries = [];
	}

	IndexOfEntry(username = "")
	{
		for (var ei = 0; ei < this.entries.length; ei++)
		{
			if (this.entries[ei].username === username) return ei;
		}
		return -1;
	}

	HasEntered(username = "") { return this.IndexOfEntry(username) != -1; }

	TryEnterFirstTime(username = "")
	{
		CreatureCatchState.Report(username + " entered creature catching");
		this.entries.push(new CreatureCatchEntry(username, 1));
	}

	TryEnterExtraTimes(username = "", count = 1)
	{
		var extraEntryCost = Number(OptionManager.GetOptionValue(option_key_creature_catching_extraEntryCost));
		var totalEntryCost = Math.max(count, 0) * extraEntryCost;

		StreamElements.TrySpendUserPoints(
			username,
			totalEntryCost,
			() =>
			{
				var existingId = this.IndexOfEntry(username);
				this.entries[existingId].count += count;
				CreatureCatchState.Report(username + " bought " + count + " extra creature catch attempts for " + totalEntryCost + " points!");
				CreatureCatchState.onAppearanceEntry.Invoke();
			}
		);
	}

	RegisterEntries(username = "", count = 1)
	{
		if (!this.HasEntered(username))
		{
			this.TryEnterFirstTime(username);
			count -= 1;
		}

		if (count < 1)
		{
			CreatureCatchState.onAppearanceEntry.Invoke();
			return;
		}

		this.TryEnterExtraTimes(username, count);
	}

	EvaluateCatch()
	{
		if (this.entries.length < 1)
		{
			CreatureCatchState.Report(`No one caught the ${this.creature.name}`);
			CreatureCatchStateHistory.AddEntry(`${this.creature.name} appeared but got away!`)
			return false;
		}

		if (this.willEvadeAll)
		{
			CreatureCatchState.Report(`${this.creature.name} evades all capture attempts!`);
			CreatureCatchStateHistory.AddEntry(`${this.creature.name} appeared but evaded all capture attempts!`)
			return false;
		}

		var expandedEntries = [];
		for (var ei = 0; ei < this.entries.length; ei++)
		{
			var e = this.entries[ei];
			for (var ii = 0; ii < e.count; ii++)
				expandedEntries.push(e.username);
		}

		let winner = expandedEntries[Math.round(Math.random() * (expandedEntries.length - 1))];
		var winStringShort = `${winner} caught ${this.creature.name}!`;
		if (this.creature.pointValue > 0) 
		{
			CreatureCatchState.Report(`${winner} caught ${this.creature.name}! +${this.creature.pointValue} Loyalty Points!`);
			Rewards.Give({ username: winner }, "Add SE Points", { points: this.creature.pointValue });
			CreatureCatchStateHistory.AddEntry(winStringShort)
		}
		else 
		{
			CreatureCatchState.Report(winStringShort);
			CreatureCatchStateHistory.AddEntry(winStringShort)
		}

		let creatureItem = {
			name: this.creature.name,
			description: this.creature.description,
			rarity: this.creature.rarity,
		};

		var user = MultiPlatformUserCache.GetUser(winner, "any", false);
		if (user != null) ViewerInventoryManager.AddItemCount(user.platform, user.username, creatureItem, 1);

		return true;
	}

	FlipLoop()
	{
		this.spriteFlip = Math.random() > 0.5;
		this.flipInterval = window.setTimeout(() => { this.FlipLoop(); }, Math.random() * 2500 + 500);
	}

	CreateElements()
	{
		this.e_creature_root = addElement("div", null, document.body);
		this.e_creature_root.draggable = false;
		this.e_creature_root.style.pointerEvents = "none";
		this.e_creature_root.style.userSelect = "none";
		this.e_creature_root.style.zIndex = "900000";
		this.e_creature_root.style.position = "fixed";
		this.e_creature_root.style.opacity = "0.0";
		this.e_creature_root.style.width = "16rem";
		this.e_creature_root.style.height = "16rem";
		this.e_creature_root.style.bottom = "-18rem";
		this.e_creature_root.style.left = (Math.random() * 60 + 20) + "%";

		this.e_creature_root.style.transitionProperty = "bottom, opacity";
		this.e_creature_root.style.transitionDuration = "0.5s";
		this.e_creature_root.style.transitionTimingFunction = "ease-in-out";

		this.e_creature_highlight = addElement("div", null, this.e_creature_root);
		this.e_creature_highlight.style.position = "absolute";
		this.e_creature_highlight.style.top = "50%";
		this.e_creature_highlight.style.bottom = "0";
		this.e_creature_highlight.style.left = "0";
		this.e_creature_highlight.style.right = "0";
		this.e_creature_highlight.style.opacity = "50%";
		this.e_creature_highlight.style.background = "radial-gradient(ellipse at bottom, #ffdd887c 0%, #ffdd881c 50%, #ffdd8800 70%)";
		this.e_creature_highlight.style.transformOrigin = "50% 100%";
		this.e_creature_highlight.style.scale = "500% 200%";

		this.e_creature_img = addElement("img", null, this.e_creature_root);
		this.e_creature_img.draggable = false;
		this.e_creature_img.style.position = "absolute";
		this.e_creature_img.style.top = "50%";
		this.e_creature_img.style.left = "50%";
		this.e_creature_img.style.width = "100%";
		this.e_creature_img.style.transform = "translate(-50%, -50%)";
		if (this.spriteFlip) this.e_creature_img.style.transform += " rotateY(180deg)";
		this.e_creature_img.style.height = "100%";
		this.e_creature_img.style.objectFit = "contain";
		this.e_creature_img.style.objectPosition = "center";
		var filter = "drop-shadow(0px 0px 64px #fb62)";
		filter += " drop-shadow(-4px 6px 3px #000a)";
		//filter += " drop-shadow(-1px -1px 0px #000f)";
		//filter += " drop-shadow(1px -1px 0px #000f)";
		//filter += " drop-shadow(1px 1px 0px #000f)";
		//filter += " drop-shadow(-1px 1px 0px #000f)";
		this.e_creature_img.style.filter = filter;
		this.e_creature_img.style.maxWidth = "100%";
		this.e_creature_img.style.maxHeight = "100%";
		this.e_creature_img.src = this.creature.imageSrc;

		this.e_creature_img.style.transitionProperty = "transform";
		this.e_creature_img.style.transitionDuration = "0.1s";
		this.e_creature_img.style.transitionTimingFunction = "ease-in-out";

		this.e_creature_lbl_name = addElement("div", null, this.e_creature_root);
		this.e_creature_lbl_name.style.position = "absolute";
		this.e_creature_lbl_name.style.bottom = "3rem";
		this.e_creature_lbl_name.style.left = "0";
		this.e_creature_lbl_name.style.right = "0";
		this.e_creature_lbl_name.style.height = "auto";
		this.e_creature_lbl_name.style.color = "#ffffffc0";
		this.e_creature_lbl_name.style.fontWeight = "bold";
		this.e_creature_lbl_name.style.fontSize = "1.1rem";
		this.e_creature_lbl_name.style.letterSpacing = "0.3rem";
		this.e_creature_lbl_name.style.textShadow = "#0007 -2px 2px 2px";
		this.e_creature_lbl_name.innerText = this.creature.name;

		this.e_creature_prompt = addElement("div", null, this.e_creature_root);
		this.e_creature_prompt.style.position = "absolute";
		this.e_creature_prompt.style.bottom = "1rem";
		this.e_creature_prompt.style.left = "0";
		this.e_creature_prompt.style.right = "0";
		this.e_creature_prompt.style.height = "auto";
		this.e_creature_prompt.style.color = "white";
		this.e_creature_prompt.style.fontWeight = "bold";
		this.e_creature_prompt.style.fontSize = "1.8rem";
		this.e_creature_prompt.style.letterSpacing = "0.05rem";
		this.e_creature_prompt.style.textShadow = "goldenrod 0px 0px 0.25rem, goldenrod 0px 0px 0.25rem, goldenrod 0px 0px 0.25rem, goldenrod 0px 0px 0.25rem";
		this.e_creature_prompt.innerText = OptionManager.GetOptionValue(option_key_creature_catching_keyphrase);

		this.ts_anim = -1;
		this.dt_anim = -1;
		this.time_anim = 0.0;
		this.id_anim = requestAnimationFrame(t => { this.step_anim(t); });

		window.setTimeout(
			() =>
			{
				this.e_creature_root.style.bottom = "0rem";
				this.e_creature_root.style.opacity = "1.0";
			},
			50
		);

		this.flipInterval = window.setTimeout(() => { this.FlipLoop(); }, Math.random() * 2500 + 500);
	}

	RemoveElements()
	{
		if (this.flipInterval != -1) window.clearTimeout(this.flipInterval);
		this.flipInterval = -1;

		cancelAnimationFrame(this.id_anim);
		this.e_creature_root.style.bottom = "-18rem";
		this.e_creature_root.style.opacity = "0.0";
		window.setTimeout(
			() =>
			{
				if (this.e_creature_root.remove) this.e_creature_root.remove();
			},
			250
		);
	}

	step_anim(timestamp)
	{
		if (this.ts_anim == -1)
		{
			this.ts_anim = timestamp;
			this.dt_anim = 0.0;
			this.time_anim = 0.0;
			this.id_anim = requestAnimationFrame(t => { this.step_anim(t); });
			return;
		}

		var ts_delta = timestamp - this.ts_anim;
		this.ts_anim = timestamp;
		this.dt_anim += ts_delta;

		if (this.dt_anim < 17)
		{
			this.id_anim = requestAnimationFrame(t => { this.step_anim(t); });
			return;
		}

		this.time_anim += this.dt_anim * 0.001;
		var yoff = Math.abs(Math.sin(this.time_anim * 6.28318)) * 5;
		var xoff = Math.cos(this.time_anim - 5) * 20 + Math.sin(this.time_anim + 5) * 20;
		yoff *= Math.sin(this.time_anim * -3.44159 - 2.28318) * 0.5 + 0.5;
		this.e_creature_img.style.transform = `translate(${-50 + xoff}%,${-30 - yoff}%)`;
		if (this.spriteFlip) this.e_creature_img.style.transform += " rotateY(180deg)";
		this.e_creature_img.style.transformOrigin = `50% 100%`;
		this.e_creature_img.style.rotate = Math.cos(this.time_anim * 4.14159) * Math.sin(this.time_anim * 2.14159 - 6.28318) * 5 + 'deg';

		this.dt_anim = 0.0;
		this.id_anim = requestAnimationFrame(t => { this.step_anim(t); });
	}
}

export class CreatureCatchStateHistory
{
	static entries = [];
	static onRefresh = new EventSource();

	static AddEntry(message)
	{
		var dateStr = new Date().toLocaleTimeString();
		var prefix = `<span style='color:#fff5; font-size:0.7rem;'>${dateStr}:</span> `;
		CreatureCatchStateHistory.entries.push(prefix + message);
		CreatureCatchStateHistory.onRefresh.Invoke();
	}
}

export class CreatureCatchState
{
	static activeAppearance = null;

	static onAppearanceStarted = new EventSource();
	static onAppearanceEnded = new EventSource();

	static onAppearanceEntry = new EventSource();

	static intervalId_randomAppearanceLoop = -1;
	static timer_nextAppearance = 5;
	static timer_currentAppearance = -1;

	static appearanceLoopDelayMs = 200;
	static appearanceLoopDelaySec = CreatureCatchState.appearanceLoopDelayMs * 0.001;

	static sub_OnNewChat;

	static StartRandomAppearanceLoop()
	{
		if (CreatureCatchState.intervalId_randomAppearanceLoop != -1) return;

		CreatureCatchState.intervalId_randomAppearanceLoop = window.setInterval(
			() => { CreatureCatchState.stepRandomAppearanceLoop(); },
			CreatureCatchState.appearanceLoopDelayMs
		);
		console.info("creature catch loop started");

		ChatCollector.sub_OnNewChat = ChatCollector.onMessageReceived.RequestSubscription(cm => { CreatureCatchState.CheckChatForKeyPhrase(cm); });
	}

	static StopRandomAppearanceLoop()
	{
		if (CreatureCatchState.intervalId_randomAppearanceLoop == -1) return;
		ChatCollector.onMessageReceived.RemoveSubscription(ChatCollector.sub_OnNewChat);
		window.clearInterval(CreatureCatchState.intervalId_randomAppearanceLoop);
		CreatureCatchState.intervalId_randomAppearanceLoop = -1;
		console.info("creature catch loop stopped");
	}

	static CheckChatForKeyPhrase(chatMessage)
	{
		if (CreatureCatchState.activeAppearance == null) return;

		let msgText = chatMessage.message.trim().toLowerCase();
		msgText = msgText.replace(' 󠀀', '');

		let keyphrase = OptionManager.GetOptionValue(option_key_creature_catching_keyphrase);
		if (!msgText.includes(keyphrase)) return;

		if (msgText.includes(' '))
		{
			var parts = msgText.split(' ');
			CreatureCatchState.activeAppearance.RegisterEntries(chatMessage.username, Number(parts[1]));
		}
		else
			CreatureCatchState.activeAppearance.RegisterEntries(chatMessage.username, 1);
	}

	static stepRandomAppearanceLoop()
	{
		if (CreatureCatchState.activeAppearance != null)
		{
			CreatureCatchState.timer_currentAppearance -= CreatureCatchState.appearanceLoopDelaySec;
			if (CreatureCatchState.timer_currentAppearance <= 0.0) CreatureCatchState.EndAppearance();
			return;
		}

		CreatureCatchState.timer_nextAppearance -= CreatureCatchState.appearanceLoopDelaySec;
		if (CreatureCatchState.timer_nextAppearance > 0) return;

		CreatureCatchState.StartRandomAppearanceNow();
	}

	static StartRandomAppearanceNow()
	{
		if (CreatureCatchState.activeAppearance != null) { console.warn("activeAppearance != null"); return; }
		if (CreatureRoster.instance.items == null) { console.warn("creatures == null"); return; }
		if (CreatureRoster.instance.items.length < 1) { console.warn("no creatures"); return; }

		if (CreatureRoster.instance.items.length < 2) // only one creature to choose
		{
			CreatureCatchState.TryStartAppearance(0);
			return;
		}

		while (CreatureCatchState.activeAppearance == null)
		{
			var targetId = CreatureRoster.GetWeightedRandomIndex();
			CreatureCatchState.TryStartAppearance(targetId);
			break;
		}
	}

	static CanAppear(creatureId = -1)
	{
		if (CreatureCatchState.activeAppearance != null) return false;
		if (creatureId == -1) return false;
		var creature = CreatureRoster.instance.items[creatureId];
		if (!creature.canAppear) return false;
		return true;
	}

	static TryStartAppearance(creatureId)
	{
		if (creatureId == -1) return;
		if (CreatureCatchState.activeAppearance != null) return;
		if (!CreatureCatchState.CanAppear(creatureId)) return;

		var appearance = new CreatureAppearance(creatureId);
		appearance.CreateElements();
		CreatureCatchState.activeAppearance = appearance;
		CreatureCatchState.timer_currentAppearance = appearance.creature.duration;
		CreatureCatchState.onAppearanceStarted.Invoke();

		var keyphrase = OptionManager.GetOptionValue(option_key_creature_catching_keyphrase);
		CreatureCatchState.Report(appearance.creature.name + " just appeared! Type " + keyphrase + " to try and catch it!");
	}

	static EndAppearance()
	{
		if (CreatureCatchState.activeAppearance == null) return;

		CreatureCatchState.activeAppearance.EvaluateCatch();

		CreatureCatchState.activeAppearance.RemoveElements();
		CreatureCatchState.activeAppearance = null;
		CreatureCatchState.onAppearanceEnded.Invoke();

		var opt_min_delay = OptionManager.GetOption(option_key_creature_catching_appearances_delay_min);
		var opt_max_delay = OptionManager.GetOption(option_key_creature_catching_appearances_delay_max);
		CreatureCatchState.timer_nextAppearance = Math.random() * (opt_max_delay.value - opt_min_delay.value) + opt_min_delay.value;
	}

	static Report(message = "Test Message From Creature Catcher")
	{
		console.info(message);
		if (!OptionManager.GetOptionValue(option_key_creature_catching_botchat_enabled)) return;
		TwitchListener.instance.SendMessageAsBot(message);
	}
}

export class CreatureCatchingWindow extends DraggableWindow
{
	static window_kind = "Creature Catching";

	constructor(pos_x, pos_y)
	{
		super("Creature Catching", pos_x, pos_y);
		this.SetTitle("Creature Catching");
		this.SetIcon("android");
		this.window_kind = CreatureCatchingWindow.window_kind;
		this.e_window_root.style.minHeight = "280px";
		this.e_window_root.style.maxHeight = "80vh";
		this.e_window_root.style.minWidth = "260px";
		this.e_window_root.style.maxWidth = "50vw";

		this.e_creatures = [];
		this.e_edit_overlay = {};
		this.currentEditTargetIndex = -1;
		this.currentEditTarget = {};

		this.CreateContentContainer();
		this.e_content.style.overflowY = "hidden";
		this.e_content.style.display = "flex";
		this.e_content.style.flexDirection = "column";

		this.activeTabIndex = -1;
		this.CreateTabs();
		this.e_tab_content = addElement("div", null, this.e_content);
		this.e_tab_content.style.display = "flex";
		this.e_tab_content.style.flexDirection = "column";
		this.e_tab_content.style.flexGrow = "1.0";
		this.SetTab(0);

		this.sub_AppearStart = CreatureCatchState.onAppearanceStarted.RequestSubscription(() => { this.RefreshAppearanceInfo(); this.RefreshEntryList(); });
		this.sub_AppearEnd = CreatureCatchState.onAppearanceEnded.RequestSubscription(() => { this.RefreshAppearanceInfo(); this.RefreshEntryList(); });
		this.sub_AppearEntry = CreatureCatchState.onAppearanceEntry.RequestSubscription(() => { this.RefreshEntryList(); });

		this.sub_History = CreatureCatchStateHistory.onRefresh.RequestSubscription(() => { this.RefreshHistoryList(); });
	}

	onWindowClose()
	{
		CreatureCatchState.onAppearanceStarted.RemoveSubscription(this.sub_AppearStart);
		CreatureCatchState.onAppearanceEnded.RemoveSubscription(this.sub_AppearEnd);
		CreatureCatchState.onAppearanceEntry.RemoveSubscription(this.sub_AppearEntry);

		CreatureCatchStateHistory.onRefresh.RemoveSubscription(this.sub_History);
	}

	SetTab(newTabIndex = 0)
	{
		if (this.activeTabIndex === newTabIndex) return;

		GlobalTooltip.ReleaseAllReceivers(this.e_tab_content);
		this.e_tab_content.innerHTML = "";
		this.activeTabIndex = newTabIndex;
		switch (this.activeTabIndex)
		{
			case 0:
				this.CreateEntryList();
				this.CreateAppearanceInfoRoot();
				this.RefreshEntryList();
				this.RefreshAppearanceInfo();
				this.SetTabSelectorPosition(this.e_tab_btn_appearance);
				this.e_tab_btn_appearance.style.borderBottom = "solid white 2px";
				this.e_tab_btn_settings.style.borderBottom = "solid #fff0 2px";
				this.e_tab_btn_history.style.borderBottom = "solid #fff0 2px";
				break;
			case 1:
				this.CreateSettingsPage();
				this.SetTabSelectorPosition(this.e_tab_btn_settings);
				this.e_tab_btn_appearance.style.borderBottom = "solid #fff0 2px";
				this.e_tab_btn_settings.style.borderBottom = "solid white 2px";
				this.e_tab_btn_history.style.borderBottom = "solid #fff0 2px";
				break;
			case 2:
				this.CreateHistoryList();
				this.RefreshHistoryList();
				this.SetTabSelectorPosition(this.e_tab_btn_history);
				this.e_tab_btn_appearance.style.borderBottom = "solid #fff0 2px";
				this.e_tab_btn_settings.style.borderBottom = "solid #fff0 2px";
				this.e_tab_btn_history.style.borderBottom = "solid white 2px";
				break;
		}
	}

	GetActiveTabButton()
	{
		switch (this.activeTabIndex)
		{
			case 0: return this.e_tab_btn_appearance;
			case 1: return this.e_tab_btn_settings;
			case 2: return this.e_tab_btn_history;
		}
		return null;
	}

	SetTabSelectorPosition(target)
	{
		if (!target) return;
		let containerRect = target.parentElement.getBoundingClientRect();
		let targetRect = target.getBoundingClientRect();
		this.e_tab_selector.style.left = `${(targetRect.x - containerRect.x)}px`;
		this.e_tab_selector.style.width = `${targetRect.width}px`;
	}

	CreateTabs()
	{
		this.e_tab_list = addElement("div", null, this.e_content);
		this.e_tab_list.style.display = "flex";
		this.e_tab_list.style.flexDirection = "horizontal";
		this.e_tab_list.style.position = "relative";
		this.e_tab_list.style.width = "100%";
		this.e_tab_list.style.height = "2rem";
		this.e_tab_list.style.lineHeight = "2rem";
		this.e_tab_list.style.zIndex = "15";
		this.e_tab_list.style.overflow = "hidden";

		this.e_tab_selector = addElement("div", null, this.e_tab_list);
		this.e_tab_selector.style.position = "absolute";
		this.e_tab_selector.style.backgroundColor = "#0cf5";
		this.e_tab_selector.style.left = "0";
		this.e_tab_selector.style.top = "0";
		this.e_tab_selector.style.width = "100%";
		this.e_tab_selector.style.height = "2rem";
		this.e_tab_selector.style.opacity = "0.0";
		this.e_tab_selector.style.transitionProperty = "left, width, opacity";
		this.e_tab_selector.style.transitionDuration = "0.2s";
		this.e_tab_selector.style.transitionTimingFunction = "ease-in-out";

		this.e_tab_btn_appearance = this.AddTab("Appearance", "See info about the current creature appearance");
		this.e_tab_btn_appearance.addEventListener("click", e => { this.SetTab(0); });
		this.e_tab_btn_settings = this.AddTab("Settings", "Change general settings for creature catching");
		this.e_tab_btn_settings.addEventListener("click", e => { this.SetTab(1); });
		this.e_tab_btn_history = this.AddTab("History", "See a list of previous creature appearances and outcomes");
		this.e_tab_btn_history.addEventListener("click", e => { this.SetTab(2); });

		window.setTimeout(() => { this.SetTabSelectorPosition(this.e_tab_btn_appearance); }, 25);
	}

	AddTab(tabName = "Tab", tooltip = "")
	{
		let ebtn = addElement("div", null, this.e_tab_list);
		ebtn.style.position = "relative";
		ebtn.style.flexGrow = "1.0";
		ebtn.style.textAlign = "center";
		ebtn.style.cursor = "pointer";
		ebtn.style.transitionProperty = "color, border";
		ebtn.style.transitionDuration = "0.25s";
		ebtn.style.transitionTimingFunction = "ease-in-out";
		ebtn.innerHTML = tabName;
		ebtn.addEventListener(
			"mouseleave",
			e =>
			{
				e.target.style.color = "#fff8";
				this.e_tab_selector.style.opacity = '0';
				this.SetTabSelectorPosition(this.GetActiveTabButton());
			}
		);
		ebtn.addEventListener(
			"mouseenter",
			e =>
			{
				e.target.style.color = "#fff";
				this.SetTabSelectorPosition(e.target);
				this.e_tab_selector.style.opacity = '1.0';
			}
		);

		if (tooltip !== "") GlobalTooltip.RegisterReceiver(ebtn, tooltip);
		return ebtn;
	}

	CreateSettingsPage()
	{
		this.CreateControlsColumn(true);
		var prevParent = this.e_controls_column.parentElement;
		if (prevParent) prevParent.removeChild(this.e_controls_column);
		this.e_tab_content.appendChild(this.e_controls_column);
		this.e_controls_column.style.borderTop = "solid #575757 2px";
		this.e_controls_column.style.borderBottom = "solid #575757 2px";

		var opt_enabled = OptionManager.GetOption(option_key_creature_catching_appearances_enabled);
		var opt_botchat = OptionManager.GetOption(option_key_creature_catching_botchat_enabled);
		var opt_keyphrase = OptionManager.GetOption(option_key_creature_catching_keyphrase);
		var opt_delayMin = OptionManager.GetOption(option_key_creature_catching_appearances_delay_min);
		var opt_delayMax = OptionManager.GetOption(option_key_creature_catching_appearances_delay_max);

		var e_spacer = addElement("div", null, this.e_controls_column);
		e_spacer.style.height = "1rem";

		this.e_tgl_run = this.AddToggle(
			opt_enabled.label,
			opt_enabled.value,
			x =>
			{
				OptionManager.SetOptionValue(option_key_creature_catching_appearances_enabled, x.checked);
				CreatureCatchingOverlay.UpdateVisibility();
			}
		);
		this.e_tgl_run.style.height = "2rem";
		this.e_tgl_run.style.lineHeight = "2rem";
		GlobalTooltip.RegisterReceiver(
			this.e_tgl_run,
			"Toggle Appearances",
			"Whether or not creatures will appear over time"
		);

		this.e_tgl_botchat = this.AddToggle(
			opt_botchat.label,
			opt_botchat.value,
			x =>
			{
				OptionManager.SetOptionValue(option_key_creature_catching_botchat_enabled, x.checked);
				CreatureCatchingOverlay.UpdateVisibility();
			}
		);
		this.e_tgl_botchat.style.height = "2rem";
		this.e_tgl_botchat.style.lineHeight = "2rem";
		GlobalTooltip.RegisterReceiver(
			this.e_tgl_botchat,
			"Send bot messages",
			"Send messages from your bot to chat about creature appearances and results"
		);

		this.e_rng_delayMin = this.AddTextField(
			opt_delayMin.label,
			opt_delayMin.value,
			x => { OptionManager.SetOptionValue(option_key_creature_catching_appearances_delay_min, x.value); }
		);
		this.e_rng_delayMin.style.height = "2rem";
		this.e_rng_delayMin.style.lineHeight = "2rem";
		this.e_rng_delayMin.children[1].children[0].type = "number";
		this.e_rng_delayMin.children[1].children[0].style.textAlign = "center";
		GlobalTooltip.RegisterReceiver(
			this.e_rng_delayMin,
			"Min time between appearances",
			"The minimum time (seconds) that will pass between creature appearances"
		);

		this.e_rng_delayMax = this.AddTextField(
			opt_delayMax.label,
			opt_delayMax.value,
			x => { OptionManager.SetOptionValue(option_key_creature_catching_appearances_delay_max, x.value); }
		);
		this.e_rng_delayMax.style.height = "2rem";
		this.e_rng_delayMax.style.lineHeight = "2rem";
		this.e_rng_delayMax.children[1].children[0].type = "number";
		this.e_rng_delayMax.children[1].children[0].style.textAlign = "center";
		GlobalTooltip.RegisterReceiver(
			this.e_rng_delayMax,
			"Max time between appearances",
			"The maximum time (seconds) that will pass between creature appearances"
		);

		this.e_txt_keyphrase = this.AddTextField(
			opt_keyphrase.label,
			opt_keyphrase.value,
			x =>
			{
				OptionManager.SetOptionValue(option_key_creature_catching_keyphrase, x.value);
			}
		);
		this.e_txt_keyphrase.style.height = "2rem";
		this.e_txt_keyphrase.style.lineHeight = "2rem";
		GlobalTooltip.RegisterReceiver(
			this.e_txt_keyphrase,
			"Set the catching key-phrase",
			"The key-phrase which chatters must use to enter the creature catching event"
		);
	}

	CreateHistoryList()
	{
		this.e_historyList = addElement("div", null, this.e_tab_content);
		this.e_historyList.style.height = "1rem";
		this.e_historyList.style.flexGrow = "1.0";
		this.e_historyList.style.borderTop = "solid #575757 2px";
		this.e_historyList.style.borderBottom = "solid #575757 2px";
	}

	CreateEntryList()
	{
		this.e_entryList = addElement("div", null, this.e_tab_content);
		this.e_entryList.style.height = "1rem";
		this.e_entryList.style.flexGrow = "1.0";
		this.e_entryList.style.borderTop = "solid #575757 2px";
		this.e_entryList.style.borderBottom = "solid #575757 2px";
	}

	static GetStateProgressText()
	{
		if (!CreatureCatchState.activeAppearance)
		{
			return Math.round(Number(CreatureCatchState.timer_nextAppearance)) + "s";
		}

		return CreatureCatchState.activeAppearance.creature.name;
	}

	CreateAppearanceInfoRoot()
	{
		this.e_appearanceInfoRoot = addElement("div", null, this.e_tab_content);
		this.e_appearanceInfoRoot.style.position = "relative";
		this.e_appearanceInfoRoot.style.flexGrow = "1.0";
		this.e_appearanceInfoRoot.style.height = "1rem";

		this.e_appearanceInfoContainer = addElement("div", null, this.e_appearanceInfoRoot);
		this.e_appearanceInfoContainer.style.position = "absolute";
		this.e_appearanceInfoContainer.style.left = "0.5rem";
		this.e_appearanceInfoContainer.style.right = "0.5rem";
		this.e_appearanceInfoContainer.style.bottom = "0.5rem";
		this.e_appearanceInfoContainer.style.top = "0.25rem";
		this.e_appearanceInfoContainer.style.backgroundColor = "#ffffff10";
		this.e_appearanceInfoContainer.style.borderRadius = "0.25rem";
		this.e_appearanceInfoContainer.style.overflowX = "hidden";
		this.e_appearanceInfoContainer.style.overflowY = "hidden";

		this.e_appearanceInfoImage = addElement("img", null, this.e_appearanceInfoContainer);
		this.e_appearanceInfoImage.style.position = "absolute";
		this.e_appearanceInfoImage.style.transform = "translateY(20%)";
		this.e_appearanceInfoImage.style.opacity = "0.0";
		this.e_appearanceInfoImage.style.top = "0";
		this.e_appearanceInfoImage.style.left = "0";
		this.e_appearanceInfoImage.style.right = "0";
		this.e_appearanceInfoImage.style.bottom = "0";
		this.e_appearanceInfoImage.style.objectFit = "contain";
		this.e_appearanceInfoImage.style.overflow = "hidden";
		this.e_appearanceInfoImage.style.width = "100%";
		this.e_appearanceInfoImage.style.height = "100%";
		this.e_appearanceInfoImage.style.transitionProperty = "opacity, transform";
		this.e_appearanceInfoImage.style.transitionDuration = "0.2s";
		this.e_appearanceInfoImage.src = "";

		this.e_lbl_progress = addElement("div", null, this.e_appearanceInfoContainer);
		this.e_lbl_progress.style.position = "absolute";
		this.e_lbl_progress.style.overflow = "hidden";
		this.e_lbl_progress.style.opacity = "1.0";
		this.e_lbl_progress.style.top = "50%";
		this.e_lbl_progress.style.left = "0";
		this.e_lbl_progress.style.right = "0";
		this.e_lbl_progress.style.height = "1rem";
		this.e_lbl_progress.style.lineHeight = "1rem";
		this.e_lbl_progress.style.textAlign = "center";
		this.e_lbl_progress.style.color = "white";
		this.e_lbl_progress.style.transform = "translate(0%,-50%)";
		this.e_lbl_progress.style.transitionProperty = "opacity";
		this.e_lbl_progress.style.transitionDuration = "0.15s";
		this.e_lbl_progress.innerText = "PROGRESS : ";

		this.e_lbl_progress_tooltip = GlobalTooltip.RegisterReceiver(this.e_appearanceInfoContainer, CreatureCatchingWindow.GetStateProgressText);
	}

	RefreshAppearanceInfo()
	{
		if (!this.e_appearanceInfoImage) return;
		if (CreatureCatchState.activeAppearance)
		{
			this.e_appearanceInfoImage.src = CreatureCatchState.activeAppearance.creature.imageSrc;
			this.e_lbl_progress.innerHTML = "A " + CreatureCatchState.activeAppearance.creature.name + " is here!";
		}
		else
		{
			this.e_lbl_progress.innerHTML = "LOADING CREATURE";
		}
		this.e_appearanceInfoImage.style.opacity = CreatureCatchState.activeAppearance ? "1.0" : "0.0";
		this.e_appearanceInfoImage.style.transform = CreatureCatchState.activeAppearance ? "translateY(0%)" : "translateY(20%)";
	}

	RefreshHistoryList()
	{
		if (!this.e_historyList) return;
		this.e_historyList.innerHTML = "";

		if (CreatureCatchStateHistory.entries.length < 1) return;

		for (var entryId = CreatureCatchStateHistory.entries.length - 1; entryId > -1; entryId--)
		{
			addElement("div", null, this.e_historyList, null, x => { x.innerHTML = CreatureCatchStateHistory.entries[entryId]; });
		}
	}

	RefreshEntryList()
	{
		if (!this.e_entryList) return;
		this.e_entryList.innerHTML = "";

		if (CreatureCatchState.activeAppearance == null) return;
		if (CreatureCatchState.activeAppearance.entries.length < 1) return;

		for (var entryId = 0; entryId < CreatureCatchState.activeAppearance.entries.length; entryId++)
		{
			var entry = CreatureCatchState.activeAppearance.entries[entryId];
			var e_entry = addElement("div", null, this.e_entryList);
			e_entry.innerText = entry.username + " " + entry.count;
		}
	}
}

export class CreatureCatchingOverlay
{
	static showing = false;

	static UpdateVisibility()
	{
		var opt_enabled = OptionManager.GetOption(option_key_creature_catching_appearances_enabled);
		CreatureCatchingOverlay.showing = opt_enabled.value === true;
		if (CreatureCatchingOverlay.showing) CreatureCatchState.StartRandomAppearanceLoop();
		else CreatureCatchState.StopRandomAppearanceLoop();
	}
}


const option_key_creature_catching_botchat_enabled = "creature.catching.botchat.enabled";
const option_key_creature_catching_appearances_enabled = "creature.catching.appearances.enabled";
const option_key_creature_catching_appearances_delay_min = "creature.catching.appearances.delay.min";
const option_key_creature_catching_appearances_delay_max = "creature.catching.appearances.delay.max";
const option_key_creature_catching_extraEntryCost = "creature.catching.extra.entry.cost";
const option_key_creature_catching_keyphrase = "creature.catching.keyphrase";
const option_key_creature_catching_creature_size = "creature.catching.creature.size";
OptionManager.AppendOption(option_key_creature_catching_botchat_enabled, false, "Output To Chat");
OptionManager.AppendOption(option_key_creature_catching_appearances_enabled, false, "Appearances");
OptionManager.AppendOption(option_key_creature_catching_appearances_delay_min, 30, "Delay Min");
OptionManager.AppendOption(option_key_creature_catching_appearances_delay_max, 600, "Delay Max");
OptionManager.AppendOption(option_key_creature_catching_creature_size, 1.0, "Creature Size");
OptionManager.AppendOption(option_key_creature_catching_extraEntryCost, 15, "Extra Entry Cost");
OptionManager.AppendOption(option_key_creature_catching_keyphrase, "!catch", "Key Phrase");


WindowManager.instance.windowTypes.push(
	{
		key: CreatureCatchingWindow.window_kind,
		icon: "android",
		icon_color: 'orange',
		desc: "Edit creature appearance settings!",
		model: (x, y) => { return new CreatureCatchingWindow(x, y); },
		sort_order: -1,
		wip: true,
		shortcutKey: 'n'
	}
);


window.setTimeout(() => { CreatureCatchingOverlay.UpdateVisibility(); }, 250);