# Rules version 1

All content and format settings are frozen into the battle at creation. `Data.version` and `Battle.version` are 1. Old replay semantics require retaining this engine version; a future engine version must introduce a rules-version migration or a compatibility runner.

## Statistics

Base stats are 1 to 255. Team levels are integers 1 to the format maximum (at most 100). Training values are integers 0 to 252 per stat, at most 510 total. The fixed innate value is 31 in v1; individual innate values and natures are not editable.

Let `B` = base stat, `E` = training, `L` = level.

`X = floor((2B + 31 + floor(E/4)) * L / 100)`

Maximum HP = `X + L + 10`.

Other stats = `max(1, floor((X + 5) * stageMultiplier * paralysisSpeedModifier))`.

Stages range from -6 to +6. For nonnegative n, multiplier `(2+n)/2`; for negative n, `2/(2-n)`. Accuracy and evasion deliberately use the same stage multiplier in this original ruleset. HP has no stages. Paralysis modifies only Speed by 0.5. Switching resets all stages but retains status, HP and PP.

## Turn order

Both sides submit legal commands. Voluntary switches have priority 10. Moves sort by priority descending, then current Speed descending. Ties consume seeded PRNG samples to order the sides. Any illegal command rejects the entire update without changing the input state.

A fainted active creature must switch to a living reserve. Forced switching is a separate decision, does not advance the turn, and grants neither side a free attack, residual tick or PP change. The other side's submitted legal command is ignored in that replacement decision. If both sides require replacement, both replace simultaneously.

Move execution stops for a fainted user or target, so a creature knocked out before its action cannot attack. A slower move targets whichever creature is active after a voluntary switch. Victory is checked after each action and after residual effects. Both teams depleted simultaneously is a draw. Turn 501 is a draw.

## Move resolution

Sleep, freeze and paralysis are checked before PP consumption. A blocked action does not spend PP. Successful attempts consume one PP even if accuracy fails or a type immunity prevents effects.

Self-targeted moves bypass accuracy. Only status-category moves may target self. Other moves hit when a uniform random sample is less than `(accuracy / 100) * accuracyStageMultiplier / targetEvasionStageMultiplier`. Values above 1 guarantee a hit.

Type multipliers are the product of the attack-type row against each defender type column. The type chart supports 0, 0.25, 0.5, 1, 2 and 4. A zero multiplier blocks all foe-targeted effects, including status effects. There are no hardcoded type-specific status immunities.

Physical damage uses Attack and Defence. Special damage uses Special Attack and Special Defence. Burn halves the effective physical attacking stat after stage calculations.

`base = ((2 * L / 5 + 2) * power * attack / defence / 50 + 2)`

`expected = floor(base * STAB * typeProduct * abilityResistance)`

`damage = floor(expected * criticalMultiplier * (0.85 + 0.15 * random))`

Positive, nonimmune attacks do at least 1 damage. Damage cannot exceed remaining HP. The early floor on `expected` is intentional and part of v1. Zero-power physical/special moves still use the additive 2; use category status for nondamaging moves.

STAB defaults to 1.5 and applies when the user's types include the move type. Critical chance is 1/16, default multiplier 1.5. Criticals do not bypass stages. STAB and critical multiplier are format settings. Damage variance is continuous, not the original games' discrete roll table.

Resistance abilities multiply damage by `1 - value/100` when the optional type restriction matches. A value of 100 is immunity to damage. Foe-targeted secondary effects can still apply after ability resistance reduces damage to zero; type immunity blocks the whole move.

## Effects and statuses

Effects run in array order after accuracy and type checks, each using a separate chance roll. Supported blocks: status, stage, heal, recoil and drain. Targets can be self or foe. Effects cannot target a fainted recipient.

- Heal: floor(maximum HP * value/100), capped at maximum HP.
- Drain: floor(actual damage * value/100), restores the user.
- Recoil: floor(user maximum HP * value/100), minimum 1, damages the user. The recipient field is checked for liveness, but recoil always affects the user; set recipient self.
- Stage: additive change in [-6,+6], clamped to stage bounds.
- Status: only applied if no major status already exists. No replacement, stacking, cure or duration editor in v1.

Burn deals max(1, floor(maxHP/16)) at turn end. Poison deals max(1, floor(maxHP/8)). Paralysis has 25% action failure. Sleep blocks 1 to 3 actions, chosen at application, then clears at the following action. Freeze has 20% thaw chance before each attempted action. These conditions have no type immunities.

Entry and turn-end abilities use a single allowlisted heal or boost template. Boost amount is 0 to 3 stages; heal percentage 0 to 100. On turn end, residual status damage happens before the active creature's ability. Fainted creatures cannot heal through passive abilities.

When all equipped PP reaches zero, Desperation is available: physical power 50, neutral typing, no STAB, 100% accuracy, 25% maximum HP recoil. It follows the standard accuracy/evasion rules.

## Determinism

PRNG: 32-bit LCG, `state = (1664525 * state + 1013904223) mod 2^32`; output `state / 2^32`. All battle randomness is owned by the battle state. AI Beginner derives its choice from the seed state without mutating battle state. Do not use this noncryptographic PRNG for security or competitive hidden information.

A replay includes initial teams, rule/content snapshot, format, initial seed and every accepted pair of commands. Replay reconstruction runs those commands through the same validated engine. Display logs and saved terminal HP are not trusted as replay authority.
