
/***********************
 * CONFIG
 ***********************/
function CFG() {
  const p = PropertiesService.getScriptProperties();
  // Attempt to get root ID from script properties, otherwise use the parent folder of the script's sheet
  let rootId = p.getProperty("DRIVE_ROOT_ID");
  
  if (!rootId) {
    try {
      // Logic: If script is bound to a sheet, get its parent folder
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        const file = DriveApp.getFileById(ss.getId());
        rootId = file.getParents().next().getId();
        p.setProperty("DRIVE_ROOT_ID", rootId);
      }
    } catch (e) {
      Logger.log("Could not auto-detect root ID: " + e);
    }
  }

  return {
    DRIVE_ROOT_ID: rootId,
    API_CACHE_KEY: "openindex_api_cache_v3",
    CACHE_FILENAME: "openindex_registry_cache.json"
  };
}

/***********************
 * WEB APP ENDPOINT
 ***********************/
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

/***********************
 * MASTER REFRESH LOGIC
 ***********************/
function scheduledRefresh() {
  Logger.log("Starting master refresh...");
  refreshRegistry();
}

function refreshRegistry() {
  const cfg = CFG();
  const records = generateAllRecordsRecursive(cfg.DRIVE_ROOT_ID);
  
  const response = {
    status: "success",
    timestamp: new Date().toISOString(),
    total_records: records.length,
    processed_files: records.length,
    records: records
  };

  // 1. Update Script Cache
  const cache = CacheService.getScriptCache();
  cache.put(cfg.API_CACHE_KEY, JSON.stringify(response), 3600);

  // 2. Persist to openindex_registry_cache.json in Drive
  try {
    const folder = DriveApp.getFolderById(cfg.DRIVE_ROOT_ID);
    const files = folder.getFilesByName(cfg.CACHE_FILENAME);
    if (files.hasNext()) {
      files.next().setContent(JSON.stringify(response, null, 2));
    } else {
      folder.createFile(cfg.CACHE_FILENAME, JSON.stringify(response, null, 2), MimeType.PLAIN_TEXT);
    }
    Logger.log(`Successfully saved cache file to Drive. Total records: ${records.length}`);
  } catch (e) {
    Logger.log("Failed to save cache file to Drive: " + e);
  }

  return response;
}

/***********************
 * RECURSIVE DATA GENERATION
 ***********************/
function generateAllRecordsRecursive(folderId, records = [], seenRepos = new Set()) {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const domain = folder.getName(); // folder name as domain hint
  
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    
    if (!name.endsWith('.yaml') && !name.endsWith('.yml')) continue;
    
    try {
      const content = file.getBlob().getDataAsString();
      const record = parseYAML(content, name, domain);
      
      if (record && record.u && !seenRepos.has(record.u.toLowerCase())) {
        records.push(record);
        seenRepos.add(record.u.toLowerCase());
      }
    } catch (e) {
      Logger.log(`Error parsing ${name}: ${e}`);
    }
  }
  
  // Recursion
  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const subfolder = subfolders.next();
    generateAllRecordsRecursive(subfolder.getId(), records, seenRepos);
  }
  
  return records;
}

/***********************
 * YAML PARSER (Schema Correct)
 ***********************/
function parseYAML(yamlContent, filename, folderDomain) {
  const lines = yamlContent.split('\n');
  const kv = {};
  
  lines.forEach(line => {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const k = line.substring(0, idx).trim();
      const v = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      kv[k] = v;
    }
  });

  if (!kv.title && !kv.project_name) return null;

  const now = new Date().toISOString();
  
  return {
    n: kv.title || kv.project_name || filename.replace('.yaml', ''),
    s: kv.short_desc || kv.summary || "",
    u: kv.repo_url || "",
    o: kv.who || kv.author || extractOwner(kv.repo_url) || "system",
    up: kv.last_verified || kv.updated_at || now, // Use refresh time if missing
    d: kv.domain || folderDomain || "misc",
    cat: kv.category || "infrastructure",
    stars: parseInt(kv.stars) || 0,
    sc: (parseInt(kv.stars) || 0) / 200000, // Normalized score
    w: kv.what || "",
    y: kv.why || ""
  };
}

function extractOwner(url) {
  if (!url || !url.includes('github.com/')) return null;
  const parts = url.split('github.com/')[1].split('/');
  return parts[0];
}

/***********************
 * TRIGGER SETUP
 ***********************/
function setupDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  ScriptApp.newTrigger('scheduledRefresh')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();
    
  return "Daily trigger at 2 AM activated. Scan recursive enabled.";
}
