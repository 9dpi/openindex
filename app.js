/**
 * OPENINDEX v2.1 - ARKNIGHTS Endfield Style
 * Ultra Fast Intelligence Platform
 */

const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbw92AD5kJmwsWc89P5_BkDax-r3AmWIm2W0_RhQRnqyilw_vWA7aPYMHvykUusxUFM7/exec',
    CACHE_KEY: 'openindex_v2_cache',
    CACHE_TTL: 10 * 60 * 1000, // 10 minutes
    REQUEST_TIMEOUT: 8000, // 8 seconds timeout
    MAX_RETRIES: 2
};

const STATE = {
    currentSource: 'github',
    currentFilter: 'all',
    allData: { github: [], n8n: [] },
    filteredData: [],
    isLoading: false,
    lastUpdate: null,
    nextScan: null,
    refreshInterval: null
};

// DOM Elements
const DOM = {
    // Header
    totalOpps: document.getElementById('total-opportunities'),
    lastScan: document.getElementById('last-scan'),
    
    // Controls
    sourceBtns: document.querySelectorAll('.source-btn'),
    filterChips: document.querySelectorAll('.filter-chip'),
    refreshBtn: document.getElementById('refresh-btn'),
    
    // Grid
    intelGrid: document.getElementById('intel-grid'),
    emptyState: document.getElementById('empty-state'),
    loadingState: document.getElementById('loading-state'),
    
    // Analytics
    discoveryRate: document.getElementById('discovery-rate'),
    criticalSystems: document.getElementById('critical-systems'),
    activityIndex: document.getElementById('activity-index'),
    progressFill: document.querySelector('.progress-fill'),
    
    // Footer
    nextScan: document.getElementById('next-scan'),
    
    // Modal
    intelModal: document.getElementById('intel-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalContent: document.getElementById('modal-content'),
    modalClose: document.getElementById('modal-close')
};

/**
 * Initialize Application
 */
async function init() {
    console.log('🚀 Initializing OPENINDEX v2.1...');
    
    try {
        // Initialize icons
        lucide.createIcons();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load cached data immediately
        loadCachedData();
        
        // Load fresh data in background
        loadFreshData();
        
        // Setup auto-refresh every 30 seconds for loading state
        setupAutoRefresh();
        
        // Initialize analytics
        updateAnalytics();
        
        console.log('✅ Application initialized');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showError('System initialization failed');
    }
}

/**
 * Load cached data immediately (instant display)
 */
function loadCachedData() {
    const cached = getCachedData();
    if (cached) {
        console.log('📦 Loading from cache...');
        processData(cached);
        hideLoading();
        return true;
    }
    return false;
}

/**
 * Load fresh data from API
 */
async function loadFreshData() {
    if (STATE.isLoading) return;
    
    STATE.isLoading = true;
    showLoading();
    
    try {
        console.log('🌐 Fetching fresh data...');
        
        // Use Promise.race for timeout
        const fetchPromise = fetchDataWithRetry();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), CONFIG.REQUEST_TIMEOUT)
        );
        
        const data = await Promise.race([fetchPromise, timeoutPromise]);
        
        // Cache the data
        cacheData(data);
        
        // Process and display
        processData(data);
        
        // Update timestamp
        updateTimestamps();
        
        console.log('✅ Data loaded successfully');
        
    } catch (error) {
        console.warn('⚠️ Failed to load fresh data:', error.message);
        
        // If no cached data, show error
        if (!getCachedData()) {
            showError('Unable to load intelligence data');
        }
        
    } finally {
        STATE.isLoading = false;
        hideLoading();
    }
}

/**
 * Fetch data with retry logic
 */
async function fetchDataWithRetry(retries = CONFIG.MAX_RETRIES) {
    for (let i = 0; i <= retries; i++) {
        try {
            const url = `${CONFIG.API_URL}?t=${Date.now()}`; // Cache busting
            
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                mode: 'no-cors' // Try no-cors mode for faster response
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            if (i === retries) throw error;
            
            console.log(`Retry ${i + 1}/${retries}...`);
            await sleep(1000 * (i + 1)); // Exponential backoff
        }
    }
}

/**
 * Process and display data
 */
function processData(data) {
    if (!data || !data.records) {
        console.warn('Invalid data format');
        return;
    }
    
    // Process GitHub data
    STATE.allData.github = processGitHubData(data.records);
    
    // Generate mock n8n data (for demo)
    STATE.allData.n8n = generateN8nData();
    
    // Update counts
    updateTotalCounts();
    
    // Apply current filters
    applyFilters();
    
    // Render cards
    renderIntelCards();
    
    // Update analytics
    updateAnalytics();
}

/**
 * Process GitHub API data
 */
function processGitHubData(records) {
    return records.slice(0, 50).map((record, index) => ({
        id: `gh-${index}`,
        title: record.n || 'Untitled System',
        meta: extractRepoInfo(record.u),
        description: record.s || 'Mission-critical infrastructure component.',
        category: getCategory(record.d),
        stars: record.stars || Math.floor(Math.random() * 5000) + 100,
        forks: Math.floor((record.stars || 100) * 0.1),
        status: 'ACTIVE',
        priority: getPriority(record.dependency_level),
        source: 'github',
        url: record.u,
        domain: record.d,
        timestamp: record.up || new Date().toISOString()
    }));
}

/**
 * Generate mock n8n data
 */
function generateN8nData() {
    return [
        {
            id: 'n8n-1',
            title: 'Automated Lead Intelligence',
            meta: 'Clearbit + Salesforce + Slack',
            description: 'Real-time lead enrichment and notification system.',
            category: 'sales',
            nodes: 12,
            executions: 1500,
            status: 'ACTIVE',
            priority: 'high',
            source: 'n8n'
        },
        {
            id: 'n8n-2',
            title: 'Crypto Arbitrage Signal',
            meta: 'Binance + Coinbase + Twilio',
            description: 'Cross-exchange arbitrage opportunity detection.',
            category: 'trading',
            nodes: 8,
            executions: 890,
            status: 'ACTIVE',
            priority: 'critical',
            source: 'n8n'
        },
        {
            id: 'n8n-3',
            title: 'GitHub Activity Digest',
            meta: 'GitHub API + Slack + Airtable',
            description: 'Daily repository activity reports and analytics.',
            category: 'devops',
            nodes: 6,
            executions: 2400,
            status: 'ACTIVE',
            priority: 'medium',
            source: 'n8n'
        },
        {
            id: 'n8n-4',
            title: 'Infrastructure Monitoring',
            meta: 'AWS + Discord + Grafana',
            description: 'Real-time system health monitoring and alerts.',
            category: 'infra',
            nodes: 15,
            executions: 5200,
            status: 'ACTIVE',
            priority: 'critical',
            source: 'n8n'
        }
    ];
}

/**
 * Render intelligence cards
 */
function renderIntelCards() {
    if (STATE.filteredData.length === 0) {
        DOM.intelGrid.innerHTML = '';
        DOM.emptyState.style.display = 'flex';
        return;
    }
    
    DOM.emptyState.style.display = 'none';
    
    const cardsHTML = STATE.filteredData.map(item => `
        <div class="intel-card" data-id="${item.id}" onclick="openIntelDetail('${item.id}')">
            <div class="intel-card-header">
                <h3 class="intel-card-title">${escapeHTML(item.title)}</h3>
                <span class="intel-card-badge ${item.priority}">${item.priority.toUpperCase()}</span>
            </div>
            <div class="intel-card-meta">
                <i data-lucide="${item.source === 'github' ? 'code' : 'zap'}" width="12" height="12"></i>
                ${escapeHTML(item.meta)}
            </div>
            <p class="intel-card-desc">${escapeHTML(item.description)}</p>
            <div class="intel-card-footer">
                <div class="intel-stats">
                    ${item.source === 'github' ? `
                        <div class="stat-item" title="Stars">
                            <i data-lucide="star" width="12" height="12"></i>
                            <span class="stat-value">${formatNumber(item.stars)}</span>
                        </div>
                        <div class="stat-item" title="Forks">
                            <i data-lucide="git-fork" width="12" height="12"></i>
                            <span class="stat-value">${formatNumber(item.forks)}</span>
                        </div>
                    ` : `
                        <div class="stat-item" title="Nodes">
                            <i data-lucide="box" width="12" height="12"></i>
                            <span class="stat-value">${item.nodes}</span>
                        </div>
                        <div class="stat-item" title="Executions">
                            <i data-lucide="play" width="12" height="12"></i>
                            <span class="stat-value">${formatNumber(item.executions)}</span>
                        </div>
                    `}
                </div>
                <div class="intel-action">
                    <button class="action-btn">
                        <i data-lucide="arrow-right" width="12" height="12"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    DOM.intelGrid.innerHTML = cardsHTML;
    lucide.createIcons();
}

/**
 * Apply filters based on current selection
 */
function applyFilters() {
    const data = STATE.allData[STATE.currentSource];
    
    STATE.filteredData = data.filter(item => {
        // Apply category filter
        if (STATE.currentFilter !== 'all') {
            const filterMap = {
                'ai': 'ai_infra',
                'gov': 'gov',
                'finance': 'finance',
                'health': 'health'
            };
            
            const targetCategory = filterMap[STATE.currentFilter];
            if (targetCategory && item.category !== targetCategory) {
                return false;
            }
        }
        
        return true;
    });
    
    // Limit to 20 items for performance
    STATE.filteredData = STATE.filteredData.slice(0, 20);
}

/**
 * Update analytics dashboard
 */
function updateAnalytics() {
    const githubData = STATE.allData.github;
    
    // Discovery rate
    const discoveryCount = githubData.length;
    DOM.discoveryRate.textContent = `${discoveryCount}/HR`;
    
    // Critical systems (high priority)
    const criticalCount = githubData.filter(item => item.priority === 'critical').length;
    DOM.criticalSystems.textContent = criticalCount;
    
    // Activity index (0-10)
    const avgStars = githubData.reduce((sum, item) => sum + item.stars, 0) / Math.max(githubData.length, 1);
    const activityScore = Math.min(10, Math.round(avgStars / 500));
    DOM.activityIndex.textContent = activityScore.toFixed(1);
    
    // Progress bar
    const progressPercent = (activityScore / 10) * 100;
    DOM.progressFill.style.width = `${progressPercent}%`;
}

/**
 * Update timestamps
 */
function updateTimestamps() {
    const now = new Date();
    STATE.lastUpdate = now;
    
    // Format last scan time
    const timeStr = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    DOM.lastScan.textContent = timeStr;
    
    // Calculate next scan (4 hours from now)
    const nextScan = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const nextTimeStr = nextScan.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    DOM.nextScan.textContent = nextTimeStr;
    STATE.nextScan = nextScan;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Source switching
    DOM.sourceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const source = btn.dataset.source;
            switchSource(source);
        });
    });
    
    // Filter chips
    DOM.filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const filter = chip.dataset.filter;
            switchFilter(filter);
        });
    });
    
    // Refresh button
    DOM.refreshBtn.addEventListener('click', () => {
        loadFreshData();
        DOM.refreshBtn.innerHTML = '<i data-lucide="loader" width="14" height="14"></i><span>REFRESHING</span>';
        setTimeout(() => {
            DOM.refreshBtn.innerHTML = '<i data-lucide="refresh-cw" width="14" height="14"></i><span>REFRESH</span>';
            lucide.createIcons();
        }, 2000);
    });
    
    // Modal close
    DOM.modalClose.addEventListener('click', () => {
        DOM.intelModal.classList.remove('active');
    });
    
    // Close modal on overlay click
    DOM.intelModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            DOM.intelModal.classList.remove('active');
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // ESC to close modal
        if (e.key === 'Escape' && DOM.intelModal.classList.contains('active')) {
            DOM.intelModal.classList.remove('active');
        }
        
        // R to refresh
        if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            loadFreshData();
        }
        
        // 1-4 for quick filters
        if (e.key >= '1' && e.key <= '4') {
            const filters = ['all', 'ai', 'gov', 'finance', 'health'];
            const index = parseInt(e.key);
            if (filters[index]) {
                switchFilter(filters[index]);
            }
        }
    });
}

/**
 * Switch data source
 */
function switchSource(source) {
    if (STATE.currentSource === source) return;
    
    STATE.currentSource = source;
    
    // Update UI
    DOM.sourceBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.source === source);
    });
    
    // Apply filters and render
    applyFilters();
    renderIntelCards();
    updateTotalCounts();
}

/**
 * Switch filter
 */
function switchFilter(filter) {
    if (STATE.currentFilter === filter) return;
    
    STATE.currentFilter = filter;
    
    // Update UI
    DOM.filterChips.forEach(chip => {
        chip.classList.toggle('active', chip.dataset.filter === filter);
    });
    
    // Apply filters and render
    applyFilters();
    renderIntelCards();
}

/**
 * Open intelligence detail modal
 */
function openIntelDetail(itemId) {
    const item = STATE.filteredData.find(i => i.id === itemId);
    if (!item) return;
    
    // Update modal content
    DOM.modalTitle.textContent = item.title;
    
    const content = `
        <div class="intel-detail">
            <div class="detail-header">
                <div class="detail-meta">
                    <span class="detail-badge ${item.priority}">${item.priority.toUpperCase()}</span>
                    <span class="detail-source">
                        <i data-lucide="${item.source === 'github' ? 'code' : 'zap'}"></i>
                        ${item.source.toUpperCase()}
                    </span>
                </div>
                <div class="detail-stats">
                    ${item.source === 'github' ? `
                        <div class="detail-stat">
                            <i data-lucide="star"></i>
                            <span>${formatNumber(item.stars)} stars</span>
                        </div>
                        <div class="detail-stat">
                            <i data-lucide="git-fork"></i>
                            <span>${formatNumber(item.forks)} forks</span>
                        </div>
                    ` : `
                        <div class="detail-stat">
                            <i data-lucide="box"></i>
                            <span>${item.nodes} nodes</span>
                        </div>
                        <div class="detail-stat">
                            <i data-lucide="play"></i>
                            <span>${formatNumber(item.executions)} executions</span>
                        </div>
                    `}
                </div>
            </div>
            
            <div class="detail-section">
                <h4>DESCRIPTION</h4>
                <p>${escapeHTML(item.description)}</p>
            </div>
            
            <div class="detail-section">
                <h4>METADATA</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Category</span>
                        <span class="detail-value">${getCategoryName(item.category)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="detail-value status-active">${item.status}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Updated</span>
                        <span class="detail-value">${formatDate(item.timestamp)}</span>
                    </div>
                </div>
            </div>
            
            ${item.url ? `
                <div class="detail-actions">
                    <a href="${item.url}" target="_blank" class="action-btn primary">
                        <i data-lucide="external-link"></i>
                        <span>VIEW ${item.source === 'github' ? 'REPOSITORY' : 'WORKFLOW'}</span>
                    </a>
                </div>
            ` : ''}
        </div>
    `;
    
    DOM.modalContent.innerHTML = content;
    DOM.intelModal.classList.add('active');
    
    // Refresh icons in modal
    setTimeout(() => lucide.createIcons(), 10);
}

/**
 * Setup auto-refresh
 */
function setupAutoRefresh() {
    // Clear existing interval
    if (STATE.refreshInterval) {
        clearInterval(STATE.refreshInterval);
    }
    
    // Refresh data every 5 minutes
    STATE.refreshInterval = setInterval(() => {
        if (!STATE.isLoading) {
            loadFreshData();
        }
    }, 5 * 60 * 1000);
}

/**
 * Update total counts
 */
function updateTotalCounts() {
    const githubCount = STATE.allData.github.length;
    const n8nCount = STATE.allData.n8n.length;
    const total = githubCount + n8nCount;
    
    DOM.totalOpps.textContent = total;
}

/**
 * Show loading state
 */
function showLoading() {
    DOM.loadingState.style.display = 'flex';
    DOM.intelGrid.style.opacity = '0.3';
}

/**
 * Hide loading state
 */
function hideLoading() {
    DOM.loadingState.style.display = 'none';
    DOM.intelGrid.style.opacity = '1';
}

/**
 * Show error state
 */
function showError(message) {
    DOM.intelGrid.innerHTML = `
        <div class="error-state">
            <div class="error-icon">
                <i data-lucide="alert-triangle"></i>
            </div>
            <div class="error-title">SYSTEM ERROR</div>
            <div class="error-desc">${escapeHTML(message)}</div>
            <button class="action-btn" onclick="loadFreshData()">
                <i data-lucide="refresh-cw"></i>
                <span>RETRY</span>
            </button>
        </div>
    `;
    
    lucide.createIcons();
    hideLoading();
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
    } catch (e) {
        console.warn('Failed to cache data:', e);
    }
}

function getCachedData() {
    try {
        const cached = localStorage.getItem(CONFIG.CACHE_KEY);
        if (!cached) return null;
        
        const cacheItem = JSON.parse(cached);
        const age = Date.now() - cacheItem.timestamp;
        
        if (age > CONFIG.CACHE_TTL) {
            localStorage.removeItem(CONFIG.CACHE_KEY);
            return null;
        }
        
        return cacheItem.data;
    } catch (e) {
        console.warn('Failed to read cache:', e);
        return null;
    }
}

/**
 * Utility functions
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function extractRepoInfo(url) {
    if (!url) return 'GitHub Repository';
    try {
        const parts = url.split('/');
        return parts.slice(-2).join(' / ');
    } catch {
        return url;
    }
}

function getCategory(domain) {
    return domain || 'infrastructure';
}

function getCategoryName(category) {
    const names = {
        'ai_infra': 'AI Infrastructure',
        'gov': 'Government Tech',
        'finance': 'Fintech',
        'health': 'Health Tech',
        'sales': 'Sales Automation',
        'trading': 'Trading Systems',
        'devops': 'DevOps',
        'infra': 'Infrastructure'
    };
    return names[category] || category;
}

function getPriority(level) {
    if (level === 'critical') return 'critical';
    if (level === 'high') return 'high';
    return Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low';
}

/**
 * Add some CSS for detail modal
 */
function addDetailStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .intel-detail {
            display: flex;
            flex-direction: column;
            gap: var(--space-lg);
        }
        
        .detail-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: var(--space-md);
            border-bottom: 1px solid var(--border-primary);
        }
        
        .detail-meta {
            display: flex;
            gap: var(--space-sm);
            align-items: center;
        }
        
        .detail-source {
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--text-muted);
        }
        
        .detail-stats {
            display: flex;
            gap: var(--space-lg);
        }
        
        .detail-stat {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        
        .detail-section {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
        }
        
        .detail-section h4 {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .detail-section p {
            line-height: 1.6;
            color: var(--text-secondary);
        }
        
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: var(--space-md);
        }
        
        .detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .detail-label {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            color: var(--text-muted);
        }
        
        .detail-value {
            font-size: 0.9rem;
            color: var(--text-primary);
        }
        
        .detail-value.status-active {
            color: var(--accent-success);
        }
        
        .detail-actions {
            display: flex;
            gap: var(--space-md);
            margin-top: var(--space-lg);
        }
        
        .action-btn.primary {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: var(--accent-primary);
            color: var(--bg-primary);
            border: none;
            border-radius: var(--radius-md);
            font-family: var(--font-mono);
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all var(--transition-normal);
        }
        
        .action-btn.primary:hover {
            background: var(--accent-secondary);
            transform: translateY(-2px);
        }
        
        .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--space-xl);
            text-align: center;
            grid-column: 1 / -1;
        }
        
        .error-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 71, 87, 0.1);
            border-radius: 50%;
            margin-bottom: var(--space-md);
        }
        
        .error-icon i {
            width: 24px;
            height: 24px;
            color: var(--accent-danger);
        }
        
        .error-title {
            font-family: var(--font-display);
            font-size: 1.25rem;
            color: var(--text-primary);
            margin-bottom: var(--space-xs);
        }
        
        .error-desc {
            font-size: 0.9rem;
            color: var(--text-muted);
            margin-bottom: var(--space-md);
        }
        
        /* Priority colors */
        .intel-card-badge.critical {
            background: var(--accent-danger);
        }
        
        .intel-card-badge.high {
            background: var(--accent-warning);
        }
        
        .intel-card-badge.medium {
            background: var(--accent-primary);
        }
        
        .intel-card-badge.low {
            background: var(--text-muted);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Add detail styles
    addDetailStyles();
    
    // Initialize app
    init();
    
    // Initial timestamp update
    updateTimestamps();
});

// Global exports for inline event handlers
window.openIntelDetail = openIntelDetail;
window.loadFreshData = loadFreshData;

console.log('🔧 OPENINDEX v2.1 loaded successfully');
