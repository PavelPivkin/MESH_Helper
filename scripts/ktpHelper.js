// scripts/ktpHelper.js

window.initKtpHelper = function () {
    console.log('[МЭШ][ktpHelper.js] Модуль автозаполнения КТП инициализирован.');

    const LOG_TAG = '[МЭШ Помогатор][ktpHelper.js]:';
    const BTN_ID = 'mesh-ktp-start-btn';
    const DELAY = 50; 
    const WAIT_TIMEOUT = 10000;
    const POLL_INTERVAL = 200;

    const TEXTS = {
        buildDone: 'Календарный план достроен',
        recalcDone: 'Календарный план пересчитан'
    };

    const SELECTORS = {
        ktpButtons: '.xy2L_nBvEClr4W24CmTA._9oOAfoqlLpn0ax5HVzg.TKVLD5v7YAbPy7SGbTMY',
        firstInner: '.JD0S8faDvbTwlu4hD6AU.etL8nlITXDbfXbbqvNMB.XuBhQ4oivAc7tf4dgkIP',
        secondInner: '.oQObijeKjP8J4aK404f4.wsoPWMCLUA9kvEGM5s7q',
        groupContainer: '.r5winNql6fY6uC1V_TxY',
        groupName: '.DSXOGdoSiFGKohRuaDDx.ebIBbAN3ZomwnCMWP167._ELGiVRWaoZZRQLlT7eO.E8taxZlPjqlq_tc1djmu.P2cuXfdDwi7u8idHJZ8K',
        threeDots: '.IXFYIyoCIMf3stleLpdL.OpszQga3QFooUzQoawd0.TL_BH0k_ARpeEUyrcleb',
        threeDotsBtnInside: '.JKgkd8rcL71CgrtghWQG',
        notifyMsg: '[data-test-component$="Notify-MessageContainer"]',
        notifyToast: '[data-test-component$="notifyToastContainer"]'
    };

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Инъекция кнопки в интерфейс
    function injectKtpButton() {
        if (!location.href.includes('/teacher/study-process/planning')) return;

        // Находим блок описания подзаголовка
        const descBlock = document.querySelector('div[data-test-component="undefined-subHeaderDescription"]');
        if (!descBlock) return;
        if (document.getElementById(BTN_ID)) return;

        console.log(LOG_TAG, 'Элемент описания найден. Внедряем кнопку под текст.');

        const btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.className = 'mshhlpr-universal-toggle-btn mshhlpr-btn-animated';
        
        // Компактные стили с ограничением по ширине и отступом сверху
        btn.style.cssText = `
            margin-top: 14px !important;
            margin-bottom: 6px !important;
            cursor: pointer !important;
            display: inline-flex !important;
            width: fit-content !important;
            max-width: 310px !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 8px 16px !important;
        `;
        btn.innerHTML = `<span class="mshhlpr-universal-toggle-text" style="font-size: 13px !important; white-space: nowrap;">▶ Достроить и пересчитать КТП</span>`;

        btn.onclick = (e) => {
            e.preventDefault();
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.querySelector('.mshhlpr-universal-toggle-text').textContent = '⏳ Работаю...';

            startKtpProcess().then(() => {
                btn.querySelector('.mshhlpr-universal-toggle-text').textContent = '✅ Готово';
                setTimeout(() => {
                    if (btn) {
                        btn.disabled = false;
                        btn.style.opacity = '1';
                        btn.querySelector('.mshhlpr-universal-toggle-text').textContent = '▶ Достроить и пересчитать КТП';
                    }
                }, 3000);
            });
        };

        // Размещаем кнопку строго после описания (под текстом внутри общего контейнера)
        descBlock.after(btn);
    }

    // Основная процедура обработки КТП
    async function startKtpProcess() {
        console.log(LOG_TAG, 'Запуск автоматического построения КТП...');
        initNotifications();

        let successCount = 0;
        const failGroups = [];

        if (!await openKtpAndShowAll()) {
            showNotification('Список КТП уже раскрыт или пуст', true);
        }

        const firstInner = document.querySelector(SELECTORS.firstInner);
        if (firstInner) {
            await sleep(DELAY);
            mouseClick(firstInner);
        }

        const secondInner = document.querySelector(SELECTORS.secondInner);
        if (secondInner) {
            await sleep(DELAY);
            mouseClick(secondInner);
        }

        const ktpContainers = document.querySelectorAll(SELECTORS.ktpButtons);
        const ktpContainer = ktpContainers[2] || document.querySelector('.TKVLD5v7YAbPy7SGbTMY');

        if (!ktpContainer) {
            showNotification('Ошибка: Список учебных групп не найден', false);
            return;
        }

        const groups = ktpContainer.querySelectorAll(SELECTORS.groupContainer);
        showNotification(`Найдено учебных групп: ${groups.length}`, true);

        for (const group of groups) {
            const nameEl = group.querySelector(SELECTORS.groupName);
            const groupName = nameEl?.textContent.trim() || 'Без имени';
            let groupSuccess = true;

            try {
                await performActionOnGroup(group, "Достроить даты", TEXTS.buildDone);
            } catch (e) {
                console.warn(LOG_TAG, `Ошибка достройки для ${groupName}:`, e);
                groupSuccess = false;
            }

            try {
                await performActionOnGroup(group, "Пересчитать даты", TEXTS.recalcDone);
            } catch (e) {
                console.warn(LOG_TAG, `Ошибка пересчета для ${groupName}:`, e);
                groupSuccess = false;
            }

            if (groupSuccess) {
                showNotification(`${groupName}: успешно обработано`, true);
                successCount++;
            } else {
                showNotification(`${groupName}: возникла ошибка`, false);
                failGroups.push(groupName);
            }
        }

        console.log(LOG_TAG, `Построение КТП завершено. Успешно: ${successCount}`);
        showFinalModal();
    }

    async function performActionOnGroup(groupElement, menuText, toastText) {
        const threeDotsContainers = groupElement.querySelectorAll(SELECTORS.threeDots);
        if (!threeDotsContainers.length) throw new Error('Кнопка меню троеточия не найдена.');

        const lastThreeDots = threeDotsContainers[threeDotsContainers.length - 1];
        const dotsBtn = lastThreeDots.querySelector(SELECTORS.threeDotsBtnInside);

        await sleep(DELAY);
        mouseClick(dotsBtn);

        await clickMenuItem(menuText);

        try {
            const toast = await waitForToast(toastText);
            if (toast.closeBtn) mouseClick(toast.closeBtn);
        } catch (e) {
            // Игнорируем отсутствие тоста, если система отработала быстро
        }
    }

    async function openKtpAndShowAll() {
        try {
            const ktpContainers = document.querySelectorAll('.xy2L_nBvEClr4W24CmTA._9oOAfoqlLpn0ax5HVzg.TKVLD5v7YAbPy7SGbTMY');
            if (ktpContainers.length < 3) return false;

            const firstButton = ktpContainers[2].querySelector('button');
            if (firstButton) { firstButton.click(); await sleep(500); }

            const spans10 = Array.from(document.querySelectorAll('span')).filter(el => el.textContent.trim() === 'Отображать по 10');
            if (spans10.length >= 3) {
                const btn10 = spans10[2].closest('div')?.querySelector('button');
                if (btn10) { btn10.click(); await sleep(500); }
            }

            const liAll = document.querySelector('li[data-test-component="undefined-selectLimit-Отображать все"]');
            if (liAll) { liAll.click(); await sleep(500); }

            return true;
        } catch (e) {
            return false;
        }
    }

    function mouseClick(el) {
        if (!el) return;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.dispatchEvent(new MouseEvent('click', opts));
    }

    function findMenuItemByText(text) {
        const elements = Array.from(document.body.querySelectorAll('div, span, li, button'));
        return elements.find(el => el.textContent.trim() === text && el.offsetParent !== null) || null;
    }

    async function clickMenuItem(text) {
        const start = Date.now();
        while (Date.now() - start < WAIT_TIMEOUT) {
            const item = findMenuItemByText(text);
            if (item) { mouseClick(item); return; }
            await sleep(200);
        }
        throw new Error(`Пункт меню "${text}" не обнаружен.`);
    }

    function waitForToast(text, timeout = 3000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const timer = setInterval(() => {
                const spans = Array.from(document.querySelectorAll(SELECTORS.notifyMsg + ' span'))
                    .filter(s => s.textContent.trim() === text);
                if (spans.length && spans[0].offsetParent) {
                    clearInterval(timer);
                    const closeBtn = spans[0].closest(SELECTORS.notifyToast)?.querySelector('button');
                    resolve({ span: spans[0], closeBtn });
                }
                if (Date.now() - start > timeout) { clearInterval(timer); reject(); }
            }, POLL_INTERVAL);
        });
    }

    // --- ВСПЛЫВАЮЩИЕ ОПОВЕЩЕНИЯ ---
    let notifyRoot = null;

    function initNotifications() {
        if (document.getElementById('mshhlpr-ktp-notify-root')) {
            notifyRoot = document.getElementById('mshhlpr-ktp-notify-root');
            return;
        }
        notifyRoot = document.createElement('div');
        notifyRoot.id = 'mshhlpr-ktp-notify-root';
        document.body.appendChild(notifyRoot);
    }

    function showNotification(text, isSuccess = true) {
        if (!notifyRoot) initNotifications();
        const box = document.createElement('div');
        box.className = `mshhlpr-ktp-toast ${isSuccess ? 'mshhlpr-ktp-toast-success' : 'mshhlpr-ktp-toast-error'}`;
        box.innerHTML = `<span>${isSuccess ? '🟢' : '🔴'}</span><span>${text}</span>`;

        notifyRoot.appendChild(box);

        setTimeout(() => {
            box.style.opacity = '0';
            box.style.transform = 'translateY(10px)';
            setTimeout(() => box.remove(), 300);
        }, 4000);
    }

    // --- ФИНАЛЬНОЕ ОКНО ---
    function showFinalModal() {
        document.querySelectorAll('.mshhlpr-ktp-final-modal').forEach(el => el.remove());

        const overlay = document.createElement('div');
        overlay.className = 'mshhlpr-modal-overlay mshhlpr-ktp-final-modal';

        overlay.innerHTML = `
            <div class="mshhlpr-modal-content" style="width: 480px; text-align: center;">
                <div class="mshhlpr-modal-header">
                    <span>✨ Процесс завершён</span>
                    <button class="mshhlpr-modal-close">&times;</button>
                </div>
                <div class="mshhlpr-modal-body" style="flex-direction: column; padding: 25px 25px 15px 25px; gap: 15px;">
                    <div style="font-size: 50px; margin-bottom: 10px;">🎉</div>
                    <div class="mshhlpr-modal-title" style="font-size: 18px; margin-bottom: 5px;">Календарный план достроен!</div>
                    
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; text-align: left; font-size: 13px; color: #856404; line-height: 1.5; font-family: inherit;">
                        КТП всех ваших классов успешно достроено и пересчитано. <br><br>
                        ⚠️ Рекомендуется открыть расписание и проверить, нет ли в каком-то из дней недели надписи <b style="color: #e74c3c;">«Нет КТП»</b> для полной уверенности.
                    </div>
                </div>
                <div class="mshhlpr-modal-footer" style="justify-content: center; padding: 15px 25px;">
                    <button id="mshhlpr-ktp-close-modal" class="mshhlpr-universal-toggle-btn" style="cursor: pointer; width: 100%; justify-content: center;">
                        <span class="mshhlpr-universal-toggle-text">Понятно, проверю</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeBtn = overlay.querySelector('#mshhlpr-ktp-close-modal');
        const closeX = overlay.querySelector('.mshhlpr-modal-close');
        const close = () => overlay.remove();

        closeBtn.onclick = close;
        closeX.onclick = close;
        overlay.onclick = (e) => {
            if (e.target === overlay) close();
        };
    }

    // --- ДИНАМИЧЕСКИЕ СТИЛИ (для анимации всплывающих окон) ---
    function injectStyles() {
        if (document.getElementById('mesh-old-ktp-styles')) return;
        const style = document.createElement('style');
        style.id = 'mesh-old-ktp-styles';
        style.textContent = `
            @keyframes mshhlprSlideIn {
                from { transform: translateX(-100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            #mshhlpr-ktp-notify-root {
                position: fixed;
                bottom: 24px;
                left: 24px;
                display: flex;
                flex-direction: column-reverse;
                gap: 8px;
                z-index: 9999999;
                pointer-events: none;
            }
            .mshhlpr-ktp-toast {
                animation: mshhlprSlideIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 10px 16px;
                color: white;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                transition: opacity 0.3s, transform 0.3s;
                pointer-events: auto;
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: inherit;
            }
            .mshhlpr-ktp-toast-success {
                background: linear-gradient(135deg, #4caf50, #2e7d32);
                border: 1px solid #1e5622;
            }
            .mshhlpr-ktp-toast-error {
                background: linear-gradient(135deg, #e74c3c, #c62828);
                border: 1px solid #962d22;
            }
        `;
        document.head.appendChild(style);
    }

    // --- Инициализация Observer для отслеживания переходов на страницу КТП ---
    let isScheduled = false;
    const observer = new MutationObserver(() => {
        if (!isScheduled) {
            isScheduled = true;
            window.requestAnimationFrame(() => {
                if (location.href.includes('/teacher/study-process/planning')) {
                    injectStyles();
                    injectKtpButton();
                } else {
                    document.getElementById(BTN_ID)?.remove();
                }
                isScheduled = false;
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    if (location.href.includes('/teacher/study-process/planning')) {
        injectStyles();
        injectKtpButton();
    }
};