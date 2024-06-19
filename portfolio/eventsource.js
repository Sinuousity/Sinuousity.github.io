export class EventSourceSubscription
{
	constructor(action)
	{
		this.action = action;
	}

	Invoke(data = {}, debugMessage = "")
	{
		if (debugMessage != "") console.log(debugMessage);
		if (this.earlyAction) this.earlyAction(data);
		this.action(data);
		if (this.lateAction) this.lateAction(data);
	}
}

export class EventSource
{
	constructor()
	{
		this.subscribers = [];
	}

	RequestSubscription(action)
	{
		if (!action) return false;
		var subscription = new EventSourceSubscription(action);
		this.subscribers.push(subscription);
		return subscription;
	}

	RemoveSubscription(subscription)
	{
		if (!subscription) return false;
		var spliceIndex = this.subscribers.indexOf(subscription);
		if (spliceIndex < 0) return false;
		this.subscribers.splice(spliceIndex, 1);
		return true;
	}

	Invoke(data = {}, debugMessage = "")
	{
		for (var subIndex in this.subscribers)
		{
			this.subscribers[subIndex].Invoke(data, debugMessage);
		}
	}
}

