

/***********************
 * CONFIG
 ***********************/
function CFG() {
  const p = PropertiesService.getScriptProperties();
  return {
    GITHUB_TOKEN: p.getProperty("GITHUB_TOKEN"),
    DRIVE_ROOT_ID: p.getProperty("DRIVE_ROOT_ID"),
    SHEET_ID: p.getProperty("SHEET_ID"),
  };
}

/***********************
 * ENTRY
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

  // 2. FETCH FROM GITHUB IF NOT FOUND
  const meta = fetchRepoMeta(repo.full_name);
  const readme = fetchReadme(repo.full_name);

  const mpv = buildMPV(repo, meta, readme);
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
  const res = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      "User-Agent": "OpenIndex",
    },
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() >= 300) {
    throw new Error(res.getContentText());
  }

  return JSON.parse(res.getContentText());
}

