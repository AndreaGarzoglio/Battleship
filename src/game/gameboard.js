class Gameboard {
  // builds a 10x10 grid of empty cells; ships is a flat list of placed Ships
  constructor() {
    this.grid = [];
    this.ships = [];
    for (let row = 0; row < 10; row++) {
      const rowCells = [];
      for (let col = 0; col < 10; col++) {
        rowCells.push({ ship: null, attacked: false });
      }
      this.grid.push(rowCells);
    }
  }

  // lists the [row, col] cells a ship of this length/direction would occupy, anchored at coordinate
  getShipCells(coordinate, length, dir) {
    const [row, col] = coordinate;
    const cells = [];
    for (let i = 0; i < length; i++) {
      cells.push(dir === "vertical" ? [row + i, col] : [row, col + i]);
    }
    return cells;
  }

  // true if any cell falls outside the 10x10 grid
  isOutOfBounds(cells) {
    return cells.some(([r, c]) => r < 0 || c < 0 || r > 9 || c > 9);
  }

  // true if any cell already has a ship
  isOverlapping(cells) {
    return cells.some(([r, c]) => this.grid[r][c].ship !== null);
  }

  // validates and commits a ship's placement, or throws
  placeShip(ship, coordinate, dir) {
    if (dir !== "vertical" && dir !== "horizontal") {
      throw new Error("Invalid direction!");
    }
    const cells = this.getShipCells(coordinate, ship.length, dir);
    if (this.isOutOfBounds(cells)) {
      throw new Error("Coordinate outside of bounds!");
    }
    if (this.isOverlapping(cells)) {
      throw new Error("Ship can't be placed here!");
    }
    cells.forEach(([r, c]) => {
      this.grid[r][c].ship = ship;
    });
    this.ships.push(ship);
  }

  // every [row, col] currently occupied by this ship, found by scanning the grid
  cellsOf(ship) {
    const cells = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (this.grid[r][c].ship === ship) cells.push([r, c]);
      }
    }
    return cells;
  }

  // clears a ship's cells without removing it from this.ships (used to
  // temporarily lift a ship off the board while testing a new placement)
  clearCells(cells) {
    cells.forEach(([r, c]) => {
      this.grid[r][c].ship = null;
    });
  }

  // fully removes a placed ship: clears its cells and drops it from this.ships
  removeShip(ship) {
    this.clearCells(this.cellsOf(ship));
    this.ships.splice(this.ships.indexOf(ship), 1);
  }

  // flips a placed ship's direction, pivoting on its first (lowest row/col)
  // cell; leaves the ship untouched and returns false if the rotation
  // wouldn't fit, otherwise commits it and returns true
  rotateShip(ship) {
    const oldCells = this.cellsOf(ship);
    const [anchor] = oldCells;
    const oldDir =
      oldCells.length > 1 && oldCells[1][0] === anchor[0]
        ? "horizontal"
        : "vertical";
    const newDir = oldDir === "horizontal" ? "vertical" : "horizontal";

    this.clearCells(oldCells);
    const newCells = this.getShipCells(anchor, ship.length, newDir);
    const invalid =
      this.isOutOfBounds(newCells) || this.isOverlapping(newCells);
    const cellsToRestore = invalid ? oldCells : newCells;
    cellsToRestore.forEach(([r, c]) => {
      this.grid[r][c].ship = ship;
    });
    return !invalid;
  }

  // marks a cell attacked and returns { hit, sunk }, or throws for an invalid attack
  receiveAttack([row, col]) {
    if (this.isOutOfBounds([[row, col]])) {
      throw new Error("Coordinates outside of bounds!");
    }
    if (this.grid[row][col].attacked) {
      throw new Error("Cell already attacked!");
    }
    this.grid[row][col].attacked = true;

    const target = this.grid[row][col].ship;
    if (target === null) {
      return { hit: false, sunk: false };
    }
    target.hit();
    return { hit: true, sunk: target.isSunk() };
  }

  // true once every placed ship is sunk
  allSunk() {
    return this.ships.every((ship) => ship.isSunk());
  }
}

export { Gameboard };
