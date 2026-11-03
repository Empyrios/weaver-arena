# Future authoritative multiplayer boundary

The current build is explicitly local human-vs-AI. No online functionality is simulated or presented as connected.

The DOM-free engine is the shared domain layer. A future Node or Worker room service will own a Battle instance, not accept state from a client, and use the same `createBattle`, `validateTeam`, `legalActions` and `step` functions.

Required before enabling network play:

1. Authenticated player-to-room assignment. Clients may send only their own side's command, a battle ID, rules revision and monotonically increasing decision sequence. Never accept client-supplied side, HP, RNG state, damage, winner, format or creature definitions after room creation.
2. Validate schema, membership, turn/sequence, legal action and submission deadline. Reject duplicate, stale and invalid actions without advancing simulation. Lock each submitted command until both are received. Do not reveal an opponent's current action before both submissions are committed.
3. Server-owned entropy for a hidden battle seed. Commit to a seed hash before play if fairness verification is desired; publish the seed with completed replays. Never send the running PRNG state to players.
4. Resolve `step` on the server and send redacted player/spectator views. The current browser Battle object exposes all content, PP, HP, choices and RNG and is unsuitable as a network payload. Do not reuse it as public room state.
5. Durable room snapshots, replay command records and engine version identifiers. Concurrency control ensures one resolution per decision sequence. Resume after disconnect with timeouts and authoritative clocks.
6. Rate limiting, pack size limits, server-side content and image validation, safe image hosting, request limits and abuse moderation. Private challenge tokens must be unguessable and expire.
7. Separate rated formats with immutable published content revisions; server-calculated ratings, match results and audit logs. Unrestricted user packs cannot affect the rated ladder.

Hosting options can be evaluated at Phase 3. GitHub Pages hosts the static client only, not an authoritative persistent match service. No paid infrastructure has been provisioned. The Site used for this MVP also serves only static content.
