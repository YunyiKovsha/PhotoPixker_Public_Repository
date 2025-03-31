import { GoogleDriveAPI, GoogleAppsScript } from "./api.js";
import { GalleryUI, ModalUI, ImagePan, BottomBar, NotiCenter } from "./ui.js";

class InstanceManager {
	constructor() {
		this.instances = {};
	}

	register(name, instance) {
		this.instances[name] = instance;
	}

	get(name) {
		return this.instances[name];
	}
}

document.addEventListener("DOMContentLoaded", async () => {
	const params = new URLSearchParams(window.location.search);
	const folderId = params.get("gallery");
	if (!folderId) {
		createUrlInputPrompt("Enter Google Drive folder URL:");
		return;
	}

	const driveAPI = new GoogleDriveAPI(folderId);

	const folderIsValid = await driveAPI.checkFolderId();
	if (!folderIsValid) {
		createUrlInputPrompt("URL is not valid, try again:");
		return;
	}

	__init__(driveAPI);
});

function createUrlInputPrompt(message) {
	const gallery = document.getElementById("gallery");
	gallery.innerHTML = "";

	const urlInputPrompt = document.createElement("div");
	urlInputPrompt.id = "url-input-prompt"
	urlInputPrompt.innerHTML = `
		<p>${message}</p>
		<div class=search-bar>
			<input id="url-input" type="text" placeholder="https://drive.google.com/drive/folders/...">
			<button id="proceed-btn"></button>
		</div>
	`;

	gallery.appendChild(urlInputPrompt);

	urlInputPrompt.querySelector("#proceed-btn").onclick = () => handleProceed();
}

function handleProceed() {
	const notiCenter = new NotiCenter("noti-center");

	const urlInput = document.getElementById("url-input").value;
	if (!urlInput) {
		notiCenter.createToastNoti("Please enter URL!");
		return;
	}

	const match = urlInput.match(/drive\/folders\/([a-zA-Z0-9_-]+)/);
	if (!match) {
		notiCenter.createToastNoti("Wrong URL format!");
		return;
	} else {
		let url = new URL(window.location.href);
		url.searchParams.set("gallery", match[1]);
		window.location.href = url.toString();
	}
}

async function __init__(driveAPI) {
	const instanceManager = new InstanceManager();

	const appsScript = new GoogleAppsScript();

    const imagesList = await driveAPI.fetchImages();
	const scriptUrl = appsScript.getScriptUrl();

	const instances = {
		GalleryUI: new GalleryUI("gallery", instanceManager),
		ModalUI: new ModalUI("image-viewer", imagesList, driveAPI, instanceManager),
		ImagePan: new ImagePan("modal-image", instanceManager),
		BottomBar: new BottomBar("bottom-bar", driveAPI, scriptUrl, instanceManager),
		NotiCenter: new NotiCenter("noti-center", instanceManager),
	};

	Object.entries(instances).forEach(([name, instance]) => instanceManager.register(name, instance));

	Object.values(instances).forEach(instance => instance.getInstance?.());

    instances.GalleryUI.renderImages(imagesList, driveAPI);
}
