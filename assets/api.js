export class GoogleDriveAPI {
    constructor(folderId) {
        this.folderId = folderId;
        this.apiKey = "SOME_API_KEY_j862eL-eXoUU7hR_SOME_API_KEY"; // <== Replace with your Google Drive API Key
        this.baseUrl = "https://www.googleapis.com/drive/v3/files";
		this.folderName = null;
    }

    async fetchImages() {
        const url = `${this.baseUrl}?q='${this.folderId}'+in+parents&key=${this.apiKey}&fields=files(id,name,mimeType)`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.files.filter(file => file.mimeType.startsWith("image/"));
        } catch (error) {
            console.error("Error when fetching images from Google Drive:", error);
            return [];
        }
    }

	async checkFolderId() {
		const url = `${this.baseUrl}/${this.folderId}?fields=name,mimeType&key=${this.apiKey}`;

		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

			const data = await response.json();
			if (data.mimeType === "application/vnd.google-apps.folder") {
				this.folderName = data.name;
				console.log(`Folder is valid: ${data.name}`);
				return true;
			} else {
				console.log(`Error! This ID is not a folder: ${data.mimeType}`);
				return false;
			}
		} catch (error) {
			console.log(`Folder is not valid: ${error.message}`);
			return false;
		}
	}

	getImageUrl(imageId, options = {}) {
		const params = new URLSearchParams();

		if (options.imageSize) params.append("size", options.imageSize);
		if (options.urlType) params.append("mode", options.urlType);
		if (options.download) params.append("download", options.download);
		if (options.name) params.append("name", options.name);

		return `https://SOME_WORKER_NAME.SOMETHING_ELSE.workers.dev/?id=${imageId}&${params.toString()}`; // <== Replace with your Cloudflare Workers domain
	}

	getNativeDlUrl(imageId) {
		return `https://drive.google.com/uc?export=download&id=${imageId}`;
	}
}

export class GoogleAppsScript {
	getScriptUrl() {
		return `https://script.google.com/macros/s/SOME_ID_YJJ2AtBJukg4Zi2MMST5KmQfx8i_SOME_ID/exec`; // <== Replace with your Google Apps Script deploy URL
	}
}
