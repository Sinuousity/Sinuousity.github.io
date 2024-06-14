import { WindowManager } from "./windowmanager.js";
import { EventSource } from "./eventsource.js";
import { ChatWindow } from "./windows.js";

console.info("Module Added: Chat Collector");

export class MultiChatMessage
{
	constructor(username, message, source = "unknown", color = "white")
	{
		this.source = source;
		this.username = username;
		this.message = message;
		this.color = color;
	}
}

export class ChatCollector
{
	static instance = new ChatCollector();
	static messages = [];
	static onMessageReceived = new EventSource();

	static Append(username, message, source = "unknown", color = "white")
	{
		var m = new MultiChatMessage(username, message, source, color);
		ChatCollector.messages.push(m);
		ChatCollector.onMessageReceived.Invoke(m);
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

		this.newMessageSubscription = {};
	}

	onWindowShow()
	{
		this.newMessageSubscription = ChatCollector.onMessageReceived.RequestSubscription((m) => { this.AppendMessageElement(m); });
	};

	onWindowClose()
	{
		ChatCollector.onMessageReceived.RemoveSubscription(this.newMessageSubscription);
	};

	AppendMessageElement(m)
	{
		if (m.message == null || m.message.length < 1) return;

		var sourceColor = "white";
		switch (m.source)
		{
			case "twitch": sourceColor = "purple"; break;
			case "kick": sourceColor = "green"; break;
		}

		var e_msg = document.createElement("div");
		e_msg.className = "window-content-chat";
		e_msg.innerHTML += "<i style='color:" + sourceColor + "'>" + m.source + "</i>";
		e_msg.innerHTML += "<span style='color:" + m.color + "'>" + m.username + "</span>";
		e_msg.innerHTML += m.message;
		this.e_chat_root.appendChild(e_msg);

		if (this.e_chat_root.children.length > 50) this.e_chat_root.children[0].remove();
	}
}

WindowManager.instance.windowTypes.push({ key: "MultiChat", icon: "people", model: (x, y) => { return new MultiChatWindow(x, y); } });