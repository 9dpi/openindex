/* 
  OpenIndex Registry Pipeline v6.0 (Soft Magic & Discovery Arm Edition)
  - UX: Support for 'Soft Magic' Behavior & Tiered Discovery
  - Arms: Institutional, Silent, Academic, Community
  - Schema: Added system_role and dependency_level
  - Domains: Expanded to AI Infra, Gov, and Climate
*/

const CONFIG = {
  DRIVE_FOLDER_ID: "1UwSmQ71MR3Lk13-RnlP2pG572AP8vLz1",
  SPREADSHEET_ID: "1fcY78iMgmF6opG9wGBwUP_euTVDFb1HUB9LKEWxnfHM",
  DOMAINS: ["health", "finance", "ai_infra", "gov", "climate"],
  CACHE_KEY: "OPENINDEX_PRO_CACHE_V6",
  AUTO_APPROVE_STARS: 2500
};

/**
 * Main entry point for scheduled sync
 */
function masterAutomationPipeline() {
  discoveryAgent();
  promotionAgent();
}

/**
 * ARM 1 & 2: Institutional & Silent Infra Discovery
 * Scans GitHub for critical systems based on domains
 */
function discoveryAgent() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  const existingUrls = lastRow > 1 ? new Set(sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat()) : new Set();

  const queries = [
    { domain: "ai_infra", q: "topic:llm-ops OR topic:mlops OR topic:inference stars:>1000" },
    { domain: "gov", q: "topic:government OR topic:public-sector OR topic:open-data stars:>500" },
    { domain: "climate", q: "topic:climate-change OR topic:energy OR topic:sustainability stars:>300" },
    { domain: "finance", q: "topic:finance OR topic:fintech stars:>1500" },
    { domain: "health", q: "topic:medical OR topic:healthcare stars:>1000" }
  ];

  queries.forEach(query => {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query.q)}&sort=stars&order=desc`;
      const response = UrlFetchApp.fetch(url, { headers: { "User-Agent": "OpenIndex-Bot/7.0" }, "muteHttpExceptions": true });
      if (response.getResponseCode() !== 200) return;
      
      const repos = JSON.parse(response.getContentText()).items || [];
      repos.slice(0, 5).forEach(repo => {
        if (!existingUrls.has(repo.html_url)) {
          const isHigh = repo.stargazers_count >= CONFIG.AUTO_APPROVE_STARS;
          // Sheet columns: Name, URL, Desc, Stars, Topics, Domain, Query, Approved, Indexed, LastUpdated, SystemRole, DependencyLevel
          sheet.appendRow([
            repo.name, 
            repo.html_url, 
            repo.description || "", 
            repo.stargazers_count, 
            (repo.topics || []).join(", "),
            query.domain, 
            query.q, 
            isHigh, // Approved automatically if stars are high
            false,  // Indexed
            "Pending Review", // Status note
            new Date(),
            "Infrastructure", // Default System Role
            "important"      // Default Dependency Level
          ]);
        }
      });
    } catch (e) { console.error("Discovery error: " + e.message); }
  });
}

/**
 * PROMOTION: Move approved sheet records to GitHub-ready YAML in Drive
 */
function promotionAgent() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const rootFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);

  for (let i = 1; i < data.length; i++) {
    // Column index mapping
    const [name, url, desc, stars, topics, domain, q, approved, indexed, status, date, sysRole, depLevel] = data[i];
    
    if (approved === true && indexed === false) {
      const folders = rootFolder.getFoldersByName(domain);
      if (!folders.hasNext()) {
         console.warn("Folder not found for domain: " + domain);
         continue;
      }
      
      const repoData = { 
        name, url, desc, stars, 
        topics: String(topics).split(","),
        system_role: sysRole || "Core Infrastructure",
        dependency_level: depLevel || "standard",
        infra_layer: data[i][13] || "" // Assuming column 14 is infra_layer
      };
      
      const yamlBody = generateCognitiveYaml(repoData, domain);
      folders.next().createFile(name.toLowerCase() + ".yaml", yamlBody, "text/yaml");
      sheet.getRange(i + 1, 9).setValue(true); // Mark as indexed
    }
  }
  indexingAgent();
}

/**
 * INDEXING: Compile all YAML files into a single JSON cache for the web app
 */
function indexingAgent() {
  const rootFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  let summary = [];
  
  CONFIG.DOMAINS.forEach(domain => {
    const folders = rootFolder.getFoldersByName(domain);
    if (!folders.hasNext()) return;
    const files = folders.next().getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (!file.getName().endsWith(".yaml")) continue;
      const p = parseCognitiveYaml(file.getBlob().getDataAsString(), domain);
      if (p.n) summary.push(p);
    }
  });
  
  PropertiesService.getScriptProperties().setProperty(CONFIG.CACHE_KEY, JSON.stringify({ 
    status: "success", 
    timestamp: new Date().toISOString(),
    records: summary 
  }));
}

function parseCognitiveYaml(content, domain) {
  const res = { 
    n: "", s: "", w: "", o: "", y: "", u: "", up: "", 
    d: domain, 
    system_role: "", 
    dependency_level: "",
    infra_layer: "",
    sc: 0.5 // Base verification score
  };
  
  content.split('\n').forEach(line => {
    if (!line.includes(':')) return;
    const parts = line.split(':');
    const k = parts[0].trim();
    const v = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
    
    if (k === 'title') res.n = v;
    else if (k === 'short_desc') res.s = v;
    else if (k === 'what') res.w = v;
    else if (k === 'who') res.o = v;
    else if (k === 'why') res.y = v;
    else if (k === 'repo_url') res.u = v;
    else if (k === 'last_verified') res.up = v;
    else if (k === 'system_role') res.system_role = v;
    else if (k === 'dependency_level') res.dependency_level = v;
    else if (k === 'infra_layer') res.infra_layer = v;
    else if (k === 'stars') res.sc = Math.min(1.0, parseInt(v) / 10000); // Scale score by stars
  });
  return res;
}

function generateCognitiveYaml(repo, domain) {
  let audience = "Developers & Technical Teams";
  let whyStatement = "Verified mission-critical infrastructure.";
  
  if (domain === "ai_infra") audience = "AI Researchers / ML Engineers / Model Deployers";
  if (domain === "gov") audience = "Public Sector IT / Civic Technologists";
  if (domain === "climate") audience = "Sustainability Researchers / Smart Grid Engineers";
  if (domain === "finance") audience = "Financial Researchers / Fintech Builders";
  if (domain === "health") audience = "Medical Data Teams / Digital Health Researchers";

  return [
    `title: "${repo.name}"`,
    `short_desc: "${(repo.desc || "").substring(0, 100).replace(/"/g, "'")}"`,
    `system_role: "${repo.system_role || ""}"`,
    `dependency_level: "${repo.dependency_level || ""}"`,
    `infra_layer: "${repo.infra_layer || ""}"`,
    `what: "A mission-critical system designed for ${domain} infrastructure."`,
    `who: "${audience}"`,
    `why: "${whyStatement}"`,
    `stars: ${repo.stars || 0}`,
    `repo_url: "${repo.url}"`,
    `last_verified: "${new Date().toISOString()}"`
  ].join('\n');
}

/**
 * Public endpoint for index.html
 */
function doGet() {
  const cached = PropertiesService.getScriptProperties().getProperty(CONFIG.CACHE_KEY);
  return ContentService.createTextOutput(cached || '{"status":"empty","records":[]}')
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Utility: Reset sheet but keep headers
 */
function systemReset() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheets()[0];
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
  PropertiesService.getScriptProperties().deleteProperty(CONFIG.CACHE_KEY);
  masterAutomationPipeline();
}

/**
 * Utility: Run manual index rebuild
 */
function rebuildIndex() {
  indexingAgent();
  console.log("Index rebuild complete.");
}
