# Design QA

## Comparison target

- Source visual truth:
  - `C:/Users/LOVE/AppData/Local/Temp/codex-clipboard-c0a436b5-f350-44d5-99f5-ca87737f3dff.png` (stage cards with broken Korean wrapping and box sizing)
  - `C:/Users/LOVE/AppData/Local/Temp/codex-clipboard-e62a9f3c-2926-4400-9ecf-883e508b549f.png` (result screen with text-heavy reward presentation)
- Implementation screenshots:
  - `output/playwright/world-stage2-unlocked-chromium.png`
  - `output/playwright/world-stage2-unlocked-tablet-768.png`
  - `output/playwright/world-stage2-unlocked-mobile-360.png`
  - `output/playwright/coop-result-chromium.png`
  - `output/playwright/coop-result-tablet-768.png`
  - `output/playwright/coop-result-mobile-360.png`
  - `output/playwright/inventory-chromium.png`
  - `output/playwright/inventory-tablet-768.png`
  - `output/playwright/inventory-mobile-360.png`
- Viewports: Desktop Chrome, 768x1024 tablet, 360x800 phone.
- State: Stage 1 completed, Stage 2 unlocked, cooperative rewards saved.

## Full-view comparison evidence

The source and implementation images were opened together. The revised stage deck removes character-by-character Korean wrapping, keeps CTA labels intact, and changes from three compressed cards to responsive 3/2/1-column layouts. The revised result replaces symbol-led text rows with character art, reward cards, and direct inventory/stage CTAs.

## Focused region comparison evidence

- Stage CTA region: `다시 도전`, `단어섬 출정`, and supporting copy remain readable inside their cards at desktop and tablet widths.
- Result reward region: each reward has a real raster character/guardian asset, visible rarity, name, and source.
- Mobile header: `보물 가방` remains visible at 360px; only the lower-priority protector link is collapsed.
- Inventory region: reward imagery, count, and next-action controls remain inside the viewport without horizontal overflow.

## Fidelity surfaces

- Fonts and typography: Korean headings use keep-all wrapping and stable line height; compact English labels remain secondary.
- Spacing and layout rhythm: stage grid uses 3 columns on PC, 2 on tablet, and 1 on phone; touch CTAs are at least 56px high.
- Colors and visual tokens: navy, cyan, gold, and rarity colors stay aligned with the existing RPG screens.
- Image quality and asset fidelity: only optimized CC0 Duelyst raster assets are used for stage, reward, result, and inventory imagery; no new placeholder art remains in these regions.
- Copy and content: child-facing actions use short verbs and visible outcomes; implementation-phase wording was removed from the active lobby choices.

## Comparison history

1. P1: Korean text and CTA labels wrapped character-by-character in compressed stage cards.
   - Fix: keep-all typography, 3/2/1 responsive grid, wider card content tracks, single-column CTA layout.
   - Post-fix evidence: desktop and tablet unlocked-stage screenshots show intact words and aligned buttons.
2. P1: result and inventory rewards were mostly text/symbols, and inventory navigation was hidden on mobile.
   - Fix: real asset-led cards, direct result-to-inventory CTA, mobile header inventory visibility.
   - Post-fix evidence: result and inventory screenshots at all three viewport classes.
3. P2: Stage 2 remained visually and functionally locked after Stage 1 completion.
   - Fix: unlock state derives from persisted play history and exposes the Stage 2 CTA.
   - Post-fix evidence: `NEW ROUTE` and `단어섬 출정` are visible after one completed adventure.

## Findings

No actionable P0/P1/P2 visual mismatch remains in the world, result, and inventory comparison scope. The authenticated online lobby uses the same responsive tokens and is covered by build and three-viewport flow tests; a live two-account visual session remains a later integration check.

## Follow-up polish

- P3: replace reused character art with unique stage-specific CC0 assets as the content library grows.

final result: passed
