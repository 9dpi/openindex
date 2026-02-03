/* 
  OpenIndex Registry Pipeline v4.5 (Cognitive Flow Edition)
  - UX: Inline Expand-row Index Card
  - Schema: What, Who, Why (Non-tech Friendly)
  - Reliability: Deduplication & Stability Patch
*/

const CONFIG = {
  DRIVE_FOLDER_ID: "1UwSmQ71MR3Lk13-RnlP2pG572AP8vLz1",
  SPREADSHEET_ID: "1fcY78iMgmF6opG9wGBwUP_euTVDFb1HUB9LKEWxnfHM",
  DOMAINS: ["health", "finance"],
  CACHE_KEY: "OPENINDEX_PRO_CACHE_V3",
  AUTO_APPROVE_STARS: 2000
};

function masterAutomationPipeline() {
  discoveryAgent();
  promotionAgent();
}

function discoveryAgent() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheets()[0];
  const lastRow = sheet.getLastRow();
  const existingUrls = new Set(lastRow > 1 ? sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat() : []);

  const queries = [
    { domain: "finance", q: "topic:finance stars:>1500" },
    { domain: "health", q: "topic:medical stars:>1000" }
  ];

  queries.forEach(query => {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query.q)}&sort=stars&order=desc`;
      const response = UrlFetchApp.fetch(url, { headers: { "User-Agent": "OpenIndex" } });
      const repos = JSON.parse(response.getContentText()).items || [];
      repos.slice(0, 5).forEach(repo => {
        if (!existingUrls.has(repo.html_url)) {
          const isHigh = repo.stargazers_count >= CONFIG.AUTO_APPROVE_STARS;
          sheet.appendRow([
            repo.name, repo.html_url, repo.description || "", 
            repo.stargazers_count, (repo.topics || []).join(", "),
            query.domain, query.q, isHigh, false, "Pending", new Date()
          ]);
        }
      });
    } catch (e) { console.error(e.message); }
  });
}

function promotionAgent() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const rootFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);

  for (let i = 1; i < data.length; i++) {
    const [name, url, desc, stars, topics, domain, q, approved, indexed] = data[i];
    if (approved === true && indexed === false) {
      const folders = rootFolder.getFoldersByName(domain);
      if (!folders.hasNext()) continue;
      const yamlBody = generateCognitiveYaml({ name, url, desc, stars, topics: String(topics).split(",") }, domain);
      folders.next().createFile(name.toLowerCase() + ".yaml", yamlBody, "text/yaml");
      sheet.getRange(i + 1, 9).setValue(true);
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
      const p = parseCognitiveYaml(file.getBlob().getDataAsString());
      if (p.n) summary.push(p);
    }
  });
  PropertiesService.getScriptProperties().setProperty(CONFIG.CACHE_KEY, JSON.stringify({ status: "success", records: summary }));
}

function parseCognitiveYaml(content) {
  const res = { n: "", s: "", w: "", o: "", y: "", u: "", up: "" };
  content.split('\n').forEach(line => {
    if (!line.includes(':')) return;
    const k = line.split(':')[0].trim();
    const v = line.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
    if (k === 'title') res.n = v;
    else if (k === 'short_desc') res.s = v;
    else if (k === 'what') res.w = v;
    else if (k === 'who') res.o = v;
    else if (k === 'why') res.y = v;
    else if (k === 'repo_url') res.u = v;
    else if (k === 'last_verified') res.up = v;
  });
  return res;
}

function generateCognitiveYaml(repo, domain) {
  let audience = "Developers & Technical Teams";
  if (domain === "finance") audience = "Financial Researchers / System Builders";
  if (domain === "health") audience = "Medical Data Teams / Researchers";

  return [
    `title: "${repo.name}"`,
    `short_desc: "${(repo.desc || "").substring(0, 100).replace(/"/g, "'")}"`,
    `what: "A system used to manage ${domain} data and infrastructure."`,
    `who: "${audience}"`,
    `why: "Active project with significant GitHub presence."`,
    `repo_url: "${repo.url}"`,
    `last_verified: "${new Date().toISOString()}"`
  ].join('\n');
}

function doGet() {
  const cached = PropertiesService.getScriptProperties().getProperty(CONFIG.CACHE_KEY);
  return ContentService.createTextOutput(cached || '{"status":"empty","records":[]}').setMimeType(ContentService.MimeType.JSON);
}

function systemReset() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheets()[0];
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
  PropertiesService.getScriptProperties().deleteProperty(CONFIG.CACHE_KEY);
  masterAutomationPipeline();
}
