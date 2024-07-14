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

		this.e_window_root.style.minWidth = "360px";
		this.e_window_root.style.minHeight = "8rem";

		this.SetIcon("assignment_turned_in");
		this.SetTitle(FeatureProgressWindow.windowKind);
		this.CreateContentContainer();
		this.e_content.style.display = "flex";
		this.e_content.style.flexDirection = "column";
		this.e_content.style.left = "0";
		this.e_content.style.right = "0";
		this.CreateControlsColumn(true);
		this.e_controls_column.style.left = "0";
		this.e_controls_column.style.right = "0";
		this.e_controls_column.style.scrollBehavior = "smooth";

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
			if (feature.desc) GlobalTooltip.RegisterReceiver(e_feature, feature.desc, null);

			for (var jj = 0; jj < feature.goals.length; jj++)
			{
				let goal = feature.goals[jj];
				let e_goal = this.AddSectionTitle(goal.name);
				if (goal.comment) 
				{
					if (goal.deprecated === true)
						GlobalTooltip.RegisterReceiver(e_goal, "[WILL BE REMOVED] " + goal.comment, null);
					else GlobalTooltip.RegisterReceiver(e_goal, goal.comment, null);
				}

				e_goal.style.color = "gray";
				if (goal.deprecated === true) e_goal.style.color = "dimgray";
				else if (goal.blocked === true) e_goal.style.color = "#f00";
				else e_goal.style.color = (goal.progress >= 1.0) ? "#1f1" : (goal.progress >= 0.1) ? "yellow" : "gray";

				if (goal.progress > 0.0 && goal.progress < 1.0) e_goal.style.cursor = "progress";
				else if (goal.progress <= 0.0) e_goal.style.cursor = "help";
				else e_goal.style.cursor = "normal";

				e_goal.style.border = "none";
				e_goal.style.textDecoration = goal.deprecated === true ? "line-through" : "unset";
				e_goal.style.opacity = "0.5";
				e_goal.style.flexShrink = "0";
				e_goal.style.flexGrow = "0";
				e_goal.style.fontSize = "0.8rem";
				e_goal.style.fontWeight = "normal";
				e_goal.style.height = "1.2rem";
				e_goal.style.lineHeight = "1.2rem";
				e_goal.style.margin = "0";
				e_goal.style.paddingLeft = "1.5rem";
				e_goal.style.paddingRight = "0";
				e_goal.style.right = "0";
				e_goal.style.textWrap = "nowrap";
				e_goal.style.overflow = "hidden";
				e_goal.style.textOverflow = "ellipsis";
				e_goal.style.wordBreak = "break-all";
				e_goal.style.transitionProperty = "opacity, background-color";
				e_goal.style.transitionDuration = "0.1s";
				e_goal.style.transitionDelay = "0s";
				e_goal.style.transitionTimingFunction = "ease-in-out";

				if (goal.deprecated === true)
				{
					e_goal.style.background = `linear-gradient(45deg, #f805 , #320a)`;
				}
				else if (goal.progress > 0.0)
				{
					let progA = Math.round(goal.progress * 100);
					let progB = progA + 1;
					e_goal.style.background = `linear-gradient(90deg, #0f02 ${progA}%, transparent ${progB}%)`;
				}

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
						e_goal.style.fontWeight = "normal";
						e_goal.style.backgroundColor = "#fff0";
					}
				);

				let e_planned_label = addElement("div", "", e_goal);
				e_planned_label.style.fontSize = "0.6rem";
				e_planned_label.style.position = "absolute";
				e_planned_label.style.right = "0.5rem";
				e_planned_label.style.top = "0";
				e_planned_label.style.bottom = "0";

				if (goal.deprecated === true)
				{
					e_planned_label.innerText = "DEPRECATED";
				}
				else if (goal.blocked === true)
				{
					e_planned_label.style.textDecoration = goal.deprecated === true ? "line-through" : "unset";
					e_planned_label.innerText = "BLOCKED";
				}
				else if (goal.progress <= 0.0)
				{
					e_planned_label.innerText = "PLANNED";
				}
				else if (goal.progress < 1.0)
				{
					if (goal.progress < 0.2) e_planned_label.innerText = "STARTED";
					else if (goal.progress < 0.8) e_planned_label.innerText = "IN PROGRESS";
					else if (goal.progress < 0.9) e_planned_label.innerText = "ALMOST DONE";
					else e_planned_label.innerText = "FINAL TOUCHES";
				}
				else
				{
					e_planned_label.innerText = "DONE";
				}
			}
		}

		var e_bottom_space = addElement("div", null, this.e_controls_column);
		e_bottom_space.style.minHeight = "2rem";

		/*
		this.e_developer_info = addElement("div", null, this.e_controls_column);
		this.e_developer_info.style.position = "relative";
		this.e_developer_info.style.left = "0";
		this.e_developer_info.style.right = "0";
		this.e_developer_info.style.height = "8rem";
		this.e_developer_info.style.flexShrink = "0";
		this.e_developer_info.style.borderTop = "solid 2px gray";
		*/
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: FeatureProgressWindow.windowKind,
		icon: "assignment_turned_in",
		desc: "See what has been completed and what is planned!",
		model: (x, y) => { return new FeatureProgressWindow(x, y); },
		shortcutKey: 'p'
	}
);

FeatureProgress.Load();