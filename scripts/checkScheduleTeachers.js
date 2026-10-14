// scripts/checkScheduleTeachers.js

window.initCheckScheduleTeachers = function () {
    const TARGET_PATH = '/teacher/study-process/journal/my';
    const NDO_KEYS = ['ндо', 'на дому', 'индив'];
    const TIMEOUT_MS = 5000;
    const BTN_TEACHERS_ID = 'mesh-check-schedule-teachers-btn';
    const BTN_CLASSES_ID = 'mesh-check-schedule-classes-btn';
    const MODAL_ID = 'mshhlpr-schedule-modal';
    const DAYS_RU = ["", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
    const DEFAULT_BELLS = window.MESH_DEFAULT_BELLS || `1 урок 08:30-09:10\n2 урок 09:20-10:00\n3 урок 10:10-10:50\n4 урок 11:05-11:45\n5 урок 12:00-12:40\n6 урок 13:00-13:40\n7 урок 14:00-14:40\n8 урок 14:55-15:35\n9 урок 15:50-16:30\n10 урок 16:40-17:20\n11 урок 17:30-18:10\n12 урок 18:20-19:00`;

    // --- УТИЛИТЫ ---
    const pad = n => String(n).padStart(2, '0');
    const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fmtRu = d => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    const timeToM = s => { if (!s) return null; const [h, m] = s.replace('.', ':').split(':').map(Number); return isNaN(h) || isNaN(m) ? null : h * 60 + m; };

    const parseDateObj = raw => {
        if (!raw) return new Date();
        if (Array.isArray(raw) && raw.length >= 3) return new Date(raw[0], raw[1] - 1, raw[2]);
        if (typeof raw === 'string') {
            const p = raw.split(/[-,\/]/).map(Number);
            if (p.length === 3 && p[0] > 1900) return new Date(p[0], p[1] - 1, p[2]);
        }
        return new Date(raw);
    };

    const cleanRoom = s => {
        if (!s) return '—';
        const str = String(s).replace(/^(каб\.?|кабинет)\s*/i, '').trim();
        const m = str.match(/^(\d+[\wа-яА-ЯёЁ-]*)\b/);
        return m ? m[1] : str;
    };

    const formatFioShort = fio => {
        if (!fio || fio === '—') return '—';
        const p = fio.trim().split(/\s+/);
        return p.length === 1 ? p[0] : `${p[0]} ${p[1] ? p[1][0] + '.' : ''}${p[2] ? p[2][0] + '.' : ''}`.trim();
    };

    const extractClass = (raw, teacher, isNdo) => {
        if (!raw || isNdo) return raw || '—';
        const tParts = (teacher || '').toLowerCase().split(/\s+/).filter(p => p.length > 2);
        const clean = String(raw).split(/\s+/).filter(w => !/^[а-яёa-z]\.([а-яёa-z]\.?)?$/i.test(w) && !tParts.some(p => w.toLowerCase().replace(/[^a-zа-яё0-9-]/g, '').includes(p)));
        const idx = clean.findIndex(w => /^\d/.test(w));
        return idx !== -1 ? clean[idx].replace(/[.,;:)]+$/, '') : raw;
    };

    const getWeekRange = (baseDate = new Date()) => {
        const d = new Date(baseDate), dNum = d.getDay() || 7;
        const mon = new Date(d); mon.setDate(d.getDate() - (dNum - 1));
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        return { from: fmtDate(mon), to: fmtDate(sun), label: `${fmtRu(mon)} — ${fmtRu(sun)}` };
    };

    function resolveCurrentAid(fallbackAid) {
        if (fallbackAid) return String(fallbackAid);
        const paramAid = new URLSearchParams(location.search).get('academic_year_id');
        if (paramAid) return String(paramAid);
        try {
            const res = performance.getEntriesByType('resource');
            for (let i = res.length - 1; i >= 0; i--) {
                const m = res[i].name.match(/[?&]academic_year_id=(\d+)/);
                if (m) return String(m[1]);
            }
        } catch {}
        return "14";
    }

    // --- RAM КЭШ ---
    const state = {
        token: null, profileId: "", schoolId: null, aid: "14",
        teachers: [], classes: [], rooms: [], buildings: [], parsedBells: [],
        bldMap: new Map(), roomMap: new Map(), roomBldMap: new Map(), groupCache: new Map(),
        selectedWeek: null, calMonth: new Date(), isLoaded: false, isLoading: false
    };

    const viewOpts = { shortClasses: false, hideNdo: false, showBuilding: false };

    async function ensureAuth() {
        if (state.token && state.profileId && state.schoolId) return true;
        const s = await chrome.storage.session.get(['currentBearerToken', 'currentProfileId', 'currentAid']);
        if (!s.currentBearerToken) return false;

        state.token = s.currentBearerToken;
        state.profileId = s.currentProfileId || "";
        state.aid = resolveCurrentAid(s.currentAid);

        try {
            const ctrl = new AbortController(), tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
            const r = await fetch("https://authedu.mosreg.ru/api/ej/acl/v1/sessions", {
                method: "POST", signal: ctrl.signal,
                headers: { "accept": "application/json", "content-type": "application/json", "authorization": `Bearer ${state.token}`, "x-mes-subsystem": "teacherweb", "x-mes-hostid": "9", "x-mes-roleid": "9" },
                body: JSON.stringify({ auth_token: state.token })
            });
            clearTimeout(tid);

            if (r.ok) {
                const d = await r.json();
                const t = d.profiles?.find(p => p.type === 'teacher' || p.profile_type === 'teacher') || d.profiles?.[0];
                state.schoolId = t?.school_id || t?.organization_id || d.school_id || null;
                if (!state.profileId) state.profileId = t?.id || "";
            }
        } catch { return false; }
        return true;
    }

    async function apiGet(url, sub = 'journalw') {
        if (!(await ensureAuth())) return null;
        const ctrl = new AbortController(), tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        try {
            const r = await fetch(url, {
                method: 'GET', signal: ctrl.signal,
                headers: { "authorization": `Bearer ${state.token}`, "profile-id": String(state.profileId), "x-mes-subsystem": sub, "x-mes-hostid": "9", "x-mes-roleid": "9", "aid": state.aid, "accept": "application/json" }
            });
            return r.ok ? await r.json() : null;
        } catch { return null; } finally { clearTimeout(tid); }
    }

    // --- КЭШ СПРАВОЧНИКОВ ШКОЛЫ ---
    async function preloadSchoolCatalogs() {
        if (state.isLoaded) return true;
        if (state.isLoading) {
            while (state.isLoading) await new Promise(r => setTimeout(r, 100));
            return state.isLoaded;
        }

        state.isLoading = true;
        await ensureAuth();

        try {
            const bStore = await new Promise(r => chrome.storage.local.get(['activeTeacher', 'profiles', 'globalBellSchedule'], r));
            const act = bStore?.activeTeacher;
            const bText = (act && bStore?.profiles?.[act]?.bellSchedule) || bStore?.globalBellSchedule || DEFAULT_BELLS;
            state.parsedBells = bText.split('\n').map((l, i) => {
                const m = l.match(/(?:(\d+)\s*урок\s*)?(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/i);
                return m ? { num: m[1] ? +m[1] : (i + 1), start: timeToM(m[2]), end: timeToM(m[3]), timeStr: `${m[2].replace('.', ':')}-${m[3].replace('.', ':')}` } : null;
            }).filter(b => b && b.start !== null).sort((a, b) => a.start - b.start);

            const schoolQuery = state.schoolId ? `&school_id=${state.schoolId}` : '';

            // Загрузка кабинетов, корпусов и классов
            const [rList, bList, cList] = await Promise.all([
                apiGet(`https://authedu.mosreg.ru/api/ej/core/teacher/v1/rooms?per_page=300${schoolQuery}`, 'teacherweb'),
                apiGet(`https://authedu.mosreg.ru/api/ej/core/teacher/v1/buildings?per_page=100${schoolQuery}`, 'teacherweb'),
                apiGet(`https://authedu.mosreg.ru/api/ej/core/teacher/v1/class_units?per_page=300${schoolQuery}`, 'teacherweb')
            ]);

            state.rooms = Array.isArray(rList) ? rList : (rList?.rooms || []);
            state.buildings = Array.isArray(bList) ? bList : (bList?.buildings || []);
            state.bldMap.clear(); state.buildings.forEach(b => state.bldMap.set(b.id, b.name));
            state.roomMap.clear(); state.roomBldMap.clear();
            state.rooms.forEach(r => {
                state.roomMap.set(r.id, r.name);
                if (r.building_id && state.bldMap.has(r.building_id)) state.roomBldMap.set(r.id, state.bldMap.get(r.building_id));
            });

            // Обработка классов с естественной сортировкой (1-1, 1-2, ..., 7-4, ..., 11-1)
            const rawClasses = Array.isArray(cList) ? cList : (cList?.class_units || cList?.data || []);
            state.classes = rawClasses.map(c => ({
                id: c.id,
                name: c.name || `Класс #${c.id}`,
                buildingName: state.bldMap.get(c.building_id) || null
            })).sort((a, b) => {
                const numA = parseInt(a.name, 10) || 0, numB = parseInt(b.name, 10) || 0;
                return numA !== numB ? numA - numB : a.name.localeCompare(b.name, undefined, { numeric: true });
            });

            // Постраничная загрузка учителей
            let teachers = [], page = 1;
            while (page <= 10) {
                const res = await apiGet(`https://authedu.mosreg.ru/api/ej/core/teacher/v1/teacher_profiles?per_page=100&page=${page}${schoolQuery}`, 'teacherweb');
                const list = Array.isArray(res) ? res : (res?.teacher_profiles || res?.data || []);
                if (!list.length) break;
                teachers.push(...list);
                if (list.length < 100) break;
                page++;
            }

            state.teachers = teachers.map(t => {
                const u = t.user || t.person || t;
                const fio = `${u.last_name || ''} ${u.first_name || ''} ${u.middle_name || ''}`.trim() || `Учитель #${t.id}`;
                const bld = (t.buildings?.[0]?.name) || state.bldMap.get(t.building_ids?.[0] || t.building_id) || state.roomBldMap.get(t.room_id) || null;
                return { id: t.id, fio, buildingName: bld };
            }).filter(t => t.fio.length > 2).sort((a, b) => a.fio.localeCompare(b.fio));

            state.isLoaded = true;
        } finally {
            state.isLoading = false;
        }
        return true;
    }

    async function resolveGroups(gIds) {
        const miss = gIds.filter(id => id && !state.groupCache.has(id));
        for (let i = 0; i < miss.length; i += 50) {
            const data = await apiGet(`https://authedu.mosreg.ru/api/ej/plan/teacher/v1/groups?group_ids=${miss.slice(i, i + 50).join(',')}&academic_year_id=${state.aid}&per_page=100`);
            (Array.isArray(data) ? data : (data?.groups || [])).forEach(g => {
                state.groupCache.set(g.id, { fullName: (g.name || g.class_unit_name || `Группа ${g.id}`).trim(), subjectName: g.subject_name || '—' });
            });
        }
    }

    const isNdo = it => {
        const name = `${state.groupCache.get(it.group_id)?.fullName || it.group_name || ''} ${state.roomMap.get(it.room_id) || ''}`.toLowerCase();
        return NDO_KEYS.some(k => name.includes(k));
    };

    function assignSlots(lessons) {
        const getMins = it => (Array.isArray(it.time) && it.time.length >= 2) ? it.time[0] * 60 + it.time[1] : null;
        const findBell = (m, tol) => {
            if (m === null || !state.parsedBells.length) return null;
            return state.parsedBells.reduce((acc, b) => {
                const diff = Math.abs(b.start - m);
                return (diff <= tol && (!acc || diff < acc.diff)) ? { b, diff } : acc;
            }, null)?.b;
        };

        const reg = [], ndo = [], map = new Map(), regTimes = [];
        lessons.forEach(l => (isNdo(l) ? ndo : reg).push(l));

        reg.forEach(l => {
            const m = getMins(l), bell = findBell(m, 25);
            const slot = { slotNum: bell ? bell.num : (l.lesson_number || 1), timeStr: bell?.timeStr || (m ? `${pad(Math.floor(m/60))}:${pad(m%60)}` : '—') };
            map.set(l, slot);
            if (m !== null) regTimes.push({ mins: m, ...slot });
        });

        ndo.forEach(l => {
            const m = getMins(l);
            let slot = null;
            if (m !== null && regTimes.length) {
                const near = regTimes.reduce((acc, r) => {
                    const diff = Math.abs(r.mins - m);
                    return (diff <= 20 && (!acc || diff < acc.diff)) ? { r, diff } : acc;
                }, null)?.r;
                if (near) slot = { slotNum: near.slotNum, timeStr: near.timeStr };
            }
            if (!slot && m !== null) {
                const bell = findBell(m, 30);
                if (bell) slot = { slotNum: bell.num, timeStr: bell.timeStr };
            }
            map.set(l, slot || { slotNum: l.lesson_number || 1, timeStr: m ? `${pad(Math.floor(m/60))}:${pad(m%60)}` : '—' });
        });

        return map;
    }

    // Универсальные данные карточки для Учителя и Класса
    function getCardData(l, mode, curEntityName) {
        const meta = state.groupCache.get(l.group_id) || {};
        const fullGroup = meta.fullName || l.group?.name || l.group_name || `Группа ${l.group_id}`;
        const ndoFlag = isNdo(l);
        const rName = cleanRoom(state.roomMap.get(l.room_id) || l.room_id || l.room_name);
        const bld = state.roomBldMap.get(l.room_id) || l.building_name;
        const subName = meta.subjectName || l.subject_name || '—';

        if (mode === 'classes') {
            const teacherShort = formatFioShort(l.teacher_name);
            return {
                title: subName,
                subtitle: teacherShort !== '—' ? `👤 ${teacherShort}` : '',
                rName, bld, ndoFlag
            };
        } else {
            const classTitle = viewOpts.shortClasses ? extractClass(fullGroup, curEntityName, ndoFlag) : fullGroup;
            return {
                title: classTitle,
                subtitle: subName,
                rName, bld, ndoFlag
            };
        }
    }

    // --- КАЛЕНДАРЬ НЕДЕЛИ ---
    function toggleCalendar(wrapper, onSelect) {
        const old = wrapper.querySelector('#msh-np-cal-pop');
        if (old) return old.remove();

        const pop = document.createElement('div');
        pop.id = 'msh-np-cal-pop';
        pop.style.cssText = 'position:absolute;top:calc(100% + 6px);left:0;z-index:100000;background:#fff;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.2);border:1px solid #cbd5e1;padding:12px;width:280px;box-sizing:border-box;font-family:inherit;';

        const render = () => {
            const y = state.calMonth.getFullYear(), m = state.calMonth.getMonth();
            const mNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
            const start = new Date(y, m, 1);
            start.setDate(1 - ((start.getDay() || 7) - 1));

            let rows = '', cur = new Date(start);
            for (let w = 0; w < 6; w++) {
                const wStart = new Date(cur), wEnd = new Date(cur);
                wEnd.setDate(cur.getDate() + 6);
                const isSel = fmtDate(wStart) === state.selectedWeek.from;

                let days = '';
                for (let d = 0; d < 7; d++) {
                    days += `<td style="text-align:center;padding:6px 0;font-size:11.5px;color:${cur.getMonth() === m ? '#1e293b' : '#94a3b8'};user-select:none;">${cur.getDate()}</td>`;
                    cur.setDate(cur.getDate() + 1);
                }
                rows += `<tr class="msh-np-cal-r ${isSel ? 'sel' : ''}" data-f="${fmtDate(wStart)}" data-t="${fmtDate(wEnd)}">${days}</tr>`;
                if (cur.getMonth() !== m && w >= 3) break;
            }

            pop.innerHTML = `
                <style>
                    .msh-cal-t{table-layout:fixed;width:100%;border-collapse:collapse;}
                    .msh-np-cal-r{cursor:pointer;border-radius:4px;}
                    .msh-np-cal-r:hover td{background:#e0f2fe!important;color:#0284c7!important;}
                    .msh-np-cal-r.sel td{background:#dcfce7!important;color:#15803d!important;font-weight:bold;}
                </style>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <button id="msh-c-prev" style="background:none;border:none;cursor:pointer;font-weight:bold;color:#475569;padding:2px 6px;">◀</button>
                    <span style="font-weight:700;font-size:13px;color:#1e293b;">${mNames[m]} ${y}</span>
                    <button id="msh-c-next" style="background:none;border:none;cursor:pointer;font-weight:bold;color:#475569;padding:2px 6px;">▶</button>
                </div>
                <table class="msh-cal-t"><thead><tr style="color:#64748b;font-size:10px;font-weight:700;"><th style="padding:4px 0;">Пн</th><th style="padding:4px 0;">Вт</th><th style="padding:4px 0;">Ср</th><th style="padding:4px 0;">Чт</th><th style="padding:4px 0;">Пт</th><th style="padding:4px 0;">Сб</th><th style="padding:4px 0;">Вс</th></tr></thead><tbody>${rows}</tbody></table>
                <button id="msh-c-today" style="width:100%;margin-top:8px;padding:6px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;font-size:11px;font-weight:700;color:#334155;cursor:pointer;">📅 Выбрать текущую неделю</button>
            `;

            pop.querySelector('#msh-c-prev').onclick = e => { e.stopPropagation(); state.calMonth.setMonth(m - 1); render(); };
            pop.querySelector('#msh-c-next').onclick = e => { e.stopPropagation(); state.calMonth.setMonth(m + 1); render(); };
            pop.querySelector('#msh-c-today').onclick = e => { e.stopPropagation(); state.selectedWeek = getWeekRange(); pop.remove(); onSelect(state.selectedWeek); };
            pop.querySelectorAll('.msh-np-cal-r').forEach(r => r.onclick = e => {
                e.stopPropagation();
                state.selectedWeek = { from: r.dataset.f, to: r.dataset.t, label: `${fmtRu(parseDateObj(r.dataset.f))} — ${fmtRu(parseDateObj(r.dataset.t))}` };
                pop.remove(); onSelect(state.selectedWeek);
            });
        };

        render();
        wrapper.appendChild(pop);
        const onDoc = e => { if (!wrapper.contains(e.target)) { pop.remove(); document.removeEventListener('click', onDoc); } };
        setTimeout(() => document.addEventListener('click', onDoc), 50);
    }

    // --- МОДАЛЬНОЕ ОКНО ---
    function openModal(mode = 'teachers') {
        document.getElementById(MODAL_ID)?.remove();
        state.selectedWeek = getWeekRange();
        state.calMonth = new Date(parseDateObj(state.selectedWeek.from));

        const isClasses = (mode === 'classes');
        const modalTitle = isClasses ? '📅 Расписание классов школы' : '📅 Расписание учителей школы';

        const ov = document.createElement('div');
        ov.id = MODAL_ID; ov.className = 'mshhlpr-modal-overlay';
        ov.innerHTML = `
            <div class="mshhlpr-modal-content" style="width:1300px;max-width:98vw;height:92vh;display:flex;flex-direction:column;overflow:hidden;">
                <div class="mshhlpr-modal-header" style="padding:12px 20px;background:${isClasses ? 'var(--mshhlpr-primary-gradient)' : 'linear-gradient(135deg,#0284c7,#0369a1)'}!important;">
                    <span style="font-size:15px;">${modalTitle}</span>
                    <button class="mshhlpr-modal-close">×</button>
                </div>
                <div id="msh-np-body" style="flex:1;overflow-y:auto;padding:16px 20px;background:#fff;">
                    <div style="display:flex;justify-content:center;align-items:center;height:200px;color:#2e7d32;font-weight:600;gap:10px;">
                        <div class="mshhlpr-loader-icon">⏳</div><span>Загрузка каталогов школы...</span>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(ov);

        const close = () => ov.remove();
        ov.querySelector('.mshhlpr-modal-close').onclick = close;
        ov.onclick = e => e.target === ov && close();

        preloadSchoolCatalogs().then(() => renderScheduleView(ov.querySelector('#msh-np-body'), mode));
    }

    // --- СЕТКА РАСПИСАНИЯ И ПЕЧАТЬ ---
    function renderScheduleView(container, mode = 'teachers') {
        const isClasses = (mode === 'classes');

        const toggleHtml = (id, txt, chk) => `
            <div class="mshhlpr-universal-toggle-btn mshhlpr-compact-toggle msh-np-tgl" data-t="${id}" style="cursor:pointer!important;user-select:none!important;transform:none!important;">
                <span class="mshhlpr-universal-toggle-text" style="font-size:11px!important;pointer-events:none;">${txt}</span>
                <div class="mshhlpr-ios-switch mshhlpr-compact-switch" style="pointer-events:none;">
                    <input type="checkbox" id="${id}" ${chk ? 'checked' : ''} style="pointer-events:none;">
                    <span class="mshhlpr-ios-slider" style="pointer-events:none;"></span>
                </div>
            </div>`;

        // УМНЫЙ СПИСОК КОРПУСОВ: считаем, где есть сущности
        const counts = {};
        const entityList = isClasses ? state.classes : state.teachers;
        entityList.forEach(e => {
            if (e.buildingName) counts[e.buildingName] = (counts[e.buildingName] || 0) + 1;
        });

        const validB = [], emptyB = [];
        state.buildings.forEach(b => {
            const cnt = counts[b.name] || 0;
            (cnt > 0 ? validB : emptyB).push({ name: b.name, cnt });
        });

        const sortBld = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });
        validB.sort(sortBld);
        emptyB.sort(sortBld);

        const bldOpts = `<option value="all">Все корпуса</option>` +
            validB.map(b => `<option value="${b.name}">${b.name} (${b.cnt})</option>`).join('') +
            emptyB.map(b => `<option value="${b.name}" disabled style="color:#94a3b8;background:#f8fafc;">${b.name} (0)</option>`).join('');

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div style="display:flex;gap:8px;align-items:center;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;flex-wrap:wrap;">
                    <div style="display:flex;gap:6px;flex:1;min-width:420px;flex-wrap:wrap;">
                        <input type="text" id="msh-s-inp" placeholder="${isClasses ? '🔎 Класс (напр. 7-4)...' : '🔎 Поиск учителя...'}" class="mshhlpr-input" style="width:150px;height:32px;">
                        <select id="msh-b-sel" class="mshhlpr-select" style="width:160px;height:32px;font-weight:600;">${bldOpts}</select>
                        <select id="msh-target-sel" class="mshhlpr-select" style="flex:1;min-width:200px;height:32px;font-weight:600;"></select>
                    </div>
                    <div style="position:relative;display:inline-block;" id="msh-w-box">
                        <button id="msh-w-btn" class="mshhlpr-universal-toggle-btn mshhlpr-compact-toggle" style="background:#fff!important;border:1px solid #cbd5e1!important;color:#1e293b!important;height:32px;padding:0 10px;cursor:pointer;transform:none!important;">
                            <span class="mshhlpr-universal-toggle-text" id="msh-w-txt" style="color:#1e293b!important;">📅 ${state.selectedWeek.label}</span>
                        </button>
                    </div>
                    <button id="msh-run-btn" class="mshhlpr-universal-toggle-btn" style="height:32px;padding:0 16px;transform:none!important;background:${isClasses ? 'var(--mshhlpr-primary-gradient)' : 'linear-gradient(135deg,#0284c7,#0369a1)'}!important;"><span class="mshhlpr-universal-toggle-text">Показать</span></button>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:0 2px;">
                    ${!isClasses ? toggleHtml('tgl-short', 'Сократить классы', viewOpts.shortClasses) : ''}
                    ${!isClasses ? toggleHtml('tgl-ndo', 'Скрыть НДО', viewOpts.hideNdo) : ''}
                    ${toggleHtml('tgl-bld', 'Показывать корпус', viewOpts.showBuilding)}
                </div>
                <div id="msh-res-div"><div style="text-align:center;color:#94a3b8;padding:40px;font-size:13px;">Выберите ${isClasses ? 'класс' : 'преподавателя'} и нажмите «Показать».</div></div>
            </div>`;

        const $ = s => container.querySelector(s);
        const [sInp, bSel, tSel, wBox, wBtn, wTxt, runBtn, resDiv] = [$('#msh-s-inp'), $('#msh-b-sel'), $('#msh-target-sel'), $('#msh-w-box'), $('#msh-w-btn'), $('#msh-w-txt'), $('#msh-run-btn'), $('#msh-res-div')];

        const updateOptions = () => {
            const q = sInp.value.trim().toLowerCase(), b = bSel.value;
            if (isClasses) {
                const filtered = state.classes.filter(c => c.name.toLowerCase().includes(q) && (b === 'all' || c.buildingName === b));
                tSel.innerHTML = `<option value="">-- Классов: ${filtered.length} --</option>` + filtered.map(c => `<option value="${c.id}">${c.name}${c.buildingName ? ` — [${c.buildingName}]` : ''}</option>`).join('');
            } else {
                const filtered = state.teachers.filter(t => t.fio.toLowerCase().includes(q) && (b === 'all' || t.buildingName === b));
                tSel.innerHTML = `<option value="">-- Учителей: ${filtered.length} --</option>` + filtered.map(t => `<option value="${t.id}">${t.fio}${t.buildingName ? ` — [${t.buildingName}]` : ''}</option>`).join('');
            }
            if (tSel.options.length > 1) tSel.selectedIndex = 1;
        };

        sInp.oninput = updateOptions;
        bSel.onchange = updateOptions;
        updateOptions();

        wBtn.onclick = e => { e.stopPropagation(); toggleCalendar(wBox, sel => { wTxt.textContent = `📅 ${sel.label}`; }); };

        let currLessons = [], currEntityName = "";

        // ПЕЧАТЬ СЕТКИ
        const openPrintView = (sortedSlots, grid, showDays, slotTimes) => {
            const maxNum = sortedSlots.length ? Math.max(...sortedSlots) : 0;
            const density = (maxNum <= 6) ? "density-spacious" : (maxNum >= 9 ? "density-compact" : "density-comfortable");

            const printRows = sortedSlots.map(sNum => {
                const tStr = slotTimes.get(sNum) || state.parsedBells.find(b => b.num === sNum)?.timeStr || '—';
                const cells = showDays.map(dNum => {
                    const lList = grid[sNum]?.[dNum] || [];
                    if (!lList.length) return `<td class="cell-empty"></td>`;

                    const cards = lList.map(l => {
                        const card = getCardData(l, mode, currEntityName);
                        return `
                            <div class="lesson-wrapper">
                                <div class="class-box">
                                    <span class="cabinet-name">каб. ${card.rName}</span>
                                    <span class="class-name">${card.title}</span>
                                </div>
                                <div class="subject-name">${card.subtitle}</div>
                                ${viewOpts.showBuilding && card.bld ? `<div class="building-name">🏢 ${card.bld}</div>` : ''}
                            </div>
                        `;
                    }).join('<div class="lesson-separator"></div>');

                    return `<td class="cell-lesson">${cards}</td>`;
                }).join('');

                return `<tr><td class="col-num">${sNum}</td><td class="col-time">${tStr}</td>${cells}</tr>`;
            }).join('');

            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light">
            <title>Расписание - ${currEntityName}</title>
            <style>
                @page{size:landscape;margin:6mm 8mm}
                body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:0;box-sizing:border-box}
                .header{text-align:center;margin-bottom:12px;padding-top:8px;}
                h1{margin:0 0 6px;color:#2e7d32;font-size:22px;font-weight:700}
                .btn-print{background:#2e7d32;color:#fff;border:none;padding:8px 24px;cursor:pointer;border-radius:6px;font-size:14px;font-weight:700;box-shadow:0 2px 4px rgba(0,0,0,0.15);}
                .btn-print:hover{background:#1b5e20;}
                table{width:100%;border-collapse:collapse;text-align:center;table-layout:fixed;background:#fff;margin:0 auto}
                th,td{border:1px solid #000;vertical-align:middle;word-wrap:break-word;box-sizing:border-box;}
                th{background:#f0f0f0;font-weight:700;-webkit-print-color-adjust:exact;padding:6px 2px;}
                
                body.density-spacious{padding:12px}body.density-spacious td{padding:10px 4px}body.density-spacious .class-name{font-size:14px}
                body.density-comfortable{padding:8px}body.density-comfortable td{padding:6px 3px}body.density-comfortable .class-name{font-size:12.5px}
                body.density-compact{padding:4px}body.density-compact td{padding:4px 2px}body.density-compact .class-name{font-size:11px}

                .lesson-wrapper{display:block;width:100%;box-sizing:border-box;overflow:hidden;text-align:left;}
                .class-box{display:block;width:100%;box-sizing:border-box;}
                .cabinet-name{float:right;margin-left:5px;margin-bottom:2px;font-size:9.5px;font-weight:700;color:#111;border:1px solid #777;padding:1px 3px;border-radius:3px;background:#f0f0f0;white-space:nowrap;-webkit-print-color-adjust:exact;}
                .class-name{font-weight:700;color:#000;line-height:1.2;word-break:break-word;display:inline;}
                .subject-name{clear:both;font-size:10px;color:#444;line-height:1.15;text-align:left;word-break:break-word;margin-top:2px;}
                .building-name{font-size:9px;color:#555;text-align:left;clear:both;}
                .lesson-separator{border-top:1px dashed #bbb;margin:3px 0;width:100%;clear:both;}
                .col-num{width:38px;font-weight:bold;}
                .col-time{width:90px;font-family:monospace;font-size:11px;font-weight:bold;}
                .cell-empty{background:#fafafa;}
                
                @media print{
                    .btn-print, h1{display:none!important;}
                    .header{margin-bottom:6px!important;}
                    .header::after{content:"📅 Расписание: " attr(data-entity);font-size:18px;font-weight:700;display:block;text-align:center;color:#000;}
                }
            </style></head><body class="${density}">
                <div class="header" data-entity="${currEntityName}">
                    <h1>📅 Расписание: ${currEntityName}</h1>
                    <button class="btn-print" onclick="window.print()">🖨️ Напечатать</button>
                </div>
                <table>
                    <thead><tr><th class="col-num">№</th><th class="col-time">Время</th>${showDays.map(d => `<th>${DAYS_RU[d]}</th>`).join('')}</tr></thead>
                    <tbody>${printRows}</tbody>
                </table>
            </body></html>`;

            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);
            const win = window.open(blobUrl, '_blank');
            if (win) setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            else alert('Разрешите всплывающие окна для печати.');
        };

        const renderGrid = () => {
            if (!currLessons.length) return;
            // Для классов НДО не скрываем тумблером (показываем все занятия)
            const visible = currLessons.filter(l => !(!isClasses && viewOpts.hideNdo && isNdo(l)));
            if (!visible.length) {
                resDiv.innerHTML = `<div style="text-align:center;background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:25px;color:#b45309;font-weight:700;">Все занятия скрыты тумблером «Скрыть НДО».</div>`;
                return;
            }

            const slotMap = assignSlots(visible);
            const grid = {}, activeDays = new Set([1, 2, 3, 4, 5]), slotTimes = new Map();

            visible.forEach(l => {
                const dNum = parseDateObj(l.date || l.iso_date || l.lesson?.date).getDay() || 7;
                if (dNum >= 6) activeDays.add(dNum);
                const info = slotMap.get(l) || { slotNum: 1, timeStr: '—' };
                if (!grid[info.slotNum]) grid[info.slotNum] = {};
                if (!grid[info.slotNum][dNum]) grid[info.slotNum][dNum] = [];
                grid[info.slotNum][dNum].push(l);
                if (!slotTimes.has(info.slotNum) && info.timeStr !== '—') slotTimes.set(info.slotNum, info.timeStr);
            });

            const sortedSlots = Object.keys(grid).map(Number).sort((a, b) => a - b);
            const showDays = [1, 2, 3, 4, 5, 6, 7].filter(d => activeDays.has(d));

            const rows = sortedSlots.map(sNum => {
                const tStr = slotTimes.get(sNum) || state.parsedBells.find(b => b.num === sNum)?.timeStr || '—';
                const cells = showDays.map(dNum => {
                    const lList = grid[sNum]?.[dNum] || [];
                    if (!lList.length) return `<td style="border:1px solid #cbd5e1;background:#fafafa;"></td>`;

                    const cards = lList.map(l => {
                        const card = getCardData(l, mode, currEntityName);
                        return `
                            <div style="background:#fff;border:1px solid ${card.ndoFlag ? '#fed7aa' : '#cbd5e1'};border-left:4px solid ${card.ndoFlag ? '#f97316' : (isClasses ? '#0284c7' : '#22c55e')};border-radius:6px;padding:6px 8px;display:block;margin-bottom:4px;box-shadow:0 1px 3px rgba(0,0,0,0.05);text-align:left;">
                                <div style="display:block;width:100%;">
                                    <span style="float:right;margin-left:6px;margin-bottom:2px;font-size:10px;font-weight:700;color:${card.ndoFlag ? '#c2410c' : '#15803d'};background:${card.ndoFlag ? '#ffedd5' : '#dcfce7'};padding:1px 5px;border-radius:3px;white-space:nowrap;">каб. ${card.rName}</span>
                                    <span style="font-weight:800;font-size:13px;color:#1e293b;line-height:1.25;display:inline;word-break:break-word;">${card.title}</span>
                                </div>
                                <div style="clear:both;font-size:11px;color:#64748b;line-height:1.2;margin-top:2px;">${card.subtitle}</div>
                                ${viewOpts.showBuilding ? `<div style="clear:both;font-size:9.5px;color:#475569;background:#f1f5f9;padding:1px 4px;border-radius:3px;width:fit-content;margin-top:2px;">🏢 ${card.bld || 'Корпус не указан'}</div>` : ''}
                            </div>`;
                    }).join('');
                    return `<td style="border:1px solid #cbd5e1;padding:4px;vertical-align:top;background:#fff;">${cards}</td>`;
                }).join('');

                return `<tr><td style="border:1px solid #cbd5e1;text-align:center;font-weight:800;font-size:14px;background:#f8fafc;color:#1e293b;">${sNum}</td><td style="border:1px solid #cbd5e1;text-align:center;font-size:11px;font-family:monospace;font-weight:700;background:#f8fafc;color:#475569;white-space:nowrap;">${tStr}</td>${cells}</tr>`;
            }).join('');

            resDiv.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                    <div><span style="font-weight:800;font-size:15px;color:#1e293b;">📅 Расписание: <span style="color:#2e7d32;">${currEntityName}</span></span><span style="font-size:12px;color:#64748b;margin-left:8px;">(Уроков: <b>${visible.length}</b>)</span></div>
                    <button id="msh-print-btn" class="mshhlpr-universal-toggle-btn" style="height:30px;padding:0 12px;cursor:pointer;transform:none!important;"><span class="mshhlpr-universal-toggle-text">🖨️ Распечатать</span></button>
                </div>
                <div id="msh-grid-scroll" style="overflow-x:auto;background:#fff;border-radius:6px;">
                    <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;">
                        <thead><tr style="background:#f1f5f9;color:#334155;font-size:12.5px;"><th style="border:1px solid #cbd5e1;width:40px;padding:8px 4px;text-align:center;">№</th><th style="border:1px solid #cbd5e1;width:95px;padding:8px 4px;text-align:center;">Время</th>${showDays.map(d => `<th style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:700;">${DAYS_RU[d]}</th>`).join('')}</tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;

            resDiv.querySelector('#msh-print-btn').onclick = () => openPrintView(sortedSlots, grid, showDays, slotTimes);
        };

        const bindTgl = (id, key) => {
            const wrap = container.querySelector(`.msh-np-tgl[data-t="${id}"]`), inp = container.querySelector(`#${id}`);
            if (wrap && inp) wrap.onclick = e => { e.stopPropagation(); inp.checked = !inp.checked; viewOpts[key] = inp.checked; renderGrid(); };
        };
        bindTgl('tgl-short', 'shortClasses');
        bindTgl('tgl-ndo', 'hideNdo');
        bindTgl('tgl-bld', 'showBuilding');

        runBtn.onclick = async () => {
            const selId = tSel.value;
            if (!selId) return alert(isClasses ? 'Выберите класс.' : 'Выберите учителя.');

            if (isClasses) {
                currEntityName = state.classes.find(c => String(c.id) === String(selId))?.name || `Класс #${selId}`;
            } else {
                currEntityName = state.teachers.find(t => String(t.id) === String(selId))?.fio || `Учитель #${selId}`;
            }

            resDiv.innerHTML = `<div style="text-align:center;padding:30px;"><div class="mshhlpr-loader-icon">⏳</div><div>Запрос расписания (таймаут 5 сек): ${currEntityName}...</div></div>`;

            const queryParam = isClasses ? `class_unit_id=${selId}` : `teacher_id=${selId}`;
            const raw = await apiGet(`https://authedu.mosreg.ru/api/ej/plan/teacher/v1/schedule_items?academic_year_id=${state.aid}&${queryParam}&from=${state.selectedWeek.from}&to=${state.selectedWeek.to}&with_lesson_info=true&with_rooms_info=true&page=1&per_page=400&original=true`);
            currLessons = Array.isArray(raw) ? raw : (raw?.schedule_items || []);

            if (!currLessons.length) {
                resDiv.innerHTML = `<div style="text-align:center;background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:25px;color:#b45309;"><div style="font-size:15px;font-weight:700;">Уроков не найдено</div><div style="font-size:12.5px;margin-top:4px;">В базе нет уроков для <b>${currEntityName}</b> на выбранную неделю.</div></div>`;
                return;
            }

            await resolveGroups([...new Set(currLessons.map(l => l.group_id).filter(Boolean))]);
            renderGrid();
        };
    }

    // === ВНЕДРЕНИЕ КНОПОК РЯДОМ ===
    function injectButtons() {
        if (!location.href.includes(TARGET_PATH)) {
            document.getElementById(BTN_TEACHERS_ID)?.remove();
            document.getElementById(BTN_CLASSES_ID)?.remove();
            return;
        }

        const aside = document.querySelector('aside.rUlQ9EWlNWIMbbZh.Et14spNe2tEZiyY3') 
                   || document.querySelector('aside:has(button[data-test-component="schoolButtonChoice"])')
                   || document.querySelector('aside');
        if (!aside) return;

        let tBtn = document.getElementById(BTN_TEACHERS_ID);
        let cBtn = document.getElementById(BTN_CLASSES_ID);

        // 1. Кнопка учителей (синяя)
        if (!tBtn) {
            tBtn = document.createElement('button');
            tBtn.id = BTN_TEACHERS_ID;
            tBtn.type = 'button';
            tBtn.className = 'mshhlpr-universal-toggle-btn mshhlpr-compact-toggle';
            tBtn.style.cssText = 'background:linear-gradient(135deg,#0284c7,#0369a1)!important;margin-right:6px!important;flex-shrink:0!important;cursor:pointer!important;';
            tBtn.innerHTML = `<span class="mshhlpr-universal-toggle-text" style="color:#fff!important;">📅 Расписание учителей</span>`;
            tBtn.onclick = e => { e.preventDefault(); e.stopPropagation(); openModal('teachers'); };

            const exportBtn = document.getElementById('mesh-export-pupils-btn');
            if (exportBtn && exportBtn.parentElement === aside) {
                exportBtn.after(tBtn);
            } else {
                aside.prepend(tBtn);
            }
        }

        // 2. Кнопка классов (фирменная зелёная, сразу после учителей)
        if (!cBtn) {
            cBtn = document.createElement('button');
            cBtn.id = BTN_CLASSES_ID;
            cBtn.type = 'button';
            cBtn.className = 'mshhlpr-universal-toggle-btn mshhlpr-compact-toggle';
            cBtn.style.cssText = 'background:var(--mshhlpr-primary-gradient)!important;margin-right:6px!important;flex-shrink:0!important;cursor:pointer!important;';
            cBtn.innerHTML = `<span class="mshhlpr-universal-toggle-text" style="color:#fff!important;">📅 Расписание классов</span>`;
            cBtn.onclick = e => { e.preventDefault(); e.stopPropagation(); openModal('classes'); };

            tBtn.after(cBtn);
        }
    }

    let scheduled = false;
    new MutationObserver(() => {
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(() => { injectButtons(); scheduled = false; });
        }
    }).observe(document.body, { childList: true, subtree: true });

    injectButtons();
};