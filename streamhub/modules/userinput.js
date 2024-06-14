console.info("Module Added: User Input");

export class UserInput
{
	static instance = new UserInput();

	constructor()
	{
		this.mousePositionX = 0.0;
		this.mousePositionY = 0.0;
		this.mousePositionXUnclamped = 0.0;
		this.mousePositionYUnclamped = 0.0;
		document.addEventListener("mousemove", (e) => { this.UpdateMouse(e); });
	}

	UpdateMouse(e)
	{
		this.mousePositionXUnclamped = e.clientX;
		this.mousePositionYUnclamped = e.clientY;
		this.mousePositionX = e.clientX;
		this.mousePositionX = Math.min(Math.max(this.mousePositionX, 0.0), document.documentElement.clientWidth);
		this.mousePositionY = e.clientY;
		this.mousePositionY = Math.min(Math.max(this.mousePositionY, 0.0), document.documentElement.clientHeight);
	}
}