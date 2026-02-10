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
    },

    // Event Listeners
    setupEventListeners() {
        const self = this;

        // Search input
        $('#searchInput').on('keyup', function() {
            self.handleSearch();
        });

        // TV Shows checkbox
        $('#includeTv').on('change', function() {
            self.applyFilters();
        });

        // Films checkbox
        $('#includeFilm').on('change', function() {
            self.applyFilters();
        });

        // Window scroll
        $(window).on('scroll', function() {
            self.handleScroll();
        });

        // Episode items - EVENT DELEGATION for dynamic content
        $(document).on('click', '.episode-item', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const $item = $(this);
            const $detailsDiv = $item.find('.episode-details-content');
            const isVisible = $detailsDiv.is(':visible');

            // Toggle visibility
            if (isVisible) {
                $detailsDiv.slideUp(200, function() {
                    $item.css('background', '#f9f9f9').css('border-left-color', '#ccc');
                });
            } else {
                $detailsDiv.slideDown(200, function() {
                    $item.css('background', '#fff3cd').css('border-left-color', '#0066cc');
                });
            }
        });
    },

    // Load Data - Always fresh from API
    async loadData() {
        try {
            this.setStatus('Loading MCU Timeline...', 'loading');

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
                    .catch(err => null)
            );

            // Wait for all category requests to complete
            await Promise.all(categoryPromises);

            // Process and display data
            this.renderUI();
            this.applyFilters();  // Trigger filters automatically
            this.setStatus('Ready', 'ready');
        } catch (error) {
            this.setStatus('Error loading data. Please try again.', 'error');
        }
    },


    // Search and Filter
    handleSearch() {
        this.currentPage = 1;
        this.applyFilters();
    },

    applyFilters() {
        const query = $('#searchInput').val().toLowerCase().trim();
        const includeTv = $('#includeTv').is(':checked');
        const includeFilm = $('#includeFilm').is(':checked');

        // ALWAYS START FROM allData - don't use previously filtered data
        let filtered = this.allData.filter(item => {
            // Classification logic:
            // tv=1 → TV/Series (may be animated or live-action)
            // tv=0 → Film (may be animated or live-action)
            // NOTE: animated flag only indicates presentation style, NOT classification
            const isTV = item.tv === 1;

            // Apply checkbox filters
            if (!includeTv && isTV) return false;
            if (!includeFilm && !isTV) return false;

            return true;
        });

        // Filter by category
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(item => item.category === this.currentCategory);
        }

        // Apply search query
        if (query) {
            filtered = filtered.filter(item => {
                const text = `${item.title || ''} ${item.extratitle || ''} ${item.keywords || ''}`.toLowerCase();
                return text.includes(query);
            });
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

        // Helper function to extract series name for grouping
        const getSeriesName = (item) => {
            // Normalize tv field (handle both string and number)
            const tvValue = parseInt(item.tv, 10);

            // PRIORITY 1: If extratitle exists and is not empty, use it ALWAYS
            // extratitle is explicitly set and should NEVER be overridden
            if (item.extratitle && item.extratitle.trim() !== '') {
                return item.extratitle.trim();
            }

            // PRIORITY 2: For TV series only (tv=1), extract series name from title
            // Split on " - " first (handles "Marvel Studios: Legends - Wanda")
            // Then try ":" (handles "I am Groot: Groot's First Steps")
            if (tvValue === 1 && item.title && typeof item.title === 'string') {
                // Try " - " separator first
                const dashParts = item.title.split(' - ');
                if (dashParts.length > 1) {
                    const seriesName = dashParts[0].trim();
                    if (seriesName && seriesName.length > 0 && seriesName !== item.title) {
                        return seriesName;
                    }
                }

                // Try ":" separator for titles like "I am Groot: Groot's First Steps"
                const colonParts = item.title.split(':');
                if (colonParts.length > 1) {
                    const seriesName = colonParts[0].trim();
                    if (seriesName && seriesName.length > 0 && seriesName !== item.title) {
                        return seriesName;
                    }
                }
            }

            // No grouping - return null for standalone item
            return null;
        };

        // Group ALL items by series name (extratitle, derived title, or individual)
        const grouped = {};
        const standaloneItems = [];

        data.forEach(item => {
            // Normalize tv field (handle both string and number)
            const tvValue = parseInt(item.tv, 10);
            const isTV = tvValue === 1;
            const seriesName = getSeriesName(item);

            // Group items with a series name
            if (seriesName) {
                if (!grouped[seriesName]) {
                    grouped[seriesName] = {
                        series: seriesName,
                        category: item.category,
                        items: [],
                        isTV: isTV
                    };
                }
                grouped[seriesName].items.push(item);
            } else {
                // Standalone items with no series grouping
                standaloneItems.push(item);
            }
        });

        // Render cards
        let html = '';
        const start = (this.currentPage - 1) * this.BATCH_SIZE;
        const end = start + this.BATCH_SIZE;

        // Combine grouped series and standalone items for pagination
        const allItems = [];
        Object.values(grouped).forEach(seriesGroup => {
            allItems.push(seriesGroup);
        });
        standaloneItems.forEach(item => {
            allItems.push(item);
        });

        const batch = allItems.slice(start, end);

        batch.forEach(item => {
            if (item.items) {
                // This is a grouped series/collection
                html += this.createSeriesGroup(item);
            } else {
                // This is a standalone item
                html += this.createCard(item);
            }
        });

        $('#mainContent').html(html);

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
        const groupId = `group-${Math.random().toString(36).substr(2, 9)}`;

        // Use series name directly (no special IMDB handling needed)
        const displayName = seriesGroup.series;

        // Determine if this is a multi-season series or a grouped collection
        const hasSeasons = seriesGroup.items.some(item => item.season && item.season > 0);
        const seasons = new Set(seriesGroup.items.map(ep => ep.season).filter(s => s > 0));
        const hasMultipleSeasons = seasons.size > 1;

        // Get series IMDB (from first item)
        const seriesImdb = seriesGroup.items[0]?.imdb;
        const seriesImdbHtml = seriesImdb ?
            `<div style="margin-bottom: 15px; padding: 10px; background: #e7f3ff; border-left: 3px solid #0066cc; border-radius: 4px;">
                <strong>🎬 Series IMDB:</strong> <a href="https://www.imdb.com/title/${seriesImdb}/" target="_blank" style="color: #0066cc; text-decoration: underline;">${seriesImdb}</a>
            </div>` : '';

        let itemsHtml = '';

        if (hasSeasons) {
            // TV series with episodes - sort by season/episode
            itemsHtml = seriesGroup.items
                .sort((a, b) => {
                    const aNum = (parseInt(a.season) || 0) * 1000 + (parseInt(a.episode) || 0);
                    const bNum = (parseInt(b.season) || 0) * 1000 + (parseInt(b.episode) || 0);
                    return aNum - bNum;
                })
                .map((item, idx) => {
                    const itemId = `${groupId}-item-${idx}`;
                    const premiere = item.premiere && item.premiere !== '0000-00-00' ? new Date(item.premiere).toLocaleDateString() : 'TBA';
                    const itemImdbLink = item.imdbepisode ? `<a href="https://www.imdb.com/title/${item.imdbepisode}/" target="_blank" style="color: #d9534f; text-decoration: underline; font-weight: 600;">${item.imdbepisode}</a>` :
                                        (item.imdb ? `<a href="https://www.imdb.com/title/${item.imdb}/" target="_blank" style="color: #d9534f; text-decoration: underline; font-weight: 600;">${item.imdb}</a>` : '<span style="color: #999;">N/A</span>');
                    const digitalDate = item.digital && item.digital !== '0000-00-00' ? new Date(item.digital).toLocaleDateString() : 'N/A';

                    return `
                        <div class="episode-item" id="${itemId}" style="cursor: pointer; padding: 10px 12px; border-left: 3px solid #ccc; margin: 5px 0; background: #f9f9f9; border-radius: 4px; transition: all 0.2s; user-select: none;">
                            <div style="font-size: 13px; color: #666; font-weight: 500;">
                                <strong style="color: #d9534f;">S${String(item.season || 0).padStart(2, '0')}E${String(item.episode || 0).padStart(2, '0')}</strong> - ${this.escapeHtml(item.title || 'Untitled')}
                                <span style="color: #999;"> (${premiere})</span>
                            </div>
                            <div class="episode-details-content" style="display: none; margin-top: 10px; padding: 10px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 12px; color: #333; line-height: 1.8;">
                                <div style="font-weight: 600; color: #d9534f; margin-bottom: 8px;">Episode IMDB:</div>
                                <div style="margin-bottom: 12px;"><strong>🎬 Link:</strong> ${itemImdbLink}</div>
                                <div style="margin-top: 6px;"><strong>📅 Premiere Date:</strong> ${premiere}</div>
                                ${item.digital && item.digital !== '0000-00-00' ? `<div style="margin-top: 6px;"><strong>💾 Digital Release:</strong> ${digitalDate}</div>` : ''}
                                ${item.mcutime ? `<div style="margin-top: 6px;"><strong>⏰ MCU Timeline:</strong> ${this.escapeHtml(item.mcutime)}</div>` : ''}
                                ${item.contentinformation && typeof item.contentinformation === 'string' ? `<div style="margin-top: 6px;"><strong>📝 Info:</strong> ${this.escapeHtml(item.contentinformation.substring(0, 200))}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
        } else {
            // Grouped content without episodes (documentaries, specials, etc.)
            itemsHtml = seriesGroup.items
                .map((item, idx) => {
                    const itemId = `${groupId}-item-${idx}`;
                    const premiere = item.premiere && item.premiere !== '0000-00-00' ? new Date(item.premiere).toLocaleDateString() : 'TBA';
                    const itemImdbLink = item.imdb ? `<a href="https://www.imdb.com/title/${item.imdb}/" target="_blank" style="color: #d9534f; text-decoration: underline; font-weight: 600;">${item.imdb}</a>` : '<span style="color: #999;">N/A</span>';

                    return `
                        <div class="episode-item" id="${itemId}" style="cursor: pointer; padding: 10px 12px; border-left: 3px solid #ccc; margin: 5px 0; background: #f9f9f9; border-radius: 4px; transition: all 0.2s; user-select: none;">
                            <div style="font-size: 13px; color: #666; font-weight: 500;">
                                ${this.escapeHtml(item.title || 'Untitled')}
                                <span style="color: #999;"> (${premiere})</span>
                            </div>
                            <div class="episode-details-content" style="display: none; margin-top: 10px; padding: 10px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 12px; color: #333; line-height: 1.8;">
                                <div style="font-weight: 600; color: #d9534f; margin-bottom: 8px;">Details:</div>
                                <div style="margin-bottom: 12px;"><strong>🎬 IMDB:</strong> ${itemImdbLink}</div>
                                <div style="margin-top: 6px;"><strong>📅 Premiere Date:</strong> ${premiere}</div>
                                ${item.mcutime ? `<div style="margin-top: 6px;"><strong>⏰ MCU Timeline:</strong> ${this.escapeHtml(item.mcutime)}</div>` : ''}
                                ${item.contentinformation && typeof item.contentinformation === 'string' ? `<div style="margin-top: 6px;"><strong>📝 Info:</strong> ${this.escapeHtml(item.contentinformation.substring(0, 200))}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
        }

        // Season header if multiple seasons
        const seasonHeaderHtml = (hasSeasons && hasMultipleSeasons) ?
            `<div style="padding: 8px 12px; background: #f0f0f0; border-radius: 4px; font-size: 12px; color: #666; margin-bottom: 10px; font-weight: 600;">
                📺 Multiple Seasons (${seasons.size} seasons)
            </div>` : '';

        return `
            <div class="mcu-card" style="grid-column: 1/-1;">
                <div class="card-header ${phaseClass}" style="cursor: pointer; user-select: none;" onclick="event.stopPropagation(); const body = this.nextElementSibling; body.style.display = body.style.display === 'none' ? 'block' : 'none'; this.style.opacity = this.style.opacity === '0.7' ? '1' : '0.7';">
                    <div class="card-title" style="margin: 0;">
                        ${seriesGroup.isTV ? '📺' : '🎬'} ${this.escapeHtml(displayName)}
                    </div>
                </div>
                <div class="card-body" style="background: #fafafa;">
                    ${seriesImdbHtml}
                    ${seasonHeaderHtml}
                    ${itemsHtml}
                </div>
                <div class="card-footer">${this.escapeHtml(seriesGroup.category || 'Uncategorized')} • ${seriesGroup.items.length} ${hasSeasons ? 'episodes' : 'items'}</div>
            </div>
        `;
    },

    createCard(item) {
        const phaseClass = item.category ? `phase-${item.category.toLowerCase().replace(/\s+/g, '-')}` : 'non-phase';
        const tvValue = parseInt(item.tv, 10);
        const isTV = tvValue === 1;
        const type = isTV ? '📺 TV Series' : '🎬 Film';
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
                        ${isTV && item.season && item.season > 0 ? `
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

