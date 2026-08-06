class Ship {
  // stores length, starts with zero hits
  constructor(length) {
    this.length = length;
    this.hitCounter = 0;
  }

  // records one hit
  hit() {
    this.hitCounter++;
  }

  // true once hits reach the ship's length
  isSunk() {
    return this.hitCounter >= this.length;
  }
}
export { Ship };
