
/***********************************************************
 * OPENINDEX MASTER SCRIPT (v4 - Robust & Recursive)
 ***********************************************************/

/**
 * CONFIG: Centralized settings
 */
function CFG() {
  const p = PropertiesService.getScriptProperties();
  let rootId = p.getProperty("DRIVE_ROOT_ID");
  
  // Auto-detect if not set
  if (!rootId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        const file = DriveApp.getFileById(ss.getId());
        rootId = file.getParents().next().getId();
        p.setProperty("DRIVE_ROOT_ID", rootId);
        Logger.log("Auto-detected Root ID: " + rootId);
      }
    } catch (e) {
      Logger.log("Auto-detect failed. Please set DRIVE_ROOT_ID in Script Properties.");
    }
  }

  return {
    DRIVE_ROOT_ID: rootId,
    API_CACHE_KEY: "openindex_api_cache_v4",
    CACHE_FILENAME: "openindex_registry_cache.json"
  };
}

/**
 * WEB APP ENDPOINT: Main entry for index.html
 */
function doGet(e) {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CFG().API_CACHE_KEY);
    
    if (cached) {
      return ContentService.createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }

    const response = refreshRegistry();
    const jsonOutput = JSON.stringify(response);
    cache.put(CFG().API_CACHE_KEY, jsonOutput, 3600);

    return ContentService.createTextOutput(jsonOutput)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * TRIGGER ENTRY: Function called by the daily timer
 */
function scheduledRefresh() {
  Logger.log("Starting scheduled daily refresh...");
  refreshRegistry();
}

/**
 * REFRESH LOGIC: Scans Drive and updates all caches
 */
function refreshRegistry() {
  const cfg = CFG();
  if (!cfg.DRIVE_ROOT_ID) {
    throw new Error("DRIVE_ROOT_ID is empty. Set it in Script Properties.");
  }

  const records = [];
  const seenRepos = new Set();
  
  Logger.log("Initiating recursive scan starting from: " + cfg.DRIVE_ROOT_ID);
  
  // Recursively build the records array
  generateAllRecordsRecursive(cfg.DRIVE_ROOT_ID, records, seenRepos);
  
  const response = {
    status: "success",
    timestamp: new Date().toISOString(),
    total_records: records.length,
    processed_files: records.length,
    records: records
  };

  const jsonOutput = JSON.stringify(response);

  // 1. Update Script Cache (for speed)
  const cache = CacheService.getScriptCache();
  cache.put(cfg.API_CACHE_KEY, jsonOutput, 3600);

  // 2. Update Drive File (for persistence and history)
  try {
    const folder = DriveApp.getFolderById(cfg.DRIVE_ROOT_ID);
    const files = folder.getFilesByName(cfg.CACHE_FILENAME);
    if (files.hasNext()) {
      files.next().setContent(JSON.stringify(response, null, 2));
    } else {
      folder.createFile(cfg.CACHE_FILENAME, JSON.stringify(response, null, 2), MimeType.PLAIN_TEXT);
    }
    Logger.log(`COMPLETED: Found ${records.length} records.`);
  } catch (e) {
    Logger.log("Drive Update Warning: " + e.toString());
  }

  return response;
}

/**
 * RECURSIVE SCANNER: Safely navigates folder structures
 */
function generateAllRecordsRecursive(folderId, records, seenRepos) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const folderName = folder.getName();
    
    // Skip system/temp folders
    if (folderName.startsWith('.') || folderName === 'scripts' || folderName === 'snapshots') {
      return;
    }
    
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const name = file.getName();
      
      if (!name.endsWith('.yaml') && !name.endsWith('.yml')) continue;
      
      try {
        const content = file.getBlob().getDataAsString();
        const record = parseYAML_v2(content, name, folderName);
        
        if (record && record.u && !seenRepos.has(record.u.toLowerCase())) {
          records.push(record);
          seenRepos.add(record.u.toLowerCase());
        }
      } catch (fileErr) {
        Logger.log(`Skipping file [${name}] due to error: ${fileErr.toString()}`);
      }
    }
    
    // Recurse into subfolders
    const subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      const sub = subfolders.next();
      generateAllRecordsRecursive(sub.getId(), records, seenRepos);
    }
    
  } catch (driveErr) {
    Logger.log(`Skipping folder ID [${folderId}] due to error: ${driveErr.toString()}`);
  }
}

/**
 * YAML PARSER: Converts file content to Registry record
 */
function parseYAML_v2(content, filename, domain) {
  const lines = content.split('\n');
  const kv = {};
  
  lines.forEach(line => {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const k = line.substring(0, idx).trim().toLowerCase();
      let v = line.substring(idx + 1).trim()
                 .replace(/^['"]|['"]$/g, '') 
                 .replace(/ #.*$/, ''); // Remove trailing comments
      kv[k] = v;
    }
  });

  // Check mandatory fields
  const title = kv.title || kv.project_name || filename.replace(/\.ya?ml$/, '');
  if (!title || title.toUpperCase() === 'README') return null;

  return {
    n: title,
    s: kv.short_desc || kv.summary || "No description provided.",
    u: kv.repo_url || "",
    o: kv.who || kv.author || extractOwner(kv.repo_url) || "system",
    up: kv.last_verified || kv.updated_at || new Date().toISOString(),
    d: kv.domain || domain || "misc",
    cat: kv.category || "infrastructure",
    stars: parseInt(kv.stars) || 0,
    sc: (parseInt(kv.stars) || 0) / 200000, // Normalized score
    w: kv.what || "",
    y: kv.why || ""
  };
}

/**
 * UTILS: Helper to get GitHub owner from URL
 */
function extractOwner(url) {
  if (!url || !url.includes('github.com/')) return null;
  const parts = url.split('github.com/')[1].split('/');
  return parts[0];
}

/**
 * SETUP: Run this once to fix permissions and set trigger
 */
function setupAutomation() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  ScriptApp.newTrigger('scheduledRefresh')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();
    
  // Force a first run to set DRIVE_ROOT_ID and Cache
  refreshRegistry();
  
  return "SUCCESS: Automation active. Daily scan at 2 AM. Initial refresh complete.";
}
