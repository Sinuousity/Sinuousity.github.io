import { StoredObject } from "./storedobject.js";
import { DraggableWindow, WindowBase } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";
import { CreatureRoster } from "./creatures.js";
import "./storedobject.js";
import { UserInput } from "./userinput.js";

console.info("Module Added: Creature Catching");


export class CreatureAppearance
{
	constructor()
	{
		this.active = false;
		this.creatureId = Math.round(Math.random() * (CreatureRoster.instance.creatures.length - 1));
		this.creature = CreatureRoster.instance.creatures[this.creatureId];
	}

	Start()
	{
		if (CreatureCatchingState.activeAppearance) CreatureCatchingState.activeAppearance.End();
		CreatureCatchingState.activeAppearance = this;
		this.active = true;
	}

	End()
	{
		this.active = false;
		if (CreatureCatchingState.activeAppearance == this) CreatureCatchingState.activeAppearance = null;
	}
}

export class CreatureCatchingState
{
	constructor()
	{
		this.activeAppearance = new CreatureAppearance();
	}
}

export class CreatureCatchingSettings extends StoredObject
{
	static instance = new CreatureCatchingSettings();

	constructor()
	{
		super(0.369, false);
		this.storeKey = "data_creature_catching";
		this.catchKeyPhrase = "!catch";
		this.running = false;
	}

	GetState()
	{
		return {
			running: this.running,
			catchKeyPhrase: this.catchKeyPhrase
		};
	}

	ApplyState(x)
	{
		this.running = x.running;
		this.catchKeyPhrase = x.catchKeyPhrase;
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
		this.e_window_root.style.minHeight = "180px";
		this.e_window_root.style.maxHeight = "180px";
		this.e_window_root.style.minWidth = "260px";
		this.e_window_root.style.maxWidth = "260px";
		this.e_window_root.style.resize = "none";

		this.e_creatures = [];
		this.e_edit_overlay = {};
		this.currentEditTargetIndex = -1;
		this.currentEditTarget = {};

		this.CreateContentContainer();
		this.e_content.overflowY = "hidden";

		this.CreateControlsColumn();
		this.AddSectionTitle("Settings");

		this.e_tgl_run = this.AddToggle(
			"Appearances",
			CreatureCatchingSettings.instance.running,
			() =>
			{
				CreatureCatchingSettings.instance.running = this.e_tgl_run.value;
				CreatureCatchingSettings.instance.ExtendTimer();
			}
		);

		this.e_txt_keyphrase = this.AddTextField(
			"KeyPhrase",
			CreatureCatchingSettings.instance.catchKeyPhrase,
			() =>
			{
				CreatureCatchingSettings.instance.catchKeyPhrase = this.e_txt_keyphrase.value;
				CreatureCatchingSettings.instance.ExtendTimer();
			}
		);
		this.e_txt_keyphrase.style.height = "2rem";
		this.e_txt_keyphrase.style.lineHeight = "2rem";

		this.e_btn_show_overlay = this.AddButton("Overlay", "Show", () => { WindowManager.instance.GetNewOrExistingWindow(CreatureCatchingOverlay.window_kind); });
		this.e_btn_show_overlay.style.height = "2rem";
		this.e_btn_show_overlay.style.lineHeight = "2rem";
	}
}

export class CreatureCatchingOverlay extends WindowBase
{
	static window_kind = "hidden:creature-catch-overlay";

	constructor(pos_x, pos_y)
	{
		super("Creature Catching Overlay", pos_x, pos_y);
		this.window_kind = CreatureCatchingOverlay.window_kind;

		this.dragging = false;
		this.drag_start_pos_x = pos_x;
		this.drag_start_pos_y = pos_y;

		this.e_window_top_bar.remove();
		this.e_window_root.className = "creature-catch-overlay";
		this.e_window_root.style.minHeight = "240px";
		this.e_window_root.style.maxHeight = "240px";
		this.e_window_root.style.minWidth = "240px";
		this.e_window_root.style.maxWidth = "240px";

		this.e_window_root.setAttribute("draggable", "false");
		this.e_window_root.addEventListener("mousedown", () => { this.StartDrag(); });
	}

	StartDrag()
	{
		if (this.dragging) return;
		this.dragging = true;

		this.drag_start_pos_x = UserInput.instance.mousePositionX;
		this.drag_start_pos_y = UserInput.instance.mousePositionY;

		this.e_window_root.style.cursor = "grabbing";
		document.addEventListener("mousemove", this.ContinueDrag.bind(this));
		document.addEventListener("mouseup", this.EndDrag.bind(this));
	}

	ContinueDrag()
	{
		if (!this.dragging) return;

		var dragDeltaX = UserInput.instance.mousePositionX - this.drag_start_pos_x;
		var dragDeltaY = UserInput.instance.mousePositionY - this.drag_start_pos_y;
		if (dragDeltaX == 0.0 && dragDeltaY == 0.0) return;

		this.drag_start_pos_x = UserInput.instance.mousePositionX;
		this.drag_start_pos_y = UserInput.instance.mousePositionY;

		this.position_x += dragDeltaX;
		this.position_y += dragDeltaY;

		this.position_x = Math.max(0, this.position_x);
		this.position_y = Math.max(0, this.position_y);

		this.position_x = Math.min(document.documentElement.clientWidth - this.e_window_root.offsetWidth, this.position_x);
		this.position_y = Math.min(document.documentElement.clientHeight - this.e_window_root.offsetHeight, this.position_y);

		var xdeltasign = Math.sign(dragDeltaX);
		var screenx = Math.abs(dragDeltaX) / 100.0;
		screenx = Math.min(Math.max(screenx, 0.0), 1.0);
		screenx *= screenx;
		this.e_window_root.style.transitionDuration = "0.06s";
		this.e_window_root.style.rotate = (20.0 * screenx * xdeltasign) + "deg";
		this.e_window_root.style.scale = "108%";
		this.e_window_root.style.outlineOffset = "4px";
		this.e_window_root.style.outline = "2px solid #FFbb00ff";
		this.ApplyPosition();
	}

	EndDrag()
	{
		if (!this.dragging) return;
		this.dragging = false;

		this.e_window_root.style.cursor = "grab";
		this.e_window_root.style.transitionDuration = "0.2s";
		this.e_window_root.style.rotate = "0deg";
		this.e_window_root.style.scale = "100%";
		this.e_window_root.style.outlineOffset = "1px";
		this.e_window_root.style.outline = "2px solid transparent";
		document.removeEventListener("mousemove", this.ContinueDrag.bind(this));
		document.removeEventListener("mouseup", this.EndDrag.bind(this));

		WindowManager.instance.TryStoreState();
	}
}

WindowManager.instance.windowTypes.push({ key: CreatureCatchingWindow.window_kind, icon: "android", model: (x, y) => { return new CreatureCatchingWindow(x, y); } });
WindowManager.instance.windowTypes.push({ key: CreatureCatchingOverlay.window_kind, model: (x, y) => { return new CreatureCatchingOverlay(x, y); } });