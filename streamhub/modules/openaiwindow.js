import { addElement } from "../hubscript.js";
import { ChatCollector, MultiChatMessage } from "./chatcollector.js";
import { EventSource } from "./eventsource.js";
import { OptionManager } from "./globalsettings.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { TwitchListener, TwitchResources } from "./twitchlistener.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] OpenAI Integration Window");

const optkey_openAiKey = 'openai.api.key';
const optkey_useSummary = 'openai.summarize';
const optkey_chatAfterSummary = 'openai.summarize.then.chat';
const optkey_sendGeneratedResponses = 'openai.summarize.send.messages';
const optkey_chatMessageCount = 'openai.reply.to.count';
const optkey_replyToMentions = 'openai.reply.to.mentions';
const optkey_summaryMessageCount = 'openai.summarize.message.count';
const optkey_summaryThreshold = 'openai.summarize.message.threshold';
const optkey_mimicChatStyle = 'openai.mimic.chat';
const optkey_chatPrefix = 'openai.prefix';
const optkey_promptPrefix = 'openai.prompt.prefix';
const optkey_botUserName = "twitch.bot.username";


const url_completions = 'https://api.openai.com/v1/chat/completions';
const header_content_type = 'application/json';
const header_authorization_prefix = 'Bearer ';



export class ChatGPTMessage
{
	constructor(role = 'user', content = 'Hello!')
	{
		this.role = role;
		this.content = content;
	}
}

export class ChatGPTRequest
{
	static default = new ChatGPTRequest(
		'gpt-4o-mini',
		[
			new ChatGPTMessage(
				'system',
				'Respond with the phrase "Integration Success!" followed by a short, interesting, rare fact.'
			)
		]
	);

	constructor(model = 'gpt-4o-mini', messages = [])
	{
		this.model = model;
		this.messages = messages;
	}

	AddMessage(role = 'user', message = 'Hello!')
	{
		this.messages.push(new ChatGPTMessage(role, message));
	}

	InsertMessage(role = 'user', message = 'Hello!', location = 0)
	{
		var msg = new ChatGPTMessage(role, message);
		this.messages.splice(location, 0, msg);
	}
}




export class OpenAIConnection
{
	static instance = null;
	static latestChatMessages = [];
	static latestResponses = [];
	static latestResponse = '';
	static latestSummary = '';

	static sessionTokensInput = 0;
	static sessionTokensOutput = 0;

	static costPerTokenInput = 0.15 / 1_000_000.0;
	static costPerTokenOutput = 0.60 / 1_000_000.0;

	static listening = false;
	static messagesUntilSummary = 1;

	static opt_botUsername = OptionManager.GetOption(optkey_botUserName);
	static opt_summaryThreshold = OptionManager.GetOption(optkey_summaryThreshold);
	static opt_summaryMessageCount = OptionManager.GetOption(optkey_summaryMessageCount);

	static StartListening()
	{
		if (OpenAIConnection.listening) return;
		console.log('OpenAI Connector Ready');
		ChatCollector.onMessageReceived.RequestSubscription(OpenAIConnection.OnNewMessage);
		OpenAIConnection.listening = true;

		//let minMessageCount = Math.max(opt_summaryThreshold.value, opt_summaryMessageCount.value);
		OpenAIConnection.messagesUntilSummary = Math.max(1, OptionManager.GetOptionValue(optkey_summaryThreshold, 30));
		if (OpenAIWindow.instance) OpenAIWindow.instance.UpdateProgressLabel();
	}

	static StopListening()
	{
		if (!OpenAIConnection.listening) return;
		console.log('OpenAI Connector Stopped Listening To Chat');
		ChatCollector.onMessageReceived.RemoveSubscription(OpenAIConnection.OnNewMessage);
		OpenAIConnection.listening = false;
	}

	static OnNewMessage(msg)
	{
		const opt_useSummary = OptionManager.GetOption(optkey_useSummary);
		const opt_botUserName = OptionManager.GetOption(optkey_botUserName);

		//let minMessageCount = Math.max(opt_summaryThreshold.value, opt_summaryMessageCount.value);

		OpenAIConnection.RegisterSummaryMessage(msg);
		OpenAIConnection.messagesUntilSummary--;

		if (OpenAIConnection.messagesUntilSummary < 1) // ready to generate summary
		{
			if (opt_useSummary.value === true) OpenAIConnection.RequestSummary();
			OpenAIConnection.messagesUntilSummary = Math.max(1, OptionManager.GetOptionValue(optkey_summaryThreshold, 30));
		}

		if (OptionManager.GetOptionValue(optkey_replyToMentions, false) === true) // check for mentions
		{
			if (typeof opt_botUserName.value === 'string' && opt_botUserName.value.length > 0)
			{
				var mentionKey = '@' + opt_botUserName.value.toLowerCase();
				if (msg.message.toLowerCase().includes(mentionKey))
				{
					OpenAIConnection.RequestSummary(true);
				}
			}
		}

		if (OpenAIWindow.instance) OpenAIWindow.instance.UpdateProgressLabel();
	}

	static RegisterSummaryMessage(msg)
	{
		var msgCount = OpenAIConnection.latestChatMessages.push(new ChatGPTMessage('user', msg.username + ': ' + msg.message));
		if (msgCount > OptionManager.GetOptionValue(optkey_summaryMessageCount, 30)) OpenAIConnection.latestChatMessages.splice(0, 1);
	}

	static RegisterGPTResponse(msg = MultiChatMessage.default)
	{
		OpenAIConnection.latestResponse = msg.message;
		OpenAIConnection.RegisterSummaryMessage(msg);

		var validBotUsername = typeof OpenAIConnection.opt_botUsername.value === 'string' && OpenAIConnection.opt_botUsername.value.length > 0;
		var sendChatMessage = OptionManager.GetOptionValue(optkey_sendGeneratedResponses, false);

		if (validBotUsername)
		{
			let botPrefix = OptionManager.GetOptionValue(optkey_chatPrefix, "[GPT] ");
			if (sendChatMessage === true) 
			{
				console.log("Sent GPT Generated Chat Message!");
				TwitchListener.instance.SendMessageAsBot(botPrefix + OpenAIConnection.latestResponse);
			}
			ChatCollector.Append(OpenAIConnection.opt_botUsername.value, OpenAIConnection.latestResponse, 'Hub', "white", false);
		}
	}

	//adds user prompt prefix and summary to the request
	static async RequestCompletionResult(request = ChatGPTRequest.default, sendPrePrompt = true, sendSummary = true)
	{
		const openAiKeyOption = OptionManager.GetOption(optkey_openAiKey);
		var validKey = typeof openAiKeyOption.value === 'string' && openAiKeyOption.value.length > 0;
		if (!validKey) return;

		const optval_promptPrefix = OptionManager.GetOptionValue(optkey_promptPrefix, '');
		var validPromptPrefix = sendPrePrompt && typeof optval_promptPrefix === 'string' && optval_promptPrefix.length > 0;
		if (validPromptPrefix) request.InsertMessage('system', optval_promptPrefix, 0);

		var validSummary = sendSummary && typeof OpenAIConnection.latestSummary === 'string' && OpenAIConnection.latestSummary.length > 0;
		if (validSummary) request.InsertMessage('system', 'Latest Chat Summary:\n' + OpenAIConnection.latestSummary, 0);

		var sendChannelInfo = false;
		var channelData = TwitchListener.instance.joinedChannelData;
		var validChannelInfo = sendChannelInfo && channelData != null;
		if (validChannelInfo)
			request.AddMessage(
				'system',
				'Extra Stream Info:\n'
				+ 'Title: ' + channelData.title + '\n',
				+ 'Game/Category: ' + channelData["game_name"]
			);

		var reqBodyJson = JSON.stringify(request);
		//console.log('openai chat req:\n\n' + reqBodyJson);

		await fetch(
			url_completions,
			{
				method: 'POST',
				cache: 'default',
				headers: {
					'Authorization': header_authorization_prefix + openAiKeyOption.value,
					'Content-Type': header_content_type
				},
				body: reqBodyJson
			}
		).then(
			x => x.json()
		).then(
			x =>
			{
				if (!x || !x.choices)
				{
					console.warn(x);
					return;
				}

				if (x.usage)
				{
					if (x.usage.prompt_tokens) OpenAIConnection.sessionTokensInput += x.usage.prompt_tokens;
					if (x.usage.completion_tokens) OpenAIConnection.sessionTokensOutput += x.usage.completion_tokens;
				}

				var respMessage = x.choices[0].message.content;

				OpenAIConnection.RegisterGPTResponse(new MultiChatMessage(OptionManager.GetOptionValue(optkey_botUserName, '[BOT]'), respMessage));
				OpenAIWindow.onRefreshStatistics.Invoke();
			}
		);
	}

	static async RequestSummary(forceResponse = false)
	{
		var request = new ChatGPTRequest('gpt-4o-mini', OpenAIConnection.latestChatMessages);

		const openAiKeyOption = OptionManager.GetOption(optkey_openAiKey);
		var validKey = typeof openAiKeyOption.value === 'string' && openAiKeyOption.value.length > 0;
		if (!validKey) return;

		var validSummary = typeof OpenAIConnection.latestSummary === 'string' && OpenAIConnection.latestSummary.length > 0;
		if (validSummary) request.InsertMessage('system', "Previous Summary:\n" + OpenAIConnection.latestSummary, 0);

		const opt_mimicChat = OptionManager.GetOption(optkey_mimicChatStyle);

		var promptPrefix =
			'Produce a brief summary of the following chat messages. '
			+ 'You are a chatbot and this summary is your long-term memory. '
			+ 'If there is an existing summary, retain important information from it. '
			+ 'Ignore offensive messages. '
			+ 'Your username is ' + OptionManager.GetOptionValue(optkey_botUserName, 'ChatGPT') + '. Dont summarize your own messages. '
			+ 'If a user says something particularly profound, you can include their username and sentiments. '
			+ 'Optionally include a topic or idea mentioned that would be good to respond to. '
			+ 'Include verbatim chat messages that mention you so you can respond. '
			+ 'Abbreviate whenever possible, theres a per-token cost per summary. The summary doesnt need to sound natural. ';
		if (opt_mimicChat.value === true) promptPrefix += 'Include one short chat message that best represents the writing style of chat.';
		request.InsertMessage('system', promptPrefix, 0);

		var reqBodyJson = JSON.stringify(request);
		//console.log('openai summary req:\n\n' + reqBodyJson);

		await fetch(
			url_completions,
			{
				method: "POST",
				cache: "default",
				headers: {
					'Authorization': header_authorization_prefix + openAiKeyOption.value,
					'Content-Type': header_content_type
				},
				body: reqBodyJson
			}
		).then(
			x => x.json()
		).then(
			x =>
			{
				if (!x || !x.choices)
				{
					console.warn(x);
					return;
				}

				OpenAIConnection.latestSummary = x.choices[0].message.content;

				if (x.usage)
				{
					OpenAIConnection.sessionTokensInput += x.usage.prompt_tokens;
					OpenAIConnection.sessionTokensOutput += x.usage.completion_tokens;
				}

				OpenAIWindow.onRefreshStatistics.Invoke();

				var opt_chatAfterSummary = OptionManager.GetOption(optkey_chatAfterSummary);
				if (forceResponse || opt_chatAfterSummary.value === true) OpenAIConnection.RequestChatComment();
			}
		);
	}

	static RequestChatComment()
	{
		const mimicChatOption = OptionManager.GetOption(optkey_mimicChatStyle);

		var reqmessages =
			[
				new ChatGPTMessage(
					'system',
					'You are a Twitch chatbot. '
					+ 'Your username is ' + OptionManager.GetOptionValue(optkey_botUserName, 'ChatGPT') + '. '
					+ 'You are in the Twitch chat of streamer ' + TwitchListener.instance.joinedChannel + '. '
					+ 'You cannot see the video, only read chat. '
					+ 'Respond only with a short chat message. '
					+ 'Do not add your name to your message. '
					+ (mimicChatOption.value === true ? 'Mimic the writing style of chat. ' : '')
					+ 'Avoid calls to action, telling chat what to do, asking questions, or making hard to substantiate claims. '
					+ 'Avoid repeating yourself.'
				)
			];
		var req = new ChatGPTRequest('gpt-4o-mini', reqmessages);
		OpenAIConnection.RequestCompletionResult(req);
	}
}
OpenAIConnection.instance = new OpenAIConnection();

export class OpenAIWindow extends DraggableWindow
{
	static instance = null;
	static window_kind = 'openai';
	static window_title = 'OpenAI';
	static window_icon = 'smart_toy';

	static onRefreshStatistics = new EventSource();

	constructor(pos_x, pos_y)
	{
		super(OpenAIWindow.window_title, pos_x, pos_y);
		this.e_window_root.style.minHeight = "460px";
		this.e_window_root.style.minWidth = "400px";
		this.window_kind = OpenAIWindow.window_kind;
		this.SetTitle(OpenAIWindow.window_title);
		this.SetIcon(OpenAIWindow.window_icon);

		this.CreateContentContainer(false);
		this.e_content.style.paddingLeft = "0.5rem";
		this.e_content.style.paddingRight = "0.5rem";
		this.CreateControlsColumn();

		this.CreateWindowContent();

		this.UpdateProgressLabel();
	}

	onWindowShow() { OpenAIWindow.instance = this; }
	onWindowClose() { OpenAIWindow.onRefreshStatistics.RemoveSubscription(this.sub_RefreshStats); OpenAIWindow.instance = null; }

	UpdateProgressLabel()
	{
		if (!this.lbl_summarize_progress) return;

		const opt_summaryThreshold = OptionManager.GetOption(optkey_summaryThreshold);
		//const opt_summaryMessageCount = OptionManager.GetOption(optkey_summaryMessageCount);
		//let minMessageCount = Math.max(opt_summaryThreshold.value, opt_summaryMessageCount.value);

		OpenAIWindow.instance.lbl_summarize_progress.children[1].children[0].innerText =
			(opt_summaryThreshold.value - OpenAIConnection.messagesUntilSummary).toString() + "/" + opt_summaryThreshold.value.toString();
	}

	CreateWindowContent()
	{
		const openAiKeyOption = OptionManager.GetOption(optkey_openAiKey);
		const useSummaryOption = OptionManager.GetOption(optkey_useSummary);
		const sendChatOption = OptionManager.GetOption(optkey_sendGeneratedResponses);
		const summaryChatOption = OptionManager.GetOption(optkey_chatAfterSummary);
		const summaryCountOption = OptionManager.GetOption(optkey_summaryMessageCount);
		const summaryThresholdOption = OptionManager.GetOption(optkey_summaryThreshold);
		const mimicChatOption = OptionManager.GetOption(optkey_mimicChatStyle);
		const chatPrefixOption = OptionManager.GetOption(optkey_chatPrefix);
		const promptPrefixOption = OptionManager.GetOption(optkey_promptPrefix);
		const replyToMentionsOption = OptionManager.GetOption(optkey_replyToMentions);

		this.AddSectionTitle("Settings");
		var txt_apiKey = this.AddTextField("API Key", openAiKeyOption.value ?? '', (e) => { OptionManager.SetOptionValue(optkey_openAiKey, e.value); });
		txt_apiKey.style.height = "2rem";
		txt_apiKey.children[1].className += " hover-obscure";
		GlobalTooltip.RegisterReceiver(
			txt_apiKey,
			"Your very own OpenAI API key. "
			+ "You can get an API key by creating an account at <span style='color:cyan'>openai.com/api</span>"
		);

		var tgl_summarize = this.AddToggle("Summarize Chat", useSummaryOption.value ?? true, (e) => { OptionManager.SetOptionValue(optkey_useSummary, e.checked); });
		tgl_summarize.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(
			tgl_summarize,
			"Uses an extra ChatGPT call to periodically generate a summary of recent chat messages.<br>" +
			"<span style='color:orange'>Without this, ChatGPT won't know the context of the chat, and will likely respond poorly.</span>"
		);

		var tgl_summary_msg = this.AddToggle("Generate Chat", summaryChatOption.value ?? false, (e) => { OptionManager.SetOptionValue(optkey_chatAfterSummary, e.checked); });
		tgl_summary_msg.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(tgl_summary_msg, "When enabled, generates a chat message after a new summary.");

		var tgl_summary_msg = this.AddToggle("and Send", sendChatOption.value ?? false, (e) => { OptionManager.SetOptionValue(optkey_sendGeneratedResponses, e.checked); });
		tgl_summary_msg.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(tgl_summary_msg, "When enabled, actually sends generated chat messages to Twitch.");

		var tgl_mimic_chat = this.AddToggle("Mimic Chat", mimicChatOption.value ?? false, (e) => { OptionManager.SetOptionValue(optkey_mimicChatStyle, e.checked); });
		tgl_mimic_chat.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(tgl_mimic_chat, "When enabled, ChatGPT will attempt to write in the style of your chat.");

		var tgl_reply_mentions = this.AddToggle("Reply to Mentions", replyToMentionsOption.value ?? false, (e) => { OptionManager.SetOptionValue(optkey_replyToMentions, e.checked); });
		tgl_reply_mentions.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(tgl_reply_mentions, "When enabled, generates a chat message when a chatter mentions your bot with @");

		var num_summaryThreshold = this.AddTextField("Summarize After", summaryThresholdOption.value ?? 30, (e) => { OptionManager.SetOptionValue(optkey_summaryThreshold, e.value); });
		num_summaryThreshold.style.height = "2rem";
		num_summaryThreshold.children[1].children[0].type = 'number';
		GlobalTooltip.RegisterReceiver(
			num_summaryThreshold,
			"The number of messages to receive before asking ChatGPT for a new summary.<br>" +
			"<span style='color:orange'>The first summary will be generated after this many messages are received.</span>"
		);

		var num_summaryCount = this.AddTextField("Summarize Count", summaryCountOption.value ?? 30, (e) => { OptionManager.SetOptionValue(optkey_summaryMessageCount, e.value); });
		num_summaryCount.style.height = "2rem";
		num_summaryCount.children[1].children[0].type = 'number';
		GlobalTooltip.RegisterReceiver(
			num_summaryCount,
			"The number of messages to include when asking ChatGPT for a new summary.<br>"
		);

		this.lbl_summarize_progress = this.AddTextReadonly("Progress", "0%");
		this.lbl_summarize_progress.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(
			this.lbl_summarize_progress,
			"The number of messages counted towards the next summary."
		);


		var txt_prefix = this.AddTextField("Message Prefix", chatPrefixOption.value ?? '', (e) => { OptionManager.SetOptionValue(optkey_chatPrefix, e.value); });
		txt_prefix.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(txt_prefix, "When not blank, adds this prefix to bot chat messages to show they were generated with ChatGPT.");

		var txt_prompt_prefix = this.AddTextArea("Prompt Prefix", promptPrefixOption.value ?? '', (e) => { OptionManager.SetOptionValue(optkey_promptPrefix, e.value); });
		txt_prompt_prefix.style.height = "6rem";
		GlobalTooltip.RegisterReceiver(
			txt_prompt_prefix,
			"Adds this system prompt before each ChatGPT request. "
			+ "Allows you to customise the personality used by ChatGPT or to adjust how ChatGPT responds to certain things.<br>"
			+ "<span style='color:yellow'>This does not apply to summarization.</span>"
		);

		this.AddSectionTitle("Statistics");

		var e_lbl_tokens_in = this.AddTextReadonly("Input Tokens", OpenAIConnection.sessionTokensInput);
		e_lbl_tokens_in.style.height = '2rem';
		GlobalTooltip.RegisterReceiver(
			e_lbl_tokens_in,
			"How many input tokens have been used this session, with estimated cost in USD.<br>"
			+ "<span style='color:yellow'>$" + (OpenAIConnection.costPerTokenInput * 1000.0).toFixed(6) + " per 1000.</span><br>"
			+ "See more pricing info at <span style='color:cyan'>openai.com/api/pricing</span>"
		);
		var e_lbl_tokens_in_txt = e_lbl_tokens_in.children[1].children[0];

		var e_lbl_tokens_out = this.AddTextReadonly("Output Tokens", OpenAIConnection.sessionTokensOutput);
		e_lbl_tokens_out.style.height = '2rem';
		GlobalTooltip.RegisterReceiver(
			e_lbl_tokens_out,
			"How many output tokens have been used this session, with estimated cost in USD.<br>"
			+ "<span style='color:yellow'>$" + (OpenAIConnection.costPerTokenOutput * 1000.0).toFixed(6) + " per 1000.</span><br>"
			+ "See more pricing info at <span style='color:cyan'>openai.com/api/pricing</span>"
		);
		var e_lbl_tokens_out_txt = e_lbl_tokens_out.children[1].children[0];

		var e_lbl_last_summ = this.AddTextReadonly("Last Summary", OpenAIConnection.latestSummary);
		e_lbl_last_summ.style.height = '8rem';
		var e_lbl_last_summ_txt = e_lbl_last_summ.children[1].children[0];
		e_lbl_last_summ_txt.style.lineHeight = '0.9rem';
		e_lbl_last_summ_txt.style.textAlign = 'left';

		var e_lbl_last_resp = this.AddTextReadonly("Last Response", OpenAIConnection.latestResponse);
		e_lbl_last_resp.style.height = '4rem';
		var e_lbl_last_resp_txt = e_lbl_last_resp.children[1].children[0];
		e_lbl_last_resp_txt.style.lineHeight = '0.9rem';
		e_lbl_last_resp_txt.style.textAlign = 'left';

		this.sub_RefreshStats = OpenAIWindow.onRefreshStatistics.RequestSubscription(
			(x) =>
			{
				e_lbl_last_resp_txt.innerHTML = OpenAIConnection.latestResponse;
				e_lbl_last_summ_txt.innerHTML = OpenAIConnection.latestSummary;
				e_lbl_tokens_in_txt.innerHTML =
					OpenAIConnection.sessionTokensInput + " ( ~$" + (OpenAIConnection.costPerTokenInput * OpenAIConnection.sessionTokensInput) + " USD )";
				e_lbl_tokens_out_txt.innerHTML =
					OpenAIConnection.sessionTokensOutput + " ( ~$" + (OpenAIConnection.costPerTokenOutput * OpenAIConnection.sessionTokensOutput) + " USD )";
			}
		);

		this.AddSectionTitle("Testing");
		var e_btn_send_test = this.AddButton(
			'Test Request',
			'Send',
			() => { OpenAIConnection.RequestCompletionResult(ChatGPTRequest.default); },
			false
		);
		e_btn_send_test.style.height = '2rem';
		GlobalTooltip.RegisterReceiver(e_btn_send_test, "Sends a test request to the API to ensure things are working.");
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: OpenAIWindow.window_kind,
		icon: OpenAIWindow.window_icon,
		icon_color: 'hotpink',
		desc:
			"Connect to OpenAI's API and use your bot to add interaction between viewers and ChatGPT.<br>"
			+ "<span style='color:orange'>Warning! OpenAI's API is NOT free, but it is pretty cheap.</span><br>",
		model: (x, y) => { return new OpenAIWindow(x, y); },
		shortcutKey: 'o'
	}
);


OptionManager.AppendOption(optkey_openAiKey, '', 'API Key');
OptionManager.AppendOption(optkey_promptPrefix, 'No emojis.', 'Prefix Prompt');

OptionManager.AppendOption(optkey_useSummary, true, 'Summarize Chat');
OptionManager.AppendOption(optkey_summaryMessageCount, 30, 'Summarize Count');
OptionManager.AppendOption(optkey_summaryThreshold, 30, 'Summarize After');

OptionManager.AppendOption(optkey_chatMessageCount, false, 'Reply to Last');
OptionManager.AppendOption(optkey_chatAfterSummary, false, 'Chat After Summary');
OptionManager.AppendOption(optkey_replyToMentions, false, 'Reply to Mentions');
OptionManager.AppendOption(optkey_sendGeneratedResponses, false, 'Send Generated Messages');
OptionManager.AppendOption(optkey_chatPrefix, '[GPT] ', 'Prefix');
OptionManager.AppendOption(optkey_mimicChatStyle, true, 'Mimic Chat Style');

window.setTimeout(() => { OpenAIConnection.StartListening(); }, 50);