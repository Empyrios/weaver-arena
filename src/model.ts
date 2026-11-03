export const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
export type Stat = typeof STATS[number];
export type Status = 'burn' | 'poison' | 'paralysis' | 'sleep' | 'freeze';
export type Effect = {
    kind: 'status' | 'stage' | 'heal' | 'recoil' | 'drain';
    target: 'self' | 'foe';
    chance: number;
    value: number;
    stat?: Stat | 'accuracy' | 'evasion';
    status?: Status;
};
export type Move = {
    id: string;
    name: string;
    description: string;
    type: string;
    category: 'physical' | 'special' | 'status';
    power: number;
    accuracy: number;
    pp: number;
    priority: number;
    target: 'self' | 'foe';
    effects: Effect[];
};
export type Ability = {
    id: string;
    name: string;
    description: string;
    trigger: 'entry' | 'endTurn' | 'damage';
    effect: 'heal' | 'boost' | 'resist';
    value: number;
    type?: string;
    stat?: Stat;
};
export type Creature = {
    id: string;
    name: string;
    description: string;
    types: string[];
    stats: Record<Stat, number>;
    moves: string[];
    abilities: string[];
    image: string;
    glyph: string;
    tags: string;
    parent: string;
    example: boolean;
};
export type Element = {
    id: string;
    name: string;
    color: string;
    icon: string;
};
export type Member = {
    creature: string;
    moves: string[];
    ability: string;
    level: number;
    training: Record<Stat, number>;
};
export type Team = {
    id: string;
    name: string;
    members: Member[];
};
export type Format = {
    id: string;
    name: string;
    teamSize: number;
    maxLevel: number;
    maxBST: number;
    bannedCreatures: string[];
    bannedMoves: string[];
    duplicates: boolean;
    stab: number;
    critical: number;
};
export type Data = {
    version: 1;
    creatures: Creature[];
    moves: Move[];
    types: Element[];
    chart: Record<string, Record<string, number>>;
    abilities: Ability[];
    teams: Team[];
    formats: Format[];
};
export const uid = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'wa-' + Date.now().toString(36) + '-' + Array.from(crypto.getRandomValues(new Uint32Array(4))).map(n => n.toString(36)).join('-');
export const training = (): Record<Stat, number> => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
export const member = (c: Creature): Member => ({ creature: c.id, moves: c.moves.slice(0, 4), ability: c.abilities[0] || '', level: 50, training: training() });
const finite = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export function validateData(d: Data): string[] {
    const errors: string[] = [];
    if (!d || d.version !== 1)
        return ['Unsupported content version'];
    for (const key of ['creatures', 'moves', 'types', 'abilities', 'teams', 'formats'] as const) {
        if (!Array.isArray(d[key]))
            return [`Invalid ${key}`];
        const ids = d[key].map(x => x.id);
        if (new Set(ids).size !== ids.length || ids.some(x => typeof x !== 'string' || !x))
            errors.push(`Duplicate or missing ${key} IDs`);
    }
    if (!d.creatures.length || !d.moves.length || !d.types.length || !d.formats.length || !d.chart)
        errors.push('Types, formats and chart are required');
    const types = new Set(d.types.map(x => x.id)), moves = new Set(d.moves.map(x => x.id)), abilities = new Set(d.abilities.map(x => x.id)), creatures = new Set(d.creatures.map(x => x.id));
    for (const t of d.types) {
        if (!t.name?.trim() || !/^#[0-9a-f]{6}$/i.test(t.color))
            errors.push('Invalid type');
        for (const u of d.types)
            if (![0, .25, .5, 1, 2, 4].includes(d.chart[t.id]?.[u.id]))
                errors.push(`Invalid chart ${t.name}`);
    }
    for (const m of d.moves) {
        if (!m.name?.trim() || !types.has(m.type) || !['physical', 'special', 'status'].includes(m.category) || !['self', 'foe'].includes(m.target) || (m.target === 'self' && m.category !== 'status') || !finite(m.power, 0, 250) || !finite(m.accuracy, 1, 100) || !finite(m.pp, 1, 64) || !finite(m.priority, -7, 7) || !Array.isArray(m.effects) || m.effects.length > 8)
            errors.push(`Invalid move ${m.name}`);
        else
            for (const e of m.effects)
                if (!['status', 'stage', 'heal', 'recoil', 'drain'].includes(e.kind) || !['self', 'foe'].includes(e.target) || !finite(e.chance, 0, 100) || !finite(e.value, -6, 100) || (e.kind === 'status' && !['burn', 'poison', 'paralysis', 'sleep', 'freeze'].includes(e.status || '')) || (e.kind === 'stage' && (![...STATS.filter(s => s !== 'hp'), 'accuracy', 'evasion'].includes(e.stat || '') || !finite(e.value, -6, 6))) || (['heal', 'recoil', 'drain'].includes(e.kind) && !finite(e.value, 0, 100)))
                    errors.push(`Invalid effect in ${m.name}`);
    }
    for (const a of d.abilities)
        if (!a.name?.trim() || !['entry', 'endTurn', 'damage'].includes(a.trigger) || !['heal', 'boost', 'resist'].includes(a.effect) || !finite(a.value, 0, a.effect === 'boost' ? 3 : 100) || (a.type && !types.has(a.type)) || (a.stat && (!STATS.includes(a.stat) || a.stat === 'hp')) || (a.trigger === 'damage' && a.effect !== 'resist') || (a.trigger !== 'damage' && a.effect === 'resist'))
            errors.push(`Invalid ability ${a.name}`);
    for (const c of d.creatures) {
        if (!c.name?.trim() || c.name.length > 60 || !Array.isArray(c.types) || c.types.length < 1 || c.types.length > 2 || new Set(c.types).size !== c.types.length || c.types.some(t => !types.has(t)) || STATS.some(s => !finite(c.stats?.[s], 1, 255)) || !c.moves?.length || c.moves.some(m => !moves.has(m)) || c.abilities?.some(a => !abilities.has(a)) || (c.parent && !creatures.has(c.parent)) || typeof c.image !== 'string' || (c.image && !/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(c.image)) || c.image.length > 2800000)
            errors.push(`Invalid creature ${c.name}`);
    }
    for (const c of d.creatures) {
        const seen = new Set<string>();
        let current: Creature | undefined = c;
        while (current?.parent) {
            if (seen.has(current.id)) {
                errors.push('Evolution relationships cannot contain cycles');
                break;
            }
            seen.add(current.id);
            current = d.creatures.find(x => x.id === current!.parent);
        }
    }
    for (const f of d.formats)
        if (!f.name?.trim() || !Number.isInteger(f.teamSize) || !finite(f.teamSize, 1, 6) || !finite(f.maxLevel, 1, 100) || !finite(f.maxBST, 6, 1530) || !finite(f.stab, 1, 2) || !finite(f.critical, 1, 3) || !Array.isArray(f.bannedCreatures) || !Array.isArray(f.bannedMoves) || f.bannedCreatures.some(x => !creatures.has(x)) || f.bannedMoves.some(x => !moves.has(x)))
            errors.push('Invalid format');
    return [...new Set(errors)];
}
export function validateTeam(t: Team, d: Data, f: Format): string[] { const errors: string[] = []; if (!t?.members?.length || t.members.length > f.teamSize)
    return [`Choose 1 to ${f.teamSize} creatures`]; if (!f.duplicates && new Set(t.members.map(m => m.creature)).size !== t.members.length)
    errors.push('Duplicate species are disabled'); for (const m of t.members) {
    const c = d.creatures.find(x => x.id === m.creature);
    if (!c) {
        errors.push('Missing creature');
        continue;
    }
    if (f.bannedCreatures.includes(c.id) || Object.values(c.stats).reduce((a, b) => a + b, 0) > f.maxBST)
        errors.push(`${c.name} is restricted`);
    if (!Number.isInteger(m.level) || !finite(m.level, 1, f.maxLevel))
        errors.push('Invalid level');
    if (!m.training || STATS.some(s => !Number.isInteger(m.training[s]) || !finite(m.training[s], 0, 252)) || Object.values(m.training).reduce((a, b) => a + b, 0) > 510)
        errors.push('Training must be 0 to 252 per stat, 510 total');
    if (!Array.isArray(m.moves) || m.moves.length < 1 || m.moves.length > 4 || new Set(m.moves).size !== m.moves.length || m.moves.some(x => !c.moves.includes(x) || !d.moves.some(y => y.id === x) || f.bannedMoves.includes(x)))
        errors.push(`${c.name}: illegal moves`);
    if (m.ability && !c.abilities.includes(m.ability))
        errors.push('Illegal ability');
} return errors; }
