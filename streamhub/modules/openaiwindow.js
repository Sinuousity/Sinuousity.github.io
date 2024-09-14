import { addElement } from "../hubscript.js";
import { ChatCollector } from "./chatcollector.js";
import { EventSource } from "./eventsource.js";
import { OptionManager } from "./globalsettings.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] OpenAI Integration Window");

const optkey_openAiKey = 'openai.api.key';
const optkey_useSummary = 'openai.summarize';
const optkey_chatAfterSummary = 'openai.summarize.then.chat';
const optkey_summaryMessageCount = 'openai.summarize.message.count';
const optkey_mimicChatStyle = 'openai.mimic.chat';
const optkey_chatPrefix = 'openai.prefix';
const optkey_promptPrefix = 'openai.prompt.prefix';

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
	static latestResponse = '';
	static latestSummary = '';

	static sessionTokensInput = 0;
	static sessionTokensOutput = 0;

	static costPerTokenInput = 0.15 / 1_000_000.0;
	static costPerTokenOutput = 0.60 / 1_000_000.0;

	static listening = false;
	static messagesUntilSummary = 10;

	static StartListening()
	{
		if (OpenAIConnection.listening) return;
		console.log("ChatGPT Listening To Chat...");
		ChatCollector.onMessageReceived.RequestSubscription(OpenAIConnection.OnNewMessage);
		OpenAIConnection.listening = true;
	}

	static StopListening()
	{
		if (!OpenAIConnection.listening) return;
		console.log("ChatGPT Stopped Listening To Chat");
		ChatCollector.onMessageReceived.RemoveSubscription(OpenAIConnection.OnNewMessage);
		OpenAIConnection.listening = false;
	}

	static OnNewMessage(msg)
	{
		OpenAIConnection.latestChatMessages.push(new ChatGPTMessage('user', msg.username + ": " + msg.message));
		OpenAIConnection.messagesUntilSummary--;

		if (OpenAIConnection.messagesUntilSummary < 1)
		{
			const opt_summarize = OptionManager.GetOption(optkey_useSummary);
			const opt_summaryMessageCount = OptionManager.GetOption(optkey_summaryMessageCount);
			OpenAIConnection.messagesUntilSummary = Number(opt_summaryMessageCount.value) ?? 30;
			if (opt_summarize.value === true) OpenAIConnection.RequestSummary();
			OpenAIConnection.latestChatMessages = [];
		}
	}

	static async RequestCompletionResult(request = ChatGPTRequest.default)
	{
		const openAiKeyOption = OptionManager.GetOption(optkey_openAiKey);
		var validKey = typeof openAiKeyOption.value === 'string' && openAiKeyOption.value.length > 0;
		if (!validKey) return;

		var validSummary = typeof OpenAIConnection.latestSummary === 'string' && OpenAIConnection.latestSummary.length > 0;
		if (validSummary)
		{
			request.InsertMessage('system', "Latest Chat Summary:\n" + OpenAIConnection.latestSummary, 0);
		}

		const opt_promptPrefix = OptionManager.GetOption(optkey_promptPrefix);
		const optval_promptPrefix = opt_promptPrefix.value;
		var validPromptPrefix = typeof optval_promptPrefix === 'string' && optval_promptPrefix.length > 0;
		if (validPromptPrefix)
		{
			request.InsertMessage('system', optval_promptPrefix, 0);
		}

		var reqBodyJson = JSON.stringify(request);

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

				OpenAIConnection.latestResponse = x.choices[0].message.content;

				if (x.usage)
				{
					OpenAIConnection.sessionTokensInput += x.usage.prompt_tokens;
					OpenAIConnection.sessionTokensOutput += x.usage.completion_tokens;
				}

				OpenAIWindow.onRefreshStatistics.Invoke();
			}
		);
	}

	static async RequestSummary()
	{
		var request = new ChatGPTRequest('gpt-4o-mini', OpenAIConnection.latestChatMessages);

		const openAiKeyOption = OptionManager.GetOption(optkey_openAiKey);
		var validKey = typeof openAiKeyOption.value === 'string' && openAiKeyOption.value.length > 0;
		if (!validKey) return;

		var validSummary = typeof OpenAIConnection.latestSummary === 'string' && OpenAIConnection.latestSummary.length > 0;
		if (validSummary) request.InsertMessage('system', "Previous Summary:\n" + OpenAIConnection.latestSummary, 0);

		const opt_mimicChat = OptionManager.GetOption(optkey_mimicChatStyle);

		var promptPrefix =
			'Produce a *brief* summary of the following chat messages. '
			+ 'If there is a previous summary, try to retain important information from it. '
			+ 'Avoid summarizing ambiguous reactions. Ignore intentionally offensive remarks. '
			+ 'If a user says something particularly profound and unique (not sarcastic or just funny), you can include their username and sentiments. '
			+ 'Optionally include a topic or idea mentioned that would be good to respond to. '
			+ 'Abbreviate whenever possible, theres a per-token cost per summary. Summary doesnt need to sound natural, its for an LLM. ';
		if (opt_mimicChat.value === true) promptPrefix += 'Include one short chat message that best represents the writing style of chat.';
		request.InsertMessage('system', promptPrefix, 0);

		var reqBodyJson = JSON.stringify(request);

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
				if (opt_chatAfterSummary.value === true)
				{
					OpenAIConnection.RequestChatComment();
				}
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
					'Respond with a very short relevant chat message. '
					+ (mimicChatOption.value === true ? 'Mimic the writing style of chat. ' : '')
					+ 'Avoid calls to action, telling chat what to do, asking questions, or making unsubstantiated claims. '
					+ 'Avoid personifying yourself, they know youre an LLM! Focus on the chat and their ideas. '
					+ 'This was your latest comment, avoid repeating yourself: ' + OpenAIConnection.latestResponse
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
	}

	onWindowShow() { OpenAIWindow.instance = this; }
	onWindowClose() { OpenAIWindow.instance = null; }

	CreateWindowContent()
	{
		const openAiKeyOption = OptionManager.GetOption(optkey_openAiKey);
		const useSummaryOption = OptionManager.GetOption(optkey_useSummary);
		const summaryChatOption = OptionManager.GetOption(optkey_chatAfterSummary);
		const summaryCountOption = OptionManager.GetOption(optkey_summaryMessageCount);
		const mimicChatOption = OptionManager.GetOption(optkey_mimicChatStyle);
		const chatPrefixOption = OptionManager.GetOption(optkey_chatPrefix);
		const promptPrefixOption = OptionManager.GetOption(optkey_promptPrefix);

		this.AddSectionTitle("Settings");
		var txt_apiKey = this.AddTextField("API Key", openAiKeyOption.value ?? '', (e) => { OptionManager.SetOptionValue(optkey_openAiKey, e.value); });
		txt_apiKey.style.height = "2rem";
		txt_apiKey.children[1].className += " hover-obscure";
		GlobalTooltip.RegisterReceiver(
			txt_apiKey,
			"Your very own OpenAI API key. "
			+ "Each call to the API has an associated cost, though it is tiny. "
			+ "You can get an API key by creating an account at <span style='color:cyan'>openai.com/api/</span>"
		);

		var tgl_summarize = this.AddToggle("Summarize Chat", useSummaryOption.value ?? true, (e) => { OptionManager.SetOptionValue(optkey_useSummary, e.checked); });
		tgl_summarize.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(
			tgl_summarize,
			"Uses an extra ChatGPT call to periodically generate a summary of recent chat messages.<br>" +
			"<span style='color:orange'>Without this, ChatGPT won't know the context of the chat, and will likely respond poorly.</span>"
		);

		var tgl_summary_msg = this.AddToggle("and Respond", summaryChatOption.value ?? false, (e) => { OptionManager.SetOptionValue(optkey_chatAfterSummary, e.checked); });
		tgl_summary_msg.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(tgl_summary_msg, "When enabled, generates a chat message after each summary.");

		var tgl_mimic_chat = this.AddToggle("Mimic Chat", mimicChatOption.value ?? false, (e) => { OptionManager.SetOptionValue(optkey_mimicChatStyle, e.checked); });
		tgl_mimic_chat.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(tgl_mimic_chat, "When enabled, ChatGPT will attempt to write in the style of your chat.");

		var num_summaryCount = this.AddTextField("Summarize After", summaryCountOption.value ?? 30, (e) => { OptionManager.SetOptionValue(optkey_summaryMessageCount, e.value); });
		num_summaryCount.style.height = "2rem";
		num_summaryCount.children[1].children[0].type = 'number';
		GlobalTooltip.RegisterReceiver(num_summaryCount, "The number of messages to receive before asking ChatGPT for a new summary.");


		var txt_prefix = this.AddTextField("Message Prefix", chatPrefixOption.value ?? '', (e) => { OptionManager.SetOptionValue(optkey_chatPrefix, e.value); });
		txt_prefix.style.height = "2rem";
		GlobalTooltip.RegisterReceiver(txt_prefix, "When not blank, adds this prefix to bot chat messages to show they were generated with ChatGPT.");

		var txt_prompt_prefix = this.AddTextArea("Prompt Prefix", promptPrefixOption.value ?? '', (e) => { OptionManager.SetOptionValue(optkey_promptPrefix, e.value); });
		txt_prompt_prefix.style.height = "8rem";
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
			+ "<span style='color:yellow'>$" + (OpenAIConnection.costPerTokenInput * 1000.0).toFixed(6) + " per 1000.</span>"
		);
		var e_lbl_tokens_in_txt = e_lbl_tokens_in.children[1].children[0];

		var e_lbl_tokens_out = this.AddTextReadonly("Output Tokens", OpenAIConnection.sessionTokensOutput);
		e_lbl_tokens_out.style.height = '2rem';
		GlobalTooltip.RegisterReceiver(
			e_lbl_tokens_out,
			"How many output tokens have been used this session, with estimated cost in USD.<br>"
			+ "<span style='color:yellow'>$" + (OpenAIConnection.costPerTokenOutput * 1000.0).toFixed(6) + " per 1000.</span>"
		);
		var e_lbl_tokens_out_txt = e_lbl_tokens_out.children[1].children[0];

		var e_lbl_last_summ = this.AddTextReadonly("Last Summary", OpenAIConnection.latestSummary);
		e_lbl_last_summ.style.height = '10rem';
		var e_lbl_last_summ_txt = e_lbl_last_summ.children[1].children[0];
		e_lbl_last_summ_txt.style.lineHeight = '0.9rem';
		e_lbl_last_summ_txt.style.textAlign = 'left';

		var e_lbl_last_resp = this.AddTextReadonly("Last Response", OpenAIConnection.latestResponse);
		e_lbl_last_resp.style.height = '4rem';
		var e_lbl_last_resp_txt = e_lbl_last_resp.children[1].children[0];
		e_lbl_last_resp_txt.style.lineHeight = '0.9rem';
		e_lbl_last_resp_txt.style.textAlign = 'left';

		OpenAIWindow.onRefreshStatistics.RequestSubscription(
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

		var e_btn_send_test_comment = this.AddButton(
			'Test Comment',
			'Send',
			OpenAIConnection.RequestChatComment,
			false
		);
		e_btn_send_test_comment.style.height = '2rem';
		GlobalTooltip.RegisterReceiver(e_btn_send_test_comment, "Sends a test request to the API, using the latest summary and prompt prefix.");
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: OpenAIWindow.window_kind,
		icon: OpenAIWindow.window_icon,
		desc:
			"Connect to OpenAI's API and use your bot to add interaction between viewers and ChatGPT.<br>"
			+ "<span style='color:orange'>Warning! OpenAI's API is NOT free, but it is pretty cheap.</span><br>",
		model: (x, y) => { return new OpenAIWindow(x, y); },
		shortcutKey: 'o',
		wip: true
	}
);


OptionManager.AppendOption(optkey_openAiKey, '', 'API Key');
OptionManager.AppendOption(optkey_mimicChatStyle, true, 'Mimic Chat Style');
OptionManager.AppendOption(optkey_useSummary, true, 'Summarize Chat');
OptionManager.AppendOption(optkey_chatAfterSummary, false, 'Chat After Summary');
OptionManager.AppendOption(optkey_summaryMessageCount, 30, 'Summary After');
OptionManager.AppendOption(optkey_chatPrefix, '[GPT] ', 'Prefix');
OptionManager.AppendOption(optkey_promptPrefix, 'Adopt the persona of a wholesome and respectful Twitch viewer.', 'Prefix Prompt');

OpenAIConnection.StartListening();