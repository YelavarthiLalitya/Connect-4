import { COLS, ROWS, dropDisc, checkWin, getValidColumns } from './board.js';

export function botMove(board, botDisc, playerDisc) {
  const validCols = getValidColumns(board);
  if (validCols.length === 0) return 0;

  for (let c of validCols) {
    const clone = board.map(row => [...row]);
    if (dropDisc(clone, c, botDisc) !== -1 && checkWin(clone, botDisc)) {
      return c;
    }
  }

  for (let c of validCols) {
    const clone = board.map(row => [...row]);
    if (dropDisc(clone, c, playerDisc) !== -1 && checkWin(clone, playerDisc)) {
      return c;
    }
  }

  for (let c of validCols) {
    const clone = board.map(row => [...row]);
    const row = dropDisc(clone, c, botDisc);
    if (row !== -1 && row < ROWS - 1) {
      const aboveClone = clone.map(r => [...r]);
      if (dropDisc(aboveClone, c, playerDisc) !== -1 && checkWin(aboveClone, playerDisc)) {
        continue;
      }
    }
    
    let score = 0;
    if (c === 3) score += 3;
    else if (c === 2 || c === 4) score += 2;
    else if (c === 1 || c === 5) score += 1;
    
    if (Math.random() < 0.7) {
      return c;
    }
  }

  const centerCols = validCols.filter(c => c >= 2 && c <= 4);
  if (centerCols.length > 0) {
    return centerCols[Math.floor(Math.random() * centerCols.length)];
  }

  return validCols[Math.floor(Math.random() * validCols.length)];
}
