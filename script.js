const project_overview =
{
	path: "gallery/overview/",
	title: "OVERVIEW",
	desc: "An overview video of some of the different projects I have worked on.",
	showcase_id: 0,
	content:
		[
			{
				path: "showcase-tech_art.mp4",
				desc: "",
				has_audio: true
			}
		],
	getURL: function (id) { return this.path + this.content[id].path }
};

const project_ssfs =
{
	path: "gallery/ssfs/",
	title: "SCI-FI SIGNS",
	desc: "An artist customisable and parameter heavy visual effect package to easily add animated holograms.",
	showcase_id: 3,
	content:
		[
			{
				path: "SSFS_Screen2.png",
				desc: "PROMO GRAPHIC"
			},
			{
				path: "SSFS_Screen3.jpg",
				desc: "MID-TRANSITION A"
			},
			{
				path: "SSFS_Screen4.jpg",
				desc: "MID-TRANSITION B"
			},
			{
				path: "SSFS_Screen5.jpg",
				desc: "MID-TRANSITION C"
			}
		],
	getURL: function (id) { return this.path + this.content[id].path }
};

const project_donuts =
{
	path: "gallery/donuts/",
	title: "FRYABLE DONUTS",
	desc: "A procedural donut shader for a VR demo.",
	showcase_id: 1,
	content:
		[
			{
				path: "donut_1.jpg",
				desc: "RAW DOUGH"
			},
			{
				path: "donut_2.jpg",
				desc: "PARTIALLY FRIED"
			},
			{
				path: "donut_3.jpg",
				desc: "EVENLY FRIED"
			},
			{
				path: "donut_4.jpg",
				desc: "EVENLY BURNT"
			}
		],
	getURL: function (id) { return this.path + this.content[id].path }
};

const project_xray =
{
	path: "gallery/xray/",
	title: "X-RAY",
	desc: "An early work, a shader to check out the interior of any mesh.",
	showcase_id: 0,
	content:
		[
			{
				path: "XRay1.jpg",
				desc: "HUMAN HEAD"
			},
			{
				path: "XRay4.jpg",
				desc: "HUMAN HEAD WITH BRAIN"
			},
			{
				path: "XRay3.jpg",
				desc: "CONCAVE GEOMETRY WITH CROSS SECTION SHADER"
			}
		],
	getURL: function (id) { return this.path + this.content[id].path }
};

const project_fluid =
{
	path: "gallery/fluid/",
	title: "FLUID-LIKES",
	desc: "Volumetric depth fog, screen-space refraction, and world-space surface ripples.",
	showcase_id: 0,
	content:
		[
			{
				path: "fluid_01.png",
				desc: "VOLUMETRIC FLUID MESH"
			},
			{
				path: "fluid_02.png",
				desc: "WORLDSPACE RIPPLES A"
			},
			{
				path: "fluid_03.png",
				desc: "WORLDSPACE RIPPLES B"
			}
		],
	getURL: function (id) { return this.path + this.content[id].path }
};

const project_tentacle =
{
	path: "gallery/tentacle/",
	title: "TENTACLE",
	desc: "A pulsing tentacle that uses parallax to create the illusion of a nasty fluid flowing beneath its surface.",
	showcase_id: 0,
	content:
		[
			{
				path: "tentacle4.mp4",
				desc: "FLYAROUND"
			},
			{
				path: "tentacle1.mp4",
				desc: "MATERIAL CLOSEUP"
			}
		],
	getURL: function (id) { return this.path + this.content[id].path }
};

const project_revenants =
{
	path: "gallery/revenants/",
	title: "PROJECT REVENANTS (WORKING TITLE)",
	desc: "Development on this project is currently on hold. You can see more WIP content on Instagram.",
	showcase_id: 0,
	content:
		[
			{
				path: "rev_01.png",
				desc: "PROCEDURAL GORE SYSTEM"
			},
			{
				path: "rev_02.png",
				desc: "SCANNING LASER EFFECT"
			},
			{
				path: "rev_03.png",
				desc: "VOLUMETRIC LIGHTING"
			},
			{
				path: "rev_04.png",
				desc: "REFRACTIVE MATERIALS"
			},
			{
				path: "rev_printer.mp4",
				desc: "IN-GAME ITEMS PRINTER"
			},
			{
				path: "rev_tentacles.mp4",
				desc: "GPU TENTACLE PHYSICS"
			}
		],
	getURL: function (id) { return this.path + this.content[id].path }
};

const project_cross_section =
{
	path: "gallery/cross-section/",
	title: "CROSS SECTION",
	desc: "An early work, slicing a mesh to check out the interior of any mesh.",
	showcase_id: 0,
	content:
		[
			{
				path: "img_work_tanzle_a_1.jpg",
				desc: "SLICING CONCAVE GEOMETRY"
			},
			{
				path: "img_work_tanzle_a_3.jpg",
				desc: "INTERIOR / EXTERIOR TEXTURES"
			},
			{
				path: "img_work_tanzle_a_2.jpg",
				desc: "AN ORANGE"
			}
		],
	getURL: function (id) { return this.path + this.content[id].path }
};

const project_misc =
{
	path: "gallery/misc/",
	title: "OTHER STUFF",
	desc: "Some other stuff I have worked on.",
	showcase_id: 0,
	content:
		[
			{
				path: "RandomGalaxies.mp4",
				desc: "PARAMETERIZED GALAXIES"
			},
			{
				path: "Loading1.mp4",
				desc: "LOADING ANIMATIONS"
			},
			{
				path: "radial_menu.mp4",
				desc: "RADIAL MENUS"
			},
			{
				path: "pixelated.png",
				desc: "2D / 3D SPATIAL PIXELATION"
			},
			{
				path: "HoloShader.mp4",
				desc: "SKINNED MESH VFX - HOLOGRAM"
			}
		],
	getURL: function (id) { return this.path + this.content[id].path }
};

const portfolio_projects = [
	project_overview,
	project_ssfs,
	project_fluid,
	project_tentacle,
	project_xray,
	project_cross_section,
	project_donuts,
	project_revenants,
	project_misc
];


var e_debug;

var e_gallery_root;
var e_gallery_back;
var e_gallery_items = [];
var e_gallery_item_displays = [];
var e_gallery_item_labels = [];
var e_gallery_item_rects = [];

var e_overlay_container;
var e_overlay_root;
var e_overlay_title;

var gallery_width;
var gallery_height;
var gallery_item_size;
var gallery_opacity = 0.0;
var project_selected = -1;
var gallery_id_selected = -1;


function on_body_load()
{
	e_debug = document.getElementById("debug-label");

	e_overlay_container = document.getElementById("overlay-container");
	e_overlay_root = document.getElementById("overlay-root");
	e_overlay_title = document.getElementById("overlay-title");

	e_gallery_root = document.getElementById("gallery-root");
	e_gallery_back = document.getElementById("gallery-back");
	e_gallery_back.style.display = "none";
	create_gallery_projects();

	setInterval(update_gallery, 20);

	closeOverlay();
	document.addEventListener('mousemove', onMouseMove);
}

var cursor_x;
var cursor_y;
var cursor_x_center_delta;
var cursor_y_center_delta;
function onMouseMove(mouseEvent)
{
	cursor_x = mouseEvent.clientX;
	cursor_y = mouseEvent.clientY;
	cursor_x_center_delta = body.offsetWidth * 0.5 - cursor_x;
	cursor_y_center_delta = body.offsetHeight * 0.5 - cursor_y;
}

function onGalleryBack()
{
	if (project_selected > -1)
	{
		if (gallery_id_selected > -1)
		{
			gallery_id_selected = -1;
			if (portfolio_projects[project_selected].content.length < 2)
			{
				project_selected = -1;
				e_gallery_back.style.display = "none";
				clear_gallery_items();
				create_gallery_projects();
			}
		}
		else
		{
			project_selected = -1;
			e_gallery_back.style.display = "none";
			clear_gallery_items();
			create_gallery_projects();
		}
	}
}

function onGalleryItemClicked(id)
{
	e_gallery_items[id].style.borderTop = "transparent solid 2px";
	e_gallery_items[id].style.borderBottom = "transparent solid 2px";

	if (project_selected > -1)
	{
		if (gallery_id_selected == id)
		{
			gallery_id_selected = -1;
			if (portfolio_projects[project_selected].content.length < 2)
			{
				project_selected = -1;
				e_gallery_back.style.display = "none";
				clear_gallery_items();
				create_gallery_projects();
			}
		}
		else 
		{
			gallery_id_selected = id;
		}
	}
	else
	{
		e_gallery_back.style.display = "block";
		project_selected = id;
		clear_gallery_items();
		create_gallery_project_images();
	}
}

function defaultRect()
{
	var x =
	{
		l: 0.0,
		t: 0.0,
		w: e_gallery_root.offsetWidth,
		h: 0.0
	};
	return x;
};

function setRect(e, r)
{
	e.style.left = r.l + "px";
	e.style.top = r.t + "px";
	e.style.width = r.w + "px";
	e.style.height = r.h + "px";
}

function getRect(e)
{
	var x =
	{
		l: Number(e.style.left),
		t: Number(e.style.top),
		w: Number(e.style.width),
		h: Number(e.style.height)
	};
	return x;
}

function copyRect(r)
{
	var r0 = defaultRect();
	r0.l = r.l;
	r0.t = r.t;
	r0.w = r.w;
	r0.h = r.h;
	return r0;
}

function lerpRect(r0, r1, t)
{
	var ol = r1.l - r0.l;
	var ot = r1.t - r0.t;
	var ow = r1.w - r0.w;
	var oh = r1.h - r0.h;

	if (Math.abs(ol) < 0.01) ol = 0.0;
	if (Math.abs(ot) < 0.01) ot = 0.0;
	if (Math.abs(ow) < 0.01) ow = 0.0;
	if (Math.abs(oh) < 0.01) oh = 0.0;

	var r2 = defaultRect();
	if (Math.abs(ol) > 0.01) r2.l = r0.l + ol * t; else r2.l = r1.l;
	if (Math.abs(ot) > 0.01) r2.t = r0.t + ot * t; else r2.t = r1.t;
	if (Math.abs(ow) > 0.01) r2.w = r0.w + ow * t; else r2.w = r1.w;
	if (Math.abs(oh) > 0.01) r2.h = r0.h + oh * t; else r2.h = r1.h;
	return r2;
}

function create_gallery_projects()
{
	for (var i = 0; i < portfolio_projects.length; i++)
	{
		var project = portfolio_projects[i];
		create_gallery_item(i, project.getURL(project.showcase_id), project.title, project.desc);
	}
	init_gallery_rects();
}

function create_gallery_project_images()
{
	var project = portfolio_projects[project_selected];
	var project_content = project.content;
	for (var i = 0; i < project_content.length; i++)
	{
		create_gallery_item(i, project.getURL(i), project_content[i].desc, project_content[i].desc);
	}
	init_gallery_rects();

	if (project.content.length < 2) gallery_id_selected = 0;
}

function create_gallery_item(item_id, img_src, text, desc)
{
	var e_gallery_item = document.createElement("div");
	e_gallery_item.className = "gallery-item";
	e_gallery_item.setAttribute("onclick", "onGalleryItemClicked(" + item_id + ")");

	e_gallery_item.addEventListener("mouseenter", on_gallery_item_entered);
	e_gallery_item.addEventListener("mouseleave", on_gallery_item_exited);
	e_gallery_item.title = desc;

	if (img_src.endsWith(".mp4"))
	{
		var e_gallery_item_video = document.createElement("video");
		e_gallery_item_video.className = "gallery-item-image";
		e_gallery_item_video.defaultMuted = true;
		e_gallery_item_video.muted = true;
		e_gallery_item_video.autoplay = true;
		e_gallery_item_video.controls = false;
		e_gallery_item_video.loop = true;
		e_gallery_item_video.volume = 0.5;

		var e_video_src = document.createElement("source");
		e_video_src.src = img_src;
		e_video_src.type = "video/mp4";
		e_gallery_item_video.appendChild(e_video_src);

		e_gallery_item.appendChild(e_gallery_item_video);
		e_gallery_item_displays.push(e_gallery_item_video);

		if (project_selected > -1 && portfolio_projects[project_selected].content[item_id].has_audio)
		{
			var e_gallery_item_mute = document.createElement("img");
			e_gallery_item_mute.addEventListener("mouseenter", on_mute_toggle_entered);
			e_gallery_item_mute.addEventListener("mouseleave", on_mute_toggle_exited);
			e_gallery_item_mute.addEventListener("click", on_mute_toggled);
			e_gallery_item_mute.className = "gallery-item-mute-toggle";
			e_gallery_item_mute.src = "icons/audio_muted.png";
			e_gallery_item.appendChild(e_gallery_item_mute);
		}
	}
	else
	{
		var e_gallery_item_image = document.createElement("img");
		e_gallery_item_image.className = "gallery-item-image";
		e_gallery_item_image.src = img_src;
		e_gallery_item_image.setAttribute("draggable", "false");
		e_gallery_item.appendChild(e_gallery_item_image);
		e_gallery_item_displays.push(e_gallery_item_image);
	}

	var e_gallery_item_lbl = document.createElement("div");
	e_gallery_item_lbl.className = "gallery-item-label";
	e_gallery_item_lbl.innerText = text;
	e_gallery_item.appendChild(e_gallery_item_lbl);
	e_gallery_item_labels.push(e_gallery_item_lbl);



	e_gallery_items.push(e_gallery_item);

	var r = defaultRect();
	setRect(e_gallery_item, r);
	e_gallery_item_rects.push(r);
	e_gallery_root.appendChild(e_gallery_item);
}

function clear_gallery_items()
{
	for (var i = 0; i < e_gallery_items.length; i++) e_gallery_items[i].remove();
	e_gallery_items = [];
	e_gallery_item_labels = [];
	e_gallery_item_displays = [];
	e_gallery_item_rects = [];
	gallery_id_selected = -1;
}

function init_gallery_rects()
{
	gallery_width = e_gallery_root.offsetWidth;
	gallery_height = e_gallery_root.offsetHeight;
	var invlen = 1.0 / e_gallery_items.length;
	gallery_item_size = invlen * gallery_height;

	for (var i = 0; i < e_gallery_items.length; i++)
	{
		var rTarget = copyRect(e_gallery_item_rects[i]);
		rTarget.l = 0.0;
		rTarget.t = (i + 0.5) * gallery_item_size;
		rTarget.w = gallery_width;
		rTarget.h = 0.0;
		e_gallery_items[i].style.objectFit = "cover";

		e_gallery_item_rects[i] = rTarget;
		setRect(e_gallery_items[i], e_gallery_item_rects[i]);
	}
}

function clamp(x, min, max)
{
	return Math.min(max, Math.max(min, x));
}

function update_gallery()
{
	gallery_width = e_gallery_root.offsetWidth;
	gallery_height = e_gallery_root.offsetHeight;
	var invlen = 1.0 / e_gallery_items.length;
	gallery_item_size = invlen * gallery_height;

	for (var i = 0; i < e_gallery_items.length; i++) update_gallery_item(i);
}

function update_gallery_item(i)
{
	var e = e_gallery_items[i];
	var e_label = e_gallery_item_labels[i];
	var e_display = e_gallery_item_displays[i];
	var rTarget = copyRect(e_gallery_item_rects[i]);


	if (gallery_id_selected < 0)//no content selected
	{
		rTarget.l = 0.0;
		rTarget.t = i * gallery_item_size;
		rTarget.w = gallery_width;
		rTarget.h = gallery_item_size;

		e.style.objectFit = "cover";

		e_display.style.filter = "blur(4px)";

		e_label.style.top = "50%";
		e_label.style.opacity = "90%";
	}
	else//content is selected
	{
		//e_label.style.display = "none";

		if (i == gallery_id_selected)
		{
			rTarget.l = 0.0;
			rTarget.t = 0.0;
			rTarget.w = gallery_width;
			rTarget.h = gallery_height;

			e.style.objectFit = "contain";

			e_display.style.filter = "blur(0px)";

			e_label.style.top = "10%";
			e_label.style.opacity = "90%";
		}
		else
		{
			e_label.style.top = "50%";
			e_label.style.opacity = "0%";

			if (i < gallery_id_selected)
			{
				rTarget.l = 0.0;
				rTarget.t = 0.0;
				rTarget.w = gallery_width;
				rTarget.h = 0.0;
			}
			else // i > gallery_id_selected
			{
				rTarget.l = 0.0;
				rTarget.t = gallery_height;
				rTarget.w = gallery_width;
				rTarget.h = 0.0;
			}
		}
	}

	e_gallery_item_rects[i] = lerpRect(e_gallery_item_rects[i], rTarget, 0.333);
	setRect(e, e_gallery_item_rects[i]);
}


function on_gallery_item_entered(event)
{
	if (gallery_id_selected < 0)//no content selected
	{
		event.target.style.opacity = "100%";
		event.target.style.borderTop = "white solid 2px";
		event.target.style.borderBottom = "white solid 2px";
	}
	else//content selected
	{
		event.target.style.opacity = "100%";
		event.target.style.borderTop = "transparent solid 2px";
		event.target.style.borderBottom = "transparent solid 2px";
	}
}
function on_gallery_item_exited(event)
{
	if (gallery_id_selected < 0)//no content selected
	{
		event.target.style.opacity = "50%";
		event.target.style.borderTop = "transparent solid 2px";
		event.target.style.borderBottom = "transparent solid 2px";
	}
	else//content selected
	{
		event.target.style.opacity = "100%";
		event.target.style.borderTop = "transparent solid 2px";
		event.target.style.borderBottom = "transparent solid 2px";
	}
}

var is_mute_toggle_hovered;
function on_mute_toggle_entered(event)
{
	is_mute_toggle_hovered = true;
}
function on_mute_toggle_exited(event)
{
	is_mute_toggle_hovered = false;
}

function on_mute_toggled(event)
{
	if (event.stopPropagation) event.stopPropagation();
	else event.cancelBubble = true;

	if (project_selected < 0) return;
	if (gallery_id_selected < 0) return;

	var was_muted = e_gallery_item_displays[gallery_id_selected].muted;
	if (was_muted) event.target.src = "icons/audio_normal.png";
	else event.target.src = "icons/audio_muted.png";
	e_gallery_item_displays[gallery_id_selected].muted = !was_muted;
}






var e_overlay_content;

function showOverlay(title)
{
	e_overlay_container.style.pointerEvents = "all";
	e_overlay_container.style.opacity = "100%";
	e_overlay_title.innerText = title;

	switch (title)
	{
		case "ABOUT":
			e_overlay_content = document.createElement("div");
			e_overlay_content.className = "overlay-body";
			e_overlay_content.innerHTML = about_me_str;
			e_overlay_root.appendChild(e_overlay_content);
			break;
		case "LINKS":
			e_overlay_content = document.createElement("div");
			e_overlay_content.className = "overlay-links-root";
			e_overlay_root.appendChild(e_overlay_content);

			var e_link_resume = document.createElement("div");
			e_link_resume.className = "overlay-links-link";
			e_link_resume.title = "Résumé";
			e_link_resume.innerText = "Résumé";

			var e_link_linkedin = document.createElement("div");
			e_link_linkedin.className = "overlay-links-link";
			e_link_linkedin.title = "LinkedIn";
			var e_img_linkedin = document.createElement("img");
			e_img_linkedin.className = "overlay-links-link-img";
			e_img_linkedin.src = str_src_logo_linkedin;
			e_link_linkedin.appendChild(e_img_linkedin);

			var e_link_assetstore = document.createElement("div");
			e_link_assetstore.className = "overlay-links-link";
			e_link_assetstore.title = "Unity Asset Store";

			var e_img_assetstore = document.createElement("img");
			e_img_assetstore.className = "overlay-links-link-img";
			e_img_assetstore.src = str_src_logo_assetstore;
			e_link_assetstore.appendChild(e_img_assetstore);

			var e_link_fiverr = document.createElement("div");
			e_link_fiverr.className = "overlay-links-link";
			e_link_fiverr.title = "fiverr";

			var e_img_fiverr = document.createElement("img");
			e_img_fiverr.className = "overlay-links-link-img";
			e_img_fiverr.src = str_src_logo_fiverr;
			e_img_fiverr.style.filter = "brightness(200%)";
			e_link_fiverr.appendChild(e_img_fiverr);

			e_overlay_content.appendChild(e_link_assetstore);
			e_overlay_content.appendChild(e_link_linkedin);
			e_overlay_content.appendChild(e_link_fiverr);
			e_overlay_content.appendChild(e_link_resume);

			e_link_assetstore.addEventListener("click", nav_to_assetstore);
			e_link_fiverr.addEventListener("click", nav_to_fiverr);
			e_link_linkedin.addEventListener("click", nav_to_linkedin);
			e_link_resume.addEventListener("click", nav_to_resume);

			break;
	}
}

var str_url_assetstore = "https://assetstore.unity.com/publishers/10375";
var str_url_linkedin = "https://www.linkedin.com/in/thomas-rasor/";
var str_url_fiverr = "https://www.fiverr.com/thomasrasor";
var str_url_resume = "files/resume_ThomasRasor.pdf";
var str_url_mailto = "mailto:thomas.ir.rasor@gmail.com";

function nav_to_assetstore() { nav_to("https://assetstore.unity.com/publishers/10375") };
function nav_to_fiverr() { nav_to("https://www.fiverr.com/thomasrasor") };
function nav_to_linkedin() { nav_to("https://www.linkedin.com/in/thomas-rasor/") };
function nav_to_resume() { nav_to("files/resume_ThomasRasor.pdf") };

function nav_to(url)
{
	open(url, '_blank');
}

function closeOverlay()
{
	e_overlay_container.style.pointerEvents = "none";
	e_overlay_container.style.opacity = "0%";

	if (e_overlay_content) e_overlay_content.remove();
}



var str_src_logo_fiverr = "https://assets-global.website-files.com/606a802fcaa89ba7b0508c95/606a802fcaa89b2b03508cd4_Fiverr%20Logo.svg";
var str_src_logo_assetstore = "https://unity-assetstorev2-prd.storage.googleapis.com/cdn-origin/assets/as/views/common/components/Logo/src/unity-assetstore-logo-new.50ac708aeae28b8b6bf369ece5875fa5.svg";
var str_src_logo_linkedin = "https://static.licdn.com/aero-v1/sc/h/an86sbagr48vf1s7k8llw6h6b";

var about_me_str = "Although my specialty is GPU programming, I have worked on every aspect of game design. I have experience with complex visual effects, gameplay scripting, multiplayer networking, sound design, 3D modelling, animation, graphic design, UI/UX, and more.<br><br>I have spent over a decade working in the Unity game engine, and I have experience with a number of other engines and tools. I have some experience with VR applications. I have minor experience with machine learning.<br><br>During my time working with game engines, I have become adept at using Blender to create placeholder 3D models for protoypes I've made. I also utilized Photoshop and other image editing software for both texture work and graphic design such as the signs included with my <a class='overlay-link' href='" + str_url_assetstore + "' target='_blank'>SciFi Signs Unity asset</a>.<br><br>I have recently also spent time with Godot and GDScript.<br><br>And I made the website you are looking at.<br><br>You can reach me at <a class='overlay-link' href='" + str_url_mailto + "' target='_blank'>thomas.ir.rasor@gmail.com</a> or via my <a class='overlay-link' href='" + str_url_linkedin + "' target='_blank'>LinkedIn</a> or <a class='overlay-link' href='" + str_url_fiverr + "' target='_blank'>Fiverr</a> for professional inquiries.";