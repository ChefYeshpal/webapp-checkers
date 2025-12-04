(function () {
    const overlay = document.getElementById('customBoardOverlay');
    const sizeInput = document.getElementById('customBoardSize');
    const sizeValue = document.getElementById('customBoardSizeValue');
    const playButton = document.getElementById('customBoardPlay');
    const cancelButton = document.getElementById('customBoardCancel');

    const noopModule = {
        init: () => {},
        open: () => {},
        close: () => {},
        setDefaultSize: () => {}
    };

    if (!overlay || !sizeInput || !sizeValue || !playButton || !cancelButton) {
        window.CustomBoard = noopModule;
        return;
    }

    const minSize = Number.parseInt(sizeInput.min, 10) || 4;
    const maxSize = Number.parseInt(sizeInput.max, 10) || 12;

    const clamp = (value) => {
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed)) return minSize;
        return Math.max(minSize, Math.min(maxSize, parsed));
    };

    let currentSize = clamp(sizeInput.value);
    let handlers = {
        onApply: null,
        getDefaultSize: null
    };

    const formatDisplay = (value) => `${value} x ${value}`;

    const updateLabel = (label, value) => {
        label.textContent = formatDisplay(value);
    };

    const syncInput = (value) => {
        const sanitized = clamp(value);
        sizeInput.value = sanitized;
        updateLabel(sizeValue, sanitized);
        return sanitized;
    };

    currentSize = syncInput(currentSize);

    const deriveSizeFromDefaults = (defaults) => {
        if (defaults == null) return currentSize;
        if (typeof defaults === 'number') return clamp(defaults);
        if (typeof defaults === 'object') {
            if (defaults.rows != null) return clamp(defaults.rows);
            if (defaults.cols != null) return clamp(defaults.cols);
        }
        return currentSize;
    };

    const open = (size) => {
        const defaults = size || (typeof handlers.getDefaultSize === 'function' ? handlers.getDefaultSize() : currentSize);
        currentSize = syncInput(deriveSizeFromDefaults(defaults));
        overlay.classList.remove('is-hidden');
        overlay.setAttribute('aria-hidden', 'false');
        playButton.focus();
    };

    const close = () => {
        overlay.classList.add('is-hidden');
        overlay.setAttribute('aria-hidden', 'true');
    };

    sizeInput.addEventListener('input', () => {
        currentSize = syncInput(sizeInput.value);
    });

    playButton.addEventListener('click', () => {
        close();
        if (typeof handlers.onApply === 'function') {
            handlers.onApply({ rows: currentSize, cols: currentSize });
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
        currentSize = syncInput(deriveSizeFromDefaults(defaults));
    };

    const setDefaultSize = (size) => {
        if (!size) return;
        currentSize = syncInput(deriveSizeFromDefaults(size));
    };

    window.CustomBoard = {
        init,
        open,
        close,
        setDefaultSize
    };
})();
