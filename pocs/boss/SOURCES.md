# Boss data sources

Retrieved 2026-11-16. The seed lives in `data.ts`. Namu wiki returned 403 to automated fetches, so the main source is maplestorywiki.net, the GMS-oriented wiki. Its monster tables come from game data and also list the KMS-only modes.

## Status per field

| Field | Status | Notes |
|---|---|---|
| level | wiki-sourced | Highest phase level for each difficulty. |
| hp | wiki-sourced, derived | Sum of one HP bar per phase. When a phase has several mobs (e.g. Kaling P1 perils, Black Mage P1 knights, Will mirrored pair), the bar counts once. Limbo's 2.1B interlude HP is excluded. White HP shields are excluded. **These are GMS-wiki values, not cross-checked against KMS.** HP nerfs can differ by region (e.g. the GMS "Post-Crown" Kaling nerf). |
| defenseRate | wiki-sourced | Highest phase PDR. Kalos Easy/Normal are 330% in P1 and 380% in P2, so 380 is used. |
| forceType / forceRequired | wiki-sourced | Highest phase requirement (Seren P1 150 → 200; Kalos Normal P1 250 → 300). Lotus, Damien and Guardian Angel Slime have no force requirement. |
| maxParty | wiki-sourced | Extreme Lotus allows 2. First Adversary, Malefic Star, Limbo and Baldrix allow 3. |
| statBasis | derived | `defenseRate >= 380 ? "380" : "300"`. |
| **cut** | **ESTIMATE (all 44)** | `≈ 10,000 × (hp / Normal Lotus hp)^0.3`, rounded. This is a placeholder only: it is monotonic and sensible across difficulties, nothing more. Replace `CUTS` in `data.ts` with maplescouter `calculatedData.bossCuts`. |

Not verified at all:
- The KMS-only Extreme Limbo / Extreme Baldrix rows. The wiki lists them (810 / 830 AUT).
- Verus Hilla's party size. Its infobox did not parse, so 6 is assumed.

## Pages

- https://maplestorywiki.net/w/Lotus/Monster (스우)
- https://maplestorywiki.net/w/Damien/Monster (데미안)
- https://maplestorywiki.net/w/Guardian_Angel_Slime (가디언 엔젤 슬라임)
- https://maplestorywiki.net/w/Lucid/Monster (루시드)
- https://maplestorywiki.net/w/Will/Monster (윌)
- https://maplestorywiki.net/w/Gloom (더스크 = Giant Monster Gloom)
- https://maplestorywiki.net/w/Verus_Hilla (진 힐라)
- https://maplestorywiki.net/w/Darknell/Monster (듄켈)
- https://maplestorywiki.net/w/Black_Mage/Monster (검은 마법사)
- https://maplestorywiki.net/w/Seren/Monster (선택받은 세렌)
- https://maplestorywiki.net/w/Kalos/Monster (감시자 칼로스)
- https://maplestorywiki.net/w/First_Adversary (최초의 대적자)
- https://maplestorywiki.net/w/Kaling/Monster (카링)
- https://maplestorywiki.net/w/Malefic_Star (찬란한 흉성)
- https://maplestorywiki.net/w/Limbo/Monster (림보)
- https://maplestorywiki.net/w/Baldrix/Monster (발드릭스)

Cross-check: maplestory.io KMS v389 mob meta for 카링 (8880837) shows Lv 285 and PDR 380, which matches.

## Images (16/16 real, 0 placeholders)

All files were downloaded once into `public/bosses/<slug>.png` from `https://media.maplestorywiki.net/yetidb/<file>`. Nothing is hotlinked. dusk, baldrix and kaling were resized to at most 600px.

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

maplestory.io (`/api/KMS/389/mob/<id>/render/stand`) also works. It returns animated GIFs, and some mobs (Will, Dusk) come back 1×1. Its latest KMS version (389) has no 최초의 대적자, 찬란한 흉성 or 발드릭스, so the wiki was used for all 16.
