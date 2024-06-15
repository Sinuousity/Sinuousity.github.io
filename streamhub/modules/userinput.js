console.info("[ +Module ] User Input");

export class UserInput
{
	static instance = new UserInput();

	constructor()
	{
		this.pressedLeftMouse = false;
		this.pressedRightMouse = false;
		this.mousePositionX = 0.0;
		this.mousePositionY = 0.0;
		this.mousePositionXUnclamped = 0.0;
		this.mousePositionYUnclamped = 0.0;
		document.addEventListener("mousemove", (e) => { this.OnMousePosition(e); });
		document.addEventListener("mousedown", (e) => { this.OnMouseDown(e); });
		document.addEventListener("mouseup", (e) => { this.OnMouseUp(e); });
	}

	OnMouseUp(e)
	{
		if (e.button == 0) this.pressedLeftMouse = false;
		if (e.button == 1) this.pressedRightMouse = false;
	}

	OnMouseDown(e)
	{
		if (e.button == 0) this.pressedLeftMouse = true;
		if (e.button == 1) this.pressedRightMouse = true;
	}

	OnMousePosition(e)
	{
		this.mousePositionXUnclamped = e.clientX;
		this.mousePositionYUnclamped = e.clientY;
		this.mousePositionX = e.clientX;
		this.mousePositionX = Math.min(Math.max(this.mousePositionX, 0.0), document.documentElement.clientWidth);
		this.mousePositionY = e.clientY;
		this.mousePositionY = Math.min(Math.max(this.mousePositionY, 0.0), document.documentElement.clientHeight);
	}
}