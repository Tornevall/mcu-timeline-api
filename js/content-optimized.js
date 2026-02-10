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
        // Ensure checkboxes are checked
        $('#includeTv').prop('checked', true);
        $('#includeFilm').prop('checked', true);

        this.setupEventListeners();
        this.loadData();
        this.startAutoRefresh();
    },

    // Event Listeners
    setupEventListeners() {
        const self = this;

        // Search input
        $('#searchInput').on('keyup', function() {
            console.log('Search triggered');
            self.handleSearch();
        });

        // TV Shows checkbox
        $('#includeTv').on('change', function() {
            console.log('TV checkbox changed to:', $(this).is(':checked'));
            self.applyFilters();
        });

        // Films checkbox
        $('#includeFilm').on('change', function() {
            console.log('Film checkbox changed to:', $(this).is(':checked'));
            self.applyFilters();
        });

        // Window scroll
        $(window).on('scroll', function() {
            self.handleScroll();
        });
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

        console.log('🔄 applyFilters called - TV:', includeTv, 'Film:', includeFilm);
        console.log('📊 Starting data count:', this.allData.length);

        // ALWAYS START FROM allData - don't use previously filtered data
        let filtered = this.allData.filter(item => {
            const isTV = item.tv === 1 || item.animated === 1;

            // Items with extratitle are treated as TV/series content
            // (even if tv=0, they're grouped with TV series)
            const hasExtratitle = item.extratitle && item.extratitle.trim();
            const isTVContent = isTV || hasExtratitle;
            const isFilmContent = !isTVContent;

            if (!includeTv && isTVContent) return false;
            if (!includeFilm && isFilmContent) return false;

            return true;
        });

        console.log('📊 After type filter:', filtered.length);

        // Filter by category
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(item => item.category === this.currentCategory);
            console.log('📊 After category filter:', filtered.length);
        }

        this.filteredData = filtered;
        console.log('✅ filteredData set to:', this.filteredData.length);

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

        console.log('🎨 renderContent called with', data.length, 'items');

        if (data.length === 0) {
            $('#mainContent').html(`
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                    <div style="color: #999; font-size: 16px;">No results found</div>
                </div>
            `);
            console.log('❌ No data to render');
            return;
        }

        // Group TV shows by series (extratitle) and films separately
        const grouped = {};
        const standaloneFilms = [];

        data.forEach(item => {
            const isTV = item.tv === 1 || item.animated === 1;

            console.log(`📺 Item: "${item.title}" | isTV:${isTV} | tv:${item.tv} | animated:${item.animated} | extratitle:"${item.extratitle}"`);

            // Group by extratitle if it exists (works for both TV and documentaries)
            if (item.extratitle && item.extratitle.trim()) {
                const seriesKey = item.extratitle;
                console.log(`  ↳ GROUPING into series: "${seriesKey}"`);
                if (!grouped[seriesKey]) {
                    grouped[seriesKey] = {
                        series: item.extratitle,
                        category: item.category,
                        episodes: []
                    };
                }
                grouped[seriesKey].episodes.push(item);
            } else {
                // Standalone films/TV without extratitle
                console.log(`  ↳ ADDING as STANDALONE (no extratitle)`);
                standaloneFilms.push(item);
            }
        });

        // Render cards
        let html = '';
        const start = (this.currentPage - 1) * this.BATCH_SIZE;
        const end = start + this.BATCH_SIZE;

        // Combine grouped series and standalone films for pagination
        const allItems = [];
        Object.values(grouped).forEach(seriesGroup => {
            allItems.push(seriesGroup);
        });
        standaloneFilms.forEach(film => {
            allItems.push(film);
        });

        console.log('📦 Grouped:', Object.keys(grouped).length, 'series');
        console.log('🎬 Standalone items:', standaloneFilms.length);
        console.log('📊 Total allItems:', allItems.length);

        const batch = allItems.slice(start, end);

        console.log('📄 Rendering batch of', batch.length, 'items');

        batch.forEach(item => {
            if (item.episodes) {
                // This is a series group
                html += this.createSeriesGroup(item);
            } else {
                // This is a standalone film or TV episode
                html += this.createCard(item);
            }
        });

        $('#mainContent').html(html);
        console.log('✅ HTML inserted into mainContent');

        // Update footer with pagination info
        const totalPages = Math.ceil(allItems.length / this.BATCH_SIZE);
        let footerText = `Showing ${start + 1}–${Math.min(end, allItems.length)} of ${allItems.length}`;

        if (totalPages > 1) {
            footerText += ` (Page ${this.currentPage}/${totalPages})`;
        }

        footerText += ' • Powered by <a href="https://github.com/Tornevall/mcu-timeline-api" target="_blank">mcu-timeline-api</a>';
        $('#footer').html(footerText);
    },

    createSeriesGroup(seriesGroup) {
        const phaseClass = seriesGroup.category ? `phase-${seriesGroup.category.toLowerCase().replace(/\s+/g, '-')}` : 'non-phase';

        const episodesHtml = seriesGroup.episodes
            .sort((a, b) => {
                const aNum = parseInt(a.season) * 1000 + parseInt(a.episode);
                const bNum = parseInt(b.season) * 1000 + parseInt(b.episode);
                return aNum - bNum;
            })
            .map(ep => `
                <div style="padding: 8px 12px; border-left: 3px solid #ccc; margin: 5px 0; background: #f9f9f9;">
                    <div style="font-size: 13px; color: #666;">
                        <strong>S${String(ep.season).padStart(2, '0')}E${String(ep.episode).padStart(2, '0')}</strong> - ${this.escapeHtml(ep.title || 'Untitled')}
                        ${ep.premiere && ep.premiere !== '0000-00-00' ? `<span style="color: #999;"> (${new Date(ep.premiere).toLocaleDateString()})</span>` : ''}
                    </div>
                </div>
            `).join('');

        return `
            <div class="mcu-card" style="grid-column: 1/-1;">
                <div class="card-header ${phaseClass}">
                    <div class="card-title" style="cursor: pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.style.opacity = this.style.opacity === '0.7' ? '1' : '0.7';">
                        📺 ${this.escapeHtml(seriesGroup.series)}
                    </div>
                </div>
                <div class="card-body" style="background: #fafafa;">
                    ${episodesHtml}
                </div>
                <div class="card-footer">${this.escapeHtml(seriesGroup.category || 'Uncategorized')} • ${seriesGroup.episodes.length} episodes</div>
            </div>
        `;
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

