import { addElement } from "../hubscript.js";
import { EventSource } from "./eventsource.js";
import { OptionManager } from "./globalsettings.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] Background Scene");
const key_option_active_profile_index = "background.scene.profile.active.index";
const key_option_background_scene_profiles = "background.scene.profiles";


export class BackgroundSceneLayer
{
	orderIndex = 0;
	enabled = true;
	name = "";
	type = "";
	data = {};

	constructor(id, type, data = {})
	{
		this.name = "";
		this.enabled = true;
		this.orderIndex = id;
		this.type = type;
		this.data = data;
	}

	static GetDefault() { return new BackgroundSceneLayer(0, "Solid Fill", { color: "black" }); }
}

export class BackgroundSceneProfile
{
	name = "";
	layers = [BackgroundSceneLayer.GetDefault()];

	constructor()
	{
		this.name = "";
		this.layers = [BackgroundSceneLayer.GetDefault()];
	}

	static GetDefault()
	{
		var bsp = new BackgroundSceneProfile();
		bsp.name = "Default";
		bsp.layers = [new BackgroundSceneLayer(0, "Solid Fill", { color: "black" })];
		return bsp;
	}
}

export class BackgroundScene
{
	static loadedProfiles = [BackgroundSceneProfile.GetDefault()];

	static activeProfileId = 0;
	static activeProfile = BackgroundScene.loadedProfiles[BackgroundScene.activeProfileId];

	static onProfileChanged = new EventSource();
	static onLayersChanged = new EventSource();
	static onLayerDataChanged = new EventSource();

	static created = false;
	static e_root = {};

	static LoadDefaultProfile()
	{
		BackgroundScene.loadedProfiles = [BackgroundSceneProfile.GetDefault()];
		BackgroundScene.activeProfileId = 0;
		BackgroundScene.activeProfile = BackgroundScene.loadedProfiles[BackgroundScene.activeProfileId];
		BackgroundScene.onProfileChanged.Invoke();
	}

	static LoadProfiles()
	{
		var opt = OptionManager.GetOption(key_option_background_scene_profiles);
		try
		{
			var json = opt.value;
			BackgroundScene.loadedProfiles = JSON.parse(json);
		}
		catch (e)
		{
			console.warn("LOAD ERROR : " + e);
			BackgroundScene.LoadDefaultProfile();
		}
		if (BackgroundScene.loadedProfiles === undefined) BackgroundScene.LoadDefaultProfile();

		BackgroundScene.activeProfileId = 0;
		var opt_active = OptionManager.GetOption(key_option_active_profile_index);
		BackgroundScene.activeProfileId = opt_active.value;
		if (BackgroundScene.activeProfileId < 0 || BackgroundScene.activeProfileId >= BackgroundScene.loadedProfiles.length)
		{
			OptionManager.SetOptionValue(key_option_active_profile_index, BackgroundScene.loadedProfiles.length - 1);
		}
		BackgroundScene.activeProfile = BackgroundScene.loadedProfiles[BackgroundScene.activeProfileId];


		BackgroundScene.EmitChange(true);
		BackgroundScene.onProfileChanged.Invoke();
	}

	static AddNewProfile()
	{
		BackgroundScene.loadedProfiles.push(BackgroundSceneProfile.GetDefault());
		BackgroundScene.EmitChange(false, false);
	}

	static MakeActiveIndexSafe()
	{
		if (BackgroundScene.activeProfileId < 0) BackgroundScene.activeProfileId = 0;
		if (BackgroundScene.activeProfileId >= BackgroundScene.loadedProfiles.length) BackgroundScene.activeProfileId = BackgroundScene.loadedProfiles.length - 1;
	}

	static SetActiveProfileIndex(activeId, addIfOutside = true)
	{
		if (activeId < 0) return;
		if (activeId >= BackgroundScene.loadedProfiles.length) 
		{
			if (!addIfOutside) return;
			activeId = BackgroundScene.loadedProfiles.length;
			var l = BackgroundSceneProfile.GetDefault();
			l.name = "Profile " + activeId;
			BackgroundScene.loadedProfiles.push(l);
		}
		BackgroundScene.activeProfileId = activeId;
		BackgroundScene.activeProfile = BackgroundScene.loadedProfiles[BackgroundScene.activeProfileId];
		OptionManager.SetOptionValue(key_option_active_profile_index, BackgroundScene.activeProfileId);
		BackgroundScene.EmitChange(false, false);
		BackgroundScene.onProfileChanged.Invoke();
	}

	static DeleteActiveProfile()
	{
		BackgroundScene.loadedProfiles.splice(BackgroundScene.activeProfileId, 1);

		BackgroundScene.MakeActiveIndexSafe();
		BackgroundScene.activeProfile = BackgroundScene.loadedProfiles[BackgroundScene.activeProfileId];
		OptionManager.SetOptionValue(key_option_active_profile_index, BackgroundScene.activeProfileId);

		BackgroundScene.EmitChange(false, false);
		BackgroundScene.onProfileChanged.Invoke();
	}

	static SaveProfiles()
	{
		var json = JSON.stringify(BackgroundScene.loadedProfiles);
		OptionManager.SetOptionValue(key_option_background_scene_profiles, json);
	}

	static EmitChange(skipSave = false, onlyData = false)
	{
		BackgroundScene.ReassignLayerOrderIndices();
		if (!skipSave) BackgroundScene.SaveProfiles();
		if (onlyData) BackgroundScene.onLayerDataChanged.Invoke();
		else BackgroundScene.onLayersChanged.Invoke();

		BackgroundScene.Recreate();
	}

	static AddLayer(layer)
	{
		BackgroundScene.activeProfile.layers.push(layer);
		BackgroundScene.EmitChange();
	}

	static RemoveLayerAtIndex(layerIndex)
	{
		BackgroundScene.activeProfile.layers.splice(layerIndex, 1);
		BackgroundScene.EmitChange();
	}

	static CloneLayer(layerIndex)
	{
		var prevLayer = BackgroundScene.activeProfile.layers[layerIndex];
		var newLayer = new BackgroundSceneLayer(prevLayer.orderIndex, prevLayer.type, {});
		Object.assign(newLayer.data, prevLayer.data);

		if (prevLayer.name.length > 0) newLayer.name = prevLayer.name + " Copy";
		else newLayer.name = prevLayer.type + " Copy";

		BackgroundScene.activeProfile.layers.splice(layerIndex, 0, newLayer);

		BackgroundScene.EmitChange();
	}

	static MoveLayer(layerIndex = 0, direction = 1)
	{
		var targetIndex = layerIndex + direction;
		if (targetIndex == layerIndex) return;
		if (targetIndex < 0 || targetIndex >= BackgroundScene.activeProfile.layers.length) return;

		var oldLayerIndex = BackgroundScene.activeProfile.layers[layerIndex].orderIndex;
		var newLayerIndex = BackgroundScene.activeProfile.layers[targetIndex].orderIndex;
		BackgroundScene.activeProfile.layers[layerIndex].orderIndex = newLayerIndex;
		BackgroundScene.activeProfile.layers[targetIndex].orderIndex = oldLayerIndex;
		BackgroundScene.ApplyLayerOrder();

		BackgroundScene.EmitChange();
	}

	static ReassignLayerOrderIndices()
	{
		for (var layerIndex = 0; layerIndex < BackgroundScene.activeProfile.layers.length; layerIndex++)
		{
			var layer = BackgroundScene.activeProfile.layers[layerIndex];
			layer.orderIndex = Number(layerIndex);
		}
	}

	static ApplyLayerOrder()
	{
		BackgroundScene.activeProfile.layers.sort((a, b) => { return BackgroundScene.CompareLayerOrders(a, b); });
	}

	static CompareLayerOrders(layerA, layerB)
	{
		if (layerA.orderIndex === layerB.orderIndex) return 0;
		if (layerA.orderIndex > layerB.orderIndex) return 1;
		return -1;
	}

	static Recreate()
	{
		BackgroundScene.Release();
		BackgroundScene.Create();
	}

	static Create()
	{
		if (BackgroundScene.created) return;
		BackgroundScene.created = true;

		var e_fader = document.getElementById("site-fader");
		BackgroundScene.e_root = addElement("div", null, document.body);
		document.body.appendChild(e_fader);
		BackgroundScene.e_root.style.zIndex = "-1000";
		BackgroundScene.e_root.style.position = "fixed";
		BackgroundScene.e_root.style.inset = "0";
		BackgroundScene.e_root.style.backgroundColor = "transparent";
		BackgroundScene.e_root.style.overflow = "hidden";
		BackgroundScene.e_root.style.borderRadius = "0.396rem";

		for (var layerIndex = 0; layerIndex < BackgroundScene.activeProfile.layers.length; layerIndex++)
		{
			BackgroundScene.AppendLayer(BackgroundScene.activeProfile.layers[layerIndex]);
		}
	}

	static Release()
	{
		if (!BackgroundScene.created) return;
		BackgroundScene.created = false;

		if (BackgroundScene.e_root.remove) BackgroundScene.e_root.remove();
		BackgroundScene.e_root = {};
	}

	static AppendLayer(layerInfo)
	{
		if (!layerInfo.enabled) return;

		var e_layer = {};
		switch (layerInfo.type)
		{
			case "Solid Fill":
				e_layer = document.createElement("div");
				e_layer.style.position = "absolute";
				e_layer.style.inset = "0";
				if (layerInfo.data.color) e_layer.style.backgroundColor = layerInfo.data.color;
				break;

			case "Gradient Fill":
				e_layer = document.createElement("div");
				e_layer.style.position = "absolute";
				e_layer.style.inset = "0";
				if (layerInfo.data.gradient) e_layer.style.background = layerInfo.data.gradient;
				break;

			case "Filter Layer":
				e_layer = document.createElement("div");
				e_layer.style.position = "absolute";
				e_layer.style.inset = "0";
				if (layerInfo.data.filter) e_layer.style.backdropFilter = layerInfo.data.filter;
				break;

			case "Pattern":
				e_layer = document.createElement("div");
				e_layer.style.position = "absolute";
				e_layer.style.inset = "0";
				if (layerInfo.data.src) e_layer.style.backgroundImage = layerInfo.data.src;

				var sclx = 1;
				var scly = 1;
				if (layerInfo.data.scaleX) sclx = layerInfo.data.scaleX;
				if (layerInfo.data.scaleY) scly = layerInfo.data.scaleY;
				e_layer.style.backgroundSize = `${sclx}rem ${scly}rem`;
				e_layer.style.backgroundPosition = `-${sclx / 2}rem 0rem`;

				if (layerInfo.data.opacity) e_layer.style.opacity = layerInfo.data.opacity + "%";

				if (layerInfo.data.speedX && Math.abs(layerInfo.data.speedX) > 0.01)
				{

					e_layer.style.animation = "backgroundscene-pattern-scroll";
					e_layer.style.animationDuration = "10s";
					if (layerInfo.data.speedX) e_layer.style.animationDuration = (10.0 / (Math.abs(layerInfo.data.speedX) + 0.01)) + "s";
					e_layer.style.animationIterationCount = "infinite";
					e_layer.style.animationTimingFunction = "linear";
					e_layer.style.animationDirection = layerInfo.data.speedX >= 0.0 ? "normal" : "reverse";
				}

				if (layerInfo.data.blur && layerInfo.data.blur > 0) e_layer.style.filter = "blur(" + layerInfo.data.blur + "px)";
				break;

			case "Image":
				e_layer = document.createElement("img");
				e_layer.style.position = "absolute";
				e_layer.style.top = "50%";
				e_layer.style.left = "50%";

				var posx = -50;
				var posy = -50;
				if (layerInfo.data.positionX) posx += Number(layerInfo.data.positionX) * 20;
				if (layerInfo.data.positionY) posy += Number(layerInfo.data.positionY) * 20;
				e_layer.style.transform = `translate(${posx}%, ${posy}%)`;

				var sclx = 100;
				var scly = 100;
				if (layerInfo.data.scaleX) sclx = Number(layerInfo.data.scaleX);
				if (layerInfo.data.scaleY) scly = Number(layerInfo.data.scaleY);
				e_layer.style.transform += ` scale(${sclx}%, ${scly}%)`;

				if (layerInfo.data.src) e_layer.src = layerInfo.data.src;
				if (layerInfo.data.scaleX) e_layer.style.transform += " scale(" + layerInfo.data.scale + "%)";
				if (layerInfo.data.blur && layerInfo.data.blur > 0) e_layer.style.filter = "blur(" + layerInfo.data.blur + "px)";
				if (layerInfo.data.opacity) e_layer.style.opacity = layerInfo.data.opacity + "%";
				break;

			case "Video":
				e_layer = document.createElement("video");

				var e_video_src_mp4 = document.createElement("source");
				e_video_src_mp4.type = "video/mp4";
				e_layer.appendChild(e_video_src_mp4);

				e_layer.muted = true;
				e_layer.autoplay = true;
				e_layer.loop = true;
				e_layer.playbackRate = 0.9;
				e_layer.style.position = "absolute";
				e_layer.style.top = "50%";
				e_layer.style.left = "50%";

				e_layer.style.overflow = "hidden";

				var posx = -50;
				var posy = -50;
				if (layerInfo.data.positionX) posx += Number(layerInfo.data.positionX) * 20;
				if (layerInfo.data.positionY) posy += Number(layerInfo.data.positionY) * 20;
				e_layer.style.transform = `translate(${posx}%, ${posy}%)`;

				var sclx = 100;
				var scly = 100;
				if (layerInfo.data.scaleX) sclx = Number(layerInfo.data.scaleX);
				if (layerInfo.data.scaleY) scly = Number(layerInfo.data.scaleY);
				e_layer.style.transform += ` scale(${sclx}%, ${scly}%)`;

				if (layerInfo.data.src) e_video_src_mp4.src = layerInfo.data.src;
				if (layerInfo.data.scaleX) e_layer.style.transform += " scale(" + layerInfo.data.scale + "%)";
				if (layerInfo.data.blur && layerInfo.data.blur > 0) e_layer.style.filter = "blur(" + layerInfo.data.blur + "px)";
				if (layerInfo.data.opacity) e_layer.style.opacity = layerInfo.data.opacity + "%";
				break;
		}
		e_layer.style.mixBlendMode = layerInfo.data.blendMode ?? "normal";
		e_layer.style.borderRadius = (layerInfo.data.borderRadius ?? "0") + "%";
		e_layer.style.pointerEvents = "none";
		e_layer.style.userSelect = "none";
		e_layer.draggable = false;
		BackgroundScene.e_root.appendChild(e_layer);
		return e_layer;
	}

	static GetLayerDataString(layerInfo)
	{
		switch (layerInfo.type)
		{
			case "Solid Fill": return layerInfo.data.color;
			case "Gradient Fill": return layerInfo.data.gradient;
			case "Filter Layer": return layerInfo.data.filter;
			case "Image": return layerInfo.data.src;
		}
		return "";
	}

	static SetLayerDataString(layerId, newData)
	{
		const l = BackgroundScene.activeProfile.layers[layerId];
		switch (l.type)
		{
			case "Solid Fill": l.data.color = newData; break;
			case "Gradient Fill": l.data.gradient = newData; break;
			case "Filter Layer": l.data.filter = newData; break;
			case "Image": l.data.src = newData; break;
			case "Video": l.data.src = newData; break;
		}
	}
}

class LayerListItem
{
	constructor(window, layerId, e_list_container)
	{
		this.window = window;
		this.layerId = layerId;

		this.e_parent = e_list_container;
		this.e_root = {};
		this.e_row = {};
		this.e_lbl = {};
		this.e_btn_move_up = {};
		this.e_btn_move_down = {};
		this.e_btn_copy = {};
		this.e_btn_delete = {};
		this.CreateItemRow();

		e_list_container.appendChild(this.e_root);

		this.expanded = false;
		this.e_optionsRoot = {};
	}

	CreateItemRow()
	{
		var layer = this.GetLayer();

		this.e_root = addElement("div", null, this.e_parent);
		this.e_root.style.cursor = "pointer";
		this.e_root.style.position = "relative";
		this.e_root.style.padding = "3px";
		this.e_root.style.maxWidth = "100%";
		this.e_root.style.display = "flex";
		this.e_root.style.flexDirection = "column";
		this.e_root.style.height = "1.5rem";
		this.e_root.style.lineHeight = "1rem";
		this.e_root.style.backgroundColor = "transparent";
		this.e_root.style.border = "solid transparent 2px";
		this.e_root.addEventListener("mouseenter", x => { this.e_root.style.backgroundColor = "#ffffff10"; });
		this.e_root.addEventListener("mouseleave", x => { this.e_root.style.backgroundColor = "transparent"; });
		this.e_root.addEventListener("click", x => { this.ToggleExpandOptions(); });

		var layerDesc = (layer.name != "") ? (layer.type + "  (" + layer.name + ")") : (layer.type + " (unnamed)");
		GlobalTooltip.RegisterReceiver(this.e_root, layerDesc, layerDesc);

		this.e_row = addElement("div", null, this.e_root);
		this.e_row.style.display = "flex";
		this.e_row.style.alignItems = "center";
		this.e_row.style.flexDirection = "row";
		this.e_row.style.flexGrow = "0.0";
		this.e_row.style.flexShrink = "0.0";

		this.e_btn_move_up = this.AddLayerListItemButton(this.e_row, "Move Layer up", "gray", "expand_less");
		this.e_btn_move_up.addEventListener("click", () => { BackgroundScene.MoveLayer(this.layerId, -1); });

		this.e_btn_toggle_enabled = this.AddLayerListItemButton(this.e_row, "Toggle Enabled", layer.enabled === true ? "green" : "darkred", layer.enabled === true ? "power_settings_new" : " ");
		this.e_btn_toggle_enabled.addEventListener(
			"click",
			e =>
			{
				layer.enabled = !layer.enabled;
				this.e_btn_toggle_enabled.style.backgroundColor = layer.enabled === true ? "green" : "darkred";
				this.e_btn_toggle_enabled.children[0].innerText = layer.enabled === true ? "power_settings_new" : " ";
				BackgroundScene.EmitChange(false, true);
				e.stopPropagation();
			}
		);

		this.e_btn_move_down = this.AddLayerListItemButton(this.e_row, "Move Layer down", "gray", "expand_more");
		this.e_btn_move_down.addEventListener("click", () => { BackgroundScene.MoveLayer(this.layerId, 1); });

		this.e_lbl = addElement("div", null, this.e_row, layer.orderIndex + " " + ((typeof layer.name != 'string' || layer.name === "") ? layer.type : layer.name));
		this.e_lbl.style.paddingLeft = "0.25rem";
		this.e_lbl.style.lineHeight = "1.5rem";
		this.e_lbl.style.textAlign = "left";
		this.e_lbl.style.flexGrow = "1.0";
		this.e_lbl.style.flexShrink = "1.0";
		this.e_lbl.style.overflow = "hidden";
		this.e_lbl.style.textOverflow = "ellipsis";
		this.e_lbl.style.textWrap = "nowrap";
		this.e_root.addEventListener("mouseenter", x => { this.e_lbl.style.paddingLeft = "0.5rem"; });
		this.e_root.addEventListener("mouseleave", x => { this.e_lbl.style.paddingLeft = "0.25rem"; });

		this.e_btn_copy = this.AddLayerListItemButton(this.e_row, "Copy Layer", "#0055ffff", "add_to_photos");
		this.e_btn_copy.addEventListener("click", () => { BackgroundScene.CloneLayer(this.layerId); });

		this.e_btn_delete = this.AddLayerListItemButton(this.e_row, "Delete Layer", "#bb1100ff", "close");
		this.e_btn_delete.addEventListener("click", () => { BackgroundScene.RemoveLayerAtIndex(this.layerId); });
	}

	GetLayer() { return BackgroundScene.activeProfile.layers[this.layerId]; }

	ToggleExpandOptions()
	{
		if (this.expanded) this.CollapseOptions();
		else this.ExpandOptions();
	}

	ExpandOptions()
	{
		if (this.expanded) return;

		this.window.CollapseAllListItems();

		const l = this.GetLayer();
		this.expanded = true;
		this.e_root.style.height = "auto";
		this.e_root.style.border = "solid gray 2px";
		this.e_root.style.borderRadius = "0.125rem";

		this.e_optionsRoot = addElement("div", null, this.e_root);
		this.e_optionsRoot.style.display = "flex";
		this.e_optionsRoot.style.alignItems = "center";
		this.e_optionsRoot.style.flexDirection = "column";
		this.e_optionsRoot.style.flexGrow = "1.0";
		this.e_optionsRoot.style.padding = "0.5rem";

		if (!l) return;
		if (!l.type) return;

		switch (l.type)
		{
			case "Solid Fill":
				this.AddTextInput("Layer Name", l.name, x => { l.name = x; BackgroundScene.EmitChange(true, false); });
				this.AddTextInput("Color", l.data.color, x => { l.data.color = x; });
				this.AddSlider("Opacity", 0, 100, 1, l.data.opacity ?? 100, x => { l.data.opacity = x; });
				this.AddSlider("Border Radius", 0, 100, 1, l.data.borderRadius ?? 0, x => { l.data.borderRadius = x; });
				this.AddTextInput("Blend Mode", l.data.blendMode ?? "", x => { l.data.blendMode = x; });
				break;

			case "Gradient Fill":
				this.AddTextInput("Layer Name", l.name, x => { l.name = x; BackgroundScene.EmitChange(true, false); });
				this.AddTextInput("Gradient CSS", l.data.gradient, x => { l.data.gradient = x; });
				this.AddSlider("Opacity", 0, 100, 1, l.data.opacity ?? 100, x => { l.data.opacity = x; });
				this.AddSlider("Border Radius", 0, 100, 1, l.data.borderRadius ?? 0, x => { l.data.borderRadius = x; });
				this.AddTextInput("Blend Mode", l.data.blendMode ?? "", x => { l.data.blendMode = x; });
				break;

			case "Filter Layer":
				this.AddTextInput("Layer Name", l.name, x => { l.name = x; BackgroundScene.EmitChange(true, false); });
				this.AddTextInput("Filter CSS", l.data.filter, x => { l.data.filter = x; });
				break;

			case "Pattern":
				this.AddTextInput("Layer Name", l.name, x => { l.name = x; BackgroundScene.EmitChange(true, false); });
				this.AddTextInput("Background Image CSS", l.data.src, x => { l.data.src = x; });
				this.AddSlider("Scale X", 1, 30, 1, l.data.scaleX ?? 10, x => { l.data.scaleX = x; });
				this.AddSlider("Scale Y", 1, 30, 1, l.data.scaleY ?? 10, x => { l.data.scaleY = x; });
				this.AddSlider("Speed X", -1.0, 1.0, 0.1, l.data.speedX ?? 0.0, x => { l.data.speedX = x; });
				//this.AddSlider("Speed Y", -1.0, 1.0, 0.1, l.data.speedY ?? 0.0, x => { l.data.speedY = x; });
				this.AddSlider("Blur", 0, 20, 1, l.data.blur ?? 0, x => { l.data.blur = x; });
				this.AddSlider("Opacity", 0, 100, 1, l.data.opacity ?? 100, x => { l.data.opacity = x; });
				this.AddTextInput("Blend Mode", l.data.blendMode ?? "", x => { l.data.blendMode = x; });
				break;

			case "Image":
				this.AddTextInput("Layer Name", l.name, x => { l.name = x; BackgroundScene.EmitChange(true, false); });
				this.AddTextInput("Image URL", l.data.src, x => { l.data.src = x; });
				this.AddSlider("Position X", -10, 10, 0.1, l.data.positionX ?? 0, x => { l.data.positionX = x; });
				this.AddSlider("Position Y", -10, 10, 0.1, l.data.positionY ?? 0, x => { l.data.positionY = x; });
				this.AddSlider("Scale X", 5, 600, 5, l.data.scaleX ?? 100, x => { l.data.scaleX = x; });
				this.AddSlider("Scale Y", 5, 600, 5, l.data.scaleY ?? 100, x => { l.data.scaleY = x; });
				this.AddSlider("Blur", 0, 20, 0.25, l.data.blur ?? 0, x => { l.data.blur = x; });
				this.AddSlider("Opacity", 0, 100, 1, l.data.opacity ?? 100, x => { l.data.opacity = x; });
				this.AddSlider("Border Radius", 0, 100, 1, l.data.borderRadius ?? 0, x => { l.data.borderRadius = x; });
				this.AddTextInput("Blend Mode", l.data.blendMode ?? "", x => { l.data.blendMode = x; });
				break;

			case "Video":
				this.AddTextInput("Layer Name", l.name, x => { l.name = x; BackgroundScene.EmitChange(true, false); });
				this.AddTextInput("Video URL", l.data.src ?? "https://i.imgur.com/BWYPTQP.mp4", x => { l.data.src = x; });
				this.AddSlider("Position X", -10, 10, 0.1, l.data.positionX ?? 0, x => { l.data.positionX = x; });
				this.AddSlider("Position Y", -10, 10, 0.1, l.data.positionY ?? 0, x => { l.data.positionY = x; });
				this.AddSlider("Scale X", 5, 600, 5, l.data.scaleX ?? 100, x => { l.data.scaleX = x; });
				this.AddSlider("Scale Y", 5, 600, 5, l.data.scaleY ?? 100, x => { l.data.scaleY = x; });
				this.AddSlider("Blur", 0, 20, 0.25, l.data.blur ?? 0, x => { l.data.blur = x; });
				this.AddSlider("Opacity", 0, 100, 1, l.data.opacity ?? 100, x => { l.data.opacity = x; });
				this.AddSlider("Border Radius", 0, 100, 1, l.data.borderRadius ?? 0, x => { l.data.borderRadius = x; });
				this.AddTextInput("Blend Mode", l.data.blendMode ?? "", x => { l.data.blendMode = x; });
				break;
		}
	}

	CollapseOptions()
	{
		if (!this.expanded) return;
		this.expanded = false;
		this.e_root.style.height = "1.4rem";
		this.e_root.style.border = "solid transparent 2px";
		this.e_optionsRoot.remove();
		this.e_optionsRoot = {};
	}

	AddTextInput(label, initValue, onChange = x => { })
	{
		const e_field_root = addElement("div", null, this.e_optionsRoot);
		GlobalTooltip.RegisterReceiver(e_field_root, label, label);
		e_field_root.style.position = "relative";
		e_field_root.style.flexGrow = "1.0";
		e_field_root.style.flexShrink = "1.0";
		e_field_root.style.width = "100%";
		e_field_root.style.height = "2rem";
		e_field_root.value = initValue;
		e_field_root.addEventListener("click", e => { e.stopPropagation(); });

		const e_field = addElement("input", null, e_field_root);
		const e_label = addElement("div", null, e_field_root, label);

		e_field.type = "text";
		e_field.value = initValue;

		e_field.style.pointerEvents = "all";
		e_field.style.position = "absolute";
		e_field.style.top = "0.1rem";
		e_field.style.bottom = "0.1rem";
		e_field.style.left = "0.1rem";
		e_field.style.right = "0.1rem";
		e_field.style.opacity = "0.2";
		e_field.style.textAlign = "center";

		e_field.addEventListener("click", e => { e.stopPropagation(); });
		e_field.addEventListener("change", e =>
		{
			onChange(e_field.value);
			BackgroundScene.EmitChange(false, true);
		});

		e_label.style.position = "absolute";
		e_label.style.top = "0";
		e_label.style.left = "0";
		e_label.style.letterSpacing = "0.1rem";
		e_label.style.width = "100%";
		e_label.style.height = "100%";
		e_label.style.lineHeight = "2rem";
		e_label.style.pointerEvents = "none";
		e_label.style.userSelect = "none";
		e_label.style.fontSize = "0.7rem";
		e_label.style.textAlign = "center";
		e_label.style.color = "#ff9b00ff";
		e_label.style.borderRadius = "0.5rem";
		e_label.style.backgroundColor = "#00000050";
		e_label.style.transitionProperty = "opacity";
		e_label.style.transitionDuration = "0.1s";
		e_label.style.transitionTimingFunction = "ease-in-out";

		e_field_root.addEventListener(
			"mouseenter",
			e =>
			{
				e_field.style.opacity = "1.0";
				e_label.style.opacity = "0.0";
			}
		);
		e_field_root.addEventListener(
			"mouseleave",
			e =>
			{
				e_field.style.opacity = "0.2";
				e_label.style.opacity = "1.0";
			}
		);
	}

	AddSlider(label, min, max, step, initValue, onChange = x => { })
	{
		const e_slider_root = addElement("div", null, this.e_optionsRoot);
		GlobalTooltip.RegisterReceiver(e_slider_root, label, label);
		e_slider_root.title = initValue;
		e_slider_root.style.position = "relative";
		e_slider_root.style.flexGrow = "1.0";
		e_slider_root.style.flexShrink = "1.0";
		e_slider_root.style.width = "100%";
		e_slider_root.style.height = "1.5rem";
		e_slider_root.value = initValue;
		e_slider_root.addEventListener("click", e => { e.stopPropagation(); });

		const e_slider = addElement("input", null, e_slider_root);
		const e_label = addElement("div", null, e_slider_root, label);

		e_slider.type = "range";
		e_slider.min = min;
		e_slider.max = max;
		e_slider.step = step;
		e_slider.style.pointerEvents = "all";
		e_slider.style.position = "absolute";
		e_slider.style.top = "0.1rem";
		e_slider.style.bottom = "0.1rem";
		e_slider.style.left = "0.1rem";
		e_slider.style.right = "0.1rem";
		e_slider.style.cursor = "pointer";
		e_slider.style.opacity = "0.2";
		e_slider.value = initValue;
		e_slider.addEventListener("click", e => { e.stopPropagation(); });
		e_slider.addEventListener("change", e =>
		{
			e_slider_root.title = e_slider.value;
			onChange(e_slider.value);
			BackgroundScene.EmitChange(false, true);
		});

		e_label.style.position = "absolute";
		e_label.style.top = "0";
		e_label.style.left = "0";
		e_label.style.letterSpacing = "0.1rem";
		e_label.style.width = "100%";
		e_label.style.height = "100%";
		e_label.style.lineHeight = "1.5rem";
		e_label.style.pointerEvents = "none";
		e_label.style.userSelect = "none";
		e_label.style.textAlign = "center";
		e_label.style.color = "#ff9b00ff";
		e_label.style.borderRadius = "0.5rem";
		e_label.style.fontSize = "0.7rem";
		e_label.style.backgroundColor = "#00000050";
		e_label.style.transitionProperty = "opacity";
		e_label.style.transitionDuration = "0.1s";
		e_label.style.transitionTimingFunction = "ease-in-out";

		e_slider_root.addEventListener(
			"mouseenter",
			e =>
			{
				e_slider.style.opacity = "1.0";
				e_label.style.opacity = "0.0";
			}
		);
		e_slider_root.addEventListener(
			"mouseleave",
			e =>
			{
				e_slider.style.opacity = "0.2";
				e_label.style.opacity = "1.0";
			}
		);

		return e_slider;
	}

	AddLayerListItemButton(e_parent, title, color = "gray", icon = "")
	{
		var e = addElement("div", null, e_parent);

		e.style.borderRadius = "0.2rem";
		e.style.backgroundColor = color;
		e.style.width = "1rem";
		e.style.height = "1rem";
		e.style.flexGrow = "0.0";
		e.style.flexShrink = "0.0";
		e.style.transform = "scale(90%)";
		e.addEventListener("mouseenter", x => { e.style.transform = "scale(100%)"; });
		e.addEventListener("mouseleave", x => { e.style.transform = "scale(90%)"; });

		GlobalTooltip.RegisterReceiver(e, title, title);

		if (icon != "")
		{
			var i = addElement("i", null, e, icon);
			i.style.position = "absolute";
			i.style.top = "0";
			i.style.bottom = "0";
			i.style.left = "0";
			i.style.right = "0";
			i.style.width = "1rem";
			i.style.height = "1rem";
			i.style.lineHeight = "1rem";
			i.style.fontSize = "0.9rem";
			i.style.textAlign = "center";
			i.style.fontStyle = "normal";
			i.style.fontFamily = "'Material Icons'";
			i.style.color = "#ffffff90";
			i.style.fontWeight = "normal";
		}
		return e;
	}
}

export class BackgroundSceneSettingsWindow extends DraggableWindow
{
	static window_kind = "Background Scene";
	constructor(pos_x, pos_y)
	{
		super("Background Scene", pos_x, pos_y);
		this.e_window_root.style.minWidth = "300px";
		this.e_window_root.style.minHeight = "300px";
		this.SetTitle("Background Scene");
		this.SetIcon("gradient");
		this.window_kind = BackgroundSceneSettingsWindow.window_kind;

		this.CreateContentContainer();
		this.e_content.style.display = "flex";
		this.e_content.style.flexDirection = "column";

		this.CreateProfileSelection();

		this.listItems = [];
		this.CreateLayerListContainer();

		this.e_listButtons = addElement("div", null, this.e_content);
		this.e_listButtons.style.position = "relative";
		this.e_listButtons.style.height = "3rem";
		this.e_listButtons.style.flexGrow = "0.0";
		this.e_listButtons.style.flexShrink = "0.0";
		this.e_listButtons.style.borderTop = "solid #505050 2px";
		this.e_listButtons.style.display = "flex";
		this.e_listButtons.style.flexDirection = "row";
		this.e_listButtons.style.alignItems = "center";
		this.e_listButtons.style.justifyContent = "center";

		this.e_btn_solid = this.AddLayerButton(
			"Solid Fill",
			"format_color_fill",
			() => { return { color: "gray" } },
			"Add a solid fill layer. One color"
		);
		this.e_btn_gradient = this.AddLayerButton(
			"Gradient Fill",
			"gradient",
			() => { return { gradient: "linear-gradient(0deg, white, transparent)" } },
			"Add a gradient layer. Any valid CSS gradient."
		);
		this.e_btn_image = this.AddLayerButton(
			"Image",
			"insert_photo",
			() => { return { src: "./../streamhub/images/nobody.png" } },
			"Add a centered image, use a URL for an image from the web"
		);
		this.e_btn_video = this.AddLayerButton(
			"Video",
			"live_tv",
			() => { return { src: "https://i.imgur.com/BWYPTQP.mp4" } },
			"Add a centered video, use a URL for a video from the web"
		);
		this.e_btn_pattern = this.AddLayerButton(
			"Pattern",
			"apps",
			() =>
			{
				return {
					src: "url(./../streamhub/images/nobody.png)",
					scaleX: 10,
					scaleY: 10,
					speedX: 0.0,
					speedY: 0.0,
					opacity: 1.0
				}
			},
			"Add a repeating image pattern, use 'url( [YOUR URL] )' to use an image from the web"
		);
		this.e_btn_filter = this.AddLayerButton(
			"Filter Layer",
			"filter_b_and_w",
			() => { return { filter: "hue-rotate(35deg)" } },
			"Add a layer that applies a filter to layers behind it."
		);

		this.RefreshLayerList();
		BackgroundScene.onLayersChanged.RequestSubscription(() => { this.RefreshLayerList(); this.RefreshProfileButtons(); });
		BackgroundScene.onLayerDataChanged.RequestSubscription(() => { this.RefreshLayerList(false); this.RefreshProfileButtons(); });
		BackgroundScene.onProfileChanged.RequestSubscription(() => { this.e_name_input.innerText = BackgroundScene.activeProfile.name; });
	}

	CreateProfileSelection()
	{
		this.e_profile_root = addElement("div", null, this.e_content);
		this.e_profile_root.style.backgroundColor = "#ffffff07";
		this.e_profile_root.style.position = "relative";
		this.e_profile_root.style.marginLeft = "1rem";
		this.e_profile_root.style.marginRight = "1rem";
		this.e_profile_root.style.height = "2rem";
		this.e_profile_root.style.lineHeight = "2rem";
		this.e_profile_root.style.borderRadius = "0rem 0rem 0.8rem 0.8rem";
		this.e_profile_root.style.borderLeft = "2px solid #505050ff";
		this.e_profile_root.style.borderRight = "2px solid #505050ff";
		this.e_profile_root.style.borderBottom = "2px solid #505050ff";

		this.e_name_input = addElement("input", null, this.e_profile_root);
		GlobalTooltip.RegisterReceiver(this.e_name_input, "Active Profile Name", "Active Profile Name");
		this.e_name_input.type = "text";
		this.e_name_input.value = BackgroundScene.activeProfile.name ?? "Default";
		this.e_name_input.style.position = "absolute";
		this.e_name_input.style.left = "3.5rem";
		this.e_name_input.style.right = "3.5rem";
		this.e_name_input.style.top = "0";
		this.e_name_input.style.bottom = "0";
		this.e_name_input.style.textAlign = "center";
		this.e_name_input.style.borderRadius = "0 !important";
		this.e_name_input.addEventListener("key", e => { if (e.key == 'escape') this.e_name_input.remove(); });
		this.e_name_input.addEventListener(
			"change",
			x =>
			{
				BackgroundScene.activeProfile.name = this.e_name_input.value;
				BackgroundScene.EmitChange(false, false);
			}
		);

		this.e_btn_profile_prev = addElement("div", null, this.e_profile_root);
		this.e_btn_profile_prev.innerText = "PREV";
		GlobalTooltip.RegisterReceiver(this.e_btn_profile_prev, "Previous Profile", "Switch Back To The Previous Profile");
		this.e_btn_profile_prev.style.cursor = "pointer";
		this.e_btn_profile_prev.style.position = "absolute";
		this.e_btn_profile_prev.style.width = "3.5rem";
		this.e_btn_profile_prev.style.height = "2rem";
		this.e_btn_profile_prev.style.lineHeight = "2rem";
		this.e_btn_profile_prev.style.left = "0rem";
		this.e_btn_profile_prev.style.top = "0";
		this.e_btn_profile_prev.style.textAlign = "center";
		this.e_btn_profile_prev.style.fontSize = "0.7rem";
		this.e_btn_profile_prev.style.color = "#00aaaaff";
		this.e_btn_profile_prev.style.backgroundColor = "#00aaaa30";
		this.e_btn_profile_prev.style.borderRadius = "0 0 0 0.5rem";
		this.e_btn_profile_prev.style.opacity = "60%";
		this.e_btn_profile_prev.addEventListener("mouseenter", e => { this.e_btn_profile_prev.style.opacity = "100%"; });
		this.e_btn_profile_prev.addEventListener("mouseleave", e => { this.e_btn_profile_prev.style.opacity = "60%"; });
		this.e_btn_profile_prev.addEventListener(
			"click",
			x =>
			{
				BackgroundScene.SetActiveProfileIndex(BackgroundScene.activeProfileId - 1);
				this.RefreshProfileButtons();
			}
		);

		this.e_btn_profile_next = addElement("div", null, this.e_profile_root);
		this.e_btn_profile_next.style.cursor = "pointer";
		this.e_btn_profile_next.innerText = "NEXT";
		GlobalTooltip.RegisterReceiver(this.e_btn_profile_next, "Next Profile", "Switch Back To The Next Profile");
		this.e_btn_profile_next.style.position = "absolute";
		this.e_btn_profile_next.style.width = "3.5rem";
		this.e_btn_profile_next.style.height = "1rem";
		this.e_btn_profile_next.style.lineHeight = "1rem";
		this.e_btn_profile_next.style.right = "0";
		this.e_btn_profile_next.style.top = "0";
		this.e_btn_profile_next.style.textAlign = "center";
		this.e_btn_profile_next.style.fontSize = "0.6rem";
		this.e_btn_profile_next.style.color = "#00ff00ff";
		this.e_btn_profile_next.style.backgroundColor = "#00ff0030";
		this.e_btn_profile_next.style.borderRadius = "0rem";
		this.e_btn_profile_next.style.opacity = "60%";
		this.e_btn_profile_next.addEventListener("mouseenter", e => { this.e_btn_profile_next.style.opacity = "100%"; });
		this.e_btn_profile_next.addEventListener("mouseleave", e => { this.e_btn_profile_next.style.opacity = "60%"; });
		this.e_btn_profile_next.addEventListener(
			"click",
			x =>
			{
				BackgroundScene.SetActiveProfileIndex(BackgroundScene.activeProfileId + 1);
				this.RefreshProfileButtons();
			}
		);

		this.e_btn_profile_remove = addElement("div", null, this.e_profile_root);
		this.e_btn_profile_remove.style.cursor = "pointer";
		this.e_btn_profile_remove.innerText = "DELETE";
		GlobalTooltip.RegisterReceiver(this.e_btn_profile_remove, "Delete Profile", "Delete The Current Profile");
		this.e_btn_profile_remove.style.position = "absolute";
		this.e_btn_profile_remove.style.width = "3.5rem";
		this.e_btn_profile_remove.style.height = "1rem";
		this.e_btn_profile_remove.style.lineHeight = "1rem";
		this.e_btn_profile_remove.style.fontSize = "0.6rem";
		this.e_btn_profile_remove.style.borderRadius = "0rem 0rem 0.5rem 0rem";
		this.e_btn_profile_remove.style.color = "#ff0000ff";
		this.e_btn_profile_remove.style.right = "0";
		this.e_btn_profile_remove.style.bottom = "0";
		this.e_btn_profile_remove.style.textAlign = "center";
		this.e_btn_profile_remove.style.backgroundColor = "#ff000030";
		this.e_btn_profile_remove.style.opacity = "60%";
		this.e_btn_profile_remove.addEventListener("mouseenter", e => { this.e_btn_profile_remove.style.opacity = "100%"; });
		this.e_btn_profile_remove.addEventListener("mouseleave", e => { this.e_btn_profile_remove.style.opacity = "60%"; });
		this.e_btn_profile_remove.addEventListener(
			"click",
			x =>
			{
				BackgroundScene.DeleteActiveProfile();
				this.RefreshProfileButtons();
			}
		);

		this.RefreshProfileButtons();
	}

	RefreshProfileButtons()
	{
		var atStart = BackgroundScene.activeProfileId == 0;
		var atEnd = BackgroundScene.activeProfileId >= (BackgroundScene.loadedProfiles.length - 1);

		this.e_btn_profile_prev.style.display = atStart ? "none" : "block";
		this.e_btn_profile_next.style.color = atEnd ? "green" : "white";
		this.e_btn_profile_next.innerText = atEnd ? "ADD" : "NEXT";
		GlobalTooltip.RegisterReceiver(this.e_btn_profile_next, atEnd ? "Add Profile" : "Next Profile", atEnd ? "Add Profile" : "Go To Next Profile");

		this.e_btn_profile_next.style.height = atStart ? "2rem" : "1rem";
		this.e_btn_profile_next.style.lineHeight = atStart ? "2rem" : "1rem";
		this.e_btn_profile_next.style.borderRadius = atStart ? "0 0 0.5rem 0" : "0rem";
		this.e_btn_profile_next.style.color = atEnd ? "#00ff00ff" : "#00aaaaff";
		this.e_btn_profile_next.style.backgroundColor = atEnd ? "#00ff0030" : "#00aaaa30";

		this.e_btn_profile_remove.style.display = atStart ? "none" : "block";

		this.e_name_input.value = BackgroundScene.activeProfile.name ?? "Default";
	}

	CollapseAllListItems()
	{
		for (var listItemIndex = 0; listItemIndex < this.listItems.length; listItemIndex++)
		{
			var thisListItem = this.listItems[listItemIndex];
			thisListItem.CollapseOptions();
		}
	}

	CreateLayerListContainer()
	{
		this.e_layerListRoot = addElement("div", null, this.e_content);
		this.e_layerListRoot.style.position = "relative";
		this.e_layerListRoot.style.overflowX = "hidden";
		this.e_layerListRoot.style.overflowY = "auto";
		this.e_layerListRoot.style.flexGrow = "1.0";
		this.e_layerListRoot.style.flexShrink = "1.0";

		this.e_layerListContainer = addElement("div", null, this.e_content);
		this.e_layerListContainer.style.position = "absolute";
		this.e_layerListContainer.style.top = "0.5rem";
		this.e_layerListContainer.style.left = "0.5rem";
		this.e_layerListContainer.style.right = "0.5rem";
		this.e_layerListContainer.style.display = "flex";
		this.e_layerListContainer.style.flexDirection = "column";
		this.e_layerListRoot.appendChild(this.e_layerListContainer);
	}

	AddLayerButton(layerType, icon, defaultData = () => { }, description = "")
	{
		const e_btn = addElement("div", null, this.e_listButtons);
		e_btn.addEventListener(
			"click",
			e =>
			{
				const newLayerId = BackgroundScene.activeProfile.layers.length;
				var newLayer = new BackgroundSceneLayer(newLayerId, layerType, defaultData());
				BackgroundScene.AddLayer(newLayer);
			}
		);

		GlobalTooltip.RegisterReceiver(e_btn, "Add " + layerType, description);
		e_btn.style.cursor = "pointer";
		e_btn.style.marginLeft = "0.25rem";
		e_btn.style.marginRight = "0.25rem";
		e_btn.style.width = "2rem";
		e_btn.style.height = "2rem";
		e_btn.style.lineHeight = "3rem";
		e_btn.style.flexGrow = "0.0";
		e_btn.style.flexShrink = "1.0";
		e_btn.style.backgroundColor = "#ffffff30";
		e_btn.style.borderRadius = "0.2rem";
		e_btn.style.scale = "100%";

		e_btn.addEventListener("mouseenter", e => { e_btn.style.scale = "110%"; });
		e_btn.addEventListener("mouseleave", e => { e_btn.style.scale = "100%"; });

		var i = addElement("i", null, e_btn, icon);
		i.style.position = "absolute";
		i.style.top = "0";
		i.style.bottom = "0";
		i.style.left = "0";
		i.style.right = "0";
		i.style.textAlign = "center";
		i.style.width = "2rem";
		i.style.lineHeight = "2rem";
		i.style.fontStyle = "normal";
		i.style.fontWeight = "normal";
		i.style.fontFamily = "'Material Icons'";
		i.style.color = "#ffffffcc";

		return e_btn;
	}

	RefreshLayerList(recreateItems = true)
	{
		if (recreateItems)
		{
			this.e_layerListContainer.innerHTML = "";

			for (var layerIndex in BackgroundScene.activeProfile.layers)
			{
				const layerid = Number(layerIndex);
				this.listItems.push(new LayerListItem(this, layerid, this.e_layerListContainer));
			}

			var e_top_indicator = addElement("div", null, this.e_layerListContainer);
			e_top_indicator.style.fontSize = "0.6rem";
			e_top_indicator.style.color = "#ffffff30";
			e_top_indicator.style.textAlign = "center";
			e_top_indicator.innerText = "↓ FRONT ↓";
		}
		else
		{
			for (var layerItemIndex = 0; layerItemIndex < BackgroundScene.activeProfile.layers.length; layerItemIndex++)
			{
				if (this.listItems[layerItemIndex].expanded)
				{
					this.listItems[layerItemIndex].CollapseOptions();
					this.listItems[layerItemIndex].ExpandOptions();
				}
			}
		}

	}

	AddLayerListItemButton(e_parent, title, color = "gray", icon = "")
	{
		var e = addElement("div", null, e_parent);
		e.title = title;
		e.style.borderRadius = "0.2rem";
		e.style.backgroundColor = color;
		e.style.width = "1rem";
		e.style.height = "1rem";
		e.style.flexGrow = "0.0";
		e.style.flexShrink = "0.0";
		e.style.transform = "scale(90%)";
		e.addEventListener("mouseenter", x => { e.style.transform = "scale(100%)"; });
		e.addEventListener("mouseleave", x => { e.style.transform = "scale(90%)"; });

		if (icon != "")
		{
			var i = addElement("i", null, e, icon);
			i.style.position = "absolute";
			i.style.top = "0";
			i.style.bottom = "0";
			i.style.left = "0";
			i.style.right = "0";
			i.style.fontStyle = "normal";
			i.style.fontFamily = "'Material Icons'";
			i.style.color = "#ffffffcc";
		}
		return e;
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: BackgroundSceneSettingsWindow.window_kind,
		icon: "gradient",
		desc: "Customize the background!",
		model: (x, y) => { return new BackgroundSceneSettingsWindow(x, y); }
	}
);



const default_profiles_json = '[{"layers":[{"orderIndex":0,"enabled":true,"name":"Background Fill","type":"Solid Fill","data":{"color":"black"}},{"orderIndex":1,"enabled":true,"name":"Background Grid","type":"Pattern","data":{"src":"radial-gradient(circle at center,#ffff 49%, #dddf 51%)","scaleX":"6","scaleY":"6","speedX":"0.1","speedY":0,"opacity":"8","blur":"0"}},{"orderIndex":2,"enabled":true,"name":"Fog Back","type":"Solid Fill","data":{"color":"#ff880020"}},{"orderIndex":3,"enabled":true,"name":"Bottom Glow","type":"Gradient Fill","data":{"gradient":"linear-gradient(0deg, #ffffff20, transparent 69%)"}},{"orderIndex":4,"enabled":true,"name":"Corner Glow","type":"Gradient Fill","data":{"gradient":"radial-gradient(circle at 0% 100%, #ffaa3388 0%, transparent 100%)"}},{"orderIndex":5,"enabled":true,"name":"Logo","type":"Image","data":{"src":"./../streamhub/images/channel_logo_cutout.png","blur":"12","positionX":"0","positionY":"0","opacity":"100","scaleY":"40","scaleX":"40"}},{"orderIndex":6,"enabled":true,"name":"Fog Front","type":"Solid Fill","data":{"color":"#aa690098"}},{"orderIndex":7,"enabled":true,"name":"Post","type":"Filter Layer","data":{"filter":"hue-rotate(15deg) contrast(300%) saturate(70%)"}},{"orderIndex":8,"enabled":true,"name":"Fog Front Copy","type":"Solid Fill","data":{"color":"#aa690058"}},{"orderIndex":9,"enabled":true,"name":"Vignette","type":"Gradient Fill","data":{"gradient":"radial-gradient(circle at center, transparent 70%, black 300%)"}}],"name":"Default"}]';

OptionManager.AppendOption(key_option_active_profile_index, 0);
OptionManager.AppendOption(key_option_background_scene_profiles, default_profiles_json, "Profiles");

window.setTimeout(() => { BackgroundScene.LoadProfiles(); }, 25);