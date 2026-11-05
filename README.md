# FAMOUS — Your life, in public

FAMOUS is an offline-first, choice-driven social-life game. Pick one of 200 story worlds (60 existing openings plus 140 additional distinct premises), make a character, post to a fictional social feed, meet the cast, and decide what kind of attention you want. Your choices change fame, aura, wealth, trust, stress, relationships, and the next chapter.

## Run on the web

For a quick local preview, open `index.html` in a browser. For a production bundle, use Node 22 or newer:

```sh
npm install
npm run build
```

The generated static site is in `dist/`. Deploy the `Famous` folder to Vercel or Netlify. The included configuration runs `npm run build` and publishes `dist/`. No API key or server is needed for the playable core.

## Installable web app and mobile apps

The included web manifest and service worker make the site installable as a PWA when served over HTTPS. For an Android app, install Android Studio and the Android SDK, then:

```sh
npm install
npx cap add android
npm run cap:sync
npm run cap:open
```

For iOS, run `npm run cap:open:ios`, select your iPhone or simulator in Xcode, then press Run. The first build on a physical iPhone may require Developer Mode and a development team. In Android Studio, run the app on a device or emulator. To produce an installable APK, use **Build → Build Bundle(s) / APK(s) → Build APK(s)**. For distribution, create a signed release in **Build → Generate Signed Bundle / APK**. Capacitor 8's setup requires Node 22+ and Android Studio; see [Capacitor's setup guide](https://capacitorjs.com/docs/getting-started/environment-setup).

## Saves, privacy, and AI

- The whole playable loop uses local deterministic rules and a small random-response layer. Cast members sometimes reply and sometimes stay quiet.
- NPC portraits and story covers are deterministic original SVG art generated locally. Feed photos use curated Unsplash CDN stock photographs and need an internet connection; Explore search uses public catalogs with their own availability and rate limits. NPC content is generated from reusable story/personality rules rather than 100,000 hand-written biographies.
- Your own posts, stories, reels, and board notes accept one photo (up to 8 MB) or video (up to 20 MB). Upload previews work before publishing; files are stored in the browser's IndexedDB on this device and are not sent to the image provider.
- Your posts receive an in-game character comment, with a chance of another follow-up. You can reply to comments and nested replies; fictional cast members may answer back. Likes, comments, and replies adjust fame, aura, and trust.
- The 100,000-character roster, profiles, feed, private messages, and events are a fictional game simulation. Accounts and saves stay on this device; they are not real people or an online community.
- Practice Live can show a local front-camera preview. It does not transmit video to NPCs or real viewers.
- Game data is stored in this browser's local storage. The profile's Settings panel exports/restores a JSON save and can reset the run.
- Uploaded image/video blobs remain in this browser's IndexedDB; the JSON save export does not bundle those files. If you clear browser data or move the save to another device, re-upload your media.
- There is no Gemini/API integration in this version, so no daily API quota, shared secret, or external account is needed. A hosted language model could be added later as an optional server-side dialogue enhancement, with offline reactions kept as fallback.
- Vercel and Netlify host the static web build. Android APK generation/signing happens locally in Android Studio; deploying to Vercel does not generate the APK.

## Project boundaries

FAMOUS uses its own brand and original fictional worlds. The stories do not reproduce Marvel, DC, Harry Potter, Instagram, or any other existing franchise or platform identity. Social conventions are familiar, but the layout, name, art direction, and characters are original.

This is a single-device portfolio game, not a multiplayer social network. It has no real accounts, cloud saves, moderation service, or live users. Local saves can be lost if browser storage is cleared; export a backup from Settings.

Stock photos are from [Unsplash](https://unsplash.com/license); their license permits reuse under its stated terms. The photos are served from Unsplash's image CDN, so fictional NPC photos are not available without a network connection.
