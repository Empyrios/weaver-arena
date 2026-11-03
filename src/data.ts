import { Data, Creature, Move, member } from './model.js';
export function starter(): Data {
    const types = [['ember', 'Ember', '#f19366', '✦'], ['tide', 'Tide', '#63bedf', '≈'], ['grove', 'Grove', '#99c778', '❧'], ['stone', 'Stone', '#c5aa82', '◆'], ['gale', 'Gale', '#c5acf2', '≋'], ['void', 'Void', '#a597d3', '◈']].map(([id, name, color, icon]) => ({ id, name, color, icon }));
    const chart: Data['chart'] = {};
    for (const t of types) {
        chart[t.id] = {};
        for (const u of types)
            chart[t.id][u.id] = t.id === u.id ? .5 : 1;
    }
    for (const [a, b] of [['ember', 'grove'], ['grove', 'tide'], ['tide', 'ember'], ['stone', 'gale'], ['gale', 'grove'], ['void', 'stone']]) {
        chart[a][b] = 2;
        chart[b][a] = .5;
    }
    chart.gale.stone = 0;
    const moves: Move[] = types.map(t => ({ id: t.id + '-burst', name: t.name + ' Burst', description: 'A focused elemental strike.', type: t.id, category: 'special', power: 75, accuracy: 100, pp: 20, priority: 0, target: 'foe', effects: [] }));
    moves.push({ id: 'strike', name: 'Body Strike', description: 'A dependable physical attack.', type: 'stone', category: 'physical', power: 65, accuracy: 100, pp: 25, priority: 0, target: 'foe', effects: [] }, { id: 'quick', name: 'Slipstream', description: 'Strike before most attacks.', type: 'gale', category: 'physical', power: 40, accuracy: 100, pp: 25, priority: 1, target: 'foe', effects: [] }, { id: 'heal', name: 'Second Wind', description: 'Restore half of maximum HP.', type: 'grove', category: 'status', power: 0, accuracy: 100, pp: 8, priority: 0, target: 'self', effects: [{ kind: 'heal', target: 'self', chance: 100, value: 50 }] }, { id: 'toxin', name: 'Night Venom', description: 'Poison the opponent.', type: 'void', category: 'status', power: 0, accuracy: 90, pp: 12, priority: 0, target: 'foe', effects: [{ kind: 'status', target: 'foe', chance: 100, value: 0, status: 'poison' }] }, { id: 'focus', name: 'Battle Focus', description: 'Raise Attack by two stages.', type: 'ember', category: 'status', power: 0, accuracy: 100, pp: 12, priority: 0, target: 'self', effects: [{ kind: 'stage', target: 'self', chance: 100, value: 2, stat: 'atk' }] }, { id: 'cinder', name: 'Cinder Fang', description: 'A fiery bite with a 30% burn chance.', type: 'ember', category: 'physical', power: 70, accuracy: 95, pp: 15, priority: 0, target: 'foe', effects: [{ kind: 'status', target: 'foe', chance: 30, value: 0, status: 'burn' }] }, { id: 'stun', name: 'Static Bloom', description: 'Paralyse the opponent.', type: 'grove', category: 'status', power: 0, accuracy: 90, pp: 15, priority: 0, target: 'foe', effects: [{ kind: 'status', target: 'foe', chance: 100, value: 0, status: 'paralysis' }] });
    const specs: [
        string,
        string,
        string,
        string,
        number[]
    ][] = [['velmora', 'Velmora', 'tide', '◒', [85, 65, 80, 110, 95, 75]], ['cindervex', 'Cindervex', 'ember', '⟡', [75, 110, 70, 85, 70, 105]], ['briarune', 'Briarune', 'grove', '❧', [100, 75, 95, 90, 100, 50]], ['slatehorn', 'Slatehorn', 'stone', '◆', [100, 115, 120, 45, 75, 35]], ['aerolith', 'Aerolith', 'gale', '⋈', [70, 90, 65, 95, 70, 125]], ['noctelle', 'Noctelle', 'void', '◈', [75, 60, 70, 115, 105, 95]]];
    const creatures: Creature[] = specs.map(([id, name, type, glyph, v]) => ({ id, name, types: [type], glyph, stats: { hp: v[0], atk: v[1], def: v[2], spa: v[3], spd: v[4], spe: v[5] }, description: `An original ${type} test creature. Replace or customise every detail.`, image: '', tags: 'Example, Original', parent: '', example: true, abilities: [type === 'grove' ? 'renewal' : type === 'stone' ? 'bulwark' : 'arrival'], moves: [type + '-burst', 'strike', 'quick', 'heal', 'toxin', 'focus', ...(type === 'ember' ? ['cinder'] : []), ...(type === 'grove' ? ['stun'] : [])] }));
    return { version: 1, types, chart, moves, creatures, abilities: [{ id: 'arrival', name: 'Battle Ready', description: 'Attack rises one stage on entry.', trigger: 'entry', effect: 'boost', stat: 'atk', value: 1 }, { id: 'renewal', name: 'Renewal', description: 'Heal 6% maximum HP at turn end.', trigger: 'endTurn', effect: 'heal', value: 6 }, { id: 'bulwark', name: 'Bulwark', description: 'Reduce incoming Stone damage by 25%.', trigger: 'damage', effect: 'resist', type: 'stone', value: 25 }], teams: [{ id: 'first-team', name: 'First Expedition', members: creatures.map(member) }], formats: [{ id: 'standard', name: 'Standard Singles', teamSize: 6, maxLevel: 100, maxBST: 700, bannedCreatures: [], bannedMoves: [], duplicates: false, stab: 1.5, critical: 1.5 }, { id: 'trio', name: '3v3 Singles', teamSize: 3, maxLevel: 100, maxBST: 700, bannedCreatures: [], bannedMoves: [], duplicates: false, stab: 1.5, critical: 1.5 }] };
}
