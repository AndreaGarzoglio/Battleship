/**
 * @jest-environment jsdom
 */
import {
  renderBoard,
  renderDock,
  setupComputerBoardEvents,
  handleCellClick,
  updateTurnIndicator,
  initGame,
} from "./domController.js";
import { Gameboard } from "../game/gameboard.js";
import { Ship } from "../game/ship.js";
import { Player, Computer } from "../game/player.js";

describe("renderBoard", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
  });

  test("renders 100 cells tagged with row/col, clearing old cells on re-render", () => {
    const gameboard = new Gameboard();
    renderBoard(gameboard, container, false);
    renderBoard(gameboard, container, false);
    expect(container.children.length).toBe(100);
    expect(container.children[0].dataset.row).toBe("0");
    expect(container.children[0].dataset.col).toBe("0");
    expect(container.children[99].dataset.row).toBe("9");
    expect(container.children[99].dataset.col).toBe("9");
  });

  test("reveals an unattacked ship only on the own board", () => {
    const gameboard = new Gameboard();
    gameboard.placeShip(new Ship(2), [0, 0], "horizontal");

    renderBoard(gameboard, container, false);
    expect(
      container
        .querySelector('[data-row="0"][data-col="0"]')
        .classList.contains("ship"),
    ).toBe(false);

    renderBoard(gameboard, container, true);
    expect(
      container
        .querySelector('[data-row="0"][data-col="0"]')
        .classList.contains("ship"),
    ).toBe(true);
  });

  test("marks a miss, and a hit that sinks the ship, on either board", () => {
    const gameboard = new Gameboard();
    gameboard.placeShip(new Ship(1), [0, 0], "horizontal"); // sinks on first hit
    gameboard.receiveAttack([0, 0]);
    gameboard.receiveAttack([3, 3]);
    renderBoard(gameboard, container, false);

    const shipCell = container.querySelector('[data-row="0"][data-col="0"]');
    expect(shipCell.classList.contains("hit")).toBe(true);
    expect(shipCell.classList.contains("sunk")).toBe(true);
    expect(
      container
        .querySelector('[data-row="3"][data-col="3"]')
        .classList.contains("miss"),
    ).toBe(true);
  });
});

describe("renderDock", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
  });

  test("renders 5 draggable ships with lengths [2,3,3,4,5] when none are placed yet", () => {
    const board = new Gameboard();
    renderDock(container, board);
    renderDock(container, board);
    expect(container.children.length).toBe(5);
    const lengths = Array.from(container.children)
      .map((el) => Number(el.dataset.length))
      .sort();
    expect(lengths).toEqual([2, 3, 3, 4, 5]);
    expect(Array.from(container.children).every((el) => el.draggable)).toBe(
      true,
    );
    expect(
      Array.from(container.children).every(
        (el) => el.dataset.direction === "horizontal",
      ),
    ).toBe(true);
  });

  test("omits a length already present in board.ships", () => {
    const board = new Gameboard();
    board.placeShip(new Ship(3), [0, 0], "horizontal");
    renderDock(container, board);
    const lengths = Array.from(container.children)
      .map((el) => Number(el.dataset.length))
      .sort();
    expect(lengths).toEqual([2, 3, 4, 5]); // one of the two 3s is gone
  });
});

describe("setupComputerBoardEvents", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    for (let i = 0; i < 3; i++) {
      const cell = document.createElement("div");
      cell.dataset.row = "2";
      cell.dataset.col = "4";
      container.appendChild(cell);
    }
  });

  test("calls onCellClick with numeric row/col read from the clicked cell's dataset", () => {
    const onCellClick = jest.fn();
    setupComputerBoardEvents(container, onCellClick);
    container.children[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(onCellClick).toHaveBeenCalledWith(2, 4);
  });

  test("does not call onCellClick when the container itself is clicked (not a cell)", () => {
    const onCellClick = jest.fn();
    setupComputerBoardEvents(container, onCellClick);
    container.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onCellClick).not.toHaveBeenCalled();
  });

  test("attaches a single listener that works for every cell (event delegation)", () => {
    const onCellClick = jest.fn();
    setupComputerBoardEvents(container, onCellClick);
    container.children[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    container.children[1].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    container.children[2].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(onCellClick).toHaveBeenCalledTimes(3);
  });
});

describe("updateTurnIndicator", () => {
  beforeEach(() => {
    document.body.innerHTML = '<p id="turn-indicator"></p>';
  });

  test("sets the #turn-indicator element's textContent", () => {
    updateTurnIndicator("Your turn");
    expect(document.querySelector("#turn-indicator").textContent).toBe(
      "Your turn",
    );
  });

  test("overwrites any previous text", () => {
    updateTurnIndicator("Your turn");
    updateTurnIndicator("Bob's turn");
    expect(document.querySelector("#turn-indicator").textContent).toBe(
      "Bob's turn",
    );
  });
});

describe("initGame + handleCellClick", () => {
  beforeEach(() => {
    document.body.innerHTML = `
            <div id="companion-ai"><span id="companion-ai-face"></span><p id="companion-ai-line"></p></div>
            <div id="companion-malware"><span id="companion-malware-face"></span><p id="companion-malware-line"></p></div>
            <p id="turn-indicator"></p>
            <div id="player-board-wrapper" hidden><div id="player-board" class="board"></div></div>
            <div id="battle-phase" hidden>
                <div id="computer-board" class="board"></div>
            </div>
            <div id="pass-phase" hidden>
                <h2 id="pass-message"></h2>
                <button id="pass-ready">Ready</button>
            </div>
            <div id="game-over" hidden><button id="play-again">Play Again</button></div>
            <button id="next-turn" hidden>Next Turn</button>
        `;
  });

  test("initGame (PvE) renders both boards right away, revealing ships only on the player's own", () => {
    const player = new Player("You");
    const computer = new Computer();
    player.board.placeShip(new Ship(2), [0, 0], "horizontal");
    computer.board.placeShip(new Ship(2), [0, 0], "horizontal");
    initGame(player, computer, false);

    expect(document.querySelector("#player-board").children.length).toBe(100);
    expect(document.querySelector("#computer-board").children.length).toBe(100);
    expect(
      document
        .querySelector('#player-board [data-row="0"][data-col="0"]')
        .classList.contains("ship"),
    ).toBe(true);
    expect(
      document
        .querySelector('#computer-board [data-row="0"][data-col="0"]')
        .classList.contains("ship"),
    ).toBe(false);
  });

  test("initGame (PvE) still shows the human's own board first even when the human is passed as side2", () => {
    const player = new Player("You");
    const computer = new Computer();
    player.board.placeShip(new Ship(2), [0, 0], "horizontal");
    initGame(computer, player, false); // computer passed as side1 this time
    expect(
      document
        .querySelector('#player-board [data-row="0"][data-col="0"]')
        .classList.contains("ship"),
    ).toBe(true);
  });

  test("initGame (PvP) shows the pass screen instead of the boards until Ready is clicked", () => {
    const player1 = new Player("Alice");
    const player2 = new Player("Bob");
    initGame(player1, player2, true);

    expect(document.getElementById("pass-phase").hidden).toBe(false);
    expect(document.getElementById("battle-phase").hidden).toBe(true);
    expect(document.getElementById("pass-message").textContent).toBe(
      "Pass the device to Alice",
    );

    document
      .getElementById("pass-ready")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.getElementById("pass-phase").hidden).toBe(true);
    expect(document.getElementById("battle-phase").hidden).toBe(false);
  });

  test("clicking a computer board cell attacks it and updates the board", () => {
    jest.useFakeTimers();
    const player = new Player("You");
    const computer = new Computer();
    computer.board.placeShip(new Ship(2), [0, 0], "horizontal");
    initGame(player, computer, false);

    document
      .querySelector('#computer-board [data-row="0"][data-col="0"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    jest.advanceTimersByTime(300); // let the firing-flash delay elapse before the attack resolves

    expect(computer.board.grid[0][0].attacked).toBe(true);
    expect(
      document
        .querySelector('#computer-board [data-row="0"][data-col="0"]')
        .classList.contains("hit"),
    ).toBe(true);
    jest.useRealTimers();
  });

  test("announces the winner when the computer's last ship is sunk", () => {
    const player = new Player("You");
    const computer = new Computer();
    computer.board.placeShip(new Ship(1), [0, 0], "horizontal"); // sinks in 1 hit
    initGame(player, computer, false);
    handleCellClick(0, 0);
    expect(
      document.querySelector("#turn-indicator").textContent.toLowerCase(),
    ).toMatch(/win|won/);
  });

  test("re-clicking an already-attacked cell shows a message instead of throwing", () => {
    jest.useFakeTimers();
    const player = new Player("You");
    const computer = new Computer();
    player.board.placeShip(new Ship(5), [0, 0], "vertical"); // survives the computer's one turn
    computer.board.placeShip(new Ship(2), [5, 5], "horizontal");
    initGame(player, computer, false);
    handleCellClick(0, 0);
    jest.runAllTimers(); // let the computer's delayed turn resolve so input isn't locked
    expect(() => handleCellClick(0, 0)).not.toThrow();
    expect(document.querySelector("#turn-indicator").textContent).toBe(
      "You've already attacked that cell.",
    );
    jest.useRealTimers();
  });

  test("ignores clicks while the computer's turn is pending", () => {
    jest.useFakeTimers();
    const player = new Player("You");
    const computer = new Computer();
    computer.board.placeShip(new Ship(2), [5, 5], "horizontal");
    initGame(player, computer, false);
    handleCellClick(0, 0);
    handleCellClick(1, 1); // should be ignored - computer's turn is still pending
    expect(player.board.grid.flat().filter((c) => c.attacked).length).toBe(0);
    jest.runAllTimers(); // let the pending turn resolve so isLocked doesn't leak into later tests
    jest.useRealTimers();
  });

  test("delays the computer's turn and shows a thinking message meanwhile", () => {
    jest.useFakeTimers();
    const player = new Player("You");
    const computer = new Computer("Skynet");
    computer.board.placeShip(new Ship(5), [5, 5], "horizontal"); // long ship, unlikely to be sunk by one hit
    initGame(player, computer, false);

    handleCellClick(0, 0);
    expect(document.querySelector("#turn-indicator").textContent).toBe(
      "Skynet is thinking...",
    );
    expect(player.board.grid.flat().filter((c) => c.attacked).length).toBe(0); // computer hasn't attacked yet

    jest.runAllTimers();
    expect(document.querySelector("#turn-indicator").textContent).not.toBe(
      "Skynet is thinking...",
    );
    jest.useRealTimers();
  });

  test("in PvP, a non-winning turn shows the pass screen for the next player instead of the boards", () => {
    const player1 = new Player("Alice");
    const player2 = new Player("Bob");
    player2.board.placeShip(new Ship(2), [5, 5], "horizontal");
    initGame(player1, player2, true);
    document
      .getElementById("pass-ready")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    handleCellClick(0, 0); // miss, game continues

    expect(document.getElementById("pass-phase").hidden).toBe(false);
    expect(document.getElementById("pass-message").textContent).toBe(
      "Pass the device to Bob",
    );
  });

  test("reveals the winning computer's still-standing ships to the losing human", () => {
    // A sunk fleet is already 100% visible (every one of its cells had to
    // be attacked to sink it) - the meaningful reveal is the WINNER's
    // ships that were never found. Give the player exactly one ship at
    // [0,0] so the computer's very first (undirected, row-major) shot
    // deterministically lands on it once Math.random is pinned to 0,
    // while the computer's own second ship stays completely untouched.
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0);
    const player = new Player("You");
    const computer = new Computer("Skynet");
    player.board.placeShip(new Ship(1), [0, 0], "horizontal");
    computer.board.placeShip(new Ship(5), [9, 5], "horizontal"); // never attacked
    initGame(player, computer, false);

    handleCellClick(3, 3); // player's shot at plain water - a miss, hands the turn to the computer
    jest.runAllTimers(); // computer's turn resolves; with Math.random=0 it deterministically attacks [0,0] and wins

    expect(document.getElementById("game-over").hidden).toBe(false);
    const revealedCell = document.querySelector(
      '#computer-board [data-row="9"][data-col="5"]',
    );
    expect(revealedCell.classList.contains("ship")).toBe(true);

    Math.random.mockRestore();
    jest.useRealTimers();
  });
});

describe("initGame (Computer vs Computer)", () => {
  beforeEach(() => {
    document.body.innerHTML = `
            <div id="companion-ai"><span id="companion-ai-face"></span><p id="companion-ai-line"></p></div>
            <div id="companion-malware"><span id="companion-malware-face"></span><p id="companion-malware-line"></p></div>
            <p id="turn-indicator"></p>
            <div id="player-board-wrapper" hidden><div id="player-board" class="board"></div></div>
            <div id="battle-phase" hidden><div id="computer-board" class="board"></div></div>
            <div id="pass-phase" hidden><h2 id="pass-message"></h2><button id="pass-ready">Ready</button></div>
            <div id="game-over" hidden><button id="play-again">Play Again</button></div>
            <button id="next-turn" hidden>Next Turn</button>
        `;
  });

  test("shows the Next Turn button instead of wiring clickable boards, with no pass screen", () => {
    const computer1 = new Computer("CPU One");
    const computer2 = new Computer("CPU Two");
    computer1.placeShipsRandomly();
    computer2.placeShipsRandomly();
    initGame(computer1, computer2, false);

    expect(document.getElementById("next-turn").hidden).toBe(false);
    expect(document.getElementById("pass-phase").hidden).toBe(true);
    expect(document.getElementById("battle-phase").hidden).toBe(false);
  });

  test("clicking Next Turn resolves exactly one attack, synchronously, with no delay", () => {
    const computer1 = new Computer("CPU One");
    const computer2 = new Computer("CPU Two");
    computer1.placeShipsRandomly();
    computer2.placeShipsRandomly();
    initGame(computer1, computer2, false);

    const attackedBefore = computer2.board.grid
      .flat()
      .filter((c) => c.attacked).length;
    document
      .getElementById("next-turn")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const attackedAfter = computer2.board.grid
      .flat()
      .filter((c) => c.attacked).length;

    expect(attackedAfter).toBe(attackedBefore + 1);
  });

  test("hides the Next Turn button once the match ends", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const computer1 = new Computer("CPU One");
    const computer2 = new Computer("CPU Two");
    computer2.board.placeShip(new Ship(1), [0, 0], "horizontal"); // sinks in one deterministic hit
    initGame(computer1, computer2, false);

    document
      .getElementById("next-turn")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.getElementById("next-turn").hidden).toBe(true);
    expect(document.getElementById("game-over").hidden).toBe(false);
    Math.random.mockRestore();
  });
});
