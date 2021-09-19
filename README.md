# Marvel MCU Timeline API

If you want to take a look of a project that works with AJAX processing against the API you can take a look at
https://snapshot.earth616.org/ that is live and running on this codebase.

This is a project that has a long history with a lot of manual handling - the first version was handled in a confluence
documentation (https://mcu.earth616.org/pages/viewpage.action?pageId=54132764) and is still partially maintained.

Time passed and the list of available films and tv-series in the Marvel Cinematic Universe (that some people rather call
Marvel Cinematic Multiverse as of today) has been harder to maintain and still make it look good. Also, the overview in
the current maintained list gets harder and harder to update as there are a lot of content to edit.

And that's how the idea started. When a new API was planned, the entire list was transferred into a database and an Open
API was created (https://mcu.earth616.org/pages/viewpage.action?pageId=82018337). From this API, everything that has to
do with the current film and tv-series is available. The base idea of this system was to keep track of when all events
takes place, since that makes it possible to view everything either in order by the premiere dates, or in order in which
the movies takes place in the MCU.

The plans was initially to make this a react application that handled stuff automatically. But since I (still) hate
react even after trying that way, this solution was created instead; with jquery and bootstrap. Since the API is wide
open, everyone can take inspiration from this project and create their own search engine or whatever comes to mind.

For this specific project, if any ideas comes to your mind, the suggestion is to join and/or contact me so that can be added either into the API or this project.
