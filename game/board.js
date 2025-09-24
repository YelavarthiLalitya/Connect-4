export const ROWS = 6;
export const COLS = 7;

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

// board: 6x7, 0 = empty, 0/1 = player/bot
export function dropDisc(board, col, disc) {
  for (let row = 5; row >= 0; row--) { // bottom-up
    if (board[row][col] === null) {
      board[row][col] = disc;
      return row;
    }
  }
  return -1; // column full
}


export function checkWin(board, disc) {
  const dirs = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== disc) continue;
      for (const [dr, dc] of dirs) {
        let count = 1, rr = r + dr, cc = c + dc;
        while (
          rr >= 0 && rr < ROWS &&
          cc >= 0 && cc < COLS &&
          board[rr][cc] === disc
        ) {
          count++;
          if (count === 4) return true;
          rr += dr; cc += dc;
        }
      }
    }
  }
  return false;
}

export function isFull(board) {
  return board.every(row => row.every(cell => cell));
}
