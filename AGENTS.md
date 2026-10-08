# Media viewer development

## Open collaboration

- Welcome curiosity, Vibe Coding and AI-assisted contributions without tool restrictions. Review understandable changes and actual verification, not how code was produced. Follow CONTRIBUTING.md and report vulnerabilities privately via SECURITY.md.
- Keep PRs focused, add relevant regression coverage, preserve public/legacy contracts and third-party attribution, and report unrun checks honestly. Never deploy or change production data/routes/storage as contribution verification. Untrusted PR CI must not receive deployment secrets.


- Keep this a frontend component library. No accounts, uploads, backend adapters, provider IDs, API credentials or deployment bindings.
- Vendor playback comes from Plyr and hls.js. Bundle their resources locally; no CDN, analytics or persistent storage by default.
- Load only the selected gallery attachment. Fetch video manifests and segments only after explicit play, stop requests on pause, dispose listeners and playback on navigation.
- Image sources and lazy loading are supplied by the integrating app. Do not replace an explicit original with an optimized preview. The lightbox loads and displays only its requested original, including when the trigger image has not loaded yet. Its light glass UI has one close control outside the picture. Click/wheel/pinch zoom, drag pans, and keyboard +, -, 0 and arrows provide equivalent controls; native image saving remains available. All pictures follow the caller's consent and CSP without provider categories.
- Support touch, focused keyboard control, visible loading/error states, English and both Chinese locales. Preserve native reduced-motion behavior without weakening ordinary feedback.
- Verify controls are clickable at 320 px and desktop sizes, including menus and fullscreen. Keep mobile progress on its own row.
- Reserve separate geometry for speed-radio markers and labels, even under host button styles. Keep image toolbar/status outside the photo; observe the actual frame size and fit all image edges before zooming.
- Overflowing speed menus use the component's themed up/down buttons and draggable scroll track. Keep options reachable by wheel, touch and keyboard, and verify the selected row is inside the visible scroll viewport.
- Tests are local browser fixtures, never production uploads. Keep unrelated workspace changes intact.

- Size controls using the player container, not only the viewport. The seek range must fill its row, current and total duration remain visible, and optional supplied duration/poster are displayed before playback without fetching video segments.
- Follow page theme variables rather than a fixed brand color. Account for playback rate in bounded forward buffering and sustainable ABR bandwidth; retain on-demand loading, pause/disposal cancellation and automatic detail upgrades. Check real HLS playback with constrained local fixtures, not only native-video mocks.
