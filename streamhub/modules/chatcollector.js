import { WindowManager } from "./windowmanager.js";
import { EventSource } from "./eventsource.js";
import { ChatWindow } from "./windows.js";
import { MultiPlatformUserCache } from "./multiplatformuser.js";
import { addElement } from "../hubscript.js";
import { TwitchListener } from "./twitchlistener.js";
import { OptionManager } from "./globalsettings.js";
import { GlobalTooltip } from "./globaltooltip.js";

console.info("[ +Module ] Chat Collector");

export class MultiChatMessage
{
	static default = new MultiChatMessage('nobody', 'nothing', 'nowhere', 'white');

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

	static Append(username, message, source = "unknown", color = "white", broadcastEvents = true)
	{
		MultiPlatformUserCache.GetUser(username, source, true);
		var m = new MultiChatMessage(username, message, source, color);
		ChatCollector.messages.push(m);

		if (broadcastEvents === true) ChatCollector.onMessageReceived.Invoke(m);
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
		this.e_chat_root.style.bottom = "2.5rem";
		this.e_content.appendChild(this.e_chat_root);

		this.e_send_input_root = addElement("div", null, this.e_content);
		this.e_send_input_root.style.flexGrow = "0";
		this.e_send_input_root.style.flexShrink = "0";
		this.e_send_input_root.style.position = "absolute";
		this.e_send_input_root.style.left = "0";
		this.e_send_input_root.style.right = "0";
		this.e_send_input_root.style.bottom = "0";
		this.e_send_input_root.style.height = "2.5rem";
		this.e_send_input_root.style.lineHeight = "2.5rem";
		this.e_send_input_root.style.fontSize = "2rem";
		this.e_send_input_root.style.backgroundColor = "#ffffff09";
		this.e_send_input_root.style.borderRadius = "0";
		this.e_send_input_root.style.borderTop = "solid 2px #555";

		this.e_send_input = addElement("input", null, this.e_send_input_root);
		this.e_send_input.type = "text";
		this.e_send_input.placeholder = "Enter message...";
		this.e_send_input.style.position = "absolute";
		this.e_send_input.style.left = "0";
		this.e_send_input.style.right = "0";
		this.e_send_input.style.top = "0";
		this.e_send_input.style.bottom = "0";
		this.e_send_input.style.borderRadius = "0";
		this.e_send_input.style.border = "none !important";
		this.e_send_input.style.paddingLeft = "0.5rem";
		this.e_send_input.style.fontSize = "0.9rem";
		this.e_send_input.style.fontWeight = "bold";

		this.e_send_btn = addElement("div", null, this.e_send_input_root);
		this.e_send_btn.style.cursor = "pointer";
		this.e_send_btn.style.position = "absolute";
		this.e_send_btn.style.lineHeight = "1.5rem";
		this.e_send_btn.style.right = "0.5rem";
		this.e_send_btn.style.top = "0.5rem";
		this.e_send_btn.style.bottom = "0.5rem";
		this.e_send_btn.style.width = "4rem";
		this.e_send_btn.style.backgroundColor = "#fff1";
		this.e_send_btn.style.borderRadius = "0.2rem";
		this.e_send_btn.style.fontSize = "0.9rem";
		this.e_send_btn.style.letterSpacing = "0.1rem";
		this.e_send_btn.style.textAlign = "center";
		this.e_send_btn.style.color = "#fff4";
		this.e_send_btn.addEventListener(
			"mouseenter",
			e =>
			{
				this.e_send_btn.style.backgroundColor = "#2f28";
				this.e_send_btn.style.color = "#ffff";
			}
		);
		this.e_send_btn.addEventListener(
			"mouseleave",
			e =>
			{
				this.e_send_btn.style.backgroundColor = "#fff1";
				this.e_send_btn.style.color = "#fff4";
			}
		);
		this.e_send_btn.addEventListener(
			"click",
			e =>
			{
				let message = this.e_send_input.value;
				let botUsername = OptionManager.GetOptionValue("twitch.bot.username", "");
				if (botUsername === "") return;
				TwitchListener.instance.SendMessageAsBot(message);
				this.AppendMessageElement({ source: 'Hub', username: botUsername, message: message });
				this.e_send_input.value = '';
			}
		);
		this.e_send_btn.innerText = "SEND";
		GlobalTooltip.RegisterReceiver(this.e_send_btn, "Send A Message", "Send a message to connected chats under your bot's username");

		this.SetTitle("MultiChat");
		this.SetIcon("people");

		this.newMessageSubscription = ChatCollector.onMessageReceived.RequestSubscription((m) => { this.AppendMessageElement(m); });
	}

	onWindowClose()
	{
		super.onWindowClose();
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
		e_msg.draggable = false;
		e_msg.className = "window-content-chat";
		e_msg.innerHTML += "<i draggable=false style='color:" + sourceColor + "'>" + m.source + "</i>";
		e_msg.innerHTML += "<span draggable=false style='color:" + m.color + "'>" + m.username + "</span>";
		e_msg.innerHTML += m.message;
		this.e_chat_root.appendChild(e_msg);

		if (this.e_chat_root.children.length > 50) this.e_chat_root.children[0].remove();
		this.SetTitle("MultiChat ( " + ChatCollector.messages.length + " )");
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: "MultiChat",
		icon: "people",
		icon_color: 'darkorchid',
		desc: "Combines messages from all sources. You should check here to make sure messages are coming in!",
		model: (x, y) => { return new MultiChatWindow(x, y); },
		sort_order: -10,
		shortcutKey: 'c'
	}
);