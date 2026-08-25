// scripts/schedulePDF.js

(() => {
    const LOG_TAG = '[МЭШ Помогатор][schedulePDF.js]:';

    const CONFIG = {
        NDO_KEYWORDS: ['ндо', 'на дому', 'индив'],
        SEL: {
            day: '.nkAfYFPTIKgFNq2L', dayName: '.dILX7N_ZSccOqnJB',
            lesson: '.e6ESIWCvYHQH3lOg', group: '.X0GUYlwW3AK6YM5m.BTBt1wRzNcfIB7cb', time: '.f98PG7hpc0sIR_eP span'
        }
    };

    window.initSchedulePDF = function() {
        console.log(LOG_TAG, 'Инициализация модуля печати PDF расписания.');
        if (location.href.includes('schedule')) injectPrintButton();
    };

    function injectPrintButton() {
        if (document.getElementById('mesh-print-schedule-btn')) return;
        const aside = document.querySelector('aside.rUlQ9EWlNWIMbbZh.Et14spNe2tEZiyY3');
        if (!aside) return;

        const btn = document.createElement('button');
        btn.id = 'mesh-print-schedule-btn';
        btn.className = 'mshhlpr-universal-toggle-btn';
        btn.style.cssText = 'cursor:pointer!important;padding:6px 12px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;height:auto!important;margin-right:8px!important;';
        btn.innerHTML = `<span class="mshhlpr-universal-toggle-text" style="font-size:12px!important;">🖨️ Печать расписания этой недели</span>`;
        btn.onclick = (e) => { e.preventDefault(); openPrintChoiceModal(); };
        aside.prepend(btn);
    }

    function openPrintChoiceModal() {
        document.querySelectorAll('.mshhlpr-modal-overlay').forEach(el => el.remove());

        const overlay = document.createElement('div');
        overlay.className = 'mshhlpr-modal-overlay';
        
        overlay.innerHTML = `
            <div class="mshhlpr-modal-content" style="width:420px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.3);">
                <div class="mshhlpr-modal-header" style="padding:16px 20px;display:flex;justify-content:space-between;">
                    <span>🖨️ Настройка печати расписания</span>
                    <button class="mshhlpr-modal-close" style="cursor:pointer;background:0 0;border:0;font-size:18px;">&times;</button>
                </div>
                <div class="mshhlpr-modal-body" style="display:flex;flex-direction:column;padding:20px;gap:15px;">
                    <div style="font-size:13px;color:#555;text-align:left;line-height:1.4;">Настройте параметры вывода данных перед печатью:</div>
                    <div style="font-size:13px;color:#555;text-align:left;line-height:1.4;">(По умолчанию печатается только название класса)</div>
                    <div style="display:flex;flex-direction:column;gap:10px;background:#f5f5f5;padding:12px;border-radius:8px;border:1px solid #e0e0e0;align-items:flex-start;">
                        ${['subject|Название предмета', 'cabinet|Кабинет', 'ndo|Добавить НДО'].map(opt => {
                            const [id, label] = opt.split('|');
                            return `<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:bold;color:#333;cursor:pointer;user-select:none;">
                                <input type="checkbox" id="msh-opt-${id}" style="width:16px;height:16px;cursor:pointer;">
                                <span>${label}</span>
                            </label>`;
                        }).join('')}
                    </div>
                    <div style="display:flex;flex-direction:column;gap:10px;margin-top:5px;">
                        <button id="msh-print-dom" class="mshhlpr-universal-toggle-btn" style="justify-content:center;cursor:pointer;padding:10px!important;">
                            <span class="mshhlpr-universal-toggle-text" style="font-size:13px!important;">📄 Сформировать расписание</span>
                        </button>
                    </div>
                </div>
            </div>`;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('.mshhlpr-modal-close').onclick = close;
        overlay.onclick = e => { if (e.target === overlay) close(); };

        const getOpts = () => ({
            showSubject: overlay.querySelector('#msh-opt-subject').checked,
            showCabinet: overlay.querySelector('#msh-opt-cabinet').checked,
            showNdo: overlay.querySelector('#msh-opt-ndo').checked
        });

        overlay.querySelector('#msh-print-dom').onclick = () => { close(); printFromDOM(getOpts()); };
    }

    function parseDOMText(fullText, activeTeacherName) {
        if (!fullText) return { subject: '', className: '' };
        const words = fullText.split(/\s+/).filter(Boolean);
        const tParts = (activeTeacherName || "").toLowerCase().split(/\s+/).map(p => p.trim()).filter(p => p.length > 2);
        
        const clean = words.filter(w => {
            if (/^[а-яёa-z]\.([а-яёa-z]\.?)?$/i.test(w) || /^[а-яёa-z]\.$/i.test(w)) return false;
            const wl = w.toLowerCase().replace(/[^a-zа-яё0-9-]/g, '');
            return !tParts.some(p => { const cp = p.replace(/[^a-zа-яё0-9-]/g, ''); return wl.includes(cp) || cp.includes(wl); });
        });

        const cIdx = clean.findIndex(w => /^\d/.test(w));
        return cIdx !== -1 
            ? { className: clean[cIdx], subject: clean.slice(0, cIdx).join(' ') } 
            : { className: clean.join(' '), subject: '' };
    }

    const timeToMins = str => {
        const p = str.replace('.', ':').split(':').map(Number);
        return (isNaN(p[0]) || isNaN(p[1])) ? 0 : p[0] * 60 + p[1];
    };

    async function printFromDOM(options) {
        const days = Array.from(document.querySelectorAll(CONFIG.SEL.day));
        if (!days.length) return alert('На странице не найдено расписание.');

        const allTimes = [...new Set(Array.from(document.querySelectorAll(CONFIG.SEL.lesson))
            .map(l => l.querySelector(CONFIG.SEL.time)?.textContent.trim())
            .filter(t => t && t.includes('-')))]
            .sort((a, b) => timeToMins(a.split('-')[0]) - timeToMins(b.split('-')[0]));

        let parsedBells = [], activeTeacher = "Учитель";
        try {
            const res = await new Promise(resolve => chrome.storage.local.get(['activeTeacher', 'profiles', 'globalBellSchedule'], resolve));
            activeTeacher = res.activeTeacher || "Учитель";
            
            const bellsText = res.profiles?.[activeTeacher]?.bellSchedule || res.globalBellSchedule || window.MESH_DEFAULT_BELLS || '';
            
            bellsText.split('\n').forEach(line => {
                const m = line.match(/(?:(\d+)\s*урок\s*)?(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/i);
                if (m) {
                    const [s, e] = [timeToMins(m[2]), timeToMins(m[3])];
                    if (s && e) parsedBells.push({ num: m[1] ? parseInt(m[1]) : null, start: s });
                }
            });
        } catch (e) { console.warn(LOG_TAG, 'Ошибка загрузки звонков:', e); }

        const dMap = { 'по':1, 'пн':1, 'вт':2, 'ср':3, 'че':4, 'чт':4, 'пя':5, 'пт':5, 'су':6, 'сб':6, 'во':7, 'вс':7 };
        const lessons = [];

        days.forEach(day => {
            const dNum = dMap[(day.querySelector(CONFIG.SEL.dayName)?.textContent.trim().toLowerCase() || '').slice(0, 2)] || 0;
            if (dNum < 1 || dNum > 7) return;

            day.querySelectorAll(CONFIG.SEL.lesson).forEach(l => {
                const timeStr = l.querySelector(CONFIG.SEL.time)?.textContent.trim() || '';
                const grp = l.querySelector(CONFIG.SEL.group)?.textContent.trim() || '';
                if (!timeStr || !grp) return;

                let cab = '';
                l.querySelectorAll('span, div').forEach(el => {
                    const txt = el.textContent.trim();
                    if (/^(каб\.?\s*\d+|кабинет\s*\d+|\d{3}[а-я]?|спортзал|акт\.?\s*зал|библиотека|мастерская|ндо)/i.test(txt) || (txt.length <= 5 && /^\d+$/.test(txt))) cab = txt;
                });

                const isNdo = CONFIG.NDO_KEYWORDS.some(kw => grp.toLowerCase().includes(kw) || cab.toLowerCase().includes(kw));
                const parsed = isNdo ? { className: grp, subject: '' } : parseDOMText(grp, activeTeacher);
                
                const sMins = timeToMins(timeStr.split('-')[0].trim());
                lessons.push({
                    lesson_number: parsedBells.find(b => Math.abs(b.start - sMins) <= 15)?.num || (allTimes.indexOf(timeStr) + 1),
                    day_number: dNum,
                    class_unit_name: parsed.className,
                    group_name: parsed.className,
                    subject_name: parsed.subject,
                    cabinet: isNdo ? '' : cab,
                    time: timeStr.split('-')[0].trim().replace('.', ':').split(':').map(Number),
                    duration: timeStr.includes('-') ? (timeToMins(timeStr.split('-')[1]) - sMins) : 40,
                    time_is_ndo: isNdo
                });
            });
        });

        if (!lessons.length) return alert('На открытой неделе не обнаружено уроков.');
        generateGridPrintView(lessons, activeTeacher, options);
    }

    function generateGridPrintView(lessons, teacherName, { showSubject, showCabinet, showNdo }) {
        const filtered = showNdo ? lessons : lessons.filter(l => !l.time_is_ndo);
        const daysToShow = [1, 2, 3, 4, 5];
        if (filtered.some(l => l.day_number === 6)) daysToShow.push(6);
        if (filtered.some(l => l.day_number === 7)) daysToShow.push(7);
        
        const dayNames = ["", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
        const grid = {}; let maxNum = 0;

        filtered.forEach(l => {
            maxNum = Math.max(maxNum, l.lesson_number);
            if (!grid[l.lesson_number]) grid[l.lesson_number] = {};
            if (!grid[l.lesson_number][l.day_number]) grid[l.lesson_number][l.day_number] = [];
            grid[l.lesson_number][l.day_number].push(l);
        });

        const densityClass = (maxNum + (showSubject ? 2 : 0) + (filtered.some(l => (l.class_unit_name.length + (l.subject_name || '').length) > 30) ? 2 : 0) <= 5) ? "density-spacious" : (maxNum >= 10 ? "density-compact" : "density-comfortable");

        let rowsHtml = '', displayNum = 1;
        for (let i = 1; i <= maxNum; i++) {
            if (!daysToShow.some(d => grid[i]?.[d]?.length)) continue;
            
            // Приоритет выбора времени для строки: ищем сначала обычный (не НДО) урок в этой строке
            const allRowLessons = daysToShow.flatMap(d => grid[i]?.[d] || []);
            const sample = allRowLessons.find(l => !l.time_is_ndo) || allRowLessons[0];
            
            let timeStr = "";
            if (sample?.time) {
                const end = sample.time[0] * 60 + sample.time[1] + (sample.duration || 40);
                timeStr = `${sample.time[0]}:${String(sample.time[1]).padStart(2,'0')}-${Math.floor(end/60)}:${String(end%60).padStart(2,'0')}`;
            }

            rowsHtml += `<tr><td>${displayNum++}</td><td class="cell-time">${timeStr}</td>`;
            daysToShow.forEach(d => {
                const cLs = grid[i]?.[d];
                if (!cLs?.length) return rowsHtml += `<td class="cell-empty"></td>`;
                
                rowsHtml += `<td class="cell-lesson">${cLs.map((l, idx) => {
                    const c = l.class_unit_name || l.group_name || "", s = l.subject_name || "", cab = l.cabinet || "";
                    const fCls = (c.length + s.length) > 40 ? 'text-micro' : ((c.length + s.length) > 20 ? 'text-small' : '');
                    return `${idx > 0 ? '<div class="lesson-separator"></div>' : ''}
                        <div class="lesson-wrapper ${fCls}">
                            ${showSubject && s ? `<div class="subject-name">${s}</div>` : ''}
                            <div class="class-row"><span class="class-name">${c}</span>${showCabinet && cab ? `<span class="cabinet-name">${cab}</span>` : ''}</div>
                        </div>`;
                }).join('')}</td>`;
            });
            rowsHtml += `</tr>`;
        }

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Расписание - ${teacherName}</title>
        <style>
            @page{size:landscape;margin:6mm 8mm}body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:0;box-sizing:border-box}
            .header{text-align:center;margin-bottom:12px}h1{margin:0 0 6px;color:#2e7d32;font-size:24px;font-weight:700}
            .btn-print{background:#2e7d32;color:#fff;border:none;padding:8px 24px;cursor:pointer;border-radius:6px;font-size:14px;font-weight:700}
            table{width:100%;border-collapse:collapse;text-align:center;table-layout:fixed;background:#fff;margin:0 auto}
            th,td{border:1px solid #000;vertical-align:middle;word-wrap:break-word}th{background:#f0f0f0;font-weight:700;-webkit-print-color-adjust:exact}
            body.density-spacious{padding:15px}body.density-spacious h1{font-size:26px}body.density-spacious th{padding:10px 5px;font-size:15px}body.density-spacious td{padding:14px 6px}body.density-spacious .class-name{font-size:22px}body.density-spacious .subject-name{font-size:15px}body.density-spacious .cabinet-name{font-size:12px}body.density-spacious .cell-time{font-size:15px}body.density-spacious .col-num{width:45px}body.density-spacious .col-time{width:110px}
            body.density-comfortable{padding:10px}body.density-comfortable h1{font-size:22px}body.density-comfortable th{padding:6px 4px;font-size:13px}body.density-comfortable td{padding:7px 4px}body.density-comfortable .class-name{font-size:17px}body.density-comfortable .subject-name{font-size:13px}body.density-comfortable .cabinet-name{font-size:11px}body.density-comfortable .cell-time{font-size:13px}body.density-comfortable .col-num{width:40px}body.density-comfortable .col-time{width:100px}
            body.density-compact{padding:5px}body.density-compact h1{font-size:18px}body.density-compact th{padding:4px;font-size:12px}body.density-compact td{padding:3px 4px}body.density-compact .class-name{font-size:14px}body.density-compact .subject-name{font-size:11px}body.density-compact .cabinet-name{font-size:10px}body.density-compact .cell-time{font-size:12px}body.density-compact .col-num{width:35px}body.density-compact .col-time{width:90px}
            .text-small .class-name{font-size:11px!important;line-height:1.1!important}.text-small .subject-name{font-size:10px!important;line-height:1.1!important}
            .text-micro .class-name{font-size:9.5px!important;line-height:1.05!important}.text-micro .subject-name{font-size:9px!important;line-height:1.05!important}
            .lesson-wrapper{display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;width:100%}
            .subject-name{font-weight:400;color:#444;line-height:1.15;word-break:break-word}
            .class-row{position:relative;display:flex;align-items:center;justify-content:center;width:100%;box-sizing:border-box}
            .class-name{font-weight:700;color:#000;line-height:1.15;word-break:break-word;text-align:center}
            .cabinet-name{position:absolute;right:0;top:50%;transform:translateY(-50%);font-weight:700;color:#333;border:1px solid #ccc;padding:0 3px;border-radius:3px;background:#f9f9f9;white-space:nowrap;-webkit-print-color-adjust:exact}
            .lesson-separator{border-top:1px dashed #ccc;margin:3px 0;width:100%}.cell-time{font-weight:700;white-space:nowrap}
            @media print{.btn-print,h1{display:none!important}.header{margin-bottom:8px!important}.header::after{content:"📅 Расписание: " attr(data-teacher);font-size:20px;font-weight:700;display:block;text-align:center}}
        </style></head><body class="${densityClass}">
            <div class="header" data-teacher="${teacherName}"><h1>📅 Расписание: ${teacherName}</h1><button class="btn-print" onclick="window.print()">🖨️ Напечатать</button></div>
            <table><thead><tr><th class="col-num">№</th><th class="col-time">Время</th>${daysToShow.map(d => `<th>${dayNames[d]}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>
        </body></html>`;

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); } 
        else alert('Браузер заблокировал всплывающее окно. Разрешите их в настройках.');
    }

    let isScheduled = false;
    new MutationObserver(() => {
        if (isScheduled) return;
        isScheduled = true;
        window.requestAnimationFrame(() => {
            if (location.href.includes('schedule')) injectPrintButton();
            else document.getElementById('mesh-print-schedule-btn')?.remove();
            isScheduled = false;
        });
    }).observe(document.body, { childList: true, subtree: true });
})();