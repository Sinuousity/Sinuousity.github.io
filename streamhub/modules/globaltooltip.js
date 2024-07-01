import { addElement } from "../hubscript.js";

console.info("[ +Module ] Global Tooltip");

export class GlobalTooltipReceiver
{
	constructor(element = {}, label = "", longLabel = "")
	{
		this.element = element;
		this.label = label;
		this.longLabel = longLabel;
		if (!this.element) return;

		this.startHover = e => { GlobalTooltip.StartHover(this); e.stopPropagation(); };
		this.endHover = e => { GlobalTooltip.EndHover(this); e.stopPropagation(); };

		this.element.addEventListener("mouseover", e => { this.startHover(e); });
		this.element.addEventListener("mouseleave", e => { this.endHover(e); });
	}

	RemoveEventListeners()
	{
		if (!this.element) return;
		this.element.removeEventListener("mouseover", e => { this.startHover(e); });
		this.element.removeEventListener("mouseleave", e => { this.endHover(e); });
	}

	static Default = new GlobalTooltipReceiver(null, "", "");
}

export class GlobalTooltip
{
	static hovered = [];

	static showing = false;

	static e_tooltip_root;
	static e_tooltip_fill;
	static e_tooltip_arrow;
	static e_tooltip_label;

	static timeoutId_showTimer = -1;
	static timeoutId_showMoreTimer = -1;

	static CleanHoveredList()
	{
		GlobalTooltip.hovered = GlobalTooltip.hovered.filter(x => x != null && x.element.remove);
		GlobalTooltip.CheckVisibility();
	}

	static CheckVisibility()
	{
		if (GlobalTooltip.showing && GlobalTooltip.hovered.length < 1) 
		{
			GlobalTooltip.hovered = [];
			GlobalTooltip.e_tooltip_root.style.transitionProperty = "opacity";
			GlobalTooltip.Hide();
		}
		else if (!GlobalTooltip.showing && GlobalTooltip.hovered.length > 0)
		{
			GlobalTooltip.Show();
		}
	}

	static StartHover(receiver = GlobalTooltipReceiver.Default)
	{
		var id = GlobalTooltip.hovered.indexOf(receiver);
		if (id < 0) GlobalTooltip.hovered.push(receiver);
		GlobalTooltip.JumpTo(receiver);
		GlobalTooltip.CleanHoveredList();
	}

	static EndHover(receiver = GlobalTooltipReceiver.Default)
	{
		if (!GlobalTooltip.showing) return;

		var id = GlobalTooltip.hovered.indexOf(receiver);
		if (id > -1) GlobalTooltip.hovered.splice(id, 1);

		GlobalTooltip.CleanHoveredList();
	}

	static CreateElements()
	{
		GlobalTooltip.e_tooltip_root = addElement("div", "global-tooltip-root", document.body);
		GlobalTooltip.e_tooltip_root.draggable = false;
		GlobalTooltip.e_tooltip_root.style.userSelect = "none";
		GlobalTooltip.e_tooltip_root.style.opacity = "0.0";
		GlobalTooltip.e_tooltip_root.style.pointerEvents = "none";
		GlobalTooltip.e_tooltip_root.style.zIndex = "100000";
		GlobalTooltip.e_tooltip_root.style.minHeight = "1rem";
		GlobalTooltip.e_tooltip_root.style.minWidth = "1rem";
		GlobalTooltip.e_tooltip_root.style.backgroundColor = "#00000080";
		GlobalTooltip.e_tooltip_root.style.color = "#ffffff";
		GlobalTooltip.e_tooltip_root.style.position = "fixed";
		GlobalTooltip.e_tooltip_root.style.borderRadius = "0.25rem";
		GlobalTooltip.e_tooltip_root.style.fontSize = "0.8rem";
		GlobalTooltip.e_tooltip_root.style.top = "0px";
		GlobalTooltip.e_tooltip_root.style.left = "0px";
		GlobalTooltip.e_tooltip_root.style.padding = "0.5rem";
		GlobalTooltip.e_tooltip_root.style.transform = "translate(-50%,0%)";
		GlobalTooltip.e_tooltip_root.style.transitionProperty = "opacity";
		GlobalTooltip.e_tooltip_root.style.transitionDuration = "0.15s";
		GlobalTooltip.e_tooltip_root.style.transitionTimingFunction = "ease-in-out";

		GlobalTooltip.e_tooltip_fill = addElement("div", "global-tooltip-fill", GlobalTooltip.e_tooltip_root);
		GlobalTooltip.e_tooltip_label = addElement("div", "global-tooltip-label", GlobalTooltip.e_tooltip_root);
	}

	static RegisterReceiver(element, label, longLabel)
	{
		return new GlobalTooltipReceiver(element, label, longLabel);
	}

	static ReleaseAllReceivers(rootElement)
	{
		if (rootElement == null) return;

		GlobalTooltip.ReleaseReceiver(rootElement);
		for (var childIndex in rootElement.children)
		{
			GlobalTooltip.ReleaseAllReceivers(rootElement.children[childIndex]);
		}
	}

	static ReleaseReceiver(element)
	{
		if (element == null) return;

		var receiver = GlobalTooltip.hovered.find(x => { return x.element === element; });
		if (receiver == null) return;

		receiver.RemoveEventListeners();
		var receiverIndex = GlobalTooltip.hovered.indexOf(receiver);
		if (receiverIndex > -1) GlobalTooltip.hovered.splice(receiverIndex, 1);
	}

	static Show()
	{
		if (GlobalTooltip.showing) return;
		GlobalTooltip.showing = true;

		GlobalTooltip.e_tooltip_root.style.opacity = 1.0;

		GlobalTooltip.timeoutId_showMoreTimer = window.setTimeout(
			() =>
			{
				GlobalTooltip.e_tooltip_label.innerText = GlobalTooltip.hovered[GlobalTooltip.hovered.length - 1].longLabel;
				GlobalTooltip.timeoutId_showMoreTimer = -1;
			},
			1500
		);
	}

	static Hide()
	{
		if (!GlobalTooltip.showing) return;
		GlobalTooltip.showing = false;

		if (GlobalTooltip.timeoutId_showMoreTimer != -1) window.clearTimeout(GlobalTooltip.timeoutId_showMoreTimer);
		if (GlobalTooltip.timeoutId_showTimer != -1) window.clearTimeout(GlobalTooltip.timeoutId_showTimer);
		GlobalTooltip.e_tooltip_root.style.opacity = 0.0;
	}

	static JumpTo(receiver = GlobalTooltipReceiver.Default)
	{
		GlobalTooltip.e_tooltip_label.innerText = receiver.label;

		var e_rect = receiver.element.getBoundingClientRect();
		var e_rect_mid_x = e_rect.x + e_rect.width * 0.5;
		var e_rect_mid_y = e_rect.y + e_rect.height * 0.5;

		var x = e_rect_mid_x;
		GlobalTooltip.e_tooltip_root.style.left = x + "px";

		if (e_rect_mid_y > (window.innerHeight * 0.5))
		{
			var y = window.innerHeight - e_rect_mid_y + e_rect.height * 0.5;
			GlobalTooltip.e_tooltip_root.style.top = "unset";
			GlobalTooltip.e_tooltip_root.style.bottom = y + "px";
		}
		else
		{
			var y = e_rect_mid_y + e_rect.height * 0.5;
			GlobalTooltip.e_tooltip_root.style.bottom = "unset";
			GlobalTooltip.e_tooltip_root.style.top = y + "px";
		}

		e_rect_mid_y += e_rect.height * 0.5;

		GlobalTooltip.Show();
		GlobalTooltip.e_tooltip_root.style.transitionProperty = "opacity, top, bottom, left";
	}
}



GlobalTooltip.CreateElements();

window.setInterval(() => { GlobalTooltip.CleanHoveredList(); }, 1234);