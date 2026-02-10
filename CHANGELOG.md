# Changelog

All notable changes to the Marvel MCU Timeline API project are documented here.

## [2.0.0] - 2026-02-10

### Major Changes
- Complete rewrite of grouping system to eliminate IMDB-based merging bug
- Removed LocalStorage caching for real-time live data
- Improved episode expansion and display logic
- Better filtering and search functionality

### Added
- Complete grouping system by extratitle/series name
- Episode expandable cards with full metadata display
- Category-based filtering with dynamic episode counts
- Batch-loading (50 items per page) with pagination support
- Real-time search functionality (searches title, actor, or keywords)
- Include TV Shows / Include Films checkbox filters (with auto-reload on change)
- Support for grouping documentaries and specials by series name
- IMDB links display:
  - Series IMDB link under series header (from item.imdb)
  - Individual episode IMDB links (from item.imdbepisode)
- Responsive category sidebar with dynamic episode counts
- Status badge showing data loading state
- Infinite scroll pagination support with 50-item batch loading
- Series episode grouping with collapsible containers

### Fixed
- **CRITICAL**: Fixed "I am Groot" bug where episodes from different series were being merged under wrong series cards
- Removed faulty IMDB-based grouping that caused cross-series episode mixing
- Episode expandable cards now display correct and complete metadata when expanded
- Search functionality now works in real-time on all filtered content
- Include TV Shows/Films checkboxes now properly reload and re-filter data
- Removed debug console logging that was cluttering browser console
- Better error handling with fallback messaging

### Changed
- Removed all LocalStorage caching for immediate live updates
- Removed auto-refresh mechanism (data always fetched fresh on load)
- Simplified grouping logic to rely only on extratitle and title-based parsing
- Improved performance by eliminating cache invalidation issues
- Enhanced UI responsiveness for real-time data updates
- Better memory management by removing stale cache data

### Technical Details
- Single batch API call instead of multiple requests
- Lazy rendering with efficient data handling
- Event delegation for dynamically created episode items
- Proper cleanup of series groups vs standalone items
- Grouping priority: extratitle → title-based parsing (for TV series with tv=1) → standalone films
- No client-side caching - all data fresh from API on every load
- Improved error recovery without degrading to stale cache data

### Removed
- LocalStorage caching mechanism (CACHE_KEY, CACHE_EXPIRY config)
- getFromCache() function
- saveToCache() function
- startAutoRefresh() function
- 5-minute update check mechanism

## [1.0.0] - 2026-02-10

### Initial Release
- Basic MCU Timeline display with category filtering
- jQuery/Bootstrap UI framework
- AJAX API communication
- Series and film categorization
- Basic episode listing

