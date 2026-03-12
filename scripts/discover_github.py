import requests
import yaml
import os
import time
from datetime import datetime

# CONFIGURATION
# Set GITHUB_TOKEN environment variable or put it here for authenticated requests (higher rate limits)
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
BASE_DIR = r"g:\My Drive\OpenIndex"

SEARCH_QUERY_MAP = {
    "ai_infra": "topic:ai-infrastructure topic:machine-learning-infrastructure stars:>1000",
    "finance": "topic:quantitative-trading topic:fintech topic:finance stars:>500",
    "climate": "topic:climate-change topic:earth-science stars:>100",
    "health": "topic:medical-imaging topic:healthcare-ai stars:>500",
    "gov": "topic:open-government topic:civic-tech stars:>100",
}

MAX_RESULTS_PER_QUERY = 10

def fetch_github_repos(query):
    url = f"https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page={MAX_RESULTS_PER_QUERY}"
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    
    response = requests.get(url, headers=headers)
    if response.status_status_code == 200:
        return response.json().get('items', [])
    else:
        print(f"Error fetching {query}: {response.status_code} - {response.text}")
        return []

def save_as_yaml(repo, domain):
    target_dir = os.path.join(BASE_DIR, domain)
    os.makedirs(target_dir, exist_ok=True)
    
    safe_name = repo['name'].lower().replace('/', '_')
    file_path = os.path.join(target_dir, f"{safe_name}.yaml")
    
    # Preserve existing content if it's a known important repo, or overwrite with fresh data
    data = {
        "title": repo['name'],
        "short_desc": repo['description'] or "No description provided.",
        "system_role": "Infrastructure" if domain == "ai_infra" else "Application",
        "dependency_level": "stable",
        "infra_layer": "Core",
        "what": f"GitHub Repository: {repo['full_name']}",
        "who": repo['owner']['login'],
        "why": "Identified as a top-rated open source project in this domain.",
        "repo_url": repo['html_url'],
        "stars": repo['stargazers_count'],
        "last_verified": datetime.utcnow().isoformat() + "Z"
    }
    
    with open(file_path, 'w', encoding='utf-8') as f:
        yaml.dump(data, f, sort_keys=False, default_flow_style=False, allow_unicode=True)
    print(f"Discovered & Saved: {file_path}")

def run_discovery():
    print(f"Starting GitHub Discovery at {datetime.now()}...")
    total_discovered = 0
    
    for domain, query in SEARCH_QUERY_MAP.items():
        print(f"Searching for {domain}...")
        repos = fetch_github_repos(query)
        for repo in repos:
            save_as_yaml(repo, domain)
            total_discovered += 1
        
        # Sleep to be nice to API
        time.sleep(2)
        
    print(f"Discovery complete. Total items synchronized: {total_discovered}")

if __name__ == "__main__":
    run_discovery()
