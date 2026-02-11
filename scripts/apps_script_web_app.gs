
/***********************
 * CONFIG
 ***********************/
function CFG() {
  const p = PropertiesService.getScriptProperties();
  return {
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
  
  const records = [];
  const seenRepos = new Set(); // To prevent duplicates

  // 1. Try to load Legacy Bulk Cache first (Quickest way to restore old data)
  try {
    const legacyFiles = folder.getFilesByName("openindex_registry_cache.json");
    if (legacyFiles.hasNext()) {
      const cacheFile = legacyFiles.next();
      const content = cacheFile.getBlob().getDataAsString();
      const json = JSON.parse(content);
      
      if (json.records && Array.isArray(json.records)) {
        json.records.forEach(r => {
          if (r.u) {
            records.push(r);
            seenRepos.add(r.u.toLowerCase());
          }
        });
        Logger.log(`Loaded ${json.records.length} records from legacy cache.`);
      }
    }
  } catch (e) {
    Logger.log("Error loading legacy cache: " + e);
  }

  // 2. Scan for individual files (New YAML or MPV JSON)
  const files = folder.getFiles();
  
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    const mime = file.getMimeType();
    
    // Skip Google Apps files and the legacy cache file itself
    if (mime.includes('google-apps') || name === 'openindex_registry_cache.json') continue;
    
    try {
      const content = file.getBlob().getDataAsString();
      let record = null;

      // Handle individual JSON MPV
      if (name.endsWith('.json') || mime === MimeType.JSON) {
        if (name.includes('api_cache')) continue; // Skip script's own cache

        try {
          const json = JSON.parse(content);
          if (json.repo) {
             const repoUrl = "https://github.com/" + json.repo;
             // Skip if already loaded from legacy cache
             if (seenRepos.has(repoUrl.toLowerCase())) continue;

             const repoParts = json.repo.split('/');
             record = {
               n: repoParts[1] || json.repo,
               u: repoUrl,
               s: json.opportunity || json.role || "No description",
               o: repoParts[0] || "system",
               d: "ai_infra",
               cat: "infrastructure",
               up: json.generated_at || new Date().toISOString(),
               stars: json.evidence?.stars || 0,
               sc: (json.evidence?.stars || 0) / 10000
             };
          }
        } catch (jsonErr) {}
      } 
      // Handle YAML
      else if (name.endsWith('.yaml') || name.endsWith('.yml')) {
        const tempRecord = parseYAMLRecord(content, name);
        if (tempRecord && tempRecord.u && !seenRepos.has(tempRecord.u.toLowerCase())) {
          record = tempRecord;
        }
      }

      if (record) {
        records.push(record);
        if (record.u) seenRepos.add(record.u.toLowerCase());
      }
      
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

// No external API calls needed for current functionality
