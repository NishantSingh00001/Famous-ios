# FAMOUS feature and quality audit

Date: 2026-10-25  
Scope: requested story catalog, NPC generation, social simulation, local platform features, iOS wrapper, and current automated verification.

## Score standard

Each area is scored from 0 to 3: 0 = absent, 1 = UI/demo scaffold, 2 = works in the local game with clear limits, 3 = complete against the stated product requirement. The overall score is the mean, converted to 100. The acceptance gate is **80/100** with no core area below 2. The top mark is **95/100** with no open critical defects and device-level verification.

**Current score: 68/100 — below the 80-point acceptance gate.** This rates feature completeness, not a human usability study.

| Area | Score | Current evidence and gap |
|---|---:|---|
| Story catalog and onboarding | 2.5/3 | 200 total setups: 60 existing plus 140 distinct authored premises. The catalog test confirms unique titles, summaries, prologues for additions, and unique generated cover data. Covers are procedural SVG art, not 200 bespoke illustrated posters. Chapter writing and branching are not individually authored for all 200 worlds. |
| NPC scale and identity | 2.5/3 | 100,000 unique display names and descriptions are verified using the app’s actual name lists. Handles include unique serials; five generated trait axes cover 100,000 unique combinations. Portraits are original deterministic SVG illustrations, not AI or stock photographs. |
| NPC social accounts | 2/3 | NPC profiles generate story-linked posts, reels, reposts, and tagged moments; profile tabs filter those types. Content is composed from templates and character/story fields, not 100,000 individually written account histories. |
| Story feed and ongoing activity | 2/3 | A new story starts with 50 cast-authored seed posts. Local activity adds posts, reactions, comments, and messages while the game is active; catch-up after closing is deliberately capped, so it does not simulate uninterrupted real-time activity. |
| Relationships, replies, tasks, and DMs | 2.5/3 | Local follow/bond, comment/reply, story replies, messaging, and help-or-risk story tasks are wired and covered by logic/integration checks. This is a single-player simulation; no NPC is a real person or remote agent. |
| Search and Explore media | 1.5/3 | Story-local discovery and public media catalogs are connected, with Wikimedia fallback for image/video catalog failures. External results require internet and are subject to provider availability, licensing, and rate limits. The game does not bundle 50,000 images or videos. |
| Live and camera | 1.5/3 | The Live screen has a front-camera self-preview and camera permission text. It is explicitly local Practice Live: camera is not streamed, NPC viewers/comments are simulated, and there is no real broadcast service. |
| Local profiles and persistence | 2.5/3 | Multiple local player profiles, per-player saves, export/import, reset, and offline-first gameplay exist. These are convenience profiles stored on one device, with no cloud identity or cross-device sync. Old saves from the retired 1,060-world catalog are retained and moved to a same-category catalog entry when needed. |
| iOS fit, accessibility, and interaction | 1.5/3 | The app is Capacitor/WebView with iOS safe-area, theme-following, and zoom-conscious web controls. It is not a native SwiftUI social app. This turn did not include visual inspection on an iPhone; keyboard, VoiceOver, Dynamic Type, and camera permission flows still need device checks. |
| Security, load, and QA | 2.5/3 | Import sanitization, bounded input, HTTPS media URL handling, unit tests, integration wiring checks, and a 5,001-save data workload are covered. That workload is not 5,001 running clients. No external penetration test, live backend load test, or human review survey was performed. |

## Completed in this pass

- Replaced the 1,000-additional-story permutation target with 140 additional story premises, bringing the actual catalog to 200 total.
- Added unique generated cover data for all catalog entries. Cover art is generated on demand, so the 140 additions add text/code rather than a large raster image pack.
- Increased the real in-app name pools to support 100,000 unique display names and biographies, and added a regression test against those exact pools.
- Added a 100,000-value personality key generator and distinct per-NPC story-linked profile content for posts, reels, reposts, and tagged moments.
- Changed Live camera access to request front-facing video only, show a visible local preview, and remove the unused microphone control.
- Kept legacy save data readable and migrate retired-catalog stories while retaining the player profile, stats, and saved content.
- Built the browser bundle and synced it to Capacitor iOS and Android projects.
- Replaced the story picker’s CSS-only cover backgrounds with explicit local SVG `<img>` elements on the featured card, trending rail, and all-story tiles; gave pager controls explicit theme-aware contrast and 44 px hit areas.
- Changed Unsplash requests to JPEG and normalized saved Unsplash post URLs to JPEG, responding to AVIF/WebP decode errors found in the physical-device WebView console.

## Verification results

- `npm test`: **50 passed, 0 failed**. Tests include 200 catalog entries, covers, 100,000 names and biographies, 100,000 trait keys, story-local profile content, follower setup regression, import handling, pager/card image markup, JPEG URL handling, and event-route/package checks.
- `npm run cap:sync`: succeeded; iOS and Android web assets are current.
- `xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build`: **BUILD SUCCEEDED**.
- `dist/` is about 608 KB in this checkout; story cover SVGs are generated at runtime instead of stored as hundreds of large image files.
- Xcode ran the updated app on the connected physical iPhone; the Capacitor WebView reported `WebView loaded`. After the JPEG URL fix, the latest launch logs no longer showed the earlier image decode errors.
- A full visual/tap walkthrough was **not possible**: iPhone Mirroring reports the phone and Mac must use the same iCloud account, while the current Xcode `devicectl` device query timed out. So this confirms install/launch, not the picker’s appearance or interactive behavior on the phone.

## Remaining before the acceptance gate

1. Write and review genuinely distinct chapter arcs and consequences for each of the 200 story worlds; current world setups and NPC posts still use reusable systems.
2. Verify the redesigned picker, story/feed/profile screens, follower selection, keyboard zoom behavior, and safe areas visually on iPhone hardware or simulator; the latest picker image/pager fix has not been inspected on-device yet.
3. Test camera permission grant/deny and preview teardown on a device; build a real broadcast backend only if “Live” is intended to reach real viewers.
4. Run accessibility review for VoiceOver, Dynamic Type, contrast, focus order, and reduced motion.
5. Exercise actual UI flows and storage recovery beyond static route checks; perform a scoped security review of the client and media handling.
6. Review Explore’s external data providers, licensing presentation, retries, and rate-limit behavior on a real network.
7. Conduct human usability sessions before claiming users like the app or would recommend it.
