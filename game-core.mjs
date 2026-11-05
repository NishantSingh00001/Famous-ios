const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const cleanText = (value, limit, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, limit);
};
const cleanArray = (value, limit, map = x => x) => Array.isArray(value) ? value.slice(0, limit).map(map).filter(x => x !== undefined) : [];
const safeUrl = value => {
  if (typeof value !== 'string' || value.length > 2048) return '';
  try { return new URL(value).protocol === 'https:' ? value : ''; } catch { return ''; }
};
const safeMediaId = value => typeof value === 'string' && /^[\w-]{1,100}$/.test(value) ? value : '';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function cleanThread(items, depth = 0) {
  if (depth > 4) return [];
  return cleanArray(items, 200, item => {
    if (!isRecord(item)) return undefined;
    return {
      id: cleanText(item.id, 100), owner: cleanText(item.owner, 100),
      name: cleanText(item.name, 80), text: cleanText(item.text, 1000),
      replies: cleanThread(item.replies, depth + 1),
    };
  });
}

function cleanPost(item) {
  if (!isRecord(item)) return undefined;
  return {
    id: cleanText(item.id, 100), owner: cleanText(item.owner, 100),
    text: cleanText(item.text, 280), type: cleanText(item.type, 20, 'post'),
    time: cleanText(item.time, 80), likes: Number.isFinite(item.likes) ? Math.max(0, Math.min(1e9, Math.floor(item.likes))) : 0,
    likedBy: cleanText(item.likedBy, 80), comments: cleanThread(item.comments),
    tag: cleanText(item.tag, 80), art: cleanText(item.art, 240),
    mediaId: safeMediaId(item.mediaId), mediaType: item.mediaType === 'video' ? 'video' : 'image',
    mediaSrc: safeUrl(item.mediaSrc), mediaAlt: cleanText(item.mediaAlt, 200),
    audioUrl: safeUrl(item.audioUrl), audioTitle: cleanText(item.audioTitle, 120),
    audioCredit: cleanText(item.audioCredit, 120), audioLicense: cleanText(item.audioLicense, 120),
    worldSeed: item.worldSeed === true,
  };
}

export function sanitizeSave(input, blank) {
  if (!isRecord(input) || !isRecord(input.profile) || !isRecord(input.stats)) return null;
  const base = JSON.parse(JSON.stringify(blank));
  const name = cleanText(input.profile.name, 24).trim();
  if (!name) return null;
  const number = (key, fallback, max = 100) => Number.isFinite(input.stats[key]) ? Math.max(0, Math.min(max, input.stats[key])) : fallback;
  const state = {
    ...base,
    started: input.started === true,
    profile: {
      name,
      handle: cleanText(input.profile.handle, 21, '@you'),
      bio: cleanText(input.profile.bio, 70),
      initial: name[0].toUpperCase(),
    },
    stats: {
      fame: number('fame', 0), aura: number('aura', 0), trust: number('trust', 0),
      stress: number('stress', 0), wealth: number('wealth', 40, 1e9),
    },
    posts: cleanArray(input.posts, 600, cleanPost),
    boards: cleanArray(input.boards, 300, item => isRecord(item) ? {
      id: cleanText(item.id, 100), owner: cleanText(item.owner, 100), title: cleanText(item.title, 65),
      text: cleanText(item.text, 1000), topic: cleanText(item.topic, 60), likes: Number.isFinite(item.likes) ? Math.max(0, item.likes) : 0,
      replies: cleanThread(item.replies), mediaId: safeMediaId(item.mediaId), mediaType: item.mediaType === 'video' ? 'video' : 'image',
    } : undefined),
    friends: cleanArray(input.friends, 10000, x => cleanText(x, 100)).filter(Boolean),
    enemies: cleanArray(input.enemies, 10000, x => cleanText(x, 100)).filter(Boolean),
    completed: cleanArray(input.completed, 100, x => cleanText(x, 80)).filter(Boolean),
    liked: cleanArray(input.liked, 10000, x => cleanText(x, 100)).filter(Boolean),
    saved: cleanArray(input.saved, 10000, x => cleanText(x, 100)).filter(Boolean),
    storyReactions: cleanArray(input.storyReactions, 10000, x => cleanText(x, 100)).filter(Boolean),
    notifications: cleanArray(input.notifications, 300, x => cleanText(x, 240)).filter(Boolean),
    log: cleanArray(input.log, 500, item => isRecord(item) ? {
      type: cleanText(item.type, 30), text: cleanText(item.text, 120),
      day: Number.isInteger(item.day) ? Math.max(1, Math.min(1e6, item.day)) : 1,
    } : undefined),
    unlocks: cleanArray(input.unlocks, 100, x => cleanText(x, 80)).filter(Boolean),
    reelVotes: isRecord(input.reelVotes) ? Object.fromEntries(Object.entries(input.reelVotes).slice(0, 100).map(([k, v]) => [cleanText(k, 80), cleanText(v, 40)])) : {},
    actions: isRecord(input.actions) ? Object.fromEntries(Object.entries(input.actions).slice(0, 50).map(([k, v]) => [cleanText(k, 40), Number.isFinite(v) ? Math.max(0, Math.min(1e6, v)) : 0])) : {},
    messages: isRecord(input.messages) ? Object.fromEntries(Object.entries(input.messages).slice(0, 500).map(([id, list]) => [cleanText(id, 100), cleanArray(list, 200, m => isRecord(m) ? { from: m.from === 'you' ? 'you' : 'them', text: cleanText(m.text, 1000) } : undefined)])) : {},
    npcTasks: cleanArray(input.npcTasks, 300, task => isRecord(task) ? {
      id: cleanText(task.id, 120), npcId: cleanText(task.npcId, 100), kind: task.kind === 'help' ? 'help' : 'risk',
      title: cleanText(task.title, 100), message: cleanText(task.message, 1000), action: cleanText(task.action, 240),
      status: ['pending', 'accepted', 'skipped', 'responded', 'ignored'].includes(task.status) ? task.status : 'pending',
      storyTitle: cleanText(task.storyTitle, 100),
    } : undefined),
    chapter: Number.isInteger(input.chapter) ? Math.max(1, Math.min(100, input.chapter)) : 1,
    day: Number.isInteger(input.day) ? Math.max(1, Math.min(1e6, input.day)) : 1,
    worldSequence: Number.isInteger(input.worldSequence) ? Math.max(0, Math.min(1e9, input.worldSequence)) : 0,
    worldLastTick: Number.isFinite(input.worldLastTick) ? Math.max(0, input.worldLastTick) : 0,
    createdAt: Number.isFinite(input.createdAt) ? Math.max(0, input.createdAt) : Date.now(),
    seenStory: input.seenStory === true,
    sound: input.sound === true,
    worldStories: cleanArray(input.worldStories, 80, x => isRecord(x) ? {
      id: cleanText(x.id, 100), owner: cleanText(x.owner, 100), text: cleanText(x.text, 280),
      mediaSrc: safeUrl(x.mediaSrc), mediaAlt: cleanText(x.mediaAlt, 200),
      createdAt: Number.isFinite(x.createdAt) ? x.createdAt : 0, expiresAt: Number.isFinite(x.expiresAt) ? x.expiresAt : 0,
    } : undefined),
  };
  // Accept the previous 1,060-world catalog so the app can migrate old saves
  // into the new curated 200-world catalog without discarding player progress.
  if (isRecord(input.story) && Number.isInteger(input.story.id) && input.story.id >= 0 && input.story.id < 1060) {
    state.story = { id: input.story.id, title: cleanText(input.story.title, 100), category: cleanText(input.story.category, 40), summary: cleanText(input.story.summary, 200) };
  }
  return state;
}

export function normalizeAccounts(input, blank) {
  if (!isRecord(input) || !Array.isArray(input.accounts)) return { currentId: null, accounts: [] };
  const accounts = [];
  const seen = new Set();
  for (const account of input.accounts) {
    if (!isRecord(account) || typeof account.id !== 'string' || !account.id || seen.has(account.id)) continue;
    const save = sanitizeSave(account.save, blank);
    if (!save) continue;
    const id = cleanText(account.id, 120);
    if (!id) continue;
    seen.add(id);
    accounts.push({ id, name: cleanText(account.name, 28, 'Player').trim() || 'Player', save });
  }
  const currentId = accounts.some(account => account.id === input.currentId) ? input.currentId : accounts[0]?.id || null;
  return { currentId, accounts };
}

export function sortBoardItems(items, filter = 'Hot') {
  const copy = Array.isArray(items) ? [...items] : [];
  const score = item => (Number.isFinite(item?.likes) ? item.likes : 0) + (Array.isArray(item?.replies) ? item.replies.length : 0);
  if (filter === 'Questions') return copy.filter(item => item?.topic === 'Questions');
  if (filter === 'New') return copy.reverse();
  if (filter === 'Unpopular') return copy.sort((a, b) => score(a) - score(b));
  return copy.sort((a, b) => score(b) - score(a));
}

export function persistJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function chooseVariant(items, index = 0) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const seed = Number.isFinite(index) ? Math.abs(Math.trunc(index)) : 0;
  return items[seed % items.length];
}

export function uniqueNpcName(index, firstNames, lastNames, middleNames = []) {
  if (!Array.isArray(firstNames) || !firstNames.length || !Array.isArray(lastNames) || !lastNames.length) return 'Story Friend';
  firstNames = [...new Set(firstNames)];
  lastNames = [...new Set(lastNames)];
  const i = Math.max(0, Math.floor(Number(index) || 0));
  const eligibleMiddles = Array.isArray(middleNames)
    ? [...new Set(middleNames)].filter(name => !firstNames.includes(name) && !lastNames.includes(name))
    : [];
  if (!eligibleMiddles.length) return `${firstNames[Math.floor(i / lastNames.length) % firstNames.length]} ${lastNames[i % lastNames.length]}`;
  return `${firstNames[Math.floor(i / (lastNames.length * eligibleMiddles.length)) % firstNames.length]} ${eligibleMiddles[Math.floor(i / lastNames.length) % eligibleMiddles.length]} ${lastNames[i % lastNames.length]}`;
}

export function selectNpcPersona(worldIndex, storyId, storyCount, personas = []) {
  if (!Array.isArray(personas) || !personas.length || !Number.isFinite(storyCount) || storyCount < 1) return null;
  const index = Math.max(0, Math.floor(Number(worldIndex) || 0));
  const story = Math.max(0, Math.floor(Number(storyId) || 0));
  const slot = Math.floor(index / storyCount);
  return personas[(slot * 7 + story * 3) % personas.length];
}

export function buildNpcBio({ name = 'Someone', storyTitle = 'your story', persona = 'a thoughtful local', goal = 'make a difference', value = 'curiosity', temperament = 'steady', socialStyle = 'a careful listener', voiceStyle = 'direct', riskStyle = 'waits for proof', } = {}) {
  const clean = value => String(value || '').trim().replace(/[.!?]+$/, '');
  return `In ${clean(storyTitle)}, ${clean(persona)} ${clean(goal)}. ${clean(name)} puts ${clean(value)} first, stays ${clean(temperament)}, connects as ${clean(socialStyle)}, and speaks in a ${clean(voiceStyle)} way. Under pressure: ${clean(riskStyle)}.`;
}

export function buildNpcPersonality(index, { values = [], temperaments = [], socialStyles = [], voiceStyles = [], riskStyles = [] } = {}) {
  const n=Math.max(0,Math.floor(Number(index)||0))%100000;
  const pick=(list,position)=>Array.isArray(list)&&list.length?list[position%list.length]:'';
  const valuesIndex=n%10,temperamentIndex=Math.floor(n/10)%10,socialIndex=Math.floor(n/100)%10,voiceIndex=Math.floor(n/1000)%10,riskIndex=Math.floor(n/10000)%10;
  return {value:pick(values,valuesIndex),temperament:pick(temperaments,temperamentIndex),socialStyle:pick(socialStyles,socialIndex),voiceStyle:pick(voiceStyles,voiceIndex),riskStyle:pick(riskStyles,riskIndex),key:`${valuesIndex}-${temperamentIndex}-${socialIndex}-${voiceIndex}-${riskIndex}`};
}

export function buildNpcSocialMoments(npc = {}, story = {}, peers = []) {
  const id=String(npc.id||'npc'),title=String(story.title||'this story'),category=String(story.category||'general'),name=String(npc.name||'A story friend'),goal=String(npc.goal||npc.role||'make their mark'),voice=String(npc.voiceStyle||npc.voice||'thoughtful'),peer=peers.find(person=>person?.id&&person.id!==npc.id)||{name:'the crew',id:'crew'};
  const seed=Number(npc.worldIndex??npc.seed??0)||0;
  const moments=[
    ['post',`${name} checked in from ${title}: I’m trying to ${goal}. The part I keep coming back to is what happens after the post goes up.`,0],
    ['post',`A note from ${title}: ${goal}. I heard ${peer.name}’s side today, and it changed what I thought I knew.`,1],
    ['post',`Small update in ${title}: ${goal}. No big reveal yet; just showing the work while it is still honest.`,2],
    ['reel',`A quick ${category} cut from ${title}: ${goal}. The moment before everyone else arrived was the real story.`,3],
    ['reel',`Behind the scenes in ${title}: ${peer.name} caught the detail I nearly missed while I was trying to ${goal}.`,4],
    ['repost',`Reposting ${peer.name} from ${title}: this says something I was trying to explain about ${goal}.`,5],
    ['repost',`Shared from the ${title} circle: ${peer.name} has a point about how we should ${goal}.`,6],
    ['tagged',`${name} was tagged by ${peer.name} in a ${title} moment. We were both there when the plan to ${goal} changed.`,7],
    ['tagged',`Tagged in ${title}: ${peer.name} and I disagree on the best way to ${goal}, but we are still working it out.`,8]
  ];
  return moments.map(([type,text,offset])=>({id:`${id}-social-${offset}`,owner:id,storyId:Number.isInteger(story.id)?story.id:-1,type,text,mediaAlt:`${category} moment from ${title}`,likes:18+((seed*31+offset*73)%8400),comments:2+((seed+offset*19)%220),tag:type==='tagged'?peer.id:'',time:`${1+((seed+offset)%23)}h`}));
}

// Original offline portrait art: traits are stable per NPC index, so identity
// remains recognizable in feeds, profiles, stories, and messages without a
// remote image service or a repeated stock-photo pool.
export function buildNpcPortraitDataUrl(index) {
  const id = Math.max(0, Math.floor(Number(index) || 0));
  let seed = (id + 1) >>> 0;
  const next = max => {
    seed = (Math.imul(seed ^ (seed >>> 15), 1 | seed) + 0x6d2b79f5) >>> 0;
    let value = Math.imul(seed ^ (seed >>> 7), 61 | seed) ^ seed;
    value = (value ^ (value >>> 14)) >>> 0;
    return value % max;
  };
  const backdrops = ['#31556b','#68517a','#a45749','#38766e','#9a6c3b','#4c5c9a','#9b536b','#47738a','#716c45','#55546f'];
  const skins = ['#f5d2b6','#e9b995','#d79b70','#b97851','#8e593d','#f0c7a4','#c98e69','#754a37','#e6aa83','#a96d50'];
  const hairs = ['#241b20','#553827','#151719','#9b6842','#d8b979','#703f62','#432c53','#a84d39','#303b3c','#554a40'];
  const clothes = ['#e65c55','#4d83d7','#4b9b83','#c279a5','#d8943e','#46506e','#53a5b1','#7d6cbd','#657e51','#bd596e'];
  const bg = backdrops[next(backdrops.length)], skin = skins[next(skins.length)], hair = hairs[next(hairs.length)], shirt = clothes[next(clothes.length)];
  const hairStyle = next(6), glasses = next(4) === 0, freckles = next(3) === 0, accessory = next(5);
  const hairShapes = [
    '<path d="M30 58Q29 20 64 19Q99 20 98 59L90 49Q80 38 64 39Q46 38 37 51Z"/>',
    '<path d="M27 63Q23 20 63 18Q105 20 101 66L93 87 87 53Q77 39 61 40Q45 39 36 53L34 87Z"/>',
    '<path d="M31 58Q32 22 64 20Q96 22 97 58Q82 42 65 42Q46 42 31 58Z"/><path d="M32 43Q22 65 29 87L39 76 40 48Z"/>',
    '<path d="M28 61Q26 20 64 18Q103 20 100 61L94 52Q88 43 82 42L87 62Q75 48 61 43Q45 43 35 58Z"/>',
    '<path d="M30 57Q27 23 62 19Q100 18 98 57L91 47Q84 39 77 38L80 51Q66 40 54 43L43 52 42 40Q34 47 30 57Z"/>',
    '<path d="M29 60Q25 21 64 18Q101 19 99 61L92 52Q87 44 83 42L86 68Q78 58 74 50L70 66Q60 52 52 48L45 64 39 52Z"/>'
  ][hairStyle];
  const frames = glasses ? '<g fill="none" stroke="#27242a" stroke-width="3"><rect x="42" y="61" width="16" height="11" rx="4"/><rect x="70" y="61" width="16" height="11" rx="4"/><path d="M58 66h12"/></g>' : '';
  const frecklesArt = freckles ? '<g fill="#a96854"><circle cx="48" cy="76" r="1"/><circle cx="53" cy="79" r="1"/><circle cx="77" cy="76" r="1"/><circle cx="72" cy="79" r="1"/></g>' : '';
  const accessoryArt = accessory === 0 ? '<path d="M40 42Q64 28 88 42" fill="none" stroke="#f2c85e" stroke-width="4"/>' : accessory === 1 ? '<circle cx="85" cy="85" r="3" fill="#f4cd66"/>' : accessory === 2 ? '<path d="M43 40l6-8 6 8M75 40l6-8 6 8" fill="none" stroke="#28232b" stroke-width="4"/>' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" data-npc="${id}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#171b26"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/><circle cx="64" cy="64" r="57" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="2"/><path d="M15 128Q19 94 46 91h36q27 4 31 37" fill="${shirt}"/><path d="M54 83h20v17H54z" fill="${skin}"/><path d="M32 62Q32 38 64 37Q96 38 96 62v14Q94 97 64 99Q35 96 32 76Z" fill="${skin}"/><path d="M29 63Q26 22 63 19Q104 19 99 64L91 52Q82 39 64 40Q44 40 35 55Z" fill="${hair}"/><g fill="${hair}">${hairShapes}</g>${accessoryArt}<ellipse cx="49" cy="67" rx="2.5" ry="3" fill="#28232b"/><ellipse cx="77" cy="67" rx="2.5" ry="3" fill="#28232b"/><path d="M61 69l-3 10h6" fill="none" stroke="#b7775d" stroke-width="2" stroke-linecap="round"/><path d="M55 85Q64 91 73 85" fill="none" stroke="#8c3f4b" stroke-width="2.5" stroke-linecap="round"/>${frames}${frecklesArt}<path d="M53 101l11 10 11-10" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="3"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function buildNpcStoryTask(npc, story, sequence = 0) {
  const role = String(npc?.role || '').toLowerCase();
  const kind = /rival|critic|competitor|antagonist|opponent/.test(role) || Math.abs(Number(npc?.worldIndex) || 0) % 5 === 4 ? 'risk' : 'help';
  const title = String(story?.title || 'your story');
  const goal = String(npc?.goal || 'move the story forward').replace(/[.!?]+$/, '');
  const id = `task-${npc?.id || 'friend'}-${Math.max(0, Math.floor(Number(sequence) || 0))}`;
  const action = kind === 'help'
    ? `Follow up on ${npc?.name || 'their'} lead: ${goal}.`
    : `Check the details before ${npc?.name || 'they'} can turn the situation against you.`;
  const message = kind === 'help'
    ? `Hey, I’m reaching out because of ${title}. ${goal[0]?.toUpperCase() || ''}${goal.slice(1)}. I can help if you act on this soon.`
    : `A heads-up about ${title}: ${goal}. The timing could put your part of the story at risk. I’d check the details before this spreads.`;
  return { id, npcId: String(npc?.id || ''), kind, title: kind === 'help' ? 'A useful lead' : 'A story at risk', message, action, status: 'pending', storyTitle: title };
}

export function filterCastForStory(cast, storyId) {
  const id = Number(storyId);
  if (!Number.isInteger(id) || id < 0 || !Array.isArray(cast)) return [];
  return cast.filter(npc => npc && (Number(npc.storyId) === id || Array.isArray(npc.storyIds) && npc.storyIds.some(world => Number(world) === id)));
}

// The 140 additions are individually authored story premises, not title/location
// permutations. Combined with the original 60, this keeps the launch catalog at 200.
const additionalStorySeeds = [
  ['film','The Last Take at Dawn','A location permit expires at sunrise, and your cast must choose between the perfect ending and keeping a promise to the neighborhood.'],
  ['film','The Editor’s Cut','A festival asks you to remove the scene that made your small film honest; the crew is split over what the opportunity is worth.'],
  ['film','Two Lines on the Call Sheet','A background actor knows the real story behind your lead’s sudden disappearance, but sharing it could endanger a fragile friendship.'],
  ['film','The Cinema That Stayed Open','You inherit a nearly empty repertory theater and have one week to convince the town that its final screening should not be its last.'],
  ['film','A Frame Out of Place','A documentary still seems to show a person who was never at the interview, drawing a local journalist into your unfinished project.'],
  ['film','The Subtitles Were Wrong','A translation mistake turns your short film into a public controversy, and the translator asks you not to rush out a correction.'],
  ['film','The Stunt Double’s Story','A minor injury pauses production; the stunt performer wants their own account heard before the studio posts its version.'],
  ['film','The Empty Screening Room','Your preview is attended by one stranger who recognizes the real event behind the fictional plot and wants to meet the people involved.'],
  ['film','The Uncredited Scene','A crew member spots their work in a celebrated cut under someone else’s name, forcing you to decide how loudly to back them.'],
  ['film','The Night the Projector Failed','The opening-night machine breaks minutes before the premiere, and the audience begins telling stories while your team improvises.'],
  ['music','The Demo on Platform Nine','A commuter records your unfinished song on the last train; the clip spreads while your band debates whether to claim it.'],
  ['music','One Borrowed Amplifier','A neighborhood festival has one working amp and two acts who both need it for a career-making set.'],
  ['music','The Chorus from the Kitchen','A voice note from your grandmother becomes the hook everyone loves, but she never agreed to have it released.'],
  ['music','The Quietest Headliner','The festival’s loudest name cancels, leaving your small acoustic group with a stage, a skeptical crew, and three hours to rethink the show.'],
  ['music','A Set List in the Rain','Your handwritten set list washes away before a benefit gig, and each bandmate remembers a different song that matters to the cause.'],
  ['music','The Producer’s Other Version','A producer sends you a polished mix that changes the meaning of your lyrics; the release countdown has already begun.'],
  ['music','The Choir on the Roof','A housing block’s residents want to record a rooftop chorus, but one neighbor is worried the attention will expose their private lives.'],
  ['music','The Last Tape at the Radio','A community station is clearing its archive when you find a recording that could reconnect two artists who stopped speaking.'],
  ['music','The Drummer Who Left Early','Your first tour date depends on the bandmate who walked out after rehearsal, and their message hints that the real problem is not the music.'],
  ['music','The Song Nobody Owns','Three friends independently wrote the same melody years apart; a label wants one name on the contract by tonight.'],
  ['fashion','The Coat with Six Histories','A designer asks you to model a reworked coat stitched from six neighbors’ donated clothes, each with a different reason for letting go.'],
  ['fashion','The Fitting Room Apology','A launch fitting goes viral after a careless remark, and the person it hurt is the only one who can explain what needs repairing.'],
  ['fashion','The Borrowed Runway','A venue double-books your community show with a luxury label’s event; the models suggest sharing the same narrow corridor.'],
  ['fashion','A Label Sewn Inside','A sample garment bears the name of an unknown maker, and your mentor asks you to trace its journey before the collection drops.'],
  ['fashion','The Sunday Repair Circle','Your repair workshop becomes a trend, bringing sponsors who want to replace mending lessons with a product launch.'],
  ['fashion','The Lookbook in the Archive','A box of old portraits changes how you planned to present a family-run clothing shop’s centennial collection.'],
  ['fashion','The One-Day Tailor','A costume emergency sends a touring performer to your tiny alterations stall with a deadline and a very public entrance.'],
  ['fashion','The Unfinished Hem','Your first runway model refuses to walk until the team credits the apprentice who made the garment wearable.'],
  ['fashion','The Swap Without Sizes','A clothing exchange is meant to be open to everyone, but the organizers discover their planning left many guests out.'],
  ['fashion','The Green Tag Promise','Your sustainable capsule collection is challenged by a supplier’s evidence that one material is not as local as advertised.'],
  ['startup','The Elevator Pitch at 2 A.M.','A building manager gives you one night to prove your prototype can solve a problem the tenants have learned to live around.'],
  ['startup','The Feature Nobody Asked For','Your app’s most popular feature is creating extra work for the people it was meant to help, and investors want you to scale it.'],
  ['startup','The Founder Who Stayed','A co-founder who left months ago returns with the missing research that could save your launch, but not the old partnership.'],
  ['startup','The Demo on a Borrowed Phone','Your product works on every device except the one the community partner actually uses; the presentation starts in twenty minutes.'],
  ['startup','The Queue Outside the Workshop','A repair tool you built becomes a local hit, and your tiny team must choose between opening access or taking a lucrative exclusive deal.'],
  ['startup','The Customer in the Test Group','A beta tester recognizes your design as a copy of a tool their late parent made, and asks you to hear the full history.'],
  ['startup','A Price for the Free Version','A sponsor offers to fund your free service if you collect data your users thought would stay private.'],
  ['startup','The Bug with a Name','A software error repeatedly locks out one person in your pilot group; the team’s dashboards say it affects only a fraction of users.'],
  ['startup','The Shop That Would Not Migrate','Your new ordering system works everywhere except the family store that inspired it, whose owner refuses to change how customers are served.'],
  ['startup','The Contract in Plain Language','A supplier sends a contract your collaborators cannot understand and gives you until closing to sign it.'],
  ['art','The Mural Under the Scaffold','Renovation uncovers an older painting beneath your public mural, and two artists claim it belongs to their family.'],
  ['art','The Gallery with No White Walls','A pop-up venue loses its lease, so the artists propose exhibiting their work in the businesses that have supported them.'],
  ['art','A Portrait Left at the Door','Someone leaves an unsigned portrait of your mentor outside the studio, painted from a moment no one remembers witnessing.'],
  ['art','The Clay That Came Back','A community kiln returns cracked work to its makers; one piece contains a note that changes how the group sees the firing.'],
  ['art','The Sound of the Old Bridge','Your audio installation records a bridge’s nightly vibrations, until residents ask whether the piece is exposing more than sound.'],
  ['art','The Print Run of Forty-One','An edition advertised as forty prints produces a forty-first copy, and the printer wants you to decide who should keep it.'],
  ['art','The Museum’s Missing Label','A visitor spots an error in a long-standing exhibit caption, and the correction would change who receives credit for the work.'],
  ['art','The Window That Became a Stage','A closed shop window is turned into a tiny public theater, but a nearby shop owner worries the performances will drive away customers.'],
  ['art','The Photograph Before the Fire','A recovered photo shows a person absent from the official story of a studio fire; the photographer is willing to talk only off the record.'],
  ['art','The Last Page of the Sketchbook','A shared sketchbook ends on a drawing that none of its five contributors will admit to making.'],
  ['campus','The Club Room at Midnight','Three student groups are assigned the same room and the same showcase date, then discover they have been preparing one event in secret.'],
  ['campus','The Scholarship Announcement','A public post names the wrong winner of a campus award, and the person who benefits asks you not to correct it yet.'],
  ['campus','The Lab Partner’s Notebook','Your lab partner’s field notes contradict the neat results in a class presentation, and the professor wants the slides by morning.'],
  ['campus','The Election without Posters','Campus rules ban campaign posters a week before voting, so candidates turn to student-run social accounts and informal gatherings.'],
  ['campus','The Cafeteria Table Map','A seating map meant to help new students becomes a status chart, and the group who made it asks you to help fix the harm.'],
  ['campus','The Borrowed Graduation Gown','A family’s only gown is needed by two siblings on the same afternoon, while an old friend offers a solution with a hidden condition.'],
  ['campus','The Practice Room Sign-Up','A musician’s private rehearsal slot is repeatedly taken by an anonymous account, and the booking system shows no name.'],
  ['campus','The Lost Orientation Group','A campus tour group wanders into a building slated for closure and finds a student archive nobody knew was there.'],
  ['campus','The Exam that Started Early','A notification reaches only half the class before an exam begins, and the group chat is already arguing about fairness.'],
  ['campus','The Quiet Seat in the Forum','A first-year student asks a question at a public forum that exposes how the new campus plan affects people who commute.'],
  ['sports','The Court after the Flood','A community court is reopened with one unsafe corner still taped off; the tournament organizer insists the schedule cannot change.'],
  ['sports','The Substitution Nobody Saw','A last-minute substitution wins your team the match but leaves out the teammate who helped build the winning play.'],
  ['sports','The Captain’s Old Number','A retired player returns to coach and asks you to wear their number, which a current teammate has quietly made their own.'],
  ['sports','The Tape from the Sideline','A parent’s video seems to show a disputed call, but the clip ends just before the moment everyone is fighting about.'],
  ['sports','The Practice with No Whistle','Your new coach removes the scoreboard from practice, and the team’s strongest players begin keeping one anyway.'],
  ['sports','The Finish-Line Helper','A volunteer crosses the line with an exhausted runner and becomes the focus of a race-winning photo.'],
  ['sports','The Team Bus Has One Seat','A tournament bus is over capacity, and the player who needs the ride most is not on the official roster.'],
  ['sports','The Shoes in the Lost Box','A donated pair of shoes carries a handwritten training log that helps your rival uncover who left them.'],
  ['sports','The Match That Wasn’t Streamed','The only recording of a historic local final is missing, and two retired players remember its result differently.'],
  ['sports','The New Rule at Half-Time','A league changes its substitution rule during a match, and your side must decide whether to benefit or challenge it.'],
  ['food','The Recipe with Two Endings','Two cousins each remember the last step of a family recipe differently, and the neighborhood supper is waiting for the dish.'],
  ['food','The Market Stall after Closing','A storm ruins your first market day, but the vendors nearby offer their remaining ingredients if you can cook before the lights go out.'],
  ['food','The Menu in Three Languages','A translated menu omits an allergen warning; the person who noticed is a guest your team has not yet met.'],
  ['food','The Table for the Night Shift','You host a late meal for workers finishing after midnight, and a sponsor wants every photo to look like a daytime celebration.'],
  ['food','The Orchard’s Last Crate','A small orchard has one crate left after a poor harvest, and three local cooks want to turn it into three different futures.'],
  ['food','The Baker’s Unmarked Box','An unlabeled pastry wins your pop-up vote; a quiet regular recognizes the flavor as a recipe from a closed bakery.'],
  ['food','The Soup Line Invitation','A community kitchen invites your food account to share its work, but volunteers ask you not to turn service into a spectacle.'],
  ['food','The Lunch That Arrived Cold','A delivery mix-up leaves a school event without lunch, and the restaurant accused online says it never received the order.'],
  ['food','The First Table at the New Place','Your opening night has one table left, reserved by someone who helped your family years ago but whom you have never met.'],
  ['food','The Spice Tin with No Label','A borrowed spice tin transforms the menu; the person who lent it asks you to keep its origin out of the launch post.'],
  ['creator','The Tutorial That Left Someone Out','Your most shared tutorial skips a step that beginners need, and a viewer posts a thoughtful correction before you notice.'],
  ['creator','The Unboxing Return Address','A mystery package arrives on camera with a return address linked to a friend who swore they had moved away.'],
  ['creator','The Collab with the Empty Chair','A creator collaboration begins with one guest missing, and the group must decide whether to publish the planned conversation.'],
  ['creator','The Caption in the Drafts','A draft caption saved on a shared device was never meant for public view, but a collaborator has already scheduled the post.'],
  ['creator','The Stream That Went Quiet','Your stream loses sound just as a guest begins telling the story behind their work; the chat fills the silence with guesses.'],
  ['creator','The Fan Edit with the Wrong Date','A fan montage becomes the definitive version of an event, though its timeline changes who appears to have started it.'],
  ['creator','The Sponsor’s Second Script','A sponsor sends a new script minutes before your review, replacing the one you agreed to with claims you cannot verify.'],
  ['creator','The Anonymous Tip Jar','Small donations arrive with notes from people who say your work helped them; one message asks for help you cannot promise.'],
  ['creator','The Account That Answered Back','A parody account responds to your joke with details only a close collaborator would know.'],
  ['creator','The Weekend without Uploads','A platform outage stops your scheduled posts, giving your audience an unexpected chance to make the next piece together.'],
  ['community','The Bus Stop Listening Post','Residents leave voice notes about a bus route change, and the loudest complaint comes from someone who rarely speaks at meetings.'],
  ['community','The Library after the Lease','A neighborhood library receives an eviction notice, while the landlord’s child quietly asks you to hear another side of the story.'],
  ['community','The Garden Plot with Two Names','A vacant lot is promised to both a youth garden and a food pantry, and the people leading each project are old friends.'],
  ['community','The Repair Café Promise','A volunteer repair café accepts more broken devices than it can fix before a promised community livestream.'],
  ['community','The Block Party Permit','The permit for a yearly block party arrives with a new rule that would keep the oldest resident’s music off the street.'],
  ['community','The Water Tower Message','A mural on the water tower carries a phrase from a neighborhood legend, but nobody agrees who painted it first.'],
  ['community','The Free Fridge Photograph','A picture of an empty community fridge spreads online, though a volunteer says it was taken during the scheduled cleanout.'],
  ['community','The Meeting with No Microphone','A public meeting’s microphone fails, and people begin passing one handwritten question around the room.'],
  ['community','The After-School Route','Parents ask you to map a safer walk home, but the shortest path passes a business that depends on the current traffic.'],
  ['community','The Festival’s Last Volunteer','A small festival loses its coordinator the night before opening; the volunteer list reveals a surprising disagreement about its purpose.'],
  ['city','The Elevator between Floors','A city elevator stalls between two busy floors, bringing together passengers whose posts about the building never mentioned each other.'],
  ['city','The Map with a Missing Alley','A public map removes a pedestrian alley that residents still use, and a courier offers to show you why it matters.'],
  ['city','The Rooftop Weather Station','A rooftop sensor records a heat pattern absent from the city report, and the building owner wants the readings taken offline.'],
  ['city','The Last Ferry of the Season','A ferry’s final trip is delayed for one passenger who says the trip is not for them but for someone waiting on the other shore.'],
  ['city','The Corner Store Radio','A corner store’s old radio begins broadcasting a neighborhood interview from twenty years ago, including a voice you recognize.'],
  ['city','The Street Name Vote','A street renaming petition divides the block between people honoring the past and people asking for a safer future.'],
  ['city','The Lost Bag at Terminal C','A lost bag contains nothing valuable except a stack of invitations to places across the city, each with a different time.'],
  ['city','The Crosswalk Countdown','A broken pedestrian signal gives the market one week to prove that the intersection needs more than a quick repair.'],
  ['city','The Night Bus Photographer','A photographer captures the same passengers every Thursday; one of them asks you not to post the latest image.'],
  ['city','The Public Bench Proposal','A bench becomes the center of a viral neighborhood story, though the person who built it is missing from every version.'],
  ['science','The Star That Wasn’t in the Chart','A student telescope catches a moving point of light, and the club must check its own data before sharing the discovery.'],
  ['science','The Sample in the Wrong Jar','A mislabeled sample changes the result of a community water test, and the volunteer who collected it insists the original notes are correct.'],
  ['science','The Weather Balloon Neighbor','A research balloon lands in a private garden, where its owner has been recording the same unusual wind for years.'],
  ['science','The Robot That Chose a Shortcut','A delivery robot takes an unexpected route through a plaza, exposing a gap in the map its makers never thought to test.'],
  ['science','The Exhibit with No Answer','A science museum’s most popular exhibit is based on an outdated explanation, and the guide who teaches it asks for time to revise.'],
  ['science','The Seed Bank Envelope','An envelope of seeds arrives with a climate log and no sender, just as a local garden begins choosing what to plant.'],
  ['science','The Moon Photo in the Group Chat','A sharp moon image is credited to your camera club, but an amateur astronomer recognizes the view from another place entirely.'],
  ['science','The Quiet Sensor','A public sensor records a repeated nighttime signal that the city dashboard filters out as noise.'],
  ['science','The Experiment That Took a Week','A simple classroom experiment produces different results on weekends, prompting students to ask who changes the room after hours.'],
  ['science','The Archive of Failed Prototypes','A maker lab plans to discard its failed projects until a visiting engineer recognizes one as the answer to a current problem.'],
  ['reality','The House Vote Is Public','A reality show moves its weekly vote onto social media, letting viewers decide before the contestants hear each other out.'],
  ['reality','The Reunion Seating Plan','A reunion special places former partners beside each other, and one guest asks to choose their own seat before cameras roll.'],
  ['reality','The Confessional without a Camera','A contestant records a private voice note instead of a confessional, and a producer accidentally adds it to the episode queue.'],
  ['reality','The Challenge with Two Winners','A competition’s rules allow a tie, but the prize sponsor insists the finale needs one clear champion.'],
  ['reality','The New Arrival Knows the Edit','A late-arriving housemate has seen the previous episodes and can predict how each person will be portrayed.'],
  ['reality','The Dinner Party Receipts','A dinner party game asks everyone to bring a receipt from the past; one person brings a message nobody remembers sending.'],
  ['reality','The Finale without a Confession','The show’s final episode is built around one missing interview, and the cast disagree about whether to fill the gap.'],
  ['reality','The Public Pairing','An audience poll pairs two contestants for a task, though both have reasons to keep their friendship off camera.'],
  ['reality','The Weekend in Separate Houses','The cast is split into two houses and learns different versions of the same event before they meet again.'],
  ['reality','The Contract after the Credits','After the finale, a cast member asks you to read the contract that controls what everyone can say next.'],
  ['comedy','The Joke with a Long Setup','A joke you wrote years ago lands in a room that does not know the person it was about is in the audience.'],
  ['comedy','The Open Mic Timekeeper','The venue’s timer breaks during your set, and the next performer uses the extra minutes to change the mood of the room.'],
  ['comedy','The Punchline in the Comments','A viewer leaves a better ending under your clip, then asks you not to use it without credit.'],
  ['comedy','The Panel with One Empty Chair','A comedy panel has one empty seat reserved for a critic who once rejected your work and now wants to explain why.'],
  ['comedy','The Callback Nobody Expected','A throwaway line from your first show becomes a running joke in the neighborhood, with a meaning you did not intend.'],
  ['comedy','The Improv Team’s Secret Prompt','Your team receives a prompt that appears to refer to a private disagreement between two performers.'],
  ['comedy','The Laugh Track Delay','A live comedy stream’s laugh track plays several seconds late, making the audience appear to react to the wrong person.'],
  ['comedy','The Roast with a Boundary','A friend asks you to roast them for charity, then tells you one subject is off limits after the audience arrives.'],
  ['comedy','The Sketch That Left the Group Chat','A draft sketch based on a private group chat is scheduled to publish under your name without the group’s consent.'],
  ['comedy','The Mayor’s Five-Minute Set','A city fundraiser asks you to coach the mayor through a comedy set about a policy your friends oppose.'],
];
export function buildStoryCatalog(baseStories, additionalCount = 140) {
  const base = Array.isArray(baseStories) ? baseStories.map((s, id) => ({...s, id: Number.isInteger(s?.id) ? s.id : id})) : [];
  const seen = new Set(base.map(s => s.title));
  const extra = [];
  const wanted = Math.min(additionalStorySeeds.length, Math.max(0, Math.floor(additionalCount)));
  for (let i = 0; i < wanted; i++) {
    const [category,title,summary] = additionalStorySeeds[i];
    if (seen.has(title)) throw new Error(`Duplicate story title: ${title}`);
    seen.add(title);
    const id = base.length + extra.length, color=['#ee4b42','#3156d9','#8f45bd','#078b85','#e2a424'][i%5];
    extra.push({id,title,category,summary,genres:[category[0].toUpperCase()+category.slice(1),'Drama'],color,accent:['#e88736','#6e73df','#e6588b','#60b878','#e6673f'][i%5],difficulty:['Warm-up','Messy','High stakes'][i%3],glyph:['✦','♫','◈','↗','✧'][i%5],prologue:`${title}. ${summary} You arrive at the moment when a private tension becomes public. The people already in this world have histories with one another, and your first choice will change who trusts you with the next part.`});
  }
  return [...base, ...extra];
}

export function selectFirstFollowerCandidates(cast, storyId, count = 10) {
  const people = filterCastForStory(cast, storyId);
  if (!people.length) return [];
  const arcs = ['Loyal best friend','Affectionate partner','Distant, quietly protective','Creative co-conspirator','Honest mentor','Playful rival','Steady confidant','Ambitious ally','Soft-spoken observer','Unpredictable wildcard'];
  const start = (Math.abs(Math.trunc(Number(storyId) || 0)) * 7) % people.length;
  return Array.from({length:Math.min(Math.max(0,Math.floor(count)),people.length)},(_,i)=>{
    const npc = people[(start + i) % people.length];
    return {...npc, relationshipArc:npc.relationshipArc || arcs[i % arcs.length]};
  });
}

export function buildStoryCoverDataUrl(story = {}) {
  const id = Math.max(0, Math.floor(Number(story.id) || 0));
  const palettes = [['#f07b55','#71344f','#171928'],['#397bd5','#33285e','#101927'],['#dd6b87','#632e70','#1a1628'],['#45a59a','#185269','#101b29'],['#e8ae51','#9e4b44','#20192a'],['#6683c8','#304267','#111522'],['#e77458','#45395f','#19182a'],['#71a7c7','#345470','#171d30'],['#db9860','#764b57','#171927'],['#7ca776','#355c5c','#111c26'],['#b575d0','#5b3c86','#15192a'],['#f0be66','#a35054','#20203a']];
  const [sky,mid,deep] = palettes[id % palettes.length];
  const category=String(story.category||'story').toLowerCase();
  const title=String(story.title||'').toLowerCase();
  const sceneByCategory={city:'city',startup:'startup',music:'stage',film:'film',reality:'stage',comedy:'club',fashion:'fashion',art:'gallery',campus:'campus',sports:'stadium',food:'cafe',science:'space',creator:'studio',community:'street'};
  const scene=title.includes('hollywood hearts')?'red-carpet':title.includes('city with your name')?'city-audience':sceneByCategory[category]||['coast','mountain','forest','desert','rooftop','market'][id%6];
  const seed=n=>((id*137+n*83+((id*n)%97))%997);
  const skyline=Array.from({length:16},(_,i)=>{
    const x=i*58-12,h=130+seed(i+1)%260,w=36+seed(i+40)%25,y=810-h;
    const windows=Array.from({length:4},(_,row)=>Array.from({length:2},(_,col)=>`<rect x="${x+8+col*12}" y="${y+20+row*23}" width="5" height="8" rx="1" fill="#ffdba0" opacity=".${4+seed(i+row+col)%5}"/>`).join('')).join('');
    return `<g class="scene-landmark"><path d="M${x} 820V${y+12}l${w/2} -12 ${w/2} 12v${810-y-12}Z" fill="#171b2b" opacity=".${5+seed(i)%4}"/>${windows}</g>`;
  }).join('');
  const stars=Array.from({length:24},(_,i)=>`<circle cx="${seed(i+200)}" cy="${90+seed(i+300)%410}" r="${1+seed(i+400)%3}" fill="#fff4d5" opacity=".${2+seed(i+500)%7}"/>`).join('');
  const landmarks={
    'red-carpet':`<g class="scene-landmark"><path d="M0 360 900 330v570L0 930Z" fill="#17121d"/><path d="M300 420 600 410 900 1200H0Z" fill="#b9274d"/><path d="M340 425 560 418 710 1200H205Z" fill="#ef4964"/><path d="M0 520h900M0 690h900" stroke="#e7d6bd" stroke-opacity=".35" stroke-width="13"/><g fill="#24202a"><path d="M0 420h90v450H0zm120 40h72v380h-72zm620-36h75v390h-75zm108-18h94v450h-94z"/></g><g fill="#ffe3a8"><circle cx="120" cy="300" r="13"/><circle cx="245" cy="240" r="10"/><circle cx="700" cy="265" r="14"/><circle cx="820" cy="350" r="11"/></g><g stroke="#fff1c8" stroke-opacity=".7" stroke-width="10"><path d="m120 300 80 210m45-270-60 220m515-195-90 220m210-135-100 160"/></g><text x="450" y="185" text-anchor="middle" fill="#fff0d0" font-family="sans-serif" font-weight="700" font-size="34" letter-spacing="8">AWARDS PREMIERE</text></g>`,
    'city-audience':`<g class="scene-landmark">${skyline}<path d="M0 790q450-150 900 0v410H0Z" fill="#172136"/><path d="M0 880h900" stroke="#f2c877" stroke-opacity=".55" stroke-width="9"/><path d="M345 690h210v310H345Z" fill="#253048" stroke="#f2cb8c" stroke-width="11"/><path d="M395 690v-75h110v75" fill="#e8a65f"/><circle cx="450" cy="565" r="44" fill="#d99a75"/><path d="M406 565q-3-69 46-75 52 5 46 74l-43-19Z" fill="#25202b"/><path d="M420 615h60l70 210H350Z" fill="#d8d6e3"/><path d="M0 850h900v350H0Z" fill="#131b2b" opacity=".36"/><g fill="#d89b76"><circle cx="105" cy="900" r="26"/><circle cx="205" cy="925" r="25"/><circle cx="295" cy="900" r="24"/><circle cx="610" cy="900" r="25"/><circle cx="700" cy="930" r="26"/><circle cx="800" cy="895" r="24"/></g><g fill="#34445f"><path d="M60 1200V930h90v270m55 0V955h90v245m350 0V950h95v250m55 0V925h95v275"/></g><text x="450" y="260" text-anchor="middle" fill="#fff0d0" font-family="sans-serif" font-weight="700" font-size="34" letter-spacing="8">YOUR CITY</text></g>`,
    city:skyline,
    startup:`<g class="scene-landmark" fill="#182234" opacity=".88"><path d="M70 790V390h190v400M300 790V280h240v510M590 790V430h230v360"/><path d="M100 430h130m-130 55h130m-130 55h130m-130 55h130m-130 55h130m-130 55h130m-130 55h130M340 330h160m-160 60h160m-160 60h160m-160 60h160m-160 60h160m-160 60h160" stroke="#9dd6e3" stroke-opacity=".42" stroke-width="12"/></g>`,
    stage:`<g class="scene-landmark"><path d="M0 0h180v805Q115 720 0 805ZM900 0H720v805q65-85 180 0Z" fill="#25172b" opacity=".85"/><path d="M160 0v630M740 0v630" stroke="#ffc46e" stroke-opacity=".55" stroke-width="15"/><path d="M160 670 340 155M740 670 560 155" stroke="#fff0bd" stroke-opacity=".28" stroke-width="18"/><ellipse cx="450" cy="720" rx="320" ry="78" fill="#35233d"/></g>`,
    film:`<g class="scene-landmark"><rect x="130" y="170" width="640" height="500" rx="28" fill="#161a27" stroke="#f6b66d" stroke-opacity=".65" stroke-width="16"/><rect x="180" y="220" width="540" height="400" rx="12" fill="#f2a75e" opacity=".22"/><path d="M160 115v42m85-42v42m85-42v42m85-42v42m85-42v42m85-42v42m85-42v42M160 678v42m85-42v42m85-42v42m85-42v42m85-42v42m85-42v42m85-42v42" stroke="#fff2cb" stroke-opacity=".72" stroke-width="18"/></g>`,
    campus:`<g class="scene-landmark" fill="#24243a"><path d="M90 800V490h720v310ZM60 490 450 280l390 210Z"/><path d="M160 510v260m130-260v260m130-260v260m130-260v260m130-260v260" stroke="#f4d19b" stroke-opacity=".55" stroke-width="34"/><circle cx="450" cy="280" r="34" fill="#f4d19b"/></g>`,
    stadium:`<g class="scene-landmark"><path d="M0 760Q450 210 900 760v300H0Z" fill="#20243a"/><path d="M90 720Q450 330 810 720M35 770Q450 360 865 770" fill="none" stroke="#fff2c8" stroke-opacity=".35" stroke-width="14"/><path d="M0 910h900M0 1020h900M130 800v400M770 800v400" stroke="#8ee0aa" stroke-opacity=".48" stroke-width="7"/><circle cx="450" cy="1020" r="160" fill="none" stroke="#8ee0aa" stroke-opacity=".42" stroke-width="7"/><path d="M90 220 260 700M810 220 640 700" stroke="#fff4c8" stroke-opacity=".55" stroke-width="30"/></g>`,
    cafe:`<g class="scene-landmark"><path d="M80 780V260q0-120 120-120h500q120 0 120 120v520Z" fill="#172332" stroke="#ffd298" stroke-opacity=".62" stroke-width="18"/><path d="M450 145v635M110 475h680" stroke="#ffd298" stroke-opacity=".55" stroke-width="16"/><path d="M250 860h400M315 860v120m270-120v120M290 980h320" stroke="#4c2937" stroke-width="24"/><path d="M390 825q0-60 60-60t60 60" fill="#f5bc75" opacity=".7"/></g>`,
    space:`<g class="scene-landmark"><circle cx="680" cy="480" r="190" fill="#d588ad" opacity=".56"/><circle cx="625" cy="430" r="190" fill="${deep}" opacity=".9"/><circle cx="220" cy="600" r="76" fill="#edbd68" opacity=".75"/><ellipse cx="220" cy="600" rx="152" ry="46" fill="none" stroke="#ffe8b2" stroke-opacity=".65" stroke-width="9" transform="rotate(-24 220 600)"/><path d="M0 910q240-110 460 0t440 0v290H0Z" fill="#131a2c"/></g>`,
    gallery:`<g class="scene-landmark"><path d="M70 790V170h760v620" fill="#19202d" stroke="#f3ca92" stroke-opacity=".55" stroke-width="14"/><rect x="125" y="260" width="180" height="265" fill="#db8b67" stroke="#ffe4b0" stroke-width="12"/><rect x="360" y="210" width="180" height="315" fill="#526f9f" stroke="#ffe4b0" stroke-width="12"/><rect x="595" y="285" width="180" height="240" fill="#8e577f" stroke="#ffe4b0" stroke-width="12"/><path d="M100 790h700" stroke="#ffe4b0" stroke-opacity=".55" stroke-width="18"/></g>`,
    studio:`<g class="scene-landmark"><circle cx="450" cy="415" r="230" fill="none" stroke="#ffd28b" stroke-opacity=".75" stroke-width="22"/><circle cx="450" cy="415" r="184" fill="#17202c"/><path d="M100 780 260 600h380l160 180" fill="#29334a"/><rect x="360" y="335" width="180" height="120" rx="18" fill="#111522" stroke="#f8d698" stroke-width="10"/><circle cx="450" cy="395" r="39" fill="#8db6d2"/></g>`,
    club:`<g class="scene-landmark"><path d="M0 700Q450 540 900 700v500H0Z" fill="#25192d"/><path d="M160 600V300h580v300" fill="none" stroke="#ff718e" stroke-width="20"/><circle cx="450" cy="440" r="140" fill="#f5a854" opacity=".22"/><path d="M170 820h180m200 0h180M220 920h160m140 0h160" stroke="#f2bd77" stroke-opacity=".75" stroke-width="18"/></g>`,
    street:`<g class="scene-landmark"><path d="M0 790V450h170v340m560 0V370h170v420" fill="#1c2535"/><path d="M40 450 170 330l130 120m430-80 130-130 130 130" fill="#253148"/><path d="M40 470h250M610 390h250" stroke="#ffd58e" stroke-width="14"/><path d="M75 390q150-250 300 0m150 0q150-250 300 0" fill="none" stroke="#ffca7b" stroke-opacity=".78" stroke-width="9"/><circle cx="225" cy="400" r="12" fill="#fff1be"/><circle cx="675" cy="400" r="12" fill="#fff1be"/></g>`,
    coast:`<g class="scene-landmark"><path d="M0 690q170-70 330 0t330 0 240 0v510H0Z" fill="#186578"/><path d="M0 820q170-75 330 0t330 0 240 0M0 940q170-75 330 0t330 0 240 0" fill="none" stroke="#a7e3dc" stroke-opacity=".65" stroke-width="18"/><path d="M0 720 280 500 480 720M620 720 790 430 900 700" fill="#26364a"/></g>`,
    mountain:`<g class="scene-landmark"><path d="M0 840 220 440l130 190 170-370 210 400 90-155 180 335Z" fill="#25314a"/><path d="m450 260 70 134-74-39-60 42Zm-230 180 54 91-64-29-36 32Zm510 56 45 78-52-25-29 26Z" fill="#f8e6c8" opacity=".76"/></g>`,
    forest:`<g class="scene-landmark">${Array.from({length:12},(_,i)=>{const x=i*84-20,h=260+seed(i+63)%230;return `<path d="M${x} 860 ${x+44} ${860-h} ${x+88} 860Z" fill="#183b3b" opacity=".${5+seed(i+77)%5}"/><rect x="${x+38}" y="840" width="12" height="90" fill="#3b302e"/>`}).join('')}<path d="M0 920q210-100 450 0t450 0v280H0Z" fill="#142f32"/></g>`,
    desert:`<g class="scene-landmark"><path d="M0 750q200-240 450 0t450 0v450H0Z" fill="#be704e"/><path d="M0 900q260-280 560 0t340 0v300H0Z" fill="#8e4c4a"/><path d="M0 1035q240-110 480 0t420 0" fill="none" stroke="#f1b873" stroke-opacity=".55" stroke-width="10"/><path d="M720 680v-150m-45 150h90m-110-60h130m-110-55h90" stroke="#272635" stroke-width="17"/></g>`,
    rooftop:`<g class="scene-landmark"><path d="M0 670 220 490h220V300h200v370h260v530H0Z" fill="#222338"/><path d="M0 740h900" stroke="#f4c77f" stroke-opacity=".42" stroke-width="10"/><path d="M120 590V360m0 0 100 130m-100-130-85 160" stroke="#181b29" stroke-width="25"/><path d="M560 570h200v165H560Z" fill="#324361" stroke="#e9bc79" stroke-width="8"/></g>`,
    market:`<g class="scene-landmark"><path d="M80 780V400h740v380" fill="#202436"/><path d="M45 400 170 230l125 170m-20 0 125-170 125 170m-20 0 125-170 125 170" fill="#bc6655"/><path d="M150 500h600M150 600h600" stroke="#f6cb8b" stroke-opacity=".54" stroke-width="12"/><circle cx="230" cy="680" r="34" fill="#df9860"/><circle cx="450" cy="680" r="34" fill="#86b982"/><circle cx="670" cy="680" r="34" fill="#e1b258"/></g>`
  };
  const landmark=landmarks[scene]||landmarks.city;
  const people=`<g class="story-figure"><ellipse cx="450" cy="1160" rx="245" ry="44" fill="#080b14" opacity=".6"/><path d="M318 1170q-13-178 18-289 23-81 108-85 88 4 113 85 29 111 18 289Z" fill="#111522"/><circle cx="443" cy="745" r="79" fill="#d89975"/><path d="M367 750q-15-114 75-131 86 10 78 126-25-38-68-48-39 35-85 53Z" fill="#211c28"/><path d="M442 862q-125 98-162 286M462 864q105 88 166 284" fill="none" stroke="#d89975" stroke-width="28" stroke-linecap="round"/><path d="m405 878-62 286m143-286 61 286" stroke="#263047" stroke-width="35"/></g><g class="story-figure" opacity=".78" transform="translate(-165 60) scale(.75)"><circle cx="443" cy="745" r="67" fill="#bc805f"/><path d="M377 747q-8-98 66-112 79 12 70 113-26-33-64-42-36 29-72 41Z" fill="#181722"/><path d="M354 1160q-8-194 30-277 23-69 80-74 69 5 87 74 28 83 18 277Z" fill="#25243a"/></g>`;
  const ground=scene==='stadium'?'<path d="M0 900h900v300H0Z" fill="#214d3e" opacity=".8"/>':scene==='coast'?'<path d="M0 900h900v300H0Z" fill="#31534d"/>':scene==='cafe'||scene==='club'||scene==='gallery'||scene==='studio'?'<path d="M0 875h900v325H0Z" fill="#241e2b" opacity=".88"/>':'<path d="M0 875q230-105 450 0t450 0v325H0Z" fill="#151c2a" opacity=".75"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" data-art="story-scene" data-scene="${scene}"><defs><linearGradient id="sky" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="${sky}"/><stop offset=".5" stop-color="${mid}"/><stop offset="1" stop-color="${deep}"/></linearGradient><radialGradient id="sun"><stop stop-color="#ffe4a4" stop-opacity=".95"/><stop offset="1" stop-color="#ffba78" stop-opacity="0"/></radialGradient><linearGradient id="road" x2="0" y2="1"><stop stop-color="#394058"/><stop offset="1" stop-color="#111522"/></linearGradient></defs><rect width="900" height="1200" fill="url(#sky)"/>${stars}<circle cx="${175+seed(9)%560}" cy="${300+seed(10)%220}" r="270" fill="url(#sun)"/><circle cx="${175+seed(9)%560}" cy="${300+seed(10)%220}" r="73" fill="#ffe2a1" opacity=".92"/>${landmark}${ground}<path d="M330 900h240l330 300H0Z" fill="url(#road)" opacity=".${scene==='city'||scene==='startup'?8:4}"/>${scene==='city'||scene==='startup'?'<path d="M439 915h22l28 285h-78Z" fill="#f8d898" opacity=".35"/>':''}${people}<path d="M0 0h900v1200H0Z" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="3"/><text x="48" y="68" fill="#fff" fill-opacity=".68" font-family="sans-serif" font-size="20" letter-spacing="5">FAMOUS  ·  STORY ${String(id+1).padStart(3,'0')}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Kept for optional remote previews; story picker art uses local premise-specific scenes.
export function buildStoryCoverPhotoUrl(story = {}, width = 900, height = 1200) {
  const id = Math.max(0, Math.floor(Number(story.id) || 0));
  const safeWidth = Math.max(240, Math.min(1600, Math.floor(Number(width) || 900)));
  const safeHeight = Math.max(320, Math.min(2000, Math.floor(Number(height) || 1200)));
  return `https://picsum.photos/id/${id + 1}/${safeWidth}/${safeHeight}.webp`;
}

export function uniqueMediaPool(...groups) {
  return [...new Set(groups.flatMap(group => Array.isArray(group) ? group : []).filter(item => typeof item === 'string' && item.length > 0))];
}

export function buildCommonsSearchUrl(query, { kind = 'image', page = 1, pageSize = 24 } = {}) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  const safePageSize = Math.max(1, Math.min(50, Math.trunc(pageSize) || 24));
  url.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: `${cleanText(query, 160).trim()} filetype:${['video','audio'].includes(kind) ? kind : 'bitmap'}`,
    gsrnamespace: '6', gsrlimit: String(safePageSize), gsroffset: String((Math.max(1, Math.trunc(page) || 1) - 1) * safePageSize),
    prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '720', format: 'json', origin: '*',
  }).toString();
  return url.toString();
}

const metadataText = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const httpsUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : ''; } catch { return ''; }
};

export function normalizeCommonsResults(payload) {
  const pages = payload?.query?.pages;
  if (!isRecord(pages)) return [];
  return Object.values(pages).flatMap(page => {
    const info = page?.imageinfo?.[0];
    if (!info) return [];
    const url = httpsUrl(info.url);
    const thumbnail = httpsUrl(info.thumburl) || url;
    if (!url || !thumbnail) return [];
    const metadata = info.extmetadata || {};
    const mime = String(info.mime || '').toLowerCase();
    const mediaType = mime.startsWith('audio/') || /\.(mp3|wav|ogg|oga|flac|m4a)(?:$|\?)/i.test(url) ? 'audio' : mime.startsWith('video/') || /\.(webm|mp4|ogv)(?:$|\?)/i.test(url) ? 'video' : 'image';
    if (mediaType === 'audio' && !/\.(mp3|wav|m4a)(?:$|\?)/i.test(url) && !/audio\/(mpeg|mp4|wav|x-wav)/.test(mime)) return [];
    return [{
      title: metadataText(page.title).replace(/^File:/, ''), url, thumbnail, mediaType,
      creator: metadataText(metadata.Artist?.value || metadata.Credit?.value || 'Unknown creator'),
      license: metadataText(metadata.LicenseShortName?.value || 'License details on source page'),
      licenseUrl: httpsUrl(metadata.LicenseUrl?.value),
      attribution: metadataText(metadata.Artist?.value || metadata.Credit?.value || 'Wikimedia Commons creator'),
      foreign_landing_url: httpsUrl(info.descriptionurl) || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
    }];
  }).slice(0, 50);
}

export async function fetchMediaResults(fetcher, query, { kind = 'image', page = 1, signal } = {}) {
  const fetchJSON = async url => {
    const response = await fetcher(url, { headers: { Accept: 'application/json' }, signal });
    if (!response?.ok) throw new Error(`Catalog returned ${response?.status ?? 'an error'}.`);
    return response.json();
  };
  const searchCommons = async () => {
    const payload = await fetchJSON(buildCommonsSearchUrl(query, { kind: ['video','audio'].includes(kind) ? kind : 'image', page }));
    const results = normalizeCommonsResults(payload).filter(item => item.mediaType === kind);
    return { source: 'Wikimedia Commons', results };
  };
  if (kind === 'video') return searchCommons();
  const endpoint = kind === 'audio' ? 'audio' : 'images';
  const openverseURL = new URL(`https://api.openverse.org/v1/${endpoint}/`);
  openverseURL.searchParams.set('q', query);
  openverseURL.searchParams.set('page_size', '24');
  openverseURL.searchParams.set('page', String(Math.max(1, Math.trunc(page) || 1)));
  openverseURL.searchParams.set('format', 'json');
  try {
    const payload = await fetchJSON(openverseURL.toString());
    const results = Array.isArray(payload?.results) ? payload.results : [];
    if (results.length) return { source: 'Openverse', results: results.map(item => ({ ...item, thumbnail: item.thumbnail || item.url, mediaType: kind === 'audio' ? 'audio' : 'image' })) };
    if (kind === 'audio') return searchCommons();
  } catch (error) {
    if (kind === 'audio') return searchCommons();
  }
  return searchCommons();
}
