/**
 * OPENINDEX v2.2 - ARKNIGHTS Endfield Style
 * Ultra Fast Intelligence Platform with Fallback Data
 */

const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbw92AD5kJmwsWc89P5_BkDax-r3AmWIm2W0_RhQRnqyilw_vWA7aPYMHvykUusxUFM7/exec',
    FALLBACK_MODE: true, // Set to true để dùng fallback data nhanh
    CACHE_KEY: 'openindex_v2_cache',
    CACHE_TTL: 10 * 60 * 1000, // 10 minutes
    REQUEST_TIMEOUT: 5000, // Giảm timeout xuống 5s
    MAX_RETRIES: 1 // Chỉ retry 1 lần
};

const STATE = {
    currentSource: 'github',
    currentFilter: 'all',
    allData: { github: [], n8n: [] },
    filteredData: [],
    isLoading: false,
    lastUpdate: null,
    nextScan: null,
    refreshInterval: null,
    useFallback: false
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
    console.log('🚀 Initializing OPENINDEX v2.2...');
    
    try {
        // Initialize icons
        lucide.createIcons();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load data IMMEDIATELY (cache or fallback)
        await loadDataFast();
        
        // Setup auto-refresh
        setupAutoRefresh();
        
        // Initial timestamp update
        updateTimestamps();
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        // Even if init fails, load fallback data
        loadFallbackData();
    }
}

/**
 * Load data FAST - priority: Cache -> API -> Fallback
 */
async function loadDataFast() {
    showLoading();
    
    try {
        // 1. First, try to load from cache (instant)
        const cachedData = getCachedData();
        if (cachedData) {
            console.log('📦 Loading from cache...');
            processData(cachedData);
            hideLoading();
            
            // Then refresh from API in background
            setTimeout(() => loadFromAPI(), 1000);
            return;
        }
        
        // 2. If CONFIG.FALLBACK_MODE is true, use fallback immediately
        if (CONFIG.FALLBACK_MODE) {
            console.log('⚡ Using fallback mode for instant load');
            loadFallbackData();
            
            // Then try API in background
            setTimeout(() => loadFromAPI(), 500);
            return;
        }
        
        // 3. Otherwise, try API with short timeout
        await loadFromAPI();
        
    } catch (error) {
        console.warn('⚠️ Fast load failed, using fallback:', error.message);
        loadFallbackData();
    }
}

/**
 * Load data from API
 */
async function loadFromAPI() {
    if (STATE.isLoading) return;
    
    STATE.isLoading = true;
    
    try {
        console.log('🌐 Fetching from API...');
        
        // Try JSONP method for CORS
        const data = await fetchWithJSONP();
        
        if (data && (data.records || data.status === 'success')) {
            // Cache the data
            cacheData(data);
            
            // Process and display
            processData(data);
            
            // Update timestamp
            updateTimestamps();
            
            STATE.useFallback = false;
            console.log('✅ API data loaded successfully');
        } else {
            throw new Error('Invalid API response format');
        }
        
    } catch (error) {
        console.warn('⚠️ API load failed:', error.message);
        // Don't show error, just keep using current data
    } finally {
        STATE.isLoading = false;
        hideLoading();
    }
}

/**
 * Fetch using JSONP (bypass CORS)
 */
function fetchWithJSONP() {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Date.now();
        const timeoutId = setTimeout(() => {
            reject(new Error('JSONP timeout'));
        }, CONFIG.REQUEST_TIMEOUT);
        
        window[callbackName] = function(data) {
            clearTimeout(timeoutId);
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        
        const script = document.createElement('script');
        script.src = `${CONFIG.API_URL}?callback=${callbackName}&_=${Date.now()}`;
        script.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error('JSONP script error'));
        };
        
        document.body.appendChild(script);
    });
}

/**
 * Load fallback data (always works)
 */
function loadFallbackData() {
    console.log('🔄 Loading fallback data...');
    
    const fallbackData = {
        status: "success",
        timestamp: new Date().toISOString(),
        records: generateFallbackGitHubData()
    };
    
    // Process the data
    processData(fallbackData);
    
    // Mark as using fallback
    STATE.useFallback = true;
    
    // Update UI to show fallback mode
    updateFallbackUI();
    
    console.log('✅ Fallback data loaded');
}

/**
 * Generate realistic fallback GitHub data
 */
function generateFallbackGitHubData() {
    const domains = ['ai_infra', 'gov', 'finance', 'health', 'climate'];
    const techStack = [
        { name: 'vLLM', desc: 'High-throughput LLM serving', stars: 12500 },
        { name: 'Kubeflow', desc: 'ML workflow orchestration on Kubernetes', stars: 12800 },
        { name: 'MLflow', desc: 'Machine learning lifecycle platform', stars: 15000 },
        { name: 'Feast', desc: 'Feature store for ML', stars: 4800 },
        { name: 'Ray', desc: 'Unified framework for scaling AI', stars: 28000 },
        { name: 'Weights & Biases', desc: 'Experiment tracking for ML', stars: 7200 },
        { name: 'Pachyderm', desc: 'Data versioning for ML', stars: 5800 },
        { name: 'Metaflow', desc: 'Human-centric ML framework', stars: 7200 },
        { name: 'OpenMetadata', desc: 'Unified metadata management', stars: 3500 },
        { name: 'Airflow', desc: 'Workflow orchestration', stars: 32000 },
        { name: 'Prefect', desc: 'Modern workflow orchestration', stars: 14000 },
        { name: 'Dagster', desc: 'Data orchestrator for ML', stars: 9200 },
        { name: 'Great Expectations', desc: 'Data quality testing', stars: 8900 },
        { name: 'dbt', desc: 'Data transformation tool', stars: 8500 },
        { name: 'Superset', desc: 'Data visualization platform', stars: 55000 },
        { name: 'Metabase', desc: 'Business intelligence tool', stars: 35000 },
        { name: 'Streamlit', desc: 'ML web app framework', stars: 28000 },
        { name: 'Gradio', desc: 'ML web demo framework', stars: 21000 },
        { name: 'Haystack', desc: 'LLM application framework', stars: 12000 },
        { name: 'LangChain', desc: 'LLM application framework', stars: 75000 }
    ];
    
    return techStack.map((tech, index) => ({
        n: tech.name,
        s: tech.desc,
        u: `https://github.com/${tech.name.toLowerCase().replace(/[&\s]/g, '')}/${tech.name.toLowerCase()}`,
        stars: tech.stars,
        d: domains[index % domains.length],
        dependency_level: index % 3 === 0 ? 'critical' : index % 3 === 1 ? 'high' : 'medium',
        system_role: 'Core Infrastructure',
        up: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    }));
}

/**
 * Update UI for fallback mode
 */
function updateFallbackUI() {
    // Add a subtle indicator in the header
    const headerRight = document.querySelector('.header-right');
    if (!headerRight.querySelector('.fallback-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'fallback-indicator';
        indicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(255, 215, 102, 0.1); border: 1px solid rgba(255, 215, 102, 0.3); border-radius: 4px;">
                <i data-lucide="shield-alert" width="12" height="12" style="color: #ffd166;"></i>
                <span style="font-family: var(--font-mono); font-size: 0.7rem; color: #ffd166;">OFFLINE MODE</span>
            </div>
        `;
        headerRight.appendChild(indicator);
        lucide.createIcons();
    }
}

/**
 * Process and display data
 */
function processData(data) {
    if (!data) {
        console.warn('No data to process');
        return;
    }
    
    // Process GitHub data
    STATE.allData.github = processGitHubData(data.records || []);
    
    // Generate n8n data
    STATE.allData.n8n = generateN8nData();
    
    // Update counts
    updateTotalCounts();
    
    // Apply current filters
    applyFilters();
    
    // Render cards
    renderIntelCards();
    
    // Update analytics
    updateAnalytics();
    
    // Hide loading
    hideLoading();
}

/**
 * Process GitHub API data
 */
function processGitHubData(records) {
    if (!records || !Array.isArray(records)) {
        return generateFallbackGitHubData().slice(0, 15).map((record, index) => ({
            id: `gh-${index}`,
            title: record.n || 'Untitled System',
            meta: extractRepoInfo(record.u),
            description: record.s || 'Mission-critical infrastructure component.',
            category: record.d || 'ai_infra',
            stars: record.stars || Math.floor(Math.random() * 5000) + 100,
            forks: Math.floor((record.stars || 100) * 0.1),
            status: 'ACTIVE',
            priority: record.dependency_level || (index % 3 === 0 ? 'critical' : index % 3 === 1 ? 'high' : 'medium'),
            source: 'github',
            url: record.u,
            domain: record.d,
            timestamp: record.up || new Date().toISOString()
        }));
    }
    
    return records.slice(0, 20).map((record, index) => ({
        id: `gh-${index}`,
        title: record.n || 'Untitled System',
        meta: extractRepoInfo(record.u),
        description: record.s || 'Mission-critical infrastructure component.',
        category: record.d || 'ai_infra',
        stars: record.stars || Math.floor(Math.random() * 5000) + 100,
        forks: Math.floor((record.stars || 100) * 0.1),
        status: 'ACTIVE',
        priority: record.dependency_level || (index % 3 === 0 ? 'critical' : index % 3 === 1 ? 'high' : 'medium'),
        source: 'github',
        url: record.u,
        domain: record.d,
        timestamp: record.up || new Date().toISOString()
    }));
}

/**
 * Generate n8n data
 */
function generateN8nData() {
    return [
        {
            id: 'n8n-1',
            title: 'Automated Lead Intelligence',
            meta: 'Clearbit + Salesforce + Slack',
            description: 'Real-time lead enrichment and notification system. Processes 1500+ leads daily.',
            category: 'sales',
            nodes: 12,
            executions: 1500,
            status: 'ACTIVE',
            priority: 'high',
            source: 'n8n',
            efficiency: 'Saves 4 hours/week per rep'
        },
        {
            id: 'n8n-2',
            title: 'Crypto Arbitrage Signal',
            meta: 'Binance + Coinbase + Twilio',
            description: 'Cross-exchange arbitrage opportunity detection with real-time alerts.',
            category: 'trading',
            nodes: 8,
            executions: 890,
            status: 'ACTIVE',
            priority: 'critical',
            source: 'n8n',
            efficiency: 'Identifies 0.3-0.8% deltas'
        },
        {
            id: 'n8n-3',
            title: 'GitHub Activity Digest',
            meta: 'GitHub API + Slack + Airtable',
            description: 'Daily repository activity reports and analytics for engineering teams.',
            category: 'devops',
            nodes: 6,
            executions: 2400,
            status: 'ACTIVE',
            priority: 'medium',
            source: 'n8n',
            efficiency: 'Reduces manual reporting by 90%'
        },
        {
            id: 'n8n-4',
            title: 'Infrastructure Monitoring',
            meta: 'AWS + Discord + Grafana',
            description: 'Real-time system health monitoring and automated incident response.',
            category: 'infra',
            nodes: 15,
            executions: 5200,
            status: 'ACTIVE',
            priority: 'critical',
            source: 'n8n',
            efficiency: 'MTTR reduced from 2h to 15min'
        },
        {
            id: 'n8n-5',
            title: 'Customer Support Triage',
            meta: 'Zendesk + OpenAI + Jira',
            description: 'AI-powered ticket classification and routing to appropriate teams.',
            category: 'support',
            nodes: 10,
            executions: 3200,
            status: 'ACTIVE',
            priority: 'high',
            source: 'n8n',
            efficiency: 'Reduces response time by 65%'
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
                            <span class="stat-value">${formatNumber(item.executions)}+</span>
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
    
    // Limit to 15 items for better performance
    STATE.filteredData = STATE.filteredData.slice(0, 15);
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
    const avgStars = githubData.reduce((sum, item) => sum + (item.stars || 0), 0) / Math.max(githubData.length, 1);
    const activityScore = Math.min(10, Math.round(avgStars / 1000));
    DOM.activityIndex.textContent = activityScore.toFixed(1);
    
    // Progress bar
    const progressPercent = (activityScore / 10) * 100;
    if (DOM.progressFill) {
        DOM.progressFill.style.width = `${progressPercent}%`;
    }
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
    if (DOM.lastScan) {
        DOM.lastScan.textContent = timeStr;
    }
    
    // Calculate next scan (4 hours from now)
    const nextScan = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const nextTimeStr = nextScan.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    if (DOM.nextScan) {
        DOM.nextScan.textContent = nextTimeStr;
    }
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
    if (DOM.refreshBtn) {
        DOM.refreshBtn.addEventListener('click', () => {
            loadFromAPI();
            // Show loading state on button
            const icon = DOM.refreshBtn.querySelector('i');
            const text = DOM.refreshBtn.querySelector('span');
            if (icon) icon.setAttribute('data-lucide', 'loader');
            if (text) text.textContent = 'REFRESHING';
            lucide.createIcons();
            
            // Reset button after 3 seconds
            setTimeout(() => {
                if (icon) icon.setAttribute('data-lucide', 'refresh-cw');
                if (text) text.textContent = 'REFRESH';
                lucide.createIcons();
            }, 3000);
        });
    }
    
    // Modal close
    if (DOM.modalClose) {
        DOM.modalClose.addEventListener('click', () => {
            DOM.intelModal.classList.remove('active');
        });
    }
    
    // Close modal on overlay click
    if (DOM.intelModal) {
        DOM.intelModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                DOM.intelModal.classList.remove('active');
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // ESC to close modal
        if (e.key === 'Escape' && DOM.intelModal && DOM.intelModal.classList.contains('active')) {
            DOM.intelModal.classList.remove('active');
        }
        
        // R to refresh
        if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            loadFromAPI();
        }
        
        // 1-5 for quick filters
        if (e.key >= '1' && e.key <= '5') {
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
                        <div class="detail-stat">
                            <i data-lucide="git-branch"></i>
                            <span>${item.category.toUpperCase()}</span>
                        </div>
                    ` : `
                        <div class="detail-stat">
                            <i data-lucide="box"></i>
                            <span>${item.nodes} nodes</span>
                        </div>
                        <div class="detail-stat">
                            <i data-lucide="play"></i>
                            <span>${formatNumber(item.executions)}+ runs</span>
                        </div>
                        <div class="detail-stat">
                            <i data-lucide="zap"></i>
                            <span>${item.efficiency || 'High efficiency'}</span>
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
                        <span class="detail-label">Source</span>
                        <span class="detail-value">${item.source === 'github' ? 'GitHub Repository' : 'n8n Workflow'}</span>
                    </div>
                    ${item.timestamp ? `
                    <div class="detail-item">
                        <span class="detail-label">Last Updated</span>
                        <span class="detail-value">${formatDate(item.timestamp)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${item.url ? `
                <div class="detail-actions">
                    <a href="${item.url}" target="_blank" class="action-btn primary">
                        <i data-lucide="external-link"></i>
                        <span>VIEW ${item.source === 'github' ? 'REPOSITORY' : 'WORKFLOW'}</span>
                    </a>
                    ${STATE.useFallback ? `
                        <div class="fallback-note">
                            <i data-lucide="info"></i>
                            <span>Showing cached data - API connection pending</span>
                        </div>
                    ` : ''}
                </div>
            ` : `
                <div class="detail-actions">
                    <button class="action-btn primary" onclick="alert('Workflow execution requires n8n instance access')">
                        <i data-lucide="play"></i>
                        <span>EXECUTE WORKFLOW</span>
                    </button>
                </div>
            `}
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
    // Refresh data every 2 minutes (if not using fallback)
    STATE.refreshInterval = setInterval(() => {
        if (!STATE.isLoading && !STATE.useFallback) {
            loadFromAPI();
        }
    }, 2 * 60 * 1000);
}

/**
 * Update total counts
 */
function updateTotalCounts() {
    const githubCount = STATE.allData.github.length;
    const n8nCount = STATE.allData.n8n.length;
    const total = githubCount + n8nCount;
    
    if (DOM.totalOpps) {
        DOM.totalOpps.textContent = total;
    }
}

/**
 * Show loading state
 */
function showLoading() {
    if (DOM.loadingState) {
        DOM.loadingState.style.display = 'flex';
    }
    if (DOM.intelGrid) {
        DOM.intelGrid.style.opacity = '0.5';
    }
}

/**
 * Hide loading state
 */
function hideLoading() {
    if (DOM.loadingState) {
        DOM.loadingState.style.display = 'none';
    }
    if (DOM.intelGrid) {
        DOM.intelGrid.style.opacity = '1';
    }
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
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch {
        return 'Recent';
    }
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

function getCategoryName(category) {
    const names = {
        'ai_infra': 'AI Infrastructure',
        'gov': 'Government Tech',
        'finance': 'Fintech',
        'health': 'Health Tech',
        'climate': 'Climate Tech',
        'sales': 'Sales Automation',
        'trading': 'Trading Systems',
        'devops': 'DevOps',
        'infra': 'Infrastructure',
        'support': 'Customer Support'
    };
    return names[category] || category.replace('_', ' ').toUpperCase();
}

/**
 * Add some CSS for detail modal
 */
function addDetailStyles() {
    if (document.querySelector('#detail-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'detail-styles';
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
            flex-wrap: wrap;
            gap: var(--space-md);
        }
        
        .detail-meta {
            display: flex;
            gap: var(--space-sm);
            align-items: center;
            flex-wrap: wrap;
        }
        
        .detail-source {
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--text-muted);
            padding: 2px 8px;
            background: var(--bg-tertiary);
            border-radius: var(--radius-sm);
        }
        
        .detail-stats {
            display: flex;
            gap: var(--space-lg);
            flex-wrap: wrap;
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
            margin-bottom: 4px;
        }
        
        .detail-section p {
            line-height: 1.6;
            color: var(--text-secondary);
            font-size: 0.95rem;
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
            font-weight: 500;
        }
        
        .detail-actions {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            margin-top: var(--space-lg);
        }
        
        .action-btn.primary {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: var(--accent-primary);
            color: var(--bg-primary);
            border: none;
            border-radius: var(--radius-md);
            font-family: var(--font-mono);
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all var(--transition-normal);
            justify-content: center;
        }
        
        .action-btn.primary:hover {
            background: var(--accent-secondary);
            transform: translateY(-2px);
            box-shadow: var(--glow-secondary);
        }
        
        .fallback-note {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(255, 215, 102, 0.1);
            border: 1px solid rgba(255, 215, 102, 0.3);
            border-radius: var(--radius-sm);
            font-size: 0.8rem;
            color: #ffd166;
        }
        
        .fallback-note i {
            width: 14px;
            height: 14px;
        }
        
        /* Priority colors */
        .detail-badge.critical,
        .intel-card-badge.critical {
            background: var(--accent-danger);
            color: white;
        }
        
        .detail-badge.high,
        .intel-card-badge.high {
            background: var(--accent-warning);
            color: #000;
        }
        
        .detail-badge.medium,
        .intel-card-badge.medium {
            background: var(--accent-primary);
            color: white;
        }
        
        .detail-badge.low,
        .intel-card-badge.low {
            background: var(--text-muted);
            color: white;
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
});

// Global exports for inline event handlers
window.openIntelDetail = openIntelDetail;
window.loadFromAPI = loadFromAPI;

console.log('🔧 OPENINDEX v2.2 loaded - Fallback mode enabled');
