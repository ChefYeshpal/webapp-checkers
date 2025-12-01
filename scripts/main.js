// 8x8 pattern setup
const gameBoard = document.getElementById('gameBoard');
const board = [];

const state = {
    draggedPiece: null,
    selectedPiece: null
};

const createPiece = (color) => {
    const piece = document.createElement('div');
    piece.className = `piece ${color}`;
    piece.textContent = color === 'black' ? 'B' : 'R';
    piece.draggable = true;
    return piece;
};

const selectPiece = (piece) => {
    if (state.selectedPiece === piece) return;
    clearSelection();
    state.selectedPiece = piece;
    piece.classList.add('selected');
};

const clearSelection = () => {
    if (!state.selectedPiece) return;
    state.selectedPiece.classList.remove('selected');
    state.selectedPiece = null;
};

const movePieceToSquare = (piece, square) => {
    if (!piece || !square) return false;
    const occupyingPiece = square.querySelector('.piece');
    if (occupyingPiece && occupyingPiece !== piece) {
        return false;
    }
    square.appendChild(piece);
    clearSelection();
    return true;
};

for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
        square.dataset.row = row;
        square.dataset.col = col;
        square.id = `square-${row}-${col}`;
        
        gameBoard.appendChild(square);
        board.push(square);
    }
}

// black pieces on rows 0-2 (top), red on 5-7 (bottom)
board.forEach((square, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    if (row <= 2 && (row + col) % 2 === 1) {
        square.appendChild(createPiece('black'));
    }
    else if (row >= 5 && (row + col) % 2 === 1) {
        square.appendChild(createPiece('red'));
    }
});

const handleDragStart = (event) => {
    const piece = event.target.closest('.piece');
    if (!piece) return;
    state.draggedPiece = piece;
    selectPiece(piece);
    if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', '');
        event.dataTransfer.effectAllowed = 'move';
    }
};

const handleDragOver = (event) => {
    const square = event.target.closest('.square');
    if (!square) return;
    const occupyingPiece = square.querySelector('.piece');
    if (occupyingPiece && occupyingPiece !== state.draggedPiece) {
        return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
};

const handleDrop = (event) => {
    event.preventDefault();
    const square = event.target.closest('.square');
    if (!square || !state.draggedPiece) return;
    movePieceToSquare(state.draggedPiece, square);
    state.draggedPiece = null;
};

const handleDragEnd = () => {
    state.draggedPiece = null;
};

const handleBoardClick = (event) => {
    const piece = event.target.closest('.piece');
    const square = event.target.closest('.square');

    if (piece) {
        if (state.selectedPiece === piece) {
            clearSelection();
        } else {
            selectPiece(piece);
        }
        return;
    }

    if (square && state.selectedPiece) {
        movePieceToSquare(state.selectedPiece, square);
    }
};

gameBoard.addEventListener('dragstart', handleDragStart);
gameBoard.addEventListener('dragover', handleDragOver);
gameBoard.addEventListener('drop', handleDrop);
gameBoard.addEventListener('dragend', handleDragEnd);
gameBoard.addEventListener('click', handleBoardClick);
