import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSave, normalizeAccounts, escapeHTML, sortBoardItems, persistJSON, buildCommonsSearchUrl, normalizeCommonsResults, chooseVariant, uniqueMediaPool, fetchMediaResults, uniqueNpcName, buildNpcBio, buildNpcStoryTask, buildNpcPortraitDataUrl, filterCastForStory, buildStoryCatalog, selectFirstFollowerCandidates, buildStoryCoverDataUrl, buildStoryCoverPhotoUrl, selectNpcPersona, buildNpcSocialMoments, buildNpcPersonality } from '../game-core.mjs';

const blank = {
  started: false,
  profile: { name: 'You', handle: '@you', bio: '', initial: 'Y' },
  story: null,
  stats: { fame: 0, aura: 0, wealth: 40, trust: 0, stress: 0 },
  posts: [], messages: {}, friends: [], enemies: [], completed: [], actions: {},
  unlocks: [], log: [], liked: [], saved: [], boards: [], reelVotes: {},
  chapter: 1, day: 1, notifications: [], worldStories: [], sound: false,
};

test('invalid imported saves are rejected instead of entering the render tree', () => {
  assert.equal(sanitizeSave({ profile: '<svg onload=alert(1)>', stats: [] }, blank), null);
  assert.equal(sanitizeSave(null, blank), null);
  assert.equal(sanitizeSave({ profile: {}, stats: {} }, blank), null);
});

test('imported user text is bounded and HTML-escaped before rendering', () => {
  const hostile = structuredClone(blank);
  hostile.profile.name = '<img src=x onerror=alert(1)>';
  hostile.profile.handle = 'x'.repeat(300);
  hostile.posts = [{ id: 'p', owner: 'you', text: '<script>alert(1)</script>'.repeat(30), comments: [] }];
  const safe = sanitizeSave(hostile, blank);
  assert.equal(safe.profile.name, '<img src=x onerror=alert'.slice(0, 24));
  assert.equal(escapeHTML(safe.profile.name), '&lt;img src=x onerror=alert');
  assert.ok(safe.profile.handle.length <= 21);
  assert.ok(safe.posts[0].text.length <= 280);
  assert.equal(safe.posts.length, 1);
});

test('malformed account storage is normalized and never exposes invalid rows', () => {
  const accounts = normalizeAccounts({ currentId: '__proto__', accounts: [null, '<img>', { id: '', name: {}, save: {} }] }, blank);
  assert.equal(accounts.accounts.length, 0);
  assert.equal(accounts.currentId, null);
});

test('valid restored gameplay fields survive sanitization while unsafe media URLs are removed', () => {
  const restored = structuredClone(blank);
  restored.started = true;
  restored.story = { id: 17, title: 'Story 17', category: 'music', summary: 'A story' };
  restored.chapter = 4;
  restored.day = 23;
  restored.posts = [{ id: 'post-1', owner: 'you', text: 'Kept', mediaSrc: 'javascript:alert(1)', audioUrl: 'data:text/html,bad', comments: [] }];
  restored.log = [{ type: 'choice', text: 'A remembered choice', day: 2 }];
  restored.unlocks = ['friendship'];
  restored.storyReactions = ['npc-17-1'];
  restored.worldSequence = 82;
  restored.worldLastTick = 123456789;
  restored.npcTasks = [{ id: 'task-1', npcId: 'world-1', kind: 'risk', title: 'A story at risk', message: 'Check the launch details.', action: 'Review the source.', status: 'pending', storyTitle: 'Story 17' }];
  const safe = sanitizeSave(restored, blank);
  assert.equal(safe.story.id, 17);
  assert.equal(safe.chapter, 4);
  assert.equal(safe.posts[0].text, 'Kept');
  assert.equal(safe.posts[0].mediaSrc, '');
  assert.equal(safe.posts[0].audioUrl, '');
  assert.deepEqual(safe.log, restored.log);
  assert.deepEqual(safe.unlocks, ['friendship']);
  assert.deepEqual(safe.storyReactions, ['npc-17-1']);
  assert.equal(safe.worldSequence, 82);
  assert.equal(safe.worldLastTick, 123456789);
  assert.deepEqual(safe.npcTasks, restored.npcTasks);
});

test('saves from the retired 1,060-world catalog retain their story metadata for app migration', () => {
  const restored=structuredClone(blank);
  restored.profile.name='Ari';restored.started=true;restored.story={id:999,title:'Old world 999',category:'music',summary:'Saved old story'};
  const safe=sanitizeSave(restored,blank);
  assert.equal(safe.story.id,999);
  assert.equal(safe.story.category,'music');
});

test('5,001 virtual players retain separate story, feed, relationship, and message state', () => {
  const input = Array.from({ length: 5001 }, (_, i) => ({
    id: `local-${i}`, name: `Player ${i}`,
    save: {
      ...structuredClone(blank), started: true,
      profile: { ...blank.profile, name: `Player ${i}` },
      story: { id: i % 60, title: `Story ${i % 60}`, category: 'music', summary: 'A distinct simulated world' },
      stats: { ...blank.stats, fame: i % 101 },
      posts: Array.from({ length: 50 }, (_, j) => ({
        id: `p-${i}-${j}`, owner: `npc-${i}-${j}`, text: `Player ${i}, world ${i % 60}, post ${j}`,
        likes: j * 3, comments: j % 5 === 0 ? [{ id: `c-${i}-${j}`, owner: `npc-${i}`, text: `Reply ${j}` }] : [],
      })),
      friends: [`npc-${i}`],
      messages: { [`npc-${i}`]: [{ from: 'them', text: `Conversation for player ${i}` }] },
    },
  }));
  const start = performance.now();
  const normalized = normalizeAccounts({ currentId: input.at(-1).id, accounts: input }, blank);
  const ms = performance.now() - start;
  assert.equal(normalized.accounts.length, 5001);
  assert.equal(normalized.accounts[0].save.profile.name, 'Player 0');
  assert.equal(normalized.accounts[5000].save.profile.name, 'Player 5000');
  assert.equal(normalized.currentId, 'local-5000');
  assert.equal(normalized.accounts[0].save.posts.length, 50);
  assert.equal(normalized.accounts[5000].save.story.id, 5000 % 60);
  assert.equal(normalized.accounts[5000].save.posts[0].comments[0].text, 'Reply 0');
  assert.equal(normalized.accounts[5000].save.messages['npc-5000'][0].text, 'Conversation for player 5000');
  assert.notEqual(normalized.accounts[0].save.posts[0].id, normalized.accounts[1].save.posts[0].id);
  assert.ok(ms < 5000, `normalization took ${ms.toFixed(0)}ms`);
});

test('open-board filters change the displayed set and never mutate saved order', () => {
  const items = [
    { id: 'low', topic: 'Open thought', likes: 1, replies: [] },
    { id: 'question', topic: 'Questions', likes: 2, replies: [{}, {}] },
    { id: 'hot', topic: 'Open thought', likes: 40, replies: [] },
  ];
  assert.deepEqual(sortBoardItems(items, 'Questions').map(x => x.id), ['question']);
  assert.deepEqual(sortBoardItems(items, 'Hot').map(x => x.id), ['hot', 'question', 'low']);
  assert.deepEqual(sortBoardItems(items, 'Unpopular').map(x => x.id), ['low', 'question', 'hot']);
  assert.deepEqual(sortBoardItems(items, 'New').map(x => x.id), ['hot', 'question', 'low']);
  assert.deepEqual(items.map(x => x.id), ['low', 'question', 'hot']);
});

test('save persistence reports quota and storage failures instead of hiding them', () => {
  const memory = new Map();
  assert.equal(persistJSON({ setItem: (key, value) => memory.set(key, value) }, 'save', { fame: 8 }), true);
  assert.deepEqual(JSON.parse(memory.get('save')), { fame: 8 });
  assert.equal(persistJSON({ setItem() { throw new Error('QuotaExceededError'); } }, 'save', {}), false);
});

test('Commons fallback builds public image and video searches and preserves license attribution', () => {
  const url = new URL(buildCommonsSearchUrl('space art', { kind: 'video', page: 2 }));
  assert.equal(url.origin, 'https://commons.wikimedia.org');
  assert.equal(url.searchParams.get('origin'), '*');
  assert.match(url.searchParams.get('gsrsearch'), /filetype:video/);
  assert.equal(url.searchParams.get('gsroffset'), '24');
  const normalized = normalizeCommonsResults({ query: { pages: { 1: {
    title: 'File:Orbit.webm', imageinfo: [{ url: 'https://upload.wikimedia.org/orbit.webm', thumburl: 'https://upload.wikimedia.org/thumb/orbit.jpg', mime: 'video/webm', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Orbit.webm', extmetadata: { Artist: { value: 'Creator' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }],
  } } } });
  assert.equal(normalized[0].mediaType, 'video');
  assert.equal(normalized[0].thumbnail, 'https://upload.wikimedia.org/thumb/orbit.jpg');
  assert.equal(normalized[0].creator, 'Creator');
  assert.equal(normalized[0].license, 'CC BY-SA 4.0');
});

test('stock image selection spreads posts across a broad category library', () => {
  const category = Array.from({ length: 12 }, (_, index) => `photo-${index}`);
  const shared = Array.from({ length: 48 }, (_, index) => `photo-${index + 12}`);
  const library = uniqueMediaPool(category, shared, category);
  assert.equal(library.length, 60);
  assert.equal(new Set(Array.from({ length: 50 }, (_, index) => chooseVariant(library, index))).size, 50);
});

test('Explore falls back to Commons when Openverse returns 401', async () => {
  const calls = [];
  const fetcher = async url => {
    calls.push(String(url));
    if (String(url).includes('api.openverse.org')) return { ok: false, status: 401, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ query: { pages: { 1: {
      title: 'File:Galaxy.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/galaxy.jpg', thumburl: 'https://upload.wikimedia.org/thumb/galaxy.jpg', mime: 'image/jpeg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Galaxy.jpg' }],
    } } } }) };
  };
  const result = await fetchMediaResults(fetcher, 'galaxy art', { kind: 'image' });
  assert.equal(result.source, 'Wikimedia Commons');
  assert.equal(result.results[0].title, 'Galaxy.jpg');
  assert.equal(calls.length, 2);
});

test('Explore video queries use a public video catalog directly', async () => {
  let called = '';
  const fetcher = async url => {
    called = String(url);
    return { ok: true, status: 200, json: async () => ({ query: { pages: {} } }) };
  };
  const result = await fetchMediaResults(fetcher, 'space flight', { kind: 'video' });
  assert.equal(result.source, 'Wikimedia Commons');
  assert.match(called, /filetype%3Avideo/);
});

test('Explore falls back to Wikimedia Commons audio when Openverse rejects the request', async () => {
  const calls=[];
  const result=await fetchMediaResults(async url=>{
    calls.push(String(url));
    if(String(url).includes('api.openverse.org'))return {ok:false,status:401,json:async()=>({})};
    return {ok:true,status:200,json:async()=>({query:{pages:{1:{title:'File:Ambient.mp3',imageinfo:[{url:'https://upload.wikimedia.org/ambient.mp3',mime:'audio/mpeg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Ambient.mp3',extmetadata:{LicenseShortName:{value:'CC0'}}}]},2:{title:'File:Unsupported.ogg',imageinfo:[{url:'https://upload.wikimedia.org/unsupported.ogg',mime:'audio/ogg'}]}}}})};
  },'ambient',{kind:'audio'});
  assert.equal(result.source,'Wikimedia Commons');
  assert.equal(result.results[0].mediaType,'audio');
  assert.equal(result.results.length,1);
  assert.equal(calls.length,2);
  assert.match(calls[1],/filetype%3Aaudio/);
});

test('10,000 NPCs receive distinct natural names and story-specific biographies', () => {
  const first = Array.from({ length: 100 }, (_, i) => `First${i}`);
  const last = Array.from({ length: 100 }, (_, i) => `Last${i}`);
  const names = Array.from({ length: 10000 }, (_, i) => uniqueNpcName(i, first, last));
  assert.equal(new Set(names).size, 10000);
  const bios = Array.from({ length: 10000 }, (_, i) => buildNpcBio({
    storyTitle: `Story ${i % 60}`, persona: `persona-${i % 10}`, goal: `goal-${i % 10}`,
    value: `value-${Math.floor(i / 10) % 10}`, temperament: `temperament-${i % 10}`,
    socialStyle: `social-${Math.floor(i / 100) % 10}`, voiceStyle: `voice-${Math.floor(i / 1000) % 10}`,
  }));
  assert.equal(new Set(bios).size, 10000);
  assert.match(bios[42], /Story 42/);
});

test('generated NPC middle names do not duplicate the first or family name', () => {
  const first = ['Ari', 'Mina', 'Theo'];
  const last = ['Sen', 'Vale', 'Park'];
  const middle = ['Ari', 'Bea', 'Mina', 'Cai', 'Theo', 'Devi'];
  for (let i = 0; i < 100; i++) {
    const [given, second, family] = uniqueNpcName(i, first, last, middle).split(' ');
    assert.notEqual(given, second);
    assert.notEqual(second, family);
  }
  const bio = buildNpcBio({ storyTitle: 'Film Nights', persona: 'the quiet observer', goal: 'notices small details' });
  assert.match(bio, /the quiet observer notices small details/);
  assert.doesNotMatch(bio, /is trying to/);
});

test('story NPC messages provide a relevant task with a help-or-risk outcome', () => {
  const help = buildNpcStoryTask({ id: 'world-1', worldIndex: 1, storyId: 2, role: 'mentor', goal: 'protect the launch', name: 'Ari Sen' }, { title: 'The last seat', category: 'fashion' }, 7);
  const risk = buildNpcStoryTask({ id: 'world-2', worldIndex: 2, storyId: 2, role: 'friendly rival', goal: 'win the launch', name: 'Mina Park' }, { title: 'The last seat', category: 'fashion' }, 8);
  assert.match(help.message, /The last seat/);
  assert.ok(['help', 'risk'].includes(help.kind));
  assert.ok(['help', 'risk'].includes(risk.kind));
  assert.notEqual(help.id, risk.id);
  assert.ok(help.action.length > 0 && risk.action.length > 0);
});

test('NPC personas vary across the active story cast instead of repeating one voice', () => {
  const personas = Array.from({ length: 10 }, (_, i) => `persona-${i}`);
  const storyCount = 200;
  const storyId = 0;
  const castPersonas = Array.from({ length: 95 }, (_, slot) => selectNpcPersona(slot * storyCount + storyId, storyId, storyCount, personas));
  assert.equal(new Set(castPersonas).size, 10);
});

test('10,000 NPC portraits are unique, deterministic, and generated locally as SVG data URLs', () => {
  const portraits = Array.from({ length: 10000 }, (_, i) => buildNpcPortraitDataUrl(i));
  assert.equal(new Set(portraits).size, 10000);
  assert.equal(portraits[713], buildNpcPortraitDataUrl(713));
  assert.ok(portraits.every(p => p.startsWith('data:image/svg+xml,')));
  assert.ok(portraits.every(p => !/^https?:/i.test(p)));
});

test('story cast filtering excludes every NPC and relationship target from other worlds', () => {
  const cast = [
    { id: 'film-a', storyId: 0 }, { id: 'music-a', storyId: 1 },
    { id: 'film-b', storyId: 0 }, { id: 'unscoped' },
  ];
  assert.deepEqual(filterCastForStory(cast, 0).map(npc => npc.id), ['film-a', 'film-b']);
  assert.deepEqual(filterCastForStory(cast, 1).map(npc => npc.id), ['music-a']);
  assert.deepEqual(filterCastForStory(cast, 60), []);
});

test('launch story catalog contains 200 distinct setups and each has original cover art', () => {
  const base = Array.from({length: 60}, (_, id) => ({id,title:`Base ${id}`,category:'film',summary:`Base summary ${id}`}));
  const stories = buildStoryCatalog(base, 140);
  assert.equal(stories.length, 200);
  assert.equal(new Set(stories.map(s=>s.title)).size, 200);
  assert.equal(new Set(stories.map(s=>s.summary)).size, 200);
  assert.ok(stories.slice(60).every(s=>s.prologue?.length > 100));
  assert.equal(new Set(stories.slice(60).map(s=>s.prologue)).size, 140);
  const covers=stories.map(buildStoryCoverDataUrl);
  assert.ok(covers.every(url=>url.startsWith('data:image/svg+xml,')));
  assert.equal(new Set(covers).size, 200);
  const photoCovers=stories.map(buildStoryCoverPhotoUrl);
  assert.equal(new Set(photoCovers).size,200);
  assert.ok(photoCovers.every((url,index)=>url.startsWith(`https://picsum.photos/id/${index+1}/`)));
  const coverMarkup=decodeURIComponent(covers[0].slice('data:image/svg+xml,'.length));
  assert.match(coverMarkup,/data-art="story-scene"/);
  assert.match(coverMarkup,/class="story-figure"/);
  assert.match(coverMarkup,/class="scene-landmark"/);
});

test('100,000 NPC names and portraits remain unique without loading their records', () => {
  const first = [...Array.from({length:100},(_,i)=>`First${i}`),'First0'], last=[...Array.from({length:100},(_,i)=>`Last${i}`),'Last0'], middle=[...Array.from({length:10},(_,i)=>`Middle${i}`),'Middle0'];
  const names = Array.from({length:100000},(_,i)=>uniqueNpcName(i,first,last,middle));
  assert.equal(new Set(names).size,100000);
  const portraits=[0,1,999,99999].map(i=>buildNpcPortraitDataUrl(i));
  assert.equal(new Set(portraits).size,portraits.length);
});

test('all 100,000 NPC personality combinations and generated social profiles are distinct and story-local', () => {
  const axes = Array.from({length:10},(_,i)=>`axis-${i}`);
  const personalities=Array.from({length:100000},(_,i)=>buildNpcPersonality(i,{values:axes,temperaments:axes,socialStyles:axes,voiceStyles:axes,riskStyles:axes}));
  assert.equal(new Set(personalities.map(p=>p.key)).size,100000);
  const story={id:7,title:'The Last Take at Dawn',category:'film',summary:'A film crew faces a deadline.'};
  const peers=Array.from({length:12},(_,i)=>({id:`peer-${i}`,name:`Peer ${i}`}));
  const first=buildNpcSocialMoments({id:'npc-1',name:'Avery North',handle:'@avery1',goal:'protect the crew',persona:'a careful producer',voiceStyle:'measured'},story,peers);
  const second=buildNpcSocialMoments({id:'npc-2',name:'Robin Vale',handle:'@robin2',goal:'finish the cut',persona:'a restless editor',voiceStyle:'dry'},story,peers);
  assert.deepEqual(first.map(x=>x.type).sort(),['post','post','post','reel','reel','repost','repost','tagged','tagged'].sort());
  assert.ok(first.every(x=>x.storyId===7&&x.text.includes(story.title)));
  assert.equal(new Set(first.map(x=>x.id)).size,first.length);
  assert.notDeepEqual(first.map(x=>x.text),second.map(x=>x.text));
});

test('rare story cameos are included only in worlds listed on their storyIds', () => {
  const cast=[{id:'home',storyId:1},{id:'cameo',storyId:1,storyIds:[1,7]},{id:'other',storyId:3,storyIds:[3]}];
  assert.deepEqual(filterCastForStory(cast,7).map(x=>x.id),['cameo']);
  assert.deepEqual(filterCastForStory(cast,3).map(x=>x.id),['other']);
});

test('first follower choices are ten unique story-relevant characters with distinct relationship arcs', () => {
  const cast=Array.from({length:30},(_,i)=>({id:`npc-${i}`,storyId:i%2,storyIds:i===12?[0,1]:[],relationshipArc:`arc-${i}`}));
  const choices=selectFirstFollowerCandidates(cast,1,10);
  assert.equal(choices.length,10);
  assert.equal(new Set(choices.map(x=>x.id)).size,10);
  assert.ok(choices.every(x=>x.storyId===1||x.storyIds?.includes(1)));
  assert.equal(new Set(choices.map(x=>x.relationshipArc)).size,10);
});

test('first follower choices rotate through different cast members for each story', () => {
  const cast=Array.from({length:40},(_,i)=>({id:`npc-${i}`,storyId:i<20?1:2,relationshipArc:`arc-${i}`}));
  const first=selectFirstFollowerCandidates(cast,1,10);
  const second=selectFirstFollowerCandidates(cast,2,10);
  assert.notDeepEqual(first.map(x=>x.id),second.map(x=>x.id));
});

test('flagship story covers illustrate their own premise instead of generic category art', () => {
  const decode=url=>decodeURIComponent(url.slice('data:image/svg+xml,'.length));
  const hollywood=decode(buildStoryCoverDataUrl({id:0,title:'Hollywood Hearts',category:'film'}));
  const city=decode(buildStoryCoverDataUrl({id:1,title:'A city with your name on it',category:'music'}));
  assert.match(hollywood,/data-scene="red-carpet"/);
  assert.match(hollywood,/AWARDS PREMIERE/);
  assert.match(city,/data-scene="city-audience"/);
  assert.match(city,/YOUR CITY/);
});
