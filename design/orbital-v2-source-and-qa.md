# OppMatcher Orbital Command 2.0: photo provenance and design boundaries
Date: 16 November 2026

The Orbital Command 2.0 code and orbital/globe animations are original implementations inspired by general 3D web-design patterns. No paid ThreeUI/PRO source, media or brand assets have been copied.

## Source and licence
Photos in the seven-image homepage gallery and supporting category and blog banners are loaded via Unsplash's public CDN (`images.unsplash.com`). Unsplash standard licence permits free use, including commercial use: https://unsplash.com/license . It does not remove photographer copyright, and model/property/trademark rights may still apply. Do not call these images public-domain or guaranteed rights-cleared for all contexts.

## Source photos
- https://images.unsplash.com/photo-1522202176988-66273c2fd55f — group study / scholarships
- https://images.unsplash.com/photo-1531482615713-2afd69097998 — workshop / internships
- https://images.unsplash.com/photo-1523240795612-9a054b0db644 — students collaborating / fellowships
- https://images.unsplash.com/photo-1517486808906-6ca8b3f04846 — learning group / exchanges
- https://images.unsplash.com/photo-1523580494863-6f3031224c94 — lecture / research
- https://images.unsplash.com/photo-1522071820081-009f0129c71c — team / career pathways
- https://images.unsplash.com/photo-1543269865-cbf427effbad — group / guides

These are illustrative lifestyle photographs, not documentation of an award, a verified open vacancy, attendance at a provider programme, or endorsement by any pictured institution/person. Always link to the official provider for evidence. Before a final production release, confirm each CDN URL loads and that the image subject, licensing, and crop are appropriate.

## Scope and safety
- No changes to application authentication, data schema, eligibility logic, deadlines, monitoring or background workflows.
- Theme mode remains controlled by existing `app-v94-theme-system.js` and its `oppThemeModeV1` setting. New CSS only reads the resolved `data-om-theme`.
- Source-provider details are in document flow, not layered above neighbouring text.
- Gallery honors pause, focus, document visibility, reduced motion and manual keyboard navigation.
- Globe is an approximate visual illustration and explicitly not a geographic promise of live opportunities.
- Keep rich imagery off sensitive forms and critical editing surfaces.
- Test minimum viewport widths 320, 375, 768, 1024, 1440, themes Auto/Light/Dark, auth, saved/tracker and source popups before merging.

## Future photo sourcing
Prefer institution and provider imagery where specifically licensed, or vetted free-to-use editorial imagery from Unsplash, Pexels or Wikimedia Commons with per-file licence and attribution requirements recorded. Avoid stock imagery that falsely implies a programme has a current opening.
