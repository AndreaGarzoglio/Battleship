# BATTLESHIP.EXE

Battleship, wrapped in a hacking/network-intrusion theme, built as the capstone for The Odin Project's Advanced JavaScript course. Classic rules underneath: two 10x10 grids, five ships each, alternating turns.

**[Play it here](https://andreagarzoglio.github.io/Battleship/)** _(replace with your actual GitHub Pages URL)_

## The idea

The assignment's point is architecture: game logic fully decoupled from the DOM, so it can be built and tested before any UI exists. `src/game/` never touches `document`; everything that does lives in `src/ui/`.

Beyond the required scope, this version adds three game modes, a computer opponent with real target-tracking, a two-character dialogue system, and a terminal/matrix visual theme.

## Features

- **Three game modes** — Player vs. Computer, Player vs. Player (shared-device hotseat, boards hidden between turns), and Computer vs. Computer (paced by a "Next Turn" button so it's watchable).
- **Manual ship placement** — drag from a dock, click to rotate, drag to reposition. Invalid drops are rejected with visual feedback.
- **A computer opponent with target-tracking logic** — hunts adjacent cells after a hit, follows the discovered line until the ship sinks, then returns to random search.
- **A dialogue/commentary layer** — two characters react to hits, misses, and sunk ships, typed out with a terminal-style effect, plus an opening briefing.
- **A hacking/terminal visual theme** — canvas Matrix-style background, CRT scanlines, fake terminal bar, turn-reactive glow.
- **Accessibility guards** — animations respect `prefers-reduced-motion` and skip automatically under Jest.

## How it's built

```
src/
  index.js, index.html, styles.css   entry point

  game/                              pure game logic, zero DOM
    ship.js                          a single ship: length + hit count
    gameboard.js                     10x10 grid: placement, attacks, win condition
    player.js                        Player (human) and Computer (with targeting AI)
    gameController.js                turn order and win detection

  ui/                                everything DOM-facing
    domController.js                 rendering, event wiring, game-flow glue
    matrix.js                        the canvas background effect

  content/
    dialogue.js                      the two commentators' lines
```

`game/` is dependency-free plain JS; `ui/` imports from it, never the reverse. Placement rules, hit/sink/win conditions, and the computer's hunting behavior are covered by a 56-test Jest suite that runs without a browser (`jsdom` is used only for the UI-layer tests).

## Stack

Vanilla JavaScript (ES modules), HTML5 drag-and-drop, CSS Grid, Canvas 2D — no framework. Webpack + Babel + Jest, deployed to GitHub Pages.

## Authorship

The game logic: `Ship`, `Gameboard`, `Player`/`Computer`, `GameController` and their tests were my own work. Built pseudocode-first, test-first, with an LLM used to check my reasoning and review code, not write it.

The visual layer: matrix rain, terminal theme, dialogue writing and CSS were built with heavier LLM assistance. This project's intent was to test my JS and logic skills, the visuals were meant to be barebones, but instead I took this as an opportunity to test out the capabilities of LLMs as tools.

I think that second skill matters almost as much as the first, these days. Knowing how to code is what lets me tell whether an LLM's output is actually correct rather than just plausible-looking; that part isn't optional. But directing one efficiently and reviewing its output critically is its own skill, and increasingly a necessary one in a work environment.
