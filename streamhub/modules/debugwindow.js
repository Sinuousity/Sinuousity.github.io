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
		this.e_content.style.textWrap = "nowrap";
		this.e_content.style.wordWrap = "break-word";
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
		return function ()
		{
			var fullMessage = [].concat(Array.prototype.slice.apply(arguments));
			if (DebugWindow.instance != null)
			{
				DebugWindow.instance.e_content.innerHTML += `<span style='font-size:0.6rem;padding-right:0.5rem;'>${new Date().toLocaleTimeString('en-US')}</span>`;
				DebugWindow.instance.e_content.innerHTML += fullMessage.join(' ') + "<br>";
			}
			method.apply(context, fullMessage);
		}
	}
}

WindowManager.instance.windowTypes.push({ key: DebugWindow.window_kind, icon: "assignment_late", model: (x, y) => { return new DebugWindow(x, y); } });