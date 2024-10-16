import { GlobalSettings } from "./globalsettings.js";
import { WindowManager } from "./windowmanager.js";
import { UserInput } from "./userinput.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { addElement } from "../hubscript.js";

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
		this.e_context_menu_root = {};
		this.showing_context_menu = false;

		this.position_x = 0.0;
		this.position_y = 0.0;
		if (pos_x) this.position_x = pos_x;
		if (pos_y) this.position_y = pos_y;

		this.width = 300;
		this.height = 600;

		this.CreateWindow();
		this.CreateTopBar();
		this.e_window_btn_close = this.CreateTopBarButton("red", () => { this.Close(); }, "Close", "close");

		this.SetTitle(title);

		this.e_context_menu_root = addElement("div", "window-context-menu", this.e_window_root);
		this.e_context_menu_root.style.marginTop = "3.6rem";
		this.e_context_menu_root.style.opacity = "0.0";
		this.e_context_menu_root.style.pointerEvents = "none";

		this.created = true;

		document.body.appendChild(this.e_window_root);
		WindowManager.instance.windows.push(this);
		if (!WindowManager.instance.restoringState) WindowManager.instance.SetStateDirty();


		this.resizeObserver = new ResizeObserver(
			() =>
			{
				this.onWindowResize();
				WindowManager.instance.SetStateDirty();
			}
		);
		this.resizeObserver.observe(this.e_window_root);

		this.Show();
	}

	onWindowResize() { };
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

	AddWindowHelpButton()
	{
		this.e_window_btn_help = this.CreateTopBarButton("cyan", () => { this.ToggleWindowHelpOverlay(); }, "Help", "help")
	}

	CreateWindowHelpElements()
	{
		if (this.e_overlay_window_help) return;

		this.e_overlay_window_help = addElement("div", null, this.e_content);
		this.e_overlay_window_help.draggable = false;
		this.e_overlay_window_help.style = "z-index:500; position:absolute; inset:0px; background-color:#000000c0;"
			+ " transition-property:opacity; transition-duration:0.2s; transition-timing-function:ease-in-out;"
			+ " backdrop-filter:blur(2px);"
			+ " opacity:0.0;"
			+ " pointer-events:all; user-select:none;";
		this.e_overlay_window_help.style.cursor = "help";
		this.e_overlay_window_help.addEventListener("click", e =>
		{
			this.showingOverlay_WindowHelp = false;
			this.e_overlay_window_help.style.opacity = "0.0";
			this.e_overlay_window_help.style.pointerEvents = "none";
		});

		this.e_overlay_window_help_text = addElement("div", null, this.e_overlay_window_help);

		this.e_overlay_window_help_text.style = "position:absolute; top:50%; left:50%; width: 90%; text-align:center; transform:translate(-50%,-50%);";
		this.e_overlay_window_help_text.style.verticalAlign = "center";
		this.e_overlay_window_help_text.innerText = "This is a helpful description of this window's content. Unless it isn't!";
	}

	ToggleWindowHelpOverlay()
	{
		if (!this.e_content) return;

		this.CreateWindowHelpElements();

		if (this.showingOverlay_WindowHelp)
		{
			this.e_overlay_window_help.style.opacity = "0.0";
			this.e_overlay_window_help.style.pointerEvents = "none";
			this.showingOverlay_WindowHelp = false;
			return;
		}
		else
		{
			this.e_overlay_window_help.style.opacity = "1.0";
			this.e_overlay_window_help.style.pointerEvents = "all";
			this.showingOverlay_WindowHelp = true;
		}
	}

	SetWindowHelpText(helpText = "This is a helpful description of this window's content. Unless it isn't!")
	{
		this.CreateWindowHelpElements();
		this.e_overlay_window_help.style.opacity = "0.0";
		this.e_overlay_window_help.style.pointerEvents = "none";
		this.showingOverlay_WindowHelp = false;
		this.e_overlay_window_help_text.innerText = helpText;
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
		this.e_window_root.style.left = `max(0px, ${this.position_x}px)`;
		this.e_window_root.style.top = `max(0px, ${this.position_y}px)`;
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

		GlobalTooltip.ReleaseAllReceivers(this.e_window_root);

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
		this.e_window_root.style.maxWidth = (document.documentElement.clientWidth - 24) + "px";
		this.e_window_root.style.maxHeight = (document.documentElement.clientHeight - 24) + "px";
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

	CreateMenuBar()
	{
		this.e_window_menu_bar = document.createElement("div");
		this.e_window_menu_bar.name = "window-menu-bar";
		this.e_window_menu_bar.className = "window-menu-bar";
		this.e_window_menu_bar.setAttribute("draggable", "false");
		this.e_window_root.appendChild(this.e_window_menu_bar);
		this.e_window_root.addEventListener("mouseleave", e => { this.StartHideContextMenu() });
		this.e_window_menu_bar.addEventListener("mouseenter", e => { this.CancelHideContextMenu() });
		this.e_window_menu_bar.addEventListener("mouseleave", e => { this.StartHideContextMenu() });

		if (this.e_content) this.e_content.style.marginTop = "3.6rem";
	}

	AddMenuBarMenu(menuLabel = "MENU", items = [])
	{
		if (!this.e_window_menu_bar) this.CreateMenuBar();
		const e_menu_btn = addElement("div", "window-menu-bar-menu", this.e_window_menu_bar);
		e_menu_btn.innerText = menuLabel;
		e_menu_btn.addEventListener(
			"click",
			e =>
			{
				if (this.showing_context_menu) { this.HideContextMenu(); }
				else
				{
					this.ShowContextMenu(items);
					this.MoveContextMenuToElement(e_menu_btn);
				}
			}
		);
		e_menu_btn.addEventListener(
			"mouseenter",
			e =>
			{
				if (this.showing_context_menu)
				{
					//this.HideContextMenu();
					this.ShowContextMenu(items);
					this.MoveContextMenuToElement(e_menu_btn);
				}
			}
		);
		return e_menu_btn;
	}

	MoveContextMenuToElement(e)
	{
		if (!this.e_context_menu_root) return;
		var windowRect = this.e_window_root.getBoundingClientRect();
		var eRect = e.getBoundingClientRect();
		var menuX = eRect.x - windowRect.x;
		this.e_context_menu_root.style.left = menuX + "px";
	}

	ShowContextMenu(items = [{ label: "Do Nothing", action: () => { } }])
	{
		if (!this.e_context_menu_root) return;
		this.showing_context_menu = true;
		this.e_context_menu_root.innerHTML = "";
		this.e_context_menu_root.style.pointerEvents = "all";
		this.e_context_menu_root.style.opacity = "1.0";

		this.e_context_menu_root.addEventListener("mouseleave", e => { this.StartHideContextMenu(); });
		this.e_context_menu_root.addEventListener("mouseenter", e => { this.CancelHideContextMenu(); });

		for (const ii in items)
		{
			const i = items[ii];
			if (!i.label) continue;
			var e_item_btn = addElement("div", "window-context-menu-item", this.e_context_menu_root);
			e_item_btn.innerText = i.label;
			if (!i.action) continue;
			e_item_btn.addEventListener("click", e => { i.action(); this.HideContextMenu(); });
		}
	}

	HideContextMenu()
	{
		if (!this.showing_context_menu) return;
		if (this.timeout_context_menu != -1) window.clearTimeout(this.timeout_context_menu);
		this.timeout_context_menu = -1;
		this.e_context_menu_root.style.pointerEvents = "none";
		this.e_context_menu_root.style.opacity = "0.0";
		this.showing_context_menu = false;
	}

	StartHideContextMenu()
	{
		this.CancelHideContextMenu();
		this.timeout_context_menu = window.setTimeout(() => { this.HideContextMenu(); }, 400);
	}

	CancelHideContextMenu()
	{
		if (this.timeout_context_menu != -1) window.clearTimeout(this.timeout_context_menu);
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

	CreateTopBarButton(color, onClickAction, title = "", iconName = "")
	{
		var e_btn = document.createElement("div");
		e_btn.className = "window-button";
		e_btn.style.backgroundColor = color;
		if (title) GlobalTooltip.RegisterReceiver(e_btn, title, title);
		e_btn.addEventListener("click", onClickAction);
		e_btn.setAttribute("draggable", "false");
		this.e_window_button_group.appendChild(e_btn);

		if (typeof iconName != 'string' || iconName == '') return;

		var e_icon = document.createElement("i");
		e_icon.id = "window-icon";
		e_icon.className = "window-icon";
		e_icon.style.fontFamily = "'Material Icons'";
		e_icon.style.color = "black";
		e_icon.style.position = "absolute";
		e_icon.style.top = "13%";
		e_icon.style.bottom = "unset";
		e_icon.style.left = "50%";
		e_icon.style.width = "0px";
		e_icon.style.height = "0px";
		e_icon.style.lineHeight = "1.3rem";
		e_icon.style.fontSize = "1.3rem";
		e_icon.style.transform = "translate(-50%,-50%)";
		e_icon.innerText = iconName;
		e_icon.setAttribute("draggable", "false");
		e_btn.appendChild(e_icon);
	}

	CreateContentContainer(addObscurer = false)
	{
		this.e_content = document.createElement("div");
		this.e_content.className = "window-content";
		this.e_window_root.insertBefore(this.e_content, this.e_window_top_bar);

		if (this.e_window_menu_bar) this.e_content.style.marginTop = "3.6rem";

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

	CreateControlsColumn(isFlexChild = false)
	{
		this.e_controls_column = document.createElement("div");
		this.e_controls_column.className = "window-control-column";
		if (isFlexChild) this.e_controls_column.style.position = "relative";
		this.e_content.appendChild(this.e_controls_column);
	}

	AddSectionTitle(title)
	{
		var e_section_title = document.createElement("div");
		e_section_title.className = "window-section-title";
		e_section_title.innerText = title;
		if (this.e_controls_column) this.e_controls_column.appendChild(e_section_title);
		else this.e_content.appendChild(e_section_title);

		return e_section_title;
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
		let e_control = this.AddControl(label);
		let e_root = addElement('label', 'window-control', e_control);
		let e_tgl_back = {};
		let e_tgl_thumb = {};
		//let e_input = addElement('input', null, e_root, null, x => { x.type = 'checkbox'; x.checked = checked; });
		let e_input = addElement(
			'div', null, e_root, null,
			x => 
			{
				x.style.height = '100%';
				x.style.cursor = 'pointer';
				x.checked = checked;

				let style_back = e =>
				{
					e.style.position = 'absolute';
					e.style.top = '50%';
					e.style.left = '50%';
					e.style.width = '1.6rem';
					e.style.height = '0.8rem';
					e.style.backgroundColor = '#575757';
					e.style.borderRadius = '0.19rem';
					e.style.opacity = checked ? '100%' : '50%';
					e.style.transformOrigin = '0% 0%';
					e.style.transform = 'translate(-50%,-50%)';

					e.style.borderStyle = 'solid';
					e.style.borderWidth = '1px';
					e.style.borderColor = '#666';

					e.style.transitionProperty = 'scale';
					e.style.transitionDuration = '0.15s';
				};
				let style_thumb = e =>
				{
					e.style.position = 'absolute';
					e.style.top = '50%';
					e.style.left = '50%';
					e.style.height = checked ? '0.9rem' : '0.5rem';
					e.style.width = checked ? '0.9rem' : '0.5rem';
					e.style.backgroundColor = checked ? 'cyan' : '#222';
					e.style.borderRadius = '0.2rem';
					e.style.opacity = checked ? '100%' : '50%';
					e.style.transformOrigin = '0% 0%';
					e.style.transform = 'translate(' + (checked ? '0%' : '-100%') + ',-50%)';

					e.style.transitionProperty = 'scale, transform, background-color, box-shadow, width, height';
					e.style.transitionTimingFunction = 'ease-in-out';
					e.style.transitionDuration = '0.15s';

					e.style.borderStyle = 'solid';
					e.style.borderWidth = '1px';
					e.style.borderColor = checked ? '#4ff' : '#666';
					e.style.boxShadow = checked ? '#fffa 0px 0px 9px' : '#000a -1px 1px 2px';
				};

				e_tgl_back = addElement('div', null, x, null, style_back);
				e_tgl_thumb = addElement('div', null, x, null, style_thumb);

				x.addEventListener(
					'mouseenter',
					() =>
					{
						e_tgl_back.style.scale = '125%';
						e_tgl_thumb.style.scale = '125%';
					}
				);

				x.addEventListener(
					'mouseleave',
					() =>
					{
						e_tgl_back.style.scale = '100%';
						e_tgl_thumb.style.scale = '100%';
					}
				);
			}
		);

		e_input.addEventListener(
			"click",
			e =>
			{
				e_input.checked = !e_input.checked;
				changeAction(e_input);

				e_tgl_back.style.opacity = e_input.checked ? '100%' : '50%';
				e_tgl_thumb.style.opacity = e_input.checked ? '100%' : '50%';
				e_tgl_thumb.style.boxShadow = e_input.checked ? '#fffa 0px 0px 9px' : '#000a -1px 1px 2px';
				e_tgl_thumb.style.height = e_input.checked ? '0.9rem' : '0.5rem';
				e_tgl_thumb.style.width = e_input.checked ? '0.9rem' : '0.5rem';

				e_tgl_thumb.style.borderColor = e_input.checked ? '#4ff' : '#666';
				e_tgl_thumb.style.backgroundColor = e_input.checked ? 'cyan' : '#222';
				e_tgl_thumb.style.transform = 'translate(' + (e_input.checked ? '0%' : '-100%') + ',-50%)';
				if (dirtiesSettings)
				{
					GlobalSettings.instance.ApplyState();
					GlobalSettings.instance.MarkDirty();
				}
			}
		);


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
		e_input.style.left = "2rem";
		e_input.style.right = "2rem";

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

		var e_min = addElement("div", null, e_root);
		e_min.style.position = "absolute";
		e_min.style.color = "#fff5";
		e_min.style.fontSize = "0.7rem";
		e_min.style.left = "0";
		e_min.style.width = "2rem";
		e_min.innerText = minValue;

		e_root.appendChild(e_input);

		var e_max = addElement("div", null, e_root);
		e_max.style.position = "absolute";
		e_max.style.color = "#fff5";
		e_max.style.fontSize = "0.7rem";
		e_max.style.right = "0";
		e_max.style.width = "2rem";
		e_max.innerText = maxValue;

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
		var e_label_lbl = e_control.children[0];
		e_label_lbl.style.color = '#555';

		var e_root = document.createElement("div");
		e_root.className = "window-control";

		var e_input = document.createElement("div");
		e_input.className = "window-control-text-readonly hover-obscured";
		e_input.style.overflowX = "hidden";
		e_input.style.overflowY = "auto";
		e_input.innerText = readonlyValue;
		//e_input.title = "Read Only";

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
		//this.e_window_root.style.maxWidth = (document.body.offsetWidth - 8) + "px";
		//this.e_window_root.style.maxHeight = (document.body.offsetHeight - 8) + "px";
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

		this.position_x = Math.min(document.body.offsetWidth - this.e_window_root.offsetWidth, this.position_x);
		this.position_y = Math.min(document.body.offsetHeight - this.e_window_root.offsetHeight, this.position_y);

		this.position_x = Math.max(0, this.position_x);
		this.position_y = Math.max(0, this.position_y);

		var xdeltasign = Math.sign(dragDeltaX);
		var screenx = Math.abs(dragDeltaX) / 100.0;
		screenx = Math.min(Math.max(screenx, 0.0), 1.0);
		screenx *= screenx;
		this.e_window_root.style.transitionDuration = "0.06s";
		this.e_window_root.style.rotate = (20.0 * screenx * xdeltasign) + "deg";
		//this.e_window_root.style.scale = "101%";
		this.e_window_root.style.outlineOffset = "4px";
		this.e_window_root.style.outline = "2px solid var(--col-warn-bright)";
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
		//this.e_window_root.style.scale = "100%";
		this.e_window_root.style.outlineOffset = "1px";
		this.e_window_root.style.outline = "2px solid transparent";
		this.e_window_root.style.backgroundColor = "#ffffff08";
		document.removeEventListener("mousemove", this.ContinueDrag.bind(this));
		document.removeEventListener("mouseup", this.EndDrag.bind(this));

		WindowManager.instance.TryStoreState();
	}
}