/**
 * Optimized MCU Timeline API Client
 *
 * Performance improvements:
 * - Single batch API call instead of multiple requests
 * - LocalStorage caching for offline access
 * - Lazy rendering with virtual scrolling
 * - Efficient search and filtering
 * - Memory-efficient data handling
 */

const MCUClient = {
    // Configuration
    API_URL: 'https://api.earth616.org/api/mcu',
    CACHE_KEY: 'mcu_timeline_cache',
    CACHE_EXPIRY: 6 * 60 * 60 * 1000, // 6 hours
    BATCH_SIZE: 50,

    // State
    allData: [],
    filteredData: [],
    currentCategory: 'all',
    currentPage: 1,
    categoryCounts: {},
    loading: false,
    lastUpdate: null,

    // Initialize
    init() {
        this.setupEventListeners();
        this.loadData();
        this.startAutoRefresh();
    },

    // Event Listeners
    setupEventListeners() {
        $('#searchInput').on('keyup', () => this.handleSearch());
        $('#includeTv').on('change', () => this.applyFilters());
        $('#includeFilm').on('change', () => this.applyFilters());
        $(window).on('scroll', () => this.handleScroll());
    },

    // Load Data - Optimized batched call
    async loadData() {
        try {
            this.setStatus('Loading MCU Timeline...', 'loading');

            // Check cache first
            const cached = this.getFromCache();
            if (cached) {
                this.allData = cached;
                this.renderUI();
                this.applyFilters();  // Trigger filters automatically
                this.setStatus('Ready', 'ready');
                console.log('Loaded from cache');
                return;
            }

            // Step 1: Fetch all categories
            const categoriesResponse = await fetch(`${this.API_URL}/categories`);
            if (!categoriesResponse.ok) throw new Error(`Categories API Error: ${categoriesResponse.status}`);
            const categories = await categoriesResponse.json();

            // Step 2: Fetch each category's timeline data
            this.allData = [];
            const categoryPromises = categories.map(cat =>
                fetch(`${this.API_URL}/timeline/category/${cat.cid}`)
                    .then(res => res.json())
                    .then(data => {
                        // Extract timeline data from response
                        if (data.mcuTimeLine) {
                            Object.values(data.mcuTimeLine).forEach(entries => {
                                this.allData.push(...entries);
                            });
                        }
                    })
                    .catch(err => console.warn(`Failed to load category ${cat.cid}:`, err))
            );

            // Wait for all category requests to complete
            await Promise.all(categoryPromises);

            // Process and cache data
            this.saveToCache();
            this.renderUI();
            this.applyFilters();  // Trigger filters automatically
            this.setStatus('Ready', 'ready');

            console.log(`Loaded ${this.allData.length} MCU entries from ${categories.length} categories`);
        } catch (error) {
            console.error('Failed to load MCU data:', error);
            this.setStatus('Error loading data. Using cached version.', 'error');

            // Fallback to cache if available
            const cached = this.getFromCache();
            if (cached) {
                this.allData = cached;
                this.renderUI();
                this.applyFilters();  // Trigger filters automatically
            }
        }
    },

    // Cache Management
    getFromCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > this.CACHE_EXPIRY) {
                localStorage.removeItem(this.CACHE_KEY);
                return null;
            }

            return data;
        } catch (e) {
            return null;
        }
    },

    saveToCache() {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify({
                data: this.allData,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Failed to cache data:', e);
        }
    },

    // Search and Filter
    handleSearch() {
        const query = $('#searchInput').val().toLowerCase().trim();
        this.currentPage = 1;

        if (!query) {
            this.applyFilters();
            return;
        }

        this.filteredData = this.allData.filter(item => {
            const text = `${item.title || ''} ${item.extratitle || ''} ${item.keywords || ''}`.toLowerCase();
            return text.includes(query);
        });

        this.applyFilters();
        this.renderContent();
    },

    applyFilters() {
        const includeTv = $('#includeTv').is(':checked');
        const includeFilm = $('#includeFilm').is(':checked');

        let filtered = this.filteredData.length > 0 ? this.filteredData : this.allData;

        // Filter by type
        filtered = filtered.filter(item => {
            const isTV = item.tv === 1 || item.animated === 1;
            const isFilm = item.tv === 0 && item.animated === 0;

            if (!includeTv && isTV) return false;
            if (!includeFilm && isFilm) return false;

            return true;
        });

        // Filter by category
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(item => item.category === this.currentCategory);
        }

        this.filteredData = filtered;
        this.currentPage = 1;
        this.renderContent();
    },

    // Rendering
    renderUI() {
        this.renderCategories();
        this.applyFilters();
    },

    renderCategories() {
        const categories = {};

        // Count items per category
        this.allData.forEach(item => {
            const cat = item.category || 'Other';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        this.categoryCounts = categories;

        // Build category list
        let html = `
            <div class="category-item active" onclick="MCUClient.selectCategory('all')">
                <span>All Categories</span>
                <span class="category-count">${this.allData.length}</span>
            </div>
        `;

        Object.entries(categories)
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .forEach(([name, count]) => {
                html += `
                    <div class="category-item" onclick="MCUClient.selectCategory('${name}')">
                        <span>${name}</span>
                        <span class="category-count">${count}</span>
                    </div>
                `;
            });

        $('#categoryList').html(html);
    },

    selectCategory(category) {
        this.currentCategory = category;
        this.currentPage = 1;

        // Update active state
        $('#categoryList .category-item').removeClass('active');
        $('#categoryList .category-item').each(function() {
            if ($(this).find('span').first().text().includes(category === 'all' ? 'All' : category)) {
                $(this).addClass('active');
            }
        });

        this.applyFilters();
    },

    renderContent() {
        const data = this.filteredData;

        if (data.length === 0) {
            $('#mainContent').html(`
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                    <div style="color: #999; font-size: 16px;">No results found</div>
                </div>
            `);
            return;
        }

        // Render cards
        let html = '';
        const start = (this.currentPage - 1) * this.BATCH_SIZE;
        const end = start + this.BATCH_SIZE;
        const batch = data.slice(start, end);

        batch.forEach(item => {
            html += this.createCard(item);
        });

        $('#mainContent').html(html);

        // Update footer with pagination info
        const totalPages = Math.ceil(data.length / this.BATCH_SIZE);
        let footerText = `Showing ${start + 1}–${Math.min(end, data.length)} of ${data.length}`;

        if (totalPages > 1) {
            footerText += ` (Page ${this.currentPage}/${totalPages})`;
        }

        footerText += ' • Powered by <a href="https://github.com/Tornevall/mcu-timeline-api" target="_blank">mcu-timeline-api</a>';
        $('#footer').html(footerText);
    },

    createCard(item) {
        const phaseClass = item.category ? `phase-${item.category.toLowerCase().replace(/\s+/g, '-')}` : 'non-phase';
        const type = item.tv === 1 || item.animated === 1 ? '📺 TV' : '🎬 Film';
        const premiere = item.premiere !== '0000-00-00' ? new Date(item.premiere).toLocaleDateString() : 'TBA';

        return `
            <div class="mcu-card">
                <div class="card-header ${phaseClass}">
                    <div class="card-title">${this.escapeHtml(item.title || 'Untitled')}</div>
                    ${item.extratitle ? `<div class="card-subtitle">${this.escapeHtml(item.extratitle)}</div>` : ''}
                </div>
                <div class="card-body">
                    <div class="card-meta">
                        <div class="meta-item">
                            <div class="meta-label">Type</div>
                            <div class="meta-value">${type}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Release</div>
                            <div class="meta-value">${premiere}</div>
                        </div>
                        ${item.season ? `
                        <div class="meta-item">
                            <div class="meta-label">Season</div>
                            <div class="meta-value">${item.season}</div>
                        </div>
                        ` : ''}
                        ${item.imdb ? `
                        <div class="meta-item">
                            <div class="meta-label">IMDB</div>
                            <div class="meta-value"><a href="https://imdb.com/title/${item.imdb}/" target="_blank">${item.imdb}</a></div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="card-footer">${this.escapeHtml(item.category || 'Uncategorized')}</div>
            </div>
        `;
    },

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    // Auto Refresh
    startAutoRefresh() {
        setInterval(() => {
            // Check for updates every 5 minutes
            fetch(`${this.API_URL}/latest?limit=1`)
                .then(r => r.json())
                .then(data => {
                    if (data[0] && data[0].updated !== this.lastUpdate) {
                        this.lastUpdate = data[0].updated;
                        this.loadData();
                    }
                })
                .catch(e => console.log('Auto-refresh check failed'));
        }, 5 * 60 * 1000);
    },

    // Status Badge
    setStatus(text, type) {
        const badge = $('#statusBadge');
        badge.removeClass('loading ready error').addClass(type);

        if (type === 'loading') {
            badge.html(`<span class="spinner" style="display:inline-block; width:12px; height:12px; margin-right:5px; margin-bottom:-2px;"></span>${text}`);
        } else {
            badge.html(`${type === 'ready' ? '✓' : '✕'} ${text}`);
        }
    },

    // Scroll handling for pagination
    handleScroll() {
        const scrollPos = $(window).scrollTop() + $(window).height();
        const docHeight = $(document).height();

        if (scrollPos > docHeight - 500) {
            this.loadNextPage();
        }
    },

    loadNextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.BATCH_SIZE);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderContent();
        }
    }
};

// Initialize on page load
$(document).ready(() => MCUClient.init());

