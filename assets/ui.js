export class GalleryUI {
    constructor(galleryId, instanceManager) {
        this.gallery = document.getElementById(galleryId);
		this.instanceManager = instanceManager;

		this.notePopup = document.getElementById("note-popup");
		this.createNotePopup();

		this.galleryName = document.getElementById("gallery-name");
    }

	getInstance() {
		this.modalUI = this.instanceManager.get("ModalUI");
		this.bottomBar = this.instanceManager.get("BottomBar");
	}

    renderImages(imagesList, driveAPI) {
		createDataset(imagesList); // Create new data stucture for LocalStorage

		this.bottomBar.updateSelectInfo(); // Update bottom bar info

		this.galleryName.textContent = driveAPI.folderName ? driveAPI.folderName : "Untitled Gallery"; // Set gallery name

        this.gallery.innerHTML = imagesList.length ? "" : "<p>No images available!</p>";

        imagesList.forEach(image => {
            const imageUrl = driveAPI.getImageUrl(image.id);
            const imageData = this.getImageData(image.id);

            const container = this.createElement("div", "image-container");
            const imageElement = this.createElement("div", "image-box", `<img src="${imageUrl}" alt="${image.name}" />`);
            const titleElement = this.createElement("div", "image-title", `<p class="image-name">${image.name}</p>`);
            const infoElement = this.createElement("div", "image-info");

            // Create buttons
            const viewButton = this.createButton("view-btn", () => this.modalUI.open(image.id));
            const noteButton = this.createButton("note-btn", () => this.showNotePopup(image.id));
            const selectButton = this.createButton("select-btn", () => this.toggleSelect(image.id, selectButton));

			// Set ID for each specific "image-info"
			infoElement.setAttribute("id", image.id);

			// Load note button & select button state
			noteButton.classList.toggle("has-note", imageData.note.trim());
			selectButton.classList.toggle("selected", imageData.selected);

            // Append elements
            infoElement.append(viewButton, noteButton, selectButton);
            container.append(imageElement, titleElement, infoElement);
            this.gallery.appendChild(container);
        });
    }

    createNotePopup() {
        const noteContent = document.createElement("div");
		noteContent.className = "note-content";
        noteContent.innerHTML = `
			<p id="note-label"></p>
			<textarea id="note-input" placeholder="Enter your note..."></textarea>
			<div class="popup-buttons">
				<button id="close-note">Close</button>
				<button id="save-note">Save</button>
			</div>
        `;

        this.notePopup.appendChild(noteContent);

        // Close popup on button click
        noteContent.querySelector("#close-note").onclick = () => this.hideNotePopup();
        noteContent.querySelector("#save-note").onclick = () => this.saveNote();
    }

    createElement(tag, className, innerHTML = "") {
        const element = document.createElement(tag);
        element.className = className;
        element.innerHTML = innerHTML;

        return element;
    }

    createButton(className, onClick) {
        const button = document.createElement("button");
        button.className = className;
        button.onclick = onClick;

		return button;
    }

    showNotePopup(imageId) {
		const imageData = this.getImageData(imageId);

		this.currentImageId = imageId;

		this.notePopup.querySelector("#note-label").textContent = `Note for ${imageData.name}:`; // Load image name
		this.notePopup.querySelector("#note-input").value = imageData.note || ""; // Load existing note

		toggleDisplay(this.notePopup, true); // Show popup

		preventScroll(true);
    }

    hideNotePopup() {
        toggleDisplay(this.notePopup, false); // Hide popup

		preventScroll(false);
    }

    saveNote() {
		// Saving note
        const noteText = this.notePopup.querySelector("#note-input").value;
        if (this.currentImageId) {
            const imageData = this.getImageData(this.currentImageId);
            imageData.note = noteText;
            this.saveImageData(this.currentImageId, imageData);

			// Search all note buttons from gallery & viewer
			const noteButton = document.querySelectorAll(`[id="${this.currentImageId}"] .note-btn, [id="${this.currentImageId}"] .note`);
			noteButton.forEach(button => {
				if (noteText.trim()) {
					button.classList.add("has-note");
				} else {
					button.classList.remove("has-note");
				}
			});
		}

		this.hideNotePopup(); // Hide popup after saving
    }

	toggleSelect(imageId) {
		const imageData = this.getImageData(imageId);
		imageData.selected = !imageData.selected;

		this.saveImageData(imageId, imageData);

		// Search all select buttons from gallery & viewer
		const selectButton = document.querySelectorAll(`[id="${imageId}"] .select-btn, [id="${imageId}"] .select`);
		selectButton.forEach(button => button.classList.toggle("selected", imageData.selected)); // Update select buttons

		this.bottomBar.updateSelectInfo(); // Update bottom bar info
	}

    getImageData(imageId) {
		const storageKey = "localImagesData";
        const storedData = JSON.parse(localStorage.getItem(storageKey)) || {};

        return storedData[imageId] || {};
    }

	saveImageData(imageId, imageData) {
		const storageKey = "localImagesData";
		const newData = JSON.parse(localStorage.getItem(storageKey)) || {};

		newData[imageId] = imageData;

		localStorage.setItem("localImagesData", JSON.stringify(newData));
	}
}

export class ModalUI {
    constructor(modalId, imagesList, driveAPI, instanceManager) {
        this.modal = document.getElementById(modalId);
        this.imagesList = imagesList;
		this.driveAPI = driveAPI;
		this.instanceManager = instanceManager;

		this.viewerContainer = this.modal.querySelector(".viewer-container");
        this.modalImage = document.getElementById("modal-image");

        this.currentIndex = 0;
		this.matrixOld = null;
		this.isClickOutside = null;

		this.initEvents();
    }

	getInstance() {
		this.imagePan = this.instanceManager.get("ImagePan");
		this.galleryUI = this.instanceManager.get("GalleryUI");
	}

	initEvents() {
		// Header
		this.modal.querySelector(".close-btn").addEventListener("click", () => this.close());
		this.modal.querySelector(".external-btn").addEventListener("click", () => this.openImage("external"));

		// Navigator
		this.modal.querySelector(".next-btn").onclick = () => this.next();
        this.modal.querySelector(".prev-btn").onclick = () => this.prev();

		// Footer
		this.modal.querySelector(".zoom-in-btn").onclick = (e) => this.imageTransform(0.5, "zoomIn", null, null, e);
        this.modal.querySelector(".zoom-out-btn").onclick = (e) => this.imageTransform(0.5, "zoomOut", null, null, e);
        this.modal.querySelector(".reset-view-btn").onclick = () => this.resetView();
        this.modal.querySelector(".download-btn").onclick = () => this.openImage("download1");

		// Info
		this.modal.querySelector(".note").onclick = () => this.handleNote();
		this.modal.querySelector(".select").onclick = () => this.handleSelect();

        // Close modal when clicking outside
		this.viewerContainer.addEventListener("pointerdown", (e) => {
			this.isClickOutside = e.target === this.viewerContainer;
		});

        this.viewerContainer.addEventListener("pointerup", (e) => {
            if (this.isClickOutside && e.target === this.viewerContainer) {
				this.close();
			}
			this.isClickOutside = false;
        });
	}

    // Open modal
	open(imageId) {
		const index = this.imagesList.findIndex(image => image.id === imageId);
		if (index === -1) return; // Stop when image not found

		this.currentIndex = index;

		this.updateImage();

		toggleDisplay(this.modal, true); //Show modal

		preventScroll(true);
	}

    // Close modal
	close() {
		toggleDisplay(this.modal, false); //Hide modal

		preventScroll(false);
	}

    // Next image
    next() {
        if (this.currentIndex < this.imagesList.length - 1) {
            this.currentIndex++;

			// Temporarily disable transition
			this.modalImage.classList.add("no-transition");

            this.updateImage();

			// Re-enable transition with animation sync
			requestAnimationFrame(() => {
				this.modalImage.classList.remove("no-transition");
			});
        }
	}

    // Previous image
    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;

			// Temporarily disable transition
			this.modalImage.classList.add("no-transition");

            this.updateImage();

			// Re-enable transition with animation sync
			requestAnimationFrame(() => {
				this.modalImage.classList.remove("no-transition");
			});
        }
    }

    // Update image to current index
    updateImage() {
        const imageId = this.imagesList[this.currentIndex].id;
        const imageUrl = this.driveAPI.getImageUrl(imageId);
        this.modalImage.src = imageUrl;

		// Set ID for "viewer-info"
		this.modal.querySelector(".viewer-info").setAttribute("id", imageId);

		this.updateNavButtons();
		this.updateViewerTitle();
		this.updateViewerInfo();

		this.imageTransform(1, null, 0, 0); // Default Zoom & Position after updating image
		this.modalImage.classList.remove("allow-toggle-view"); // Reset toggle view after updating image
    }

	// Download image or open in new tab
	openImage(mode) {
        const imageId = this.imagesList[this.currentIndex].id;
		const imageName = this.imagesList[this.currentIndex].name;
		const mimeType = this.imagesList[this.currentIndex].mimeType;

		const imageType = mimeType.split("/")[1]; // Get the part after the "/"
		const validTypes = ["jpeg", "png", "webp", "bmp"];

		let imageUrl;
		switch (mode) {
			case "download1":
				imageUrl = this.driveAPI.getNativeDlUrl(imageId);
				window.open(imageUrl, "_self"); // Download image via Google Drive
				break;
			case "download2":
				imageUrl = this.driveAPI.getImageUrl(imageId, { urlType: "native", download: "true", name: imageName });
				window.open(imageUrl, "_self"); // Download image via Cloudflare Worker
				break;
			case "external":
				if (validTypes.includes(imageType)) {
					imageUrl = this.driveAPI.getImageUrl(imageId, { urlType: "native" });
				} else {
					imageUrl = this.driveAPI.getImageUrl(imageId, { imageSize: "s0", urlType: "lh3" });
				}
				window.open(imageUrl, "_blank"); // Open in new tab
				break;
			default:
				console.log("Invalid mode!");
		}
	}

	// Image Zoom & Position
	imageTransform(zoomValue = null, zoomType = null, x = null, y = null, e) {
		let matrix = getMatrix(this.modalImage);
		let currentScale = matrix.a; // Or matrix.b, matrix.m11, matrix.m22

		// Handle Zoom
		if (zoomValue !== null) {
			// Calculate new scale value
			let newScale;
			switch (zoomType) {
				case "zoomIn":
					newScale = Math.min(3, currentScale + zoomValue);
					break;
				case "zoomOut":
					newScale = Math.max(0.5, currentScale - zoomValue);
					break;
				default:
					newScale = zoomValue;
			}

			matrix.m11 = newScale; // X-axis scale value
			matrix.m22 = newScale; // Y-axis scale value

			this.updateZoomInfo(newScale);
			this.updateZoomButtons(newScale);
		}

		// Handle position
		if (x !== null && y !== null) {
			matrix.m41 = x;
			matrix.m42 = y;

			this.imagePan.resetPan(x, y); // Reset panning parameters
		}

		this.modalImage.style.transform = matrix.toString(); // Update transform matrix

		if (e) {
			this.modalImage.classList.remove("allow-toggle-view"); // Reset toggle view if proactive zoom
		}
	}

	updateNavButtons() {
		const firstIndex = 0;
		const lastIndex = this.imagesList.length - 1;
		const nextBtn = this.modal.querySelector(".next-btn");
		const prevBtn = this.modal.querySelector(".prev-btn");

		nextBtn.disabled = this.currentIndex >= lastIndex;
		prevBtn.disabled = this.currentIndex <= firstIndex;
	}

	updateZoomInfo(scale) {
		const zoomPercent = Math.trunc(scale * 100);
		const zoomInfo = this.modal.querySelector("#zoom-info");
		zoomInfo.textContent = `${zoomPercent}%`;
	}

	updateZoomButtons(scale) {
		const minScale = 0.5;
		const maxScale = 3;
		const zoomInBtn = this.modal.querySelector(".zoom-in-btn");
		const zoomOutBtn = this.modal.querySelector(".zoom-out-btn");

		zoomInBtn.disabled = scale >= maxScale;
		zoomOutBtn.disabled = scale <= minScale;
	}

	resetView() {
		let matrix;

		if (this.modalImage.classList.contains("allow-toggle-view")) {
			// If allow-toggle-view, rollback to old view
			matrix = new DOMMatrix(this.matrixOld.toString());

			this.modalImage.classList.remove("allow-toggle-view");
		} else {
			// Otherwise set default view & save old view, then allow-toggle-view
			this.matrixOld = getMatrix(this.modalImage);
			matrix = new DOMMatrix("");

			this.modalImage.classList.add("allow-toggle-view");
		}

		this.imageTransform(matrix.a, null, matrix.m41, matrix.m42);
	}

	updateViewerTitle() {
		const imageName = this.imagesList[this.currentIndex].name;
		const currentOrder = this.currentIndex + 1;
		const lastOrder = this.imagesList.length;

		const name = this.modal.querySelector(".name");
		const index = this.modal.querySelector(".index");

		name.textContent = imageName;
		index.textContent = `${currentOrder}/${lastOrder}`;
	}

	updateViewerInfo() {
		const imageId = this.imagesList[this.currentIndex].id;
		const imageData = this.galleryUI.getImageData(imageId);

		const note = this.modal.querySelector(".note");
		const select = this.modal.querySelector(".select");

		note.classList.toggle("has-note", imageData.note.trim());
		select.classList.toggle("selected", imageData.selected);
	}

	handleNote() {
		const imageId = this.imagesList[this.currentIndex].id;
		this.galleryUI.showNotePopup(imageId);
	}

	handleSelect() {
		const imageId = this.imagesList[this.currentIndex].id;
		this.galleryUI.toggleSelect(imageId);
	}
}

export class ImagePan {
	constructor(modalImageId, instanceManager) {
        this.modalImage = document.getElementById(modalImageId);
		this.instanceManager = instanceManager;

        this.isPanning = null;
        this.start = {x: 0, y: 0}
        this.translateX = 0;
        this.translateY = 0;

		this.initEvents();
	}

	getInstance() {
		// this.classInstance = this.instanceManager.get("ClassName");
	}

	// Asign events
	initEvents() {
		// Desktop
        this.modalImage.addEventListener("mousedown", (e) => this.startPan(e));
        window.addEventListener("mousemove", (e) => this.pan(e));
        window.addEventListener("mouseup", (e) => this.endPan(e));

		// Mobile
        this.modalImage.addEventListener("touchstart", (e) => this.startPan(e));
        window.addEventListener("touchmove", (e) => this.pan(e));
        window.addEventListener("touchend", (e) => this.endPan(e));
	}

	getPointerPosition(e) {
		if (e.touches) {
			return { x: e.touches[0].clientX, y: e.touches[0].clientY };
		}
		return { x: e.clientX, y: e.clientY };
	}

	startPan(e) {
		let pos = this.getPointerPosition(e);

		this.start = { x: pos.x - this.translateX, y: pos.y - this.translateY };
		this.isPanning = true;

		console.log("Panning: ", this.isPanning);
		console.log("PosX: ", pos.x, "PosY: ", pos.y);
		console.log("StartX: ", this.start.x, "StartY: ", this.start.y);
	}

	pan(e) {
		if (!this.isPanning) return;

		let pos = this.getPointerPosition(e);

		this.translateX = (pos.x - this.start.x);
		this.translateY = (pos.y - this.start.y);

		// Update image coordinates with animation sync
		requestAnimationFrame(() => {
			this.updateTranslate();
		});

		this.modalImage.classList.remove("allow-toggle-view"); // Reset toggle view when pan image

		console.log("X: ", this.translateX, "Y: ", this.translateY);
	}

	endPan(e) {
		this.isPanning = false;

		console.log("Panning: ", this.isPanning);
	}

	updateTranslate() {
		let matrix = getMatrix(this.modalImage);

		matrix.m41 = this.translateX; // X-axis translate value
		matrix.m42 = this.translateY; // Y-axis translate value

		// Temporarily disable transition
		this.modalImage.classList.add("no-transition");

		this.modalImage.style.transform = matrix.toString();

		// Re-enable transition with animation sync
		requestAnimationFrame(() => {
			this.modalImage.classList.remove("no-transition");
		});
	}

	resetPan(x, y) {
        this.translateX = x;
        this.translateY = y;
	}
}

export class BottomBar {
	constructor(bottomBarId, driveAPI, scriptUrl, instanceManager) {
		this.bottomBar = document.getElementById(bottomBarId);
		this.scriptUrl = scriptUrl;
		this.instanceManager = instanceManager;
		

		this.lastScrollPos = window.scrollY;
		this.galleryName = driveAPI.folderName ? driveAPI.folderName : "Untitled Gallery";

		this.initEvents();
	}

	getInstance() {
		this.notiCenter = this.instanceManager.get("NotiCenter");
	}

	initEvents() {
		this.bottomBar.classList.remove("temporary-hidden"); // Default show

		window.addEventListener("scroll", () => {
			let currentScrollPos = window.scrollY;

			if (currentScrollPos < this.lastScrollPos - 10) {  
				// Show bottom bar
				this.bottomBar.classList.remove("temporary-hidden");
			} 
			else if (currentScrollPos > this.lastScrollPos + 10) {  
				// Hide bottom bar
				this.bottomBar.classList.add("temporary-hidden");
			}

			this.lastScrollPos = currentScrollPos; // Update scrolling position
		});

		this.bottomBar.querySelector(".clipboard-btn").onclick = () => this.copyToClipboard();
		this.bottomBar.querySelector(".request-btn").onclick = () => this.notiCenter.createConfirmDialog("Check your selected images:", this.getConfirmMessage(), () => this.sendToGoogleSheet());
	}

	updateSelectInfo() {
		const storageKey = "localImagesData";
        const storedData = JSON.parse(localStorage.getItem(storageKey)) || {};

		const selectInfo = this.bottomBar.querySelector(".select-info");
		const totalImages = Object.keys(storedData).length;
		const selectedImages = Object.values(storedData).filter(item => item.selected).length;

		selectInfo.textContent = `${selectedImages}/${totalImages}`;
	}

	getSelectData() {
		const storageKey = "localImagesData";
        const storedData = JSON.parse(localStorage.getItem(storageKey)) || {};

		const selectedImages = [];
		const others = [];

		Object.values(storedData).forEach(image => {
			if (image.selected) {
				selectedImages.push({ name: image.name, note: image.note });
			} else if (image.note) {
				others.push({ name: image.name, note: image.note });
			}
		});

		return { selectedImages, others };
	}

	async copyToClipboard() {
		const { selectedImages, others } = this.getSelectData();

		if (!selectedImages.length && !others.length) {
			this.notiCenter.createToastNoti("No selected images!");
			return; // Stop when no images selected or noted
		}

		const selectedImagesText = this.dataToText(selectedImages);
		const othersText = this.dataToText(others);

		const clipboardText = `${this.galleryName}\n❤️ Selected Images:\n${selectedImagesText}\n\n📌 Others:\n${othersText}`;

		try {
			await navigator.clipboard.writeText(clipboardText);

			console.log("📋 Copied to clipboard!");
			this.notiCenter.createToastNoti("Copied to clipboard!");
		} catch (error) {
			console.error("Copy failed:", error);
			this.notiCenter.createToastNoti("Copy failed!");
		}
	}

	async sendToGoogleSheet() {
		const data = this.getSelectData();
		data.galleryName = this.galleryName;

		if (!data.selectedImages.length && !data.others.length) {
			this.notiCenter.createToastNoti("No selected images!");
			return; // Stop when no images selected or noted
		}

		this.notiCenter.createToastNoti("Requesting, please wait...");

		try {
			const response = await fetch(this.scriptUrl, {
				method: "POST",
				body: JSON.stringify(data)
			});

			const result = await response.json();

			console.log("Result:", result);
			this.notiCenter.createToastNoti("Request sent!");
		} catch (error) {
			console.error("Error:", error);
			this.notiCenter.createToastNoti("Request failed, try again!");
		}
	}

	getConfirmMessage() {
		const { selectedImages, others } = this.getSelectData();

		if (!selectedImages.length && !others.length) {
			return "No selected images!";
		}

		const selectedImagesText = this.dataToText(selectedImages);
		const othersText = this.dataToText(others);

		const confirmMessage = `❤️ Selected Images:\n${selectedImagesText}\n\n📌 Others:\n${othersText}`;

		return confirmMessage;
	}

	dataToText(data) {
		const text = data
			.map(image => `+ ${image.name}${image.note ? `: ${image.note}` : ""}`)
			.join("\n");

		return text;
	}
}

export class NotiCenter {
	constructor(notiCenterId, instanceManager) {
		this.notiCenter = document.getElementById(notiCenterId);
		this.instanceManager = instanceManager;
	}

	getInstance() {
		// this.classInstance = this.instanceManager.get("ClassName");
	}

	createToastNoti(message) {
		this.removeOverflowToast();

		const toastNoti = document.createElement("div");
		toastNoti.className = "toast-noti";
        toastNoti.innerHTML = `
			<span class="toast-icon"></span>
			<p>${message}</p>
			<span class="toast-close"></span>
        `;

		this.notiCenter.appendChild(toastNoti);

		toastNoti.querySelector(".toast-close").addEventListener("click", () => {
			this.removeToast(toastNoti);
		});

		// Close toast after 3 seconds
		setTimeout(() => {
			this.removeToast(toastNoti);
		}, 3000);
	}

	removeOverflowToast() {
		const toasts = this.notiCenter.querySelectorAll(".toast-noti");

		if (toasts.length > 4) {
			toasts[0].remove();
		}
	}

	removeToast(toast) {
		toast.classList.add("swipe-out"); // Trigger animation
		setTimeout(() => toast.remove(), 300); // Wait until animation complete, sync with CSS
	}

	createConfirmDialog(title, message, confirm) {
		const confirmDialog = document.createElement("div");
		confirmDialog.className = "confirm-dialog";
		confirmDialog.innerHTML = `
			<span class="dialog-title">${title}</span>
			<div class="message-viewer">${message}</div>
			<div class="button-container">
				<button class="dialog-close">Close</button>
				<button class="dialog-confirm">Confirm</button>
			</div>
		`;

		this.notiCenter.appendChild(confirmDialog);

		confirmDialog.querySelector(".dialog-close").addEventListener("click", () => {
			this.removeDialog(confirmDialog);
		});
		confirmDialog.querySelector(".dialog-confirm").addEventListener("click", () => {
			confirm();
			this.removeDialog(confirmDialog);
		});

		this.notiCenter.classList.add("dialog");
		preventScroll(true);
	}

	removeDialog(dialog) {
		dialog.remove();

		this.notiCenter.classList.remove("dialog");
		preventScroll(false);
	}
}

function toggleDisplay(element, show) {
    if (show) {
        element.classList.remove("hidden");
        element.classList.add("visible");
    } else {
		element.classList.remove("visible");
        element.classList.add("hidden");
    }
}

function preventScroll(block) {
	if (block) {
	    document.body.style.overflow = "hidden";
	} else if (!document.querySelector(".visible")) {
		document.body.style.overflow = "";
	}
}

function getMatrix(element) {
	let currentTransform = window.getComputedStyle(element).transform;
	return new DOMMatrix(currentTransform === "none" ? "" : currentTransform);
}

function createDataset(array) {
	// Convert to new Object
	const dataset = array.reduce((acc, { id, name }) => {
		acc[id] = { name, note: "", selected: false };
		return acc;
	}, {});

	const storageKey = "localImagesData";

	// Get old data from LocalStorage
	const storedData = JSON.parse(localStorage.getItem(storageKey));

	// If there is old data, check if its structure is valid
	const isValid = storedData && typeof storedData === "object";

	// Get old `note` and `selected` data if any
	if (isValid) {
		for (const id in storedData) {
			if (dataset[id]) {
				dataset[id].note = storedData[id].note || "";
				dataset[id].selected = storedData[id].selected || false;
			}
		}
	}

	// Overwrite new data to LocalStorage
	localStorage.setItem(storageKey, JSON.stringify(dataset));
}
