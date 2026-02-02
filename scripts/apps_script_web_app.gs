/* 
  OpenIndex Cloud Connector v1.0
  Dán code này vào Google Apps Script và Deploy dưới dạng Web App (thiết lập Anyone has access).
*/

const DRIVE_FOLDER_ID = "1UwSmQ71MR3Lk13-RnlP2pG572AP8vLz1";

function doGet() {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const subFolders = ["health", "finance", "hybrid"];
    let allRecords = [];

    subFolders.forEach(subFolderName => {
      const subFolderIterator = folder.getFoldersByName(subFolderName);
      if (subFolderIterator.hasNext()) {
        const subFolder = subFolderIterator.next();
        const files = subFolder.getFilesByType(MimeType.PLAIN_TEXT);
        
        while (files.hasNext()) {
          const file = files.next();
          if (file.getName().endsWith('.yaml')) {
            allRecords.push({
              filename: file.getName(),
              domain: subFolderName,
              content: file.getBlob().getDataAsString()
            });
          }
        }
      }
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      timestamp: new Date().toISOString(),
      data: allRecords
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
