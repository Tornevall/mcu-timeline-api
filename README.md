# Marvel MCU Timeline API

## Package content

This project provides an interactive web interface using jQuery and Bootstrap to browse the Marvel Cinematic Universe timeline. It renders data from the MCU timeline database, organized by phases and featuring comprehensive metadata including IMDB links, episode information, and premiere dates.

## Features

### Dynamic Content Rendering
- **Category Filtering**: Browse content by MCU phases, collections, and special categories
- **TV/Film Toggle**: Easily filter between TV series and films
- **Live Search**: Real-time search by title, actor, or keywords
- **Responsive Grouping**: Automatically groups episodes/specials by series (via `extratitle` or title parsing)
- **Infinite Scroll**: Batch-loads content for performance optimization

### Content Display
- **Series Cards**: Expandable cards showing series information with IMDB links
- **Episode Listings**: Detailed episode listings with season/episode numbers and premiere dates
- **Type Indicators**: Clear visual distinction between films, TV series, documentaries, and animated content
- **Metadata**: Release dates, IMDB links for both series and episodes, phase information

### User Interface
- **Category Sidebar**: Displays MCU phases and collections with episode counts
- **Include TV Shows / Include Films**: Toggles that auto-reload content when changed
- **Search Box**: Real-time filtering by title, actor, or keywords
- **Batch Pagination**: 50 items loaded per request with infinite scroll support
- **Status Badge**: Shows "READY" when data is loaded
- **Episode Expansion**: Click episodes to expand and view full metadata
- **Series Grouping**: Automatically groups related episodes under their series name
- **IMDB Integration**: Direct links to series and individual episode IMDB pages

## How it works

This html-ajax project communicates with the MCU database via JavaScript API calls:

### Data Flow

1. **Category Load**: Fetches all MCU phases and collections
2. **Content Fetch**: For each category, retrieves all timeline entries
3. **Grouping Logic**: 
   - Groups by `extratitle` (primary key for series grouping)
   - Falls back to extracting series name from title (text before `:` for TV entries)
   - Standalone items without grouping displayed as individual cards
4. **Filtering**: Applies TV/Film/Search filters in real-time
5. **Rendering**: Renders UI elements with IMDB metadata links

## Technical Implementation

### JavaScript Architecture
- **MCUClient Object**: Main controller managing data, filtering, and rendering
- **Grouping Algorithm**: 
  - Primary: Groups by `extratitle` (series identification)
  - Fallback: Extracts series name from title (text before `:` for TV entries with tv=1)
  - Standalone: Individual cards for items without series grouping
- **No Client Caching**: All data is fetched fresh from the API on page load
- **Event Handlers**: Manages checkbox changes, search input, and episode expansion
- **Live Rendering**: Updates UI in real-time as filters change

### Database Fields Utilized
- `extratitle`: Primary grouping key (for series identification)
- `title`: Display name
- `tv`: Boolean flag (1 = TV series, 0 = film)
- `animated`: Boolean flag (1 = animated, 0 = live-action)
- `season`/`episode`: TV series metadata
- `imdb`/`imdbepisode`: IMDB links
- `premiere`: Release date
- `cid`: Category ID (phase/collection)

## API Endpoint

The application fetches data from the MCU Timeline API:
- **Base URL**: https://tools.tornevall.com/mcu-api/ (PHP API)
- **Batch Loading**: 50 items per request with pagination
- **Real-time Updates**: No caching - all data is fresh from database on each load
- **Query Parameters**: 
  - `?cid=` - Filter by category ID (MCU phase)
  - `?find=` - Search by title/actor/keywords

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history, bug fixes, and improvements.

### Latest Version: 2.0.0
- Complete rewrite of grouping system
- Removed all client-side caching for live data
- Fixed critical "I am Groot" series merging bug
- Improved checkbox filtering with auto-reload
- Better IMDB link display and organization

## Project History

This project has evolved from manual maintenance on Confluence documentation (https://mcu.earth616.org/) to a fully automated, database-driven timeline system.

Originally maintained as a static list, the MCU timeline became too complex to manage manually. A dedicated MCU database was created, paired with an Open API (https://mcu.earth616.org/pages/viewpage.action?pageId=82018337), enabling dynamic content rendering.

Early iterations explored React implementations, but the current jQuery/Bootstrap solution provides better performance and maintainability for this use case. The flexible, open API allows anyone to build their own MCU browsing experiences.

## Development

Contributions and improvements are welcome. Please refer to the Git commit history in [CHANGELOG.md](CHANGELOG.md) for detailed information about each feature and fix.

