// scripts/noHomework.js

window.initNoHomework = function () {
    const LOG = '[МЭШ][noHomework]';
    console.log(`${LOG} Модуль массового выставления «Нет ДЗ» готов к работе.`);

    const BTN_ID = 'mesh-no-hw-btn';
    const MODAL_ID = 'mshhlpr-no-hw-progress-modal';
    const TIMEOUT_MS = 5000; // Таймаут 5 сек на поиск любого элемента
    const STEP_PAUSE = 120;  // Микро-пауза (мс) для реакции React-событий

    let isRunning = false;
    let abortCtrl = { aborted: false };

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Эмуляция полного цикла клика (Pointer/Mouse для React)
    const click = el => {
        if (!el) return;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(e =>
            el.dispatchEvent(new MouseEvent(e, { bubbles: true, cancelable: true, view: window }))
        );
    };

    const hover = (el, enter = true) => {
        [enter ? 'mouseover' : 'mouseout', enter ? 'mouseenter' : 'mouseleave'].forEach(e =>
            el.dispatchEvent(new MouseEvent(e, { bubbles: true, cancelable: true }))
        );
    };

    // Ожидание элемента с прерыванием по таймауту 5 сек
    async function waitFor(finderFn, name = 'элемент') {
        const start = Date.now();
        while (Date.now() - start < TIMEOUT_MS) {
            if (abortCtrl.aborted) throw new Error('Прервано пользователем');
            const el = finderFn();
            if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) return el;
            await sleep(50);
        }
        console.log(`${LOG} ❌ [ТАЙМАУТ 5 сек]: Не найден ${name}!`);
        throw new Error(`Таймаут (5 сек): не найден ${name}`);
    }

    // =========================================================================
    // 1. СБОР И ДЕДУПЛИКАЦИЯ УРОКОВ (1 УРОК НА КЛАСС В ДЕНЬ)
    // =========================================================================
    function scanSchedule() {
        const days = document.querySelectorAll('.nkAfYFPTIKgFNq2L');
        const dayNames = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        const pending = [];
        const alreadyDone = [];

        days.forEach((day, dIdx) => {
            const dayNum = dIdx + 1;
            const seenClassesToday = new Set();

            day.querySelectorAll('.e6ESIWCvYHQH3lOg').forEach(card => {
                const wrap = card.closest('div[style*="position: absolute"]') || card;
                if (wrap.style.display === 'none') return;

                const hwBadge = card.querySelector('[data-test-component*="Home-badgeStatus"]');
                if (!hwBadge) return;

                const groupName = card.querySelector('.cdISCvPwy4Q2oujR > span:first-child, .As5rq3Q894A706VT')?.textContent.trim() || 'Урок';
                const timeText = card.querySelector('.f98PG7hpc0sIR_eP span')?.textContent.trim() || '';
                const isMissing = hwBadge.classList.contains('dDPk8Oap464er0y1') || hwBadge.classList.contains('iHwmFfNLyqw9_9Qt');

                // Если у этого класса в этот день уже взят урок — пропускаем (1 день = 1 ДЗ)
                if (seenClassesToday.has(groupName)) {
                    console.log(`${LOG} ⏩ Пропуск дублирующего урока: ${groupName} (${dayNames[dayNum] || dayNum})`);
                    return;
                }
                seenClassesToday.add(groupName);

                const item = {
                    card,
                    group: groupName,
                    time: timeText,
                    day: dayNames[dayNum] || `${dayNum} дн.`,
                    id: Math.random().toString(36).substring(2, 8)
                };

                if (isMissing) pending.push(item);
                else alreadyDone.push(item);
            });
        });

        return { pending, alreadyDone };
    }

    // =========================================================================
    // 2. ВНЕДРЕНИЕ КНОПКИ В ПАНЕЛЬ
    // =========================================================================
    function injectButton() {
        // Проверяем, что мы на странице расписания (а не в уроке)
        const isSchedule = location.pathname.includes('/schedule') && !location.pathname.includes('/lesson');
        if (!isSchedule) {
            document.getElementById(BTN_ID)?.remove();
            return;
        }

        if (document.getElementById(BTN_ID)) return;

        // Привязываемся напрямую к кнопке звонков (она уже защищена от появления в шторках)
        const bellBtn = document.getElementById('mesh-b-btn');
        if (!bellBtn) return;

        const btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.type = 'button';
        btn.className = 'mshhlpr-universal-toggle-btn mshhlpr-compact-toggle';
        btn.style.cssText = `
            background: linear-gradient(135deg, #e74c3c, #c62828) !important;
            border: 1px solid rgba(0,0,0,0.2) !important;
            margin-left: 3px !important;
            cursor: pointer !important;
            box-shadow: 0 2px 4px rgba(231,76,60,0.3) !important;
        `;
        btn.innerHTML = `<span class="mshhlpr-universal-toggle-text" style="color:#fff!important;font-weight:700;">🚫 Всем "Нет ДЗ"</span>`;
        btn.onclick = e => {
            e.preventDefault();
            e.stopPropagation();
            if (isRunning) return alert('Процесс уже выполняется.');
            showConfirmModal();
        };

        bellBtn.after(btn);
    }

    // =========================================================================
    // 3. ПОДТВЕРЖДЕНИЕ
    // =========================================================================
    function showConfirmModal() {
        document.querySelectorAll('.mshhlpr-modal-overlay').forEach(el => el.remove());

        const ov = document.createElement('div');
        ov.className = 'mshhlpr-modal-overlay';
        ov.innerHTML = `
            <div class="mshhlpr-modal-content" style="width: 440px; text-align: center;">
                <div class="mshhlpr-modal-header" style="background: linear-gradient(135deg, #e74c3c, #c62828) !important;">
                    <span>⚠️ Выставить «Нет ДЗ» на этой неделе?</span>
                    <button class="mshhlpr-modal-close">&times;</button>
                </div>
                <div class="mshhlpr-modal-body" style="flex-direction: column; padding: 20px; gap: 12px; text-align: left;">
                    <div style="font-size: 34px; text-align: center;">🚫</div>
                    <div style="font-size: 13.5px; font-weight: 700; color: #2c3e50; text-align: center;">
                        Выставить «Нет ДЗ» каждому прошедшему уроку без домашнего задания?
                    </div>
                </div>
                <div class="mshhlpr-modal-footer" style="justify-content: flex-end; gap: 10px;">
                    <button id="mesh-nohw-cancel" class="mshhlpr-action-btn-secondary">Отмена</button>
                    <button id="mesh-nohw-ok" class="mshhlpr-btn mshhlpr-btn-danger">Да, выставить</button>
                </div>
            </div>`;

        document.body.appendChild(ov);
        const close = () => ov.remove();
        ov.querySelector('.mshhlpr-modal-close').onclick = close;
        ov.querySelector('#mesh-nohw-cancel').onclick = close;
        ov.onclick = e => e.target === ov && close();
        ov.querySelector('#mesh-nohw-ok').onclick = () => { close(); runProcess(); };
    }

    // =========================================================================
    // 4. ОКНО ПРОГРЕССА (СЛЕВА ВНИЗУ)
    // =========================================================================
    function createProgressUI(initialPending, initialDone) {
        document.getElementById(MODAL_ID)?.remove();

        const box = document.createElement('div');
        box.id = MODAL_ID;
        box.style.cssText = `
            position: fixed !important; bottom: 20px !important; left: 20px !important; width: 380px !important;
            max-height: 480px !important; background: #fff !important; border-radius: 12px !important;
            border: 1px solid rgba(0,0,0,0.18) !important; box-shadow: 0 10px 30px rgba(0,0,0,0.25) !important;
            z-index: 9999999 !important; display: flex !important; flex-direction: column !important;
            overflow: hidden !important; font-family: 'Segoe UI', Roboto, sans-serif !important;
        `;

        box.innerHTML = `
            <div style="background: linear-gradient(135deg, #e74c3c, #c62828); color: #fff; padding: 10px 14px; font-weight: 700; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
                <span>🚫 Прогресс: «Нет ДЗ»</span>
                <button id="msh-nohw-stop" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: #fff; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer;">⏹️ Стоп</button>
            </div>
            <div style="padding: 10px 14px; background: #fafafa; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #444; margin-bottom: 4px;">
                    <span id="msh-nohw-status">Запуск...</span>
                    <span id="msh-nohw-pct">0%</span>
                </div>
                <div style="width: 100%; height: 5px; background: #e0e0e0; border-radius: 3px; overflow: hidden;">
                    <div id="msh-nohw-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #e74c3c, #2ecc71); transition: width 0.2s;"></div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 12px; flex: 1; overflow: hidden;">
                <div style="display: flex; flex-direction: column; min-height: 0;">
                    <div style="font-size: 11px; font-weight: 700; color: #c0392b; margin-bottom: 4px; display: flex; justify-content: space-between;">
                        <span>⏳ Без ДЗ:</span><span id="msh-nohw-p-cnt">0</span>
                    </div>
                    <ul id="msh-nohw-p-list" style="list-style: none; margin: 0; padding: 0; overflow-y: auto; max-height: 190px; display: flex; flex-direction: column; gap: 4px;"></ul>
                </div>
                <div style="display: flex; flex-direction: column; min-height: 0; border-left: 1px solid #eee; padding-left: 8px;">
                    <div style="font-size: 11px; font-weight: 700; color: #27ae60; margin-bottom: 4px; display: flex; justify-content: space-between;">
                        <span>✅ С ДЗ (все):</span><span id="msh-nohw-d-cnt">0</span>
                    </div>
                    <ul id="msh-nohw-d-list" style="list-style: none; margin: 0; padding: 0; overflow-y: auto; max-height: 190px; display: flex; flex-direction: column; gap: 4px;"></ul>
                </div>
            </div>
        `;

        document.body.appendChild(box);

        const stopBtn = box.querySelector('#msh-nohw-stop');
        stopBtn.onclick = () => {
            console.warn(`${LOG} ⏹️ Остановка пользователем...`);
            abortCtrl.aborted = true;
            stopBtn.disabled = true;
            stopBtn.textContent = 'Остановка...';
        };

        const $ = s => box.querySelector(s);
        const [elStatus, elPct, elBar, elPCnt, elDCnt, elPList, elDList] = [
            $('#msh-nohw-status'), $('#msh-nohw-pct'), $('#msh-nohw-bar'),
            $('#msh-nohw-p-cnt'), $('#msh-nohw-d-cnt'), $('#msh-nohw-p-list'), $('#msh-nohw-d-list')
        ];

        const makeLi = (item, isDone) => {
            const li = document.createElement('li');
            li.style.cssText = `padding: 3px 6px; border-radius: 4px; background: ${isDone ? '#e8f8f5' : '#fdf2e9'}; border: 1px solid ${isDone ? '#a3e4d7' : '#fad7a0'}; font-size: 10.5px; line-height: 1.2;`;
            li.innerHTML = `<b>${item.group}</b> <span style="color:#777;">(${item.day})</span>`;
            return li;
        };

        return {
            update(pending, done, text, pct) {
                elStatus.textContent = text;
                elPct.textContent = `${pct}%`;
                elBar.style.width = `${pct}%`;
                elPCnt.textContent = pending.length;
                elDCnt.textContent = done.length;

                elPList.innerHTML = '';
                pending.forEach(i => elPList.appendChild(makeLi(i, false)));

                elDList.innerHTML = '';
                done.forEach(i => elDList.appendChild(makeLi(i, true)));
            },
            done(msg, success = true) {
                elStatus.textContent = msg;
                elStatus.style.color = success ? '#27ae60' : '#c0392b';
                stopBtn.textContent = 'Закрыть';
                stopBtn.disabled = false;
                stopBtn.onclick = () => box.remove();
            }
        };
    }

    // =========================================================================
    // 5. ПОШАГОВАЯ ОБРАБОТКА ОДНОГО УРОКА
    // =========================================================================
    async function processLesson(item) {
        console.log(`${LOG} 👉 Выставляем "Нет ДЗ": ${item.group} (${item.day}, ${item.time})`);

        // СТАЛО:
        // 1. Открытие карточки
        const cardTarget = item.card.querySelector('.jbafQ8TzmhUujJ8_') || item.card;
        cardTarget.scrollIntoView({ block: 'center', inline: 'center' });
        await sleep(60);

        // Эмулируем реальное наведение курсора в центр карточки
        const rect = cardTarget.getBoundingClientRect();
        const evOpts = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
        ['pointerover', 'pointerenter', 'mouseover', 'mouseenter'].forEach(e =>
            cardTarget.dispatchEvent(new MouseEvent(e, evOpts))
        );

        // Ищем кнопку «К уроку» именно для НАШЕГО урока
        const toLessonBtn = await waitFor(() => {
            const poppers = Array.from(document.querySelectorAll('div[role="tooltip"], div[class*="Popper"]'));
            
            // Ищем всплывашку, которая содержит название нашего класса или время
            const myPopper = poppers.reverse().find(p => 
                (item.group && p.textContent.includes(item.group.split(' ')[0])) ||
                (item.time && p.textContent.includes(item.time.replace(/^\d+\.\s*/, '')))
            ) || poppers[0]; // если текст не совпал, берем самое последнее созданное окно

            if (myPopper) {
                const btn = Array.from(myPopper.querySelectorAll('button')).find(b => b.textContent.includes('К уроку'));
                if (btn) return btn;
            }

            // Запасной поиск: берем ПОСЛЕДНЮЮ (самую свежую) кнопку на странице, а не первую
            const allBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('К уроку') && b.offsetParent !== null);
            return allBtns[allBtns.length - 1] || null;
        }, 'кнопка "К уроку"');

        click(toLessonBtn);
        await sleep(STEP_PAUSE);

        // 2. Чекбокс «Нет ДЗ»
        const toggleBtn = await waitFor(() => {
            const btn = document.querySelector('button[data-test-component="LILessonInfoHomeworkOpenAbsencesCalendar"]');
            if (btn && btn.offsetParent !== null) return btn;
            return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Без домашнего задания') && b.offsetParent !== null);
        }, 'переключатель "Нет ДЗ"');

        click(toggleBtn);
        await sleep(STEP_PAUSE);

        // 3. Сохранить
        const saveBtn = await waitFor(() => {
            const el = document.querySelector('button[data-test-component="LIHomeworkAbsencesSave"]');
            if (el && el.offsetParent !== null) return el;
            return Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Сохранить' && b.offsetParent !== null);
        }, 'кнопка "Сохранить"');

        click(saveBtn);
        await sleep(STEP_PAUSE);

        // 4. Закрыть
        const closeBtn = await waitFor(() => {
            const span = document.querySelector('span.sJToZQIgfecRD7tw.dILX7N_ZSccOqnJB.MejH1nphzM2KslHN.BsIFBxR8iN4s_i5t');
            if (span && span.offsetParent !== null) return span;
            return Array.from(document.querySelectorAll('span, button')).find(e => e.textContent.trim() === 'Закрыть' && e.offsetParent !== null);
        }, 'кнопка "Закрыть"');

        click(closeBtn);
        await sleep(STEP_PAUSE);

        console.log(`${LOG} ✅ Успешно: ${item.group} (${item.day})`);
    }

    // =========================================================================
    // 6. ОСНОВНОЙ ЦИКЛ
    // =========================================================================
    async function runProcess() {
        console.log(`${LOG} 🔎 Сканирование недели с дедупликацией уроков...`);
        const { pending, alreadyDone } = scanSchedule();

        if (!pending.length) {
            console.log(`${LOG} Все уроки уже имеют ДЗ.`);
            return alert('На этой неделе нет уроков без домашнего задания!');
        }

        console.log(`${LOG} К обработке: ${pending.length}, уже с ДЗ: ${alreadyDone.length}`);

        isRunning = true;
        abortCtrl.aborted = false;

        const queue = [...pending];
        const done = [...alreadyDone];
        const total = queue.length;

        const ui = createProgressUI(queue, done);
        ui.update(queue, done, 'Начало обработки...', 0);

        try {
            for (let i = 0; i < total; i++) {
                if (abortCtrl.aborted) {
                    ui.done('⏹️ Остановлено пользователем', false);
                    break;
                }

                const current = queue[0];
                const pct = Math.round((i / total) * 100);
                ui.update(queue, done, `[${i + 1}/${total}] ${current.group} (${current.day})`, pct);

                await processLesson(current);

                queue.shift();
                done.unshift(current);

                ui.update(queue, done, `Готово: ${current.group}`, Math.round(((i + 1) / total) * 100));
            }

            if (!abortCtrl.aborted) {
                console.log(`${LOG} 🏆 Все уроки успешно обновлены!`);
                ui.done('✅ Все ДЗ выставлены!', true);
            }
        } catch (err) {
            console.log(`${LOG} 💥 Ошибка процесса:`, err);
            ui.done(err.message || 'Ошибка', false);
        } finally {
            isRunning = false;
        }
    }

    // =========================================================================
    // 7. НАБЛЮДАТЕЛЬ (OBSERVER)
    // =========================================================================
    let scheduled = false;
    new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(() => {
            const isSchedule = location.pathname.includes('/schedule') && !location.pathname.includes('/lesson');
            if (isSchedule) {
                injectButton();
            } else {
                document.getElementById(BTN_ID)?.remove();
            }
            scheduled = false;
        });
    }).observe(document.body, { childList: true, subtree: true });

    injectButton();
};