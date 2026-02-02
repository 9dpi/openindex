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
 * TOTAL DEBUG – Run this to see EXACTLY what is in your Drive
 */
function debugEverything() {
  try {
    const root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    console.log("Target folder name: " + root.getName());
    
    console.log("--- SUB-FOLDERS ---");
    const folders = root.getFolders();
    let fCount = 0;
    while (folders.hasNext()) {
      console.log("Found Folder: " + folders.next().getName());
      fCount++;
    }
    if(fCount === 0) console.log("NO SUB-FOLDERS FOUND.");

    console.log("--- FILES ---");
    const files = root.getFiles();
    let fileCount = 0;
    while (files.hasNext()) {
      const f = files.next();
      console.log("Found File: " + f.getName() + " | Type: " + f.getMimeType());
      fileCount++;
    }
    if(fileCount === 0) console.log("NO FILES FOUND IN ROOT.");
  } catch (e) {
    console.error("Critical Error: " + e.toString());
  }
}

/**
 * PIPELINE JOB v1.5 – ROBUST SCAN
 * Recursive search + Root-fallback domain detection
 */
function scanOpenIndex() {
  console.log("[OpenIndex] Starting v1.5 Robust Scan...");
  const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  let allRecords = [];

  const query = 'title contains ".yaml" and trashed = false';
  const fileIterator = rootFolder.searchFiles(query);

  while (fileIterator.hasNext()) {
    const file = fileIterator.next();
    const fileName = file.getName();
    if (!fileName.toLowerCase().endsWith(".yaml")) continue;

    // Get immediate parent name
    const parents = file.getParents();
    let parentFolder = "unknown";
    if (parents.hasNext()) {
      parentFolder = parents.next().getName().toLowerCase();
    }
    
    // Domain Detection Logic
    let domain = "unknown";
    if (DOMAINS.includes(parentFolder)) {
      domain = parentFolder;
    } else if (parentFolder === rootFolder.getName().toLowerCase() || parentFolder === "openindex") {
      // Fallback: If file is in root, assign to first available domain or hybrid
      domain = "hybrid"; 
      console.log(`[Note] File "${fileName}" in root. Defaulting domain to: ${domain}`);
    } else {
      console.log(`[Skip] "${fileName}" is in an unrelated folder: "${parentFolder}"`);
      continue;
    }

    console.log(`[Indexing] Domain: ${domain} | File: ${fileName}`);
    
    try {
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
    } catch (err) {
      console.error("Error reading file:", fileName);
    }
  }

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
