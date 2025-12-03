const CheckersAI = (() => {
    const THINKING_DELAY = 550;
    const CHAIN_DELAY = 320;

    const defaultContext = {
        state: null,
        boardState: null,
        getSquareElement: null,
        executeMove: null,
        evaluateGameState: null,
        endGame: null,
        logDebug: () => {}
    };

    let context = { ...defaultContext };

    const configure = (options = {}) => {
        context = { ...context, ...options };
    };

    const clearThinkingTimeout = () => {
        if (context.state && context.state.aiMoveTimeout) {
            clearTimeout(context.state.aiMoveTimeout);
            context.state.aiMoveTimeout = null;
        }
    };

    const getChainDelay = () => CHAIN_DELAY;

    const hasCoreDependencies = () => (
        context.state &&
        context.boardState &&
        typeof context.getSquareElement === 'function' &&
        typeof context.executeMove === 'function'
    );

    const getPromotionRowForColor = (color) => {
        if (!context.state || !context.state.bottomColor) {
            return color === 'black' ? 0 : 7;
        }
        return color === context.state.bottomColor ? 0 : 7;
    };

    const scoreMove = (move) => {
        const piece = CheckersRules.getPiece(context.boardState, move.from.row, move.from.col);
        if (!piece) return -Infinity;
        let score = Math.random() * 0.15;

        if (move.type === 'capture') {
            score += 10;
            if (move.captured) {
                const capturedPiece = CheckersRules.getPiece(context.boardState, move.captured.row, move.captured.col);
                if (capturedPiece) {
                    score += capturedPiece.isKing ? 6 : 3;
                }
            }
        }

        if (!piece.isKing) {
            const promotionRow = getPromotionRowForColor(piece.color);
            if (move.to.row === promotionRow) {
                score += 5.5;
            } else {
                const distance = Math.abs(move.to.row - promotionRow);
                score += (7 - distance) * 0.2;
            }
        } else {
            score += 0.4;
        }

        const centerOffset = Math.abs(move.to.col - 3.5);
        score += (3.5 - centerOffset) * 0.35;

        return score;
    };

    const chooseMove = (moves) => {
        if (!moves || !moves.length) return null;
        let bestMove = moves[0];
        let bestScore = scoreMove(bestMove);
        for (let i = 1; i < moves.length; i++) {
            const currentScore = scoreMove(moves[i]);
            if (currentScore > bestScore) {
                bestMove = moves[i];
                bestScore = currentScore;
            }
        }
        return bestMove;
    };

    const createAutomatedContext = () => ({
        automated: true,
        chooseNextAutomatedMove: (options) => chooseMove(options),
        automatedDelay: CHAIN_DELAY
    });

    const performMove = () => {
        if (!hasCoreDependencies()) {
            context.logDebug('AI move skipped: missing dependencies');
            return;
        }
        if (context.state.gameOver || context.state.opponentType !== 'ai' || context.state.currentPlayer !== context.state.aiColor) {
            return;
        }

        const allMoves = CheckersRules.getAllLegalMovesForPlayer(context.boardState, context.state.aiColor);
        const pool = allMoves.captures.length ? allMoves.captures : allMoves.moves;

        if (!pool.length) {
            if (typeof context.evaluateGameState === 'function' && typeof context.endGame === 'function') {
                const status = context.evaluateGameState();
                if (status && status.status !== 'ongoing') {
                    context.endGame(status);
                }
            }
            return;
        }

        const chosenMove = chooseMove(pool);
        if (!chosenMove) return;

        const originSquare = context.getSquareElement(chosenMove.from.row, chosenMove.from.col);
        const piece = originSquare ? originSquare.querySelector('.piece') : null;
        if (!piece) {
            context.logDebug('AI move aborted: missing piece', chosenMove);
            return;
        }

        context.state.selectedPiece = piece;
        context.executeMove(chosenMove, createAutomatedContext());
    };

    const queueMoveIfNeeded = () => {
        if (!context.state || context.state.gameOver || context.state.opponentType !== 'ai' || context.state.currentPlayer !== context.state.aiColor) {
            return;
        }
        clearThinkingTimeout();
        context.state.aiMoveTimeout = setTimeout(() => {
            context.state.aiMoveTimeout = null;
            performMove();
        }, THINKING_DELAY);
    };

    return {
        configure,
        clearThinkingTimeout,
        queueMoveIfNeeded,
        getChainDelay
    };
})();
