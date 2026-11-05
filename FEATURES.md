# FAMOUS feature inventory

## Story selection

1. 200 story setups total: 60 existing openings plus 140 additional distinct premises across 14 story worlds. Procedural covers are generated for each catalog entry; the full branch scripts are not individually authored for all 200.
2. Search stories by title, category, or premise.
3. Category filters with a visible selected state.
4. Paginated story browsing.
5. Story difficulty labels.
6. Story premise previews before selection.
7. A story-specific cover illustration, color, and glyph per story card.
8. Per-story chapter context and story summary.

## Character and social identity

9. Character name, handle, and short bio setup.
10. Edit identity after starting.
11. Character initials avatar.
12. Personal profile with posts, stats, badges, and settings tabs.
13. Switch to a new story from the profile.
14. Fictional 100,000-identity NPC roster generated lazily, with unique display names/handles, five-axis personality keys, story-bound roles, and distinct deterministic SVG portraits.
15. Follow/connect with cast members.
16. Friendship state and friend count.
17. Story viewer for cast members.
18. Story replies can open a friendship.

## Social feed

19. Feed page with generated fictional character posts.
20. Create text posts.
21. Create story updates.
22. Create short-form reel entries.
23. Like/unlike feed posts.
24. Bookmark/unbookmark posts.
25. Copy post text to share.
26. Add user-authored comments.
27. Simulated cast replies with variable response probability.
28. Reaction counts and names.
29. Post time labels and author identity.
30. Empty-state prompts for a new feed.
31. Branded post artwork generated from local CSS, with no external image dependency.
32. Inline post composer.

## Reels and open board

33. A daily-style reel challenge prompt.
34. React to a challenge with two distinct choices.
35. Challenge reactions change fame and stress differently.
36. Create original reel captions.
37. Opinion board for longer thoughts and questions.
38. Board post headlines and body copy.
39. Board agreement reactions.
40. Board replies with occasional fictional disagreement or support.
41. Hot, new, questions, and unpopular board sorting controls.
42. Board etiquette guide.

## Story game and progression

43. Branching chapter decisions.
44. Thirty-one authored chapter dilemmas: 17 shared and 14 category-specific, each with three choices (93 distinct scripted choice options in the content library). Each story gets 18 unique dilemmas before the shared event sequence cycles.
45. Chapter scenarios continue beyond the opening five instead of immediately repeating.
46. Choice logs retain chapter and character context for relationship-aware future events.
47. NPC comments select from topic-aware dialogue banks for apologies, collaboration, burnout, sponsorships, creative work, attention, music, food, art, and sports.
48. NPC tone shifts based on friendship and rivalry state.
50. A chapter event tailored to each of the 14 story categories, including music, fashion, startup, film, art, campus, sports, creator, food, community, city, science, overnight fame, and reality stories.
45. Choice-dependent fame, aura, wealth, trust, and stress changes.
46. Choice-dependent cast relationships.
47. Public feed posts created by pivotal choices.
48. Chapter/day progression.
54. Reputation meters and numeric score display.
55. Character rivalry/relationship tracking fields.
56. Eight action missions with progress tracking.
57. Mission rewards that add reputation/resources.
58. Achievement badges for first actions and milestones.
59. Trends panel and community tags.
60. Story event log saved with the game.

## Messaging, privacy, and device support

61. Fictional direct-message inbox.
62. Multiple character conversations.
63. User-written messages and local character replies.
64. Conversation history saved locally.
65. Autosave in browser local storage.
66. Export a save to JSON.
67. Restore a save from JSON.
68. Reset run with confirmation.
69. Play-help dialog and clear fictional-cast notice.
70. Optional synthesized, subtle sound cue toggle.
71. Responsive desktop, tablet, and mobile layouts.
72. Installable PWA manifest and offline app-shell cache.
73. Capacitor Android project configuration and build instructions.
74. Keyboard focus styling and Escape-to-close modals.
75. Reduced-motion support.
76. Curated, category-matched stock-photo library for NPC avatars, posts, board entries, and stories.
77. NPC stock-photo loading uses direct Unsplash CDN image references and requires a network connection.
78. One player-selected photo or video attachment on posts, stories, reels, and board entries.
79. Upload preview before publishing, media type checks, and size caps (8 MB photo / 20 MB video).
80. Player media files stored as blobs in this device's IndexedDB, separate from small JSON save data.
81. Inline image display and browser-native video controls in feed, story, and board views.
82. Every player post gets a scripted NPC comment; a second comment is probabilistic.
83. Threaded comments and nested replies on feed posts and board topics.
84. NPC replies to player comments are probabilistic and appear in the conversation thread.
85. Replies and likes change fame, aura, and trust game stats.
86. Reply directly to a cast member's story, which opens a local DM conversation.
87. NPC labels and notices make the simulated cast distinct from real users.

## Honest demo boundary

The story content and characters are original demo content. Reactions are local game logic with randomness; there is no AI model call, live user, account, backend database, public posting, cloud sync, moderation service, or external social network connection. Stats and mission completions are game state, not real-world measures. Player media is local to the current browser; stock photos require an internet connection.
