import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { uniqueNpcName, buildNpcBio, buildNpcPersonality } from '../game-core.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
test('production build contains every runtime module referenced by the app shell', async () => {
  const [html, app, core, css] = await Promise.all(['index.html', 'app.js', 'game-core.mjs', 'style.css'].map(name => readFile(join(dist, name), 'utf8')));
  assert.match(html, /<script src="app\.bundle\.js"><\/script>/);
  assert.match(app, /from ['"]\.\/game-core\.mjs['"]/);
  assert.match(core, /export function sanitizeSave/);
  assert.ok(css.length > 1000);
});

test('direct file launch uses a self-contained classic script so local browsers render the app', async () => {
  const [html, bundle] = await Promise.all([
    readFile(join(new URL('../', import.meta.url).pathname, 'index.html'), 'utf8'),
    readFile(join(dist, 'app.bundle.js'), 'utf8')
  ]);
  assert.match(html, /<script src="app\.bundle\.js"><\/script>/);
  assert.doesNotMatch(html, /<script type="module" src="app\.js"><\/script>/);
  assert.match(bundle, /window\.FamousCore=/);
  assert.match(bundle, /function buildStoryCatalog\(/);
  assert.match(bundle, /boot\(\);/);
});

test('story picker exposes the catalog size and local file launch skips the unsupported PWA manifest', async () => {
  const [html, app] = await Promise.all([
    readFile(join(new URL('../', import.meta.url).pathname, 'index.html'), 'utf8'),
    readFile(join(dist, 'app.js'), 'utf8')
  ]);
  assert.doesNotMatch(html, /<link rel="manifest"/);
  assert.match(html, /location\.protocol!=='file:'/);
  assert.match(app, /world-catalog-meta/);
  assert.match(app, /200 distinct worlds/);
});

test('application source and generated browser bundle both pass JavaScript syntax parsing', async () => {
  execFileSync(process.execPath, ['--check', join(new URL('../', import.meta.url).pathname, 'app.js')]);
  execFileSync(process.execPath, ['--check', join(dist, 'app.bundle.js')]);
});

test('production bundle rejects dangerous or oversized imported data at its entry point', async () => {
  const [app, core] = await Promise.all(['app.js', 'game-core.mjs'].map(name => readFile(join(dist, name), 'utf8')));
  assert.match(app, /file\.size>2\*1024\*1024/);
  assert.match(app, /sanitizeSave\(parsed,fresh\(\)\)/);
  assert.match(core, /export function normalizeAccounts/);
  assert.match(core, /export function persistJSON/);
  assert.match(app, /Progress could not be saved on this device/);
});

test('visible notification, conversation, and board-filter controls have event routes', async () => {
  const [app, css] = await Promise.all(['app.js', 'style.css'].map(name => readFile(join(dist, name), 'utf8')));
  assert.match(app, /data-notifications/);
  assert.match(app, /if\(d\.notifications\)\{showNotifications\(\);return\}/);
  assert.match(app, /aria-label="Notifications" title="Notifications" data-notifications/);
  assert.match(app, /Nothing new yet\. Story updates will show here as your cast reacts\./);
  assert.match(css, /\.picker-brand\s*\{[^}]*padding-right:\s*54px/);
  assert.match(css, /\.picker-alert\s*\{[^}]*position:\s*absolute;\s*right:\s*0;\s*top:\s*8px/);
  assert.match(app, /data-conversation-more/);
  assert.match(app, /if\(d\.conversationMore\)\{showConversationOptions\(\);return\}/);
  assert.match(app, /data-comment-sort/);
  assert.match(app, /if\(d\.commentSort\)\{commentSort=/);
  assert.match(app, /if\(d\.boardFilter\)\{boardFilter=d\.boardFilter;render\(\);return\}/);
});

test('media exploration falls back on 401 and NPC profile tabs have interactive routes', async () => {
  const [app, core, css] = await Promise.all(['app.js', 'game-core.mjs', 'style.css'].map(name => readFile(join(dist, name), 'utf8')));
  assert.match(core, /export async function fetchMediaResults/);
  assert.match(core, /if \(kind === 'video'\) return searchCommons\(\)/);
  assert.match(app, /fetchMediaResults\(fetch,query/);
  assert.match(app, /data-npc-profile-tab=/);
  assert.match(app, /addEventListener\('click',e=>\{const tab=e\.target\.closest\('\[data-npc-profile-tab\]'\)/);
  assert.match(css, /\.npc-profile-grid\{display:grid/);
});

test('For You story rail, feed NPC profiles, and story-task DMs are wired in the app bundle', async () => {
  const [app, css] = await Promise.all(['app.js', 'style.css'].map(name => readFile(join(dist, name), 'utf8')));
  assert.match(app, /class="feed-story-rail"/);
  assert.doesNotMatch(app, /feed-story-rail-head/);
  assert.match(css, /\.feed-story-rail/);
  assert.match(app, /storyCircle\('You',p\.initial,true\)/);
  assert.match(app, /story-add-badge/);
  assert.match(app, /class="story-ring \$\{you\?'you':''\} \$\{hasStory\?'has-story':'no-story'\}"/);
  assert.match(app, /class="world-cover-art" src="\$\{buildStoryCoverDataUrl\(s\)\}" alt="" aria-hidden="true"/);
  assert.match(css, /\.world-cover-art/);
  assert.match(css, /\.story-add-badge/);
  assert.match(app, /class="post-identity" data-npc-open="\$\{owner\.id\}"/);
  assert.match(app, /if\(d\.npcOpen\)\{showNPCProfile\(d\.npcOpen\);return\}/);
  assert.match(app, /buildNpcStoryTask\(contact,story/);
  assert.match(app, /data-task-choice="\$\{task\.id\}\|/);
  assert.match(app, /resolveNPCStoryTask\(taskId,choice\)/);
  assert.match(app, /Object\.defineProperty\(npc,'photo'/);
  assert.match(app, /uniqueNpcName\(n,npcFirst,npcLast,npcMiddle\)/);
  assert.match(app, /function ensureStoryNPCs\(storyId\)/);
  assert.match(app, /const NPC_ROSTER_SIZE=100000/);
});

test('story viewer supports tap navigation, swipe dismissal, pause, replies, and profile visits', async () => {
  const app = await readFile(join(dist, 'app.js'), 'utf8');
  const css = await readFile(join(dist, 'style.css'), 'utf8');
  assert.match(app, /frame\.addEventListener\('click',e=>\{if\(storyTouchMoved\)/);
  assert.match(app, /dy>80&&Math\.abs\(dy\)>Math\.abs\(dx\)/);
  assert.match(app, /frame\.addEventListener\('pointerdown',pauseStoryTimer\)/);
  assert.match(app, /data-story-reply="\$\{c\.id\}"/);
  assert.match(app, /data-npc-open="'\+esc\(c\.id\)/);
  assert.match(app, /stockFor\(state\.story\?\.category\|\|'general',c\.worldIndex\|\|1\)/);
  assert.match(app, /class="story-tap-zone story-tap-prev"/);
  assert.match(app, /class="story-tap-zone story-tap-next"/);
  assert.match(css, /\.story-frame\.story-fullscreen/);
  assert.match(css, /\.story-tap-zone/);
  assert.match(css, /\.story-bottom-reply/);
});

test('NPC portraits come from the unique offline portrait generator across the cast', async () => {
  const [app, core] = await Promise.all(['app.js', 'game-core.mjs'].map(name => readFile(join(dist, name), 'utf8')));
  assert.match(app, /function npcPortrait\(index\)\{return buildNpcPortraitDataUrl\(index\)\}/);
  assert.match(app, /Object\.defineProperty\(npc,'photo'/);
  assert.match(app, /npc\.photo=npcPortrait\(100000\+i\)/);
  assert.match(core, /export function buildNpcPortraitDataUrl\(index\)/);
  assert.match(core, /data:image\/svg\+xml,/);
});

test('NPC discovery, starter board, and generated replies stay inside the active story', async () => {
  const [app, core] = await Promise.all(['app.js', 'game-core.mjs'].map(name => readFile(join(dist, name), 'utf8')));
  assert.match(app, /function storyNPCs\(\)\{const id=Number\(state\.story\?\.id\);return ensureStoryNPCs\(id\)\}/);
  assert.match(app, /function renderDiscover\(\)\{[^]*directory=storyNPCs\(\)/);
  assert.doesNotMatch(app, /<option>All stories<\/option>/);
  assert.match(app, /function starterBoards\(\)\{const people=storyNPCs\(\)/);
  assert.match(app, /function scheduleBoardAudience\(boardId\)\{setTimeout\(\(\)=>\{[^]*const people=storyNPCs\(\)/);
  assert.match(core, /export function filterCastForStory\(cast, storyId\)/);
});

test('story setup reveals a typewriter prologue and ten story-local follower choices before identity creation', async () => {
  const [app, css] = await Promise.all(['app.js', 'style.css'].map(name => readFile(join(dist, name), 'utf8')));
  assert.match(app, /function showStoryPrologue\(\)/);
  assert.match(app, /setInterval\(tick,115\)/);
  assert.match(app, /function showFirstFollowerPicker\(\)/);
  assert.match(app, /selectFirstFollowerCandidates\(ensureStoryNPCs\(story\.id\),story\.id,10\)/);
  assert.match(app, /data-select-follower=/);
  assert.match(app, /function showPlayerIdentityForm\(\)/);
  assert.match(css, /\.typewriter-copy/);
  assert.match(css, /\.follower-grid/);
});

test('choosing a follower does not bubble into a second picker render', async () => {
  const app = await readFile(join(dist, 'app.js'), 'utf8');
  assert.match(app, /button\.onclick=\(\)=>\{selectedFollowerId=button\.dataset\.selectFollower/);
  assert.doesNotMatch(app, /if\(d\.selectFollower\)\{selectedFollowerId=d\.selectFollower;showFirstFollowerPicker\(\);return\}/);
  assert.match(app, /\[data-follower-continue\]'\)\.onclick=showPlayerIdentityForm/);
  assert.match(app, /state\.started=true;state\.story=story/);
  assert.match(app, /page='home';save\(\);closeStorySetup\(\);render\(\)/);
});

test('Practice Live is launched from the active story and only schedules comments from that cast', async () => {
  const [app, css] = await Promise.all(['app.js', 'style.css'].map(name => readFile(join(dist, name), 'utf8')));
  assert.match(app, /data-action="go-live"/);
  assert.match(app, /function startLive\(\)[^{]*\{[^]*const people=storyNPCs\(\)/);
  assert.match(app, /function renderLive\(\)/);
  assert.match(app, /Local Practice Live · camera preview is only visible on this device/);
  assert.match(app, /function endLive\(\)/);
  assert.match(app, /data-action="live-comment"/);
  assert.match(css, /\.live-screen/);
});

test('200-story launch catalog, NPC account tabs, and camera-only local preview are wired through native app', async () => {
  const [app, core, css, plist] = await Promise.all([
    readFile(join(dist, 'app.js'), 'utf8'), readFile(join(dist, 'game-core.mjs'), 'utf8'),
    readFile(join(dist, 'style.css'), 'utf8'), readFile(join(new URL('../ios/App/App/Info.plist', import.meta.url).pathname), 'utf8')
  ]);
  assert.match(app, /buildStoryCatalog\(baseStories,140\)/);
  assert.match(app, /200 original stories/);
  assert.match(app, /state\.story\.id>=STORY_COUNT/);
  assert.match(app, /function starterPosts\(story=state\.story\)\{const people=storyNPCs\(\)\.slice\(0,50\)/);
  assert.match(app, /buildNpcSocialMoments\(npc,profileStory,peers\)/);
  assert.match(app, /post\.type==='repost'/);
  assert.match(app, /post\.type==='tagged'/);
  assert.match(core, /export function buildNpcPersonality\(/);
  assert.match(core, /export function buildNpcSocialMoments\(/);
  assert.match(app, /facingMode:'user'\},audio:false/);
  assert.match(app, /live-camera-card/);
  assert.match(css, /\.live-camera-card/);
  assert.match(plist, /<key>NSCameraUsageDescription<\/key>/);
  assert.doesNotMatch(app, /1,000\+ to explore/);
});

test('the real in-app name lists can generate 100,000 unique NPC display names', async () => {
  const app=await readFile(join(new URL('../',import.meta.url).pathname,'app.js'),'utf8');
  const names=['npcFirst','npcLast','npcMiddle'].map(name=>{
    const base=app.match(new RegExp(`const ${name}=(\\[[^\\n]+\\]);`))?.[1];
    if(!base)throw new Error(`Cannot find ${name} list`);
    const list=Function(`return ${base}`)();
    const addition=app.match(new RegExp(`${name}\\.push\\(([^;]+)\\);`))?.[1];
    if(addition)list.push(...Function(`return [${addition}]`)());
    return list;
  });
  const generated=Array.from({length:100000},(_,index)=>uniqueNpcName(index,...names));
  assert.equal(new Set(generated).size,100000);
  const axisNames=['npcValues','npcTemperaments','npcSocialStyles','npcVoiceStyles','npcRiskStyles'];
  const axes=axisNames.map(name=>{const source=app.match(new RegExp(`const ${name}=(\\[[^\\n]+\\]);`))?.[1];if(!source)throw new Error(`Cannot find ${name}`);return Function(`return ${source}`)()});
  const bios=generated.map(name=>buildNpcBio({name,storyTitle:'Same World',persona:'same persona',goal:'same goal',value:'same value',temperament:'same temperament',socialStyle:'same social style',voiceStyle:'same voice',riskStyle:'same risk'}));
  assert.equal(new Set(bios).size,100000);
});

test('story covers use local premise-specific artwork and caption-aware NPC media', async () => {
  const app=await readFile(join(new URL('../',import.meta.url).pathname,'app.js'),'utf8');
  assert.match(app,/function stockForCaption\(/);
  assert.match(app,/function starterPosts\([^]*stockForCaption\(story\?\.category/);
  assert.doesNotMatch(app,/style="--world-image:url\('\$\{buildStoryCoverPhotoUrl\(featured\)\}/);
  assert.match(app,/class="world-cover-art" src="\$\{buildStoryCoverDataUrl\(/);
});

test('every story-picker card renders its own generated cover image', async () => {
  const app=await readFile(join(new URL('../',import.meta.url).pathname,'app.js'),'utf8');
  assert.match(app,/class="world-cover-art" src="\$\{buildStoryCoverDataUrl\(s\)\}" alt="" aria-hidden="true"/);
  assert.match(app,/class="world-cover-art" src="\$\{buildStoryCoverDataUrl\(featured\)\}" alt="" aria-hidden="true"/);
});

test('story picker pager buttons have visible dark-mode arrows and rendered cards use image elements', async () => {
  const [app, css] = await Promise.all(['app.js', 'style.css'].map(name => readFile(join(new URL('../',import.meta.url).pathname,name),'utf8')));
  assert.match(app, /class="world-cover-art" src="\$\{buildStoryCoverDataUrl\((?:s|featured)\)\}" alt="" aria-hidden="true"/);
  assert.match(css, /\.world-cover-art\s*\{[^}]*position:\s*absolute[^}]*object-fit:\s*cover/s);
  assert.match(css, /\.pager\s+button\s*\{[^}]*background:\s*var\(--white\)[^}]*color:\s*var\(--ink\)[^}]*border/s);
  assert.match(css, /\.pager\s+button\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
});

test('iPhone story picker keeps status-bar clearance, artwork below overlays, and tile copy full-width', async () => {
  const [app, css] = await Promise.all(['app.js', 'style.css'].map(name => readFile(join(new URL('../',import.meta.url).pathname,name),'utf8')));
  assert.match(app, /window\.Capacitor\?\.isNativePlatform\?\.\(\)\)document\.body\.dataset\.capacitorNative='true'/);
  assert.match(css, /body\[data-capacitor-native="true"\]\[data-page="stories"\] #screen\s*\{[^}]*padding-top:\s*max\(env\(safe-area-inset-top,\s*0px\),\s*44px\)/);
  assert.match(css, /\.world-cover-art\s*\{[^}]*z-index:\s*-2/);
  assert.match(css, /\.world-feature:before\s*\{[^}]*z-index:\s*-1/);
  assert.match(css, /\.world-tile\s*\{[^}]*display:\s*block!important/);
  assert.match(css, /\.world-tile \.tile-content\s*\{[^}]*position:\s*absolute;[^}]*right:\s*12px/);
  assert.match(css, /\.world-search input\s*\{[^}]*width:\s*0;[^}]*min-width:\s*0;[^}]*flex:\s*1/);
});

test('remote NPC photos request a WebKit-safe JPEG instead of negotiated AVIF or WebP', async () => {
  const app=await readFile(join(new URL('../',import.meta.url).pathname,'app.js'),'utf8');
  assert.match(app,/function stockUrl\(id,width=1400\)\{return `https:\/\/images\.unsplash\.com\/\$\{id\}\?fm=jpg&fit=crop&w=\$\{width\}&q=78`\}/);
  assert.doesNotMatch(app,/function stockUrl\([^]*?auto=format/);
  assert.match(app,/function webkitImageUrl\(/);
  assert.match(app,/src="\$\{esc\(webkitImageUrl\(item\.mediaSrc\)\)\}"/);
});

test('NPC profile media tiles open a detail view and can return to the NPC profile', async () => {
  const app=await readFile(join(new URL('../',import.meta.url).pathname,'app.js'),'utf8');
  assert.match(app,/function openNPCProfilePost\(postId\)/);
  assert.match(app,/if\(d\.npcProfilePost\)\{openNPCProfilePost\(d\.npcProfilePost\);return\}/);
  assert.match(app,/data-npc-profile-back/);
  assert.match(app,/mediaMarkup\(post\)/);
});

test('sound toggle starts and stops actual ambient audio while preserving click-to-unlock behavior', async () => {
  const app=await readFile(join(new URL('../',import.meta.url).pathname,'app.js'),'utf8');
  assert.match(app,/function setSoundEnabled\(enabled\)/);
  assert.match(app,/function startAmbientMusic\(/);
  assert.match(app,/function stopAmbientMusic\(/);
  assert.match(app,/setSoundEnabled\(!state\.sound\)/);
});

test('story posts and their comments are generated from the same caption context', async () => {
  const app=await readFile(join(new URL('../',import.meta.url).pathname,'app.js'),'utf8');
  assert.match(app,/text=npcPostText\(npc,story,i\)/);
  assert.match(app,/text:npcLine\(subject,commenter\)/);
  assert.match(app,/mediaAlt=.*story\?\.title/);
});

test('Capacitor Android and iOS asset copies include the current modular web app', async () => {
  for (const platformPath of ['../android/app/src/main/assets/public', '../ios/App/App/public']) {
    const platform = join(new URL(platformPath, import.meta.url).pathname);
    const [html, app, core, bundle] = await Promise.all(['index.html', 'app.js', 'game-core.mjs', 'app.bundle.js'].map(name => readFile(join(platform, name), 'utf8')));
    assert.match(html, /src="app\.bundle\.js"/);
    assert.match(app, /if\(d\.notifications\)\{showNotifications\(\);return\}/);
    assert.match(core, /export function sortBoardItems/);
    assert.match(bundle, /window\.FamousCore=/);
  }
});
