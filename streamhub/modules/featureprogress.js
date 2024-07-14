import { addElement } from "../hubscript.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] Feature Progress");

export class FeatureProgress
{
	static data = { message: "", features: [] };
	static Load()
	{
		fetch(
			"./files/featureprogress.json",
			{
				method: "GET",
				cache: "default",
			}
		).then(
			async x =>
			{
				let y = await x.text();
				return y;
			}
		).then(
			x =>
			{
				FeatureProgress.data = JSON.parse(x);
			}
		);
	}
}

export class FeatureProgressWindow extends DraggableWindow
{
	static windowKind = "Feature Progress";

	constructor(pos_x, pos_y)
	{
		super(FeatureProgressWindow.windowKind, pos_x, pos_y);

		this.window_kind = FeatureProgressWindow.windowKind;

		this.SetIcon("assignment_turned_in");
		this.SetTitle(FeatureProgressWindow.windowKind);
		this.CreateContentContainer();
		this.CreateControlsColumn();

		window.setTimeout(() => { this.RefreshContent(); }, 55);
	}

	RefreshContent()
	{
		for (var ii = 0; ii < FeatureProgress.data.features.length; ii++)
		{
			let feature = FeatureProgress.data.features[ii];
			let e_feature = this.AddSectionTitle(feature.name);
			e_feature.style.color = "orange";
			e_feature.style.flexShrink = "0";
			e_feature.style.flexGrow = "0";
			e_feature.style.marginTop = "0.25rem";
			e_feature.style.textWrap = "nowrap";
			e_feature.style.overflow = "hidden";
			e_feature.style.textOverflow = "ellipsis";
			e_feature.style.wordBreak = "break-all";

			for (var jj = 0; jj < feature.goals.length; jj++)
			{
				let goal = feature.goals[jj];
				let e_goal = this.AddSectionTitle(goal.name);
				if (goal.comment) GlobalTooltip.RegisterReceiver(e_goal, goal.comment, null);
				e_goal.style.color = (goal.progress >= 1.0) ? "#1f1" : (goal.progress >= 0.1) ? "yellow" : ((goal.blocked === true) ? "red" : "gray");
				e_goal.style.border = "none";
				e_goal.style.opacity = "0.5";
				e_goal.style.flexShrink = "0";
				e_goal.style.flexGrow = "0";
				e_goal.style.fontSize = "0.8rem";
				e_goal.style.fontWeight = "normal";
				e_goal.style.height = "1.2rem";
				e_goal.style.lineHeight = "1.2rem";
				e_goal.style.margin = "0";
				e_goal.style.right = "0";
				e_goal.style.textWrap = "nowrap";
				e_goal.style.overflow = "hidden";
				e_goal.style.textOverflow = "ellipsis";
				e_goal.style.wordBreak = "break-all";
				e_goal.style.transitionProperty = "background-color, opacity";
				e_goal.style.transitionDuration = "0.1s";
				e_goal.style.transitionTimingFunction = "ease-in-out";

				let progA = Math.round(goal.progress * 100);
				let progB = progA + 1;
				e_goal.style.background = `linear-gradient(90deg, #0f02 ${progA}%, transparent ${progB}%)`;
				e_goal.addEventListener(
					"mouseenter",
					e =>
					{
						e_goal.style.opacity = "1.0";
						e_goal.style.backgroundColor = "#fff1";
						e_goal.style.fontWeight = "bold";
					}
				);
				e_goal.addEventListener(
					"mouseleave",
					e =>
					{
						e_goal.style.opacity = "0.5";
						e_goal.style.backgroundColor = "#fff0";
						e_goal.style.fontWeight = "normal";
					}
				);

				if (goal.blocked === true)
				{
					let e_planned_label = addElement("div", "", e_goal);
					e_planned_label.style.fontSize = "0.6rem";
					e_planned_label.style.position = "absolute";
					e_planned_label.style.right = "0.5rem";
					e_planned_label.style.top = "0";
					e_planned_label.style.bottom = "0";
					e_planned_label.innerText = "BLOCKED";
				}
				else if (goal.progress <= 0.0)
				{
					let e_planned_label = addElement("div", "", e_goal);
					e_planned_label.style.fontSize = "0.6rem";
					e_planned_label.style.position = "absolute";
					e_planned_label.style.right = "0.5rem";
					e_planned_label.style.top = "0";
					e_planned_label.style.bottom = "0";
					e_planned_label.innerText = "PLANNED";
				}
				else if (goal.progress < 1.0)
				{
					let e_planned_label = addElement("div", "", e_goal);
					e_planned_label.style.fontSize = "0.6rem";
					e_planned_label.style.position = "absolute";
					e_planned_label.style.right = "0.5rem";
					e_planned_label.style.top = "0";
					e_planned_label.style.bottom = "0";
					if (goal.progress < 0.2) e_planned_label.innerText = "STARTED";
					else if (goal.progress < 0.8) e_planned_label.innerText = "IN PROGRESS";
					else e_planned_label.innerText = "ALMOST DONE";
				}
				else
				{
					let e_planned_label = addElement("div", "", e_goal);
					e_planned_label.style.fontSize = "0.6rem";
					e_planned_label.style.position = "absolute";
					e_planned_label.style.right = "0.5rem";
					e_planned_label.style.top = "0";
					e_planned_label.style.bottom = "0";
					e_planned_label.innerText = "DONE";
				}
			}
		}
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: FeatureProgressWindow.windowKind,
		icon: "assignment_turned_in",
		desc: "See what has been completed and what is planned!",
		model: (x, y) => { return new FeatureProgressWindow(x, y); },
		wip: true,
		shortcutKey: 'p'
	}
);

FeatureProgress.Load();