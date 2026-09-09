// scripts/mathSymbols.js

window.initMathSymbols = function () {
    const LOG_TAG = '[МЭШ][mathSymbols]';

    // =========================================================================
    // 1. ХЭШ-КЛАССЫ И СЕЛЕКТОРЫ СТРАНИЦЫ МЭШ
    // =========================================================================
    const MESH_CLASSES = {
        LABEL_CONTAINER: 'h_e5SLfzsKIXtOYe.VTMArgz81I4bdSrD',
        HEADER_SPAN: 'sJToZQIgfecRD7tw.dILX7N_ZSccOqnJB.MejH1nphzM2KslHN.zApYTtYYy8v1sOXO.GLQzmCrSTsE0Db6s',
        TEXTAREA_CONTAINER: 'NOz9ULWCxsQ9y_Nz',
        TEXTAREA: 'sJToZQIgfecRD7tw.dILX7N_ZSccOqnJB.M6lnm9aOY9Q2TDRs.QTKLktIbkB0tP9LO'
    };

    const BTN_ID = 'mesh-math-symbols-btn';
    const POPOVER_ID = 'mshhlpr-math-popover';

    // =========================================================================
    // 2. НАБОР ЮНИКОД-СИМВОЛОВ (КАТЕГОРИИ)
    // =========================================================================
    const SYMBOL_CATEGORIES = [
        {
            name: 'Базовые',
            symbols: ['§', '№', '°', '±', '×', '÷', '≠', '≈', '≤', '≥', '–', '—', '«', '»', '•', '′', '″', '‰']
        },
        {
            name: 'Степени',
            symbols: ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '⁺', '⁻', 'ⁿ', 'ˣ', 'ʸ', 'ᵃ', 'ᵇ']
        },
        {
            name: 'Индексы',
            symbols: ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', '₊', '₋', 'ₐ', 'ₑ', 'ₒ', 'ₓ', 'ᵤ']
        },
        {
            name: 'Математика',
            symbols: ['√', '∛', '∜', 'π', '∞', '½', '⅓', '¼', '⅔', '¾', '∠', '△', '⊥', '∥', '∼', '≅', '∫', '∑', '∏', '∅', '∈', '∉']
        },
        {
            name: 'Физика',
            symbols: [
                'α', 'β', 'γ', 'δ', 'ε', 'η', 'θ', 'λ', 'μ', 'ν', 'ξ', 'ρ', 'σ', 'τ', 'φ', 'ψ', 'ω',
                'Δ', 'Θ', 'Λ', 'Σ', 'Φ', 'Ω', '℃', '℉', '→', '⇄', '↑', '↓'
            ]
        }
    ];

    let activeTabIdx = 0;

    // =========================================================================
    // 3. НАДЕЖНАЯ ВСТАВКА ТЕКСТА В REACT TEXTAREA
    // =========================================================================
    function appendText(textarea, textToAppend) {
        if (!textarea) return;
        textarea.focus();

        const prevVal = textarea.value || '';
        const newVal = prevVal + textToAppend;

        // Обход React Synthetic Events через нативный прототип сеттера
        const proto = window.HTMLTextAreaElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

        if (nativeSetter) {
            nativeSetter.call(textarea, newVal);
        } else {
            textarea.value = newVal;
        }

        // Сброс внутреннего трекера React, чтобы он зафиксировал изменение
        if (textarea._valueTracker) {
            textarea._valueTracker.setValue(prevVal);
        }

        // Диспатч событий для пересчёта состояния формы в React
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        textarea.scrollTop = textarea.scrollHeight;
    }

    // =========================================================================
    // 4. ВСПЛЫВАЮЩИЙ ПОПОВЕР НАД КНОПКОЙ (БЕЗ РАЗМЫТИЯ)
    // =========================================================================
    function togglePopover(btn, textarea) {
        const existing = document.getElementById(POPOVER_ID);
        if (existing) {
            existing.remove();
            return;
        }

        const popover = document.createElement('div');
        popover.id = POPOVER_ID;
        popover.style.cssText = `
            position: fixed !important;
            z-index: 9999999 !important;
            width: 360px !important;
            background: #ffffff !important;
            border-radius: 10px !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
            border: 1px solid rgba(0,0,0,0.15) !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            font-family: 'Segoe UI', Roboto, sans-serif !important;
            animation: mshhlprModalShow 0.15s ease-out !important;
        `;

        // Функция аккуратного закрытия окна и очистки слушателя
        const closePopover = () => {
            popover.remove();
            document.removeEventListener('pointerdown', onOutsideClick);
        };

        const onOutsideClick = (e) => {
            if (!popover.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                closePopover();
            }
        };

        const renderContent = () => {
            const tabsHtml = SYMBOL_CATEGORIES.map((cat, idx) => `
                <button class="msh-tab-b" data-idx="${idx}" style="
                    background: ${activeTabIdx === idx ? 'var(--mshhlpr-primary-gradient)' : '#f1f5f9'};
                    color: ${activeTabIdx === idx ? '#fff' : '#475569'};
                    border: none;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    white-space: nowrap;
                ">${cat.name}</button>
            `).join('');

            const symbolsHtml = SYMBOL_CATEGORIES[activeTabIdx].symbols.map(sym => `
                <button class="msh-sym-b" data-sym="${sym}" style="
                    height: 32px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 700;
                    color: #1e293b;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.1s, background-color 0.1s;
                ">${sym}</button>
            `).join('');

            popover.innerHTML = `
                <div style="background: var(--mshhlpr-primary-gradient); color: #fff; padding: 6px 12px; font-weight: 700; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <span>✨ Спецсимволы (клик = вставка)</span>
                    <button id="msh-pop-close" style="background:none; border:none; color:#fff; font-size:16px; cursor:pointer; line-height:1;">&times;</button>
                </div>
                <div style="padding: 8px 10px; background: #fafafa; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; gap: 4px; overflow-x: auto; padding-bottom: 2px;">
                        ${tabsHtml}
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; max-height: 180px; overflow-y: auto; padding: 2px;">
                        ${symbolsHtml}
                    </div>
                </div>
            `;

            popover.querySelector('#msh-pop-close').onclick = closePopover;

            // Вкладки
            popover.querySelectorAll('.msh-tab-b').forEach(b => {
                b.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    activeTabIdx = parseInt(b.dataset.idx, 10);
                    renderContent();
                    positionPopover(popover, btn);
                };
            });

            // Клик по символу (вставка и мгновенное закрытие окна)
            popover.querySelectorAll('.msh-sym-b').forEach(b => {
                b.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    appendText(textarea, b.dataset.sym);
                    closePopover(); // Закрываем окно сразу после вставки
                };
            });
        };

        renderContent();
        document.body.appendChild(popover);
        positionPopover(popover, btn);

        setTimeout(() => document.addEventListener('pointerdown', onOutsideClick), 50);
    }

    // Вычисление координат (над кнопкой)
    function positionPopover(popover, btn) {
        const rect = btn.getBoundingClientRect();
        const popWidth = 360;
        const popHeight = popover.offsetHeight || 230;

        let top = rect.top - popHeight - 6;
        // Если сверху экрана не влезает — отображаем снизу кнопки
        if (top < 10) {
            top = rect.bottom + 6;
        }

        let left = rect.right - popWidth;
        if (left < 10) left = 10;
        if (left + popWidth > window.innerWidth - 10) {
            left = window.innerWidth - popWidth - 10;
        }

        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
    }

    // =========================================================================
    // 5. ВНЕДРЕНИЕ КНОПКИ В СТРОКУ «ОПИСАНИЕ ЗАДАНИЯ»
    // =========================================================================
    function tryInjectButton() {
        // Ищем textarea ДЗ
        const textarea = document.querySelector(`.${MESH_CLASSES.TEXTAREA_CONTAINER} textarea, textarea.${MESH_CLASSES.TEXTAREA.split('.').join('.')}`);

        if (!textarea) {
            document.getElementById(BTN_ID)?.remove();
            document.getElementById(POPOVER_ID)?.remove();
            return;
        }

        const label = textarea.closest(`label.${MESH_CLASSES.LABEL_CONTAINER.split('.').join('.')}`) || textarea.closest('label');
        if (!label) return;

        const headerSpan = label.querySelector(`span.${MESH_CLASSES.HEADER_SPAN.split('.').join('.')}`) || label.querySelector('span');
        if (!headerSpan || label.querySelector(`#${BTN_ID}`)) return;

        // Превращаем заголовок во flex, прижимая кнопку к правому краю
        headerSpan.style.setProperty('display', 'flex', 'important');
        headerSpan.style.setProperty('align-items', 'center', 'important');
        headerSpan.style.setProperty('justify-content', 'space-between', 'important');
        headerSpan.style.setProperty('width', '100%', 'important');

        const btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.type = 'button';
        btn.className = 'mshhlpr-universal-toggle-btn mshhlpr-compact-toggle';
        btn.style.cssText = `
            margin-left: auto !important;
            height: 24px !important;
            min-height: 24px !important;
            max-height: 24px !important;
            padding: 0 8px !important;
            cursor: pointer !important;
            flex-shrink: 0 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
        `;
        btn.innerHTML = `<span class="mshhlpr-universal-toggle-text" style="font-size: 11px !important;">∑ Символы</span>`;

        // Блокируем клик на label, чтобы предотвратить перехват фокуса
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePopover(btn, textarea);
        };
        btn.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        headerSpan.appendChild(btn);
    }

    // =========================================================================
    // 6. НАБЛЮДАТЕЛЬ (OBSERVER)
    // =========================================================================
    let scheduled = false;
    const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(() => {
            tryInjectButton();
            scheduled = false;
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    tryInjectButton();
};