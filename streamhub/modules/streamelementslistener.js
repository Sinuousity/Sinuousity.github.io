import { addElement } from "../hubscript.js";
import { OptionManager } from "./globalsettings.js";
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

	static CheckCredentials()
	{
		if (StreamElements.accountId == "") StreamElements.accountId = OptionManager.GetOptionValue("se.account.id", "");
		if (StreamElements.jwtToken == "") StreamElements.jwtToken = OptionManager.GetOptionValue("se.jwt.token", "");

		StreamElements.hasCredentials = StreamElements.accountId.length > 0 && StreamElements.jwtToken.length > 0;
	}

	static async GetUserPoints(username, withData = x => { })
	{
		if (typeof username != 'string') return;
		if (username.length < 1) return;

		StreamElements.CheckCredentials();

		if (!StreamElements.hasCredentials)
		{
			console.warn("StreamElements : Data Abort - No Credentials");
			return;
		}

		var url = StreamElements.GetPointInfoRequestURL(username);
		var bearer = 'Bearer ' + StreamElements.jwtToken;
		var success = false;
		var pointsValue = -42;
		var resp = await fetch(
			url,
			{
				method: 'GET',
				//withCredentials: true,
				//credentials: 'include',
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
			pointsValue = respObj.points;
			withData(respObj);
			success = true;
		}
		else
		{
			console.log(`StreamElements : No Points Balance For User '${username}' found! JSON RESPONSE: '${respTxt}'`);
		}

		return pointsValue;
	}

	//for get
	static GetPointInfoRequestURL(username)
	{
		return "https://api.streamelements.com/kappa/v2/points/" + StreamElements.accountId + "/" + username;
	}

	//for put
	static GetPointInfoChangeURL(username, pointsDelta)
	{
		return "https://api.streamelements.com/kappa/v2/points/" + StreamElements.accountId + "/" + username + "/" + pointsDelta;
	}
}



export class StreamElementsWindow extends DraggableWindow
{
	static window_kind = "StreamElements";
	static window_icon = "grade";

	constructor(pos_x, pos_y)
	{
		super(StreamElementsWindow.window_kind, pos_x, pos_y);
		this.window_kind = StreamElementsWindow.window_kind;
		this.e_window_root.style.width = "320px";
		this.e_window_root.style.height = "180px";

		this.e_window_root.style.minHeight = "180px";
		this.e_window_root.style.minWidth = "320px";
		this.e_window_root.style.maxWidth = "800px";
		this.e_window_root.style.maxHeight = "500px";
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

		this.e_ctrl_username = this.AddTextField(
			"Username", "",
			e =>
			{
				this.e_btn_getData.disabled = this.e_field_username.value.trim().toLowerCase().length < 1;
			}, false
		);
		this.e_ctrl_username.style.lineHeight = "2rem";
		this.e_ctrl_username.style.height = "2rem";
		this.e_field_username = this.e_ctrl_username.children[1].children[0];

		this.e_ctrl_getData = this.AddButton("Fetch Data", "Fetch Data", e =>
		{
			let username = this.e_field_username.value.trim().toLowerCase();
			if (username.length > 1)
			{
				StreamElements.GetUserPoints(
					username,
					x =>
					{
						this.e_lbl_userData.innerHTML = `${username} has ${x.points} points! (Rank #${x.rank})`;
						this.e_lbl_timestamp.innerText = "As Of: " + new Date().toLocaleTimeString();
					}
				);
			}
		}, false);
		this.e_ctrl_getData.style.lineHeight = "2rem";
		this.e_ctrl_getData.style.height = "2rem";
		this.e_btn_getData = this.e_ctrl_getData.children[1].children[0];

		this.e_lbl_userData = addElement("div", null, this.e_controls_column);
		this.e_lbl_userData.innerText = "No Data Fetched";
		this.e_lbl_userData.style.textAlign = "center";
		this.e_lbl_userData.style.lineHeight = "2rem";
		this.e_lbl_userData.style.height = "2rem";

		this.e_lbl_timestamp = addElement("div", null, this.e_controls_column);
		this.e_lbl_timestamp.innerText = "-";
		this.e_lbl_timestamp.style.textAlign = "center";
		this.e_lbl_timestamp.style.lineHeight = "1rem";
		this.e_lbl_timestamp.style.color = "#fff5";
		this.e_lbl_timestamp.style.height = "1rem";

		this.e_btn_getData.disabled = true;
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: StreamElementsWindow.window_kind,
		icon: StreamElementsWindow.window_icon,
		desc: "A small tool to fetch viewer stats from StreamElements. Use this to make sure your StreamElements credentials are valid and working.",
		model: (x, y) => { return new StreamElementsWindow(x, y); }
	}
);


OptionManager.AppendOption("se.account.id", "", "Account ID");
OptionManager.AppendOption("se.jwt.token", "", "JWT Token");