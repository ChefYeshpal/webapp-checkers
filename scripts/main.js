// 8x8 pattern
const gameBoard = document.getElementById('gameBoard');
const board = [];

for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
        square.dataset.row = row;
        square.dataset.col = col;
        square.id = `square-${row}-${col}`;
        
        // Placeholder for pieces - add class or background-image later
        // prolly something like square.style.backgroundImage = "url('assets/redpins.png')"; and all
        
        gameBoard.appendChild(square);
        board.push(square);
    }
}

// black pieces on rows 0-2 (top), red on 5-7 (bottom)
board.forEach((square, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    if (row <= 2 && (row + col) % 2 === 1) {
        square.innerHTML = '<div class="placeholder">B</div>'; // rep with img later
    }
    else if (row >= 5 && (row + col) % 2 === 1) {
        square.innerHTML = '<div class="placeholder">R</div>'; // rep with img later
    }
});
