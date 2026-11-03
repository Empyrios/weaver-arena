# Verification report

Verified 2026-11-03 in the build environment. No online-service tests are claimed.

## Automated

`npm test`: strict TypeScript compilation, followed by 25 passing Node tests, zero failures.

Coverage: starter schema and team legality; identical seeded outcomes; nonmutating updates; illegal command rejection; priority before Speed; PP and damage; dual-type multiplication and immunity; same-type bonus; physical burn penalty; paralysis Speed penalty; poisoning and residual damage; capped healing; switching stage reset and entry abilities; forced replacement without free attacks; no-PP fallback; exact replay reconstruction; unsafe/invalid effect and stat rejection; format caps and training; custom species and type without source edits; legal decisions and termination for all four AI policies; sleep PP; resistance immunity; evolution cycles; externally supplied format validation; 1,000 additional custom species validating and battling.

`npm run benchmark`: 240 complete AI matches, six matchups of 40 matches. Seeds 100 to 139, alternating the challenger side, fixed example teams in forward/reverse order. Results in `ai-benchmark.json`:

| Challenger | Opponent | Wins | Losses | Draws |
|---|---|---:|---:|---:|
| Intermediate | Beginner | 40 | 0 | 0 |
| Advanced | Beginner | 40 | 0 | 0 |
| Expert | Beginner | 40 | 0 | 0 |
| Advanced | Intermediate | 39 | 1 | 0 |
| Expert | Intermediate | 40 | 0 | 0 |
| Expert | Advanced | 35 | 5 | 0 |

These results measure this specific sample, not general competitive strength. Custom types, stats and effects can change the ordering. No confidence claims or ladder ratings are inferred.

## Browser checks

Desktop Chromium:

- Opened the home screen and original example collection.
- Opened the creature creator, entered a name/lore, saved a new creature and verified it remained after reload.
- Created a team, selected that custom creature, saved the team and launched a battle.
- Selected moves across three turns; observed PP use, super-effective damage, HP loss, fainting and victory.
- Created a special move and added a structured freeze secondary effect, saved it and verified its listing.
- Verified example SVG artwork renders.

Phone-sized Chromium frame, 390 × 844 CSS pixels:

- Inspected responsive overview and navigation.
- Started a six-creature battle and selected a move.
- Observed move controls, team switching buttons, PP, HP and turn updates at mobile width.

This is simulated mobile width, not a physical Android/iOS test. Uploaded raster images, file downloads/imports and replay playback have code-level validation and engine replay tests but were not all exercised end-to-end through browser file dialogs. IndexedDB save paths were exercised by saving the custom move after migration.

## Limitations

No production-scale sprite-storage or concurrency tests. No network play exists to test. Browser battle state is intentionally memory-only; content is durable locally. Full content exports are needed to transfer between devices or origins. A browser reload resets the active battle.
