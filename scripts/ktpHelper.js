// scripts/ktpHelper.js

window.initKtpHelper = function () {
    console.log('[МЭШ][ktpHelper.js] Модуль автозаполнения КТП инициализирован.');

    const LOG_TAG = '[МЭШ Помогатор][ktpHelper.js]:';
    const BTN_ID = 'mesh-ktp-start-btn';
    const WAIT_TIMEOUT = 10000;
    const POLL_INTERVAL = 200;

    const TEXTS = {
        buildDone: 'Календарный план достроен',
        recalcDone: 'Календарный план пересчитан'
    };

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Универсальный клик: работает на ПК (мышь) и на iPad (Touch / WebKit)
    function smartClick(el) {
        if (!el) return;
        
        const target = el.closest('button') || el;
        target.scrollIntoView({ block: 'center', inline: 'center' });

        const rect = target.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;

        // 1. Touch-события для сенсорных экранов iPad
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            try {
                const touchObj = new Touch({
                    identifier: Date.now(),
                    target: target,
                    clientX: clientX,
                    clientY: clientY,
                    screenX: window.screenX + clientX,
                    screenY: window.screenY + clientY,
                    pageX: window.scrollX + clientX,
                    pageY: window.scrollY + clientY
                });

                target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touchObj], targetTouches: [touchObj], changedTouches: [touchObj] }));
                target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [touchObj] }));
            } catch (e) {}
        }

        // 2. Мышь и указатель для Chrome / ПК
        const opts = { bubbles: true, cancelable: true, view: window, button: 0, clientX, clientY };
        target.dispatchEvent(new PointerEvent('pointerdown', opts));
        target.dispatchEvent(new MouseEvent('mousedown', opts));
        target.dispatchEvent(new PointerEvent('pointerup', opts));
        target.dispatchEvent(new MouseEvent('mouseup', opts));

        // 3. Вызов нативного метода .click() (обязателен для Safari)
        if (typeof target.click === 'function') {
            target.click();
        } else {
            target.dispatchEvent(new MouseEvent('click', opts));
        }
    }

    // Извлечение красивого имени класса из строки таблицы
    function extractGroupName(row) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
            return cells[2].textContent.trim() || cells[1].textContent.trim() || cells[0].textContent.trim();
        }
        const match = row.textContent.match(/\b\d{1,2}[-_ ]?[А-Яа-яA-Za-z0-9]+(\s+[А-Яа-яЁё]+)?/);
        return match ? match[0].trim() : (row.textContent.trim().substring(0, 25) || 'Класс');
    }

    // Инъекция кнопки запуска в интерфейс
    function injectKtpButton() {
        if (!location.href.includes('/teacher/study-process/planning')) return;

        const descBlock = document.querySelector('div[data-test-component="undefined-subHeaderDescription"]');
        if (!descBlock) return;
        if (document.getElementById(BTN_ID)) return;

        console.log(LOG_TAG, 'Элемент описания найден. Внедряем кнопку под текст.');

        const btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.className = 'mshhlpr-universal-toggle-btn mshhlpr-btn-animated';
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

        descBlock.after(btn);
    }

    // Раскрытие аккордеона КТП по стабильному дата-атрибуту
    async function openKtpAccordion() {
        const ktpCardSvg = document.querySelector('[data-test-component="calAndThemPlanningCard"]');
        if (ktpCardSvg) {
            const btn = ktpCardSvg.closest('button') || ktpCardSvg.closest('div[role="button"]') || ktpCardSvg.parentElement;
            if (btn) {
                smartClick(btn);
                await sleep(1200);
                return;
            }
        }
        // Резервный поиск по тексту
        const fallbackBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Календарно-тематическое'));
        if (fallbackBtn) {
            smartClick(fallbackBtn);
            await sleep(1200);
        }
    }

    // Основная процедура обработки КТП
    async function startKtpProcess() {
        console.log(LOG_TAG, 'Запуск автозаполнения (Надежные селекторы)...');
        initNotifications();
        let successCount = 0;
        const failGroups = [];

        const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);

        await openKtpAccordion(); 
        await sleep(1000);

        // Функция поиска строк классов: берет все <tr> с троеточиями
        const getFreshGroups = () => {
            const dots = document.querySelectorAll('[data-test-component^="menuListClanAndThemPlanning"]');
            return Array.from(dots).map(d => d.closest('tr')).filter(Boolean);
        };

        let page = 1;
        let hasNextPage = true;

        // ЦИКЛ ПО СТРАНИЦАМ
        while (hasNextPage) {
            console.log(LOG_TAG, `--- Обработка страницы ${page} ---`);
            
            let groupsCount = 0;
            for (let w = 0; w < 10; w++) {
                groupsCount = getFreshGroups().length;
                if (groupsCount > 0) break;
                await sleep(500);
            }

            if (groupsCount === 0) {
                console.warn(LOG_TAG, `Не удалось найти классы на странице ${page}.`);
                break;
            }

            // ЦИКЛ ПО КЛАССАМ
            for (let i = 0; i < groupsCount; i++) {
                let currentGroups = getFreshGroups();
                if (!currentGroups[i]) {
                    await sleep(1000);
                    currentGroups = getFreshGroups();
                }
                
                const groupRow = currentGroups[i];
                if (!groupRow) continue;

                const groupName = extractGroupName(groupRow);
                let groupSuccess = true;

                try {
                    await performActionOnGroup(groupRow, "Достроить даты", TEXTS.buildDone);
                } catch (e) {
                    groupSuccess = false;
                }

                try {
                    await performActionOnGroup(groupRow, "Пересчитать даты", TEXTS.recalcDone);
                } catch (e) {
                    groupSuccess = false;
                }

                if (groupSuccess) {
                    showNotification(`${groupName}: успешно`, true);
                    successCount++;
                    await randomSleep(150, 400);
                } else {
                    showNotification(`${groupName}: ошибка`, false);
                    failGroups.push(groupName);
                    await sleep(1200);
                }
            }

            // ПЕРЕКЛЮЧЕНИЕ ПАГИНАЦИИ
            const nextBtns = Array.from(document.querySelectorAll('button[data-test-component*="nextPage"]'));
            const nextBtn = nextBtns.find(btn => btn.offsetParent !== null && !btn.disabled && !btn.hasAttribute('disabled'));
            
            if (nextBtn) {
                console.log(LOG_TAG, `Классы на странице ${page} обработаны. Переход на страницу ${page + 1}...`);
                smartClick(nextBtn);
                page++;
                await sleep(2000); 
            } else {
                console.log(LOG_TAG, 'Достигнута последняя страница КТП.');
                hasNextPage = false;
            }
        }

        console.log(LOG_TAG, `Построение КТП завершено. Всего успешно: ${successCount}`);
        showFinalModal();
    }

    async function performActionOnGroup(groupRow, menuText, toastText) {
        // Находим троеточие в строке класса через точный дата-атрибут
        const dotsSvg = groupRow.querySelector('[data-test-component^="menuListClanAndThemPlanning"]');
        if (!dotsSvg) throw new Error('Иконка троеточия не найдена в строке.');

        const dotsBtn = dotsSvg.closest('button') || dotsSvg;

        await sleep(100);
        smartClick(dotsBtn);

        // Пауза 200мс, чтобы выпадающее меню успело раскрыться на iPad/ПК
        await sleep(200);

        await clickMenuItem(menuText);

        try {
            const toast = await waitForToast(toastText);
            if (toast.closeBtn) smartClick(toast.closeBtn);
        } catch (e) {
            // Игнорируем отсутствие тоста, если система отработала быстро
        }
    }

    function findMenuItemByText(text) {
        const elements = Array.from(document.body.querySelectorAll('div, span, li, button'));
        return elements.find(el => el.textContent.trim() === text && el.offsetParent !== null) || null;
    }

    async function clickMenuItem(text) {
        const start = Date.now();
        while (Date.now() - start < WAIT_TIMEOUT) {
            const item = findMenuItemByText(text);
            if (item) { 
                smartClick(item.closest('li, button') || item); 
                return; 
            }
            await sleep(200);
        }
        throw new Error(`Пункт меню "${text}" не обнаружен.`);
    }

    function waitForToast(text, timeout = 3000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const timer = setInterval(() => {
                const spans = Array.from(document.querySelectorAll('[data-test-component$="Notify-MessageContainer"] span'))
                    .filter(s => s.textContent.trim() === text);
                if (spans.length && spans[0].offsetParent) {
                    clearInterval(timer);
                    const closeBtn = spans[0].closest('[data-test-component$="notifyToastContainer"]')?.querySelector('button');
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

    // --- ДИНАМИЧЕСКИЕ СТИЛИ ---
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