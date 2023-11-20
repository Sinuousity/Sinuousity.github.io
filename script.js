var e_page_about;
var e_page_shaders;
var e_page_shaders_children;
var e_page_links;

var e_content;

var e_tlink_about;
var e_tlink_shaders;
var e_tlink_links;

var e_showcase_container;
var e_showcase_desc;
var e_showcase_img;
var e_showcase_vid;


var skip_fade = false;
var shader_current_id = 1;
var shader_count = 1;



function on_body_load()
{
	e_content = document.getElementById("content");

	e_page_about = document.getElementById("portfolio_about");
	e_page_shaders = document.getElementById("portfolio_shaders");
	e_page_links = document.getElementById("portfolio_links");

	e_page_shaders_children = e_page_shaders.children;
	shader_count = e_page_shaders_children.length;

	e_tlink_about = document.getElementById("tlink_about");
	e_tlink_shaders = document.getElementById("tlink_shaders");
	e_tlink_links = document.getElementById("tlink_links");

	e_showcase_container = document.getElementById("showcase_container");
	e_showcase_desc = document.getElementById("showcase_desc");
	e_showcase_img = document.getElementById("showcase_img");
	e_showcase_vid = document.getElementById("showcase_vid");

	hideshowcase();

	var has_last_page = false;
	if (localStorage)
	{
		var last_page = localStorage.getItem("page");
		if (last_page != null)
		{
			has_last_page = true;
			switch (last_page)
			{
				case "about": goto_about(); break;
				case "shaders": goto_shaders(); break;
				case "links": goto_links(); break;
				default: has_last_page = false; break;
			}
		}

		var last_shader = Number(localStorage.getItem("shader_index"));
		if (last_shader == null || last_shader < 1) shader_current_id = 1;
		else shader_current_id = last_shader;
	}

	skip_fade = true;
	if (!has_last_page) goto_about();
	skip_fade = false;

	refresh_shader_sections();
}



function refresh_shader_sections()
{
	hide_shader_sections();
	e_page_shaders_children[shader_current_id].className = "subsection";
	localStorage.setItem("shader_index", shader_current_id);
}

function hide_shader_sections()
{
	for (let i = 0; i < shader_count; i++)
	{
		var section = e_page_shaders_children[i];
		section.className = "gone";
	}
	e_page_shaders_children[0].className = "shader-nav";
}

function shader_prev()
{
	shader_current_id = shader_current_id - 1;
	if (shader_current_id < 1) shader_current_id = shader_count - 1;
	refresh_shader_sections();
}

function shader_next()
{
	shader_current_id = shader_current_id + 1;
	if (shader_current_id >= shader_count) shader_current_id = 1;
	refresh_shader_sections();
}



function reset_title_links()
{
	e_tlink_about.className = "titlelink";
	e_tlink_shaders.className = "titlelink";
	e_tlink_links.className = "titlelink";
}

function gone_all()
{
	e_page_about.className = "gone";
	e_page_shaders.className = "gone";
	e_page_links.className = "gone";
}

function goto_about()
{
	localStorage.setItem("page", "about");
	reset_title_links();
	e_tlink_about.className = "titlelink_selected";
	next_content = function ()
	{
		gone_all();
		e_page_about.className = "section";
	}
	fade_content_to();
}

function goto_shaders()
{
	localStorage.setItem("page", "shaders");
	reset_title_links();
	e_tlink_shaders.className = "titlelink_selected";
	next_content = function ()
	{
		gone_all();
		e_page_shaders.className = "section";
	}
	fade_content_to();
}

function goto_links()
{
	localStorage.setItem("page", "links");
	reset_title_links();
	e_tlink_links.className = "titlelink_selected";
	next_content = function ()
	{
		gone_all();
		e_page_links.className = "section";
	}
	fade_content_to();
}



var animid_content_fade_out;
var animid_content_fade_in;
var delayid_content_fade;
var content_opacity = 0.0;
var next_content;
function fade_content_to()
{
	content_opacity = 1.0;
	e_content.style.opacity = content_opacity;
	clearTimeout(delayid_content_fade);
	clearInterval(animid_content_fade_out);
	clearInterval(animid_content_fade_in);

	if (skip_fade)
	{
		next_content();
	}
	else
	{
		animid_content_fade_out = setInterval(fade_out_content, 15);
	}
}

function fade_out_content()
{
	content_opacity -= 0.1;
	e_content.style.opacity = content_opacity;

	if (content_opacity <= 0.0)
	{
		content_opacity = 0.0;
		e_content.style.opacity = content_opacity;
		clearInterval(animid_content_fade_out);

		next_content();
		clearTimeout(delayid_content_fade);
		delayid_content_fade = setTimeout(
			function ()
			{
				clearInterval(animid_content_fade_in);
				animid_content_fade_in = setInterval(fade_in_content, 15);
			},
			100
		);
	}
}

function fade_in_content()
{
	content_opacity += 0.1;
	e_content.style.opacity = content_opacity;

	if (content_opacity >= 1.0)
	{
		content_opacity = 1.0;
		e_content.style.opacity = content_opacity;
		clearInterval(animid_content_fade_in);
	}
}





function showshowcase(e, type, desc = "")
{
	if (type == 'video')
	{
		e_showcase_vid.className = "showcaseitem";
		e_showcase_vid.pause();
		e_showcase_vid.src = e.children[0].src;
		e_showcase_vid.load();
	}
	else
	{
		e_showcase_img.className = "showcaseitem";
		e_showcase_img.src = e.src;
	}

	e_showcase_desc.innerHTML = desc;
	e_showcase_container.className = "showcasecontainer";

	document.body.className = "body noscroll";
}

function hideshowcase()
{
	e_showcase_vid.pause();

	e_showcase_container.className = "gone";
	e_showcase_vid.className = "gone";
	e_showcase_img.className = "gone";

	document.body.className = "body";
}