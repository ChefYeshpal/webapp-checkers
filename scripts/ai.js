const CheckersAI = (() => {
    const DEFAULT_DIFFICULTY = 'medium';
    const THINKING_DELAYS = {
        easy: 350,
        medium: 550,
        hard: 750
    };
    const CHAIN_DELAYS = {
        easy: 220,
        medium: 320,
        hard: 380
    };

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

    const getDifficulty = () => {
        const level = context.state && context.state.aiDifficulty;
        if (level === 'easy' || level === 'hard') {
            return level;
        }
        return DEFAULT_DIFFICULTY;
    };

    const getThinkingDelay = () => THINKING_DELAYS[getDifficulty()] || THINKING_DELAYS[DEFAULT_DIFFICULTY];

    const getChainDelay = () => CHAIN_DELAYS[getDifficulty()] || CHAIN_DELAYS[DEFAULT_DIFFICULTY];

    const hasCoreDependencies = () => (
        context.state &&
        context.boardState &&
        typeof context.getSquareElement === 'function' &&
        typeof context.executeMove === 'function'
    );

    const getBoardMetrics = (boardOverride = null) => {
        const target = boardOverride || context.boardState;
        const rows = target && target.length ? target.length : 8;
        const firstRow = target && target.length ? target[0] : null;
        const cols = firstRow && firstRow.length ? firstRow.length : rows || 8;
        return {
            rows,
            cols,
            lastRow: rows > 0 ? rows - 1 : 0,
            centerCol: cols > 0 ? (cols - 1) / 2 : 0
        };
    };

    const getPromotionRowForColor = (color) => {
        const metrics = getBoardMetrics();
        const assumedBottom = context.state && context.state.bottomColor ? context.state.bottomColor : 'red';
        return color === assumedBottom ? 0 : metrics.lastRow;
    };

    const scoreMove = (move) => {
        const piece = CheckersRules.getPiece(context.boardState, move.from.row, move.from.col);
        if (!piece) return -Infinity;
        let score = Math.random() * 0.1;

        if (move.type === 'capture') {
            score += 10;
            if (move.captured) {
                const capturedPiece = CheckersRules.getPiece(context.boardState, move.captured.row, move.captured.col);
                if (capturedPiece) {
                    score += capturedPiece.isKing ? 6 : 3;
                }
            }
        }

        const metrics = getBoardMetrics();
        if (!piece.isKing) {
            const promotionRow = getPromotionRowForColor(piece.color);
            if (move.to.row === promotionRow) {
                score += 5.5;
            } else {
                const distance = Math.abs(move.to.row - promotionRow);
                const span = Math.max(0, metrics.lastRow);
                score += Math.max(0, span - distance) * 0.2;
            }
        } else {
            score += 0.4;
        }

        const centerOffset = Math.abs(move.to.col - metrics.centerCol);
        score += (metrics.centerCol - centerOffset) * 0.35;

        return score;
    };

    const chooseMoveMedium = (moves) => {
        if (!moves || !moves.length) return null;
        let bestScore = -Infinity;
        const candidates = [];
        moves.forEach((move) => {
            const currentScore = scoreMove(move);
            if (currentScore > bestScore + 1e-4) {
                bestScore = currentScore;
                candidates.length = 0;
                candidates.push(move);
            } else if (Math.abs(currentScore - bestScore) <= 1e-4) {
                candidates.push(move);
            }
        });
        if (!candidates.length) {
            return moves[Math.floor(Math.random() * moves.length)];
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    };

    const chooseMoveEasy = (moves) => {
        if (!moves || !moves.length) return null;
        return moves[Math.floor(Math.random() * moves.length)];
    };

    const cloneBoard = (board) => board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

    const simulateMove = (board, move) => {
        const nextBoard = cloneBoard(board);
        const moveCopy = {
            type: move.type,
            from: { ...move.from },
            to: { ...move.to },
            captured: move.captured ? { ...move.captured } : null
        };
        CheckersRules.applyMove(nextBoard, moveCopy);
        return nextBoard;
    };

    const evaluateBoard = (board, aiColor) => {
        const opponent = aiColor === 'black' ? 'red' : 'black';
        const metrics = getBoardMetrics(board);
        const assumedBottom = context.state && context.state.bottomColor ? context.state.bottomColor : 'red';
        let score = 0;
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                const piece = board[row][col];
                if (!piece) continue;
                const baseValue = piece.isKing ? 5 : 3;
                const centrality = metrics.centerCol - Math.abs(col - metrics.centerCol);
                const promotionRow = piece.color === assumedBottom ? 0 : metrics.lastRow;
                const distanceToPromotion = Math.abs(promotionRow - row);
                const advancement = Math.max(0, metrics.lastRow - distanceToPromotion);
                const pieceScore = baseValue + centrality * 0.25 + advancement * 0.12;
                if (piece.color === aiColor) {
                    score += pieceScore;
                } else if (piece.color === opponent) {
                    score -= pieceScore;
                }
            }
        }
        return score;
    };

    const chooseMoveHard = (moves) => {
        if (!moves || !moves.length) return null;
        if (!context.boardState || !context.state) {
            return chooseMoveMedium(moves);
        }
        const aiColor = context.state.aiColor;
        if (!aiColor) {
            return chooseMoveMedium(moves);
        }
        const opponentColor = aiColor === 'black' ? 'red' : 'black';
        let bestMove = null;
        let bestScore = -Infinity;

        moves.forEach((move) => {
            const afterAiMove = simulateMove(context.boardState, move);
            const immediateScore = evaluateBoard(afterAiMove, aiColor);

            const replyOptions = CheckersRules.getAllLegalMovesForPlayer(afterAiMove, opponentColor);
            const replyPool = replyOptions.captures.length ? replyOptions.captures : replyOptions.moves;

            let worstReplyScore = immediateScore;
            if (replyPool.length) {
                worstReplyScore = Infinity;
                replyPool.forEach((replyMove) => {
                    const afterReplyBoard = simulateMove(afterAiMove, replyMove);
                    const replyScore = evaluateBoard(afterReplyBoard, aiColor);
                    if (replyScore < worstReplyScore) {
                        worstReplyScore = replyScore;
                    }
                });
            } else {
                worstReplyScore = immediateScore + 8;
            }

            const combinedScore = immediateScore * 0.55 + worstReplyScore * 0.45;
            if (combinedScore > bestScore) {
                bestScore = combinedScore;
                bestMove = move;
            }
        });

        return bestMove || chooseMoveMedium(moves);
    };

    const chooseMoveByDifficulty = (moves) => {
        const difficulty = getDifficulty();
        if (difficulty === 'easy') {
            return chooseMoveEasy(moves);
        }
        if (difficulty === 'hard') {
            return chooseMoveHard(moves);
        }
        return chooseMoveMedium(moves);
    };

    const createAutomatedContext = () => ({
        automated: true,
        chooseNextAutomatedMove: (options) => chooseMoveByDifficulty(options),
        automatedDelay: getChainDelay()
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

        const chosenMove = chooseMoveByDifficulty(pool);
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
        const thinkingDelay = getThinkingDelay();
        context.state.aiMoveTimeout = setTimeout(() => {
            context.state.aiMoveTimeout = null;
            performMove();
        }, thinkingDelay);
    };

    return {
        configure,
        clearThinkingTimeout,
        queueMoveIfNeeded,
        getChainDelay
    };
})();
