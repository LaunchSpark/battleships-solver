// packages/battleship-engine/src/rules/validation.js

// TODO: validate whether ship placements and shots are legal.
export function validatePlacement(board, shipPlacement) {
  return { valid: true, errors: [] };
}

export function validateShot(board, row, col) {
  return { valid: true, reason: 'TODO: add real validation' };
}
