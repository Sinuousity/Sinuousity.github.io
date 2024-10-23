import { addElement } from "../hubscript.js";
import { EventSource } from "./eventsource.js";
import { OptionManager } from "./globalsettings.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { Rewards } from "./rewards.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] StreamElements");


class StreamElementsLoyaltyDataResponse
{
	found = false;
	data = new StreamElementsLoyaltyData();
}

class StreamElementsLoyaltyData
{
	channel = "";
	username = "";
	points = 0;
	pointsAllTime = 0;
	watchTime = 0;
	rank = 0;
}

export class StreamElements
{
	static hasCredentials = false;
	static accountId = "";
	static jwtToken = "";
	static url_PointsTop = "https://api.streamelements.com/kappa/v2/points/{channel}/top";

	static latestTop10 = [];

	static onPointsChanged = new EventSource();
	static onDataFetched = new EventSource();

	static CheckCredentials()
	{
		if (StreamElements.accountId == "") StreamElements.accountId = OptionManager.GetOptionValue("se.account.id", "");
		if (StreamElements.jwtToken == "") StreamElements.jwtToken = OptionManager.GetOptionValue("se.jwt.token", "");

		StreamElements.hasCredentials = StreamElements.accountId.length > 0 && StreamElements.jwtToken.length > 0;
	}

	static async GetTopX(count = 10, withData = x => { })
	{
		StreamElements.CheckCredentials();

		if (!StreamElements.hasCredentials)
		{
			console.warn("StreamElements : GetTopX Abort - No Credentials");
			return;
		}

		var url = StreamElements.GetURL_PointsTopX(count);
		var bearer = 'Bearer ' + StreamElements.jwtToken;
		var success = false;
		var resp = await fetch(
			url,
			{
				method: 'GET',
				headers: { 'Authorization': bearer, 'Content-Type': 'application/json' }
			}
		);
		if (!resp.ok)
		{
			console.log(`StreamElements : GetURL_PointsTopX abort : Bad response from StreamElements API`);
			return;
		}

		var respTxt = await resp.text();
		var respObj = JSON.parse(respTxt);
		if (respObj.users)
		{
			withData(respObj);
			success = true;
			return;
		}

		console.log(`StreamElements : GetTopX Error! JSON RESP: '${respTxt}'`);
	}

	static async GetUserPoints(username, withData = x => { })
	{
		if (typeof username != 'string') return;
		if (username.length < 1) return;

		StreamElements.CheckCredentials();

		if (!StreamElements.hasCredentials)
		{
			console.warn("StreamElements : GetUserPoints Abort - No Credentials");
			return;
		}

		var url = StreamElements.GetURL_PointsUser(username);
		var bearer = 'Bearer ' + StreamElements.jwtToken;
		var resp = await fetch(
			url,
			{
				method: 'GET',
				headers: {
					'Authorization': bearer,
					'Content-Type': 'application/json'
				}
			}
		);
		if (!resp.ok)
		{
			console.log(`StreamElements : No User '${username}' found!`);
			return;
		}

		var respTxt = await resp.text();
		var respObj = JSON.parse(respTxt);
		if (respObj.points)
		{
			withData(respObj);
		}
		else
		{
			console.log(`StreamElements : No Points Balance For User '${username}' found! JSON RESPONSE: '${respTxt}'`);
		}
	}

	static async AddUserPoints(username, pointDelta = 1, withData = x => { })
	{
		if (typeof username != 'string') return;
		if (username.length < 1) return;

		StreamElements.CheckCredentials();

		if (!StreamElements.hasCredentials)
		{
			console.warn("StreamElements : GetUserPoints Abort - No Credentials");
			return;
		}

		var url = StreamElements.GetURL_PointsUserAssign(username, pointDelta);
		var bearer = 'Bearer ' + StreamElements.jwtToken;
		var resp = await fetch(
			url,
			{
				method: 'PUT',
				headers: {
					'Authorization': bearer,
					'Content-Type': 'application/json'
				}
			}
		);

		if (!resp.ok)
		{
			console.log(`StreamElements : No User '${username}' found!`);
			return;
		}

		var respTxt = await resp.text();
		var respObj = JSON.parse(respTxt);
		if (respObj.newAmount)
		{
			StreamElements.onPointsChanged.Invoke();
			withData(respObj);
		}
		else console.log(`StreamElements : Unable to add Points to Balance for User '${username}'! JSON RESPONSE: '${respTxt}'`);
	}

	static GetURL_PointsTopX(count = 10)
	{
		return "https://api.streamelements.com/kappa/v2/points/" + StreamElements.accountId + "/top?limit=" + count;
	}

	//for get
	static GetURL_PointsUser(username)
	{
		return "https://api.streamelements.com/kappa/v2/points/" + StreamElements.accountId + "/" + username;
	}

	//for put
	static GetURL_PointsUserAssign(username, pointsDelta)
	{
		return "https://api.streamelements.com/kappa/v2/points/" + StreamElements.accountId + "/" + username + "/" + pointsDelta;
	}



	static TrySpendUserPoints(username = "", pointsRequired = 0, action = () => { }, failMessage = "{user} didn't have enough SE points! {has} / {needs}")
	{
		if (typeof username != 'string' || username === "") return;

		if (pointsRequired <= 0)
		{
			action();
			return;
		}

		StreamElements.GetUserPoints(
			username,
			x =>
			{
				if (Number(x.points) >= pointsRequired)
				{
					StreamElements.AddUserPoints(username, -pointsRequired);
					action();
				}
				else
				{
					var txt = failMessage;
					txt = txt.replace("{user}", username);
					txt = txt.replace("{has}", x.points);
					txt = txt.replace("{needs}", pointsRequired);
					console.log(txt);
				}
			}
		);
	}
}



export class StreamElementsWindow extends DraggableWindow
{
	static window_kind = "StreamElements Tools";
	static window_icon = "settings_system_daydream";

	constructor(pos_x, pos_y)
	{
		super(StreamElementsWindow.window_kind, pos_x, pos_y);
		this.window_kind = StreamElementsWindow.window_kind;
		this.e_window_root.style.width = "320px";
		this.e_window_root.style.height = "400px";

		this.e_window_root.style.minHeight = "400px";
		this.e_window_root.style.minWidth = "320px";
		this.e_window_root.style.maxWidth = "800px";

		this.SetTitle(StreamElementsWindow.window_kind);
		this.SetIcon(StreamElementsWindow.window_icon);

		this.CreateContentContainer();
		this.e_content.style.fontSize = "0.8rem";
		this.e_content.style.color = "white";
		this.e_content.style.overflowX = "hidden";
		this.e_content.style.overflowY = "hidden";
		this.e_content.style.textOverflow = "ellipsis";
		this.e_content.style.textWrap = "nowrap";
		this.e_content.style.width = "100%";

		this.CreateControlsColumn(false);

		this.CreateLeaderboardElements();
		this.CreateUserDataElements();

		this.sub_OnPointChange = StreamElements.onPointsChanged.RequestSubscription(() => { this.RefreshTop10(); });

		StreamElements.GetTopX(10, x => { this.ParseTop10Data(x); });
	}

	onWindowClose()
	{
		StreamElements.onPointsChanged.RemoveSubscription(this.sub_OnPointChange);
	}

	CreateLeaderboardElements()
	{
		this.AddSectionTitle("Top Point Holders");

		this.e_btn_refreshTop10 = addElement("div", null, this.e_controls_column);
		this.e_btn_refreshTop10.addEventListener(
			"click",
			e =>
			{
				StreamElements.GetTopX(10, x => { this.ParseTop10Data(x); });
				this.e_btn_refreshTop10.style.pointerEvents = "none";
				window.setTimeout(() => { this.e_btn_refreshTop10.style.pointerEvents = "all"; }, 1500);
			}
		);
		this.e_btn_refreshTop10.style.position = "absolute";
		this.e_btn_refreshTop10.style.fontFamily = "'Material Icons'";
		this.e_btn_refreshTop10.style.top = "0.25rem";
		this.e_btn_refreshTop10.style.right = "0.25rem";
		this.e_btn_refreshTop10.style.backgroundColor = "#fff1";
		this.e_btn_refreshTop10.style.height = "1.5rem";
		this.e_btn_refreshTop10.style.lineHeight = "1.5rem";
		this.e_btn_refreshTop10.style.fontSize = "0.9rem";
		this.e_btn_refreshTop10.style.textAlign = "center";
		this.e_btn_refreshTop10.style.width = "1.5rem";
		this.e_btn_refreshTop10.style.borderRadius = "0.5rem";
		this.e_btn_refreshTop10.style.cursor = "pointer";
		this.e_btn_refreshTop10.style.scale = "90%";
		this.e_btn_refreshTop10.style.rotate = "0deg";
		this.e_btn_refreshTop10.style.transitionProperty = "background-color, scale, rotate";
		this.e_btn_refreshTop10.style.transitionDuration = "0.1s";
		this.e_btn_refreshTop10.style.transitionTimingFunction = "ease-in-out";
		this.e_btn_refreshTop10.innerText = "refresh";
		this.e_btn_refreshTop10.addEventListener(
			"mouseenter",
			e =>
			{
				this.e_btn_refreshTop10.style.backgroundColor = "#4fa5";
				this.e_btn_refreshTop10.style.scale = "100%";
				this.e_btn_refreshTop10.style.rotate = "45deg";
			}
		);
		this.e_btn_refreshTop10.addEventListener(
			"mouseleave",
			e =>
			{
				this.e_btn_refreshTop10.style.backgroundColor = "#fff1";
				this.e_btn_refreshTop10.style.scale = "90%";
				this.e_btn_refreshTop10.style.rotate = "0deg";
			}
		);
		GlobalTooltip.RegisterReceiver(this.e_btn_refreshTop10, "Refresh Point Leaderboard", null);

		this.e_top10_list = addElement("div", null, this.e_controls_column);
		this.e_top10_list.style.height = "10rem";
		this.e_top10_list.style.flexGrow = "1";
		this.e_top10_list.style.overflowX = "hidden";
		this.e_top10_list.style.overflowY = "auto";
	}

	CreateUserDataElements()
	{
		this.AddSectionTitle("User Points");

		this.e_ctrl_username = this.AddTextField(
			"Username",
			"",
			e =>
			{
				this.e_btn_getData.disabled = this.e_field_username.value.trim().toLowerCase().length < 1;
			},
			false
		);
		this.e_ctrl_username.style.lineHeight = "2rem";
		this.e_ctrl_username.style.height = "2rem";
		this.e_field_username = this.e_ctrl_username.children[1].children[0];

		this.e_ctrl_getData = this.AddButton("", "Fetch Data", e =>
		{
			let username = this.e_field_username.value.trim().toLowerCase();
			if (username.length > 1)
			{
				StreamElements.GetUserPoints(
					username,
					x =>
					{
						var rankColor = this.GetRankColor(x.rank);
						this.e_lbl_userData.innerHTML = `${username} has <span style='color:goldenrod'>${x.points}</span> points!`;
						this.e_lbl_userData.innerHTML += `(Rank <span style='color:${rankColor}'>#${x.rank}</span>)`;
						this.e_lbl_timestamp.innerText = "As Of: " + new Date().toLocaleTimeString();
					}
				);
			}
		}, false);
		this.e_ctrl_getData.style.lineHeight = "2rem";
		this.e_ctrl_getData.style.height = "2rem";
		this.e_btn_getData = this.e_ctrl_getData.children[1].children[0];
		this.e_btn_getData.disabled = true;

		this.e_lbl_userData = addElement("div", null, this.e_controls_column);
		this.e_lbl_userData.innerText = "No Data Fetched";
		this.e_lbl_userData.style.borderTop = "solid #fff2 2px";
		this.e_lbl_userData.style.textAlign = "center";
		this.e_lbl_userData.style.lineHeight = "2rem";
		this.e_lbl_userData.style.height = "2rem";

		this.e_lbl_timestamp = addElement("div", null, this.e_controls_column);
		this.e_lbl_timestamp.innerText = "-";
		this.e_lbl_timestamp.style.textAlign = "center";
		this.e_lbl_timestamp.style.lineHeight = "1rem";
		this.e_lbl_timestamp.style.color = "#fff5";
		this.e_lbl_timestamp.style.height = "1rem";
	}

	//{"_total":2,"users":[{"username":"snastybot","points":111536},{"username":"sinuousity","points":177}]}
	ParseTop10Data(data = {})
	{
		if (!data.users || data.users.length < 1) return;
		StreamElements.latestTop10 = data.users;
		this.RefreshTop10();
	}

	RefreshTop10()
	{
		this.e_top10_list.innerHTML = "";

		var top10Count = Math.min(StreamElements.latestTop10.length, 10);
		const shared_span_style = "style='display:inline-block;flex-shrink:0.0;text-align:";
		for (var userIndex = 0; userIndex < top10Count; userIndex++)
		{
			const e = addElement("div", null, this.e_top10_list);
			e.style.backgroundColor = "#fff0";
			e.style.transitionProperty = "background-color, height, line-height";
			e.style.transitionDuration = "0.1s";
			e.style.transitionTimingFunction = "ease-in-out";
			var rankColor = this.GetRankColor(userIndex + 1);
			const colorStyle = `color:${rankColor};`;
			e.innerHTML = `<span ${shared_span_style}right;flex-grow:0.0;min-width:1.5rem;${colorStyle}'>${(userIndex + 1)})</span>`;
			e.innerHTML += `<span ${shared_span_style}left;flex-grow:1.0;padding-left:0.3rem;${colorStyle}'>${StreamElements.latestTop10[userIndex].username}</span>`;

			var pointStr = Number(StreamElements.latestTop10[userIndex].points).toLocaleString();
			e.innerHTML += `<span ${shared_span_style}right;flex-grow:1.0;padding-right:0.5rem;${colorStyle}'>${pointStr}</span>`;
			e.style.display = "flex";
			e.style.flexDirection = "row";
			e.style.lineHeight = "1.5rem";
			e.style.fontSize = "0.9rem";
			e.style.height = "1.5rem";
			e.style.width = "100%";

			e.addEventListener(
				"mouseenter",
				eventData =>
				{
					e.style.backgroundColor = "#fff2";
					e.style.height = "2rem";
					e.style.lineHeight = "2rem";
				}
			);
			e.addEventListener(
				"mouseleave",
				eventData =>
				{
					e.style.backgroundColor = "#fff0";
					e.style.height = "1.5rem";
					e.style.lineHeight = "1.5rem";
				}
			);
		}
	}

	GetRankColor(rank = -1)
	{
		if (rank < 1) return "red";
		if (rank == 1) return "goldenrod";
		if (rank == 2) return "silver";
		if (rank == 3) return "peru";
		if (rank < 10) return "plum";
		if (rank < 20) return "darkcyan";
		return "gray";
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: StreamElementsWindow.window_kind,
		icon: StreamElementsWindow.window_icon,
		icon_color: 'hotpink',
		desc: "Get stats from StreamElements! You can use this to make sure your SE credentials are working.",
		model: (x, y) => { return new StreamElementsWindow(x, y); },
		shortcutKey: 's'
	}
);


OptionManager.AppendOption("se.account.id", "", "Account ID");
OptionManager.AppendOption("se.jwt.token", "", "JWT Token");


Rewards.Register(
	"Add SE Points",
	(user, options) =>
	{
		if (options.min && options.max) StreamElements.AddUserPoints(user.username, Math.random() * Math.abs(options.max - options.min) + options.min);
		else if (options.points) StreamElements.AddUserPoints(user.username, options.points);
		else console.warn("Unable to award SE Points : Needs either 'min'/'max' or 'points'");
	},
	'Give some StreamElements loyalty points to the winner.'
);