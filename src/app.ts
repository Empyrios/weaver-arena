import { Data, Creature, Move, Team, Format, Ability, STATS, Stat, Effect, uid, member, validateData, validateTeam } from './model.js';
import { starter } from './data.js';
import { loadContent, saveContent } from './storage.js';
import { Battle, Action, Difficulty, createBattle, step, ai, active, species, getMove, effectiveness, replay, legalActions } from './engine.js';
let data: Data = starter();
let storageError = '';
try {
    const parsed = await loadContent() || JSON.parse(localStorage.getItem('weaver-arena-v1') || 'null');
    if (parsed && !validateData(parsed).length)
        data = parsed;
}
catch {
    storageError = 'Persistent storage is unavailable. Export your work before leaving.';
}
let collectionLimit = 48;
let page = 'home', editId = '', search = '', typeFilter = '', battle: Battle | null = null, difficulty: Difficulty = 'intermediate', teamId = data.teams[0]?.id || '', formatId = 'standard', background = 'garden', replayIndex = -1, replayRecord: Battle | null = null;
const app = document.querySelector<HTMLDivElement>('#app')!;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const findC = (id: string) => data.creatures.find(x => x.id === id)!;
const color = (c: Creature) => data.types.find(t => t.id === c.types[0])?.color || '#c4e890';
const builtins = new Set(['velmora', 'cindervex', 'briarune', 'slatehorn', 'aerolith', 'noctelle']);
const sprite = (c: Creature) => `<div class="sprite" style="--c:${color(c)}">${(c.image || builtins.has(c.id)) ? `<img alt="${esc(c.name)}" src="${esc(c.image || 'sprites/' + c.id + '.svg')}">` : esc(c.glyph || '◈')}</div>`;
const badges = (c: Creature) => c.types.map(id => { const t = data.types.find(x => x.id === id)!; return `<span class="tag" style="--c:${t.color}">${esc(t.icon)} ${esc(t.name)}</span>`; }).join('');
const options = (items: {
    id: string;
    name: string;
}[], selected: string, blank = false) => `${blank ? '<option value="">None</option>' : ''}${items.map(x => `<option value="${esc(x.id)}" ${x.id === selected ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}`;
const field = (label: string, name: string, value: unknown, type = 'text', attrs = '') => `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
const select = (label: string, name: string, items: {
    id: string;
    name: string;
}[], value: string, blank = false) => `<label>${label}<select aria-label="${esc(label)}" name="${name}">${options(items, value, blank)}</select></label>`;
const notify = (msg: string) => { const el = document.querySelector<HTMLDivElement>('#toast')!; el.textContent = msg; el.style.display = 'block'; setTimeout(() => el.style.display = 'none', 4500); };
async function persist() { const errors = validateData(data); if (errors.length)
    throw Error(errors.join('; ')); await saveContent(data); }
async function transaction(fn: () => void) { const backup = structuredClone(data); try {
    fn();
    await persist();
}
catch (e) {
    data = backup;
    throw e;
} }
function download(name: string, value: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
const icons: Record<string, string> = { home: '◈', battle: '⚔', creatures: '◇', teams: '▦', moves: '✦', types: '◎', abilities: '⌘', formats: '☷', data: '↥' };
const names: Record<string, string> = { home: 'Overview', battle: 'Battle', creatures: 'Creature Studio', teams: 'Team Builder', moves: 'Move Workshop', types: 'Type Chart', abilities: 'Abilities', formats: 'Formats', data: 'Data & Replays' };
function stats(c: Creature) { return STATS.map(s => `<div class="statline"><span>${s.toUpperCase()}</span><div class="track"><i style="width:${c.stats[s] / 255 * 100}%"></i></div><b>${c.stats[s]}</b></div>`).join(''); }
function card(c: Creature) { return `<article class="card" style="--c:${color(c)}">${c.example ? '<span class="example">EXAMPLE</span>' : ''}<div class="creature-art">${sprite(c)}</div><div class="row between"><h3>${esc(c.name)}</h3><span class="muted small">${Object.values(c.stats).reduce((a, b) => a + b, 0)} BST</span></div>${badges(c)}<p class="muted small">${esc(c.description.slice(0, 85))}</p><button data-edit="${c.id}">Edit creature ↗</button></article>`; }
function home() { return `<div class="hero"><div class="hero-copy"><div class="eyebrow">Your creatures. Your rules.</div><h2>A new kind<br>of arena.</h2><p>Create something original. Build a team, shape the rules, and put your ideas to the test in turn-based battles.</p><div class="row"><button class="primary" data-nav="battle">Enter the arena ↗</button><button data-new="creatures">Create a Weaver</button></div></div><div class="hero-art">${sprite(data.creatures[0] || starter().creatures[0])}</div></div><div class="grid">${[['Creature Studio', `${data.creatures.length} creatures in your collection`, 'creatures', '◇'], ['Team Builder', `${data.teams.length} teams ready to customise`, 'teams', '▦'], ['Rules Laboratory', `${data.types.length} types. Endless possibilities.`, 'types', '◎']].map(([title, desc, nav, icon]) => `<article class="panel"><div class="eyebrow">${icon} ${title}</div><p class="muted">${desc}</p><button data-nav="${nav}">Open ${title} ↗</button></article>`).join('')}</div><div class="row between section-title"><h3>The first expedition</h3><span class="muted small">Original examples · fully editable</span></div><div class="grid">${data.creatures.slice(0, 6).map(card).join('')}</div>`; }
function creatureEditor() {
    const c = editId && editId !== 'new' ? findC(editId) : { id: uid(), name: 'New Weaver', description: '', types: [data.types[0].id], stats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 }, moves: data.moves.slice(0, 4).map(m => m.id), abilities: [], image: '', glyph: '◈', tags: '', parent: '', example: false } as Creature;
    return `<form id="creature-form" data-id="${c.id}" class="editor"><div class="panel"><div class="row between"><h3>Identity & lore</h3><button type="button" data-nav="creatures">← Collection</button></div><div class="form-grid">${field('Creature name', 'name', c.name)}${field('Symbol / placeholder', 'glyph', c.glyph)}<label class="full">Description & lore<textarea name="description">${esc(c.description)}</textarea></label>${select('Primary type', 'type1', data.types, c.types[0])}${select('Secondary type', 'type2', data.types, c.types[1] || '', true)}${field('Tags / categories', 'tags', c.tags)}${select('Evolves from', 'parent', data.creatures.filter(x => x.id !== c.id), c.parent, true)}<label class="full">Custom sprite (PNG, JPEG, WebP or GIF, up to 2 MB)<input id="sprite-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><label class="check full"><input name="clearImage" type="checkbox"> Remove current image</label></div><h3>Base statistics <span class="muted small" id="bst">BST ${Object.values(c.stats).reduce((a, b) => a + b, 0)}</span></h3><div class="stats">${STATS.map(s => field(s.toUpperCase(), s, c.stats[s], 'number', 'min="1" max="255" required')).join('')}</div><h3>Learnset</h3><p class="muted small">Select available moves. Equip up to four per creature in Team Builder.</p><div class="form-grid">${data.moves.map(m => `<label class="check"><input name="learnset" type="checkbox" value="${m.id}" ${c.moves.includes(m.id) ? 'checked' : ''}>${esc(m.name)}</label>`).join('')}</div><h3>Available abilities</h3>${data.abilities.map(a => `<label class="check"><input name="abilities" type="checkbox" value="${a.id}" ${c.abilities.includes(a.id) ? 'checked' : ''}>${esc(a.name)} <span class="muted small">${esc(a.description)}</span></label>`).join('')}<div class="actions"><button class="primary">Save creature</button>${editId && editId !== 'new' ? `<button type="button" data-duplicate="${c.id}">Duplicate</button><button type="button" data-export-creature="${c.id}">Export</button><button type="button" data-delete="${c.id}" class="danger">Delete</button>` : ''}</div></div><aside class="panel editor-preview"><div class="eyebrow">Creature preview</div><div class="creature-art">${sprite(c)}</div><h2>${esc(c.name)}</h2>${badges(c)}${stats(c)}<p class="muted small">Level and competitive training are configured per team slot.</p></aside><input type="hidden" name="image" value="${esc(c.image)}"></form>`;
}
function creatures() { return `<div class="toolbar"><input id="search" aria-label="Search creatures" placeholder="Search creatures, tags, abilities…" value="${esc(search)}"><select id="type-filter" aria-label="Filter type">${options([{ id: '', name: 'All types' }, ...data.types], typeFilter)}</select><select id="stat-sort" aria-label="Sort statistics"><option value="name">Name</option>${STATS.map(s => `<option value="${s}">${s.toUpperCase()} descending</option>`).join('')}<option value="bst">BST descending</option></select><button class="primary" data-new="creatures">+ New creature</button></div><div class="grid" id="collection">${filteredCreatures().slice(0, collectionLimit).map(card).join('')}</div>${filteredCreatures().length > collectionLimit ? '<div class="actions"><button id="more-creatures">Load 48 more creatures</button></div>' : ''}`; }
function filteredCreatures() { return data.creatures.filter(c => (!typeFilter || c.types.includes(typeFilter)) && [c.name, c.tags, ...c.abilities.map(id => data.abilities.find(a => a.id === id)?.name || '')].join(' ').toLowerCase().includes(search.toLowerCase())); }
function moveEditor() { const m = data.moves.find(x => x.id === editId) || { id: uid(), name: 'New Move', description: '', type: data.types[0].id, category: 'physical', power: 60, accuracy: 100, pp: 20, priority: 0, target: 'foe', effects: [] } as Move; return `<form id="move-form" data-id="${m.id}" class="panel"><div class="row between"><h3>Move definition</h3><button type="button" data-nav="moves">← All moves</button></div><div class="form-grid">${field('Name', 'name', m.name)}${select('Type', 'type', data.types, m.type)}<label class="full">Description<textarea name="description">${esc(m.description)}</textarea></label>${select('Category', 'category', ['physical', 'special', 'status'].map(id => ({ id, name: id })), m.category)}${select('Target', 'target', [{ id: 'foe', name: 'Opponent' }, { id: 'self', name: 'Self' }], m.target)}${field('Base power', 'power', m.power, 'number', 'min="0" max="250"')}${field('Accuracy %', 'accuracy', m.accuracy, 'number', 'min="1" max="100"')}${field('PP', 'pp', m.pp, 'number', 'min="1" max="64"')}${field('Priority', 'priority', m.priority, 'number', 'min="-7" max="7"')}</div><h3>Reusable effects</h3><p class="muted small">Effects run in order after a successful hit. Percent values use 0 to 100; stat stages use −6 to +6.</p><div id="effects">${m.effects.map(effectRow).join('')}</div><button type="button" id="add-effect">+ Add effect</button><div class="actions"><button class="primary">Save move</button></div></form>`; }
function effectRow(e: Effect) { return `<div class="effect-row">${select('Effect', 'kind', ['status', 'stage', 'heal', 'recoil', 'drain'].map(id => ({ id, name: id })), e.kind)}${select('Recipient', 'target', [{ id: 'foe', name: 'Opponent' }, { id: 'self', name: 'Self' }], e.target)}${field('Chance %', 'chance', e.chance, 'number', 'min="0" max="100"')}${field('Value / % / stages', 'value', e.value, 'number')}${select('Stat (stage effect)', 'stat', [...STATS.filter(s => s !== 'hp'), 'accuracy', 'evasion'].map(id => ({ id, name: id })), e.stat || 'atk')}${select('Condition (status effect)', 'status', ['burn', 'poison', 'paralysis', 'sleep', 'freeze'].map(id => ({ id, name: id })), e.status || 'burn')}<button type="button" class="remove-effect danger">Remove effect</button></div>`; }
function moves() { return `<div class="row between section-title"><h3>${data.moves.length} moves</h3><button class="primary" data-new="moves">+ Create move</button></div><div class="grid">${data.moves.map(m => `<article class="panel"><span class="tag" style="--c:${data.types.find(t => t.id === m.type)!.color}">${esc(m.type)} · ${m.category}</span><h3>${esc(m.name)}</h3><p class="muted">${esc(m.description)}</p><p class="small">${m.power} power · ${m.accuracy}% accuracy · ${m.pp} PP</p><button data-edit-move="${m.id}">Edit move ↗</button></article>`).join('')}</div>`; }
function teams() {
    const t = data.teams.find(x => x.id === editId);
    if (!t)
        return `<div class="row between section-title"><h3>Your teams</h3><button class="primary" id="new-team">+ New team</button></div><div class="grid">${data.teams.map(t => `<article class="panel"><h3>${esc(t.name)}</h3><div class="slots">${t.members.map(m => `<span class="tag" style="--c:${color(findC(m.creature))}">${esc(findC(m.creature).name)}</span>`).join('')}</div><p class="muted">${t.members.length} / 6 slots</p><div class="row"><button data-edit-team="${t.id}">Edit team</button><button data-copy-team="${t.id}">Duplicate</button><button data-export-team="${t.id}">Export</button><button class="danger" data-remove-team="${t.id}">Delete</button></div></article>`).join('')}</div>`;
    return `<form id="team-form" data-id="${t.id}" class="panel"><div class="row between">${field('Team name', 'teamName', t.name)}<button type="button" data-nav="teams">← All teams</button></div><div class="notice">Configure one to six creatures. The selected battle format checks legality before a battle. Training: 252 per stat, 510 total.</div>${t.members.map((m, i) => { const c = findC(m.creature); return `<fieldset class="panel" data-slot="${i}"><legend>Slot ${i + 1} · ${esc(c.name)}</legend><div class="form-grid">${select('Creature', 'creature', data.creatures, c.id)}${field('Level', 'level', m.level, 'number', 'min="1" max="100"')}${select('Ability', 'ability', data.abilities.filter(a => c.abilities.includes(a.id)), m.ability, true)}<button type="button" data-remove-slot="${i}">Remove slot</button>${[0, 1, 2, 3].map(j => select(`Move ${j + 1}`, `move${j}`, data.moves.filter(x => c.moves.includes(x.id)), m.moves[j] || '', true)).join('')}</div><h4>Competitive training</h4><div class="stats">${STATS.map(s => field(s.toUpperCase(), `ev-${s}`, m.training[s], 'number', 'min="0" max="252"')).join('')}</div></fieldset>`; }).join('')}<div class="actions"><button class="primary">Save team</button><button type="button" id="add-slot" ${t.members.length >= 6 ? 'disabled' : ''}>+ Add creature</button><button type="button" id="validate-team">Check format legality</button></div></form>`;
}
function types() { return `<div class="notice">Rows attack, columns defend. Dual types multiply together. Changes apply to new battles; ongoing battles keep their original rules snapshot.</div><div class="panel matrix"><table><thead><tr><th>ATK ↓ / DEF →</th>${data.types.map(t => `<th style="color:${t.color}">${esc(t.name)}</th>`).join('')}</tr></thead><tbody>${data.types.map(t => `<tr><th style="color:${t.color}">${esc(t.name)}</th>${data.types.map(u => `<td><select aria-label="${esc(t.name)} against ${esc(u.name)}" data-chart="${t.id}:${u.id}">${[0, .25, .5, 1, 2, 4].map(n => `<option ${data.chart[t.id][u.id] === n ? 'selected' : ''}>${n}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</tbody></table></div><h3>Type identities</h3><div class="grid">${data.types.map(t => `<form class="panel type-form" data-id="${t.id}"><div class="form-grid">${field('Name', 'name', t.name)}${field('Colour', 'color', t.color, 'color')}${field('Icon', 'icon', t.icon)}</div><div class="actions"><button>Save type</button></div></form>`).join('')}</div><form id="type-form" class="panel section-title"><h3>Add a new type</h3><div class="form-grid">${field('Type name', 'name', '')}${field('Colour', 'color', '#c4e890', 'color')}${field('Icon', 'icon', '◇')}</div><div class="actions"><button class="primary">Create type</button></div></form>`; }
function abilities() { const a = data.abilities.find(x => x.id === editId) || { id: uid(), name: 'New ability', description: '', trigger: 'entry', effect: 'boost', value: 1, stat: 'atk', type: '' } as Ability; return `<div class="grid">${data.abilities.map(a => `<article class="panel"><h3>${esc(a.name)}</h3><p class="muted">${esc(a.description)}</p><button data-edit-ability="${a.id}">Edit ability</button></article>`).join('')}</div><form id="ability-form" data-id="${a.id}" class="panel section-title"><div class="row between"><h3>${editId ? 'Edit' : 'Create'} ability</h3><button type="button" data-new="abilities">+ New</button></div><div class="form-grid">${field('Name', 'name', a.name)}${field('Description', 'description', a.description)}${select('Activation', 'trigger', ['entry', 'endTurn', 'damage'].map(id => ({ id, name: id })), a.trigger)}${select('Effect', 'effect', ['heal', 'boost', 'resist'].map(id => ({ id, name: id })), a.effect)}${field('Amount (% or stages)', 'value', a.value, 'number', 'min="0" max="100"')}${select('Stat for boost', 'stat', STATS.filter(s => s !== 'hp').map(id => ({ id, name: id })), a.stat || 'atk')}${select('Damage type restriction', 'type', data.types, a.type || '', true)}</div><p class="muted small">Entry and endTurn support heal or boost. Damage supports resist. These are the supported condition and interaction templates in v0.1.</p><button class="primary">Save ability</button></form>`; }
function formats() { const f = data.formats.find(f => f.id === editId) || { id: uid(), name: 'Custom Singles', teamSize: 6, maxLevel: 100, maxBST: 1530, duplicates: true, stab: 1.5, critical: 1.5, bannedCreatures: [], bannedMoves: [] } as Format; return `<div class="grid">${data.formats.map(f => `<article class="panel"><h3>${esc(f.name)}</h3><p class="muted">Up to ${f.teamSize} creatures · ${f.maxBST} BST cap</p><button data-edit-format="${f.id}">Edit rules</button></article>`).join('')}</div><form id="format-form" data-id="${f.id}" class="panel section-title"><div class="row between"><h3>Singles rules</h3><button type="button" data-new="formats">+ New</button></div><div class="form-grid">${field('Format name', 'name', f.name)}${field('Team size', 'teamSize', f.teamSize, 'number', 'min="1" max="6"')}${field('Maximum level', 'maxLevel', f.maxLevel, 'number', 'min="1" max="100"')}${field('Maximum base stat total', 'maxBST', f.maxBST, 'number', 'min="6" max="1530"')}${field('Same-type bonus', 'stab', f.stab, 'number', 'min="1" max="2" step="0.1"')}${field('Critical multiplier', 'critical', f.critical, 'number', 'min="1" max="3" step="0.1"')}</div><label class="check"><input type="checkbox" name="duplicates" ${f.duplicates ? 'checked' : ''}>Allow duplicate creatures</label><h3>Restricted creatures</h3><div class="form-grid">${data.creatures.map(c => `<label class="check"><input type="checkbox" name="banC" value="${c.id}" ${f.bannedCreatures.includes(c.id) ? 'checked' : ''}>${esc(c.name)}</label>`).join('')}</div><h3>Restricted moves</h3><div class="form-grid">${data.moves.map(m => `<label class="check"><input type="checkbox" name="banM" value="${m.id}" ${f.bannedMoves.includes(m.id) ? 'checked' : ''}>${esc(m.name)}</label>`).join('')}</div><div class="actions"><button class="primary">Save format</button></div></form>`; }
function battleView() {
    if (!battle)
        return `<div class="hero"><div class="hero-copy"><div class="eyebrow">Local singles · human vs AI</div><h2>Make your<br>first move.</h2><p>Every battle uses a frozen copy of your creatures and rules. Choose a team and test your strategy.</p></div><div class="hero-art">${sprite(data.creatures[1] || data.creatures[0])}</div></div><form id="start-battle" class="panel"><div class="form-grid">${select('Your team', 'team', data.teams, teamId)}${select('Battle format', 'format', data.formats, formatId)}${select('AI difficulty', 'difficulty', ['beginner', 'intermediate', 'advanced', 'expert'].map(id => ({ id, name: id[0].toUpperCase() + id.slice(1) })), difficulty)}${field('Random seed', 'seed', Math.floor(Date.now() % 1000000), 'number', 'min="0" max="4294967295"')}${select('Background', 'background', [{ id: 'garden', name: 'Verdant ruins' }, { id: 'night', name: 'Midnight observatory' }], background)}</div><p class="muted small">The rival uses your creature collection, filtered for this format. Expert uses one-turn search; difficulty strength is measured separately.</p><button class="primary">Start battle ↗</button></form>`;
    const b = battle, p = active(b, 0), q = active(b, 1), forced = p.hp <= 0, watching = replayIndex >= 0;
    const fighter = (s: number) => { const p = active(b, s), c = species(b, p); const localType = (id: string) => b.data.types.find(t => t.id === id); return `<div class="fighter ${s ? 'foe' : 'you'}"><div class="healthbox"><div class="row between"><strong>${esc(c.name)}</strong><span class="small muted">Lv. ${p.member.level}</span></div><div class="health"><i style="width:${p.hp / p.maxHP * 100}%;background:${p.hp / p.maxHP < .25 ? '#f19580' : '#c4e890'}"></i></div><div class="row between small" style="margin-top:6px"><span>${c.types.map(t => esc(localType(t)?.name)).join(' / ')}</span><span>${p.hp} / ${p.maxHP} ${p.status ? `· ${p.status.toUpperCase()}` : ''}</span></div></div><div style="opacity:${p.hp > 0 ? 1 : .25}">${sprite(c)}</div></div>`; };
    return `${b.winner !== null ? `<div class="banner"><h2>${b.winner === 2 ? 'A hard-fought draw' : b.winner === 0 ? 'Victory is yours.' : 'A lesson from the arena.'}</h2><p class="muted">${b.turn - 1} turns · seed ${b.seed}</p><button class="primary" id="new-battle">Battle again</button> <button id="export-replay">Export replay</button></div>` : ''}<div class="arena-layout"><section><div class="battlefield ${background === 'night' ? 'night' : ''}"><div class="battle-label">WEAVER ARENA / SINGLES</div><span class="turn-chip">TURN ${b.turn}</span>${fighter(1)}${fighter(0)}</div><div class="row between" style="margin-bottom:15px"><strong>${watching ? 'Replay playback' : forced ? 'Choose your next creature' : `What will ${esc(species(b, p).name)} do?`}</strong><span class="muted small">${esc(b.format.name)}</span></div>${watching ? `<div class="row"><button id="replay-next" class="primary" ${replayIndex >= replayRecord!.history.length ? 'disabled' : ''}>Next turn →</button><span>${replayIndex} / ${replayRecord!.history.length} decisions</span></div>` : `<div class="moves">${p.member.moves.map((id, i) => { const m = getMove(b, p, i), t = b.data.types.find(t => t.id === m.type)!; const mult = effectiveness(b.data, m.type, species(b, q).types); return `<button class="move" style="--c:${t.color}" data-action="move:${i}" ${forced || p.pp[i] <= 0 || b.winner !== null ? 'disabled' : ''} title="${esc(m.description)}"><strong>${esc(m.name)}</strong><div class="row"><span class="small" style="color:${t.color}">${esc(t.name)} · ${m.category}</span><span class="small muted">${p.pp[i]} / ${m.pp} PP</span></div><div class="muted small" style="margin-top:6px">${m.power} power · ${m.accuracy}% · ${mult}× effectiveness</div></button>`; }).join('')}${p.pp.every(n => n <= 0) ? `<button data-action="move:-1" class="move" ${forced || b.winner !== null ? 'disabled' : ''}>Desperation (recoil)</button>` : ''}</div>`}<h3>Your team <span class="muted small">${forced ? 'Forced switch' : 'Switching takes your turn'}</span></h3><div class="slots">${b.teams[0].map((m, i) => `<button class="slot ${b.active[0] === i ? 'active' : ''}" data-action="switch:${i}" ${i === b.active[0] || m.hp <= 0 || b.winner !== null || watching ? 'disabled' : ''}><span style="color:${color(species(b, m))}">${esc(species(b, m).glyph)}</span> ${esc(species(b, m).name)}<div class="small muted">${m.hp} / ${m.maxHP}</div></button>`).join('')}</div><h3>Rival team</h3><div class="slots">${b.teams[1].map(m => `<span class="tag" style="--c:${m.hp > 0 ? color(species(b, m)) : '#56606a'}">${esc(species(b, m).name)} ${m.hp <= 0 ? '×' : ''}</span>`).join('')}</div><div class="actions"><button id="new-battle">Leave battle</button><button id="export-replay">Export replay</button></div></section><aside class="panel"><div class="row between"><h3>Battle journal</h3><span class="eyebrow">LIVE</span></div><div class="battle-log" aria-live="polite">${b.log.map(l => `<p>${esc(l)}</p>`).join('')}</div></aside></div>`;
}
function dataPage() { return `<div class="grid"><article class="panel"><h3>Your complete arena</h3><p class="muted">Export creatures, moves, teams, abilities, formats and type rules together. Back up before changing devices. Local saves stay in this browser.</p><button id="export-data" class="primary">Export all content</button></article><article class="panel"><h3>Import content</h3><p class="muted">Import a complete content pack or a previously exported team. Full packs replace current content after validation.</p><label>Choose JSON<input id="import-data" type="file" accept="application/json,.json"></label></article><article class="panel"><h3>Battle replays</h3><p class="muted">Replay files include the seed, complete rules snapshot and validated turn commands.</p><label>Load replay<input id="import-replay" type="file" accept="application/json,.json"></label></article></div><div class="panel section-title"><h3>Rules v1</h3><p class="muted">Singles only. Select moves simultaneously; switches resolve before moves, then priority, Speed, and seeded tie breaks. Accuracy and evasion use stage multipliers. STAB and critical multipliers are format settings.</p><p class="muted">Damage = floor(((2 × level / 5 + 2) × power × attack / defence / 50 + 2) × same-type bonus × type effectiveness × ability resistance × critical × random[0.85,1]). Physical attacks use Attack and Defence; special attacks use Special Attack and Special Defence.</p><p class="muted">Burn halves physical attack and removes 1/16 HP per turn. Poison removes 1/8 HP. Paralysis halves Speed and has a 25% action failure chance. Sleep blocks 1 to 3 actions. Freeze has a 20% thaw chance each action. Switching resets stages. Forced replacement uses a separate decision with no free attack.</p><p class="muted">This is a local simulator. Online battles, accounts, rankings, doubles and tournaments are planned and are not connected.</p><a href="README.md">Setup & architecture documentation ↗</a></div>`; }
function render() { const editor = (page === 'creatures' || page === 'moves') && editId === 'new' || ((page === 'creatures' || page === 'moves') && !!editId); app.innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand"><b>◈</b> WEAVER<span style="font-weight:400"> ARENA</span><small>BATTLE LABORATORY</small></div><nav class="nav">${Object.keys(names).map(key => `<button data-nav="${key}" class="${page === key ? 'selected' : ''}"><span>${icons[key]}</span>${names[key]}</button>`).join('')}</nav><footer><span class="dot"></span>LOCAL ENGINE ONLINE<br>v0.1 · Original by design<br>Saved on this device</footer></aside><main class="main"><header class="top"><div><div class="eyebrow">Workspace / ${names[page]}</div><h1>${names[page]}</h1></div><span class="muted small"><span class="dot"></span>Local sandbox</span></header>${page === 'home' ? home() : page === 'creatures' ? (editor ? creatureEditor() : creatures()) : page === 'moves' ? (editor ? moveEditor() : moves()) : page === 'teams' ? teams() : page === 'types' ? types() : page === 'abilities' ? abilities() : page === 'formats' ? formats() : page === 'battle' ? battleView() : dataPage()}</main></div>`; const log = app.querySelector('.battle-log'); if (log)
    log.scrollTop = log.scrollHeight; bind(); }
function navigate(p: string, id = '') { page = p; editId = id; render(); window.scrollTo(0, 0); }
const values = (f: FormData, k: string) => f.getAll(k).map(String);
const text = (f: FormData, k: string) => String(f.get(k) || '');
const num = (f: FormData, k: string) => Number(f.get(k));
function saveEntity<T extends {
    id: string;
}>(list: T[], item: T) { const i = list.findIndex(x => x.id === item.id); if (i >= 0)
    list[i] = item;
else
    list.push(item); }
function bind() {
    app.querySelectorAll<HTMLButtonElement>('[data-nav]').forEach(el => el.onclick = async () => navigate(el.dataset.nav!));
    app.querySelectorAll<HTMLButtonElement>('[data-new]').forEach(el => el.onclick = async () => navigate(el.dataset.new!, el.dataset.new === 'creatures' || el.dataset.new === 'moves' ? 'new' : ''));
    app.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(el => el.onclick = async () => navigate('creatures', el.dataset.edit));
    for (const [attr, p] of [['edit-move', 'moves'], ['edit-team', 'teams'], ['edit-ability', 'abilities'], ['edit-format', 'formats']])
        app.querySelectorAll<HTMLButtonElement>(`[data-${attr}]`).forEach(el => el.onclick = async () => navigate(p, el.getAttribute('data-' + attr)!));
    const more = app.querySelector<HTMLButtonElement>('#more-creatures');
    if (more)
        more.onclick = () => { collectionLimit += 48; render(); };
    const searchEl = app.querySelector<HTMLInputElement>('#search');
    if (searchEl)
        searchEl.oninput = () => { search = searchEl.value; collectionLimit = 48; app.querySelector('#collection')!.innerHTML = filteredCreatures().slice(0, collectionLimit).map(card).join(''); app.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(el => el.onclick = async () => navigate('creatures', el.dataset.edit)); };
    const filter = app.querySelector<HTMLSelectElement>('#type-filter');
    if (filter)
        filter.onchange = () => { typeFilter = filter.value; render(); };
    const sort = app.querySelector<HTMLSelectElement>('#stat-sort');
    if (sort)
        sort.onchange = () => { const c = filteredCreatures(); c.sort((a, b) => sort.value === 'name' ? a.name.localeCompare(b.name) : sort.value === 'bst' ? Object.values(b.stats).reduce((a, b) => a + b, 0) - Object.values(a.stats).reduce((a, b) => a + b, 0) : b.stats[sort.value as Stat] - a.stats[sort.value as Stat]); app.querySelector('#collection')!.innerHTML = c.slice(0, collectionLimit).map(card).join(''); app.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(el => el.onclick = async () => navigate('creatures', el.dataset.edit)); };
    app.querySelectorAll<HTMLFormElement>('form').forEach(form => form.onsubmit = async (e) => { e.preventDefault(); try {
        await submit(form, new FormData(form));
    }
    catch (e) {
        notify((e as Error).message);
    } });
    app.querySelectorAll<HTMLButtonElement>('[data-export-creature]').forEach(el => el.onclick = () => download('weaver-creature.json', { kind: 'creature', creature: findC(el.dataset.exportCreature!), rules: { types: data.types, chart: data.chart, moves: data.moves, abilities: data.abilities } }));
    const upload = app.querySelector<HTMLInputElement>('#sprite-upload');
    if (upload)
        upload.onchange = () => { const file = upload.files?.[0]; if (!file)
            return; if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
            notify('Choose a supported image up to 2 MB');
            return;
        } const reader = new FileReader(); reader.onload = () => { app.querySelector<HTMLInputElement>('[name="image"]')!.value = String(reader.result); const preview = app.querySelector('.editor-preview .creature-art')!; preview.innerHTML = `<div class="sprite"><img alt="Uploaded creature preview" src="${esc(reader.result)}"></div>`; }; reader.readAsDataURL(file); };
    app.querySelectorAll<HTMLInputElement>('#creature-form .stats input').forEach(el => el.oninput = () => { app.querySelector('#bst')!.textContent = 'BST ' + [...app.querySelectorAll<HTMLInputElement>('#creature-form .stats input')].reduce((n, x) => n + Number(x.value), 0); });
    app.querySelectorAll<HTMLButtonElement>('[data-duplicate]').forEach(el => el.onclick = async () => { const c = structuredClone(findC(el.dataset.duplicate!)); c.id = uid(); c.name += ' Copy'; c.example = false; await transaction(() => data.creatures.push(c)); navigate('creatures', c.id); });
    app.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(el => el.onclick = async () => { const id = el.dataset.delete!; if (data.teams.some(t => t.members.some(m => m.creature === id))) {
        notify('Remove this creature from saved teams first');
        return;
    } await transaction(() => { data.creatures = data.creatures.filter(c => c.id !== id); data.creatures.forEach(c => { if (c.parent === id)
        c.parent = ''; }); data.formats.forEach(f => f.bannedCreatures = f.bannedCreatures.filter(c => c !== id)); }); navigate('creatures'); });
    const addEffect = app.querySelector<HTMLButtonElement>('#add-effect');
    if (addEffect)
        addEffect.onclick = () => { if (app.querySelectorAll('.effect-row').length >= 8) {
            notify('Maximum eight effects per move');
            return;
        } app.querySelector('#effects')!.insertAdjacentHTML('beforeend', effectRow({ kind: 'status', target: 'foe', chance: 30, value: 0, status: 'burn' })); bindRemoveEffects(); };
    bindRemoveEffects();
    app.querySelectorAll<HTMLSelectElement>('[data-chart]').forEach(el => el.onchange = async () => { try {
        const [a, b] = el.dataset.chart!.split(':');
        await transaction(() => data.chart[a][b] = Number(el.value));
        notify('Type interaction saved');
    }
    catch (e) {
        notify((e as Error).message);
    } });
    const nt = app.querySelector<HTMLButtonElement>('#new-team');
    if (nt)
        nt.onclick = async () => { const t = { id: uid(), name: 'New Team', members: [member(data.creatures[0])] }; await transaction(() => data.teams.push(t)); navigate('teams', t.id); };
    app.querySelectorAll<HTMLButtonElement>('[data-edit-team]').forEach(el => el.onclick = async () => navigate('teams', el.dataset.editTeam));
    app.querySelectorAll<HTMLButtonElement>('[data-copy-team]').forEach(el => el.onclick = async () => { const t = structuredClone(data.teams.find(t => t.id === el.dataset.copyTeam)!); t.id = uid(); t.name += ' Copy'; await transaction(() => data.teams.push(t)); navigate('teams', t.id); });
    app.querySelectorAll<HTMLButtonElement>('[data-remove-team]').forEach(el => el.onclick = async () => { await transaction(() => data.teams = data.teams.filter(t => t.id !== el.dataset.removeTeam)); render(); });
    app.querySelectorAll<HTMLButtonElement>('[data-export-team]').forEach(el => el.onclick = async () => download('weaver-team.json', { kind: 'team', team: data.teams.find(t => t.id === el.dataset.exportTeam) }));
    app.querySelectorAll<HTMLSelectElement>('[data-slot] [name="creature"]').forEach(el => el.onchange = async () => { const t = readTeam(app.querySelector('#team-form')!); const i = Number(el.closest('fieldset')!.dataset.slot); saveEntity(data.teams, t); t.members[i] = member(findC(el.value)); await persist(); render(); });
    const addSlot = app.querySelector<HTMLButtonElement>('#add-slot');
    if (addSlot)
        addSlot.onclick = async () => { const t = readTeam(app.querySelector('#team-form')!); saveEntity(data.teams, t); const c = data.creatures.find(c => !t.members.some(m => m.creature === c.id)) || data.creatures[0]; t.members.push(member(c)); await persist(); render(); };
    app.querySelectorAll<HTMLButtonElement>('[data-remove-slot]').forEach(el => el.onclick = async () => { const t = readTeam(app.querySelector('#team-form')!); saveEntity(data.teams, t); t.members.splice(Number(el.dataset.removeSlot), 1); await persist(); render(); });
    const vt = app.querySelector<HTMLButtonElement>('#validate-team');
    if (vt)
        vt.onclick = () => { const t = readTeam(app.querySelector('#team-form')!); notify(validateTeam(t, data, data.formats.find(f => f.id === formatId) || data.formats[0]).join('; ') || 'Team is legal for the selected format'); };
    app.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(el => el.onclick = async () => { try {
        const [kind, i] = el.dataset.action!.split(':');
        const a = { kind, index: Number(i) } as Action;
        const b = battle!;
        battle = step(b, [a, ai(b, 1, difficulty)]);
        if (battle.winner === null && active(battle, 1).hp <= 0 && active(battle, 0).hp > 0)
            battle = step(battle, [legalActions(battle, 0)[0], ai(battle, 1, difficulty)]);
        render();
    }
    catch (e) {
        notify((e as Error).message);
    } });
    const nb = app.querySelector<HTMLButtonElement>('#new-battle');
    if (nb)
        nb.onclick = () => { battle = null; replayIndex = -1; render(); };
    const er = app.querySelector<HTMLButtonElement>('#export-replay');
    if (er)
        er.onclick = () => download('weaver-replay.json', battle);
    const ed = app.querySelector<HTMLButtonElement>('#export-data');
    if (ed)
        ed.onclick = () => download('weaver-arena-content.json', data);
    const imp = app.querySelector<HTMLInputElement>('#import-data');
    if (imp)
        imp.onchange = async () => { try {
            const file = imp.files?.[0];
            if (!file)
                return;
            if (file.size > 25e6)
                throw Error('Import exceeds 25 MB');
            const parsed = JSON.parse(await file.text());
            if (parsed.kind === 'creature') {
                const pack = parsed;
                await transaction(() => { for (const t of pack.rules.types)
                    saveEntity(data.types, t); for (const m of pack.rules.moves)
                    saveEntity(data.moves, m); for (const a of pack.rules.abilities)
                    saveEntity(data.abilities, a); for (const t of data.types) {
                    data.chart[t.id] ??= {};
                    for (const u of data.types)
                        data.chart[t.id][u.id] = pack.rules.chart[t.id]?.[u.id] ?? data.chart[t.id][u.id] ?? 1;
                } const c = pack.creature as Creature; if (c.parent && !data.creatures.some(x => x.id === c.parent))
                    c.parent = ''; saveEntity(data.creatures, c); });
            }
            else if (parsed.kind === 'team') {
                const t = parsed.team as Team;
                const permissive = { ...data.formats[0], teamSize: 6, maxBST: 1530, duplicates: true };
                const errors = validateTeam(t, data, permissive);
                if (errors.length)
                    throw Error(errors.join('; '));
                t.id = uid();
                await transaction(() => data.teams.push(t));
            }
            else {
                const errors = validateData(parsed);
                if (errors.length)
                    throw Error(errors.join('; '));
                for (const t of parsed.teams) {
                    const errors = validateTeam(t, parsed, { ...parsed.formats[0], teamSize: 6, maxBST: 1530, maxLevel: 100, duplicates: true, bannedCreatures: [], bannedMoves: [] });
                    if (errors.length)
                        throw Error(errors.join('; '));
                }
                await transaction(() => data = parsed);
            }
            notify('Imported and saved');
            render();
        }
        catch (e) {
            notify('Import rejected: ' + (e as Error).message);
        } };
    const ir = app.querySelector<HTMLInputElement>('#import-replay');
    if (ir)
        ir.onchange = async () => { try {
            const file = ir.files?.[0];
            if (!file)
                return;
            if (file.size > 25e6)
                throw Error('Replay exceeds 25 MB');
            const record = JSON.parse(await file.text()) as Battle;
            if (record.version !== 1 || !Array.isArray(record.history) || record.history.length > 1500)
                throw Error('Invalid replay');
            replay(record);
            replayRecord = record;
            battle = createBattle(record.data, record.initial, record.format, record.seed);
            replayIndex = 0;
            navigate('battle');
        }
        catch (e) {
            notify('Replay rejected: ' + (e as Error).message);
        } };
    const rn = app.querySelector<HTMLButtonElement>('#replay-next');
    if (rn)
        rn.onclick = () => { battle = step(battle!, replayRecord!.history[replayIndex++]); render(); };
}
function bindRemoveEffects() { app.querySelectorAll<HTMLButtonElement>('.remove-effect').forEach(el => el.onclick = async () => el.closest('.effect-row')!.remove()); }
function readTeam(form: HTMLFormElement): Team { return { id: form.dataset.id!, name: text(new FormData(form), 'teamName'), members: [...form.querySelectorAll<HTMLFieldSetElement>('[data-slot]')].map(set => { const val = (name: string) => (set.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement).value; return { creature: val('creature'), level: Number(val('level')), ability: val('ability'), moves: [0, 1, 2, 3].map(j => val(`move${j}`)).filter(Boolean), training: Object.fromEntries(STATS.map(s => [s, Number(val('ev-' + s))])) as Record<Stat, number> }; }) }; }
async function submit(form: HTMLFormElement, f: FormData) {
    const id = form.dataset.id!;
    if (form.id === 'creature-form') {
        const c: Creature = { id, name: text(f, 'name').trim(), description: text(f, 'description'), types: [text(f, 'type1'), text(f, 'type2')].filter(Boolean), stats: Object.fromEntries(STATS.map(s => [s, num(f, s)])) as Record<Stat, number>, moves: values(f, 'learnset'), abilities: values(f, 'abilities'), glyph: text(f, 'glyph'), image: f.has('clearImage') ? '' : text(f, 'image'), tags: text(f, 'tags'), parent: text(f, 'parent'), example: findC(id)?.example || false };
        await transaction(() => saveEntity(data.creatures, c));
        navigate('creatures', id);
        notify('Creature saved');
    }
    if (form.id === 'move-form') {
        const effects = [...form.querySelectorAll<HTMLElement>('.effect-row')].map(row => { const v = (name: string) => (row.querySelector(`[name="${name}"]`) as HTMLInputElement).value; return { kind: v('kind'), target: v('target'), chance: Number(v('chance')), value: Number(v('value')), stat: v('stat'), status: v('status') } as Effect; });
        const m: Move = { id, name: text(f, 'name'), description: text(f, 'description'), type: text(f, 'type'), category: text(f, 'category') as Move['category'], target: text(f, 'target') as Move['target'], power: num(f, 'power'), accuracy: num(f, 'accuracy'), pp: num(f, 'pp'), priority: num(f, 'priority'), effects };
        await transaction(() => saveEntity(data.moves, m));
        navigate('moves');
        notify('Move saved. Assign it in Creature Studio.');
    }
    if (form.id === 'team-form') {
        const t = readTeam(form);
        const errors = validateTeam(t, data, { ...data.formats[0], teamSize: 6, maxLevel: 100, maxBST: 1530, duplicates: true, bannedCreatures: [], bannedMoves: [] });
        if (errors.length)
            throw Error(errors.join('; '));
        await transaction(() => saveEntity(data.teams, t));
        notify('Team saved');
    }
    if (form.id === 'type-form' || form.classList.contains('type-form')) {
        await transaction(() => { if (form.id === 'type-form') {
            const id = uid();
            data.types.push({ id, name: text(f, 'name'), color: text(f, 'color'), icon: text(f, 'icon') });
            data.chart[id] = {};
            for (const t of data.types) {
                data.chart[t.id][id] = 1;
                data.chart[id][t.id] = 1;
            }
        }
        else {
            const t = data.types.find(t => t.id === id)!;
            t.name = text(f, 'name');
            t.color = text(f, 'color');
            t.icon = text(f, 'icon');
        } });
        render();
        notify('Type saved');
    }
    if (form.id === 'ability-form') {
        const a: Ability = { id, name: text(f, 'name'), description: text(f, 'description'), trigger: text(f, 'trigger') as Ability['trigger'], effect: text(f, 'effect') as Ability['effect'], value: num(f, 'value'), stat: text(f, 'stat') as Stat, type: text(f, 'type') };
        await transaction(() => saveEntity(data.abilities, a));
        navigate('abilities');
        notify('Ability saved');
    }
    if (form.id === 'format-form') {
        const rule: Format = { id, name: text(f, 'name'), teamSize: num(f, 'teamSize'), maxLevel: num(f, 'maxLevel'), maxBST: num(f, 'maxBST'), stab: num(f, 'stab'), critical: num(f, 'critical'), duplicates: f.has('duplicates'), bannedCreatures: values(f, 'banC'), bannedMoves: values(f, 'banM') };
        await transaction(() => saveEntity(data.formats, rule));
        navigate('formats');
        notify('Format saved');
    }
    if (form.id === 'start-battle') {
        teamId = text(f, 'team');
        formatId = text(f, 'format');
        difficulty = text(f, 'difficulty') as Difficulty;
        background = text(f, 'background');
        const format = data.formats.find(x => x.id === formatId)!;
        const team = data.teams.find(x => x.id === teamId)!;
        const eligible = data.creatures.filter(c => !format.bannedCreatures.includes(c.id) && Object.values(c.stats).reduce((a, b) => a + b, 0) <= format.maxBST && c.moves.some(m => !format.bannedMoves.includes(m)));
        if (!eligible.length)
            throw Error('No legal opponent creatures in this format');
        const rival: Team = { id: 'rival', name: 'Arena AI', members: eligible.slice().reverse().slice(0, Math.min(format.teamSize, team.members.length)).map(c => { const m = member(c); m.level = Math.min(format.maxLevel, team.members[0]?.level || 50); m.moves = c.moves.filter(id => !format.bannedMoves.includes(id)).slice(0, 4); return m; }) };
        battle = createBattle(data, [team, rival], format, num(f, 'seed'));
        replayIndex = -1;
        render();
    }
}
// Unhandled input errors are shown without losing the previous saved content.
window.addEventListener('error', e => notify(e.message));
window.addEventListener('unhandledrejection', e => notify('Save failed: ' + String(e.reason?.message || e.reason)));
render();
if (storageError)
    notify(storageError);
