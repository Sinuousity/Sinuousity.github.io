import { DraggableWindow, WindowBase } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import { CreatureRoster } from "./creatures.js";
import "./storedobject.js";
import { OptionManager } from "./globalsettings.js";
import { addElement } from "../hubscript.js";
import { EventSource } from "./eventsource.js";
import { ChatCollector } from "./chatcollector.js";
import { ViewerInventoryManager } from "./viewerinventory.js";

console.info("[ +Module ] Creature Catching");

export class CreatureAppearance
{
	flipInterval = -1;
	spriteFlip = false;

	constructor(creatureId = -1)
	{
		this.creatureId = (creatureId == -1) ? Math.round(Math.random() * (CreatureRoster.instance.items.length - 1)) : creatureId;
		this.creature = CreatureRoster.instance.items[this.creatureId];

		this.spriteFlip = Math.random() > 0.5;
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

export class CreatureCatchState
{
	static activeAppearance = null;

	static onAppearanceStarted = new EventSource();
	static onAppearanceEnded = new EventSource();

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

		ChatCollector.sub_OnNewChat = ChatCollector.onMessageReceived.RequestSubscription(CreatureCatchState.CheckChatForKeyPhrase);
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

		let chatUsername = chatMessage.username;
		let chatContent = "";
		chatContent = chatMessage.message;

		let keyphrase = OptionManager.GetOptionValue(option_key_creature_catching_keyphrase);

		if (chatContent.startsWith(keyphrase))
		{
			console.log(CreatureCatchState.activeAppearance.creature.name + " caught by " + chatUsername + "!");
			var creatureItem = {
				name: CreatureCatchState.activeAppearance.creature.name,
				description: CreatureCatchState.activeAppearance.creature.description,
				rarity: CreatureCatchState.activeAppearance.creature.rarity,
			};
			ViewerInventoryManager.AddItemCount(chatMessage.source, chatMessage.username, creatureItem, 1);
		}
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

		if (CreatureRoster.instance.items.length < 2)
		{
			CreatureCatchState.TryStartAppearance(0);
			return;
		}

		while (CreatureCatchState.activeAppearance == null)
		{
			var targetId = Math.round(Math.random() * (CreatureRoster.instance.items.length - 1));
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
	}

	static EndAppearance()
	{
		if (CreatureCatchState.activeAppearance == null) return;

		CreatureCatchState.activeAppearance.RemoveElements();
		CreatureCatchState.activeAppearance = null;
		CreatureCatchState.onAppearanceEnded.Invoke();

		var opt_min_delay = OptionManager.GetOption(option_key_creature_catching_appearances_delay_min);
		var opt_max_delay = OptionManager.GetOption(option_key_creature_catching_appearances_delay_max);
		CreatureCatchState.timer_nextAppearance = Math.random() * (opt_max_delay.value - opt_min_delay.value) + opt_min_delay.value;
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

		this.CreateSettingsPage();
		this.CreateAppeareanceInfoRoot();

		this.RefreshAppearanceInfo();

		this.sub_AppearStart = CreatureCatchState.onAppearanceStarted.RequestSubscription(() => { this.RefreshAppearanceInfo(); });
		this.sub_AppearEnd = CreatureCatchState.onAppearanceEnded.RequestSubscription(() => { this.RefreshAppearanceInfo(); });
	}

	onWindowClose()
	{
		CreatureCatchState.onAppearanceStarted.RemoveSubscription(this.sub_AppearStart);
		CreatureCatchState.onAppearanceEnded.RemoveSubscription(this.sub_AppearEnd);
	}

	CreateAppeareanceInfoRoot()
	{
		this.e_appearanceInfoRoot = addElement("div", null, this.e_content);
		this.e_appearanceInfoRoot.style.position = "relative";
		this.e_appearanceInfoRoot.style.flexGrow = "1.0";

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
	}

	RefreshAppearanceInfo()
	{
		if (CreatureCatchState.activeAppearance)
			this.e_appearanceInfoImage.src = CreatureCatchState.activeAppearance.creature.imageSrc;
		this.e_appearanceInfoImage.style.opacity = CreatureCatchState.activeAppearance ? "1.0" : "0.0";
		this.e_appearanceInfoImage.style.transform = CreatureCatchState.activeAppearance ? "translateY(0%)" : "translateY(20%)";
	}

	CreateSettingsPage()
	{
		const collapsedHeight = "2.2rem";
		const expandedHeight = "20rem";
		this.CreateControlsColumn(true);
		this.e_controls_column.style.transitionProperty = "max-height";
		this.e_controls_column.style.transitionDuration = "0.3s";
		this.e_controls_column.style.transitionTimingFunction = "ease-in-out";
		this.e_controls_column.style.maxHeight = expandedHeight;

		const e_settings_title = this.AddSectionTitle("Settings");
		e_settings_title.style.cursor = "pointer";
		e_settings_title.addEventListener(
			"click",
			e =>
			{
				if (this.e_controls_column.style.maxHeight == collapsedHeight)
				{
					this.e_controls_column.style.maxHeight = expandedHeight;
					e_settings_title.style.color = "#ffffff80";
				}
				else
				{
					this.e_controls_column.style.maxHeight = collapsedHeight;
					this.e_controls_column.style.overflowY = "hidden";
					e_settings_title.style.color = "#ffffff20";
				}
			}
		);

		var opt_enabled = OptionManager.GetOption(option_key_creature_catching_appearances_enabled);
		var opt_keyphrase = OptionManager.GetOption(option_key_creature_catching_keyphrase);
		var opt_delayMin = OptionManager.GetOption(option_key_creature_catching_appearances_delay_min);
		var opt_delayMax = OptionManager.GetOption(option_key_creature_catching_appearances_delay_max);

		this.e_tgl_run = this.AddToggle(
			opt_enabled.label,
			opt_enabled.value,
			x =>
			{
				OptionManager.SetOptionValue(option_key_creature_catching_appearances_enabled, x.checked);
				CreatureCatchingOverlay.UpdateVisibility();
			}
		);

		this.e_rng_delayMin = this.AddSlider(
			opt_delayMin.label,
			opt_delayMin.value,
			5,
			1200,
			x =>
			{
				OptionManager.SetOptionValue(option_key_creature_catching_appearances_delay_min, x.value);
			}
		);

		this.e_rng_delayMax = this.AddSlider(
			opt_delayMax.label,
			opt_delayMax.value,
			5,
			1200,
			x =>
			{
				OptionManager.SetOptionValue(option_key_creature_catching_appearances_delay_max, x.value);
			}
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


const option_key_creature_catching_appearances_enabled = "creature.catching.appearances.enabled";
const option_key_creature_catching_appearances_delay_min = "creature.catching.appearances.delay.min";
const option_key_creature_catching_appearances_delay_max = "creature.catching.appearances.delay.max";
const option_key_creature_catching_keyphrase = "creature.catching.keyphrase";
const option_key_creature_catching_creature_size = "creature.catching.creature.size";
OptionManager.AppendOption(option_key_creature_catching_appearances_enabled, false, "Appearances");
OptionManager.AppendOption(option_key_creature_catching_appearances_delay_min, 30, "Delay Min");
OptionManager.AppendOption(option_key_creature_catching_appearances_delay_max, 600, "Delay Max");
OptionManager.AppendOption(option_key_creature_catching_creature_size, 1.0, "Creature Size");
OptionManager.AppendOption(option_key_creature_catching_keyphrase, "!catch", "Key Phrase");


WindowManager.instance.windowTypes.push(
	{
		key: CreatureCatchingWindow.window_kind,
		icon: "android",
		model: (x, y) => { return new CreatureCatchingWindow(x, y); },
		wip: true
	}
);


window.setTimeout(() => { CreatureCatchingOverlay.UpdateVisibility(); }, 250);