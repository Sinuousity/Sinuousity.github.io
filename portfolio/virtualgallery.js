export class VirtualGalleryItem
{
	constructor(idReal)
	{
		this.idReal = idReal;
		this.idVirtual = idReal;
		this.scrollIndexRelative = idReal;
	}

	UpdateVirtualIndex(scrollIndex, virtualItemCount)
	{
		this.idVirtual = this.idReal + scrollIndex;
		while (this.idVirtual < 0) this.idVirtual += virtualItemCount;
		while (this.idVirtual >= virtualItemCount) this.idVirtual -= virtualItemCount;
	}
}

export class VirtualGallery
{
	constructor(realItemCount = 4)
	{
		this.itemsReal = [];
		this.itemsVirtual = [];

		this.canScroll = true;
		this.canScrollTimeout = window.setTimeout(() => { this.canScroll = true; }, 200);

		this.scrollIndex = 0;
		this.realItemCount = realItemCount;

		for (var realItemId = 0; realItemId < this.realItemCount; realItemId++)
			this.itemsReal.push(new VirtualGalleryItem(realItemId));
	}

	SetVirtualItems(itemArray = [])
	{
		this.scrollIndex = 0;
		this.itemsVirtual = itemArray;
		var virtualItemCount = this.itemsVirtual.length;
		for (var realItemId = 0; realItemId < this.realItemCount; realItemId++)
			this.itemsReal[realItemId].UpdateVirtualIndex(this.scrollIndex, virtualItemCount);
	}

	MoveToNextTile(direction = 1)
	{
		if (!this.canScroll) return;
		if (direction == 0) return;

		this.scrollIndex += direction;
		this.OnScrollIndexChanged();
	}

	OnScrollIndexChanged()
	{
		this.canScroll = false;
		this.canScrollTimeout = window.setTimeout(() => { this.canScroll = true; }, 200);

		var virtualItemCount = this.itemsVirtual.length;
		for (var realItemIndex = 0; realItemIndex < this.realItemCount; realItemIndex++)
		{
			this.itemsReal[realItemIndex].UpdateVirtualIndex(this.scrollIndex, virtualItemCount);
		}
	}
}