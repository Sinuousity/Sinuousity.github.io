console.info("[ +Module ] Notifications");

export class Notifications
{
	static instance = new Notifications();

	constructor()
	{
		this.history = [];
	}

	Add(message, color)
	{
		if (!message) return;

		var e_notify_banner_root = document.getElementById("notifybannerroot");
		if (!e_notify_banner_root) return;

		var e_banner = this.NewBanner(e_notify_banner_root, "div", "notifybanner", message);
		e_banner.addEventListener("click", () => { this.RemoveBanner(e_banner); });
		if (color) e_banner.style.backgroundColor = color;

		setTimeout(() => this.RemoveBanner(e_banner), 3000);
	}

	NewBanner(parent, kind, className, innerHTML)
	{
		var e = document.createElement(kind);
		if (className) e.className = className;
		if (innerHTML) e.innerHTML = innerHTML;
		if (parent) parent.appendChild(e);
		return e;
	}

	RemoveBanner(e_banner)
	{
		e_banner.style.pointerEvents = "none";
		this.fadeDeleteElement(e_banner, 0.5);
	}

	fadeDeleteElement(e, d)
	{
		if (!e) return;

		const frame_delta_ms = 20;
		const frame_delta_s = frame_delta_ms / 1000.0;

		var t = 1.0;
		var invd = 1.0 / d;
		var iid = window.setInterval(stepfadedelete, frame_delta_ms);

		function stepfadedelete()
		{
			t -= frame_delta_s * invd;
			t = Math.max(0.0, t);
			e.style.opacity = t;

			if (t <= 0.0)
			{
				window.clearInterval(iid);
				window.setTimeout(() => e.remove(), 250)
				return;
			}
		}
	}
}