import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] Debug Window");

export class DebugWindow extends DraggableWindow
{
	static window_kind = "hidden:Debug";
	static instance = null;

	constructor(pos_x, pos_y)
	{
		super("Debug", pos_x, pos_y);
		this.e_window_root.style.minHeight = "180px";
		this.e_window_root.style.minWidth = "320px";
		this.SetTitle("Debug");
		this.SetIcon("assignment_late");
		this.window_kind = DebugWindow.window_kind;
		this.CreateContentContainer();
		this.e_content.style.fontSize = "0.8rem";
		this.e_content.style.color = "white";
		this.e_content.style.backgroundColor = "#000000f0";
		this.e_content.style.overflowX = "hidden";
		this.e_content.style.overflowY = "auto";
		this.e_content.style.textOverflow = "ellipsis";
		this.e_content.style.textWrap = "pretty";
		this.e_content.style.width = "100%";

		console.info = this.proxy(console, console.info);
		console.log = this.proxy(console, console.log);
		console.warn = this.proxy(console, console.warn);
		console.error = this.proxy(console, console.error);
	}

	onWindowShow() { DebugWindow.instance = this; }
	onWindowClose() { DebugWindow.instance = null; }

	proxy(context, method)
	{
		const style_log_ts = `style='font-size:0.625rem;padding-right:0.36rem;color:#fff9;'`;
		const style_log_prop_name = `style='color:orange;'`;
		const style_log_prop_val = `style='color:cyan;'`;

		return function ()
		{
			let msgparts = [].concat(Array.prototype.slice.apply(arguments));
			for (let ii = 0; ii < msgparts.length; ii++)
			{
				if (typeof msgparts[ii] === 'object')
				{
					let o = msgparts[ii];
					msgparts[ii] = o.name ? `${o.name}: <br>` : ' <br>';
					for (let propName in o)
					{
						msgparts[ii] += `-- <span ${style_log_prop_name}>${propName}</span>: <span ${style_log_prop_val}>${o[propName]}</span> <br>`;
					}
				}
			}
			if (DebugWindow.instance != null)
			{
				let prevContent = DebugWindow.instance.e_content.innerHTML;
				DebugWindow.instance.e_content.innerHTML = `<span ${style_log_ts}> ${new Date().toLocaleTimeString('en-US')}</span> `;
				DebugWindow.instance.e_content.innerHTML += msgparts.join(' ') + "<br>";
				DebugWindow.instance.e_content.innerHTML += prevContent + "<br>";
			}
			method.apply(context, msgparts);
		}
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: DebugWindow.window_kind,
		icon: "assignment_late",
		icon_color: 'red',
		model: (x, y) => { return new DebugWindow(x, y); }
	}
);