
/***********************
 * CONFIG
 ***********************/
function CFG() {
  const p = PropertiesService.getScriptProperties();
  return {
    GITHUB_TOKEN: p.getProperty("GITHUB_TOKEN"),
    DRIVE_ROOT_ID: p.getProperty("DRIVE_ROOT_ID"),
    SHEET_ID: p.getProperty("SHEET_ID"),
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
 * SCHEDULED TRIGGER (Auto-refresh every 6 hours)
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
    
    Logger.log(`Refresh complete: ${records.length} records updated`);
    
  } catch (error) {
    Logger.log("Refresh failed: " + error.toString());
  }
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
 * ENTRY (For manual testing)
 ***********************/
function TEST_RUN() {
  return ULTIMATE_REBOOT("https://github.com/langchain-ai/langchain");
}

function ULTIMATE_REBOOT(repoUrl) {
  // Use fallback for manual testing from editor
  const targetUrl = repoUrl || "https://github.com/langchain-ai/langchain";
  const repo = parseRepo(targetUrl);

  // 1. CHECK DRIVE FIRST (Cache-first approach)
  const existing = checkExistingInDrive(repo.full_name);
  if (existing) {
    return {
      status: "cached",
      repo: repo.full_name,
      fileId: existing.getId(),
      fileUrl: existing.getUrl(),
      data: JSON.parse(existing.getBlob().getDataAsString())
    };
  }

  // 2. FETCH FROM GITHUB (With Mock Fallback)
  let meta = null;
  let readme = "";
  
  try {
    meta = fetchRepoMeta(repo.full_name);
    if (meta) readme = fetchReadme(repo.full_name);
  } catch (e) {
    console.warn("GitHub access failed, using simulated metadata.");
  }

  // If GitHub fails, build using simulated info
  const mpv = buildMPV(repo, meta || { stargazers_count: 0, forks_count: 0, updated_at: new Date().toISOString() }, readme);
  const file = writeMPVToDrive(mpv);

  return {
    status: "new",
    repo: repo.full_name,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
  };
}

/***********************
 * CORE LOGIC
 ***********************/
function parseRepo(url) {
  const clean = url.replace("https://github.com/", "").replace(/\/$/, "");
  const [owner, repo] = clean.split("/");
  return { owner, repo, full_name: `${owner}/${repo}` };
}

function fetchRepoMeta(fullName) {
  return githubGET(`https://api.github.com/repos/${fullName}`);
}

function fetchReadme(fullName) {
  try {
    const r = githubGET(`https://api.github.com/repos/${fullName}/readme`);
    return Utilities.newBlob(
      Utilities.base64Decode(r.content)
    ).getDataAsString();
  } catch (e) {
    return "";
  }
}

function buildMPV(repo, meta, readme) {
  return {
    generated_at: new Date().toISOString(),
    repo: repo.full_name,
    role: inferRole(readme),
    opportunity: "Non-tech users can test real infra logic safely",
    evidence: {
      stars: meta.stargazers_count,
      forks: meta.forks_count,
      updated_at: meta.updated_at,
    },
    sandbox: {
      scenario: "High-volatility macro regime",
      mock_input: "Fed surprise rate cut",
      mock_output: [
        "Risk-on rotation",
        "Volatility compression",
        "Liquidity expansion signals",
      ],
      note: "Mock MPV – safe for self-test",
    },
  };
}

function inferRole(readme) {
  const t = readme.toLowerCase();
  if (t.includes("agent")) return "Autonomous agent system";
  if (t.includes("vector")) return "Retrieval / memory infrastructure";
  return "Core open-source infrastructure";
}

/***********************
 * DRIVE (FIXED)
 ***********************/
function writeMPVToDrive(mpv) {
  const cfg = CFG();
  const folder = DriveApp.getFolderById(cfg.DRIVE_ROOT_ID);
  const fileName = `mpv_${mpv.repo.replace("/", "_")}.json`;

  const json = JSON.stringify(mpv, null, 2);
  const blob = Utilities.newBlob(json, "application/json", fileName);

  return folder.createFile(blob);
}

function checkExistingInDrive(fullName) {
  const cfg = CFG();
  const folder = DriveApp.getFolderById(cfg.DRIVE_ROOT_ID);
  const fileName = `mpv_${fullName.replace("/", "_")}.json`;
  
  const files = folder.getFilesByName(fileName);
  return files.hasNext() ? files.next() : null;
}

/***********************
 * GITHUB
 ***********************/
function githubGET(url) {
  const token = CFG().GITHUB_TOKEN;
  if (!token || token.trim() === "") {
    console.warn("No GitHub Token found in Properties.");
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
    console.warn("GitHub Auth Error (401/403). Ensure token is correct and not leaked.");
    return null;
  }
  
  if (code >= 300) {
    console.warn("GitHub API Error: " + res.getContentText());
    return null;
  }

  return JSON.parse(res.getContentText());
}
