/**
 * OpenIndex V2 - Main Application
 * API URL: https://script.google.com/macros/s/AKfycbw92AD5kJmwsWc89P5_BkDax-r3AmWIm2W0_RhQRnqyilw_vWA7aPYMHvykUusxUFM7/exec
 */

// Configuration
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbw92AD5kJmwsWc89P5_BkDax-r3AmWIm2W0_RhQRnqyilw_vWA7aPYMHvykUusxUFM7/exec',
    CACHE_KEY: 'openindex_cache',
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    DEBOUNCE_DELAY: 300 // ms
};

// Application State
const APP_STATE = {
    currentMine: 'github',
    allData: {
        github: [],
        n8n: []
    },
    filteredData: [],
    searchTerm: '',
    selectedDomain: '',
    isLoading: false,
    lastUpdate: null
};

// DOM Elements
const DOM = {
    heroTitle: document.getElementById('hero-title'),
    heroDesc: document.getElementById('hero-desc'),
    statOpps: document.getElementById('stat-opps'),
    statUpdated: document.getElementById('stat-updated'),
    lastUpdateTime: document.getElementById('last-update-time'),
    tabGitHub: document.getElementById('tab-github'),
    tabN8n: document.getElementById('tab-n8n'),
    searchInput: document.getElementById('search-input'),
    domainFilter: document.getElementById('domain-filter'),
    mpvContainer: document.getElementById('mpv-container'),
    skeletonContainer: document.getElementById('skeleton-container'),
    emptyState: document.getElementById('empty-state')
};

/**
 * Initialize application
 */
async function init() {
    try {
        // Initialize icons
        lucide.createIcons();
        
        // Set initial UI state
        updateUIForMine(APP_STATE.currentMine);
        
        // Setup event listeners
        setupEventListeners();
        
        // Load data
        await loadData();
        
        // Render initial view
        renderCards();
        
        // Update last update time
        updateLastUpdateTime();
        
        // Set up periodic refresh (every 5 minutes)
        setInterval(updateLastUpdateTime, 60000);
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to load data. Please refresh the page.');
    }
}

/**
 * Load data from API with caching
 */
async function loadData() {
    try {
        showLoading(true);
        
        // Try to get from cache first
        const cachedData = getCachedData();
        if (cachedData) {
            console.log('Using cached data');
            processApiData(cachedData);
            return;
        }
        
        // Fetch from API
        console.log('Fetching fresh data from API');
        const response = await fetch(CONFIG.API_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status !== 'success') {
            throw new Error('API returned unsuccessful status');
        }
        
        // Cache the data
        cacheData(data);
        
        // Process the data
        processApiData(data);
        
    } catch (error) {
        console.error('Error loading data:', error);
        
        // Try to use stale cache if available
        const staleCache = getCachedData(true); // Allow stale cache
        if (staleCache) {
            console.log('Using stale cached data as fallback');
            processApiData(staleCache);
            showWarning('Showing cached data. Some information may be outdated.');
        } else {
            throw error;
        }
    } finally {
        showLoading(false);
    }
}

/**
 * Process API data and transform it for the UI
 */
function processApiData(apiData) {
    try {
        // Update last update time
        APP_STATE.lastUpdate = new Date(apiData.timestamp || new Date());
        
        // Process GitHub data from API
        APP_STATE.allData.github = (apiData.records || []).map((record, index) => ({
            id: `gh-${index}`,
            title: record.n || 'Untitled Repository',
            sub: extractRepoPath(record.u) || 'GitHub Repository',
            what: record.s || 'Critical infrastructure component.',
            who: record.o || 'Enterprise builders & infrastructure architects.',
            why: record.y || 'System reliability and scalable foundations.',
            domain: record.d || 'ai_infra',
            stars: record.stars || 0,
            starsCount: record.sc ? Math.round(record.sc * 10000) : 0,
            url: record.u || '#',
            system_role: record.system_role || 'Core Infrastructure',
            dependency_level: record.dependency_level || 'important',
            evidence: {
                stars: formatNumber(record.stars || 0),
                forks: formatNumber(Math.round((record.stars || 0) * 0.1)), // Estimate forks
                status: 'Verified'
            },
            sandbox: {
                input_label: "Test Repository Name",
                placeholder: "e.g., vllm, kubeflow, mlflow",
                mock_outcome: `Analysis: Repository "${record.n}" is a ${record.system_role} with ${formatNumber(record.stars || 0)} stars.\nImpact: Critical for ${record.d} infrastructure.\nRecommendation: Can be integrated into existing systems.`
            }
        }));
        
        // Mock n8n data (will be replaced with real data when available)
        APP_STATE.allData.n8n = generateMockN8nData();
        
        // Update stats
        updateStats();
        
    } catch (error) {
        console.error('Error processing API data:', error);
        throw new Error('Failed to process data from server');
    }
}

/**
 * Generate mock n8n data for demonstration
 */
function generateMockN8nData() {
    const workflows = [
        {
            id: 'wf-001',
            title: 'Automated Lead Enrichment',
            sub: 'Clearbit + Salesforce + n8n',
            what: 'Automatically fetch social data for new CRM leads.',
            who: 'Sales Operations & Growth Teams.',
            why: 'Saves 4 hours/week of manual research per rep.',
            domain: 'sales',
            evidence: {
                nodes: 12,
                sources: "CRM, API",
                status: "Executable"
            },
            sandbox: {
                input_label: "Test Email",
                placeholder: "jordan@example.com",
                mock_outcome: "Logic Result: Found LinkedIn profile & Company HQ (SF). Salesforce contact updated successfully."
            }
        },
        {
            id: 'wf-002',
            title: 'Crypto Arbitrage Signal',
            sub: 'Binance + Twilio + n8n',
            what: 'Real-time delta monitoring between CEX and DEX.',
            who: 'Traders & Automated Arbitrageurs.',
            why: 'Immediate execution window discovery without manual monitoring.',
            domain: 'trading',
            evidence: {
                nodes: 8,
                sources: "Websockets, REST",
                status: "Live"
            },
            sandbox: {
                input_label: "Asset Token",
                placeholder: "SOL, ETH, BTC",
                mock_outcome: "Logic Result: Delta 0.42% detected. SMS notification sent to trading desk."
            }
        },
        {
            id: 'wf-003',
            title: 'GitHub → Slack Digest',
            sub: 'GitHub API + Slack + n8n',
            what: 'Daily digest of repository activity to team channels.',
            who: 'Engineering Managers & Team Leads.',
            why: 'Stay informed without constant GitHub notifications.',
            domain: 'devops',
            evidence: {
                nodes: 6,
                sources: "GitHub, Slack",
                status: "Production"
            },
            sandbox: {
                input_label: "Repository Name",
                placeholder: "openindex, vllm, triton",
                mock_outcome: "Logic Result: Generated digest with 12 commits, 3 PRs, 8 issues. Scheduled for 9 AM daily."
            }
        }
    ];
    
    return workflows;
}

/**
 * Update UI based on current mine selection
 */
function updateUIForMine(mine) {
    APP_STATE.currentMine = mine;
    
    // Update body class
    document.body.className = `mine-${mine}`;
    
    // Update tab states
    DOM.tabGitHub.classList.toggle('active', mine === 'github');
    DOM.tabGitHub.setAttribute('aria-selected', mine === 'github');
    DOM.tabN8n.classList.toggle('active', mine === 'n8n');
    DOM.tabN8n.setAttribute('aria-selected', mine === 'n8n');
    
    // Update hero section
    if (mine === 'github') {
        DOM.heroTitle.textContent = "GitHub Goldmine";
        DOM.heroDesc.textContent = "Transforming complex source code into clear business outcomes.";
    } else {
        DOM.heroTitle.textContent = "n8n Goldmine";
        DOM.heroDesc.textContent = "Actionable automation logic that generates value immediately.";
    }
    
    // Update domain filter visibility
    DOM.domainFilter.style.display = mine === 'github' ? 'block' : 'none';
    
    // Reset filters
    APP_STATE.searchTerm = '';
    APP_STATE.selectedDomain = '';
    DOM.searchInput.value = '';
    DOM.domainFilter.value = '';
    
    // Update filtered data
    filterData();
}

/**
 * Render cards based on filtered data
 */
function renderCards() {
    const container = DOM.mpvContainer;
    
    if (APP_STATE.filteredData.length === 0) {
        container.style.display = 'none';
        DOM.emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    DOM.emptyState.style.display = 'none';
    
    // Clear container
    container.innerHTML = '';
    
    // Create cards
    APP_STATE.filteredData.forEach(item => {
        const card = createCardElement(item);
        container.appendChild(card);
    });
    
    // Refresh icons
    lucide.createIcons();
}

/**
 * Create a single card element
 */
function createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'mpv-card';
    card.setAttribute('data-id', item.id);
    card.setAttribute('data-domain', item.domain || '');
    
    const isGitHub = APP_STATE.currentMine === 'github';
    const mineColor = isGitHub ? 'var(--accent-color)' : 'var(--logic-color)';
    const mineIcon = isGitHub ? 'code' : 'zap';
    
    const evidenceHtml = isGitHub ? `
        <div class="evidence-chip" title="Stars">
            <i data-lucide="star" size="12"></i> ${item.evidence.stars}
        </div>
        <div class="evidence-chip" title="Forks">
            <i data-lucide="git-fork" size="12"></i> ${item.evidence.forks}
        </div>
        <div class="evidence-chip" style="color:#10b981" title="Status">
            <i data-lucide="check-circle" size="12"></i> ${item.evidence.status}
        </div>
    ` : `
        <div class="evidence-chip" title="Nodes">
            <i data-lucide="box" size="12"></i> ${item.evidence.nodes} Nodes
        </div>
        <div class="evidence-chip" title="Data Sources">
            <i data-lucide="database" size="12"></i> ${item.evidence.sources}
        </div>
        <div class="evidence-chip" style="color:var(--logic-color)" title="Status">
            <i data-lucide="play" size="12"></i> ${item.evidence.status}
        </div>
    `;
    
    const insightBadge = isGitHub ? 
        '<div class="insight-badge builder"><i data-lucide="hammer" size="10"></i> FOR BUILDERS: "CAN BUILD THIS"</div>' :
        '<div class="insight-badge operator"><i data-lucide="zap" size="10"></i> FOR OPERATORS: "USE IMMEDIATELY"</div>';
    
    card.innerHTML = `
        <div class="mpv-card-header">
            <div class="mpv-identity">
                ${insightBadge}
                <h3>${escapeHTML(item.title)}</h3>
                <span>${escapeHTML(item.sub)}</span>
            </div>
            <i data-lucide="${mineIcon}" color="${mineColor}"></i>
        </div>
        <div class="mpv-card-body">
            <div class="mpv-section">
                <label>What it does</label>
                <p>${escapeHTML(item.what)}</p>
            </div>
            <div class="mpv-section">
                <label>Who should care</label>
                <p>${escapeHTML(item.who)}</p>
            </div>
            <div class="mpv-section">
                <label>Why it matters</label>
                <p>${escapeHTML(item.why)}</p>
            </div>
            <div class="mpv-evidence">
                ${evidenceHtml}
            </div>
        </div>
        <div class="mpv-sandbox">
            <label>${escapeHTML(item.sandbox.input_label)}</label>
            <input type="text" 
                   class="sandbox-input" 
                   placeholder="${escapeHTML(item.sandbox.placeholder)}"
                   aria-label="${escapeHTML(item.sandbox.input_label)}">
            <button class="btn-run" onclick="runSandbox(this, '${item.id}')">
                <i data-lucide="play" size="14"></i> RUN TEST
            </button>
            <div class="sandbox-output"></div>
        </div>
    `;
    
    // Add GitHub link if available
    if (isGitHub && item.url && item.url.startsWith('http')) {
        const header = card.querySelector('.mpv-card-header');
        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = 'View on GitHub';
        link.innerHTML = '<i data-lucide="external-link" size="16"></i>';
        link.style.cssText = 'color: var(--text-muted); margin-left: 8px;';
        header.querySelector('.mpv-identity').appendChild(link);
    }
    
    return card;
}

/**
 * Run sandbox simulation
 */
async function runSandbox(btn, itemId) {
    const output = btn.nextElementSibling;
    const input = btn.previousElementSibling;
    
    if (!input.value.trim()) {
        showNotification('Please enter a test value first.', 'warning');
        input.focus();
        return;
    }
    
    const originalBtnContent = btn.innerHTML;
    const originalBtnText = btn.textContent;
    
    // Disable button and show loading
    btn.innerHTML = '<div class="loading-shimmer" style="width:100%; height:20px;"></div>';
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    
    // Find the item data
    const item = APP_STATE.filteredData.find(i => i.id === itemId);
    if (!item) {
        showNotification('Item not found', 'error');
        resetButton(btn, originalBtnContent, originalBtnText);
        return;
    }
    
    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
        
        // Generate mock outcome
        const mockOutcome = item.sandbox.mock_outcome.replace('${input}', input.value);
        
        // Show output
        output.textContent = `> SANDBOX_EXECUTION [${new Date().toLocaleTimeString()}]\n> INPUT: "${input.value}"\n> PROCESSING...\n\n${mockOutcome}\n\n✓ Execution completed successfully`;
        output.style.display = 'block';
        
        // Update button to success state
        btn.innerHTML = '<i data-lucide="check" size="14"></i> TEST COMPLETED';
        btn.style.background = APP_STATE.currentMine === 'github' ? '#10b981' : 'var(--logic-color)';
        btn.style.color = '#fff';
        
        // Log the execution
        console.log(`Sandbox executed: ${item.title} with input: ${input.value}`);
        
        // Re-enable after 3 seconds
        setTimeout(() => {
            resetButton(btn, originalBtnContent, originalBtnText);
            output.style.display = 'none';
            input.value = '';
        }, 3000);
        
    } catch (error) {
        console.error('Sandbox error:', error);
        output.textContent = `> ERROR: Failed to execute sandbox\n> ${error.message}`;
        output.style.display = 'block';
        output.style.color = 'var(--error-color)';
        output.style.borderColor = 'var(--error-color)';
        
        resetButton(btn, originalBtnContent, originalBtnText);
    }
}

/**
 * Reset button to original state
 */
function resetButton(btn, originalContent, originalText) {
    btn.innerHTML = originalContent;
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.style.background = '';
    btn.style.color = '';
    btn.textContent = originalText;
    lucide.createIcons();
}

/**
 * Filter data based on search and domain
 */
function filterData() {
    const data = APP_STATE.allData[APP_STATE.currentMine];
    
    APP_STATE.filteredData = data.filter(item => {
        // Search filter
        const searchLower = APP_STATE.searchTerm.toLowerCase();
        const matchesSearch = !APP_STATE.searchTerm || 
            item.title.toLowerCase().includes(searchLower) ||
            item.sub.toLowerCase().includes(searchLower) ||
            item.what.toLowerCase().includes(searchLower) ||
            item.who.toLowerCase().includes(searchLower) ||
            item.why.toLowerCase().includes(searchLower);
        
        // Domain filter (only for GitHub)
        const matchesDomain = !APP_STATE.selectedDomain || 
            item.domain === APP_STATE.selectedDomain;
        
        return matchesSearch && matchesDomain;
    });
    
    renderCards();
}

/**
 * Update statistics display
 */
function updateStats() {
    const githubCount = APP_STATE.allData.github.length;
    const n8nCount = APP_STATE.allData.n8n.length;
    
    DOM.statOpps.textContent = githubCount + n8nCount;
    
    // Update domain filter options for GitHub
    updateDomainFilterOptions();
}

/**
 * Update domain filter dropdown options
 */
function updateDomainFilterOptions() {
    if (APP_STATE.currentMine !== 'github') return;
    
    const domains = new Set(APP_STATE.allData.github.map(item => item.domain).filter(Boolean));
    const currentValue = DOM.domainFilter.value;
    
    // Clear existing options except first
    while (DOM.domainFilter.options.length > 1) {
        DOM.domainFilter.remove(1);
    }
    
    // Add domain options
    Array.from(domains).sort().forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = formatDomainName(domain);
        DOM.domainFilter.appendChild(option);
    });
    
    // Restore previous selection if still valid
    if (currentValue && domains.has(currentValue)) {
        DOM.domainFilter.value = currentValue;
        APP_STATE.selectedDomain = currentValue;
    }
}

/**
 * Format domain name for display
 */
function formatDomainName(domain) {
    const nameMap = {
        'ai_infra': 'AI Infrastructure',
        'gov': 'Government Tech',
        'climate': 'Climate Tech',
        'health': 'Health Tech',
        'finance': 'Fintech',
        'sales': 'Sales Automation',
        'trading': 'Trading',
        'devops': 'DevOps'
    };
    
    return nameMap[domain] || domain.replace('_', ' ').toUpperCase();
}

/**
 * Update last update time display
 */
function updateLastUpdateTime() {
    if (!APP_STATE.lastUpdate) return;
    
    const now = new Date();
    const diffMs = now - APP_STATE.lastUpdate;
    const diffMins = Math.floor(diffMs / 60000);
    
    let displayText;
    
    if (diffMins < 1) {
        displayText = 'Just now';
    } else if (diffMins < 60) {
        displayText = `${diffMins}m ago`;
    } else if (diffMins < 1440) {
        const hours = Math.floor(diffMins / 60);
        displayText = `${hours}h ago`;
    } else {
        const days = Math.floor(diffMins / 1440);
        displayText = `${days}d ago`;
    }
    
    DOM.statUpdated.textContent = displayText;
    DOM.lastUpdateTime.textContent = APP_STATE.lastUpdate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Mine switching
    DOM.tabGitHub.addEventListener('click', () => {
        updateUIForMine('github');
        filterData();
    });
    
    DOM.tabN8n.addEventListener('click', () => {
        updateUIForMine('n8n');
        filterData();
    });
    
    // Keyboard navigation for tabs
    DOM.tabGitHub.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            updateUIForMine('github');
            filterData();
        }
    });
    
    DOM.tabN8n.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            updateUIForMine('n8n');
            filterData();
        }
    });
    
    // Search with debounce
    let searchTimeout;
    DOM.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            APP_STATE.searchTerm = e.target.value.trim();
            filterData();
        }, CONFIG.DEBOUNCE_DELAY);
    });
    
    // Domain filter
    DOM.domainFilter.addEventListener('change', (e) => {
        APP_STATE.selectedDomain = e.target.value;
        filterData();
    });
    
    // Refresh button (could be added to UI)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            loadData();
        }
    });
}

/**
 * Cache management
 */
function cacheData(data) {
    try {
        const cacheItem = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(cacheItem));
    } catch (error) {
        console.warn('Failed to cache data:', error);
    }
}

function getCachedData(allowStale = false) {
    try {
        const cached = localStorage.getItem(CONFIG.CACHE_KEY);
        if (!cached) return null;
        
        const cacheItem = JSON.parse(cached);
        const age = Date.now() - cacheItem.timestamp;
        
        if (!allowStale && age > CONFIG.CACHE_TTL) {
            localStorage.removeItem(CONFIG.CACHE_KEY);
            return null;
        }
        
        return cacheItem.data;
    } catch (error) {
        console.warn('Failed to read cache:', error);
        return null;
    }
}

/**
 * UI Helper Functions
 */
function showLoading(show) {
    APP_STATE.isLoading = show;
    DOM.skeletonContainer.style.display = show ? 'grid' : 'none';
    DOM.mpvContainer.style.display = show ? 'none' : 'grid';
    
    if (show) {
        DOM.emptyState.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    errorDiv.innerHTML = `
        <i data-lucide="alert-circle"></i>
        <h3>Error Loading Data</h3>
        <p>${escapeHTML(message)}</p>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent-color); border: none; border-radius: 4px; cursor: pointer;">
            Retry
        </button>
    `;
    
    DOM.mpvContainer.innerHTML = '';
    DOM.mpvContainer.appendChild(errorDiv);
    DOM.mpvContainer.style.display = 'block';
    DOM.skeletonContainer.style.display = 'none';
    
    lucide.createIcons();
}

function showWarning(message) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 157, 0, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        font-size: 0.9rem;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function showNotification(message, type = 'info') {
    const colors = {
        info: 'var(--accent-color)',
        success: '#10b981',
        warning: '#f59e0b',
        error: 'var(--error-color)'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        font-size: 0.9rem;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Utility Functions
 */
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function extractRepoPath(url) {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.substring(1); // Remove leading slash
    } catch {
        return url;
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

/**
 * Add CSS animations for notifications
 */
function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Service Worker Registration
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    }
}

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Add notification styles
    addNotificationStyles();
    
    // Register service worker
    registerServiceWorker();
    
    // Initialize app
    init();
});

// Export for manual testing in console
window.OpenIndexApp = {
    init,
    loadData,
    switchMine: updateUIForMine,
    refresh: () => {
        localStorage.removeItem(CONFIG.CACHE_KEY);
        loadData();
    },
    getState: () => ({ ...APP_STATE }),
    getConfig: () => ({ ...CONFIG })
};

console.log('OpenIndex V2 loaded. Type OpenIndexApp for debugging.');
