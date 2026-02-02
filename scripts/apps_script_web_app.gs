/* 
  OpenIndex Cloud Connector v1.2
  - Structure: Cache-first (doGet serves CACHE_KEY)
  - Pipeline: scanOpenIndex (processes Drive -> Cache)
  - Logic: Status (90/180 days), Signal (unknown)
*/

const DRIVE_FOLDER_ID = "1UwSmQ71MR3Lk13-RnlP2pG572AP8vLz1";
const DOMAINS = ["health", "finance", "hybrid"];
const CACHE_KEY = "OPENINDEX_CACHE_JSON";

/**
 * PUBLIC API – READ ONLY
 */
function doGet() {
  try {
    const cached = PropertiesService.getScriptProperties().getProperty(CACHE_KEY);
    return ContentService.createTextOutput(cached || JSON.stringify({
      status: "empty",
      message: "OpenIndex cache not generated yet. Please run scanOpenIndex()."
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error", message: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * PIPELINE JOB – SCAN DRIVE
 */
function scanOpenIndex() {
  console.log("[OpenIndex] Starting scan...");
  const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  let allRecords = [];

  DOMAINS.forEach(domain => {
    console.log("Scanning domain:", domain);
    const subFolderIterator = rootFolder.getFoldersByName(domain);
    if (!subFolderIterator.hasNext()) {
      console.warn("Domain folder not found:", domain);
      return;
    }

    const subFolder = subFolderIterator.next();
    // V1.3 FIX: Remove MIME type filter as Drive misidentifies YAML files frequently
    const files = subFolder.getFiles(); 

    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      
      // Case-insensitive check for .yaml
      if (!fileName.toLowerCase().endsWith(".yaml")) {
        console.log("Skipping non-yaml file:", fileName);
        continue;
      }

      console.log("Processing file:", fileName, "| MIME:", file.getMimeType());

      const content = file.getBlob().getDataAsString();
      const derived = deriveStatusAndSignal({ domain, content });

      allRecords.push({
        id: domain + "/" + fileName,
        filename: fileName,
        domain: domain,
        source: "drive",
        scanned_at: new Date().toISOString(),
        status: derived.status,
        signal: derived.signal,
        content: content
      });
    }
  });

  const payload = {
    status: "success",
    generated_at: new Date().toISOString(),
    total_records: allRecords.length,
    records: allRecords
  };

  PropertiesService.getScriptProperties().setProperty(CACHE_KEY, JSON.stringify(payload));
  console.log("[OpenIndex] Scan complete. Total items indexed:", allRecords.length);
}

/**
 * AUTOMATION SETUP
 */
function setupDailyTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "scanOpenIndex") ScriptApp.deleteTrigger(t);
  });

  // Morning & Evening scans
  ScriptApp.newTrigger("scanOpenIndex").timeBased().atHour(7).everyDays(1).create();
  ScriptApp.newTrigger("scanOpenIndex").timeBased().atHour(19).everyDays(1).create();
}

/**
 * STATUS & SIGNAL DERIVATION (Locked Logic v1)
 */
function deriveStatusAndSignal(record) {
  let status = "healthy";
  let signal = "unknown";

  if (!record.content || record.content.trim().length === 0) {
    return { status: "invalid", signal };
  }

  // Schema v1 uses 'last_verified' or 'updated_at'
  let updatedAt = null;
  const match = record.content.match(/(last_verified|updated_at):\s*(.+)/);
  if (match) {
    updatedAt = new Date(match[2].trim());
  }

  if (updatedAt && !isNaN(updatedAt.getTime())) {
    const days = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 180) status = "inactive";
    else if (days > 90) status = "stale";
  } else {
    status = "healthy"; // Default if date is missing but content exists
  }

  return { status, signal };
}
