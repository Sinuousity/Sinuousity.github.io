const monthNames = [
	"january",
	"february",
	"march",
	"april",
	"may",
	"june",
	"july",
	"august",
	"september",
	"october",
	"november",
	"december"
];

export class HtmlBrowserTile
{
	constructor(fileIndex)
	{
		this.fileInfo = HtmlBrowser.instance.files[fileIndex];
		this.fileData = HtmlBrowser.instance.fileDatum[fileIndex];

		this.e_tile = AddElement("div", "file-grid-tile", "", HtmlBrowser.instance.e_gridView);
		this.e_tile.innerHTML = this.fileData;

		var trimmedFileName = this.fileInfo.name.replaceAll('.html', '');
		trimmedFileName = trimmedFileName.replaceAll(" ", "");
		this.betterFileName = trimmedFileName;

		this.e_btn_save = AddElement("a", "file-grid-tile-save", "file_download", this.e_tile);
		this.e_btn_save.addEventListener("click", e => { e.stopPropagation(); });
		this.e_btn_save.download = this.betterFileName + '.html';
		var dataBlob = new Blob([this.fileData], { type: 'text/html' });
		this.dataBlobURL = window.URL.createObjectURL(dataBlob);
		this.e_btn_save.href = this.dataBlobURL;

		this.e_lbl_fileName = AddElement("div", "file-grid-tile-name", trimmedFileName, this.e_tile);
		this.e_lbl_fileName.title = this.fileInfo.name;

		var timestampMatch = this.fileData.match(HtmlBrowser.rgx_timestamp);
		if (timestampMatch)
		{
			var timestampRaw = timestampMatch[1].trim();
			var tsParts = timestampRaw.split(" ");

			var monthStr = tsParts[0].toLowerCase();
			var dayStr = tsParts[1];
			dayStr = dayStr.replaceAll("st,", "");
			dayStr = dayStr.replaceAll("rd,", "");
			dayStr = dayStr.replaceAll("nd,", "");
			dayStr = dayStr.replaceAll("th,", "");
			if (dayStr.length < 2) dayStr = "0" + dayStr;
			var yearStr = tsParts[2];

			var timeStr = tsParts[3];
			timeStr = timeStr.replaceAll(":", "");
			var timeHr = Number(timeStr.substr(0, 2));
			var timeMin = timeStr.substr(2, 2);
			var timePost = timeStr.substr(4, 2);
			if (timePost == "pm") timeHr += 12;

			var monthNum = monthNames.indexOf(monthStr);
			this.betterFileName = `${yearStr}-${monthNum}-${dayStr}_${timeHr}-${timeMin}_${trimmedFileName}`;
			console.log("detected timestamp: " + this.betterFileName);

			this.e_lbl_timestamp = AddElement("div", "file-grid-tile-timestamp", timestampRaw, this.e_tile);
			this.e_lbl_timestamp.title = timestampRaw;
		}
	}

	Remove()
	{
		this.ReleaseObjectURL();
		this.e_tile.remove();
	}

	ReleaseObjectURL()
	{
		window.URL.revokeObjectURL(this.dataBlobURL);
	}

	UpdateSearchVisibility(search = "")
	{
		var matched = search == "" || this.e_tile.innerHTML.toLowerCase().includes(search);
		this.e_tile.style.display = matched ? "block" : "none";
	}
}


export class HtmlBrowser
{
	static instance = new HtmlBrowser();
	static rgx_timestamp = /\<span id\=\"(?:.+)\"\>(.+)\<\/span\>/;

	constructor(files = [])
	{
		this.files = [];
		this.fileTiles = [];

		this.CreateFileGrid();
		this.CreateFocusPreview();

		this.reader = new FileReader();
		this.readFileIndex = 0;
		this.fileDatum = [];

		if (files.length > 0)
		{
			this.SetFiles(files);
			this.LoadNextFile();
		}
	}

	SetFiles(files)
	{
		this.files = files;
		this.readFileIndex = 0;
		this.fileDatum = [];
		this.LoadNextFile();
	}


	LoadNextFile()
	{
		if (this.readFileIndex >= this.files.length)
		{
			this.FinishReadingFiles();
			return;
		}

		this.reader.onload = () =>
		{
			if (this.readFileIndex < this.files.length)
			{
				this.fileDatum.push(this.reader.result);
				this.readFileIndex += 1;
				this.LoadNextFile();
			}
			else this.FinishReadingFiles();
		};
		this.e_gridTitle.innerText = this.files[this.readFileIndex].name;
		this.reader.readAsText(this.files[this.readFileIndex]);
	}

	FinishReadingFiles()
	{
		console.log("   ...Finished All Files After " + this.readFileIndex);
		this.CreateFileTiles();
	}

	CreateFileGrid()
	{
		this.e_gridRoot = AddElement("div", "file-grid-root", "", document.body);
		this.e_gridView = AddElement("div", "file-grid-view", "", this.e_gridRoot);
		this.e_gridTitle = AddElement("div", "file-grid-title", "FILE GRID", document.body);
	}

	CreateFileTiles()
	{
		if (this.fileTiles.length > 0)
		{
			for (var ii = 0; ii < this.fileTiles.length; ii++) this.fileTiles[ii].Remove();
		}

		this.fileTiles = [];
		for (var ii = 0; ii < this.files.length; ii++)
		{
			const fileIndex = ii;
			var tile = new HtmlBrowserTile(fileIndex);
			tile.e_tile.addEventListener(
				"click",
				e =>
				{
					this.e_focusPreview.style.display = "block";
					this.e_focusPreviewContent.innerHTML = this.fileDatum[fileIndex];
				}
			);
			this.fileTiles.push(tile);
		}
	}

	CreateFocusPreview()
	{
		this.e_focusPreview = AddElement("div", "file-grid-preview", "", document.body);
		this.e_focusPreviewContent = AddElement("div", "file-grid-preview-content", "", this.e_focusPreview);
		this.e_focusPreview.style.display = "none";
		this.e_focusPreview.addEventListener(
			"click",
			e =>
			{
				this.e_focusPreview.style.display = "none";
				this.e_focusPreviewContent.innerHTML = "";
			}
		);
	}
}


function AddElement(kind, className = "", innerText = "", parent = null)
{
	var e = document.createElement(kind);
	if (className != "") e.className = className;
	if (innerText != "") e.innerText = innerText;

	if (parent != null) parent.appendChild(e);
	return e;
}

function CreateFileSelectionInput()
{
	var e_control_files = document.createElement("div");
	e_control_files.style.display = "inline-block";
	var e_input_files = document.createElement("input");
	e_input_files.style.width = "100%";
	e_input_files.multiple = true;
	e_input_files.type = "file";
	e_input_files.accept = ".html";
	e_input_files.id = "html-file-input";
	e_input_files.name = "html-file-input";
	e_input_files.addEventListener(
		"change",
		e => HtmlBrowser.instance.SetFiles(e_input_files.files)
	);
	e_control_files.appendChild(e_input_files);

	var e_control_search = document.createElement("div");
	e_control_search.style.display = "inline-block";
	var e_input_search = document.createElement("input");
	e_input_search.style.width = "100%";
	e_input_search.type = "text";
	e_input_search.id = "search-input";
	e_input_search.name = "search-input";
	e_input_search.addEventListener(
		"change",
		e =>
		{
			if (HtmlBrowser.instance.fileTiles.length > 0)
			{
				for (var tileIndex in HtmlBrowser.instance.fileTiles)
				{
					var tile = HtmlBrowser.instance.fileTiles[tileIndex];
					tile.UpdateSearchVisibility(e_input_search.value.trim().toLowerCase());
				}
			}
		}
	);
	e_control_search.appendChild(e_input_search);


	document.body.appendChild(e_control_files);
	document.body.appendChild(e_control_search);
}

function RemoveFileSelectionScreen()
{
	e_control_files.remove();
	e_control_files = null;
}

(() => { CreateFileSelectionInput(); })();
