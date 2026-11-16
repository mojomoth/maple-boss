# Boss data sources

Retrieved 2026-11-16. The seed lives in `data.ts`. The row set is exactly maplescouter's 60 `calculatedData.bossCuts` (boss × difficulty) entries from `docs/research/samples/강은호.json`. `scouterName` is maplescouter's short name, and `resolveScouterBoss` maps onto it. Namu wiki returns 403, so the sources are maplestorywiki.net (GMS-oriented, but it lists the KMS-only modes) and orangemushroom.net (KMS patch notes).

Units: orangemushroom writes `t` = 1e12 (조) and `Q` = 1e15 (천조). This was checked two ways. First, the wiki numbers are a constant ~0.68× of First Adversary's KMS 1.2.406 HP (171t/171t/228t … 3.135Q/3.135Q/4.18Q) across both the `t` rows and the `Q` rows (171t × 0.68 ≈ our 116조), which matches the ~33% KMS HP cut in 1.2.416. Second, Bellona's Easy/Normal HP ratio (5.29) equals her maplescouter clearRate ratio (5.29).

## The 44 original party modes

| Field | Status | Notes |
|---|---|---|
| maxParty | **verified** | Equals the sample's `isPartyLimit` for every row (tested). This also settles Verus Hilla = 6. |
| level, defenseRate, force | wiki-sourced | Highest phase value per difficulty. Kalos Easy/Normal are 330% in P1 and 380% in P2, so 380 is used. |
| hp | wiki-sourced, derived | Sum of one HP bar per phase. Multi-mob phases count once, and Limbo's interlude and white shields are excluded. These are **GMS-wiki values, not cross-checked against KMS.** KMS 1.2.416 (Jul 2026) cut most boss HP by ~32–33% and Black Mage Hard by 64.9%. The wiki's First Adversary and Hard Malefic Star match the post-cut KMS values. Normal Malefic Star does not: KMS pre-cut 4.698Q × 0.68 ≈ 3.19Q, against our 2.24Q. Black Mage Hard was not checked. |
| statBasis | derived | `defenseRate >= 380 ? "380" : "300"`. |

Not verified: the HP of Extreme Limbo and Extreme Baldrix (added in KMS 1.2.420) comes from the wiki only.

## New rows

| Row | Field | Status | Value / evidence |
|---|---|---|---|
| 벨로나 Easy/Normal/Hard | level 280, AUT 400/450/550, party 3 | **verified** | orangemushroom 1.2.418 = maplestorywiki `Bellona/Monster` = sample `isPartyLimit`. |
| 벨로나 Easy/Normal/Hard | hp (P1/P2) 316t/463t, 1.652Q/2.47Q, 5.564Q/8.152Q | **verified** | Two sources agree. This is post-1.2.416, so no cut applies. The wiki labels its own HP "estimated, may not be 100% accurate". |
| 벨로나 Easy/Normal/Hard | defenseRate 380 | wiki only | orangemushroom does not state it. |
| 유피테르 Normal/Hard | level 295, AUT 810, party 3 | **verified** | orangemushroom 1.2.412 = maplestorywiki `Jupiter/Monster` = sample. |
| 유피테르 Normal | hp 6,980.8조 (one shared bar) | **verified** | Wiki 6,980,800,000,000,000 = orangemushroom 10.266Q × (1 − 0.320 from the 1.2.416 cut). |
| 유피테르 Hard | hp 32,000조 | **ESTIMATED** | The wiki gives 32Q and flags it as estimated. orangemushroom 49.4Q × 0.68 = 33.6Q. |
| 유피테르 Normal/Hard | defenseRate 380 | wiki only | |

Caveat: maplescouter's Jupiter clearRate ratio is Normal/Hard = 1.53, while the HP ratio is about 4.6×. maplescouter seems to model Jupiter differently. The HP is only displayed, so this does not affect party math.

### Destiny (6 rows) and Champion (5 rows)

Both are **solo** runs of an existing mode at that mode's HP. Only the player's damage is modified, and maplescouter's clearRate already includes that. `maxParty = 1` is **verified** (sample). Every other field is copied from the base row, so it is exactly as verified as that row (see the 44-row table).

| Row | Base mode | Base-mode status | Evidence (orangemushroom, wiki, sample clearRate ÷ base clearRate) |
|---|---|---|---|
| 데스티니 대적자 | Hard | **verified** | orangemushroom 1.2.412 "Decisive Battle: Solo Hard Mode, 20% final damage reduction". Ratio 0.777. |
| 데스티니 림보 | Hard | **verified** | orangemushroom 1.2.412 "Solo Hard Mode". Ratio 1.000. |
| 데스티니 발드릭스 | Hard | **verified** | orangemushroom 1.2.412 "Solo Hard Mode". Ratio 1.000. |
| 데스티니 카링 | Hard | **verified** | Wiki: "20% more final damage to hard mode during Destiny Mission". Ratio 1.200. |
| 데스티니 세렌 | Hard | **ESTIMATED** | Wiki lists Destiny Mode under Hard but gives no HP or damage modifier. Ratio 0.200 is unexplained (5× harder than Hard), so HP is assumed = Hard and may be ~5× too low. |
| 데스티니 칼로스 | Chaos | **verified** | Wiki lists Destiny Mode under Chaos. Ratio 1.000. |
| 챔피언 스우 / 진 힐라 / 세렌 | Hard | **verified** | orangemushroom 1.2.416 Union Champion "Hamcelot's Trial" −30% final damage on the "(Hard)" challenges. Ratio 0.700. |
| 챔피언 검은 마법사 | Hard | **verified** | orangemushroom 1.2.416 −25% on "Black Mage (Hard)". Ratio 0.750. |
| 챔피언 칼로스 | Normal | **ESTIMATED** | orangemushroom says "Watcher Kalos (Hard)", but Kalos has no Hard mode. The clearRate ratio vs Normal is exactly 0.700 (vs Chaos 3.34), so Normal is inferred. |

## Pages

- maplestorywiki.net: `Lotus/Monster`, `Damien/Monster`, `Guardian_Angel_Slime`, `Lucid/Monster`, `Will/Monster`, `Gloom`, `Verus_Hilla`, `Darknell/Monster`, `Black_Mage/Monster`, `Seren/Monster`, `Kalos/Monster`, `First_Adversary`, `Kaling/Monster`, `Malefic_Star`, `Limbo/Monster`, `Baldrix/Monster`, `Jupiter/Monster`, `Bellona/Monster`
- https://orangemushroom.net/2025/08/23/kms-ver-1-2-406-maplestory-assemble-the-first-adversary/ (unit check)
- https://orangemushroom.net/2026/01/17/kms-ver-1-2-411-maplestory-crown-sol-hecate-astra-subweapon-radiant-malefic-star (Malefic Star KMS HP)
- https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle (Jupiter, Destiny 2nd Transcendence)
- https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe (HP cut, Champion Mode)
- https://orangemushroom.net/2026/08/28/kms-ver-1-2-418-maplestory-overdrive-the-cruel-executioner-bellona/ (Bellona)

## Images (18/18 real, 0 placeholders)

All files were downloaded once into `public/bosses/<slug>.png` from `https://media.maplestorywiki.net/yetidb/<file>`. Nothing is hotlinked. dusk, baldrix and kaling were resized to at most 600px. Destiny and Champion rows reuse the base boss image.

| slug | file |
|---|---|
| lotus | Mob_Lotus_(3).png |
| damien | Mob_Damien_(2).png |
| guardian-angel-slime | Mob_Guardian_Angel_Slime.png |
| lucid | Mob_Lucid_(2).png |
| will | Mob_Will_(3).png |
| dusk | Mob_Giant_Monster_Gloom.png |
| jin-hilla | Mob_Verus_Hilla.png |
| darknell | Mob_Guard_Captain_Darknell.png |
| black-mage | Mob_Black_Mage.png |
| seren | Mob_Chosen_Seren_(Midday).png |
| kalos | Mob_Kalos_the_Guardian.png |
| first-adversary | Mob_First_Adversary.png |
| kaling | Mob_Kaling.png |
| malefic-star | Mob_Malefic_Star.png |
| limbo | Mob_Limbo_Enlightened_by_Dark_Truth.png |
| baldrix | Mob_Baldrix.png |
| bellona | Mob_Bellona.png (356×264) |
| jupiter | Mob_Jupiter.png (244×192) |
