import { Ship } from "./ship.js";
import { Gameboard } from "./gameboard.js";
import { Player, Computer } from "./player.js";
import { GameController } from "./gameController.js";

describe("Ship", () => {
  test("is not sunk with fewer hits than length", () => {
    const ship = new Ship(3);
    ship.hit();
    ship.hit();
    expect(ship.isSunk()).toBe(false);
  });
  test("is sunk once hits reach length", () => {
    const ship = new Ship(3);
    ship.hit();
    ship.hit();
    ship.hit();
    expect(ship.isSunk()).toBe(true);
  });
});

describe("Gameboard", () => {
  describe("constructor", () => {
    test("starts with an empty grid and no ships", () => {
      const gameboard = new Gameboard();
      expect(gameboard.grid[0][0]).toEqual({ ship: null, attacked: false });
      expect(gameboard.grid[9][9]).toEqual({ ship: null, attacked: false });
      expect(gameboard.ships).toEqual([]);
    });
  });

  describe("placeShip", () => {
    test("adds the ship to this.ships on successful placement", () => {
      const gameboard = new Gameboard();
      const ship = new Ship(3);
      gameboard.placeShip(ship, [6, 7], "vertical");
      expect(gameboard.ships).toContain(ship);
    });
    test('throws "Ship can\'t be placed here!" when placement would overlap another ship', () => {
      const gameboard = new Gameboard();
      gameboard.placeShip(new Ship(3), [6, 7], "vertical");
      expect(() => {
        gameboard.placeShip(new Ship(5), [7, 3], "horizontal");
      }).toThrow("Ship can't be placed here!");
    });
    test('throws "Invalid direction!" when dir isn\'t "vertical" or "horizontal"', () => {
      const gameboard = new Gameboard();
      expect(() => {
        gameboard.placeShip(new Ship(3), [0, 0], "diagonal");
      }).toThrow("Invalid direction!");
    });
    test('throws "Coordinate outside of bounds!" when placement would go off the grid', () => {
      const gameboard = new Gameboard();
      expect(() => {
        gameboard.placeShip(new Ship(3), [10, 0], "vertical");
      }).toThrow("Coordinate outside of bounds!");
    });
  });

  describe("rotateShip", () => {
    test("flips a horizontal ship to vertical, pivoting on its first cell", () => {
      const gameboard = new Gameboard();
      const ship = new Ship(3);
      gameboard.placeShip(ship, [2, 2], "horizontal"); // [2,2] [2,3] [2,4]
      expect(gameboard.rotateShip(ship)).toBe(true);
      expect(gameboard.cellsOf(ship)).toEqual([
        [2, 2],
        [3, 2],
        [4, 2],
      ]);
    });

    test("returns false and leaves the ship in place when the rotation would go out of bounds", () => {
      const gameboard = new Gameboard();
      const ship = new Ship(3);
      gameboard.placeShip(ship, [8, 0], "horizontal"); // rotating vertical would need rows 8-10, out of bounds
      expect(gameboard.rotateShip(ship)).toBe(false);
      expect(gameboard.cellsOf(ship)).toEqual([
        [8, 0],
        [8, 1],
        [8, 2],
      ]);
    });

    test("returns false and leaves the ship in place when the rotation would overlap another ship", () => {
      const gameboard = new Gameboard();
      const ship = new Ship(2);
      gameboard.placeShip(ship, [0, 0], "horizontal"); // [0,0] [0,1]
      gameboard.placeShip(new Ship(2), [1, 0], "horizontal"); // blocks the vertical rotation at [1,0]
      expect(gameboard.rotateShip(ship)).toBe(false);
      expect(gameboard.cellsOf(ship)).toEqual([
        [0, 0],
        [0, 1],
      ]);
    });
  });

  describe("removeShip", () => {
    test("clears the ship's cells and drops it from this.ships", () => {
      const gameboard = new Gameboard();
      const ship = new Ship(2);
      gameboard.placeShip(ship, [0, 0], "horizontal");
      gameboard.removeShip(ship);
      expect(gameboard.ships).not.toContain(ship);
      expect(gameboard.grid[0][0].ship).toBeNull();
      expect(gameboard.grid[0][1].ship).toBeNull();
    });

    test("allows placing a new ship where the removed one was", () => {
      const gameboard = new Gameboard();
      const ship = new Ship(2);
      gameboard.placeShip(ship, [0, 0], "horizontal");
      gameboard.removeShip(ship);
      expect(() =>
        gameboard.placeShip(new Ship(3), [0, 0], "horizontal"),
      ).not.toThrow();
    });
  });

  describe("receiveAttack", () => {
    test("returns { hit: true, sunk: false } on a hit that does not sink the ship", () => {
      const gameboard = new Gameboard();
      gameboard.placeShip(new Ship(2), [6, 7], "vertical");
      expect(gameboard.receiveAttack([6, 7])).toEqual({
        hit: true,
        sunk: false,
      });
    });
    test("returns { hit: true, sunk: true } when the attack sinks the ship", () => {
      const gameboard = new Gameboard();
      gameboard.placeShip(new Ship(2), [6, 7], "vertical");
      gameboard.receiveAttack([6, 7]);
      expect(gameboard.receiveAttack([7, 7])).toEqual({
        hit: true,
        sunk: true,
      });
    });
    test("returns { hit: false, sunk: false } on a miss", () => {
      const gameboard = new Gameboard();
      expect(gameboard.receiveAttack([0, 0])).toEqual({
        hit: false,
        sunk: false,
      });
    });
    test('throws "Coordinates outside of bounds!" for an out-of-bounds attack', () => {
      const gameboard = new Gameboard();
      expect(() => {
        gameboard.receiveAttack([10, 0]);
      }).toThrow("Coordinates outside of bounds!");
    });
    test('throws "Cell already attacked!" when attacking the same cell twice', () => {
      const gameboard = new Gameboard();
      gameboard.receiveAttack([0, 0]);
      expect(() => {
        gameboard.receiveAttack([0, 0]);
      }).toThrow("Cell already attacked!");
    });
  });

  describe("allSunk", () => {
    test("is false until every placed ship is sunk", () => {
      const gameboard = new Gameboard();
      gameboard.placeShip(new Ship(1), [0, 0], "vertical");
      gameboard.placeShip(new Ship(1), [0, 1], "vertical");
      gameboard.receiveAttack([0, 0]);
      expect(gameboard.allSunk()).toBe(false);
      gameboard.receiveAttack([0, 1]);
      expect(gameboard.allSunk()).toBe(true);
    });
  });
});

describe("Player", () => {
  test("constructor creates a board and stores the name", () => {
    const player = new Player("Fun Gang");
    expect(player.board).toBeInstanceOf(Gameboard);
    expect(player.name).toBe("Fun Gang");
  });

  test("attack forwards the coordinate to foe.board.receiveAttack", () => {
    const player = new Player("Fun Gang");
    const foe = new Player("Foe");
    foe.board.placeShip(new Ship(2), [0, 0], "horizontal");
    expect(player.attack(foe, [0, 0])).toEqual({ hit: true, sunk: false });
  });
});

describe("Computer", () => {
  test("constructor creates a board, empty hits, and stores the name", () => {
    const computer = new Computer("Skynet");
    expect(computer.board).toBeInstanceOf(Gameboard);
    expect(computer.hits).toEqual([]);
    expect(computer.name).toBe("Skynet");
  });

  describe("tracking", () => {
    test("is empty when there are no hits yet", () => {
      const computer = new Computer();
      expect(computer.tracking(new Player("Foe"))).toEqual([]);
    });

    test("returns the 4 in-bounds, untried neighbors of a single hit", () => {
      const computer = new Computer();
      const foe = new Player("Foe");
      foe.board.grid[4][5].attacked = true; // one neighbor already tried
      computer.hits = [[5, 5]];
      const targets = computer.tracking(foe);
      expect(targets).toHaveLength(3);
      expect(targets).not.toContainEqual([4, 5]);
    });

    test("extends past the ends of a horizontal line of hits", () => {
      const computer = new Computer();
      computer.hits = [
        [5, 5],
        [5, 6],
      ];
      const targets = computer.tracking(new Player("Foe"));
      expect(targets).toEqual(
        expect.arrayContaining([
          [5, 4],
          [5, 7],
        ]),
      );
      expect(targets).toHaveLength(2);
    });

    test("extends past the ends of a vertical line of hits", () => {
      const computer = new Computer();
      computer.hits = [
        [5, 5],
        [6, 5],
      ];
      const targets = computer.tracking(new Player("Foe"));
      expect(targets).toEqual(
        expect.arrayContaining([
          [4, 5],
          [7, 5],
        ]),
      );
      expect(targets).toHaveLength(2);
    });
  });

  describe("attack", () => {
    function markAllAttackedExcept(board, exceptions) {
      const kept = new Set(exceptions.map(([r, c]) => `${r},${c}`));
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (!kept.has(`${r},${c}`)) board.grid[r][c].attacked = true;
        }
      }
    }

    test("falls back to a random untried cell when there is nothing to track", () => {
      const computer = new Computer();
      const foe = new Player("Foe");
      markAllAttackedExcept(foe.board, [[9, 9]]);
      computer.attack(foe);
      expect(foe.board.grid[9][9].attacked).toBe(true);
    });

    test("records a hit and resets hits once the ship sinks", () => {
      const computer = new Computer();
      const foe = new Player("Foe");
      foe.board.placeShip(new Ship(1), [9, 9], "horizontal"); // sinks on first hit
      markAllAttackedExcept(foe.board, [[9, 9]]);
      const result = computer.attack(foe);
      expect(result).toEqual({ hit: true, sunk: true });
      expect(computer.hits).toEqual([]);
    });
  });

  describe("placeShipsRandomly", () => {
    test("places 5 non-overlapping ships of the standard lengths", () => {
      const computer = new Computer();
      computer.placeShipsRandomly();
      const lengths = computer.board.ships
        .map((s) => s.length)
        .sort((a, b) => a - b);
      expect(lengths).toEqual([2, 3, 3, 4, 5]);

      const shipCells = [];
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (computer.board.grid[r][c].ship !== null)
            shipCells.push(`${r},${c}`);
        }
      }
      expect(new Set(shipCells).size).toBe(shipCells.length);
    });

    test("does not share ships between separate Computer instances", () => {
      const c1 = new Computer();
      const c2 = new Computer();
      c1.placeShipsRandomly();
      c2.placeShipsRandomly();
      expect(c1.board.ships).toHaveLength(5);
      expect(c2.board.ships).toHaveLength(5);
    });
  });
});

describe("GameController", () => {
  test("constructor sets current/opponent and starts with no winner", () => {
    const player1 = new Player("P1");
    const player2 = new Player("P2");
    const game = new GameController(player1, player2);
    expect(game.current).toBe(player1);
    expect(game.opponent).toBe(player2);
    expect(game.winner).toBeNull();
  });

  describe("takeTurn", () => {
    test("on a miss, attacks the coordinate, swaps turns, and leaves winner null", () => {
      const player1 = new Player("P1");
      const player2 = new Player("P2");
      player2.board.placeShip(new Ship(2), [0, 0], "horizontal");
      const game = new GameController(player1, player2);
      const turnResult = game.takeTurn([5, 5]);
      expect(player2.board.grid[5][5].attacked).toBe(true);
      expect(game.current).toBe(player2);
      expect(game.opponent).toBe(player1);
      expect(game.winner).toBeNull();
      expect(turnResult).toEqual({
        result: { hit: false, sunk: false },
        winner: null,
      });
    });

    test("when the attack sinks the last ship, sets the winner and does not swap turns", () => {
      const player1 = new Player("P1");
      const player2 = new Player("P2");
      player2.board.placeShip(new Ship(1), [0, 0], "horizontal"); // sinks on first hit
      const game = new GameController(player1, player2);
      game.takeTurn([0, 0]);
      expect(game.winner).toBe(player1);
      expect(game.current).toBe(player1);
      expect(game.opponent).toBe(player2);
    });

    test("ignores the coordinate and calls attack() with no args when current is a Computer", () => {
      const computer = new Computer();
      const player2 = new Player("P2");
      player2.board.placeShip(new Ship(2), [0, 0], "horizontal");
      const game = new GameController(computer, player2);
      const attackSpy = jest.spyOn(computer, "attack");
      game.takeTurn();
      expect(attackSpy).toHaveBeenCalledWith(player2);
    });
  });
});
