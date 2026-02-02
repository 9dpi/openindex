/* 
  OpenIndex Registry Engine v3.1
  - Features: Mock Data Purge, GitHub Scraper with Headers, Schema v1.0
*/

const DRIVE_FOLDER_ID = "1UwSmQ71MR3Lk13-RnlP2pG572AP8vLz1";
const DOMAINS = ["health", "finance"];
const CACHE_KEY = "OPENINDEX_CACHE_JSON";

/**
 * [IMPORTANT] WIPE & RESTART
 * Chạy hàm này để xóa sạch dữ liệu cũ và bắt đầu mới hoàn toàn
 */
function wipeAndRestart() {
  console.log("[System] CAUTION: Wiping all registry records...");
  const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  
  DOMAINS.forEach(domainName => {
    const folders = rootFolder.getFoldersByName(domainName);
    while (folders.hasNext()) {
      const folder = folders.next();
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        if (file.getName().endsWith(".yaml")) {
          file.setTrashed(true);
          console.log(`   [Trashed] ${file.getName()}`);
        }
      }
    }
  });
  
  console.log("[System] Wipe complete. Starting fresh autonomous update...");
  runAutonomousUpdate();
}

function doGet() {
  try {
    const cached = PropertiesService.getScriptProperties().getProperty(CACHE_KEY);
    return ContentService.createTextOutput(cached || JSON.stringify({
      status: "empty", message: "Run runAutonomousUpdate() to start."
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function runAutonomousUpdate() {
  console.log("[Registry] Scouting GitHub API...");
  // Clear any existing records from metadata cache first
  
  harvestGithubToDrive("finance", "topic:finance stars:>1000");
  harvestGithubToDrive("finance", "topic:fintech stars:>500");
  harvestGithubToDrive("health", "topic:medical-ai stars:>500");
  
  scanOpenIndex();
}

function harvestGithubToDrive(domainName, query) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc`;
  
  try {
    // GitHub API requires a User-Agent header
    const options = {
      method: "get",
      headers: { "User-Agent": "OpenIndex-Registry-Engine" },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      console.error(`[GitHub Error] ${response.getContentText()}`);
      return;
    }
    
    const repos = JSON.parse(response.getContentText()).items || [];
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const domainFolders = rootFolder.getFoldersByName(domainName);
    if (!domainFolders.hasNext()) return;
    const targetFolder = domainFolders.next();
    
    repos.slice(0, 15).forEach(repo => {
      const fileName = repo.name.toLowerCase() + ".yaml";
      const existing = targetFolder.getFilesByName(fileName);
      
      if (!existing.hasNext()) {
        const yamlBody = generateStandardYaml(repo, domainName);
        targetFolder.createFile(fileName, yamlBody, "text/yaml");
        console.log(`   [Live Index] Added: ${fileName}`);
      }
    });
  } catch (e) {
    console.error(`[Harvest Error] ${e.message}`);
  }
}

/**
 * SCHEMA ENFORCER: v1.0 Standard
 */
function generateStandardYaml(repo, domain) {
  // Simple check for infrastructure vs analytics
  const isInfra = (repo.topics || []).some(t => t.includes('infra') || t.includes('protocol') || t.includes('engine'));
  const category = isInfra ? "infrastructure" : "analytics";
  
  // Clean values for YAML safety
  const cleanName = (repo.name || "Unknown").replace(/"/g, "'");
  const cleanDesc = (repo.description || "Live infrastructure record.").replace(/"/g, "'").replace(/\n/g, " ");

  return [
    'schema_version: "1.0"',
    'record:',
    `  name: "${cleanName}"`,
    `  repo_url: "${repo.html_url}"`,
    `domain: "${domain}"`,
    `category: "${category}"`,
    `description: >\n  ${cleanDesc}`,
    'evidence:',
    '  github:',
    `    stars: ${repo.stargazers_count}`,
    `    forks: ${repo.forks_count}`,
    `    topics: [${(repo.topics || []).map(t => '"' + t + '"').join(', ')}]`,
    'timestamps:',
    `  last_verified: "${new Date().toISOString()}"`,
    'status: "active"'
  ].join('\n');
}

function scanOpenIndex() {
  const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  let records = [];

  DOMAINS.forEach(domainName => {
    const folders = rootFolder.getFoldersByName(domainName);
    while (folders.hasNext()) {
      const folder = folders.next();
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        if (!file.getName().endsWith(".yaml")) continue;
        try {
          const content = file.getBlob().getDataAsString();
          records.push({
            id: `${domainName}/${file.getName()}`,
            domain: domainName,
            status: "active",
            scanned_at: new Date().toISOString(),
            content: content
          });
        } catch (e) {}
      }
    }
  });

  PropertiesService.getScriptProperties().setProperty(CACHE_KEY, JSON.stringify({
    status: "success", generated_at: new Date().toISOString(),
    total_records: records.length, records: records
  }));
  console.log(`[Registry] Complete. Cache refreshed: ${records.length} records.`);
}

function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("runAutonomousUpdate").timeBased().everyHours(12).create();
}
