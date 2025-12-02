const CheckersRules = (() => {
	const SIZE = 8;
	const BASE_DIRECTIONS = {
		up: [
			[-1, -1],
			[-1, 1]
		],
		down: [
			[1, -1],
			[1, 1]
		]
	};
	let bottomColor = 'red';
	let topColor = 'black';
	const directionMap = {
		red: BASE_DIRECTIONS.up,
		black: BASE_DIRECTIONS.down
	};
	const KING_DIRECTIONS = [
		[-1, -1],
		[-1, 1],
		[1, -1],
		[1, 1]
	];

	const inBounds = (row, col) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;

	const createEmptyBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

	const placePiece = (state, row, col, color, isKing = false) => {
		state[row][col] = { color, isKing };
		return state[row][col];
	};

	const removePiece = (state, row, col) => {
		state[row][col] = null;
	};

	const getPiece = (state, row, col) => {
		if (!inBounds(row, col)) return null;
		return state[row][col];
	};

	const getDirectionsForPiece = (piece) => {
		if (piece.isKing) return KING_DIRECTIONS;
		return directionMap[piece.color] || BASE_DIRECTIONS.up;
	};

	const setBottomColor = (color) => {
		bottomColor = color === 'black' ? 'black' : 'red';
		topColor = bottomColor === 'black' ? 'red' : 'black';
		directionMap[bottomColor] = BASE_DIRECTIONS.up;
		directionMap[topColor] = BASE_DIRECTIONS.down;
	};

	const computePieceMoves = (state, row, col) => {
		const piece = getPiece(state, row, col);
		if (!piece) return { moves: [], captures: [] };

		const moves = [];
		const captures = [];
		const directions = getDirectionsForPiece(piece);

		directions.forEach(([dRow, dCol]) => {
			const nextRow = row + dRow;
			const nextCol = col + dCol;

			if (!inBounds(nextRow, nextCol)) return;

			const occupant = getPiece(state, nextRow, nextCol);
			if (!occupant) {
				moves.push({
					type: 'move',
					from: { row, col },
					to: { row: nextRow, col: nextCol }
				});
				return;
			}

			if (occupant.color === piece.color) return;

			const jumpRow = nextRow + dRow;
			const jumpCol = nextCol + dCol;

			if (!inBounds(jumpRow, jumpCol)) return;
			if (getPiece(state, jumpRow, jumpCol)) return;

			captures.push({
				type: 'capture',
				from: { row, col },
				to: { row: jumpRow, col: jumpCol },
				captured: { row: nextRow, col: nextCol }
			});
		});

		return { moves, captures };
	};
	
	// mmm capture yum yum
	const playerHasCapture = (state, player) => {
		for (let row = 0; row < SIZE; row++) {
			for (let col = 0; col < SIZE; col++) {
				const piece = getPiece(state, row, col);
				if (!piece || piece.color !== player) continue;
				const { captures } = computePieceMoves(state, row, col);
				if (captures.length) return true;
			}
		}
		return false;
	};

	const getLegalMovesForPiece = (state, row, col, player) => {
		const piece = getPiece(state, row, col);
		if (!piece || piece.color !== player) return { moves: [], captures: [] };
		return computePieceMoves(state, row, col);
	};

	const applyMove = (state, move) => {
		const piece = getPiece(state, move.from.row, move.from.col);
		if (!piece) {
			return { piece: null, wasCapture: false, becameKing: false };
		}

		state[move.from.row][move.from.col] = null;
		state[move.to.row][move.to.col] = piece;

		let becameKing = false;
		if (!piece.isKing) {
			const reachedTop = piece.color === bottomColor && move.to.row === 0;
			const reachedBottom = piece.color === topColor && move.to.row === SIZE - 1;
			if (reachedTop || reachedBottom) {
				piece.isKing = true;
				becameKing = true;
			}
		}

		let wasCapture = false;
		if (move.type === 'capture' && move.captured) {
			removePiece(state, move.captured.row, move.captured.col);
			wasCapture = true;
		}

		return { piece, wasCapture, becameKing };
	};

	const getForcedMovesForPlayer = (state, player) => {
		const forced = [];
		for (let row = 0; row < SIZE; row++) {
			for (let col = 0; col < SIZE; col++) {
				const piece = getPiece(state, row, col);
				if (!piece || piece.color !== player) continue;
				const { captures } = computePieceMoves(state, row, col);
				if (captures.length) {
					forced.push({ row, col, captures });
				}
			}
		}
		return forced;
	};

	return {
		createEmptyBoard,
		placePiece,
		removePiece,
		getPiece,
		computePieceMoves,
		getLegalMovesForPiece,
		playerHasCapture,
		getForcedMovesForPlayer,
		applyMove,
		setBottomColor
	};
})();
