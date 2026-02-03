/* 
  OpenIndex Registry Pipeline v4.3.1 (Robust Edition)
  - Workflow: Discovery (Fast-Set) -> Gatekeeper -> Registry (v1.1 Schema)
  - Improvements: Line-by-Line Parser, Absolute Idempotency, Detailed Logging
*/

const CONFIG = {
  DRIVE_FOLDER_ID: "1UwSmQ71MR3Lk13-RnlP2pG572AP8vLz1",
  SPREADSHEET_ID: "1fcY78iMgmF6opG9wGBwUP_euTVDFb1HUB9LKEWxnfHM",
  DOMAINS: ["health", "finance"],
  CACHE_KEY: "OPENINDEX_PRO_CACHE",
  AUTO_APPROVE_STARS: 2000
};

function getStagingSheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheets()[0];
}

function masterAutomationPipeline() {
  console.log("[Master v4.3.1] Pipeline Start...");
  discoveryAgent();
  promotionAgent();
  console.log("[Master] Cycle Finished.");
}

/**
 * PHASE 1: DISCOVERY
 */
function discoveryAgent() {
  const sheet = getStagingSheet();
  const lastRow = sheet.getLastRow();
  const existingUrls = new Set(
    lastRow > 1 ? sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat().filter(Boolean) : []
  );

  const queries = [
    { domain: "finance", q: "topic:finance stars:>1000" },
    { domain: "finance", q: "topic:fintech stars:>500" },
    { domain: "health", q: "topic:medical-ai stars:>500" }
  ];

  queries.forEach(query => {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query.q)}&sort=stars&order=desc`;
      const response = UrlFetchApp.fetch(url, { headers: { "User-Agent": "OpenIndex-Agent" }, muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) return;
      
      const repos = JSON.parse(response.getContentText()).items || [];
      repos.slice(0, 10).forEach(repo => {
        if (!existingUrls.has(repo.html_url)) {
          const isHighConfidence = repo.stargazers_count >= CONFIG.AUTO_APPROVE_STARS;
          sheet.appendRow([
            repo.name, repo.html_url, repo.description || "", 
            repo.stargazers_count, (repo.topics || []).join(", "),
            query.domain, query.q, isHighConfidence, false, 
            isHighConfidence ? `Auto: >${CONFIG.AUTO_APPROVE_STARS} stars` : "Pending review",
            new Date(), ""
          ]);
        }
      });
    } catch (e) { console.error(`[Discovery Error] ${e.message}`); }
  });
}

/**
 * PHASE 2: PROMOTION
 */
function promotionAgent() {
  const sheet = getStagingSheet();
  const data = sheet.getDataRange().getValues();
  const rootFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);

  for (let i = 1; i < data.length; i++) {
    const [name, url, desc, stars, topics, domain, q, approved, indexed] = data[i];
    
    if (approved === true && indexed === false) {
      try {
        const folders = rootFolder.getFoldersByName(domain);
        if (!folders.hasNext()) continue;
        const folder = folders.next();
        
        const filename = name.toLowerCase() + ".yaml";
        if (folder.getFilesByName(filename).hasNext()) {
          sheet.getRange(i + 1, 9).setValue(true);
          continue;
        }

        const yamlBody = generateStandardYaml({
          name, html_url: url, description: desc, 
          stargazers_count: stars, topics: String(topics).split(", ")
        }, domain);
        
        folder.createFile(filename, yamlBody, "text/yaml");
        sheet.getRange(i + 1, 9).setValue(true);
        sheet.getRange(i + 1, 12).setValue(new Date());
      } catch(e) { console.error(`[Promotion Error] ${name}: ${e.message}`); }
    }
  }
  indexingAgent();
}

/**
 * PHASE 3: INDEXING (Robust Parser)
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
      
      const content = file.getBlob().getDataAsString();
      const p = robustYamlParser(content);
      
      if (p.name) { // Chỉ đưa vào cache nếu parse thành công ít nhất tên dự án
        summary.push({
          id: file.getName(),
          name: p.name,
          repo_url: p.repo_url,
          domain: domain,
          category: p.category,
          summary: p.description,
          score: p.score || 0,
          stars: p.stars || 0, // Bổ sung số sao
          status: p.status || "active",
          last_updated: p.last_verified || new Date().toISOString()
        });
      }
    }
  });

  PropertiesService.getScriptProperties().setProperty(CONFIG.CACHE_KEY, JSON.stringify({
    status: "success",
    generated_at: new Date().toISOString(),
    records: summary
  }));
  console.log(`[Indexer] Updated Cache: ${summary.length} records.`);
}

/**
 * GIA CỐ PARSER: Line-by-Line để tránh lỗi Regex
 */
function robustYamlParser(content) {
  const result = {};
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(':');
    
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
      
      if (key === 'name') result.name = value;
      else if (key === 'repo_url') result.repo_url = value;
      else if (key === 'category') result.category = value;
      else if (key === 'score') result.score = parseFloat(value);
      else if (key === 'stars') result.stars = parseInt(value); // Parse số sao
      else if (key === 'last_verified') result.last_verified = value;
      else if (key === 'status') result.status = value;
      else if (key === 'description') {
        // Nếu giá trị là ">", lấy dòng tiếp theo làm mô tả
        if (value === '>' && i + 1 < lines.length) {
          result.description = lines[i + 1].trim();
        } else {
          result.description = value;
        }
      }
    }
  }
  return result;
}

function generateStandardYaml(repo, domain) {
  const topics = repo.topics || [];
  let score = 0;
  if (repo.stargazers_count > 5000) score += 0.4;
  else if (repo.stargazers_count > 1000) score += 0.2;
  if (topics.some(t => /engine|protocol|infra/.test(t))) score += 0.3;
  if (repo.description) score += 0.1;

  let cat = topics.some(t => /engine|protocol|infra/.test(t)) ? "infrastructure" : "analytics";
  
  return [
    'schema_version: "1.1"',
    'record:',
    `  name: "${repo.name}"`,
    `  repo_url: "${repo.html_url}"`,
    `domain: "${domain}"`,
    `category: "${cat}"`,
    `description: >\n  ${(repo.description || "").replace(/"/g, "'")}`,
    'confidence:',
    '  source: github',
    `  score: ${score.toFixed(2)}`,
    'timestamps:',
    `  last_verified: "${new Date().toISOString()}"`,
    'status: active'
  ].join('\n');
}

function doGet() {
  const cached = PropertiesService.getScriptProperties().getProperty(CONFIG.CACHE_KEY);
  return ContentService.createTextOutput(cached || '{"status":"empty","records":[]}')
    .setMimeType(ContentService.MimeType.JSON);
}

function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("masterAutomationPipeline").timeBased().everyHours(6).create();
}

function systemReset() {
  console.log("[System] Full Reset...");
  const sheet = getStagingSheet();
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
  
  const rootFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  CONFIG.DOMAINS.forEach(domain => {
    const folders = rootFolder.getFoldersByName(domain);
    if (folders.hasNext()) {
      const files = folders.next().getFiles();
      while (files.hasNext()) files.next().setTrashed(true);
    }
  });
  PropertiesService.getScriptProperties().deleteProperty(CONFIG.CACHE_KEY);
  masterAutomationPipeline();
}
