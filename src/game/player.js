import { Gameboard } from "./gameboard.js";
import { Ship } from "./ship.js";

// keeps only cells that are on the board and not yet attacked
function untriedCells(cells, board) {
  return cells.filter(
    ([r, c]) =>
      r >= 0 && r <= 9 && c >= 0 && c <= 9 && !board.grid[r][c].attacked,
  );
}

// picks a uniformly random element from a non-empty array
function randomOf(list) {
  return list[Math.floor(Math.random() * list.length)];
}

class Player {
  constructor(name) {
    this.board = new Gameboard();
    this.name = name;
  }

  // attacks foe's board at coordinate
  attack(foe, coordinate) {
    return foe.board.receiveAttack(coordinate);
  }
}

class Computer {
  constructor(name) {
    this.board = new Gameboard();
    this.name = name;
    this.hits = []; // hits so far on the current, not-yet-sunk targeted ship
  }

  // candidate cells to try next, based on hits so far on the current ship:
  // no hits -> nothing to follow up on; one hit -> its 4 neighbors;
  // two+ hits -> the two cells extending past either end of the line
  tracking(foe) {
    if (this.hits.length === 0) {
      return [];
    }
    if (this.hits.length === 1) {
      const [row, col] = this.hits[0];
      const neighbors = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      return untriedCells(neighbors, foe.board);
    }

    const rows = this.hits.map(([r]) => r);
    const cols = this.hits.map(([, c]) => c);
    const sameRow = rows.every((r) => r === rows[0]);
    const sameCol = cols.every((c) => c === cols[0]);
    if (sameRow) {
      const ends = [
        [rows[0], Math.min(...cols) - 1],
        [rows[0], Math.max(...cols) + 1],
      ];
      return untriedCells(ends, foe.board);
    }
    if (sameCol) {
      const ends = [
        [Math.min(...rows) - 1, cols[0]],
        [Math.max(...rows) + 1, cols[0]],
      ];
      return untriedCells(ends, foe.board);
    }
    return [];
  }

  // attacks a tracked cell if any, otherwise a random untried cell;
  // records hits so tracking() can follow up, resets once a ship sinks
  attack(foe) {
    const tracked = this.tracking(foe);
    let chosen;
    if (tracked.length > 0) {
      chosen = randomOf(tracked);
    } else {
      const allCells = [];
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          allCells.push([row, col]);
        }
      }
      chosen = randomOf(untriedCells(allCells, foe.board));
    }

    const result = foe.board.receiveAttack(chosen);
    if (result.hit) {
      this.hits.push(chosen);
    }
    if (result.sunk) {
      this.hits = [];
    }
    return result;
  }

  // places all 5 standard ships at random valid, non-overlapping spots
  placeShipsRandomly() {
    const lengths = [2, 3, 3, 4, 5];
    const dirs = ["horizontal", "vertical"];
    for (const length of lengths) {
      let placed = false;
      while (!placed) {
        const dir = randomOf(dirs);
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        try {
          this.board.placeShip(new Ship(length), [row, col], dir);
          placed = true;
        } catch {
          // invalid placement, try again
        }
      }
    }
  }
}

export { Player, Computer };
