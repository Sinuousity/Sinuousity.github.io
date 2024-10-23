export class Gobbledy
{
	static consonantParts = [
		'br',
		'ban',
		'ben',
		'bin',
		'bly',
		'by',
		'bing',

		'ch',
		'chang',
		'cheng',
		'ching',
		'chong',
		'chung',
		'ck',
		'cky',
		'cl',
		'cr',
		'cun',
		'can',

		'dr',
		'dan',
		'den',
		'din',
		'dl',
		'dy',
		'ding',

		'fin',
		'fan',
		'fun',
		'fy',
		'fing',

		'gh',
		'gl',
		'gr',
		'gan',
		'gam',
		'gal',
		'gap',
		'gen',
		'ging',

		'ld',
		'lk',
		'ln',
		'lp',
		'lt',
		'ling',

		'mm',
		'mp',
		'ming',

		'nn',
		'nd',
		'ning',

		'ph',
		'pl',
		'pr',
		'ping',

		'qu',

		'sc',
		'sch',
		'scl',
		'sh',
		'sl',
		'sp',
		'st',
		'sing',
		'shan',
		'shen',
		'shon',
		'shin',

		'th',
		'tch',
		'tr',
		'tt',
		'ting',
		'thing',
		'ton',
		'tin',
		'tan',
		'tag',
	];
	static vowelParts = [
		'ae',
		'ai',
		'au',

		'ea',
		'ei',

		'ie',
		'io',

		'oa',
		'oe',
		'oi',

		'ue',
	];
	static consonants = 'bcdfghlmnprst';
	static consonants_rare = 'jkvwxz';
	static consonants_doubling = 'bdfglmnprstz';
	static vowels = 'aeio';
	static vowels_rare = 'u';
	static vowels_doubling = 'eo';

	static GetLetter(is_consonant = false, use_part = false)
	{
		let is_rare = Math.random() > 0.9;

		let tray = [];
		if (use_part)
		{
			if (is_consonant)
			{
				tray = Gobbledy.consonantParts;
			}
			else
			{
				tray = Gobbledy.vowelParts;

			}
		}
		else
		{
			if (is_consonant)
			{
				tray = is_rare ? Gobbledy.consonants_rare : Gobbledy.consonants;
			}
			else
			{
				tray = is_rare ? Gobbledy.vowels_rare : Gobbledy.vowels;
			}
		}

		return tray[Math.round(Math.random() * (tray.length - 1))];
	}

	static GetWord(minParts = 2, maxParts = 5)
	{
		let result = '';
		let is_consonant = Math.random() > 0.25;
		let word_len = (Math.random() * (Math.random() * 0.5 + 0.5)) * (maxParts - minParts) + minParts;
		for (let ii = 0; ii < word_len; ii++)
		{
			let is_part = ii > 0 && Math.random() > (is_consonant ? 0.6 : 0.7);
			let add = Gobbledy.GetLetter(is_consonant, is_part);
			result += add;
			if (!is_part && ii > 0 && Math.random() > 0.9)
			{
				if (is_consonant)
				{
					if (ii < (word_len - 1) && Gobbledy.consonants_doubling.indexOf(add) > -1)
						result += add;
				}
				else 
				{
					if (Gobbledy.vowels_doubling.indexOf(add) > -1)
						result += add;
				}
			}
			is_consonant = !is_consonant;
		}
		result = result.replace('uu', 'u'); // for any qu followed by u
		return result;
	}

	static GetPhrase(minWords = 1, maxWords = 3)
	{
		let words = [];
		let wordCount = Math.random() * (maxWords - minWords) + minWords;
		for (let ii = 0; ii < wordCount; ii++)
			words.push(Gobbledy.GetWord());
		let result = words.join(' ').trim();
		result = Gobbledy.CapitalizeFirst(result);
		return result;
	}

	static GetSentence(minWords = 3, maxWords = 10)
	{
		let words = [];
		let wordCount = Math.random() * (maxWords - minWords) + minWords;
		for (let ii = 0; ii < wordCount; ii++)
			words.push(Gobbledy.GetWord());

		let result = words.join(' ').trim() + ".";
		result = Gobbledy.CapitalizeFirst(result);
		return result;
	}

	static CapitalizeFirst(str = '')
	{
		if (str.length < 1) return str;
		if (str.length < 2) return str.toUpperCase();
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
}