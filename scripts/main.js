// 8x8 pattern setup
const DEBUG = true;
const logDebug = (...args) => {
    if (!DEBUG) return;
    console.debug('[Checkers]', ...args);
};

const gameBoard = document.getElementById('gameBoard');
const gameContainer = document.querySelector('.game-container');
const introOverlay = document.getElementById('introOverlay');
const playerChoiceButtons = document.querySelectorAll('[data-player-choice]');
const resultOverlay = document.getElementById('resultOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultCopy = document.getElementById('resultCopy');
const resultSecondary = document.getElementById('resultSecondary');
const resultAction = document.getElementById('resultAction');
const board = [];
const boardState = CheckersRules.createEmptyBoard();

const state = {
    draggedPiece: null,
    selectedPiece: null,
    currentPlayer: null,
    moveLookup: new Map(),
    activeChainPiece: null,
    gameOver: true,
    lastMoveSquares: { from: null, to: null }
};

const highlightedSquares = new Set();
const highlightedCapturePieces = new Set();
const forcedMoveSquares = new Set();

const getSquareElement = (row, col) => document.getElementById(`square-${row}-${col}`);

const getPieceAssetPath = (color, isKing) => {
    if (color === 'black') {
        return isKing ? 'assets/blackpiece_king.png' : 'assets/blackpiece.png';
    }
    return isKing ? 'assets/redpiece_king.png' : 'assets/redpiece.png';
};

// Piecec moves
const prefersReducedMotion = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const animatePieceMovement = (piece, targetSquare) => {
    const startRect = piece.getBoundingClientRect();
    targetSquare.appendChild(piece);

    if (prefersReducedMotion()) {
        piece.classList.remove('piece-moving');
        piece.style.transition = '';
        piece.style.transform = '';
        return;
    }

    const endRect = piece.getBoundingClientRect();
    const deltaX = startRect.left - endRect.left;
    const deltaY = startRect.top - endRect.top;

    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        piece.classList.remove('piece-moving');
        piece.style.transition = '';
        piece.style.transform = '';
        return;
    }

    piece.classList.add('piece-moving');
    piece.style.transition = 'none';
    piece.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    piece.getBoundingClientRect();

    requestAnimationFrame(() => {
        piece.style.transition = '';
        piece.style.transform = '';
    });

    let fallbackTimeout;
    const clearMovementState = (event) => {
        if (event && event.propertyName && event.propertyName !== 'transform') {
            return;
        }
        piece.classList.remove('piece-moving');
        piece.style.transition = '';
        if (!event) {
            piece.style.transform = '';
        }
        piece.removeEventListener('transitionend', clearMovementState);
        if (fallbackTimeout) {
            clearTimeout(fallbackTimeout);
        }
    };

    piece.addEventListener('transitionend', clearMovementState);
    fallbackTimeout = setTimeout(clearMovementState, 400);
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

const clearLastMoveHighlights = () => {
    if (state.lastMoveSquares.from) {
        state.lastMoveSquares.from.classList.remove('last-move-from');
    }
    if (state.lastMoveSquares.to) {
        state.lastMoveSquares.to.classList.remove('last-move-to');
    }
    state.lastMoveSquares = { from: null, to: null };
};

const setLastMoveHighlights = (fromSquare, toSquare) => {
    clearLastMoveHighlights();
    if (fromSquare) {
        fromSquare.classList.add('last-move-from');
        state.lastMoveSquares.from = fromSquare;
    }
    if (toSquare) {
        toSquare.classList.add('last-move-to');
        state.lastMoveSquares.to = toSquare;
    }
};

// brr go round round
const clearForcedMoveHighlights = () => {
    forcedMoveSquares.forEach((square) => square.classList.remove('force-move'));
    forcedMoveSquares.clear();
};

const addForcedHighlight = (square) => {
    if (!square || forcedMoveSquares.has(square)) return;
    square.classList.add('force-move');
    forcedMoveSquares.add(square);
};

const updateForcedMoveHighlights = () => {
    clearForcedMoveHighlights();
    if (state.gameOver || !state.currentPlayer) return;
    if (state.activeChainPiece) {
        const square = state.activeChainPiece.parentElement;
        if (square) addForcedHighlight(square);
        return;
    }
    const forced = CheckersRules.getForcedMovesForPlayer(boardState, state.currentPlayer);
    forced.forEach(({ row, col }) => {
        const square = getSquareElement(row, col);
        if (square) addForcedHighlight(square);
    });
};

const showResultOverlay = ({ title, copy, secondary, buttonText }) => {
    resultTitle.textContent = title;
    resultCopy.textContent = copy;
    resultSecondary.textContent = secondary;
    resultAction.textContent = buttonText;
    resultOverlay.classList.remove('is-hidden');
    document.body.classList.add('result-active');
};

const hideResultOverlay = () => {
    resultOverlay.classList.add('is-hidden');
    document.body.classList.remove('result-active');
};

const getPlayerStats = (player) => {
    let hasPieces = false;
    let hasMoves = false;
    for (let row = 0; row < boardState.length; row++) {
        for (let col = 0; col < boardState[row].length; col++) {
            const piece = CheckersRules.getPiece(boardState, row, col);
            if (!piece || piece.color !== player) continue;
            hasPieces = true;
            if (!hasMoves) {
                const { moves, captures } = CheckersRules.computePieceMoves(boardState, row, col);
                if (moves.length || captures.length) {
                    hasMoves = true;
                }
            }
            if (hasPieces && hasMoves) {
                return { hasPieces, hasMoves };
            }
        }
    }
    return { hasPieces, hasMoves };
};

const evaluateGameState = () => {
    const black = getPlayerStats('black');
    const red = getPlayerStats('red');

    if (!black.hasPieces || (!black.hasMoves && red.hasMoves)) {
        return { status: 'win', winner: 'red' };
    }
    if (!red.hasPieces || (!red.hasMoves && black.hasMoves)) {
        return { status: 'win', winner: 'black' };
    }
    if (!black.hasMoves && !red.hasMoves) {
        return { status: 'draw' };
    }
    return { status: 'ongoing' };
};

const endGame = (result) => {
    state.gameOver = true;
    if (result.status === 'win' && result.winner) {
        const winnerUpper = result.winner.toUpperCase();
        showResultOverlay({
            title: `${winnerUpper} WON!`,
            copy: `It seems like ${result.winner} won because of how pathetically the opponent played lol`,
            secondary: 'you wanna play again?',
            buttonText: 'Play again'
        });
    } else {
        showResultOverlay({
            title: 'WE HAVE A DRAW',
            copy: 'wow both players are so bad at this game, that it resulted in a draw???',
            secondary: 'anyways, wanna play again?',
            buttonText: 'Yes please'
        });
    }
    logDebug('Game ended', result);
};

const handleResultAction = () => {
    hideResultOverlay();
    introOverlay.classList.remove('is-hidden');
    gameContainer.classList.add('game-hidden');
    clearBoardUI();
    resetBoardState();
    state.currentPlayer = null;
    state.draggedPiece = null;
    state.activeChainPiece = null;
    clearForcedMoveHighlights();
    clearLastMoveHighlights();
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

const buildBoardGrid = () => {
    if (board.length) return;
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
};

const clearBoardUI = () => {
    board.forEach((square) => {
        square.innerHTML = '';
    });
    clearSelection();
    clearForcedMoveHighlights();
    clearLastMoveHighlights();
};

const resetBoardState = () => {
    for (let row = 0; row < boardState.length; row++) {
        boardState[row].fill(null);
    }
};

/**
 * This is what will determine where them pieces go
 * whatever the player selected in the initial dialogue, those pieces will be in the bottom
 * ofc there's some more code ahead that's also vital but you really think I'll add that?
 */
const seedStartingPieces = (bottomColor) => {
    const topColor = bottomColor === 'black' ? 'red' : 'black';
    board.forEach((square, index) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        if ((row + col) % 2 === 0) return;
        if (row <= 2) {
            placePieceOnSquare(square, topColor);
        } else if (row >= 5) {
            placePieceOnSquare(square, bottomColor);
        }
    });
};

const initializeBoard = (bottomColor) => {
    buildBoardGrid();
    clearBoardUI();
    resetBoardState();
    seedStartingPieces(bottomColor);
    logDebug('Board init', { bottomColor });
    updateForcedMoveHighlights();
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
    if (state.gameOver) {
        logDebug('Interaction blocked: game over');
        return false;
    }
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
    if (state.gameOver) return;
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

    const originSquare = getSquareElement(move.from.row, move.from.col);
    const targetSquare = getSquareElement(move.to.row, move.to.col);
    if (!targetSquare) return;

    const result = CheckersRules.applyMove(boardState, move);
    animatePieceMovement(piece, targetSquare);
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
            setLastMoveHighlights(originSquare, targetSquare);
            logDebug('Continuing capture chain', { from: move.to, options: followUp.captures.length });
            updateForcedMoveHighlights();
            return;
        }
    }

    state.activeChainPiece = null;
    clearSelection();
    setLastMoveHighlights(originSquare, targetSquare);
    state.currentPlayer = state.currentPlayer === 'black' ? 'red' : 'black';
    logDebug('Turn switched', { currentPlayer: state.currentPlayer });
    updateForcedMoveHighlights();
    const gameStatus = evaluateGameState();
    if (gameStatus.status !== 'ongoing') {
        endGame(gameStatus);
    }
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
    if (state.gameOver) {
        event.preventDefault();
        return;
    }
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
    if (state.gameOver) return;
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
    if (state.gameOver) return;
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
    if (state.gameOver) return;
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

const startGame = (playerColor) => {
    hideResultOverlay();
    CheckersRules.setBottomColor(playerColor);
    initializeBoard(playerColor);
    state.currentPlayer = playerColor;
    state.draggedPiece = null;
    state.activeChainPiece = null;
    state.moveLookup = new Map();
    state.gameOver = false;
    updateForcedMoveHighlights();
    logDebug('Game started', { playerColor });
    gameContainer.classList.remove('game-hidden');
    introOverlay.classList.add('is-hidden');
};

resultAction.addEventListener('click', handleResultAction);

playerChoiceButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const choice = button.dataset.playerChoice;
        if (!choice) return;
        startGame(choice);
    });
});

gameBoard.addEventListener('dragstart', handleDragStart);
gameBoard.addEventListener('dragover', handleDragOver);
gameBoard.addEventListener('drop', handleDrop);
gameBoard.addEventListener('dragend', handleDragEnd);
gameBoard.addEventListener('click', handleBoardClick);
