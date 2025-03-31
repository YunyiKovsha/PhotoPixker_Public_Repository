function doPost(e) {
	const sheet = SpreadsheetApp.openById("SOME_ID_1XATBGt9LcEHnd0N3M0uq_SOME_ID").getActiveSheet(); // <== Replace with your public Google Sheet ID
	const data = JSON.parse(e.postData.contents);
	const timestamp = new Date();
	const row = sheet.getLastRow() + 1;
	const lock = LockService.getScriptLock();
	lock.waitLock(10000);

	try {
		// Write timestamp
		sheet.getRange(row, 1).setValue(timestamp)
							  .setFontWeight("bold")
							  .setFontColor("#ffffff")
							  .setBackground("#6d9eeb");

		// Write gallery name
		sheet.getRange(row + 1, 1).setValue(data.galleryName)
							  .setFontWeight("bold")
							  .setFontColor("#277ac5")

		// Write selectedImages and others
		const selectedRows = writeData(sheet, row, 2, data.selectedImages);
		const othersRows = writeData(sheet, row, 4, data.others);

		// Data background
		sheet.getRange(row + 1, 1, Math.max(selectedRows, othersRows), 5).setBackground("#eef4ff");

		lock.releaseLock();

		return ContentService.createTextOutput(JSON.stringify({
			status: "success",
			message: "Data added successfully",
			timestamp: timestamp,
			rowsAdded: { selectedImages: selectedRows, others: othersRows }
		}, null, 2)).setMimeType(ContentService.MimeType.JSON);
	} catch (error) {
		lock.releaseLock();
		return ContentService.createTextOutput(JSON.stringify({
			status: "error",
			message: error.toString()
		}, null, 2)).setMimeType(ContentService.MimeType.JSON);
	}
}

function writeData(sheet, row, col, data) {
	// First write title
	sheet.getRange(row, col, 1, 2).setValues([["Name", "Note"]])
								  .setFontWeight("bold")
								  .setFontColor("#ffffff")
								  .setBackground("#6d9eeb");

	if (!data?.length) return 0; // Stop when no data
	const formattedData = data.map(item => [item.name, item.note]);
	sheet.getRange(row + 1, col, formattedData.length, 2).setValues(formattedData);

	return formattedData.length; // Return number of lines written
}
