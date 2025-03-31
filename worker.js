export default {
	async fetch(request) {
		const url = new URL(request.url);
		const imageId = url.searchParams.get("id");
		const size = url.searchParams.get("size") || "s1200"; // Default size
		const mode = url.searchParams.get("mode") || "lh3";   // Default mode
		const download = url.searchParams.get("download");
		const name = url.searchParams.get("name");

		if (!imageId) {
			return new Response("Missing image ID", { status: 400 });
		}

		// Choose correct Google Drive URL format
		let googleDriveUrl;
		switch (mode) {
			case "lh3":
				googleDriveUrl = `https://lh3.googleusercontent.com/d/${imageId}=${size}`;
				break;
			case "native":
				googleDriveUrl = `https://drive.google.com/uc?export=view&id=${imageId}`;
				break;
			default:
				return new Response("Invalid mode", { status: 400 });
		}

		try {
			const response = await fetch(googleDriveUrl, { redirect: "follow" });

			if (!response.ok) {
				return new Response(`Google Drive error: ${response.statusText}`, { status: response.status });
			}

			// CORS - CORB & cache
			let headers = {
				"Content-Type": response.headers.get("Content-Type"),
				"Access-Control-Allow-Origin": "*",
				"Cache-Control": "public, max-age=86400, immutable",
			};

			if (download === "true" && name) {
				Object.assign(headers, {
					"Content-Disposition": `attachment; filename="${name}"`,
					"Cache-Control": "no-cache, no-store, must-revalidate",
					"Pragma": "no-cache",
					"Expires": "0"
				});
			}

			return new Response(response.body, { headers });
		} catch (error) {
			return new Response(`Fetch error: ${error.message}`, { status: 500 });
		}
	},
};
