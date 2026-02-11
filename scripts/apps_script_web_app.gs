
/***********************
 * CONFIG
 ***********************/
function CFG() {
  const p = PropertiesService.getScriptProperties();
  return {
    GITHUB_TOKEN: p.getProperty("GITHUB_TOKEN"),
    DRIVE_ROOT_ID: p.getProperty("DRIVE_ROOT_ID"),
    API_CACHE_KEY: "openindex_api_cache"
  };
}

/***********************
 * WEB APP ENDPOINT (Main Entry for Frontend)
 ***********************/
function doGet(e) {
  try {
    // Check cache first
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CFG().API_CACHE_KEY);
    
    if (cached) {
      return ContentService.createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Generate fresh data
    const records = generateAllRecords();
    const response = {
      status: "success",
      timestamp: new Date().toISOString(),
      total_records: records.length,
      processed_files: records.length,
      records: records
    };

    const jsonOutput = JSON.stringify(response);
    
    // Cache for 1 hour (3600 seconds)
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
 * SCHEDULED TRIGGER (Auto-refresh daily at 2 AM)
 ***********************/
function scheduledRefresh() {
  try {
    Logger.log("Starting scheduled refresh...");
    
    // Clear cache to force regeneration
    const cache = CacheService.getScriptCache();
    cache.remove(CFG().API_CACHE_KEY);
    
    // Regenerate data
    const records = generateAllRecords();
    
    // Update cache
    const response = {
      status: "success",
      timestamp: new Date().toISOString(),
      total_records: records.length,
      processed_files: records.length,
      records: records
    };
    
    cache.put(CFG().API_CACHE_KEY, JSON.stringify(response), 3600);
    
    Logger.log(`Refresh complete: ${records.length} records updated at ${new Date().toISOString()}`);
    
  } catch (error) {
    Logger.log("Refresh failed: " + error.toString());
  }
}

/***********************
 * TRIGGER SETUP (Run once to create daily trigger)
 ***********************/
function setupDailyTrigger() {
  // Delete existing triggers for scheduledRefresh to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'scheduledRefresh') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new daily trigger at 2 AM
  ScriptApp.newTrigger('scheduledRefresh')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();
  
  Logger.log('Daily trigger created successfully. Will run at 2 AM every day.');
  return 'Daily trigger created successfully. Will run at 2 AM every day.';
}

/***********************
 * DATA GENERATION
 ***********************/
function generateAllRecords() {
  const cfg = CFG();
  const folder = DriveApp.getFolderById(cfg.DRIVE_ROOT_ID);
  const files = folder.getFilesByType(MimeType.PLAIN_TEXT);
  
  const records = [];
  
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    
    // Only process YAML files
    if (!name.endsWith('.yaml') && !name.endsWith('.yml')) continue;
    
    try {
      const content = file.getBlob().getDataAsString();
      const record = parseYAMLRecord(content, name);
      if (record) records.push(record);
    } catch (e) {
      Logger.log(`Error processing ${name}: ${e}`);
    }
  }
  
  return records;
}

function parseYAMLRecord(yamlContent, filename) {
  // Simple YAML parser for our schema
  const lines = yamlContent.split('\n');
  const record = {};
  
  for (const line of lines) {
    if (line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const cleanKey = key.trim();
      const value = valueParts.join(':').trim().replace(/['"]/g, '');
      
      // Map YAML keys to API response format
      if (cleanKey === 'project_name') record.n = value;
      if (cleanKey === 'repo_url') record.u = value;
      if (cleanKey === 'summary') record.s = value;
      if (cleanKey === 'domain') record.d = value;
      if (cleanKey === 'category') record.cat = value;
      if (cleanKey === 'updated_at') record.up = value;
      if (cleanKey === 'stars') record.stars = parseInt(value) || 0;
    }
  }
  
  // Extract owner from repo URL
  if (record.u && record.u.includes('github.com/')) {
    const parts = record.u.split('github.com/')[1].split('/');
    record.o = parts[0];
  }
  
  // Calculate score (normalized stars)
  if (record.stars) {
    record.sc = Math.min(record.stars / 10000, 1);
  }
  
  return record.n ? record : null;
}

/***********************
 * GITHUB API (Optional - for future enhancements)
 ***********************/
function githubGET(url) {
  const token = CFG().GITHUB_TOKEN;
  if (!token || token.trim() === "") {
    Logger.log("No GitHub Token found in Properties.");
    return null;
  }

  const res = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      "User-Agent": "OpenIndex",
    },
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code === 401 || code === 403) {
    Logger.log("GitHub Auth Error (401/403). Token may be expired or invalid.");
    return null;
  }
  
  if (code >= 300) {
    Logger.log("GitHub API Error: " + res.getContentText());
    return null;
  }

  return JSON.parse(res.getContentText());
}
