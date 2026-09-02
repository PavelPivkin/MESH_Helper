// scripts/schedulePDF.js

(() => {
    const NDO_KEYS = ['ндо', 'на дому', 'индив'];
    const SEL = {
        day: '.nkAfYFPTIKgFNq2L',
        dayName: '.dILX7N_ZSccOqnJB',
        lesson: '.e6ESIWCvYHQH3lOg',
        group: '.cdISCvPwy4Q2oujR > span:first-child, .As5rq3Q894A706VT',
        time: '.f98PG7hpc0sIR_eP span'
    };

    window.initSchedulePDF = () => {
        if (location.href.includes('schedule')) injectPrintButton();

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
    };

    function injectPrintButton() {
        if (document.getElementById('mesh-print-schedule-btn')) return;
        const aside = document.querySelector('aside.rUlQ9EWlNWIMbbZh.Et14spNe2tEZiyY3');
        if (!aside) return;

        const btn = document.createElement('button');
        btn.id = 'mesh-print-schedule-btn';
        btn.className = 'mshhlpr-universal-toggle-btn mshhlpr-compact-toggle';
        btn.style.cssText = 'margin-right: 6px !important;';
        btn.innerHTML = `<span class="mshhlpr-universal-toggle-text">🖨️ Печать расписания этой недели</span>`;
        btn.onclick = (e) => { e.preventDefault(); openPrintChoiceModal(); };
        aside.prepend(btn);
    }

    function openPrintChoiceModal() {
        document.querySelectorAll('.mshhlpr-modal-overlay').forEach(el => el.remove());
        const ov = document.createElement('div');
        ov.className = 'mshhlpr-modal-overlay';
        
        const opts = { subject: false, cabinet: false, ndo: false };
        const items = [['subject', 'Название предмета'], ['cabinet', 'Кабинет'], ['ndo', 'Добавить НДО']];

        ov.innerHTML = `
            <div class="mshhlpr-modal-content" style="width:400px;text-align:center;">
                <div class="mshhlpr-modal-header" style="padding:14px 18px;display:flex;justify-content:space-between;">
                    <span>🖨️ Настройка печати расписания</span>
                    <button class="mshhlpr-modal-close" style="cursor:pointer;background:0;border:0;font-size:18px;">&times;</button>
                </div>
                <div class="mshhlpr-modal-body" style="flex-direction:column;padding:18px;gap:12px;">
                    <div style="font-size:13px;color:#666;text-align:left;">Выберите данные для вывода (по умолчанию только класс):</div>
                    <div style="display:flex;flex-direction:column;gap:8px;background:#f5f5f5;padding:12px 16px;border-radius:8px;border:1px solid #e0e0e0;">
                        ${items.map(([k, lbl]) => `
                            <div class="msh-tgl-row" data-key="${k}" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;padding:4px 0;">
                                <span style="font-size:13px;font-weight:600;color:#333;">${lbl}</span>
                                <div style="width:34px;height:18px;background:#ccc;border-radius:10px;position:relative;transition:.25s;">
                                    <div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:.25s;box-shadow:0 1px 2px rgba(0,0,0,.2);"></div>
                                </div>
                            </div>`).join('')}
                    </div>
                    <button id="msh-print-dom" class="mshhlpr-universal-toggle-btn" style="justify-content:center;cursor:pointer;width:100%;height:36px;margin-top:4px;">
                        <span class="mshhlpr-universal-toggle-text">📄 Сформировать расписание</span>
                    </button>
                </div>
            </div>`;

        document.body.appendChild(ov);
        const close = () => ov.remove();
        ov.querySelector('.mshhlpr-modal-close').onclick = close;
        ov.onclick = e => e.target === ov && close();

        // Компактное переключение тумблеров
        ov.querySelectorAll('.msh-tgl-row').forEach(row => {
            const k = row.dataset.key;
            const bar = row.lastElementChild;
            const knob = bar.firstElementChild;
            row.onclick = () => {
                opts[k] = !opts[k];
                bar.style.background = opts[k] ? '#4caf50' : '#ccc';
                knob.style.left = opts[k] ? '18px' : '2px';
            };
        });

        ov.querySelector('#msh-print-dom').onclick = () => {
            close();
            printFromDOM({ showSubject: opts.subject, showCabinet: opts.cabinet, showNdo: opts.ndo });
        };
    }

    const timeToMins = str => {
        const m = (str || '').match(/(\d{1,2})[:.](\d{2})/);
        return m ? (+m[1] * 60 + +m[2]) : 0;
    };

    function parseDOMText(text, teacherName) {
        if (!text) return { subject: '', className: '' };
        const tParts = (teacherName || '').toLowerCase().split(/\s+/).filter(p => p.length > 2);
        const clean = text.split(/\s+/).filter(w => {
            if (/^[а-яёa-z]\.([а-яёa-z]\.?)?$/i.test(w)) return false;
            const wl = w.toLowerCase().replace(/[^a-zа-яё0-9-]/g, '');
            return !tParts.some(p => wl.includes(p) || p.includes(wl));
        });
        const cIdx = clean.findIndex(w => /^\d/.test(w));
        return cIdx !== -1 
            ? { className: clean[cIdx], subject: clean.slice(0, cIdx).join(' ') } 
            : { className: clean.join(' '), subject: '' };
    }

    async function printFromDOM(options) {
        const days = Array.from(document.querySelectorAll(SEL.day));
        if (!days.length) return alert('На странице не найдено расписание.');

        const allTimes = [...new Set(Array.from(document.querySelectorAll(SEL.lesson))
            .map(l => (l.querySelector(SEL.time)?.textContent.trim() || '').replace(/^\d+\.\s*/, ''))
            .filter(t => t.includes('-')))]
            .sort((a, b) => timeToMins(a.split('-')[0]) - timeToMins(b.split('-')[0]));

        let parsedBells = [], activeTeacher = "Учитель";
        try {
            const res = await new Promise(r => chrome.storage.local.get(['activeTeacher', 'profiles', 'globalBellSchedule'], r));
            activeTeacher = res.activeTeacher || "Учитель";
            const bells = res.profiles?.[activeTeacher]?.bellSchedule || res.globalBellSchedule || window.MESH_DEFAULT_BELLS || '';
            bells.split('\n').forEach(line => {
                const m = line.match(/(?:(\d+)\s*урок\s*)?(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/i);
                if (m) {
                    const s = timeToMins(m[2]);
                    if (s) parsedBells.push({ num: m[1] ? parseInt(m[1]) : null, start: s });
                }
            });
        } catch (e) {}

        const dMap = { 'по':1, 'пн':1, 'вт':2, 'ср':3, 'че':4, 'чт':4, 'пя':5, 'пт':5, 'су':6, 'сб':6, 'во':7, 'вс':7 };
        const dayHeaders = document.querySelectorAll('.BGhWmbpXf3A9L1IQ .QN6g3q4k70_f36be, .QN6g3q4k70_f36be');
        const lessons = [];

        days.forEach((day, dayIdx) => {
            const rawH = (dayHeaders[dayIdx]?.textContent || day.querySelector(SEL.dayName)?.textContent || '').trim().toLowerCase();
            const hMatch = rawH.match(/(пн|вт|ср|чт|пт|сб|вс|по|че|пя|су|во)/);
            const dNum = hMatch ? (dMap[hMatch[1]] || (dayIdx + 1)) : (dayIdx + 1);
            if (dNum < 1 || dNum > 7) return;

            day.querySelectorAll(SEL.lesson).forEach(l => {
                const timeStr = (l.querySelector(SEL.time)?.textContent.trim() || '').replace(/^\d+\.\s*/, '');
                const grp = l.querySelector(SEL.group)?.textContent.trim() || '';
                if (!timeStr || !grp) return;

                let cab = '';
                l.querySelectorAll('span, div').forEach(el => {
                    const txt = el.textContent.trim();
                    if (/^(каб\.?\s*\d+|кабинет\s*\d+|\d{3}[а-я]?|спортзал|акт\.?\s*зал|библиотека|мастерская|ндо)/i.test(txt) || (txt.length <= 5 && /^\d+$/.test(txt))) cab = txt;
                });

                const isNdo = NDO_KEYS.some(kw => grp.toLowerCase().includes(kw) || cab.toLowerCase().includes(kw));
                const parsed = isNdo ? { className: grp, subject: '' } : parseDOMText(grp, activeTeacher);
                const sMins = timeToMins(timeStr.split('-')[0]);

                lessons.push({
                    lesson_number: parsedBells.find(b => Math.abs(b.start - sMins) <= 15)?.num || (allTimes.indexOf(timeStr) + 1),
                    day_number: dNum,
                    class_unit_name: parsed.className,
                    group_name: parsed.className,
                    subject_name: parsed.subject,
                    cabinet: isNdo ? '' : cab,
                    time: [Math.floor(sMins / 60), sMins % 60],
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
        [6, 7].forEach(d => { if (filtered.some(l => l.day_number === d)) daysToShow.push(d); });
        
        const dayNames = ["", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
        const grid = {}; 
        let maxNum = 0;

        filtered.forEach(l => {
            maxNum = Math.max(maxNum, l.lesson_number);
            if (!grid[l.lesson_number]) grid[l.lesson_number] = {};
            if (!grid[l.lesson_number][l.day_number]) grid[l.lesson_number][l.day_number] = [];
            grid[l.lesson_number][l.day_number].push(l);
        });

        const density = (maxNum + (showSubject ? 2 : 0) + (filtered.some(l => (l.class_unit_name.length + (l.subject_name || '').length) > 30) ? 2 : 0) <= 5)
            ? "density-spacious" : (maxNum >= 10 ? "density-compact" : "density-comfortable");

        let rowsHtml = '', displayNum = 1;
        for (let i = 1; i <= maxNum; i++) {
            if (!daysToShow.some(d => grid[i]?.[d]?.length)) continue;
            const sample = daysToShow.flatMap(d => grid[i]?.[d] || []).find(l => !l.time_is_ndo) || daysToShow.flatMap(d => grid[i]?.[d] || [])[0];
            
            let timeStr = "";
            if (sample?.time) {
                const end = sample.time[0] * 60 + sample.time[1] + (sample.duration || 40);
                timeStr = `${String(sample.time[0]).padStart(2,'0')}:${String(sample.time[1]).padStart(2,'0')}-${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;
            }

            rowsHtml += `<tr><td>${displayNum++}</td><td class="cell-time">${timeStr}</td>${daysToShow.map(d => {
                const cLs = grid[i]?.[d];
                if (!cLs?.length) return `<td class="cell-empty"></td>`;
                return `<td class="cell-lesson">${cLs.map((l, idx) => {
                    const c = l.class_unit_name || l.group_name || "", s = l.subject_name || "", cab = l.cabinet || "";
                    const fCls = (c.length + s.length) > 40 ? 'text-micro' : ((c.length + s.length) > 20 ? 'text-small' : '');
                    return `${idx > 0 ? '<div class="lesson-separator"></div>' : ''}
                        <div class="lesson-wrapper ${fCls}">
                            ${showSubject && s ? `<div class="subject-name">${s}</div>` : ''}
                            <div class="class-row"><span class="class-name">${c}</span>${showCabinet && cab ? `<span class="cabinet-name">${cab}</span>` : ''}</div>
                        </div>`;
                }).join('')}</td>`;
            }).join('')}</tr>`;
        }

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Расписание - ${teacherName}</title>
        <style>
            @page{size:landscape;margin:6mm 8mm}body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:0;box-sizing:border-box}
            .header{text-align:center;margin-bottom:12px}h1{margin:0 0 6px;color:#2e7d32;font-size:24px;font-weight:700}
            .btn-print{background:#2e7d32;color:#fff;border:none;padding:8px 24px;cursor:pointer;border-radius:6px;font-size:14px;font-weight:700}
            table{width:100%;border-collapse:collapse;text-align:center;table-layout:fixed;background:#fff;margin:0 auto}
            th,td{border:1px solid #000;vertical-align:middle;word-wrap:break-word}th{background:#f0f0f0;font-weight:700;-webkit-print-color-adjust:exact}
            body.density-spacious{padding:15px}body.density-spacious h1{font-size:26px}body.density-spacious th{padding:10px 5px;font-size:15px}body.density-spacious td{padding:14px 6px}body.density-spacious .class-name{font-size:22px}body.density-spacious .subject-name,.density-spacious .cell-time{font-size:15px}body.density-spacious .cabinet-name{font-size:12px}body.density-spacious .col-num{width:45px}body.density-spacious .col-time{width:110px}
            body.density-comfortable{padding:10px}body.density-comfortable h1{font-size:22px}body.density-comfortable th{padding:6px 4px;font-size:13px}body.density-comfortable td{padding:7px 4px}body.density-comfortable .class-name{font-size:17px}body.density-comfortable .subject-name,.density-comfortable .cell-time{font-size:13px}body.density-comfortable .cabinet-name{font-size:11px}body.density-comfortable .col-num{width:40px}body.density-comfortable .col-time{width:100px}
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
        </style></head><body class="${density}">
            <div class="header" data-teacher="${teacherName}"><h1>📅 Расписание: ${teacherName}</h1><button class="btn-print" onclick="window.print()">🖨️ Напечатать</button></div>
            <table><thead><tr><th class="col-num">№</th><th class="col-time">Время</th>${daysToShow.map(d => `<th>${dayNames[d]}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>
        </body></html>`;

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); } 
        else alert('Браузер заблокировал всплывающее окно. Разрешите их в настройках.');
    }
})();