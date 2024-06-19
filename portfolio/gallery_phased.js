import { addElement } from "./portfolio.js";
import { VirtualGallery } from "./virtualgallery.js";

export class PhasedGalleryEntryData
{
	constructor(label, imgSrc)
	{
		this.label = label;
		this.imgSrc = imgSrc;
		var col_r = Math.random() * 255;
		var col_g = Math.random() * 255;
		var col_b = Math.random() * 255;
		this.color = `rgba(${col_r}, ${col_g}, ${col_b}, 0.1)`;
	}
}

export class PhasedGalleryEntry
{
	constructor(e_view, tileId)
	{
		this.tileId = tileId;
		this.entryData = {};
		this.e_tile = addElement("div", "phased-gallery-entry-root", e_view);
		this.e_tile_label = addElement("div", "phased-gallery-entry-title", this.e_tile);
		this.e_tile_img = addElement("img", "phased-gallery-entry-img", this.e_tile);
	}

	SetData(entryData)
	{
		this.entryData = entryData;
	}
}

export class PhasedGallery
{
	constructor(maxRealCount = 4)
	{
		this.created = false;
		this.scrollDeltaSum = 0.0;
		this.frameDeltaTime = 0.0;
		this.timestampPrevious = -1;
		this.maxRealCount = maxRealCount;
		this.gallery = new VirtualGallery(maxRealCount);

		this.virtualItems = [
			new PhasedGalleryEntryData("Item A", "/../gallery/revenants/rev_01.png"),
			new PhasedGalleryEntryData("Item B", "/../gallery/revenants/rev_02.png"),
			new PhasedGalleryEntryData("Item C", "/../gallery/revenants/rev_03.png"),
			new PhasedGalleryEntryData("Item D", "/../gallery/revenants/rev_04.png"),
			new PhasedGalleryEntryData("Item E", "/../gallery/ssfs/SSFS_Screen2.png"),
			new PhasedGalleryEntryData("Item F", "/../gallery/ssfs/SSFS_Screen3.jpg"),
			new PhasedGalleryEntryData("Item G", "/../gallery/ssfs/SSFS_Screen4.jpg"),
			new PhasedGalleryEntryData("Item H", "/../gallery/ssfs/SSFS_Screen5.jpg")
		];

		this.gallery.SetVirtualItems(this.virtualItems);

		this.Create();
	}

	AppendRoot(toParent) { toParent.appendChild(this.e_root); }

	Create()
	{
		if (this.created) return;
		this.created = true;

		this.e_root = addElement("div", "phased-gallery-root", null);
		this.e_view = addElement("div", "phased-gallery-view", this.e_root);

		window.addEventListener("keydown", e =>
		{
			if (e.key == 'ArrowDown') this.gallery.MoveToNextTile(-1);
			else if (e.key == 'ArrowUp') this.gallery.MoveToNextTile(1);
		});

		this.e_view.addEventListener("wheel", e => { this.gallery.MoveToNextTile(Math.sign(e.deltaY)); });

		this.entryTiles = [];
		for (var tileId = 0; tileId < this.maxRealCount; tileId++)
		{
			var entry = new PhasedGalleryEntry(this.e_view, tileId, { label: "NULL", imgSrc: "white" });
			this.entryTiles.push(entry);
		}

		this.UpdateTiles();
		requestAnimationFrame(ts => { this.ScrollAnimationFrame(ts); });
	}

	Release()
	{
		if (!this.created) return;
		this.created = false;

		this.e_root.remove();
	}

	ScrollAnimationFrame(timestamp)
	{
		this.frameDeltaTime += timestamp - this.timestampPrevious;
		this.timestampPrevious = timestamp;

		if (this.frameDeltaTime < 20)
		{
			requestAnimationFrame(ts => { this.ScrollAnimationFrame(ts); });
			return;
		}

		this.UpdateTiles();

		this.frameDeltaTime = 0.0;
		this.scrollDeltaSum = 0.0;
		requestAnimationFrame(ts => { this.ScrollAnimationFrame(ts); });
	}

	UpdateTiles()
	{
		var wrappedScrollIndex = this.gallery.scrollIndex;
		while (wrappedScrollIndex < 0) wrappedScrollIndex += this.virtualItems.length;
		while (wrappedScrollIndex >= this.virtualItems.length) wrappedScrollIndex -= this.virtualItems.length;
		var halfCount = this.virtualItems.length / 2;

		for (var tileId = 0; tileId < this.maxRealCount; tileId++)
		{
			var realItemData = this.gallery.itemsReal[tileId];
			var virtualItemRef = this.virtualItems[realItemData.idVirtual];

			var realIdWrapped = realItemData.idReal;
			while (realIdWrapped < 0) realIdWrapped += this.maxRealCount;
			while (realIdWrapped >= this.maxRealCount) realIdWrapped -= this.maxRealCount;

			if (this.entryTiles[tileId].e_tile_label.innerText != virtualItemRef.label) this.entryTiles[tileId].e_tile_label.innerText = virtualItemRef.label;
			this.entryTiles[tileId].e_tile_img.src = virtualItemRef.imgSrc;

			var idOffset = (realIdWrapped - halfCount);
			var posLeft = 50 + 10 * idOffset;
			var opacity = 1.0 - 0.9 * Math.abs(idOffset);

			this.entryTiles[tileId].e_tile.style.transform = `translate(${posLeft - 50}%, 0%) scale(${1.0 - 0.1 * idOffset})`;
			this.entryTiles[tileId].e_tile.style.opacity = Math.pow(Math.max(0.0, opacity), 2);
		}
	}
}