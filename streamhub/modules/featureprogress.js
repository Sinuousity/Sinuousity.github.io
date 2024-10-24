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

		this.e_label_version = addElement("div", null, this.e_content);
		this.e_label_version.style.height = "1.25rem";
		this.e_label_version.style.lineHeight = "1.25rem";
		this.e_label_version.style.fontSize = "0.9rem";
		this.e_label_version.style.textAlign = "center";
		this.e_label_version.style.letterSpacing = "0.1rem";
		this.e_label_version.style.textOverflow = "ellipsis";
		this.e_label_version.innerText = "StreamHub " + hub_version;

		this.e_label_updateDate = addElement("div", null, this.e_content);
		this.e_label_updateDate.style.height = "1rem";
		this.e_label_updateDate.style.lineHeight = "1rem";
		this.e_label_updateDate.style.fontSize = "0.6rem";
		this.e_label_updateDate.style.textAlign = "center";
		this.e_label_updateDate.style.letterSpacing = "0.05rem";
		this.e_label_updateDate.style.textOverflow = "ellipsis";
		this.e_label_updateDate.innerHTML = "<span style='color:#fff4'>Last Updated</span> " + last_update_date;

		this.e_label_updateLog = addElement("div", null, this.e_content);
		this.e_label_updateLog.style.height = "1rem";
		this.e_label_updateLog.style.lineHeight = "1rem";
		this.e_label_updateLog.style.fontSize = "0.6rem";
		this.e_label_updateLog.style.textAlign = "center";
		this.e_label_updateLog.style.letterSpacing = "0.05rem";
		this.e_label_updateLog.style.textOverflow = "ellipsis";
		this.e_label_updateLog.style.transitionProperty = "border-bottom";
		this.e_label_updateLog.style.transitionDelay = "0.1s";
		this.e_label_updateLog.style.transitionDuration = "0.3s";
		this.e_label_updateLog.style.transitionTimingFunction = "ease-in-out";
		this.e_label_updateLog.innerHTML = "<a target='_blank' href='https://github.com/Sinuousity/Sinuousity.github.io/activity'>GitHub Changelog</a>";
		this.e_label_updateLog_tip = GlobalTooltip.RegisterReceiver(this.e_label_updateLog, "Click to view the change log directly in GitHub");

		this.CreateControlsColumn(true);
		this.e_controls_column.style.left = "0";
		this.e_controls_column.style.right = "0";
		this.e_controls_column.style.scrollBehavior = "smooth";
		this.e_controls_column.addEventListener(
			"scroll",
			e =>
			{
				if (this.e_controls_column.scrollTop >= 1) this.e_label_updateLog.style.borderBottom = "solid #575757ff 2px";
				else this.e_label_updateLog.style.borderBottom = "solid #57575700 2px";
			}
		);

		this.e_issue_area = addElement(
			'div', null, this.e_content, null,
			x => 
			{
				x.innerHTML = '<span style="color:red;">See something broken?</span><br>If you have a GitHub account, or are willing to make one, you can <a href="https://github.com/Sinuousity/Sinuousity.github.io/issues" target="_blank">submit an issue on the repo</a>.';
				x.style.alignContent = 'center';
				x.style.paddingLeft = '0.5rem';
				x.style.paddingRight = '0.5rem';
				x.style.letterSpacing = '0.05rem';
				x.style.fontSize = '0.8rem';
				x.style.lineHeight = '1.05rem';
				x.style.textAlign = 'center';
				x.style.height = '4rem';
				x.style.flexShrink = '0';
				x.style.borderTop = 'solid #575757 2px';
			}

		);
		this.tip_issue_area = GlobalTooltip.RegisterReceiver(this.e_issue_area, "Click to view or submit issues on GitHub");


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
			if (feature.desc) GlobalTooltip.RegisterReceiver(e_feature, feature.new === true ? ("<span style='color:#6f6;'>( NEW! )</span> " + feature.desc) : feature.desc, null);

			for (var jj = 0; jj < feature.goals.length; jj++)
			{
				let goal = feature.goals[jj];
				let e_goal = this.AddSectionTitle(goal.name);
				if (goal.comment) 
				{
					if (goal.deprecated === true)
						GlobalTooltip.RegisterReceiver(e_goal, "<span style='color:crimson'>[Feature Removed]</span><br><span style='color:orange'>" + goal.comment + "</span>", null);
					else GlobalTooltip.RegisterReceiver(e_goal, goal.comment, null);
				}

				e_goal.style.color = "gray";
				if (goal.deprecated === true) e_goal.style.color = "dimgray";
				else if (goal.blocked === true) e_goal.style.color = "crimson";
				else e_goal.style.color = (goal.progress >= 1.0) ? (goal.new === true ? "#0f0" : "#9f9") : (goal.progress >= 0.1) ? "yellow" : "gray";

				if (goal.progress > 0.0 && goal.progress < 1.0) e_goal.style.cursor = "progress";
				else if (goal.progress <= 0.0) e_goal.style.cursor = "help";
				else e_goal.style.cursor = "normal";

				e_goal.style.border = "none";
				e_goal.style.textDecoration = goal.deprecated === true ? "line-through" : "unset";
				e_goal.style.opacity = "0.5";
				e_goal.style.flexShrink = "0";
				e_goal.style.flexGrow = "0";
				e_goal.style.fontSize = "0.825rem";
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
					e_goal.style.background = `linear-gradient(90deg, #0f02 ${progA}%, transparent ${progA}%)`;
					if (goal.progress < 1.0)
					{
						const svar_timepctA = 'var(--time-percent-1s)';
						const svar_timepctB = 'var(--time-percent-offset-1s)';
						e_goal.style.background += `, linear-gradient(90deg, #0f00 calc( ${svar_timepctA} - 15% ), #0f02 ${svar_timepctA}, #0f00 ${svar_timepctA})`;
						e_goal.style.background += `, linear-gradient(90deg, #0f00 calc( ${svar_timepctB} - 15% ), #0f02 ${svar_timepctB}, #0f00 ${svar_timepctB})`;
					}
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

				if (goal.new === true)
				{
					let e_new_label = addElement("div", "", e_goal);
					e_new_label.style.fontSize = "0.625rem";
					e_new_label.style.position = "absolute";
					e_new_label.style.right = "20%";
					e_new_label.style.top = "0";
					e_new_label.style.bottom = "0";
					e_new_label.style.color = "#0f0";
					e_new_label.innerHTML = "NEW!";
				}

				let e_planned_label = addElement("div", "", e_goal);
				e_planned_label.style.fontSize = "0.625rem";
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

		var e_bottom_space = addElement("div", null, this.e_controls_column, null, x => x.style.minHeight = '1rem');

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
		icon_color: 'lightgreen',
		desc: "See what has been completed and what is planned!",
		model: (x, y) => { return new FeatureProgressWindow(x, y); },
		sort_order: 1000,
		shortcutKey: 'p'
	}
);

FeatureProgress.Load();