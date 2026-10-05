# Media viewer development

- Keep this a frontend component library. No accounts, uploads, backend adapters, provider IDs, API credentials or deployment bindings.
- Vendor playback comes from Plyr and hls.js. Bundle their resources locally; no CDN, analytics or persistent storage by default.
- Load only the selected gallery attachment. Fetch video manifests and segments only after explicit play, stop requests on pause, dispose listeners and playback on navigation.
- Image sources are supplied by the integrating app using optimized srcset/sizes. Request originals only when the visitor opens the full-screen lightbox or explicitly saves them. The close and save controls belong in the lightbox toolbar, outside the picture. All pictures follow the caller's consent and CSP without provider categories.
- Support touch, focused keyboard control, visible loading/error states, English and both Chinese locales. Preserve native reduced-motion behavior without weakening ordinary feedback.
- Verify controls are clickable at 320 px and desktop sizes, including menus and fullscreen. Keep mobile progress on its own row.
- Tests are local browser fixtures, never production uploads. Keep unrelated workspace changes intact.
