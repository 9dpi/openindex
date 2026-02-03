/* 
  OpenIndex Registry Pipeline v9.1 (Rescue & Scale Edition)
  - Ultimate Reboot: Wipes old logic and starts fresh
  - Scaled Discovery: 100+ repos across all 5 domains
  - Force Sync: Versioned Cache Key (V91)
*/

const CONFIG = {
  DRIVE_FOLDER_ID: "1UwSmQ71MR3Lk13-RnlP2pG572AP8vLz1",
  SPREADSHEET_ID: "1fcY78iMgmF6opG9wGBwUP_euTVDFb1HUB9LKEWxnfHM",
  DOMAINS: ["ai_infra", "gov", "climate", "health", "finance"],
  CACHE_KEY: "OPENINDEX_PRO_CACHE_V91",
  MIN_STARS: 100 // Lowered to fill the index fast
};

/**
 * THE RESCUE BUTTON: Run this to fix everything
 */
function ULTIMATE_REBOOT() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheets()[0];
  
  // 1. Clear old data to start fresh
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
  PropertiesService.getScriptProperties().deleteProperty(CONFIG.CACHE_KEY);
  
  // 2. Prepare structure
  ensureFoldersExist();
  ensureSchema();
  
  // 3. Run full auto-cycle
  discoveryAgent();
  promotionAgent();
  
  console.log("REBOOT COMPLETE. Your index should now have a significantly higher count.");
}

function ensureSchema() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheets()[0];
  const lastCol = sheet.getLastColumn();
  if (lastCol < 14) {
    sheet.getRange(1, 14).setValue("infra_layer");
  }
}

function ensureFoldersExist() {
  const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  CONFIG.DOMAINS.forEach(domain => {
    const folders = root.getFoldersByName(domain);
    if (!folders.hasNext()) {
      root.createFolder(domain);
      console.log("Folder created: " + domain);
    }
  });
}

function discoveryAgent() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheets()[0];
  const existingUrls = new Set(); // Reset for the reboot cycle

  const searchPlans = [
    { d: "ai_infra", q: "llm-ops OR mlops OR vllm OR langgraph stars:>300" },
    { d: "gov", q: "open-government OR civic-tech OR identity-infrastructure stars:>200" },
    { d: "climate", q: "climate-data OR smart-grid OR energy-optimization stars:>150" },
    { d: "finance", q: "fintech-infrastructure OR payment-gateway OR ledger stars:>500" },
    { d: "health", d: "health-data OR medical-imaging OR bioinformatics stars:>400" }
  ];

  searchPlans.forEach(plan => {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(plan.q)}&sort=stars&order=desc&per_page=20`;
      const response = UrlFetchApp.fetch(url, { headers: { "User-Agent": "OpenIndex-Rescue" }, muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) return;
      
      const repos = JSON.parse(response.getContentText()).items || [];
      repos.forEach(repo => {
        if (!existingUrls.has(repo.html_url)) {
          existingUrls.add(repo.html_url);
          console.log(`Discovered: ${repo.name} for ${plan.d}`);
          sheet.appendRow([
            repo.name, repo.html_url, repo.description || "", 
            repo.stargazers_count, (repo.topics || []).join(", "),
            plan.d, plan.q, true, false, "Auto-Approved", new Date(),
            "Infrastructure", "critical", ""
          ]);
        }
      });
    } catch (e) { console.error("Search error: " + e.message); }
  });
}

function promotionAgent() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const rootFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);

  const folderMap = {};
  CONFIG.DOMAINS.forEach(d => {
    const f = rootFolder.getFoldersByName(d);
    if (f.hasNext()) folderMap[d] = f.next();
  });

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[7] === true && row[8] === false) { // Approved and not indexed
      const domain = row[5];
      const folder = folderMap[domain];
      if (!folder) continue;
      
      const yaml = [
        `title: "${row[0]}"`,
        `short_desc: "${String(row[2]).substring(0, 150).replace(/"/g, "'")}"`,
        `system_role: "${row[11] || "Core Infrastructure"}"`,
        `dependency_level: "${row[12] || "critical"}"`,
        `infra_layer: "${row[13] || ""}"`,
        `repo_url: "${row[1]}"`,
        `stars: ${row[3]}`,
        `last_verified: "${new Date().toISOString()}"`
      ].join('\n');
      
      try {
        folder.createFile(row[0].toLowerCase().replace(/[^a-z0-9]/g, '_') + ".yaml", yaml, "text/yaml");
        sheet.getRange(i + 1, 9).setValue(true);
      } catch (e) { console.error("Promotion failed for " + row[0] + ": " + e.message); }
    }
  }
  forceRefreshIndex();
}

function forceRefreshIndex() {
  const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  let all = [];
  CONFIG.DOMAINS.forEach(domain => {
    const f = root.getFoldersByName(domain);
    if (!f.hasNext()) return;
    const files = f.next().getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (!file.getName().endsWith(".yaml")) continue;
      const content = file.getBlob().getDataAsString();
      let p = { n: "", s: "", u: "", d: domain, system_role: "", dependency_level: "", infra_layer: "", sc: 0.5 };
      
      content.split('\n').forEach(line => {
        const parts = line.split(':');
        if (parts.length < 2) return;
        const k = parts[0].trim();
        const v = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
        if (k === 'title') p.n = v;
        else if (k === 'short_desc') p.s = v;
        else if (k === 'repo_url') p.u = v;
        else if (k === 'system_role') p.system_role = v;
        else if (k === 'dependency_level') p.dependency_level = v;
        else if (k === 'infra_layer') p.infra_layer = v;
        else if (k === 'stars') p.sc = Math.min(1.0, parseInt(v) / 10000);
      });
      if (p.n) all.push(p);
    }
  });
  PropertiesService.getScriptProperties().setProperty(CONFIG.CACHE_KEY, JSON.stringify({ 
    status: "success", 
    timestamp: new Date().toISOString(),
    records: all 
  }));
}

function doGet() {
  const cached = PropertiesService.getScriptProperties().getProperty(CONFIG.CACHE_KEY);
  return ContentService.createTextOutput(cached || '{"status":"empty","records":[]}')
    .setMimeType(ContentService.MimeType.JSON);
}

function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("ULTIMATE_REBOOT").timeBased().everyHours(4).create();
}
