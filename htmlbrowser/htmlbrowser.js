export class HtmlBrowserTile
{
	constructor(fileIndex)
	{
		this.fileInfo = HtmlBrowser.instance.files[fileIndex];
		this.fileData = HtmlBrowser.instance.fileDatum[fileIndex];

		this.e_tile = AddElement("div", "file-grid-tile", "", HtmlBrowser.instance.e_gridView);
		this.e_tile.innerHTML = this.fileData;

		this.e_btn_save = AddElement("a", "file-grid-tile-save", "archive", this.e_tile);
		this.e_btn_save.download = this.fileInfo.name.replace('.html', '') + '.html';
		var dataBlob = new Blob([this.fileData], { type: 'text/html' });
		this.dataBlobURL = window.URL.createObjectURL(dataBlob);
		this.e_btn_save.href = this.dataBlobURL;
	}

	Remove()
	{
		ReleaseObjectURL();
		this.e_tile.remove();
	}

	ReleaseObjectURL()
	{
		window.URL.revokeObjectURL(this.dataBlobURL);
	}
}


export class HtmlBrowser
{
	static instance = new HtmlBrowser();

	constructor(files = [])
	{
		this.files = [];
		this.fileTiles = [];

		this.CreateFileGrid();

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
			var tile = new HtmlBrowserTile(ii);
			this.fileTiles.push(tile);
		}
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
	var e_input_files = document.createElement("input");
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
	document.body.appendChild(e_control_files);
}

function RemoveFileSelectionScreen()
{
	e_control_files.remove();
	e_control_files = null;
}

(() => { CreateFileSelectionInput(); })();
