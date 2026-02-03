/* 
  OpenIndex Registry Pipeline v4.4 (Cognitive Architecture)
  - Workflow: Discovery -> Gatekeeper -> Registry -> Cognitive Cache
  - Standards: Schema v1.2 (Target Audience), Idempotency, Score
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
  console.log("[Master v4.4] Cognitive Pipeline Start...");
  discoveryAgent();
  promotionAgent();
}

function discoveryAgent() {
  const sheet = getStagingSheet();
  const lastRow = sheet.getLastRow();
  const existingUrls = new Set(lastRow > 1 ? sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat().filter(Boolean) : []);

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
          const isHigh = repo.stargazers_count >= CONFIG.AUTO_APPROVE_STARS;
          sheet.appendRow([
            repo.name, repo.html_url, repo.description || "", 
            repo.stargazers_count, (repo.topics || []).join(", "),
            query.domain, query.q, isHigh, false, 
            isHigh ? `Auto: >${CONFIG.AUTO_APPROVE_STARS} stars` : "Pending", new Date(), ""
          ]);
        }
      });
    } catch (e) { console.error(`[Discovery Error] ${e.message}`); }
  });
}

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
      const p = robustYamlParser(file.getBlob().getDataAsString());
      if (p.name) {
        summary.push({
          id: file.getName(),
          name: p.name,
          repo_url: p.repo_url,
          domain: domain,
          category: p.category,
          summary: p.description,
          audience: p.audience || "Infrastructure Teams / Researchers",
          score: p.score || 0,
          stars: p.stars || 0,
          status: p.status || "active",
          last_updated: p.last_verified || new Date().toISOString()
        });
      }
    }
  });

  PropertiesService.getScriptProperties().setProperty(CONFIG.CACHE_KEY, JSON.stringify({
    status: "success", generated_at: new Date().toISOString(), records: summary
  }));
  console.log(`[Indexer] UI Cache Ready: ${summary.length} records.`);
}

function robustYamlParser(content) {
  const result = {};
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
      if (key === 'name') result.name = value;
      else if (key === 'repo_url') result.repo_url = value;
      else if (key === 'category') result.category = value;
      else if (key === 'score') result.score = parseFloat(value);
      else if (key === 'stars') result.stars = parseInt(value);
      else if (key === 'target_audience') result.audience = value;
      else if (key === 'last_verified') result.last_verified = value;
      else if (key === 'status') result.status = value;
      else if (key === 'description' && value === '>' && i + 1 < lines.length) {
        result.description = lines[i + 1].trim();
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

  let audience = "Technical Teams / Infrastructure Engineers";
  if (topics.some(t => /analytics|research|data/.test(t))) audience = "Quant Researchers / Data Scientists";
  if (domain === "health") audience = "Biomedical Engineers / Health Informatics";

  let cat = topics.some(t => /engine|protocol|infra/.test(t)) ? "infrastructure" : "analytics";
  
  return [
    'schema_version: "1.2"',
    'record:',
    `  name: "${repo.name}"`,
    `  repo_url: "${repo.html_url}"`,
    `domain: "${domain}"`,
    `category: "${cat}"`,
    `target_audience: "${audience}"`,
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

function systemReset() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
  const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  CONFIG.DOMAINS.forEach(d => {
    const f = root.getFoldersByName(d);
    if (f.hasNext()) {
      const fs = f.next().getFiles();
      while (fs.hasNext()) fs.next().setTrashed(true);
    }
  });
  PropertiesService.getScriptProperties().deleteProperty(CONFIG.CACHE_KEY);
  masterAutomationPipeline();
}
