import { COLS, dropDisc, checkWin } from './board.js';

export function botMove(board, botDisc, playerDisc) {
  // Try winning move
  for (let c = 0; c < COLS; c++) {
    const clone = board.map(row => [...row]);
    if (dropDisc(clone, c, botDisc) !== -1 && checkWin(clone, botDisc)) return c;
  }

  // Block player's winning move
  for (let c = 0; c < COLS; c++) {
    const clone = board.map(row => [...row]);
    if (dropDisc(clone, c, playerDisc) !== -1 && checkWin(clone, playerDisc)) return c;
  }

  // Pick random from preferred columns (center first)
  const preferred = [3,2,4,1,5,0,6];
  const validCols = preferred.filter(c => dropDisc(board.map(r => [...r]), c, botDisc) !== -1);
  return validCols[Math.floor(Math.random() * validCols.length)];
}
