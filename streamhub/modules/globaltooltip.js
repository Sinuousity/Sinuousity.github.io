import { addElement } from "../hubscript.js";

console.info("[ +Module ] Global Tooltip");

export class GlobalTooltipReceiver
{
	constructor(element = null, label = "", longLabel = "")
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

	IsValid()
	{
		if (!this.element) return false;
		if (!this.element.remove) return false;
		return true;
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

	static timeoutId_showMoreTimer = -1;

	static CleanHoveredList()
	{
		let invalidSourceIndices = [];
		for (var ii = 0; ii < GlobalTooltip.hovered.length; ii++)
		{
			const sourceId = ii;
			if (GlobalTooltip.hovered[sourceId].IsValid()) continue;
			invalidSourceIndices.push(sourceId);
		}

		for (var ii = invalidSourceIndices.length - 1; ii > -1; ii--)
		{
			const invalidSourceId = ii;
			const targetId = invalidSourceIndices[invalidSourceId];
			GlobalTooltip.hovered[targetId].RemoveEventListeners();
			GlobalTooltip.hovered.splice(targetId, 1);
		}

		if (invalidSourceIndices.length > 0)
			console.log("global tooltip :: hover targets cleaned : " + invalidSourceIndices.length + " invalid");
	}

	static visibilityCheckTimeoutId = -1;
	static CheckVisibilityDelayed()
	{
		if (GlobalTooltip.visibilityCheckTimeoutId != -1) window.clearTimeout(GlobalTooltip.visibilityCheckTimeoutId);
		GlobalTooltip.visibilityCheckTimeoutId = window.setTimeout(
			() =>
			{
				GlobalTooltip.CheckVisibility();
				GlobalTooltip.visibilityCheckTimeoutId = -1;
			},
			33
		);
	}

	static CheckVisibility()
	{
		if (GlobalTooltip.hovered.length > 0)
		{
			GlobalTooltip.Show();
		}
		else if (GlobalTooltip.showing)
		{
			GlobalTooltip.e_tooltip_root.style.transitionProperty = "opacity";
			GlobalTooltip.Hide();
		}
	}

	static StartHover(receiver)
	{
		var id = GlobalTooltip.hovered.indexOf(receiver);
		if (id == -1) GlobalTooltip.hovered.push(receiver);
		GlobalTooltip.JumpTo(receiver);
		GlobalTooltip.CheckVisibilityDelayed();
	}

	static EndHover(receiver)
	{
		var id = GlobalTooltip.hovered.indexOf(receiver);
		if (id > -1) GlobalTooltip.hovered.splice(id, 1);
		GlobalTooltip.CheckVisibilityDelayed();
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
		GlobalTooltip.e_tooltip_root.style.maxWidth = "21rem";
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
		if (!element) return;

		var receiverIndex = GlobalTooltip.hovered.findIndex(x => { return x.element === element; });
		if (receiverIndex == -1) return;

		GlobalTooltip.hovered[receiverIndex].RemoveEventListeners();
		GlobalTooltip.hovered.splice(receiverIndex, 1);
		GlobalTooltip.CheckVisibility();
	}

	static Show()
	{
		if (GlobalTooltip.timeoutId_showMoreTimer != -1)
		{
			window.clearTimeout(GlobalTooltip.timeoutId_showMoreTimer);
			GlobalTooltip.timeoutId_showMoreTimer = -1;
		}

		const hoveredTop = GlobalTooltip.hovered[GlobalTooltip.hovered.length - 1];
		const longLabel = hoveredTop.longLabel;
		if (typeof longLabel == 'string' && longLabel != "")
		{
			GlobalTooltip.timeoutId_showMoreTimer = window.setTimeout(
				() =>
				{
					GlobalTooltip.e_tooltip_label.innerHTML = longLabel;
					GlobalTooltip.timeoutId_showMoreTimer = -1;
				},
				1500
			);
		}

		if (GlobalTooltip.showing) return;
		GlobalTooltip.showing = true;

		GlobalTooltip.e_tooltip_root.style.opacity = 1.0;
	}

	static Hide()
	{
		if (!GlobalTooltip.showing) return;
		GlobalTooltip.showing = false;

		if (GlobalTooltip.timeoutId_showMoreTimer != -1) window.clearTimeout(GlobalTooltip.timeoutId_showMoreTimer);
		GlobalTooltip.e_tooltip_root.style.opacity = 0.0;
	}

	static JumpTo(receiver = GlobalTooltipReceiver.Default)
	{
		if (typeof receiver.label === 'string')
			GlobalTooltip.e_tooltip_label.innerHTML = receiver.label;
		else
			GlobalTooltip.e_tooltip_label.innerHTML = receiver.label();

		var e_rect = receiver.element.getBoundingClientRect();
		var e_rect_mid_x = e_rect.x + e_rect.width * 0.5;
		var e_rect_mid_y = e_rect.y + e_rect.height * 0.5;

		var x = e_rect_mid_x;

		if (e_rect_mid_y > (window.innerHeight * 0.5)) // bottom side
		{
			var y = window.innerHeight - e_rect_mid_y + e_rect.height * 0.5;
			GlobalTooltip.e_tooltip_root.style.top = "unset";
			GlobalTooltip.e_tooltip_root.style.bottom = y + "px";
		}
		else // top side
		{
			var y = e_rect_mid_y + e_rect.height * 0.5;
			GlobalTooltip.e_tooltip_root.style.top = y + "px";
			GlobalTooltip.e_tooltip_root.style.bottom = "unset";
		}

		if (e_rect_mid_x > (window.innerWidth * 0.5)) // right side
		{
			GlobalTooltip.e_tooltip_root.style.left = "unset";
			GlobalTooltip.e_tooltip_root.style.right = "var(--mouse-x-neg)";
		}
		else // left side
		{
			GlobalTooltip.e_tooltip_root.style.left = "var(--mouse-x)";
			GlobalTooltip.e_tooltip_root.style.right = "unset";
		}

		e_rect_mid_y += e_rect.height * 0.5;

		var tooltip_rect = GlobalTooltip.e_tooltip_root.getBoundingClientRect();
		var halfWidth = tooltip_rect.width * 0.5;
		var leftX = tooltip_rect.x;
		var rightX = tooltip_rect.x + tooltip_rect.width;
		var maxX = window.innerWidth - 16;
		if (leftX <= 16) 
		{
			GlobalTooltip.e_tooltip_root.style.left = (16 + halfWidth) + "px";
		}
		else if (rightX >= maxX) 
		{
			GlobalTooltip.e_tooltip_root.style.left = (maxX - halfWidth) + "px";
		}

		GlobalTooltip.CheckVisibility();
		GlobalTooltip.e_tooltip_root.style.transitionProperty = "opacity, top, bottom, left";
	}
}



GlobalTooltip.CreateElements();