import { EventSource } from "./eventsource.js";

console.info("[ +Module ] User Input");

export class UserInput
{
	static instance = new UserInput();
	static afterMousePositionChanged = new EventSource();

	constructor()
	{
		this.pressedLeftMouse = false;
		this.pressedRightMouse = false;
		this.mousePositionX = 0.0;
		this.mousePositionY = 0.0;
		this.mousePositionXUnclamped = 0.0;
		this.mousePositionYUnclamped = 0.0;
		this.mousePositionNormalizedX = 0.0;
		this.mousePositionNormalizedY = 0.0;
		this.mousePositionNormalizedXUnclamped = 0.0;
		this.mousePositionNormalizedYUnclamped = 0.0;
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
		var mouseDeltaXUnclamped = e.clientX - this.mousePositionXUnclamped;
		var mouseDeltaYUnclamped = e.clientY - this.mousePositionYUnclamped;

		this.mousePositionXUnclamped = e.clientX;
		this.mousePositionYUnclamped = e.clientY;

		this.mousePositionX = e.clientX;
		this.mousePositionY = e.clientY;

		this.mousePositionNormalizedXUnclamped = this.mousePositionX / document.documentElement.clientWidth;
		this.mousePositionNormalizedYUnclamped = this.mousePositionY / document.documentElement.clientHeight;

		this.mousePositionX = Math.min(Math.max(this.mousePositionXUnclamped, 0.0), document.documentElement.clientWidth);
		this.mousePositionY = Math.min(Math.max(this.mousePositionYUnclamped, 0.0), document.documentElement.clientHeight);

		this.mousePositionNormalizedX = this.mousePositionX / document.documentElement.clientWidth;
		this.mousePositionNormalizedY = this.mousePositionY / document.documentElement.clientHeight;

		UserInput.afterMousePositionChanged.Invoke();

		/*
		var glowposx = this.mousePositionNormalizedX * 100;
		var glowposy = this.mousePositionNormalizedY * 100;
		document.body.style.background = `radial-gradient(circle at ${glowposx}% ${glowposy}%, #1d1d1d 0px, #1b1b1b 700px)`;

		var tiltX = (this.mousePositionNormalizedX - 0.5) * 30;
		var tiltY = (this.mousePositionNormalizedY - 0.5) * 30;
		document.body.style.transform = `rotate3d(0,1,0,${tiltX}deg) rotate3d(1,0,0,${tiltY}deg)`;
		*/
	}
}