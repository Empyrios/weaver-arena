import { Data, Team, Format, Member, Move, Stat, Status, validateData, validateTeam } from './model.js';
export type Action = {
    kind: 'move' | 'switch';
    index: number;
};
export type Fighter = {
    member: Member;
    hp: number;
    maxHP: number;
    pp: number[];
    status: Status | '';
    sleep: number;
    stages: Record<string, number>;
};
export type Battle = {
    version: 1;
    data: Data;
    format: Format;
    seed: number;
    rng: number;
    turn: number;
    teams: Fighter[][];
    active: number[];
    log: string[];
    winner: number | null;
    history: Action[][];
    initial: Team[];
};
export const clone = <T>(x: T): T => structuredClone(x);
export function random(b: Battle): number { b.rng = (Math.imul(1664525, b.rng) + 1013904223) >>> 0; return b.rng / 4294967296; }
export function stat(b: Battle, p: Fighter, s: Stat): number { const c = b.data.creatures.find(c => c.id === p.member.creature)!; const base = Math.floor((2 * c.stats[s] + 31 + Math.floor(p.member.training[s] / 4)) * p.member.level / 100); return s === 'hp' ? base + p.member.level + 10 : Math.max(1, Math.floor((base + 5) * stage(p.stages[s] || 0) * (s === 'spe' && p.status === 'paralysis' ? .5 : 1))); }
export const stage = (n: number) => n >= 0 ? (2 + n) / 2 : 2 / (2 - n);
export const active = (b: Battle, s: number) => b.teams[s][b.active[s]];
export const species = (b: Battle, p: Fighter) => b.data.creatures.find(c => c.id === p.member.creature)!;
export function effectiveness(d: Data, type: string, defenders: string[]): number { return defenders.reduce((n, t) => n * (d.chart[type]?.[t] ?? 1), 1); }
function say(b: Battle, s: string) { b.log.push(s); }
function ability(b: Battle, p: Fighter, trigger: 'entry' | 'endTurn') { if (p.hp <= 0)
    return; const a = b.data.abilities.find(x => x.id === p.member.ability && x.trigger === trigger); if (!a)
    return; if (a.effect === 'heal')
    p.hp = Math.min(p.maxHP, p.hp + Math.floor(p.maxHP * a.value / 100)); if (a.effect === 'boost') {
    const s = a.stat || 'atk';
    p.stages[s] = Math.min(6, (p.stages[s] || 0) + a.value);
} say(b, `${species(b, p).name}: ${a.name}.`); }
export function createBattle(d: Data, teams: Team[], f: Format, seed: number): Battle { const errors = validateData({ ...d, formats: [f] }); if (teams.length !== 2)
    throw Error('Exactly two teams required'); teams.forEach(t => errors.push(...validateTeam(t, d, f))); if (errors.length)
    throw Error(errors.join('; ')); const b: Battle = { version: 1, data: clone(d), format: clone(f), seed: seed >>> 0, rng: seed >>> 0, turn: 1, teams: [], active: [0, 0], log: ['The arena is ready.'], winner: null, history: [], initial: clone(teams) }; b.teams = teams.map(t => t.members.map(m => { const p: Fighter = { member: clone(m), hp: 0, maxHP: 0, pp: m.moves.map(id => d.moves.find(x => x.id === id)!.pp), status: '', sleep: 0, stages: {} }; p.hp = p.maxHP = stat(b, p, 'hp'); return p; })); b.teams.forEach(t => ability(b, t[0], 'entry')); return b; }
export function legalActions(b: Battle, s: number): Action[] { if (b.winner !== null)
    return []; const p = active(b, s); const switches = b.teams[s].flatMap((p, i) => p.hp > 0 && i !== b.active[s] ? [{ kind: 'switch' as const, index: i }] : []); if (p.hp <= 0)
    return switches; const moves = p.pp.flatMap((pp, i) => pp > 0 ? [{ kind: 'move' as const, index: i }] : []); return [...(moves.length ? moves : [{ kind: 'move' as const, index: -1 }]), ...switches]; }
const struggle: Move = { id: 'struggle', name: 'Desperation', description: 'Fallback attack', type: '', category: 'physical', power: 50, accuracy: 100, pp: 1, priority: 0, target: 'foe', effects: [{ kind: 'recoil', target: 'self', chance: 100, value: 25 }] };
export function getMove(b: Battle, p: Fighter, i: number): Move { return i < 0 ? struggle : b.data.moves.find(x => x.id === p.member.moves[i])!; }
export function expectedDamage(b: Battle, p: Fighter, q: Fighter, m: Move): number { if (m.category === 'status')
    return 0; const atk = stat(b, p, m.category === 'physical' ? 'atk' : 'spa') * (m.category === 'physical' && p.status === 'burn' ? .5 : 1), def = stat(b, q, m.category === 'physical' ? 'def' : 'spd'); const same = species(b, p).types.includes(m.type) ? b.format.stab : 1; const a = b.data.abilities.find(a => a.id === q.member.ability && a.trigger === 'damage'); const resistance = a?.effect === 'resist' && (!a.type || a.type === m.type) ? 1 - a.value / 100 : 1; return Math.floor(((2 * p.member.level / 5 + 2) * m.power * atk / def / 50 + 2) * same * (m.id === 'struggle' ? 1 : effectiveness(b.data, m.type, species(b, q).types)) * resistance); }
function switchIn(b: Battle, s: number, i: number) { const old = active(b, s); old.stages = {}; b.active[s] = i; const p = active(b, s); say(b, `${s === 0 ? 'You' : 'Rival'} sent out ${species(b, p).name}.`); ability(b, p, 'entry'); }
function victory(b: Battle) { const dead = b.teams.map(t => t.every(p => p.hp <= 0)); if (dead.some(Boolean)) {
    b.winner = dead[0] && dead[1] ? 2 : dead[0] ? 1 : 0;
    say(b, b.winner === 2 ? 'Draw.' : b.winner === 0 ? 'Victory! Your team wins.' : 'Defeat. Your rival wins.');
} }
function execute(b: Battle, s: number, a: Action) {
    if (a.kind === 'switch') {
        switchIn(b, s, a.index);
        return;
    }
    const p = active(b, s), q = active(b, 1 - s);
    if (p.hp <= 0 || q.hp <= 0)
        return;
    const m = getMove(b, p, a.index);
    if (a.index >= 0 && p.pp[a.index] <= 0)
        return;
    if (p.status === 'sleep') {
        if (p.sleep-- > 0) {
            say(b, `${species(b, p).name} is asleep.`);
            return;
        }
        p.status = '';
    }
    if (p.status === 'freeze') {
        if (random(b) < .2)
            p.status = '';
        else {
            say(b, `${species(b, p).name} is frozen.`);
            return;
        }
    }
    if (p.status === 'paralysis' && random(b) < .25) {
        say(b, `${species(b, p).name} is paralysed.`);
        return;
    }
    if (a.index >= 0)
        p.pp[a.index]--;
    say(b, `${species(b, p).name} used ${m.name}.`);
    const hit = m.target === 'self' || random(b) < m.accuracy / 100 * stage(p.stages.accuracy || 0) / stage(q.stages.evasion || 0);
    if (!hit) {
        say(b, 'The move missed.');
        return;
    }
    const mult = m.id === 'struggle' ? 1 : effectiveness(b.data, m.type, species(b, q).types);
    if (m.target === 'foe' && mult === 0) {
        say(b, 'It has no effect.');
        return;
    }
    let damage = 0;
    if (m.category !== 'status') {
        const crit = random(b) < 1 / 16;
        damage = Math.min(q.hp, Math.max(expectedDamage(b, p, q, m) > 0 ? 1 : 0, Math.floor(expectedDamage(b, p, q, m) * (crit ? b.format.critical : 1) * (.85 + .15 * random(b)))));
        q.hp -= damage;
        say(b, `${damage} damage.${mult > 1 ? ' Super effective!' : mult < 1 ? ' Resisted.' : ''}${crit ? ' Critical hit!' : ''}`);
    }
    for (const e of m.effects) {
        if (random(b) * 100 >= e.chance)
            continue;
        const t = e.target === 'self' ? p : q;
        if (t.hp <= 0)
            continue;
        if (e.kind === 'heal')
            t.hp = Math.min(t.maxHP, t.hp + Math.floor(t.maxHP * e.value / 100));
        if (e.kind === 'drain')
            p.hp = Math.min(p.maxHP, p.hp + Math.floor(damage * e.value / 100));
        if (e.kind === 'recoil')
            p.hp = Math.max(0, p.hp - Math.max(1, Math.floor(p.maxHP * e.value / 100)));
        if (e.kind === 'status' && !t.status) {
            t.status = e.status!;
            t.sleep = 1 + Math.floor(random(b) * 3);
            say(b, `${species(b, t).name}: ${t.status}.`);
        }
        if (e.kind === 'stage') {
            t.stages[e.stat!] = Math.max(-6, Math.min(6, (t.stages[e.stat!] || 0) + e.value));
            say(b, `${species(b, t).name}: ${e.stat} ${e.value > 0 ? '+' : ''}${e.value}.`);
        }
    }
    for (const t of [p, q])
        if (t.hp <= 0)
            say(b, `${species(b, t).name} fainted.`);
    victory(b);
}
export function step(input: Battle, actions: Action[]): Battle {
    const b: Battle = { ...input, teams: clone(input.teams), active: [...input.active], log: [...input.log], history: [...input.history] };
    if (b.winner !== null)
        throw Error('Battle already finished');
    if (actions.length !== 2)
        throw Error('Two actions required');
    actions.forEach((a, s) => { if (!legalActions(b, s).some(x => x.kind === a.kind && x.index === a.index))
        throw Error('Illegal command'); });
    b.history.push(clone(actions));
    const forced = b.teams.map((_, s) => active(b, s).hp <= 0);
    if (forced.some(Boolean)) {
        forced.forEach((yes, s) => { if (yes)
            switchIn(b, s, actions[s].index); });
        return b;
    }
    const order = [0, 1].map(s => ({ s, priority: actions[s].kind === 'switch' ? 10 : getMove(b, active(b, s), actions[s].index).priority, speed: stat(b, active(b, s), 'spe'), tie: random(b) })).sort((a, c) => c.priority - a.priority || c.speed - a.speed || c.tie - a.tie);
    say(b, `Turn ${b.turn}`);
    const original = b.active.slice();
    for (const { s } of order) {
        if (b.winner !== null)
            break;
        if (actions[s].kind === 'move' && (active(b, s).hp <= 0 || b.active[s] !== original[s]))
            continue;
        execute(b, s, actions[s]);
    }
    if (b.winner === null) {
        b.teams.forEach((_, s) => { const p = active(b, s); if (p.hp <= 0)
            return; if (p.status === 'burn' || p.status === 'poison') {
            const n = Math.max(1, Math.floor(p.maxHP / (p.status === 'burn' ? 16 : 8)));
            p.hp = Math.max(0, p.hp - n);
            say(b, `${species(b, p).name} takes ${n} ${p.status} damage.`);
        } ability(b, p, 'endTurn'); });
        victory(b);
    }
    b.turn++;
    if (b.turn > 500 && b.winner === null) {
        b.winner = 2;
        say(b, 'Draw: 500-turn limit.');
    }
    return b;
}
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export function ai(b: Battle, s: number, level: Difficulty): Action {
    const choices = legalActions(b, s);
    if (!choices.length)
        throw Error('No legal actions');
    const p = active(b, s), q = active(b, 1 - s);
    const noise = (b.rng ^ (b.turn * 2654435761) ^ (s * 8191)) >>> 0;
    if (level === 'beginner')
        return choices[noise % choices.length];
    const score = (a: Action) => {
        if (a.kind === 'switch') {
            const t = b.teams[s][a.index];
            if (p.hp <= 0)
                return Math.max(...t.member.moves.map(id => expectedDamage(b, t, q, b.data.moves.find(m => m.id === id)!))) + t.hp / t.maxHP * 10;
            if (level === 'intermediate')
                return -100;
            const incoming = Math.max(...q.member.moves.map(id => expectedDamage(b, q, t, b.data.moves.find(m => m.id === id)!)));
            const current = Math.max(...q.member.moves.map(id => expectedDamage(b, q, p, b.data.moves.find(m => m.id === id)!)));
            return (current - incoming) * .6 - 15;
        }
        const m = getMove(b, p, a.index);
        let n = expectedDamage(b, p, q, m) * m.accuracy / 100;
        if (n >= q.hp)
            n += 50;
        if (level !== 'intermediate')
            for (const e of m.effects) {
                if (e.kind === 'heal')
                    n += Math.min(p.maxHP - p.hp, p.maxHP * e.value / 100) * .7;
                if (e.kind === 'status' && !q.status)
                    n += e.chance * .3;
                if (e.kind === 'stage')
                    n += (e.target === 'self' ? e.value : -e.value) * 8;
            }
        return n;
    };
    choices.sort((a, c) => score(c) - score(a));
    if (level !== 'expert' || p.hp <= 0 || active(b, 1 - s).hp <= 0)
        return choices[0];
    const foe = ai(b, 1 - s, 'advanced');
    let best = choices[0], bestValue = -Infinity;
    for (const a of choices) {
        const commands = s === 0 ? [a, foe] : [foe, a];
        const next = step(b, commands);
        const value = next.winner === s ? 10000 : next.winner === 1 - s ? -10000 : next.teams[s].reduce((n, p) => n + p.hp / p.maxHP, 0) * 150 - next.teams[1 - s].reduce((n, p) => n + p.hp / p.maxHP, 0) * 150 + score(a) * .05;
        if (value > bestValue) {
            bestValue = value;
            best = a;
        }
    }
    return best;
}
export function replay(record: Battle): Battle { let b = createBattle(record.data, record.initial, record.format, record.seed); for (const a of record.history)
    b = step(b, a); return b; }
