import { addElement } from "../hubscript.js";
import { GlobalTooltip } from "./globaltooltip.js";

console.info("[ +Module ] TableListView Test");

export class TableListViewColumn
{
	static defaultContentProvider =
		(e_parent, column, entry, key) => 
		{
			return addElement(
				"div", "tablelist-row-item", e_parent, null,
				x =>
				{
					if (entry && key in entry)
					{
						if (column.toStringMethod) x.innerHTML = column.toStringMethod(entry[key]);
						else x.innerHTML = entry[key];
					}
					else
					{
						x.innerHTML = '-';
					}
					if (column.buttonMethod)
					{
						x.style.cursor = 'pointer';
						x.addEventListener('click', e => column.buttonMethod(entry));
					}
					if (column.width) x.style.width = column.width;
					if (column.fixedWidth) x.style.flexGrow = '0.0';
					if (column.textAlign) x.style.textAlign = column.textAlign;
					if (column.fontSize) x.style.fontSize = column.fontSize;
					if (column.tooltipMethod) GlobalTooltip.RegisterReceiver(x, column.tooltipMethod(entry));
				}
			);
		};

	static percentageContentProvider =
		(e_parent, column, entry, key) => 
		{
			return addElement(
				"div", "tablelist-row-item", e_parent, null,
				x =>
				{
					if (entry && key in entry)
					{
						let str_percentage = (Math.ceil(entry[key] * 800.0) / 8) + '%';
						if (column.toStringMethod) x.innerHTML = column.toStringMethod(str_percentage);
						else x.innerHTML = str_percentage;
					}
					else
					{
						x.innerHTML = '-';
					}
					if (column.buttonMethod)
					{
						x.style.cursor = 'pointer';
						x.addEventListener('click', e => column.buttonMethod(entry));
					}
					if (column.width) x.style.width = column.width;
					if (column.fixedWidth) x.style.flexGrow = '0.0';
					if (column.textAlign) x.style.textAlign = column.textAlign;
					if (column.fontSize) x.style.fontSize = column.fontSize;
					if (column.tooltipMethod) GlobalTooltip.RegisterReceiver(x, column.tooltipMethod(entry));
				}
			);
		};

	static booleanContentProvider =
		(e_parent, column, entry, key) => 
		{
			return addElement(
				"div", "tablelist-row-item", e_parent, null,
				x =>
				{
					x.style.color = 'gray';
					if (entry && key in entry)
					{
						let val_boolean = entry[key] == true;
						let str_boolean = val_boolean.toString().toUpperCase();
						x.style.color = val_boolean ? 'green' : 'red';
						if (column.toStringMethod) x.innerHTML = column.toStringMethod(str_boolean);
						else x.innerHTML = str_boolean;
					}
					else
					{
						x.innerHTML = '-';
					}
					if (column.buttonMethod)
					{
						x.style.cursor = 'pointer';
						x.addEventListener('click', e => column.buttonMethod(entry));
					}
					if (column.width) x.style.width = column.width;
					if (column.fixedWidth) x.style.flexGrow = '0.0';
					if (column.textAlign) x.style.textAlign = column.textAlign;
					if (column.fontSize) x.style.fontSize = column.fontSize;
					if (column.tooltipMethod) GlobalTooltip.RegisterReceiver(x, column.tooltipMethod(entry));
				}
			);
		};

	static iconButtonContentProvider =
		(e_parent, column, entry, key) => 
		{
			let e_group = addElement(
				"div", "tablelist-row-item", e_parent, null,
				x =>
				{
					x.style.width = column.width;
					if (column.fixedWidth) x.style.flexGrow = '0.0';
					x.style.lineHeight = 'inherit';
					if (column.tooltipMethod) GlobalTooltip.RegisterReceiver(x, column.tooltipMethod(entry));
				}
			);

			let e_btn_root = addElement('div', 'tablelist-icon-button', e_group);

			let e_btn_icon = addElement(
				'i', 'window-icon', e_btn_root, column.buttonIcon ? column.buttonIcon : 'edit',
				x =>
				{
					x.style.fontFamily = "'Material Icons'";
					x.style.position = 'absolute';
					x.style.inset = '0';
					x.style.lineHeight = 'inherit';
				}
			);

			if (column.buttonColor) e_btn_root.style.backgroundColor = column.buttonColor;
			if (column.buttonMethod) e_btn_root.addEventListener('click', e => column.buttonMethod(entry));

			return e_group;
		};


	constructor(
		key = 'column_key',
		label = 'Column Name',
		sortMethod = (a, b) => 0,
		toStringMethod = x => x,
		contentProvider = TableListViewColumn.defaultContentProvider,
		width = '8rem',
		fixedWidth = false
	)
	{
		this.key = key;
		this.label = label;
		this.width = width;
		this.sortMethod = sortMethod;
		this.toStringMethod = toStringMethod;
		this.contentProvider = contentProvider;
		this.default_descending = false;
		this.fixedWidth = fixedWidth;
		this.tooltipMethod = null;
		this.textAlign = null;
		this.buttonIcon = null;
		this.buttonMethod = null;
	}
}

export class TableListView
{
	constructor()
	{
		this.column_elements = [];
		this.columns = [];
		this.entries = [];
		this.view_entries = [];
		this.quick_filters = [];

		this.items_per_page = 32;
		this.page_count = 1;
		this.page_offset = 0;

		this.searchString = '';
		this.searchMethod = (entry, searchString) => true;

		this.sort_by = '';
		this.sort_descending = false;
		this.sort_arrow = this.sort_descending ? '↧' : '↥';

		this.e_root = null;
		this.e_scrollview = null;
	}

	SetData(entries = [])
	{
		this.entries = entries;
	}

	MovePage(delta = 1)
	{
		this.page_offset += delta;
		this.PopulateView();
	}

	ClampPageOffset()
	{
		let max_id_offset = Math.max(0, this.view_entries.length - this.items_per_page);

		//wrapping
		//if (this.page_offset < 0) this.page_offset = max_id_offset;
		//if (this.page_offset > max_id_offset) this.page_offset = 0;

		//clamping
		if (this.page_offset < 0) this.page_offset = 0;
		if (this.page_offset > max_id_offset) this.page_offset = max_id_offset;
	}

	CreateRoot(parent = {})
	{
		this.e_root = addElement('div', 'tablelist-root', parent);
		this.e_root.style.fontSize = "0.8rem";

		this.CreateSearchBar();
		this.CreateColumns();
		this.CreateScrollView();
		this.CreatePagination();
	}

	RemoveRoot()
	{
		if (this.e_root) this.e_root.remove();
	}

	ClearColumns()
	{
		this.columns = [];
	}

	RegisterColumn(
		key = 'column_key',
		label = 'Column Name',
		sortMethod = null,
		toStringMethod = null,
		contentProvider = TableListViewColumn.defaultContentProvider,
		width = '8rem',
		fixedWidth = false
	)
	{
		if (key in this.columns) return;
		let new_column = new TableListViewColumn(key, label, sortMethod, toStringMethod, contentProvider, width, fixedWidth);
		this.columns[key] = new_column;
		return new_column;
	}

	ClearQuickFilters()
	{
		this.quick_filters = [];
	}

	RegisterQuickFilter(icon_name = 'filter', filter_method = entry => true, icon_color = 'white', filter_name = null)
	{
		this.quick_filters.push(
			{
				name: filter_name ? filter_name : 'Filter',
				icon_name: icon_name,
				icon_color: icon_color,
				filter_method: filter_method,
				e_toggle: null,
				enabled: false
			}
		);
	}

	ClearView()
	{
		GlobalTooltip.ReleaseAllReceivers(this.e_scrollview);
		this.e_scrollview.innerText = '';
	}

	FilterEntries()
	{
		this.view_entries = this.entries.slice(0, this.entries.length);

		if (this.quick_filters.length > 0)
		{
			for (let ii = 0; ii < this.quick_filters.length; ii++)
			{
				let qfilter = this.quick_filters[ii];
				if (qfilter.enabled !== true) continue;
				this.view_entries = this.view_entries.filter(qfilter.filter_method);
			}
		}

		if (this.searchMethod && this.searchString.length > 0)
		{
			this.view_entries = this.view_entries.filter(x => this.searchMethod(x, this.searchString));
		}

		let sortingColumn = this.columns[this.sort_by];
		if (sortingColumn && sortingColumn.sortMethod)
		{
			this.view_entries.sort(sortingColumn.sortMethod);
			if (this.sort_descending) this.view_entries.reverse();
		}
	}

	PopulateView()
	{
		this.ClearView();

		this.FilterEntries();
		this.UpdatePagination();
		this.UpdateQuickFilterToggles();

		let page_base_id = this.page_offset;
		let page_entries = this.view_entries.slice(page_base_id, page_base_id + this.items_per_page);

		for (let ii = 0; ii < page_entries.length; ii++)
		{
			this.CreateEntryRow(page_entries[ii], ii);
		}
	}

	CreateScrollView()
	{
		this.e_scrollview = addElement("div", 'tablelist-scrollview', this.e_root);
		this.e_scrollview.addEventListener('wheel', e => { this.MovePage(Math.sign(e.deltaY)) });
	}

	SetSortBy(sort_by = '', default_descending = false)
	{
		if (sort_by == this.sort_by)
		{
			this.sort_descending = !this.sort_descending;
		}
		else
		{
			this.sort_by = sort_by;
			this.sort_descending = default_descending;
		}

		this.sort_arrow = this.sort_descending ? '↧' : '↥';
		this.PopulateView();
		this.UpdateColumns();
	}

	CreateEntryRow(entry, entry_id)
	{
		let e_entry_row = addElement('div', 'tablelist-row', this.e_scrollview);
		if (window.font_size_px) 
		{
			e_entry_row.style.minHeight = (window.font_size_px * 1.75) + 'px';
			e_entry_row.style.maxHeight = (window.font_size_px * 2.25) + 'px';
			e_entry_row.style.height = (window.font_size_px * 2) + 'px';
		}

		if (entry)
		{
			addElement(
				'div', 'tablelist-row-item', e_entry_row, (this.page_offset + entry_id + 1) + '',
				x =>
				{
					x.style.color = '#333';
					x.style.fontSize = '0.6rem';
					x.style.textAlign = 'right';
					x.style.pointerEvents = 'none';
					x.style.width = '1rem';
					x.style.flexGrow = '0.0';
					x.style.textOverflow = 'clip';
				}
			);

			for (let column_key in this.columns)
			{
				let this_column = this.columns[column_key];
				this_column.contentProvider(e_entry_row, this_column, entry, column_key);
			}

			if (entry.tooltip) GlobalTooltip.RegisterReceiver(e_entry_row, entry.tooltip);
		}
		else e_entry_row.innerText = "NULL ENTRY";
	}

	DisableAllQuickFilters()
	{
		for (let key in this.quick_filters)
		{
			this.quick_filters[key].enabled = false;
		}
	}

	CreateSearchBar()
	{
		let e_search_bar_root = addElement("div", 'tablelist-search-root', this.e_root);

		this.e_search_bar = addElement("input", "tablelist-search", e_search_bar_root, null,
			x =>
			{
				x.type = 'text';
				x.placeholder = 'Search...';
			}
		);
		this.e_search_bar.addEventListener('change', e => { this.searchString = this.e_search_bar.value.toLowerCase().trim(); this.PopulateView(); });

		let e_search_icon = addElement('i', 'window-icon', e_search_bar_root, 'search');
		e_search_icon.style.fontFamily = "'Material Icons'";
		e_search_icon.style.opacity = '30%';
		e_search_icon.style.fontSize = '1rem';
		e_search_icon.style.lineHeight = '1.5rem';
		e_search_icon.style.left = '0.5rem';

		if (this.quick_filters.length < 1) return;

		for (let ii = 0; ii < this.quick_filters.length; ii++)
		{
			let qfilter = this.quick_filters[ii];

			qfilter.e_toggle = addElement('i', null, e_search_bar_root, qfilter.icon_name);
			qfilter.e_toggle.style.cursor = qfilter.filter_method ? 'pointer' : 'default';
			qfilter.e_toggle.style.position = 'relative';
			qfilter.e_toggle.style.textDecoration = 'none';
			qfilter.e_toggle.style.fontStyle = 'normal';
			qfilter.e_toggle.style.flexGrow = '0';
			qfilter.e_toggle.style.flexShrink = '0';
			qfilter.e_toggle.style.color = qfilter.icon_color;
			qfilter.e_toggle.style.fontFamily = "'Material Icons'";
			qfilter.e_toggle.style.lineHeight = '1.5rem';
			qfilter.e_toggle.style.top = '0.33rem';

			qfilter.e_toggle.addEventListener(
				'click',
				e =>
				{
					if (qfilter.enabled)
					{
						qfilter.enabled = false;
					}
					else
					{
						this.DisableAllQuickFilters();
						qfilter.enabled = true;
					}
					this.PopulateView();
				}
			);

			GlobalTooltip.RegisterReceiver(qfilter.e_toggle, qfilter.name);
		}

	}

	UpdateQuickFilterToggles()
	{
		for (let ii = 0; ii < this.quick_filters.length; ii++)
		{
			let qfilter = this.quick_filters[ii];
			qfilter.e_toggle.style.color = qfilter.enabled ? qfilter.icon_color : '#aaa';
			qfilter.e_toggle.style.filter = qfilter.enabled ? 'drop-shadow(0px 0px 0.5rem currentcolor)' : 'none';
		}
	}

	CreateColumns()
	{
		this.e_columns_row = addElement("div", "tablelist-row tablelist-column-row", this.e_root);

		addElement(
			'div', 'tablelist-row-item', this.e_columns_row, null,
			x =>
			{
				x.style.pointerEvents = 'none';
				x.style.width = '1rem';
				x.style.flexGrow = '0.0';
			}
		);

		this.column_elements = [];
		for (let column_key in this.columns)
		{
			let this_column = this.columns[column_key];
			this.column_elements[column_key] = this.CreateColumn(this_column);
		}

		this.UpdateColumns();
	}

	CreatePagination()
	{
		this.e_pagination_row = addElement("div", "tablelist-pagination-row", this.e_root);

		this.e_btn_page_to_start = this.AddPaginationIconButton('skip_previous');
		this.e_btn_page_to_start.addEventListener('mousedown', e => this.MovePage(-this.view_entries.length));

		this.e_btn_page_prev = this.AddPaginationIconButton('arrow_left');
		this.e_btn_page_prev.addEventListener('mousedown', e => this.MovePage(-this.items_per_page));

		this.e_btn_page_current = this.AddPaginationLabel('0 - 0');

		this.e_btn_page_next = this.AddPaginationIconButton('arrow_right');
		this.e_btn_page_next.addEventListener('mousedown', e => this.MovePage(this.items_per_page));

		this.e_btn_page_to_end = this.AddPaginationIconButton('skip_next');
		this.e_btn_page_to_end.addEventListener('mousedown', e => this.MovePage(this.view_entries.length));
	}

	UpdatePagination()
	{
		this.items_per_page = this.e_scrollview.offsetHeight === 0 ? 8 : Math.floor(this.e_scrollview.offsetHeight / (window.font_size_px * 2));
		this.items_per_page = Math.max(1, this.items_per_page);
		this.page_count = Math.ceil(this.view_entries.length / this.items_per_page);

		this.ClampPageOffset();

		if (this.e_btn_page_current)
			this.e_btn_page_current.innerText = `${this.page_offset + 1} - ${Math.min(this.page_offset + this.items_per_page, this.view_entries.length)} / ${this.view_entries.length}`;


		this.e_columns_row.style.boxShadow = this.page_offset < 1 ? '#000a 0px 0px 12px' : '#666a 0px 0px 2rem';
		this.e_pagination_row.style.boxShadow = this.page_offset >= (this.view_entries.length - this.items_per_page) ? '#000a 0px 0px 12px' : '#666a 0px 0px 2rem';
	}

	AddPaginationLabel(text = 'test')
	{
		let e_lbl = addElement('div', null, this.e_pagination_row, text);
		e_lbl.style.position = 'relative';
		e_lbl.style.flexShrink = '0.0';
		e_lbl.style.flexGrow = '1.0';
		e_lbl.style.width = '8rem';
		e_lbl.style.height = '100%';
		e_lbl.style.alignContent = 'center';
		e_lbl.style.textAlign = 'center';
		return e_lbl;
	}

	AddPaginationIconButton(icon_name = 'edit')
	{
		let e_icon = addElement('i', null, this.e_pagination_row, icon_name);

		e_icon.style.display = 'block';
		e_icon.style.position = 'relative';
		e_icon.style.width = '1rem';
		e_icon.style.height = '100%';
		e_icon.style.aspectRatio = '1.0';

		e_icon.style.fontStyle = 'normal';
		e_icon.style.fontWeight = 'normal';
		e_icon.style.objectFit = 'contain';
		e_icon.style.flexShrink = '0.0';
		e_icon.style.flexGrow = '1.0';
		e_icon.style.fontFamily = "'Material Icons'";
		e_icon.style.justifyContent = 'center';
		e_icon.style.alignContent = 'center';
		e_icon.style.textAlign = 'center';
		return e_icon;
	}

	CreateColumn(column = {})
	{
		return addElement("div", "tablelist-row-item", this.e_columns_row, this.GetColumnText(column), e =>
		{
			e.style.display = "flex";
			e.style.justifyContent = column.textAlign ? column.textAlign : 'left';
			if (column.fontSize) e.style.fontSize = column.fontSize;
			e.style.flexGrow = column.fixedWidth ? '0.0' : '1.0';
			e.style.width = column.width;
			if (column.sortMethod)
			{
				e.style.pointerEvents = "all";
				e.style.cursor = "pointer";
				e.addEventListener('click', e => this.SetSortBy(column.key, column.default_descending === true));
			}
			else
			{
				e.style.pointerEvents = "none";
			}
		});
	}

	UpdateColumns()
	{
		for (let column_key in this.columns)
		{
			let this_column = this.columns[column_key];
			this.UpdateColumnText(this.column_elements[column_key], this_column);
		}
	}

	UpdateColumnText(e_col = {}, column = {})
	{
		if (e_col)
		{
			e_col.innerText = this.GetColumnText(column);
			if (column.key == this.sort_by) 
			{
				const filter_str_asc = 'sepia(100%) saturate(300%) brightness(110%) hue-rotate(120deg)';
				const filter_str_desc = 'sepia(100%) saturate(300%) brightness(110%) hue-rotate(-40deg)';
				e_col.style.filter = column.key == this.sort_by ? (this.sort_descending ? filter_str_desc : filter_str_asc) : 'none';
			}
			else 
			{
				e_col.style.filter = 'none';
			}
		}
	}

	GetColumnText(column = {})
	{
		let colText = column.label;
		if (this.sort_by == column.key) colText = this.sort_arrow + ' ' + column.label + ' ' + this.sort_arrow;
		return colText;
	}





	static useImperialWeight = false;

	static PrettyNum(value = 0)
	{
		var valueRounded = Math.round(value * 100);
		return valueRounded / 100;
	}

	static GetValueStr(value = 0.0)
	{
		if (value === null) return '-';
		if (value >= 1_000_000_000) return TableListView.PrettyNum(value * 0.001 * 0.001 * 0.001).toLocaleString() + " B";
		if (value >= 1_000_000) return TableListView.PrettyNum(value * 0.001 * 0.001).toLocaleString() + " M";
		if (value >= 1_000) return TableListView.PrettyNum(value * 0.001).toLocaleString() + " k";
		if (value >= 1) return TableListView.PrettyNum(value).toLocaleString();
		return value.toLocaleString();
	}

	static GetWeightStr(weight = 0.0)
	{
		if (weight === null) return '-';
		if (TableListView.useImperialWeight === true) return TableListView.GetWeightStrImperial(weight);
		return TableListView.GetWeightStrMetric(weight);
	}

	static GetWeightStrMetric(weight = 0.0)
	{
		const kilogram = 1.0;
		const gram = 0.001;
		const milligram = gram * gram;
		const megagram = 1000;
		const gigagram = megagram * megagram;

		if (weight <= 0.0) return '-';
		if (weight < milligram * 0.01) return `< 0.01 mg`;
		if (weight < milligram) return `${TableListView.PrettyNum(weight * gigagram).toLocaleString()} mg`;
		if (weight < gram) return `${TableListView.PrettyNum(weight * gigagram).toLocaleString()} mg`;
		if (weight < kilogram) return `${TableListView.PrettyNum(weight * megagram).toLocaleString()} g`;
		if (weight < megagram) return `${TableListView.PrettyNum(weight).toLocaleString()} kg`;
		if (weight < gigagram) return `${TableListView.PrettyNum(weight * gram).toLocaleString()} Mg`;
		return `${TableListView.PrettyNum(weight * milligram).toLocaleString()} Gg`;
	}

	static GetWeightStrImperial(weight = 0.0)
	{
		const pound = 1.0;
		const ounce = 1.0 / 16.0;
		const ton = 2240;
		const invton = 1.0 / ton;

		if (weight <= 0.0) return '0 oz';
		if (weight < ounce * 0.01) return `< 0.01 oz`;
		if (weight <= ounce) return `${TableListView.PrettyNum(weight).toLocaleString()} oz`;
		if (weight < pound) return `${TableListView.PrettyNum(weight * ounce).toLocaleString()} oz`;
		if (weight < ton) return `${TableListView.PrettyNum(weight).toLocaleString()} lb`;
		return `${TableListView.PrettyNum(weight * invton).toLocaleString()} t`;
	}
}


/*
export class TableListTestWindow extends DraggableWindow
{
	static window_kind = "Table List Test";
	static instance = null;


	static CompareByName = (a, b) => b.item_name.localeCompare(a.item_name);
	static OrCompareByName = (c, a, b) => c === 0 ? b.item_name.localeCompare(a.item_name) : c;
	static OrCompareByID = (c, a, b) => c === 0 ? b.item_id - a.item_id : c;
	static CompareByID = (a, b) => b.item_id - a.item_id;
	static CompareByValue = (a, b) => TableListTestWindow.OrCompareByID(TableListTestWindow.OrCompareByName(b.item_value - a.item_value, a, b), a, b);
	static CompareByWeight = (a, b) => TableListTestWindow.OrCompareByID(TableListTestWindow.OrCompareByName(b.item_weight - a.item_weight, a, b), a, b);
	static CompareByDesc = (a, b) => 
	{
		if (b.description && a.description) return TableListTestWindow.OrCompareByID(TableListTestWindow.OrCompareByName(b.description.localeCompare(a.description), a, b), a, b);
		return (a.description ? 1 : 0) - (b.description ? 1 : 0);
	};

	static base_item_id = 0;
	GetTestItemData()
	{
		let newData = {
			item_id: TableListTestWindow.base_item_id,
			item_name: Gobbledy.GetPhrase(),
			item_value: Math.round(Math.random() * 3500 + 1),
			item_weight: Math.random() * 100 + 0.1
		};

		TableListTestWindow.base_item_id += 1;

		if (Math.random() > 0.5) newData.description = Gobbledy.GetSentence();

		return newData;
	}

	constructor(pos_x, pos_y)
	{
		super("Table Test", pos_x, pos_y);
		this.e_window_root.style.minHeight = "180px";
		this.e_window_root.style.minWidth = "320px";
		this.SetTitle("Table Test");
		this.SetIcon("table_chart");
		this.window_kind = TableListTestWindow.window_kind;
		this.CreateContentContainer();
		this.e_content.style.display = "flex";
		this.e_content.style.flexDirection = "column";
		this.e_content.style.color = "white";
		this.e_content.style.backgroundColor = "#000000f0";

		this.test_data = [];
		for (let ii = 0; ii < 2500; ii++)
		{
			this.test_data.push(this.GetTestItemData());
		};

		this.table = new TableListView();
		this.table.searchMethod = (entry, searchString) => entry.item_name.toLowerCase().includes(searchString);

		let col_id = this.table.RegisterColumn('item_id', "ID", TableListTestWindow.CompareByID);
		col_id.default_descending = true;
		col_id.textAlign = 'right';
		col_id.fixedWidth = true;
		col_id.width = '2.5rem';

		let col_name = this.table.RegisterColumn('item_name', "Item Name", TableListTestWindow.CompareByName);
		col_name.tooltipMethod = entry => 
		{
			let name_str = entry.item_name ? entry.item_name : 'this item might be broken';
			if (entry.description)
			{
				return `${name_str}<br><span style='color:orange'>${entry.description}</span>`;
			}
			return name_str;
		};
		col_name.default_descending = true;
		col_name.width = '10rem';

		let col_value = this.table.RegisterColumn('item_value', "Value", TableListTestWindow.CompareByValue, TableListView.GetValueStr);
		col_value.textAlign = 'right';
		col_value.fixedWidth = true;
		col_value.width = '5rem';

		let col_weight = this.table.RegisterColumn('item_weight', "Weight", TableListTestWindow.CompareByWeight, TableListView.GetWeightStr);
		col_weight.textAlign = 'right';
		col_weight.fixedWidth = true;
		col_weight.width = '5rem';

		let col_edit = this.table.RegisterColumn('item_edit', "Edit", null, null, TableListViewColumn.iconButtonContentProvider);
		col_edit.buttonIcon = 'edit';
		col_edit.fontSize = '0.6rem';
		col_edit.textAlign = 'center';
		col_edit.fixedWidth = true;
		col_edit.width = '2rem';
		col_edit.tooltipMethod = entry => "Edit " + entry.item_name;

		let col_copy = this.table.RegisterColumn('item_edit2', "Copy", null, null, TableListViewColumn.iconButtonContentProvider);
		col_copy.buttonIcon = 'content_copy';
		col_copy.fontSize = '0.6rem';
		col_copy.textAlign = 'center';
		col_copy.fixedWidth = true;
		col_copy.width = '2rem';
		col_copy.tooltipMethod = entry => "Copy " + entry.item_name;

		let col_delete = this.table.RegisterColumn('item_edit1', "Delete", null, null, TableListViewColumn.iconButtonContentProvider);
		col_delete.buttonIcon = 'delete';
		col_delete.fontSize = '0.6rem';
		col_delete.textAlign = 'center';
		col_delete.fixedWidth = true;
		col_delete.width = '2rem';
		col_delete.tooltipMethod = entry => "Delete " + entry.item_name;

		this.table.SetData(this.test_data);
		this.table.CreateRoot(this.e_content);
		this.table.PopulateView();

	}

	onWindowResize()
	{
		if (this.resize_timeout) this.resize_timeout.ExtendTimer();
		else this.resize_timeout = new RunningTimeout(() => this.table.PopulateView(), 0.05, true, 20);
	}
	onWindowShow() { TableListTestWindow.instance = this; }
	onWindowClose() { TableListTestWindow.instance = null; }





}

WindowManager.instance.windowTypes.push(
	{
		key: TableListTestWindow.window_kind,
		icon: "assignment_late",
		icon_color: 'red',
		model: (x, y) => { return new TableListTestWindow(x, y); }
	}
);
*/