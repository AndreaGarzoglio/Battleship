// DOM manipulation only
import { GameController } from "../game/gameController.js";
import { Computer, Player } from "../game/player.js";
import { Ship } from "../game/ship.js";
import { getDialogue, LORE } from "../content/dialogue.js";

// set once by initGame()/initPlacement(), shared by the functions below
let gameController;
let playerBoardEl;
let computerBoardEl;
let draggedShip = null;
let isPvp = false; // true when neither side is a Computer - gates the pass-device flow
let isCvc = false; // true when BOTH sides are Computer - gates the Next Turn button flow
let isLocked = false; // true while the computer's delayed turn is pending - blocks input
let lastLine = { ai: null, malware: null }; // last line said per speaker, for no-immediate-repeat

// ===== TYPEWRITER =====

const typingIntervals = new Map(); // element -> active interval, so re-speaking cancels the old one

// true when the typewriter effect should be skipped entirely: under Jest
// (NODE_ENV=test, set automatically by the test runner) so intervals never
// linger past a test's synchronous assertions, or when the user prefers
// reduced motion
function skipTypewriter() {
  const isTestEnv =
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "test";
  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return isTestEnv || reduceMotion;
}

// reveals `text` into `el` one character at a time; cancels any typing
// already in progress on that element first. Calls onDone (if given) once
// the full text is showing.
function typeText(el, text, onDone) {
  if (typingIntervals.has(el)) {
    clearInterval(typingIntervals.get(el));
    typingIntervals.delete(el);
  }
  if (skipTypewriter()) {
    el.textContent = text;
    if (onDone) onDone();
    return;
  }
  el.textContent = "";
  let i = 0;
  const interval = setInterval(() => {
    el.textContent += text[i] ?? "";
    i++;
    if (i >= text.length) {
      clearInterval(interval);
      typingIntervals.delete(el);
      if (onDone) onDone();
    }
  }, 14);
  typingIntervals.set(el, interval);
}

// types the briefing lore one line at a time into #briefing, each line
// staying on screen while the next types below it
function typeLoreLine(container, index) {
  if (index >= LORE.length) return;
  const line = document.createElement("p");
  line.className = "briefing-line";
  container.appendChild(line);
  typeText(line, LORE[index], () => {
    setTimeout(() => typeLoreLine(container, index + 1), 450);
  });
}

// plays the opening lore briefing into #briefing, if present on the page
function playBriefing() {
  const container = document.getElementById("briefing");
  if (!container) return;
  container.innerHTML = "";
  typeLoreLine(container, 0);
}

// ===== SHARED HELPERS =====

// reads a cell's row/col from its dataset; returns null if event.target isn't a cell
function cellCoordinate(event) {
  const row = Number(event.target.dataset.row);
  const col = Number(event.target.dataset.col);
  return Number.isNaN(row) || Number.isNaN(col) ? null : [row, col];
}

// cells the dragged ship would occupy anchored at coordinate, and whether
// that's valid. If draggedShip.ship is set (moving an already-placed ship),
// its current cells are lifted first so it doesn't collide with itself.
function previewPlacement(board, coordinate) {
  const { length, direction, ship } = draggedShip;
  const ownCells = ship ? board.cellsOf(ship) : [];
  board.clearCells(ownCells);

  const cells = board.getShipCells(coordinate, Number(length), direction);
  const invalid = board.isOutOfBounds(cells) || board.isOverlapping(cells);

  if (invalid) {
    ownCells.forEach(([r, c]) => {
      board.grid[r][c].ship = ship;
    });
  }
  return { cells, direction, invalid };
}

// ===== RENDERING =====

// draws gameboard's 10x10 grid into container; isOwnBoard reveals un-attacked ships
function renderBoard(gameboard, container, isOwnBoard) {
  container.innerHTML = "";
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const { ship, attacked } = gameboard.grid[row][col];
      const cell = document.createElement("div");
      cell.dataset.row = row;
      cell.dataset.col = col;
      if (attacked && ship === null) {
        cell.classList.add("miss");
      } else if (attacked && ship !== null) {
        cell.classList.add("hit");
        cell.classList.toggle("sunk", ship.isSunk());
      } else if (isOwnBoard && ship !== null) {
        cell.classList.add("ship");
        cell.draggable = true; // lets a placed ship be picked up and moved during placement
      }
      container.appendChild(cell);
    }
  }
}

// draws the still-unplaced standard-length ships as draggable, click-to-rotate
// divs; lengths already placed on the board (per player.board.ships) are skipped
function renderDock(container, board) {
  const placedLengths = board.ships.map((s) => s.length);
  const lengths = [2, 3, 3, 4, 5];
  for (const length of placedLengths) {
    lengths.splice(lengths.indexOf(length), 1);
  }

  container.innerHTML = "";
  for (const length of lengths) {
    const ship = document.createElement("div");
    ship.dataset.length = length;
    ship.style.setProperty("--len", length); // drives the dock sprite's size in CSS
    ship.dataset.direction = "horizontal";
    ship.draggable = true;
    ship.classList.add("ship");
    ship.addEventListener("click", (event) => {
      const vertical = event.target.dataset.direction !== "vertical";
      event.target.dataset.direction = vertical ? "vertical" : "horizontal";
      event.target.classList.toggle("vertical", vertical);
    });
    ship.addEventListener("dragstart", (event) => {
      draggedShip = {
        length: event.target.dataset.length,
        direction: event.target.dataset.direction,
        ship: null,
      };
    });
    container.appendChild(ship);
  }
}

// ===== EVENT HANDLING =====

// one delegated click listener on container; calls onCellClick(row, col) per cell clicked
function setupComputerBoardEvents(container, onCellClick) {
  container.addEventListener("click", (event) => {
    const coordinate = cellCoordinate(event);
    if (coordinate) onCellClick(...coordinate);
  });
}

// wires the drag-over preview and drop-to-place behavior onto playerBoardEl
function setupPlacementEvents(player, onShipPlaced) {
  playerBoardEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    playerBoardEl.querySelectorAll(".drag-over, .invalid").forEach((cell) => {
      cell.classList.remove("drag-over", "invalid");
    });

    const coordinate = cellCoordinate(event);
    if (!coordinate) return;

    const { cells, invalid } = previewPlacement(player.board, coordinate);
    cells.forEach(([r, c]) => {
      const cell = playerBoardEl.querySelector(
        `[data-row="${r}"][data-col="${c}"]`,
      );
      cell?.classList.toggle(invalid ? "invalid" : "drag-over", true);
    });
  });

  playerBoardEl.addEventListener("drop", (event) => {
    event.preventDefault();
    const coordinate = cellCoordinate(event);
    if (!coordinate) return;

    const { direction, invalid } = previewPlacement(player.board, coordinate);
    if (invalid) return;

    if (draggedShip.ship) {
      player.board.removeShip(draggedShip.ship); // it's already lifted off the grid; drop it from .ships too
      player.board.placeShip(draggedShip.ship, coordinate, direction);
    } else {
      player.board.placeShip(
        new Ship(Number(draggedShip.length)),
        coordinate,
        direction,
      );
    }
    onShipPlaced();
  });

  // dragging a placed ship's cell picks that ship up to be moved
  playerBoardEl.addEventListener("dragstart", (event) => {
    const coordinate = cellCoordinate(event);
    if (!coordinate) return;
    const [row, col] = coordinate;
    const ship = player.board.grid[row][col].ship;
    if (!ship) return;

    const [anchor, second] = player.board.cellsOf(ship);
    const direction =
      second && second[0] === anchor[0] ? "horizontal" : "vertical";
    draggedShip = { length: ship.length, direction, ship };
  });

  // clicking (not dragging) an already-placed ship rotates it in place;
  // flashes red and leaves it untouched if the rotated orientation doesn't fit
  playerBoardEl.addEventListener("click", (event) => {
    const coordinate = cellCoordinate(event);
    if (!coordinate) return;
    const [row, col] = coordinate;
    const ship = player.board.grid[row][col].ship;
    if (!ship) return;

    const fit = player.board.rotateShip(ship);
    if (fit) {
      renderBoard(player.board, playerBoardEl, true);
      return;
    }
    player.board.cellsOf(ship).forEach(([r, c]) => {
      const cell = playerBoardEl.querySelector(
        `[data-row="${r}"][data-col="${c}"]`,
      );
      cell?.classList.add("invalid");
      setTimeout(() => cell?.classList.remove("invalid"), 300);
    });
  });
}

// ===== GAME LOOP GLUE =====

// { hit, sunk } -> the matching dialogue category
function resultCategory(result) {
  if (result.sunk) return "sunk";
  if (result.hit) return "hit";
  return "miss";
}

// shows "Pass the device to <name>" with a Ready button; calls onReady() when clicked
function passDevice(name, onReady) {
  document.getElementById("battle-phase").hidden = true;
  document.getElementById("player-board-wrapper").hidden = true;
  const passPhaseEl = document.getElementById("pass-phase");
  document.getElementById("pass-message").textContent =
    `Pass the device to ${name}`;
  passPhaseEl.hidden = false;
  document.getElementById("pass-ready").addEventListener(
    "click",
    () => {
      passPhaseEl.hidden = true;
      onReady();
    },
    { once: true },
  );
}

// unhides the battle boards and renders human/enemy into playerBoardEl/computerBoardEl.
// revealAll shows the enemy's remaining ships too (used at game end).
function showBattleBoards(human, enemy, revealAll) {
  document.getElementById("player-board-wrapper").hidden = false;
  document.getElementById("battle-phase").hidden = false;
  renderBoard(human.board, playerBoardEl, true);
  renderBoard(enemy.board, computerBoardEl, Boolean(revealAll));
}

// PvE: [human, computer] regardless of which one ended up as player1/player2
function humanAndComputer() {
  return gameController.player1 instanceof Computer
    ? [gameController.player2, gameController.player1]
    : [gameController.player1, gameController.player2];
}

// "you" from the currently displayed perspective: in PvE always the fixed
// human, regardless of whose turn it is; in PvP there's no fixed "you" - the
// caller always says who's being shown (see revealFor)
function viewer() {
  return humanAndComputer()[0];
}

// runs one attack (coordinate omitted for a Computer's turn) and returns its
// result. Does NOT touch dialogue, boards, or focus - callers own that, since
// only they know whether the result is "your" shot or the opponent's.
function playTurn(coordinate) {
  return coordinate
    ? gameController.takeTurn(coordinate)
    : gameController.takeTurn();
}

// re-renders both boards from `who`'s perspective (their own board + whoever
// they're facing) and highlights "ai"/the enemy board if it's currently
// `who`'s turn to attack, otherwise highlights "malware"/their own board
function revealFor(who) {
  const facing =
    who === gameController.player1
      ? gameController.player2
      : gameController.player1;
  showBattleBoards(who, facing);
  focusTurn(who === gameController.current, facing.name);
}

// speaks a result from the viewer's perspective: "ai" always narrates what
// happened to the viewer's own shot, "malware" always reacts as the opponent -
// regardless of whether the opponent is a Computer or another human (PvP)
function narrate(attackerIsViewer, category) {
  speak("ai", attackerIsViewer ? category : null);
  speak("malware", attackerIsViewer ? null : category);
}

// re-renders boards from `you`'s perspective and shows who won, without the
// turn-indicator's "your turn" framing (the game is over, nobody's turn).
// Reveals every remaining ship on both boards, sunk or not, now that the
// game has ended.
function revealWinner(you, winner) {
  const facing =
    you === gameController.player1
      ? gameController.player2
      : gameController.player1;
  showBattleBoards(you, facing, true);
  updateTurnIndicator(`${winner.name} wins!`);
  document.getElementById("next-turn")?.setAttribute("hidden", "");
  document.getElementById("game-over")?.removeAttribute("hidden");
}

// plays a brief "firing" flash on the clicked cell before actually resolving
// the attack, so the shot reads as two beats (fire, then impact) instead of
// an instant result. Skips the delay for already-attacked cells so the
// "already attacked" message still appears immediately.
function fireAt(row, col) {
  if (isLocked) return;
  if (gameController.opponent.board.grid[row][col].attacked) {
    handleCellClick(row, col);
    return;
  }
  isLocked = true;
  const cell = computerBoardEl.querySelector(
    `[data-row="${row}"][data-col="${col}"]`,
  );
  cell?.classList.add("firing");
  setTimeout(() => {
    cell?.classList.remove("firing");
    isLocked = false;
    handleCellClick(row, col);
  }, 280);
}

// runs the Computer's turn after a delay, narrates it from `you`'s
// perspective (the fixed human, who has no screen of its own to switch to),
// and re-reveals the view once it resolves
function runComputerTurn(you) {
  isLocked = true;
  updateTurnIndicator(`${gameController.current.name} is thinking...`);
  setTimeout(() => {
    const { result, winner } = playTurn();
    if (winner) {
      // the Computer (malware) just won this turn - malware celebrates, ai concedes
      speak("malware", "win");
      speak("ai", "lose");
      revealWinner(you, winner);
    } else {
      narrate(false, resultCategory(result));
      revealFor(you);
    }
    isLocked = false;
  }, 900);
}

// resolves one turn in Computer-vs-Computer mode, paced by the Next Turn
// button rather than a timer. Always shown from player1's fixed perspective
// (ai narrates player1's shots, malware narrates player2's), matching the
// same speaker framing used everywhere else.
function playNextCvcTurn() {
  const attacker = gameController.current;
  const { result, winner } = playTurn();
  if (winner) {
    if (winner === gameController.player1) {
      speak("ai", "win");
      speak("malware", "lose");
    } else {
      speak("malware", "win");
      speak("ai", "lose");
    }
    revealWinner(gameController.player1, winner);
    return;
  }
  narrate(attacker === gameController.player1, resultCategory(result));
  revealFor(gameController.player1);
}

// player clicked an enemy cell; follow up with the computer's turn (PvE) or
// pass the device to the next human player (PvP) if the game continues.
// Ignores clicks while a computer's delayed turn is pending, and clicks on
// already-attacked cells, instead of letting receiveAttack throw. In PvP,
// boards for the next player only become visible once they've clicked Ready
// on the pass screen.
function handleCellClick(row, col) {
  if (isLocked) return;
  if (gameController.opponent.board.grid[row][col].attacked) {
    updateTurnIndicator("You've already attacked that cell.");
    return;
  }

  const you = gameController.current;
  const { result, winner } = playTurn([row, col]);
  if (winner) {
    // you just won this turn - ai celebrates, malware concedes
    speak("ai", "win");
    speak("malware", "lose");
    revealWinner(you, winner);
    return;
  }
  narrate(true, resultCategory(result));
  revealFor(you); // show your own shot landing immediately, still your view

  if (gameController.current instanceof Computer) {
    runComputerTurn(you);
  } else if (isPvp) {
    passDevice(gameController.current.name, () =>
      revealFor(gameController.current),
    );
  }
}

// writes text into the #turn-indicator element
function updateTurnIndicator(text) {
  document.getElementById("turn-indicator").textContent = text;
}

// speaks a line for speaker+category; getDialogue itself falls back to "..."
// when category is null/missing (e.g. the speaker has nothing to say about
// the OTHER side's turn, or malware during placement). Types the line out
// and gives the face a little reaction bounce.
function speak(speaker, category) {
  const { text, face } = getDialogue(speaker, category, lastLine[speaker]);
  lastLine[speaker] = text;

  const faceEl = document.getElementById(`companion-${speaker}-face`);
  faceEl.textContent = face;
  faceEl.classList.remove("bounce");
  void faceEl.offsetWidth; // force reflow so the animation restarts every time
  faceEl.classList.add("bounce");

  typeText(document.getElementById(`companion-${speaker}-line`), text);
}

// highlights "your" face (ai) + the enemy board when it's your turn, or
// "their" face (malware) + your own board when it's not. The companion text
// itself never dims - only the face glyph and the active grid react to whose
// turn it is. Also updates the turn indicator text.
function focusTurn(isYourTurn, opponentName) {
  document
    .getElementById("companion-ai-face")
    .classList.toggle("on-turn", isYourTurn);
  document
    .getElementById("battle-phase")
    .classList.toggle("on-turn", isYourTurn);
  document
    .getElementById("companion-malware-face")
    .classList.toggle("on-turn", !isYourTurn);
  document
    .getElementById("player-board-wrapper")
    .classList.toggle("on-turn", !isYourTurn);

  if (isCvc) {
    const active = isYourTurn ? gameController.player1 : gameController.player2;
    updateTurnIndicator(`${active.name}'s turn`);
  } else {
    updateTurnIndicator(isYourTurn ? "Your turn" : `${opponentName}'s turn`);
  }
}

// ===== INIT =====

// runs the placement phase for one human player; calls onComplete() once Start
// Game is clicked with all 5 ships placed. Safe to call twice in a row (PvP) -
// it doesn't decide when to show the battle phase, startSetup does that once
// every side is ready.
function initPlacement(player, onComplete) {
  const placementPhaseEl = document.getElementById("placement-phase");
  const dockEl = document.getElementById("ship-dock");
  const startButton = document.getElementById("start-game");
  const resetButton = document.getElementById("reset-placement");

  // clone+replace playerBoardEl to drop any dragover/drop listeners left
  // over from a previous initPlacement call on the same element
  const oldBoardEl = document.getElementById("player-board");
  playerBoardEl = oldBoardEl.cloneNode(false);
  oldBoardEl.replaceWith(playerBoardEl);

  const refresh = () => {
    renderBoard(player.board, playerBoardEl, true);
    renderDock(dockEl, player.board);
    startButton.disabled = player.board.ships.length < 5;
  };

  startButton.disabled = true;
  document.getElementById("player-board-wrapper").hidden = false;
  document.getElementById("player-board-wrapper").classList.add("on-turn"); // the only board shown - never dimmed
  document.getElementById("companion-ai-face").classList.add("on-turn"); // only ai speaks during placement
  document.getElementById("companion-malware-face").classList.remove("on-turn");
  placementPhaseEl.hidden = false;
  updateTurnIndicator("");
  refresh();
  speak("ai", "intro");
  speak("malware", null); // malware has no placement lines - renders as "..."

  setupPlacementEvents(player, refresh);

  resetButton.addEventListener("click", () => {
    [...player.board.ships].forEach((ship) => player.board.removeShip(ship));
    refresh();
  });

  startButton.addEventListener(
    "click",
    () => {
      placementPhaseEl.hidden = true;
      onComplete();
    },
    { once: true },
  );
}

// starts the battle: builds the GameController and wires attacks. In PvP,
// passes the device to side1 (who goes first) before revealing any board; in
// CvC no board is ever clickable - a Next Turn button paces the match; in PvE
// both boards are just shown right away, nothing to hide from a computer.
// The opening lore briefing (only relevant during setup) is hidden here too.
function initGame(side1, side2, pvp) {
  gameController = new GameController(side1, side2);
  isPvp = pvp;
  isCvc = side1 instanceof Computer && side2 instanceof Computer;
  isLocked = false;
  lastLine = { ai: null, malware: null };
  playerBoardEl = document.getElementById("player-board");
  computerBoardEl = document.getElementById("computer-board");
  document.getElementById("briefing")?.setAttribute("hidden", "");
  document.getElementById("game-over")?.setAttribute("hidden", "");
  document
    .getElementById("play-again")
    ?.addEventListener("click", () => location.reload());

  speak("ai", "battleStart");
  speak("malware", "battleStart");

  if (isCvc) {
    const nextTurnButton = document.getElementById("next-turn");
    nextTurnButton?.removeAttribute("hidden");
    nextTurnButton?.addEventListener("click", playNextCvcTurn);
    revealFor(gameController.player1);
    return;
  }

  setupComputerBoardEvents(computerBoardEl, fireAt);
  if (isPvp) {
    passDevice(gameController.current.name, () =>
      revealFor(gameController.current),
    );
  } else {
    const you = viewer();
    revealFor(you);
    if (gameController.current instanceof Computer) {
      runComputerTurn(you); // the computer ended up going first
    }
  }
}

// builds a Player or Computer from a { name, isComputer } config and gets its
// ships placed, either instantly (Computer) or via initPlacement (human)
function setupSide(sideConfig) {
  const side = sideConfig.isComputer
    ? new Computer(sideConfig.name)
    : new Player(sideConfig.name);
  if (side instanceof Computer) {
    side.placeShipsRandomly();
    return Promise.resolve(side);
  }
  return new Promise((resolve) => {
    initPlacement(side, () => resolve(side));
  });
}

// runs placement for both sides in sequence (human sides wait for the player,
// with a pass-device screen between two human placements), then starts the game
async function startSetup(p1Config, p2Config) {
  const pvp = !p1Config.isComputer && !p2Config.isComputer;
  const side1 = await setupSide(p1Config);
  if (pvp) {
    await new Promise((resolve) => passDevice(p2Config.name, resolve));
  }
  const side2 = await setupSide(p2Config);
  initGame(side1, side2, pvp);
}

export {
  renderBoard,
  renderDock,
  setupComputerBoardEvents,
  handleCellClick,
  updateTurnIndicator,
  initGame,
  startSetup,
  playBriefing,
};
