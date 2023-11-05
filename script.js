
	function gone_all()
	{
		var page_about = document.getElementById("portfolio_aboutme");
		var page_shaders = document.getElementById("portfolio_shaders");
		var page_links = document.getElementById("portfolio_links");
		var tlink_about = document.getElementById("tlink_about");
		var tlink_shaders = document.getElementById("tlink_shaders");
		var tlink_links = document.getElementById("tlink_links");

		tlink_about.setAttribute("class", "titlelink");
		tlink_shaders.setAttribute("class", "titlelink");
		tlink_links.setAttribute("class", "titlelink");

		$(page_about).removeClass("section");
		$(page_shaders).removeClass("section");
		$(page_links).removeClass("section");

		$(page_about).addClass("gone");
		$(page_shaders).addClass("gone");
		$(page_links).addClass("gone");
	}

	function goto_about()
	{
		gone_all();
		var page = document.getElementById("portfolio_aboutme");
		$(page).addClass("section");
		var tlink_about = document.getElementById("tlink_about");
		tlink_about.setAttribute("class", "titlelink_selected");

	}

	function goto_shaders()
	{
		gone_all();
		var page = document.getElementById("portfolio_shaders");
		$(page).addClass("section");
		var tlink_shaders = document.getElementById("tlink_shaders");
		tlink_shaders.setAttribute("class", "titlelink_selected");
	}

	function goto_links()
	{
		gone_all();
		var page = document.getElementById("portfolio_links");
		$(page).addClass("section");
		var tlink_links = document.getElementById("tlink_links");
		tlink_links.setAttribute("class", "titlelink_selected");
	}
	


	function showshowcase(e, type)
	{
		if(type == 'video')
		{
			var video_src_new = e.children[0].src;
			var video = document.getElementById("showcase_video");
			video.pause();
			video.src = video_src_new;
			document.getElementById("showcase_video_container").setAttribute("class", "showcasecontainer");
			video.load();
		}
		else
		{
			var image_src_new = e.src;
			document.getElementById("showcaseimg").src = image_src_new;
			document.getElementById("showcase").setAttribute("class", "showcasecontainer");
		}

		var content_e = document.getElementById("content");
		$(content_e).addClass("noscroll");
	}

	function hideshowcase()
	{
		document.getElementById("showcase").setAttribute("class", "gone");
		document.getElementById("showcase_video_container").setAttribute("class", "gone");
		var video = document.getElementById("showcase_video");
		video.pause();

		var content_e = document.getElementById("content");
		$(content_e).removeClass("noscroll");
	}