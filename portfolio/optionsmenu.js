import { EventSource } from "./eventsource.js";
import { RunningTimeout } from "./runningtimeout.js";

export class Option
{
	constructor(key, label, defaultValue)
	{
		this.key = key;
		this.label = label;
		this.value = defaultValue;
		this.defaultValue = defaultValue;
		this.valueIsDefault = true;
	}

	static Ensure(key, label, defaultValue)
	{
		if (typeof key != 'string')
		{
			console.warn("cannot ensure option with invalid key value: " + key);
			return;
		}

		if (typeof label != 'string') console.warn("invalid option label: " + label);

		OptionsManager.RegisterOption(key, label, defaultValue);
	}

	GetLabel()
	{
		if (typeof this.label != 'string' || this.label.length < 1) return this.key;
		return this.label;
	}

	SetValue(newValue)
	{
		this.value = newValue;
		this.valueIsDefault = this.defaultValue === this.value;
	}

	ResetValue()
	{
		this.value = this.defaultValue;
		this.valueIsDefault = true;
	}
}

export class OptionsManager
{
	static onApplyOptions = new EventSource();
	static onSavedOptions = new EventSource();
	static dirtyStateTimeout = new RunningTimeout(() => { OptionsManager.SaveOptions(); }, 2.0, false, 250);
	static options = [];

	static ApplyOptions() { OptionsManager.onApplyOptions.Invoke(); }
	static MarkDirty() { OptionsManager.ApplyOptions(); OptionsManager.dirtyStateTimeout.ExtendTimer(); }
	static ForceSaveOptions()
	{
		OptionsManager.ApplyOptions();
		OptionsManager.dirtyStateTimeout.Interrupt(false);
		OptionsManager.SaveOptions();
	}

	static IndexOfOption(key)
	{
		for (var optionIndex in OptionsManager.options)
		{
			if (key === OptionsManager.options[optionIndex].key) return optionIndex;
		}
		return -1;
	}

	static HasOption(key)
	{
		var optionIndex = OptionsManager.IndexOfOption(key);
		return optionIndex > -1;
	}

	static GetOption(key)
	{
		var optionIndex = OptionsManager.IndexOfOption(key);
		if (optionIndex > -1) return OptionsManager.options[optionIndex];
		return false;
	}

	static GetOptionValue(key, defaultValue)
	{
		var optionIndex = OptionsManager.IndexOfOption(key);
		if (optionIndex > -1) return OptionsManager.options[optionIndex].value;
		return defaultValue;
	}

	static UpdateOptionValue(key, newValue)
	{
		var optionIndex = OptionsManager.IndexOfOption(key);
		if (optionIndex > -1) return;
		OptionsManager.options[optionIndex].SetValue(newValue);
		OptionsManager.MarkDirty();
		return defaultValue;
	}

	static RegisterOption(key, label, defaultValue)
	{
		var existingIndex = OptionsManager.IndexOfOption(key);
		if (existingIndex > -1)
		{
			OptionsManager.options[existingIndex].label = label;
			OptionsManager.options[existingIndex].defaultValue = defaultValue;
			if (OptionsManager.options[existingIndex].valueIsDefault) OptionsManager.options[existingIndex].SetValue(defaultValue);
			return;
		}
		OptionsManager.options.push(new Option(key, label, defaultValue));
	}

	static LoadOptions()
	{
		var optionsBlock = JSON.parse(localStorage.getItem("key-datastore-options"));
		if (optionsBlock) 
		{
			for (var optionId in optionsBlock.options)
			{
				var storedOption = optionsBlock.options[optionId];
				OptionsManager.RegisterOption(storedOption.key, storedOption.label, storedOption.value);
			}
			console.log("...restored " + optionsBlock.options.length + " option values");
			return;
		}
		console.log("...no stored options detected");
	}

	static SaveOptions()
	{
		var optionsBlock = { options: OptionsManager.options };
		localStorage.setItem("key-datastore-options", JSON.stringify(optionsBlock));
		console.log("...saved " + OptionsManager.options.length + " option values");
		OptionsManager.onSavedOptions.Invoke();
	}
}