import { EventSource } from "./eventsource.js";

console.info("[ +Module ] Rewards");

export class RewardType
{
	constructor(name = "Participation Trophy", action = (user, options) => { }, description = '')
	{
		this.name = name;
		this.description = description;
		this.identifier = "";
		this.action = action;

		this.identifier = RewardType.GetIdentifier(name);
	}

	AwardTo(user, options)
	{
		if (user && this.action)
		{
			this.action(user, options);
			Rewards.onGiven.Invoke({ user: user, reward: this });
		}
	}

	static GetIdentifier(name) { return name.toLowerCase().trim().replaceAll(" ", "_"); }
}

export class Rewards
{
	static kinds = [];
	static onGiven = new EventSource();

	static GetRewardKindID(name)
	{
		let rewardId = RewardType.GetIdentifier(name);
		for (var ii = 0; ii < Rewards.kinds.length; ii++)
		{
			let reward = Rewards.kinds[ii];
			if (reward.identifier !== rewardId) continue;
			return ii;
		}
		return -1;
	}

	static Give(user, name = "Participation Trophy", options = {})
	{
		let rewardIndex = Rewards.GetRewardKindID(name);
		if (rewardIndex === -1)
		{
			console.warn("Invalid Reward Given : " + name);
			return;
		}

		let reward = Rewards.kinds[rewardIndex];
		console.info("Reward '" + name + "' given to " + user.username);
		reward.AwardTo(user, options);
	}

	static Register(name = "Participation Trophy", action = (user, options) => { }, description = '')
	{
		Rewards.kinds.push(new RewardType(name, action, description));
	}
}

