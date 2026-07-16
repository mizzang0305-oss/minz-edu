# Design QA

## Comparison target

- Source visual truth: `C:/Users/LOVE/AppData/Local/Temp/codex-clipboard-23b08d1a-343a-41a7-bf3b-bde633af126e.png`
- Browser-rendered implementation: `C:/Users/LOVE/MyProjects/Minz_Edu/output/playwright/battle-ingame-question-478x850.png`
- Viewports checked: 390x844 phone, 478x850 reference size, 768x1024 tablet, 1366x768 desktop.
- State: number forest boss combat, first question, wrong-answer hit feedback, correct-answer dodge, and second-question transition.

## Full-view comparison evidence

The source and implementation were opened together in one visual comparison input. The source ends the Phaser map before the question and leaves a large white page gap. The implementation keeps Phaser at full viewport size and floats the boss warning, learning prompt, progress, and answer controls over the lower battle scene. Combat mode also removes the site header on phone, tablet, and desktop.

## Focused region comparison evidence

- Game area: the Phaser stage measures the full 390x844 phone viewport instead of approximately the upper 42 percent.
- Question overlay: the first command panel is 217px high and stays inside the bottom of the same game frame.
- Feedback: wrong answers update the shield and explanation in the overlay; correct answers update the seal, boss HP, and next question without leaving the scene.
- Navigation: a 44px-class `모험 지도` button remains inside the upper-left game HUD after the web header is removed.
- Responsive behavior: tablet and desktop retain full-screen Phaser; short landscape screens move the question dock to the right side.

## Fidelity surfaces

- Fonts and typography: Korean question copy remains intact with a clear prompt hierarchy and compact game-HUD supporting text.
- Spacing and layout rhythm: battle actors stay in the central scene while the command dock occupies only the lower portion; no document scroll or horizontal overflow remains.
- Colors and visual tokens: translucent navy, cyan progress, gold borders, and pale-yellow command buttons match the established RPG HUD.
- Image quality and asset fidelity: existing Phaser raster map, heroes, and boss remain the full-screen visual source; no substitute or placeholder asset was introduced.
- Copy and content: curriculum prompts, choices, boss warning timing, hints, and correct/incorrect explanations are unchanged.

## Comparison history

1. P1: the source displayed the question as a separate white page below the game.
   - First fix: moved the mission panel into the battle frame, but it still divided the screen into game and console regions.
2. P1: the first fix still reduced the visible game area instead of placing the question inside the scene.
   - Final fix: made Phaser fill the entire combat viewport and changed message/question controls into absolute in-scene HUD overlays.
   - Post-fix evidence: `battle-ingame-question-478x850.png` shows the map behind the complete question and choices.
3. P2: desktop retained the site header and pushed the battle below the fold.
   - Fix: combat mode is now full-screen on every breakpoint with an in-game map exit button.
   - Post-fix evidence: 1366x768 browser verification measured the game stage at 1364x766 with document height 768.

## Findings

No actionable P0/P1/P2 mismatch remains in this scope. The 390x844 verification measured both the Phaser stage and document at the viewport height, with the complete first-question dock ending at y=836. No Minz Edu console warning or error was observed.

## Follow-up polish

- P3: future battle maps can reserve a lower HUD-safe zone in Tiled so small foreground labels never sit behind the command dock.

final result: passed
