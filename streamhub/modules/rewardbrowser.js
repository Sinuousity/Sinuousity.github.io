import { addElement } from "../hubscript.js";
import { Rewards } from "./rewards.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] Reward Browser Window");

export class RewardBrowserWindow extends DraggableWindow
{
	static window_kind = "Reward Browser";
	static window_title = "Reward Browser";
	static window_icon = 'grade';
	static instance = null;

	constructor(pos_x, pos_y)
	{
		super(RewardBrowserWindow.window_title, pos_x, pos_y);
		this.e_window_root.style.minHeight = "12rem";
		this.e_window_root.style.minWidth = "20rem";
		this.SetTitle(RewardBrowserWindow.window_title);
		this.SetIcon(RewardBrowserWindow.window_icon);
		this.window_kind = RewardBrowserWindow.window_kind;
		this.CreateContentContainer();
		this.e_content.style.fontSize = "0.8rem";
		this.e_content.style.color = "white";
		this.e_content.style.backgroundColor = "#000000f0";
		this.e_content.style.overflowX = "hidden";
		this.e_content.style.overflowY = "hidden";
		this.e_content.style.textOverflow = "ellipsis";
		this.e_content.style.textWrap = "nowrap";
		this.e_content.style.width = "100%";

		this.e_browser_view = addElement(
			'div', null, this.e_content, null,
			x =>
			{
				x.style.position = 'absolute';
				x.style.inset = '0 0 0 0';
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
		for (var rewardId in Rewards.kinds)
		{
			this.AddListItem(Rewards.kinds[rewardId]);
		}
	}

	AddListItem(reward)
	{
		let e_list_item_row = addElement(
			'div', null, this.e_browser_view, null,
			x =>
			{
				x.style.display = 'flex';
				x.style.flexDirection = 'row';
				x.style.height = '1.7rem';
				x.style.lineHeight = '1.7rem';
				x.style.borderBottom = 'dashed #575757 1px';
				x.style.paddingTop = '0.1rem';
				x.style.paddingBottom = '0.1rem';
				x.style.color = 'white';
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

				x.innerText = reward.name;
			}
		);

		if (reward.description)
			addElement(
				'div', null, e_list_item_row, null,
				x =>
				{
					x.style.position = 'relative';
					x.style.textAlign = 'left';
					x.style.width = '1rem';
					x.style.minWidth = '0';
					x.style.flexShrink = '0.0';
					x.style.flexGrow = '1.0';
					x.style.marginLeft = '0.5rem';

					x.style.fontSize = '0.7rem';
					x.style.color = 'gray';

					x.style.overflow = 'hidden';
					x.style.textWrap = 'nowrap';
					x.style.wordWrap = 'break-word';
					x.style.textOverflow = 'ellipsis';
					x.style.overflowWrap = 'anywhere';
					x.style.whiteSpace = 'nowrap';

					x.innerText = reward.description;
				}
			);
	}

	onWindowShow() { RewardBrowserWindow.instance = this; }
	onWindowClose() { RewardBrowserWindow.instance = null; }
}

WindowManager.instance.windowTypes.push(
	{
		key: RewardBrowserWindow.window_kind,
		icon: RewardBrowserWindow.window_icon,
		icon_color: 'yellow',
		desc: "View all the types of rewards viewers can earn.",
		model: (x, y) => { return new RewardBrowserWindow(x, y); },
		shortcutKey: 'g'
	}
);