# Weaver Arena

An original, browser-based custom monster battle laboratory. Separate from Empyrios/weave. No match-3 or Weave game systems, Pokémon characters, assets, copied simulator code, or paid services.

## Open and play

Production: https://weaver-arena.empyrias.chatgpt.site (owner-private).

1. Open Creature Studio and create or edit a creature. Select its learnset and optional abilities.
2. Use Move Workshop for custom moves and reusable effect blocks.
3. In Team Builder, create a team, choose creatures, equip up to four unique moves, and set level/training.
4. Open Battle, select the team, format, AI difficulty and seed, then start.
5. Use Type Chart to edit offensive interactions, including resistances and immunities.
6. Export your content regularly from Data & Replays. Data is saved in this browser's IndexedDB and does not sync between devices.

Six original example creatures and their vector placeholder sprites are included. Custom raster uploads accept PNG/JPEG/WebP/GIF up to 2 MB each. Creature exports include their rules dependencies; full-content imports replace the current arena, while creature imports merge rules by ID. Team-only imports require the referenced creatures to exist. Make a backup before importing a pack. Evolution relationships are descriptive metadata; they do not transform creatures during battle.

## Setup

Node.js 22 or newer, npm, and Python 3 for the optional simple preview server:

```sh
npm ci
npm test
npm run build
npm run serve
```

Open http://localhost:3000. The build is a dependency-free static web application. TypeScript is the only development dependency; no runtime third-party libraries are used. Fonts optionally load from Google Fonts, with system-font fallbacks. The production engine and app work without that font request.

```sh
npm run benchmark
```

This simulates seeded AI matches and writes `docs/ai-benchmark.json`.

## Deployment

Serve the contents of `dist/` over HTTPS on any static host. No persistent game server is present or required for local AI games. `.openai/hosting.json` is for the existing private deployment only; remove it when deploying independently.

For GitHub Pages, push this project to a **new** `Empyrios/weaver-arena` repository. In Settings > Pages choose GitHub Actions. The included `.github/workflows/pages.yml` builds, tests and publishes `dist/`. Relative asset paths work under `/weaver-arena/`. The workflow grants Pages permissions only to its deployment job. The included `ci.yml` runs engine tests for pull requests.

Do not enable Pages or make a private repository public unless you want its game build accessible to visitors. The actual game does not include credentials, backend access, accounts or analytics.

## Architecture

- `src/model.ts`: versioned JSON content contracts; move-effect allowlist; format and team validation. Unknown effect kinds are rejected. No eval, scripts or executable user hooks.
- `src/data.ts`: original editable starter content.
- `src/engine.ts`: DOM-free deterministic rules engine. `createBattle`, `legalActions`, `step`, `ai`, and `replay` work in browsers or Node. Updates return new state; immutable rule snapshots are shared between turns.
- `src/storage.ts`: IndexedDB persistence, with migration of the early localStorage save.
- `src/app.ts`: responsive editor, collection, team builder, battle interface, imports and playback.
- `public/sprites`: independently drawn SVG example artwork. Uploaded SVG is deliberately not accepted.
- `tests`: deterministic mechanics tests and reproducible AI benchmarks.
- `docs/RULES.md`: exact stat and battle rules.
- `docs/ONLINE.md`: server architecture and outstanding online work.

The interface initially renders at most 48 creature cards and loads more on request. Species IDs are stable opaque identifiers; display names and types can change. Thousands of creature definitions are representable without changing source. There has not been a production-scale load test of thousands of uploaded sprites; device storage quota still applies. Battle snapshots currently include the arena's entire content pack, so replay files grow with the collection. This is an optimisation target before very large competitive communities.

## Supported v0.1

Custom creature CRUD, duplication and portable exports; raster sprite uploads; lore/tags/evolution metadata; base stats; custom move effects; types and effectiveness matrix; ability templates; multiple saved teams; four equipped moves; levels and training; format restrictions; singles AI battles; switching and forced replacements; PP/fallback; status and stages; damage, accuracy, priority, criticals and STAB; victory/defeat/draw; deterministic seed; replay export/import and decision-by-decision playback.

Abilities use three supported activation templates: entry heal/boost, turn-end heal/boost, incoming-damage resistance with an optional type condition. More complex event conditions are not implemented. Format editor supports singles only, 1 to 6 team members, bans, level/BST caps, duplicate clause, STAB and critical multipliers. Teams may contain fewer than the cap. There is no team-lead selection screen: the first saved member starts.

## AI limitations and measurement

Beginner chooses a seeded pseudo-random legal action. Intermediate scores expected damage. Advanced also considers healing, status, stages and defensive switching. Expert evaluates candidate actions through one deterministic turn against an Advanced response, including switching and abilities through the engine. This is shallow perfect-information search, not a proven strongest competitive agent. `docs/ai-benchmark.json` reports actual results, not inferred difficulty strength. No ladder or strength guarantee is implied by the labels.

## Research and licences

Architecture research, accessed 2026-11-03:

- https://github.com/smogon/pokemon-showdown/blob/master/ARCHITECTURE.md : separate client, server and simulation modules.
- https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md : simulator input/output protocol.
- https://github.com/smogon/pokemon-showdown : server distributed under MIT.
- https://github.com/smogon/pokemon-showdown-client/blob/master/LICENSE : client uses AGPL v3.
- https://github.com/pkmn/engine : MIT, highly compatible Pokémon simulation; first-class custom data/mods and format enforcement are out of scope there.

These projects informed architectural decisions only. No source was copied or linked. This implementation is original and MIT licensed. It is not affiliated with Pokémon or Pokémon Showdown. User-imported artwork remains subject to its owner's rights.

## Known unfinished work

No online multiplayer, socket server, server authentication, private challenge links, accounts, spectators, ranked ratings, tournaments or cloud save sync. No doubles, items, weather, hazards, protection, multi-hit attacks, transformed forms, full competitive ability DSL or deeper search. UI animations are simple sprite float/entrance and bars, not cinematic move effects. Ability/type/move deletion interfaces are not present, although complete packs remain editable through validated import. Local games are not restored after a browser reload; exported replays restore finished or partial games for playback. Ongoing battle state stays in memory.

## Verification

See `docs/TESTING.md` for concrete automated and browser results. `npm test` compiles in strict TypeScript mode before running Node's test runner.
