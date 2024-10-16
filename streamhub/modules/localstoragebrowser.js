import { addElement } from "../hubscript.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] LocalStorage Browser Window");

export class LocalStorageBrowserWindow extends DraggableWindow
{
	static window_kind = "hidden:LocalStorage Browser";
	static window_title = "LocalStorage Browser";
	static window_icon = 'fact_check';
	static instance = null;

	constructor(pos_x, pos_y)
	{
		super(LocalStorageBrowserWindow.window_title, pos_x, pos_y);
		this.e_window_root.style.minHeight = "180px";
		this.e_window_root.style.minWidth = "320px";
		this.SetTitle(LocalStorageBrowserWindow.window_title);
		this.SetIcon(LocalStorageBrowserWindow.window_icon);
		this.window_kind = LocalStorageBrowserWindow.window_kind;
		this.CreateContentContainer();
		this.e_content.style.fontSize = "0.8rem";
		this.e_content.style.color = "white";
		this.e_content.style.backgroundColor = "#000000f0";
		this.e_content.style.overflowX = "hidden";
		this.e_content.style.overflowY = "hidden";
		this.e_content.style.textOverflow = "ellipsis";
		this.e_content.style.textWrap = "nowrap";
		this.e_content.style.width = "100%";

		this.e_warning = addElement(
			'div', null, this.e_window_root,
			'WARNING: This table likely contains SENSITIVE DATA. Be careful sharing its contents!',
			x =>
			{
				x.style.position = 'absolute';
				x.style.top = '2.1rem';
				x.style.fontSize = '0.8rem';
				x.style.lineHeight = '1.5rem';
				x.style.backgroundColor = '#a00';
				x.style.borderBottom = 'solid 2px #f00';
				x.style.color = 'white';
				x.style.justifyContent = 'center';
				x.style.textAlign = 'center';
				x.style.width = '100%';
				x.style.height = '1.5rem';
				x.style.left = '0';
				x.style.zIndex = '1000';

			}
		);

		this.e_browser_view = addElement(
			'div', 'hover-obscure-nofocus', this.e_content, null,
			x =>
			{
				x.style.position = 'absolute';
				x.style.inset = '2rem 0 0 0';
				x.style.display = 'flex';
				x.style.flexDirection = 'column';
				x.style.overflowX = "hidden";
				x.style.overflowY = "scroll";
				x.style.scrollBehavior = "smooth";
			}
		);

		this.RecreateListMain();
	}

	RecreateListMain()
	{
		for (var key in localStorage)
		{
			if (key === 'length') break;
			this.AddLocalStorageListItem(key);
		}
	}

	AddLocalStorageListItem(key)
	{
		let e_list_item_row = addElement(
			'div', null, this.e_browser_view, null,
			x =>
			{
				x.style.display = 'flex';
				x.style.flexDirection = 'row';
				x.style.height = '1.7rem';
				x.style.borderBottom = 'dashed #575757 1px';
				x.style.paddingTop = '0.1rem';
				x.style.paddingBottom = '0.1rem';
			}
		);
		addElement(
			'div', null, e_list_item_row, null,
			x =>
			{
				x.style.position = 'relative';
				x.style.textAlign = 'right';
				x.style.width = '10rem';
				x.style.minWidth = '0';
				x.style.flexShrink = '0.0';
				x.style.flexGrow = '0.0';
				x.style.marginRight = '0.5rem';

				x.style.overflow = 'hidden';
				x.style.textWrap = 'nowrap';
				x.style.wordWrap = 'break-word';
				x.style.textOverflow = 'ellipsis';
				x.style.overflowWrap = 'anywhere';
				x.style.whiteSpace = 'nowrap';

				x.style.color = 'cyan';
				x.innerText = key;
			}
		);
		addElement(
			'div', null, e_list_item_row, null,
			x =>
			{
				x.style.position = 'relative';
				x.style.width = '1rem';
				x.style.minWidth = '0';
				x.style.flexGrow = '1.0';
				x.style.flexShrink = '1.0';

				x.style.marginLeft = '0.5rem';

				x.style.overflow = 'hidden';
				x.style.textWrap = 'nowrap';
				x.style.wordWrap = 'break-word';
				x.style.textOverflow = 'ellipsis';
				x.style.overflowWrap = 'anywhere';
				x.style.whiteSpace = 'nowrap';

				let storageValue = localStorage[key];

				if (typeof storageValue === 'string' && storageValue.startsWith('{'))
				{
					let storageValueObj = JSON.parse(storageValue);
					if (storageValueObj)
					{
						x.innerHTML = '';
						let e_props = this.AddPropertyHTML(x, '[ROOT]', storageValueObj);
						this.AddHoverHighlightBackground(e_props);
						e_list_item_row.style.height = 'auto';
					}
				}
				else
				{
					x.innerText = storageValue;

					if (x.innerText === 'true') x.style.color = 'lightgreen';
					else if (x.innerText === 'false') x.style.color = 'yellow';
				}
			}
		);
	}

	AddHoverHighlightBackground(e)
	{
		e.addEventListener(
			"mouseenter",
			x =>
			{
				e.style.transitionProperty = 'background-color, outline, outline-offset';
				e.style.transitionDuration = '0.1s';
				e.style.backgroundColor = '#ffffff0a';
				e.style.outlineOffset = '3px';
				e.style.outline = 'white dotted 1px';
			}
		);
		e.addEventListener(
			"mouseleave",
			x =>
			{
				e.style.transitionDuration = '0.5s';
				e.style.backgroundColor = '#fff0';
				e.style.outlineOffset = '0';
				e.style.outline = 'transparent dotted 1px';
			}
		);
	}

	AddPropertyHTML(e_parent, propKey, propVal, depth = 0)
	{
		if (depth > 8) 
		{
			return e_parent;
		}

		const prop_key_span_style = 'style="display:inline-block;min-width:10rem;padding-right:0.75rem;text-align:right;letter-spacing:0.05rem;font-size:0.8rem;line-height:1rem;"';
		const prop_val_span_style = 'style="overflow:hidden;text-align:left;font-weight:normal;font-style:italic;letter-spacing:0.02rem;text-wrap:pretty;opacity:70%;font-size:0.7rem;line-height:1rem;"';

		if (typeof propVal === 'object')
		{
			let e_obj_div = addElement(
				'div', null, e_parent, ' ~ ' + propKey,
				x =>
				{
					x.style.position = 'relative';
					x.style.padding = '0.5rem';
					x.style.border = 'dotted #575757 1px';
				}
			);

			for (let objPropKey in propVal)
			{
				let e_prop = this.AddPropertyHTML(e_obj_div, objPropKey, propVal[objPropKey], depth + 1);
				this.AddHoverHighlightBackground(e_prop);
			}

			return e_obj_div;
		}
		else if (typeof propVal === 'string' && propVal.startsWith('#'))
			return addElement(
				'div', null, e_parent, null,
				x =>
				{
					x.style.color = propVal;
					x.innerHTML = `<span ${prop_key_span_style}>${propKey}</span>${propVal}`;
				}
			);
		else if (propVal === true)
			return addElement(
				'div', null, e_parent, null,
				x =>
				{
					x.style.color = 'lightgreen';
					x.innerHTML = `<span ${prop_key_span_style}>${propKey}</span><span ${prop_val_span_style}>${propVal}</span>`;
				}
			);
		else if (propVal === false)
			return addElement(
				'div', null, e_parent, null,
				x =>
				{
					x.style.color = 'goldenrod';
					x.innerHTML = `<span ${prop_key_span_style}>${propKey}</span><span ${prop_val_span_style}>${propVal}</span>`;
				}
			);
		else
			return addElement(
				'div', null, e_parent, null,
				x =>
				{
					x.innerHTML = `<span ${prop_key_span_style}>${propKey}</span><span ${prop_val_span_style}>${propVal}</span>`;
				}
			);
	}

	onWindowShow() { LocalStorageBrowserWindow.instance = this; }
	onWindowClose() { LocalStorageBrowserWindow.instance = null; }
}

WindowManager.instance.windowTypes.push(
	{
		key: LocalStorageBrowserWindow.window_kind,
		icon: LocalStorageBrowserWindow.window_icon,
		model: (x, y) => { return new LocalStorageBrowserWindow(x, y); },
		shortcutKey: ';'
	}
);