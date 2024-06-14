console.info("[ +Module ] StreamElements Listener");

export class StreamElements
{
	static instance = new StreamElements();
	constructor()
	{

	}

	async GetUserPoints(username)
	{
		var url = this.GetPointInfoRequestURL(username);
		var bearer = 'Bearer ' + GlobalSettings.instance.text_seJwtToken;
		var success = false;
		var pointsValue = -42;
		await fetch(
			url,
			{
				method: 'GET',
				withCredentials: true,
				credentials: 'include',
				headers: {
					'Authorization': bearer,
					'Content-Type': 'application/json'
				}
			}
		).then(
			responseJson =>
			{
				var resp = JSON.parse(responseJson._bodyInit);
				if (resp.found)
				{
					pointsValue = resp.data.points;
					success = true;
				}
			}
		).catch((error) => { success = false; console.warn(error); });

		console.log(`Got Points Balance For User ${username} : ${pointsValue}`);
		return pointsValue;
	}

	//for get
	static GetPointInfoRequestURL(username)
	{
		return "https://api.streamelements.com/kappa/v2/points/" + GlobalSettings.instance.text_seAccountId + "/" + username;
	}

	//for put
	static GetPointInfoChangeURL(username, pointsDelta)
	{
		return "https://api.streamelements.com/kappa/v2/points/" + GlobalSettings.instance.text_seAccountId + "/" + username + "/" + pointsDelta;
	}
}