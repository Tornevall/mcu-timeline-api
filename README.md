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
- Category sidebar with episode counts
- Include TV Shows / Include Films toggles
- Search box with real-time filtering
- Batch pagination (50 items per load, expandable)
- Status badge showing data cache state

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
- **Grouping Algorithm**: Intelligently groups content by series for cleaner UI
- **Caching**: Stores fetched data to minimize API calls
- **Event Handlers**: Manages checkbox changes and search input events

### Database Fields Utilized
- `extratitle`: Primary grouping key (for series identification)
- `title`: Display name
- `tv`: Boolean flag (1 = TV series, 0 = film)
- `animated`: Boolean flag (1 = animated, 0 = live-action)
- `season`/`episode`: TV series metadata
- `imdb`/`imdbepisode`: IMDB links
- `premiere`: Release date
- `cid`: Category ID (phase/collection)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and updates.

## Project History

This project has evolved from manual maintenance on Confluence documentation (https://mcu.earth616.org/) to a fully automated, database-driven timeline system.

Originally maintained as a static list, the MCU timeline became too complex to manage manually. A dedicated MCU database was created, paired with an Open API (https://mcu.earth616.org/pages/viewpage.action?pageId=82018337), enabling dynamic content rendering.

Early iterations explored React implementations, but the current jQuery/Bootstrap solution provides better performance and maintainability for this use case. The flexible, open API allows anyone to build their own MCU browsing experiences.
