// 8x8 pattern setup
const DEBUG = true;
const logDebug = (...args) => {
    if (!DEBUG) return;
    console.debug('[Checkers]', ...args);
};

const gameBoard = document.getElementById('gameBoard');
const board = [];
const boardState = CheckersRules.createEmptyBoard();

const state = {
    draggedPiece: null,
    selectedPiece: null,
    currentPlayer: 'black',
    moveLookup: new Map(),
    activeChainPiece: null
};

const highlightedSquares = new Set();
const highlightedCapturePieces = new Set();

const getSquareElement = (row, col) => document.getElementById(`square-${row}-${col}`);

// asses lmnaao
const getPieceAssetPath = (color, isKing) => {
    if (color === 'black') {
        return isKing ? 'assets/blackpiece_king.png' : 'assets/blackpiece.png';
    }
    return isKing ? 'assets/redpiece_king.png' : 'assets/redpiece.png';
};

const updatePieceVisuals = (piece, isKing) => {
    const color = piece.dataset.color;
    piece.dataset.king = isKing ? 'true' : 'false';
    piece.classList.toggle('king', isKing);
    const img = piece.querySelector('img');
    if (img) {
        img.src = getPieceAssetPath(color, isKing);
        img.alt = `${color} ${isKing ? 'king' : 'checker'}`;
    }
};

const createPiece = (color, isKing = false) => {
    const piece = document.createElement('div');
    piece.classList.add('piece', color);
    if (isKing) piece.classList.add('king');
    piece.dataset.color = color;
    piece.dataset.king = isKing ? 'true' : 'false';
    piece.draggable = true;
    const img = document.createElement('img');
    img.src = getPieceAssetPath(color, isKing);
    img.alt = `${color} ${isKing ? 'king' : 'checker'}`;
    img.draggable = false;
    piece.appendChild(img);
    return piece;
};

const placePieceOnSquare = (square, color, isKing = false) => {
    const row = Number(square.dataset.row);
    const col = Number(square.dataset.col);
    CheckersRules.placePiece(boardState, row, col, color, isKing);
    const piece = createPiece(color, isKing);
    square.appendChild(piece);
    logDebug('Placed piece', { color, isKing, row, col });
    return piece;
};

const selectPiece = (piece) => {
    if (state.selectedPiece && state.selectedPiece !== piece) {
        state.selectedPiece.classList.remove('selected');
    }
    state.selectedPiece = piece;
    piece.classList.add('selected');
};

const clearSelection = () => {
    if (state.selectedPiece) {
        state.selectedPiece.classList.remove('selected');
    }
    state.selectedPiece = null;
    state.moveLookup = new Map();
    state.activeChainPiece = null;
    clearHighlights();
};

const clearHighlights = () => {
    highlightedSquares.forEach((square) => square.classList.remove('highlight-move'));
    highlightedSquares.clear();
    highlightedCapturePieces.forEach((piece) => piece.classList.remove('highlight-capture'));
    highlightedCapturePieces.clear();
};

const highlightAvailableMoves = (legal) => {
    clearHighlights();
    logDebug('Highlighting options', {
        moves: legal.moves.length,
        captures: legal.captures.length
    });
    const highlightSquare = (row, col) => {
        const target = getSquareElement(row, col);
        if (target && !highlightedSquares.has(target)) {
            target.classList.add('highlight-move');
            highlightedSquares.add(target);
        }
    };

    legal.moves.forEach((move) => {
        highlightSquare(move.to.row, move.to.col);
    });

    legal.captures.forEach((move) => {
        highlightSquare(move.to.row, move.to.col);
        if (!move.captured) return;
        const capturedSquare = getSquareElement(move.captured.row, move.captured.col);
        if (!capturedSquare) return;
        const capturedPiece = capturedSquare.querySelector('.piece');
        if (capturedPiece && !highlightedCapturePieces.has(capturedPiece)) {
            capturedPiece.classList.add('highlight-capture');
            highlightedCapturePieces.add(capturedPiece);
        }
    });
};

const setMoveLookup = (legal) => {
    const lookup = new Map();
    const register = (move) => {
        lookup.set(`${move.to.row}-${move.to.col}`, move);
    };
    legal.moves.forEach(register);
    legal.captures.forEach(register);
    state.moveLookup = lookup;
};

const applyAvailableMoves = (legal) => {
    setMoveLookup(legal);
    highlightAvailableMoves(legal);
};

const canInteractWithPiece = (piece) => {
    const square = piece.parentElement;
    if (!square) {
        logDebug('Piece has no square, interaction blocked');
        return false;
    }
    const row = Number(square.dataset.row);
    const col = Number(square.dataset.col);
    const data = CheckersRules.getPiece(boardState, row, col);
    if (!data) {
        logDebug('No board data for square, interaction blocked', { row, col });
        return false;
    }
    if (data.color !== state.currentPlayer) {
        logDebug('Blocked interaction with opponent piece', { requested: data.color, currentPlayer: state.currentPlayer });
        return false;
    }
    if (state.activeChainPiece && state.activeChainPiece !== piece) {
        logDebug('Must continue chain with the same piece');
        return false;
    }
    return true;
};

const handlePieceSelection = (piece) => {
    if (!canInteractWithPiece(piece)) return false;

    const square = piece.parentElement;
    const row = Number(square.dataset.row);
    const col = Number(square.dataset.col);

    const mustCapture = state.activeChainPiece ? true : CheckersRules.playerHasCapture(boardState, state.currentPlayer);
    const legal = CheckersRules.getLegalMovesForPiece(boardState, row, col, state.currentPlayer);
    const filtered = mustCapture
        ? { moves: [], captures: legal.captures }
        : legal;

    const hasOptions = filtered.moves.length > 0 || filtered.captures.length > 0;
    if ((mustCapture && filtered.captures.length === 0) || !hasOptions) {
        logDebug('Selection blocked: no legal moves', { row, col, mustCapture });
        return false;
    }

    selectPiece(piece);
    logDebug('Piece selected', {
        color: piece.dataset.color,
        row,
        col,
        mustCapture,
        moveOptions: filtered.moves.length,
        captureOptions: filtered.captures.length
    });
    applyAvailableMoves(filtered);
    return true;
};

const getMoveForDestination = (row, col) => state.moveLookup.get(`${row}-${col}`);

const attemptMoveToSquare = (square) => {
    if (!state.selectedPiece || !square) return;
    const row = Number(square.dataset.row);
    const col = Number(square.dataset.col);
    const move = getMoveForDestination(row, col);
    if (!move) {
        logDebug('No legal move found for destination', { row, col });
        return;
    }
    logDebug('Attempting move', { from: move.from, to: move.to, type: move.type });
    executeMove(move);
};

const executeMove = (move) => {
    const piece = state.selectedPiece;
    if (!piece) return;

    const targetSquare = getSquareElement(move.to.row, move.to.col);
    if (!targetSquare) return;

    const result = CheckersRules.applyMove(boardState, move);
    targetSquare.appendChild(piece);
    logDebug('Move applied', {
        type: move.type,
        from: move.from,
        to: move.to,
        captured: move.captured || null
    });

    if (move.type === 'capture' && move.captured) {
        const capturedSquare = getSquareElement(move.captured.row, move.captured.col);
        const capturedPiece = capturedSquare ? capturedSquare.querySelector('.piece') : null;
        if (capturedPiece) {
            capturedPiece.remove();
            logDebug('Piece captured', move.captured);
        }
    }

    if (result.piece) {
        updatePieceVisuals(piece, result.piece.isKing);
        if (result.becameKing) {
            logDebug('Piece promoted to king', move.to);
        }
    }

    clearHighlights();
    state.moveLookup = new Map();

    if (result.wasCapture) {
        const followUp = CheckersRules.getLegalMovesForPiece(boardState, move.to.row, move.to.col, state.currentPlayer);
        if (followUp.captures.length > 0) {
            state.activeChainPiece = piece;
            selectPiece(piece);
            applyAvailableMoves({ moves: [], captures: followUp.captures });
            logDebug('Continuing capture chain', { from: move.to, options: followUp.captures.length });
            return;
        }
    }

    state.activeChainPiece = null;
    clearSelection();
    state.currentPlayer = state.currentPlayer === 'black' ? 'red' : 'black';
    logDebug('Turn switched', { currentPlayer: state.currentPlayer });
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

board.forEach((square, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    if (row <= 2 && (row + col) % 2 === 1) {
        placePieceOnSquare(square, 'black');
    } else if (row >= 5 && (row + col) % 2 === 1) {
        placePieceOnSquare(square, 'red');
    }
});
logDebug('Board init');

const handleDragStart = (event) => {
    const piece = event.target.closest('.piece');
    if (!piece) return;
    const selectionSucceeded = handlePieceSelection(piece);
    if (!selectionSucceeded) {
        event.preventDefault();
        return;
    }
    state.draggedPiece = piece;
    if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', '');
        event.dataTransfer.effectAllowed = 'move';
    }
};

const handleDragOver = (event) => {
    const square = event.target.closest('.square');
    if (!square || !state.draggedPiece || state.selectedPiece !== state.draggedPiece) return;
    const row = Number(square.dataset.row);
    const col = Number(square.dataset.col);
    const move = getMoveForDestination(row, col);
    if (!move) return;
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
};

const handleDrop = (event) => {
    event.preventDefault();
    const square = event.target.closest('.square');
    if (!square || !state.draggedPiece) return;
    attemptMoveToSquare(square);
    state.draggedPiece = null;
};

const handleDragEnd = () => {
    state.draggedPiece = null;
};

const handleBoardClick = (event) => {
    const piece = event.target.closest('.piece');
    if (piece) {
        if (state.selectedPiece === piece && !state.activeChainPiece) {
            clearSelection();
            return;
        }
        handlePieceSelection(piece);
        return;
    }

    const square = event.target.closest('.square');
    if (square) {
        attemptMoveToSquare(square);
    }
};

gameBoard.addEventListener('dragstart', handleDragStart);
gameBoard.addEventListener('dragover', handleDragOver);
gameBoard.addEventListener('drop', handleDrop);
gameBoard.addEventListener('dragend', handleDragEnd);
gameBoard.addEventListener('click', handleBoardClick);
