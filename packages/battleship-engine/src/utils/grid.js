// packages/battleship-engine/src/utils/grid.js

// TODO: helper utilities for working with grid coordinates.
export function inBounds(board, row, col) {
  return row >= 0 && col >= 0 && row < board.length && col < board[0].length;
}
