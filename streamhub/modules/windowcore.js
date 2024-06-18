import { GlobalSettings } from "./globalsettings.js";
import { WindowManager } from "./windowmanager.js";
import { UserInput } from "./userinput.js";

console.info("[ +Module ] Window Core");

export class WindowBase
{
	constructor(title, pos_x = 0.0, pos_y = 0.0)
	{
		this.orderOffset = -WindowManager.instance.windows.length - 2;

		this.window_name = title;
		this.window_kind = "null"; // needs to be set by sub classes to restore windows between sessions
		this.e_window_root = {};
		this.e_window_top_bar = {};
		this.e_window_button_group = {};
		this.e_window_btn_close = {};
		this.e_window_icon = {};
		this.e_title = {};

		this.position_x = 0.0;
		this.position_y = 0.0;
		if (pos_x) this.position_x = pos_x;
		if (pos_y) this.position_y = pos_y;

		this.width = 300;
		this.height = 600;

		this.CreateWindow();
		this.CreateTopBar();
		this.e_window_btn_close = this.CreateTopBarButton("red", () => { this.Close(); }, "Close");

		this.SetTitle(title);

		this.created = true;

		document.body.appendChild(this.e_window_root);
		WindowManager.instance.windows.push(this);
		if (!WindowManager.instance.restoringState) WindowManager.instance.TryStoreState();

		this.Show();
	}

	onWindowShow() { };
	onWindowClose() { };

	SetOrderIndex(new_index)
	{
		this.orderOffset = new_index;
		this.e_window_root.style.zIndex = 100 + new_index * 5;
	}

	GetStateData()
	{
		return {
			window_kind: this.window_kind,
			window_name: this.window_name,
			window_data: "",
			pos_x: this.position_x,
			pos_y: this.position_y,
			width: this.e_window_root.clientWidth,
			height: this.e_window_root.clientHeight
		};
	}

	ApplyStateData(state)
	{
		this.window_name = state.window_name;
		this.SetTitle(state.window_name);

		this.position_x = state.pos_x;
		this.position_y = state.pos_y;
		this.ApplyPosition();
		this.e_window_root.style.width = state.width + "px";
		this.e_window_root.style.height = state.height + "px";
	}

	SetIcon(iconCode)
	{
		if (this.e_window_icon.remove) this.e_window_icon.remove();
		this.CreateIcon(iconCode);
	}

	SetIconImg(src)
	{
		if (this.e_window_icon.remove) this.e_window_icon.remove();
		this.CreateIconImg(src);
	}

	SetTitle(newTitle)
	{
		if (!this.created) return;
		this.e_title.innerText = newTitle;
	}

	ApplyPosition()
	{
		this.e_window_root.style.left = this.position_x + "px";
		this.e_window_root.style.top = this.position_y + "px";
	}

	Show()
	{
		this.e_window_root.style.opacity = "100%";
		this.e_window_root.style.transform = "scale(100%)";
		this.e_window_root.style.userSelect = "none";
		this.e_window_root.style.pointerEvents = "all";
		this.ApplyPosition();
		this.onWindowShow();
		WindowManager.instance.BringToFront(this);
	}

	Close()
	{
		this.e_window_root.style.transform = "scale(80%)";
		this.e_window_root.style.opacity = "0%";
		this.e_window_root.style.userSelect = "none";
		this.e_window_root.style.pointerEvents = "none";

		this.onWindowClose();

		var myWindowIndex = WindowManager.instance.windows.indexOf(this);
		if (myWindowIndex >= 0) WindowManager.instance.windows.splice(myWindowIndex, 1);
		else console.log("window index out of bounds");
		WindowManager.instance.TryStoreState();

		window.setTimeout(() => { this.e_window_root.remove(); }, 100);
	}

	CreateWindow()
	{
		this.e_window_root = document.createElement("div");
		this.e_window_root.id = "window-root";
		this.e_window_root.className = "window-root";
		this.e_window_root.setAttribute("draggable", "false");
		this.e_window_root.addEventListener("mousedown", () => { WindowManager.instance.BringToFront(this); });
		this.ApplyPosition();
	}

	CreateTopBar()
	{
		this.e_window_top_bar = document.createElement("div");
		this.e_window_top_bar.id = "window-top-bar";
		this.e_window_top_bar.className = "window-top-bar";
		this.e_window_top_bar.setAttribute("draggable", "false");
		this.e_window_root.appendChild(this.e_window_top_bar);

		this.e_title = document.createElement("div");
		this.e_window_top_bar.appendChild(this.e_title);

		this.e_window_button_group = document.createElement("div");
		this.e_window_button_group.className = "window-button-group";
		this.e_window_top_bar.appendChild(this.e_window_button_group);
	}

	CreateDropZone(dropAction)
	{
		var zone = document.createElement("div");
		zone.className = "window-content-dropzone";
		zone.addEventListener("dragenter", e =>
		{
			zone.style.borderColor = "#00ff00";
			e.stopPropagation(); e.preventDefault();
		});
		zone.addEventListener("dragleave", e =>
		{
			zone.style.borderColor = "#777777";
		});
		zone.addEventListener("dragover", e => { e.stopPropagation(); e.preventDefault(); });
		zone.addEventListener(
			"drop",
			e =>
			{
				zone.style.borderColor = "#777777";
				e.stopPropagation();
				e.preventDefault();
				dropAction(e);
			}
		);
		zone.title = "Drop Files Here!";

		this.e_content.appendChild(zone);
		return zone;
	}

	CreateIcon(iconCode)
	{
		this.e_window_icon = document.createElement("i");
		this.e_window_icon.id = "window-icon";
		this.e_window_icon.className = "window-icon";
		this.e_window_icon.style.fontFamily = "'Material Icons'";
		this.e_window_icon.style.color = "white";
		this.e_window_icon.innerText = iconCode;
		this.e_window_icon.setAttribute("draggable", "false");
		this.e_window_top_bar.appendChild(this.e_window_icon);
	}

	CreateIconImg(src)
	{
		this.e_window_icon = document.createElement("img");
		this.e_window_icon.id = "window-icon";
		this.e_window_icon.className = "window-icon";
		this.e_window_icon.src = src;
		this.e_window_icon.setAttribute("draggable", "false");
		this.e_window_top_bar.appendChild(this.e_window_icon);
	}

	CreateTopBarButton(color, onClickAction, title = "")
	{
		var e_btn = document.createElement("div");
		e_btn.className = "window-button";
		e_btn.style.backgroundColor = color;
		if (title) e_btn.title = title;
		e_btn.addEventListener("click", onClickAction);
		e_btn.setAttribute("draggable", "false");
		this.e_window_button_group.appendChild(e_btn);
	}

	CreateContentContainer(addObscurer = false)
	{
		this.e_content = document.createElement("div");
		this.e_content.className = "window-content";
		this.e_window_root.insertBefore(this.e_content, this.e_window_top_bar);

		if (addObscurer)
		{
			this.e_content.className = "window-content hover-obscure";
			this.e_window_root.addEventListener("mouseleave", () => { this.BlurRecursive(this.e_content); });
		}
	}

	BlurRecursive(e)
	{
		if (!e.blur) return;
		for (var c of e.children) this.BlurRecursive(c);
		e.blur();
	}

	CreateOverlay(label)
	{
		var e_overlay = document.createElement("div");
		e_overlay.className = "window-content-overlay";

		if (label)
		{
			var e_label = document.createElement("div");
			e_label.className = "window-content-overlay-label";
			e_label.innerText = label;
			e_overlay.appendChild(e_label);
		}

		this.e_content.appendChild(e_overlay);

		return e_overlay;
	}

	CreateControlsColumn()
	{
		this.e_controls_column = document.createElement("div");
		this.e_controls_column.className = "window-control-column";
		this.e_content.appendChild(this.e_controls_column);
	}

	AddSectionTitle(title)
	{
		var e_section_title = document.createElement("div");
		e_section_title.className = "window-section-title";
		e_section_title.innerText = title;
		if (this.e_controls_column) this.e_controls_column.appendChild(e_section_title);
		else this.e_content.appendChild(e_section_title);
	}

	AddControl(label)
	{
		var e_control = document.createElement("div");
		e_control.className = "window-control-item";

		var e_label = document.createElement("div");
		e_label.className = "window-control-label";
		e_label.innerText = label;
		e_control.appendChild(e_label);

		this.e_controls_column.appendChild(e_control);
		return e_control;
	}

	AddToggle(label, checked, changeAction, dirtiesSettings = true)
	{
		var e_control = this.AddControl(label);

		var e_root = document.createElement("label");
		e_root.className = "window-control";

		var e_input = document.createElement("input");
		e_input.type = "checkbox";
		e_input.checked = checked;

		const willDirtySettings = dirtiesSettings;
		var onToggle = () =>
		{
			changeAction(e_input);
			if (willDirtySettings)
			{
				GlobalSettings.instance.ApplyState();
				GlobalSettings.instance.MarkDirty();
			}
		};
		e_input.addEventListener("change", onToggle);

		e_root.appendChild(e_input);
		e_control.appendChild(e_root);

		return e_control;
	}

	AddSlider(label, initialValue, minValue, maxValue, changeAction, dirtiesSettings = true)
	{
		var e_control = this.AddControl(label);

		var e_root = document.createElement("div");
		e_root.className = "window-control";

		var e_input = document.createElement("input");
		e_input.type = "range";
		e_input.min = minValue;
		e_input.max = maxValue;
		e_input.value = initialValue;

		const willDirtySettings = dirtiesSettings;
		var onChanged = () =>
		{
			changeAction(e_input);
			if (willDirtySettings)
			{
				GlobalSettings.instance.ApplyState();
				GlobalSettings.instance.MarkDirty();
			}
		};
		e_input.addEventListener("change", onChanged);

		e_root.appendChild(e_input);
		e_control.appendChild(e_root);

		return e_control;
	}

	AddTextField(label, initialValue, changeAction, dirtiesSettings = true)
	{
		var e_control = this.AddControl(label);

		var e_root = document.createElement("div");
		e_root.className = "window-control";

		var e_input = document.createElement("input");
		e_input.type = "text";
		e_input.value = initialValue;
		e_input.placeholder = label;

		const willDirtySettings = dirtiesSettings;
		var onChanged = () =>
		{
			changeAction(e_input);
			if (willDirtySettings)
			{
				GlobalSettings.instance.ApplyState();
				GlobalSettings.instance.MarkDirty();
			}
		};
		e_input.addEventListener("change", onChanged);

		e_root.appendChild(e_input);
		e_control.appendChild(e_root);

		return e_control;
	}

	AddDropDown(label, changeAction, dirtiesSettings = true)
	{
		var e_control = this.AddControl(label);

		var e_root = document.createElement("div");
		e_root.className = "window-control";

		var e_input = document.createElement("select");
		e_input.name = "dropdown";

		const willDirtySettings = dirtiesSettings;
		var onChanged = () =>
		{
			changeAction(e_input);
			if (willDirtySettings)
			{
				GlobalSettings.instance.ApplyState();
				GlobalSettings.instance.MarkDirty();
			}
		};
		e_input.addEventListener("change", onChanged);

		e_root.appendChild(e_input);
		e_control.appendChild(e_root);

		return e_control;
	}

	AppendSelectOption(e_select, optionText)
	{
		var e_opt = document.createElement("option");
		e_opt.value = optionText;
		e_opt.innerText = optionText;
		e_select.appendChild(e_opt);
		return e_opt;
	}

	AddTextReadonly(label, readonlyValue)
	{
		var e_control = this.AddControl(label);

		var e_root = document.createElement("div");
		e_root.className = "window-control";

		var e_input = document.createElement("div");
		e_input.className = "window-control-text-readonly hover-obscured";
		e_input.innerText = readonlyValue;
		e_input.title = "Read Only";

		e_root.appendChild(e_input);
		e_control.appendChild(e_root);

		return e_control;
	}

	AddTextArea(label, initialValue, changeAction)
	{
		var e_control = this.AddControl(label);

		var e_root = document.createElement("div");
		e_root.className = "window-control";

		var e_input = document.createElement("textarea");
		e_input.value = initialValue;
		e_input.placeholder = label;

		var onChanged = () =>
		{
			changeAction(e_input);
			GlobalSettings.instance.ApplyState();
			GlobalSettings.instance.MarkDirty();
		};
		e_input.addEventListener("change", onChanged);

		e_root.appendChild(e_input);
		e_control.appendChild(e_root);

		return e_control;
	}

	AddColorPicker(label, initialValue, changeAction)
	{
		var e_control = this.AddControl(label);

		var e_root = document.createElement("div");
		e_root.className = "window-control";

		var e_input = document.createElement("input");
		e_input.type = "color";
		e_input.value = initialValue;
		e_input.style.margin = "0";
		e_input.style.padding = "0";
		e_input.style.borderWidth = "0";

		var onChanged = () =>
		{
			changeAction(e_input);
			GlobalSettings.instance.ApplyState();
			GlobalSettings.instance.MarkDirty();
		};
		e_input.addEventListener("change", onChanged);

		e_root.appendChild(e_input);
		e_control.appendChild(e_root);

		return e_control;
	}

	AddButton(label, buttonText, clickAction, dirtiesSettings = false)
	{
		var e_control = this.AddControl(label);

		var e_root = document.createElement("div");
		e_root.className = "window-control";

		var e_input = document.createElement("input");
		e_input.type = "button";
		e_input.value = buttonText;
		e_input.style.margin = "0";
		e_input.style.padding = "0";
		e_input.style.borderWidth = "0";

		var onClicked = () =>
		{
			clickAction(e_input);
			if (dirtiesSettings)
			{
				GlobalSettings.instance.ApplyState();
				GlobalSettings.instance.MarkDirty();
			}
		};
		e_input.addEventListener("click", onClicked);

		e_root.appendChild(e_input);
		e_control.appendChild(e_root);

		return e_control;
	}
}

export class PopupWindow extends WindowBase
{
	constructor(title, pos_x, pos_y)
	{
		super(title, pos_x, pos_y);
	}
}

export class DraggableWindow extends WindowBase
{
	constructor(title, pos_x, pos_y)
	{
		super(title, pos_x, pos_y);

		this.e_window_drag_handle = {};

		this.dragging = false;
		this.drag_start_pos_x = pos_x;
		this.drag_start_pos_y = pos_y;

		this.CreateDragHandle();
	}

	CreateDragHandle()
	{
		this.e_window_drag_handle = document.createElement("div");
		this.e_window_drag_handle.id = "window-drag-handle";
		this.e_window_drag_handle.className = "window-drag-handle";
		this.e_window_drag_handle.setAttribute("draggable", "false");
		this.e_window_drag_handle.addEventListener("mousedown", () => { this.StartDrag(); });
		this.e_window_top_bar.insertBefore(this.e_window_drag_handle, this.e_title);
	}

	StartDrag()
	{
		if (this.dragging) return;
		this.dragging = true;

		this.drag_start_pos_x = UserInput.instance.mousePositionX;
		this.drag_start_pos_y = UserInput.instance.mousePositionY;

		//this.e_window_root.style.pointerEvents = "none";
		this.e_window_drag_handle.style.cursor = "grabbing";
		document.addEventListener("mousemove", this.ContinueDrag.bind(this));
		document.addEventListener("mouseup", this.EndDrag.bind(this));
	}

	ContinueDrag()
	{
		if (!this.dragging) return;

		var dragDeltaX = UserInput.instance.mousePositionX - this.drag_start_pos_x;
		var dragDeltaY = UserInput.instance.mousePositionY - this.drag_start_pos_y;

		//dragDeltaX = Math.sign(dragDeltaX) * Math.round(Math.abs(dragDeltaX) * 0.2) * 5.0;
		//dragDeltaY = Math.sign(dragDeltaY) * Math.round(Math.abs(dragDeltaY) * 0.2) * 5.0;

		if (dragDeltaX == 0.0 && dragDeltaY == 0.0) return;

		this.drag_start_pos_x = UserInput.instance.mousePositionX;
		this.drag_start_pos_y = UserInput.instance.mousePositionY;

		this.position_x += dragDeltaX;
		this.position_y += dragDeltaY;

		//this.position_x = Math.round(this.position_x * 0.2) * 5.0;
		//this.position_y = Math.round(this.position_y * 0.2) * 5.0;

		this.position_x = Math.max(0, this.position_x);
		this.position_y = Math.max(0, this.position_y);

		this.position_x = Math.min(document.body.offsetWidth - this.e_window_root.offsetWidth, this.position_x);
		this.position_y = Math.min(document.body.offsetHeight - this.e_window_root.offsetHeight, this.position_y);

		var xdeltasign = Math.sign(dragDeltaX);
		var screenx = Math.abs(dragDeltaX) / 100.0;
		screenx = Math.min(Math.max(screenx, 0.0), 1.0);
		screenx *= screenx;
		this.e_window_root.style.transitionDuration = "0.06s";
		this.e_window_root.style.rotate = (20.0 * screenx * xdeltasign) + "deg";
		this.e_window_root.style.scale = "101%";
		this.e_window_root.style.outlineOffset = "4px";
		this.e_window_root.style.outline = "2px solid #FFbb00ff";
		this.e_window_root.style.backgroundColor = "#ffffff15";
		this.ApplyPosition();
	}

	EndDrag()
	{
		if (!this.dragging) return;
		this.dragging = false;

		//this.e_window_root.style.pointerEvents = "all";
		this.e_window_drag_handle.style.cursor = "grab";
		this.e_window_root.style.transitionDuration = "0.2s";
		this.e_window_root.style.rotate = "0deg";
		this.e_window_root.style.scale = "100%";
		this.e_window_root.style.outlineOffset = "1px";
		this.e_window_root.style.outline = "2px solid transparent";
		this.e_window_root.style.backgroundColor = "#ffffff08";
		document.removeEventListener("mousemove", this.ContinueDrag.bind(this));
		document.removeEventListener("mouseup", this.EndDrag.bind(this));

		WindowManager.instance.TryStoreState();
	}
}