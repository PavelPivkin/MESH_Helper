// scripts/noHomework.js

window.initNoHomework = function () {
    // 1. ЦЕНТРАЛИЗОВАННЫЕ СЕЛЕКТОРЫ
    const SEL = {
        bellsBtn: '#mesh-b-btn',
        btnId: 'mesh-no-hw-btn',
        modalId: 'mshhlpr-no-hw-ui',
        day: '.nkAfYFPTIKgFNq2L',
        card: '.e6ESIWCvYHQH3lOg',
        cardInner: '.m0Kra9tNIDzJFtd8',
        group: '.cdISCvPwy4Q2oujR > span:first-child, .As5rq3Q894A706VT',
        badge: '[data-test-component*="Home-badgeStatus"]',
        badgeErr: 'dDPk8Oap464er0y1', // Красный домик (нет ДЗ)
        tglNoHw: 'button[data-test-component="LILessonInfoHomeworkOpenAbsencesCalendar"]',
        btnSave: 'button[data-test-component="LIHomeworkAbsencesSave"]',
        btnClose: 'span.sJToZQIgfecRD7tw.dILX7N_ZSccOqnJB.MejH1nphzM2KslHN.BsIFBxR8iN4s_i5t'
    };

    let isRunning = false, abortCtrl = { aborted: false };
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Одиночный клик с координатами центра
    const click = el => {
        if (!el) return;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const r = el.getBoundingClientRect();
        const ev = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(e => el.dispatchEvent(new MouseEvent(e, ev)));
        el.click ? el.click() : el.dispatchEvent(new MouseEvent('click', ev));
    };

    // Ожидание элемента без выброса критических ошибок
    const waitFor = async (fn, timeout = 4500) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (abortCtrl.aborted) return null;
            const el = fn();
            if (el && el.offsetParent !== null) return el;
            await sleep(60);
        }
        return null;
    };

    // 2. СБОР УРОКОВ БЕЗ ДЗ (1 урок на класс в день)
    function scanSchedule() {
        const list = [], seen = new Set();
        document.querySelectorAll(SEL.day).forEach((day, dIdx) => {
            day.querySelectorAll(SEL.card).forEach(c => {
                if (c.closest('div[style*="position: absolute"]')?.style.display === 'none') return;
                const b = c.querySelector(SEL.badge);
                if (!b || (!b.classList.contains(SEL.badgeErr) && !b.querySelector(`.${SEL.badgeErr}`))) return;

                const name = c.querySelector(SEL.group)?.textContent.trim() || 'Урок';
                const key = `${dIdx}_${name}`;
                if (seen.has(key)) return;
                seen.add(key);

                list.push({ card: c, name, day: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][dIdx] || `${dIdx + 1} дн.` });
            });
        });
        return list;
    }

    // 3. ОБРАБОТКА ОДНОГО УРОКА
    async function processLesson(item) {
        // Шаг 1: клик по карточке урока
        click(item.card.querySelector(SEL.cardInner) || item.card);
        await sleep(350);

        // Шаг 2: кнопка "К уроку"
        const toLesson = await waitFor(() => Array.from(document.querySelectorAll('button')).reverse().find(b => b.textContent.includes('К уроку') && b.offsetParent !== null));
        if (!toLesson) return false;
        click(toLesson);
        await sleep(850);

        // Шаг 3: переключатель "Без ДЗ"
        const tgl = await waitFor(() => document.querySelector(SEL.tglNoHw) || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Без домашнего задания') && b.offsetParent !== null));
        if (!tgl) return false;
        click(tgl);
        await sleep(500);

        // Шаг 4: кнопка "Сохранить"
        const save = await waitFor(() => document.querySelector(SEL.btnSave) || Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Сохранить' && b.offsetParent !== null));
        if (!save) return false;
        click(save);
        await sleep(650);

        // Шаг 5: кнопка "Закрыть"
        const close = document.querySelector(SEL.btnClose) || Array.from(document.querySelectorAll('span, button')).find(e => e.textContent.trim() === 'Закрыть' && e.offsetParent !== null);
        if (close) click(close);
        await sleep(300);

        return true;
    }

    // 4. ГЛАВНЫЙ ЦИКЛ
    async function runProcess() {
        try {
            const queue = scanSchedule();
            if (!queue.length) return alert('На этой неделе нет уроков без домашнего задания!');

            isRunning = true;
            abortCtrl.aborted = false;

            const ui = createUI(queue.length);
            let success = 0;

            for (let i = 0; i < queue.length; i++) {
                if (abortCtrl.aborted) { ui.done('Остановлено', false); break; }
                const cur = queue[i];
                ui.update(i, queue.length, `${cur.name} (${cur.day})`);

                const ok = await processLesson(cur);
                if (ok) {
                    success++;
                    ui.log(cur.name, cur.day, true);
                } else {
                    ui.log(cur.name, cur.day, false);
                    const close = document.querySelector(SEL.btnClose);
                    if (close) click(close);
                    await sleep(400);
                }
            }

            if (!abortCtrl.aborted) {
                ui.update(queue.length, queue.length, 'Готово!');
                ui.done(`🎉 Готово: ${success} из ${queue.length}. Обновите страницу.`);
            }
        } catch (e) {
            console.warn('[МЭШ][noHomework] Сбой:', e);
        } finally {
            isRunning = false;
        }
    }

    // 5. КОМПАКТНЫЙ ИНТЕРФЕЙС ПРОГРЕССА
    function createUI(total) {
        document.getElementById(SEL.modalId)?.remove();
        const box = document.createElement('div');
        box.id = SEL.modalId;
        box.style.cssText = 'position:fixed!important;bottom:20px!important;left:20px!important;width:320px!important;background:#fff!important;border-radius:10px!important;box-shadow:0 8px 24px rgba(0,0,0,0.25)!important;z-index:9999999!important;overflow:hidden!important;font-family:sans-serif!important;font-size:12px!important;';
        box.innerHTML = `
            <div style="background:linear-gradient(135deg,#e74c3c,#c62828);color:#fff;padding:8px 12px;font-weight:700;display:flex;justify-content:space-between;align-items:center;">
                <span>🚫 Прогресс «Нет ДЗ»</span>
                <button id="msh-nhw-stp" style="background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;">⏹️ Стоп</button>
            </div>
            <div style="padding:8px 12px;background:#fafafa;border-bottom:1px solid #eee;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-weight:600;color:#555;">
                    <span id="msh-nhw-t">Подготовка...</span><span id="msh-nhw-p">0%</span>
                </div>
                <div style="width:100%;height:4px;background:#e0e0e0;border-radius:2px;overflow:hidden;">
                    <div id="msh-nhw-b" style="width:0%;height:100%;background:#2e7d32;transition:width .2s;"></div>
                </div>
            </div>
            <ul id="msh-nhw-l" style="list-style:none;margin:0;padding:6px 10px;max-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;"></ul>`;
        document.body.appendChild(box);

        const stop = box.querySelector('#msh-nhw-stp');
        stop.onclick = () => { abortCtrl.aborted = true; stop.textContent = 'Остановка...'; };

        return {
            update(done, tot, txt) {
                const pct = tot > 0 ? Math.round((done / tot) * 100) : 100;
                box.querySelector('#msh-nhw-t').textContent = txt;
                box.querySelector('#msh-nhw-p').textContent = `${pct}%`;
                box.querySelector('#msh-nhw-b').style.width = `${pct}%`;
            },
            log(name, day, ok) {
                const li = document.createElement('li');
                li.style.cssText = `padding:2px 6px;border-radius:3px;font-size:11px;background:${ok ? '#e8f5e9' : '#ffebee'};color:${ok ? '#2e7d32' : '#c62828'};`;
                li.textContent = `${ok ? '✅' : '❌'} ${name} (${day})`;
                box.querySelector('#msh-nhw-l')?.prepend(li);
            },
            done(txt, ok = true) {
                const t = box.querySelector('#msh-nhw-t');
                if (t) { t.textContent = txt; t.style.color = ok ? '#2e7d32' : '#c62828'; }
                stop.textContent = 'Закрыть';
                stop.onclick = () => box.remove();
            }
        };
    }

    // 6. ПОДТВЕРЖДЕНИЕ И ВНЕДРЕНИЕ КНОПКИ
    function showConfirmModal() {
        document.querySelectorAll('.mshhlpr-modal-overlay').forEach(el => el.remove());
        const ov = document.createElement('div');
        ov.className = 'mshhlpr-modal-overlay';
        ov.innerHTML = `
            <div class="mshhlpr-modal-content" style="width: 360px; text-align: center;">
                <div class="mshhlpr-modal-header" style="background: linear-gradient(135deg, #e74c3c, #c62828) !important;">
                    <span>⚠️ Выставить «Нет ДЗ»?</span>
                    <button class="mshhlpr-modal-close">&times;</button>
                </div>
                <div class="mshhlpr-modal-body" style="padding: 16px; font-size: 13px; color: #333;">
                    Выставить статус «Без ДЗ» всем прошедшим урокам текущей недели без домашнего задания?
                </div>
                <div class="mshhlpr-modal-footer" style="justify-content: flex-end; gap: 8px;">
                    <button id="msh-nhw-c" class="mshhlpr-action-btn-secondary">Отмена</button>
                    <button id="msh-nhw-o" class="mshhlpr-btn mshhlpr-btn-danger">Да, выставить</button>
                </div>
            </div>`;
        document.body.appendChild(ov);

        const close = () => ov.remove();
        ov.querySelector('.mshhlpr-modal-close').onclick = close;
        ov.querySelector('#msh-nhw-c').onclick = close;
        ov.onclick = e => e.target === ov && close();
        ov.querySelector('#msh-nhw-o').onclick = () => { close(); runProcess().catch(() => {}); };
    }

    function injectButton() {
        if (!location.pathname.includes('/schedule') || location.pathname.includes('/lesson') || document.getElementById(SEL.btnId)) return;
        const bellBtn = document.querySelector(SEL.bellsBtn);
        if (!bellBtn) return;

        const btn = document.createElement('button');
        btn.id = SEL.btnId;
        btn.type = 'button';
        btn.className = 'mshhlpr-universal-toggle-btn mshhlpr-compact-toggle';
        btn.style.cssText = 'background:linear-gradient(135deg, #e74c3c, #c62828)!important;border:1px solid rgba(0,0,0,0.2)!important;margin-left:3px!important;cursor:pointer!important;';
        btn.innerHTML = '<span class="mshhlpr-universal-toggle-text" style="color:#fff!important;font-weight:700;">🚫 Всем "Нет ДЗ"</span>';
        btn.onclick = e => {
            e.preventDefault(); e.stopPropagation();
            if (isRunning) return alert('Процесс уже выполняется.');
            showConfirmModal();
        };
        bellBtn.after(btn);
    }

    let scheduled = false;
    new MutationObserver(() => {
        if (!scheduled) {
            scheduled = true;
            window.requestAnimationFrame(() => { injectButton(); scheduled = false; });
        }
    }).observe(document.body, { childList: true, subtree: true });

    injectButton();
};