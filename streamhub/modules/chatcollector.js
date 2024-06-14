import { WindowManager } from "./windowmanager.js";
import { ChatWindow } from "./windows.js";

console.info("Module Added: Chat Collector");

export class ChatCollector
{
	static instance = new ChatCollector();
	static messages = [];
	static messageReceivers = [];

	static Append(username, message, source = "unknown", color = "white")
	{
		ChatCollector.messages.push(
			{
				source: source,
				username: username,
				message: message,
				color: color
			}
		);

		for (var ii = 0; ii < ChatCollector.messageReceivers.length; ii++)
		{
			var recv = ChatCollector.messageReceivers[ii];
			if (recv == null) continue;
			if (!recv.AppendMessageElement) continue;
			recv.AppendMessageElement(username, message, source, color);
		}
	}
}



export class MultiChatWindow extends ChatWindow
{
	constructor(pos_x, pos_y)
	{
		super("MultiChat", pos_x, pos_y);
		super.window_kind = "MultiChat";

		this.CreateContentContainer();

		this.e_chat_root = document.createElement("div");
		this.e_chat_root.className = "window-content-chat-container";
		this.e_content.appendChild(this.e_chat_root);

		this.SetTitle("MultiChat");
		this.SetIcon("people");
	}

	onWindowShow()
	{
		ChatCollector.messageReceivers.push(this);
	};

	onWindowClose()
	{
		var indexOf = ChatCollector.messageReceivers.indexOf(this);
		if (indexOf >= 0) ChatCollector.messageReceivers.splice(indexOf, 1);
	};

	HookMessageEvents()
	{
		ChatCollector.eventTarget.addEventListener("newchatmessage", e => { this.AppendMessageElement(e.username, e.message, e.source, e.color); });
	}

	UnHookMessageEvents()
	{
		ChatCollector.eventTarget.removeEventListener("newchatmessage", e => { this.AppendMessageElement(e.username, e.message, e.source, e.color); });
	}

	AppendMessageElement(username, message, source, color)
	{
		if (message == null || message.length < 1) return;

		var sourceColor = "white";
		switch (source)
		{
			case "twitch": sourceColor = "purple"; break;
			case "kick": sourceColor = "green"; break;
		}

		var e_msg = document.createElement("div");
		e_msg.className = "window-content-chat";
		e_msg.innerHTML += "<i style='color:" + sourceColor + "'>" + source + "</i>";
		e_msg.innerHTML += "<span style='color:" + color + "'>" + username + "</span>";
		e_msg.innerHTML += message;
		this.e_chat_root.appendChild(e_msg);

		if (this.e_chat_root.children.length > 50) this.e_chat_root.children[0].remove();
	}
}

WindowManager.instance.windowTypes.push({ key: "MultiChat", icon: "people", model: (x, y) => { return new MultiChatWindow(x, y); } });