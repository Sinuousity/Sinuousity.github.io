console.info("[ +Module ] File Utils");

export class FileUtils
{
	static async SaveToFile(contents = '', defaultName = 'saved_file.txt', saveDialogId = 'file_save_default', startIn = 'documents')
	{
		try
		{
			const fileHandle = await window.showSaveFilePicker(
				{
					id: saveDialogId,
					suggestedName: defaultName,
					startIn: startIn,
					types: [
						{
							description: 'Text Files ( JSON )',
							accept: { 'text/plain': ['.txt'] },
						}
					],
				}
			);

			const fileWritable = await fileHandle.createWritable();
			await fileWritable.write(contents);
			await fileWritable.close();

			console.info(" :: Saved contents to file: " + fileHandle.name);
		}
		catch (e)
		{
			console.warn(" :: File Save Aborted!");
		}

	}

	static async LoadFromFile()
	{
		try
		{
			const fileHandle = (await window.showOpenFilePicker())[0];
			const file = await fileHandle.getFile();
			const contents = await file.text();
			console.info(" :: Loaded contents from file: " + fileHandle.name);
			return contents;
		}
		catch (e)
		{
			console.warn(" :: Failed to load contents from file!");
			return "";
		}
	}
}

