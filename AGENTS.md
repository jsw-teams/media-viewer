# Media viewer development

- Keep this a frontend component library. No accounts, uploads, backend adapters, provider IDs, API credentials or deployment bindings.
- Vendor playback comes from Plyr and hls.js. Bundle their resources locally; no CDN, analytics or persistent storage by default.
- Load only the selected gallery attachment. Fetch video manifests and segments only after explicit play, stop requests on pause, dispose listeners and playback on navigation.
- Image sources and lazy loading are supplied by the integrating app. Do not replace an explicit original with an optimized preview. The lightbox loads and displays only its requested original, including when the trigger image has not loaded yet. The close and save controls belong in the lightbox toolbar, outside the picture. All pictures follow the caller's consent and CSP without provider categories.
- Support touch, focused keyboard control, visible loading/error states, English and both Chinese locales. Preserve native reduced-motion behavior without weakening ordinary feedback.
- Verify controls are clickable at 320 px and desktop sizes, including menus and fullscreen. Keep mobile progress on its own row.
- Tests are local browser fixtures, never production uploads. Keep unrelated workspace changes intact.

- Size controls using the player container, not only the viewport. The seek range must fill its row, current and total duration remain visible, and optional supplied duration/poster are displayed before playback without fetching video segments.
