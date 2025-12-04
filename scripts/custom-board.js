(function () {
    const overlay = document.getElementById('customBoardOverlay');
    const rowsInput = document.getElementById('customBoardRows');
    const colsInput = document.getElementById('customBoardCols');
    const rowsValue = document.getElementById('customBoardRowsValue');
    const colsValue = document.getElementById('customBoardColsValue');
    const playButton = document.getElementById('customBoardPlay');
    const cancelButton = document.getElementById('customBoardCancel');

    const noopModule = {
        init: () => {},
        open: () => {},
        close: () => {},
        setDefaultSize: () => {}
    };

    if (!overlay || !rowsInput || !colsInput || !rowsValue || !colsValue || !playButton || !cancelButton) {
        window.CustomBoard = noopModule;
        return;
    }

    const minSize = Number.parseInt(rowsInput.min, 10) || 4;
    const maxSize = Number.parseInt(rowsInput.max, 10) || 12;

    const clamp = (value) => {
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed)) return minSize;
        return Math.max(minSize, Math.min(maxSize, parsed));
    };

    let currentSize = { rows: clamp(rowsInput.value), cols: clamp(colsInput.value) };
    let handlers = {
        onApply: null,
        getDefaultSize: null
    };

    const updateLabel = (label, value) => {
        label.textContent = `${value}`;
    };

    const syncInput = (input, label, value) => {
        const sanitized = clamp(value);
        input.value = sanitized;
        updateLabel(label, sanitized);
        return sanitized;
    };

    const open = (size) => {
        const defaults = size || (typeof handlers.getDefaultSize === 'function' ? handlers.getDefaultSize() : currentSize);
        currentSize = {
            rows: syncInput(rowsInput, rowsValue, defaults?.rows ?? currentSize.rows),
            cols: syncInput(colsInput, colsValue, defaults?.cols ?? currentSize.cols)
        };
        overlay.classList.remove('is-hidden');
        overlay.setAttribute('aria-hidden', 'false');
        playButton.focus();
    };

    const close = () => {
        overlay.classList.add('is-hidden');
        overlay.setAttribute('aria-hidden', 'true');
    };

    rowsInput.addEventListener('input', () => {
        currentSize.rows = syncInput(rowsInput, rowsValue, rowsInput.value);
    });

    colsInput.addEventListener('input', () => {
        currentSize.cols = syncInput(colsInput, colsValue, colsInput.value);
    });

    playButton.addEventListener('click', () => {
        close();
        if (typeof handlers.onApply === 'function') {
            handlers.onApply({ ...currentSize });
        }
    });

    cancelButton.addEventListener('click', () => {
        close();
    });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            close();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (!overlay.classList.contains('is-hidden')) {
                close();
            }
        }
    });

    const init = (options = {}) => {
        handlers = { ...handlers, ...options };
        const defaults = typeof handlers.getDefaultSize === 'function' ? handlers.getDefaultSize() : currentSize;
        currentSize = {
            rows: syncInput(rowsInput, rowsValue, defaults?.rows ?? currentSize.rows),
            cols: syncInput(colsInput, colsValue, defaults?.cols ?? currentSize.cols)
        };
    };

    const setDefaultSize = (size) => {
        if (!size) return;
        currentSize = {
            rows: syncInput(rowsInput, rowsValue, size.rows ?? currentSize.rows),
            cols: syncInput(colsInput, colsValue, size.cols ?? currentSize.cols)
        };
    };

    window.CustomBoard = {
        init,
        open,
        close,
        setDefaultSize
    };
})();
