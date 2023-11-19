var e_page_about;
var e_page_shaders;
var e_page_links;

var e_content;

var e_tlink_about;
var e_tlink_shaders;
var e_tlink_links;

var e_showcase_container;
var e_showcase_desc;
var e_showcase_img;
var e_showcase_vid;


var shader_sections;
var shader_current_id = 0;



function on_body_load()
{
	e_content = document.getElementById("content");

	e_page_about = document.getElementById("portfolio_about");
	e_page_shaders = document.getElementById("portfolio_shaders");
	e_page_links = document.getElementById("portfolio_links");

	e_tlink_about = document.getElementById("tlink_about");
	e_tlink_shaders = document.getElementById("tlink_shaders");
	e_tlink_links = document.getElementById("tlink_links");

	e_showcase_container = document.getElementById("showcase_container");
	e_showcase_desc = document.getElementById("showcase_desc");
	e_showcase_img = document.getElementById("showcase_img");
	e_showcase_vid = document.getElementById("showcase_vid");

	hideshowcase();
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
	animid_content_fade_out = setInterval(fade_out_content, 15);
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