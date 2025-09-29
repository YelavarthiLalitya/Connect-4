export const ROWS = 6;
export const COLS = 7;

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function dropDisc(board, col, disc) {
  if (col < 0 || col >= COLS) return -1;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      board[row][col] = disc;
      return row;
    }
  }
  return -1;
}

export function checkWin(board, disc) {
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];
  
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== disc) continue;
      
      for (const [dr, dc] of directions) {
        let count = 1;
        let rr = r + dr;
        let cc = c + dc;
        
        while (
          rr >= 0 && rr < ROWS &&
          cc >= 0 && cc < COLS &&
          board[rr][cc] === disc
        ) {
          count++;
          if (count === 4) return true;
          rr += dr;
          cc += dc;
        }
      }
    }
  }
  return false;
}

export function isFull(board) {
  return board[0].every(cell => cell !== null);
}

export function getValidColumns(board) {
  const valid = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === null) {
      valid.push(c);
    }
  }
  return valid;
}
