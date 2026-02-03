/* 
  OpenIndex Registry Pipeline v10.0 (Fully Autonomous & High Capacity)
  - Mission: 100% Automated Discovery, Approval, and Indexing
  - Capacity: Drive-based JSON caching (No storage limits)
  - Integrity: Atomic resets and single-pass indexing
*/

const CONFIG = {
  DRIVE_FOLDER_ID: "1UwSmQ71MR3Lk13-RnlP2pG572AP8vLz1",
  SPREADSHEET_ID: "1fcY78iMgmF6opG9wGBwUP_euTVDFb1HUB9LKEWxnfHM",
  DOMAINS: ["ai_infra", "gov", "climate", "health", "finance"],
  CACHE_FILENAME: "openindex_registry_cache.json"
};

/**
 * MASTER PILOT: The primary engine run by triggers
 */
function ULTIMATE_REBOOT() {
  console.log("🚀 Starting Ultimate Reboot...");
  ensureFoldersExist();
  discoveryAgent();
  autoApproveAll();
  promotionAgent();
  refreshIndex(); // Single-pass indexing at the end
  console.log("✅ Reboot complete. System synchronized.");
}

/**
 * AUTO-APPROVE: Marks all discovered repos as approved
 */
function autoApproveAll() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.getRange(2, 8, lastRow - 1, 1).setValue(true); // Column H
}

/**
 * DISCOVERY: Scans GitHub for critical systems
 */
function discoveryAgent() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheets()[0];
  const lastRow = sheet.getLastRow();
  const existingUrls = lastRow > 1 ? new Set(sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat()) : new Set();

  const searchPlans = [
    { domain: "ai_infra", q: "(vllm OR triton-inference OR kubeflow OR mlflow OR feast) stars:>500" },
    { domain: "ai_infra", q: "(topic:mlops OR topic:llm-ops) stars:>300" },
    { domain: "gov", q: "(topic:government OR topic:open-data OR topic:civic-tech) stars:>100" },
    { domain: "climate", q: "(topic:climate OR topic:sustainability OR topic:energy) stars:>50" },
    { domain: "finance", q: "(topic:fintech OR topic:finance) stars:>1000" },
    { domain: "health", q: "(topic:medical OR topic:clinical-data) stars:>500" }
  ];

  searchPlans.forEach(plan => {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(plan.q)}&sort=stars&order=desc&per_page=30`;
      const response = UrlFetchApp.fetch(url, { headers: { "User-Agent": "OpenIndex-Bot/10.1" }, muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) {
        console.error(`GitHub API error (${plan.domain}): ${response.getContentText()}`);
        return;
      }
      
      const repos = JSON.parse(response.getContentText()).items || [];
      repos.forEach(repo => {
        if (!existingUrls.has(repo.html_url)) {
          sheet.appendRow([
            repo.name, repo.html_url, repo.description || "", repo.stargazers_count, 
            (repo.topics || []).join(", "), plan.domain, plan.q, 
            true,  // Approved
            false, // Indexed
            "Auto-Purged", new Date(), "Infrastructure", "important", ""
          ]);
          existingUrls.add(repo.html_url);
        }
      });
    } catch (e) { console.error("Discovery error: " + e.message); }
  });
}

/**
 * PROMOTION: Converts approved rows to YAML files
 */
function promotionAgent() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const folderMap = {};
  
  CONFIG.DOMAINS.forEach(d => {
    const folders = root.getFoldersByName(d);
    if (folders.hasNext()) folderMap[d] = folders.next();
  });

  for (let i = 1; i < data.length; i++) {
    const [name, url, desc, stars, , domain, , approved, indexed, , , sysRole, depLevel, infraLayer] = data[i];
    if (approved === true && indexed === false && folderMap[domain]) {
      const yaml = generateCognitiveYaml({name, url, desc, stars, sysRole, depLevel, infraLayer}, domain);
      const fileName = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + "_" + Math.random().toString(36).substring(7) + ".yaml";
      folderMap[domain].createFile(fileName, yaml, "text/yaml");
      sheet.getRange(i + 1, 9).setValue(true); // Mark as Indexed
    }
  }
}

/**
 * INDEXING: Rebuilds the Drive-based JSON cache
 */
function refreshIndex() {
  const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  let allRecords = [];
  
  CONFIG.DOMAINS.forEach(domain => {
    const folders = root.getFoldersByName(domain);
    if (!folders.hasNext()) return;
    const files = folders.next().getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().endsWith(".yaml")) {
        try {
          const p = parseYaml(file.getBlob().getDataAsString(), domain);
          if (p.n) allRecords.push(p);
        } catch (e) { console.warn(`Skipping invalid YAML: ${file.getName()}`); }
      }
    }
  });

  const payload = JSON.stringify({ status: "success", timestamp: new Date().toISOString(), records: allRecords });
  const existingFiles = root.getFilesByName(CONFIG.CACHE_FILENAME);
  if (existingFiles.hasNext()) {
    existingFiles.next().setContent(payload);
  } else {
    root.createFile(CONFIG.CACHE_FILENAME, payload, "application/json");
  }
}

function parseYaml(content, domain) {
  const res = { n: "", s: "", w: "", o: "", y: "", u: "", up: "", d: domain, system_role: "", dependency_level: "", infra_layer: "", sc: 0.5 };
  content.split('\n').forEach(line => {
    const colonPos = line.indexOf(':');
    if (colonPos === -1) return;
    const k = line.substring(0, colonPos).trim();
    const v = line.substring(colonPos + 1).trim().replace(/^["']|["']$/g, '');
    if (k === 'title') res.n = v;
    else if (k === 'short_desc') res.s = v;
    else if (k === 'repo_url') res.u = v;
    else if (k === 'last_verified') res.up = v;
    else if (k === 'system_role') res.system_role = v;
    else if (k === 'dependency_level') res.dependency_level = v;
    else if (k === 'infra_layer') res.infra_layer = v;
    else if (k === 'stars') res.sc = Math.min(1.0, parseInt(v) / 10000);
  });
  return res;
}

function generateCognitiveYaml(repo, domain) {
  return [
    `title: "${repo.name}"`,
    `short_desc: "${(repo.desc || "").substring(0, 150).replace(/"/g, "'")}"`,
    `system_role: "${repo.sysRole || "Core Infrastructure"}"`,
    `dependency_level: "${repo.depLevel || "important"}"`,
    `infra_layer: "${repo.infraLayer || ""}"`,
    `what: "A mission-critical system for ${domain}."`,
    `who: "Engineers and Decision Makers."`,
    `why: "Foundation of global ${domain} operations."`,
    `stars: ${repo.stars || 0}`,
    `repo_url: "${repo.url}"`,
    `last_verified: "${new Date().toISOString()}"`
  ].join('\n');
}

function doGet() {
  const files = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID).getFilesByName(CONFIG.CACHE_FILENAME);
  return ContentService.createTextOutput(files.hasNext() ? files.next().getBlob().getDataAsString() : '{"status":"empty","records":[]}')
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureFoldersExist() {
  const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  CONFIG.DOMAINS.forEach(d => {
    if (!root.getFoldersByName(d).hasNext()) root.createFolder(d);
  });
}

function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("ULTIMATE_REBOOT").timeBased().everyHours(4).create();
  console.log("✅ Trigger active: ULTIMATE_REBOOT will run every 4 hours.");
}

function resetCache() {
  const files = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID).getFilesByName(CONFIG.CACHE_FILENAME);
  while (files.hasNext()) files.next().setTrashed(true);
  refreshIndex();
}
