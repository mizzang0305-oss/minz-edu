# Design QA

## Comparison target

- Source visual truth: `C:/Users/LOVE/AppData/Local/Temp/codex-clipboard-23b08d1a-343a-41a7-bf3b-bde633af126e.png`
- Browser-rendered implementation: `C:/Users/LOVE/MyProjects/Minz_Edu/output/playwright/battle-command-console-478x850.png`
- Viewports checked: 390x844 phone, 478x850 reference size, 768x1024 tablet, 1366x768 desktop.
- State: number forest boss combat, first learning question, wrong-answer hit feedback, correct-answer dodge and next-question transition.

## Full-view comparison evidence

The source and implementation were opened in the same visual comparison input. The source separates the Phaser battle and the question with a large white page gap. The implementation keeps the map, momentum HUD, boss warning, question, and answer controls inside one navy game frame. At 390x844 the page scroll size equals the viewport, and the command console ends inside the game frame.

## Focused region comparison evidence

- Battle-to-question boundary: the white page break is removed; the boss warning flows directly into the command console.
- Question region: learning steps, prompt, supporting copy, and three answer buttons are visible without page scrolling.
- Feedback region: a wrong answer updates shield 25 to 17 and shows the explanation in the in-game message bar; a correct answer advances the seal and swaps to the next question.
- Responsive region: tablet uses the same single game cockpit, desktop places the command console beside the battle map, and short landscape screens use a two-column cockpit.

## Fidelity surfaces

- Fonts and typography: Korean copy uses the existing game typography, keeps full words intact, and preserves a clear question hierarchy.
- Spacing and layout rhythm: the command console starts immediately after the battle message; controls remain at least 44px high and no horizontal overflow was observed.
- Colors and visual tokens: navy, cyan, gold, and pale-yellow command buttons match the existing RPG HUD and reward styling.
- Image quality and asset fidelity: the existing Phaser raster map and characters are preserved at their intended crop and integer-scaled rendering; no placeholder asset was introduced.
- Copy and content: all curriculum prompts, choices, boss warning timing, hint actions, and feedback explanations are preserved.

## Comparison history

1. P1: the question appeared as a separate white web page below the battle.
   - Fix: moved the mission panel into `.battle-visual` and restyled it as an in-game command console.
   - Post-fix evidence: `battle-command-console-478x850.png` shows battle and question in one frame.
2. P2: the first integrated pass vertically centered the question and left a large gap above it.
   - Fix: changed the mobile command console to start-aligned content.
   - Post-fix evidence: the learning steps and prompt now begin directly beneath the battle message.

## Findings

No actionable P0/P1/P2 mismatch remains in this scope. Browser verification found no console error for the Minz Edu local origin. The mobile layout measured 390x844 with document scroll width 390 and scroll height 844.

## Follow-up polish

- P3: the remaining empty lower command-console area can later hold a contextual skill button, item shortcut, or companion hint without moving the core answer controls.

final result: passed
