// game flow only - no DOM
import { Computer } from "./player.js";

class GameController {
  // current/opponent track whose turn it is; winner stays null until someone wins
  constructor(player1, player2) {
    this.player1 = player1;
    this.player2 = player2;
    this.current = player1;
    this.opponent = player2;
    this.winner = null;
  }

  // runs one attack (coordinate is ignored for a Computer, which picks its own),
  // sets the winner if that sinks the opponent's fleet, otherwise swaps turns
  takeTurn(coordinate) {
    const result =
      this.current instanceof Computer
        ? this.current.attack(this.opponent)
        : this.current.attack(this.opponent, coordinate);

    if (this.opponent.board.allSunk()) {
      this.winner = this.current;
    } else {
      [this.current, this.opponent] = [this.opponent, this.current];
    }
    return { result, winner: this.winner };
  }
}

export { GameController };
