// scripts/selfAnalysis.js

window.initSelfAnalysis = function () {
    const LOG_TAG = '[МЭШ Помогатор][SelfAnalysis]:';
    const BTN_ID = 'mshhlpr-self-analysis-btn';
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    console.log(LOG_TAG, 'Модуль самоанализа запущен.');

    // Конфигурация критериев для автоматической сборки формы
    const CRITERIA_CONFIG = [
        { id: 'k12', label: 'К1.2. Независимая оценка качества', type: 'textarea', h: 42, val: 'Не проводилась в текущем периоде' },
        { id: 'k4',  label: 'К4. Результативность участия в олимпиадах', type: 'textarea', h: 42, val: 'Победители школьных этапов по информатике: 18 человек.' },
        { id: 'k5',  label: 'К5. Оценка функциональной грамотности', type: 'textarea', h: 42, val: 'Оценка функциональной грамотности обучающихся по исследуемым предметам не проводилась.' },
        { id: 'k8',  label: 'К8. Привлечение к изучению предмета (К8)', type: 'textarea', h: 90, val: 'Все классы:\n- развитие навыка выступлений с докладами на индивидуальные темы.\n10-е классы: работа в качестве научного руководителя по индивидуальным проектам.\n9-е классы: подготовка к ОГЭ.\n11-е классы: подготовка к ЕГЭ.' },
        { id: 'k10', label: 'К10. Обобщение опыта (К10)', type: 'textarea', h: 50, val: '28.11.2025 Открытый урок по теме «Персональный компьютер. Основные компоненты и их функции.» в классе 7-7. В результате был создан видеоролик.' },
        { id: 'k11', label: 'К11. Наличие метод. разработок (К11)', type: 'textarea', h: 40, val: 'Отсутствуют' },
        { id: 'k13', label: 'К13. Повышение квалификации (К13)', type: 'textarea', h: 50, val: 'Подготовка к аттестации продолжается. Результаты аттестации РИКУ: 73 балла, повышенный уровень.' },
        { id: 'k14', label: 'К14. Профильное обучение (К14)', type: 'input', h: 0, val: 'В образовательном учреждении отсутствует профильная подготовка по исследуемым предметам обучения.' },
        { id: 'mao1', label: 'К9.1. Организация и проведение мероприятий МАОУ', type: 'textarea', h: 50, val: 'Организация и проведение мероприятий:\nОрганизация и проведение олимпиадных работ школьного и муниципального уровней. Организация и проведение ВПР, РДР.' },
        { id: 'mao2', label: 'К9.2. Обязанности дежурного учителя МАОУ', type: 'textarea', h: 40, val: 'Дежурство на 4 этаже в конце коридора в 1-ю смену в пятницу. Замечаний нет.' },
        { id: 'mao4', label: 'К9.4. Содержание кабинета МАОУ', type: 'input', h: 0, val: 'Кабинет 411, состояние удовлетворительное.' },
        { id: 'oth5', label: 'К10.5. Экспертная деятельность', type: 'textarea', h: 40, val: 'За отчетный период участия в экспертной деятельности не принимал.' },
        { id: 'oth6', label: 'К10.6. Платные образовательные услуги', type: 'textarea', h: 40, val: 'Нет' }
    ];

    async function getAuthSession() {
        const { currentBearerToken, currentProfileId } = await chrome.storage.session.get(['currentBearerToken', 'currentProfileId']);
        if (!currentBearerToken) throw new Error('Сессионный токен не найден. Попробуйте обновить страницу МЭШ.');
        return { token: `Bearer ${currentBearerToken}`, profileId: currentProfileId || '' };
    }

    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            const start = Date.now();
            const timer = setInterval(() => {
                const found = document.querySelector(selector);
                if (found || Date.now() - start > timeout) {
                    clearInterval(timer);
                    resolve(found || null);
                }
            }, 200);
        });
    }

    function injectSelfAnalisButton() {
        if (!location.href.includes('/reports') && !location.href.includes('/analysis')) return;
        if (document.getElementById(BTN_ID)) return;

        const targetContainer = document.querySelector('div[data-test-component="undefined-subHeaderDescription"]') 
                             || document.querySelector('.QB237DvcIUUPxM9b')
                             || document.querySelector('.CB0ScwmpHUQpV1F1');

        if (!targetContainer) return;

        const btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.className = 'mshhlpr-btn mshhlpr-btn-success mshhlpr-btn-animated';
        btn.style.marginRight = '10px';
        btn.innerHTML = `<span class="mshhlpr-universal-toggle-text" style="font-size: 13px !important; white-space: nowrap;">📊 Сформировать самоанализ</span>`;
        btn.onclick = (e) => { e.preventDefault(); openAnalysisModal(); };

        targetContainer.prepend(btn);
    }

    // === ИНТЕРФЕЙС МОДАЛЬНОГО ОКНА ===

    function openAnalysisModal() {
        document.querySelectorAll('.mshhlpr-self-analysis-overlay').forEach(el => el.remove());

        const overlay = document.createElement('div');
        overlay.className = 'mshhlpr-modal-overlay mshhlpr-self-analysis-overlay';
        
        overlay.innerHTML = `
            <div class="mshhlpr-modal-content mshhlpr-modal-analysis">
                <div class="mshhlpr-modal-header">
                    <span>📊 Конструктор самоанализа учителя</span>
                    <button class="mshhlpr-modal-close">×</button>
                </div>
                <div id="mesh-analysis-body" class="mshhlpr-modal-body" style="flex: 1; overflow-y: auto; flex-direction: column;">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #2e7d32; gap: 10px;">
                        <div class="mshhlpr-loader-icon">⏳</div>
                        <div id="mesh-analysis-loader-text" style="font-size: 15px; font-weight: 500;">Подготовка автоматизации...</div>
                    </div>
                </div>
            </div>`;

        document.body.appendChild(overlay);

        const closeAction = () => overlay.remove();
        overlay.querySelector('.mshhlpr-modal-close').onclick = closeAction;
        
        overlay.onclick = (e) => {
            if (e.target === overlay) closeAction();
        };

        runFilteringWorkflow(overlay.querySelector('#mesh-analysis-body'));
    }

    // === СБОР ДАННЫХ И ЗАПРОСЫ К API ===

    async function runFilteringWorkflow(bodyElement) {
        try {
            const updateStatus = txt => { const el = bodyElement.querySelector('#mesh-analysis-loader-text'); if (el) el.textContent = txt; };

            const sessionAuth = await getAuthSession();
            const cleanToken = sessionAuth.token.replace('Bearer ', '').trim();

            updateStatus('Определение ФИО текущего преподавателя...');
            const sessionData = await fetch("https://authedu.mosreg.ru/api/ej/acl/v1/sessions", {
                method: "POST",
                headers: { "profile-id": String(sessionAuth.profileId), "x-mes-subsystem": "teacherweb", "accept": "application/json", "content-type": "application/json" },
                body: JSON.stringify({ auth_token: cleanToken })
            }).then(r => r.json());

            if (!sessionData?.last_name) throw new Error('Не удалось получить данные о сессии.');

            let activeTeacherId = sessionAuth.profileId;
            if (sessionData.profiles?.length) {
                const tProf = sessionData.profiles.find(p => p.type === 'teacher' || p.profile_type === 'teacher');
                activeTeacherId = tProf?.id || sessionData.profiles[0].id || sessionAuth.profileId;
            }

            const lastName = sessionData.last_name;
            const fInitial = sessionData.first_name ? `${sessionData.first_name.charAt(0).toUpperCase()}.` : '';
            const mInitial = sessionData.middle_name ? `${sessionData.middle_name.charAt(0).toUpperCase()}.` : '';
            const genitiveFio = `${declineLastNameToGenitive(lastName)} ${fInitial} ${mInitial}`.trim();

            updateStatus(`Поиск элемента ввода и автозаполнение (${lastName})...`);
            const filterInput = await waitForElement('div[data-test-component="reportSubjectTeacherFilterSelectTeacher"] input');
            if (!filterInput) throw new Error('Не найдено поле ввода учителя на странице.');

            filterInput.focus();
            setNativeInputValue(filterInput, lastName);
            await sleep(500);

            updateStatus('Поиск подсказки с ФИО учителя...');
            const teacherTooltipUl = await waitForElement('div[role="tooltip"] ul', 5000);
            if (!teacherTooltipUl) throw new Error('Всплывающий список с ФИО учителя не открылся.');

            const targetTeacherLi = Array.from(teacherTooltipUl.querySelectorAll('li')).find(li => li.textContent.trim() === `${lastName} ${fInitial} ${mInitial}`.trim());
            if (!targetTeacherLi) throw new Error(`В списке подсказок не найдена запись "${lastName} ${fInitial} ${mInitial}".`);

            mouseClick(targetTeacherLi);
            await sleep(600);

            updateStatus('Открытие выпадающего списка предметов...');
            const subjectSelectDiv = document.querySelector('div[data-test-component="reportSubjectTeacherFilterSelectSubject"]') 
                                  || document.querySelector('div[data-test-component*="reportSubjectTeacherFilterSelect"]:not([data-test-component*="Teacher"])');
            if (!subjectSelectDiv) throw new Error('Не удалось обнаружить селектор выбора предмета.');

            mouseClick(subjectSelectDiv.querySelector('.PHAz0X8vqxsX42Mh') || subjectSelectDiv);

            updateStatus('Сканирование доступных дисциплин...');
            const subjectTooltipUl = await waitForElement('div[role="tooltip"] ul', 5000);
            if (!subjectTooltipUl) throw new Error('Список доступных предметов не открылся.');

            const subjects = Array.from(subjectTooltipUl.querySelectorAll('li')).map(li => ({
                id: (li.getAttribute('data-test-component') || 'none').replace('option-', ''),
                name: li.textContent.trim()
            }));

            if (!subjects.length) throw new Error('Список предметов пуст.');

            const combinedReportsData = [];
            const foundSubjectNames = [];

            for (let i = 0; i < subjects.length; i++) {
                const sub = subjects[i];
                updateStatus(`Загрузка данных по предмету [${i + 1}/${subjects.length}]: "${sub.name}"...`);
                const url = `https://authedu.mosreg.ru/api/ej/report/teacher/v1/teachers_ext/json?academic_year_id=13&teachers_id=${activeTeacherId}&subject_id=${sub.id}`;

                try {
                    const data = await fetchReportWithFallback(url, activeTeacherId, sessionAuth.token);
                    if (Array.isArray(data)) combinedReportsData.push(...data);
                    if (!foundSubjectNames.includes(sub.name)) foundSubjectNames.push(sub.name);
                } catch (err) { console.error(LOG_TAG, `Ошибка запроса для ${sub.name}:`, err); }
                await sleep(200);
            }

            if (!combinedReportsData.length) throw new Error('Не удалось получить данные отчетов ни по одному предмету.');

            renderReportGeneratorPanel(bodyElement, combinedReportsData, genitiveFio, foundSubjectNames);

        } catch (e) {
            console.error(LOG_TAG, 'Ошибка процесса:', e);
            bodyElement.innerHTML = `
                <div style="text-align: center; color: #e74c3c; padding: 20px;">
                    <div style="font-size: 32px; margin-bottom: 10px;">❌ Ошибка процесса</div>
                    <div style="font-size: 14px; line-height: 1.5; font-family: monospace; background: #fdf2f2; padding: 10px; border-radius: 6px; text-align: left; margin-bottom: 15px;">${e.message}</div>
                    <button class="mshhlpr-btn mshhlpr-btn-danger" onclick="location.reload()">Обновить страницу</button>
                </div>`;
        }
    }

    // === ПАНЕЛЬ НАСТРОЙКИ ФОРМЫ ===

    function renderReportGeneratorPanel(container, rawReportData, genitiveFio, subjectNames) {
        const academicYear = calculateAcademicYear();
        const defaultSubjectGenitive = declineSubjectList(subjectNames);

        const fieldsHtml = CRITERIA_CONFIG.map(f => `
            <div class="mshhlpr-form-group">
                <span class="mshhlpr-form-label">${f.label}:</span>
                ${f.type === 'textarea' 
                    ? `<textarea id="mesh-${f.id}-val" class="mshhlpr-textarea" style="height: ${f.h}px;">${f.val}</textarea>`
                    : `<input type="text" id="mesh-${f.id}-val" class="mshhlpr-input" value="${f.val}">`}
            </div>
        `).join('');

        container.innerHTML = `
            <div class="mshhlpr-analysis-layout">
                <div class="mshhlpr-analysis-grid">
                    <!-- ЛЕВАЯ КОЛОНКА -->
                    <div class="mshhlpr-analysis-sidebar">
                        <div class="mshhlpr-section-title">Параметры шапки</div>
                        <div class="mshhlpr-form-group">
                            <span class="mshhlpr-form-label">Предмет(ы) (род. падеж):</span>
                            <input type="text" id="mesh-subject-val" class="mshhlpr-input" value="${defaultSubjectGenitive}">
                        </div>
                        <div class="mshhlpr-form-group">
                            <span class="mshhlpr-form-label">ФИО учителя (род. падеж):</span>
                            <input type="text" id="mesh-fio-val" class="mshhlpr-input" value="${genitiveFio}">
                        </div>
                        <div class="mshhlpr-form-group">
                            <span class="mshhlpr-form-label">Учебный год:</span>
                            <input type="text" id="mesh-year-val" class="mshhlpr-input" value="${academicYear}">
                        </div>
                        <div class="mshhlpr-section-title" style="margin-top: 5px;">Параметры таблицы</div>
                        <div class="mshhlpr-form-group">
                            <span class="mshhlpr-form-label">Тип периодов обучения:</span>
                            <select id="mesh-period-type" class="mshhlpr-select">
                                <option value="триместр">Триместр</option>
                                <option value="четверть">Четверть</option>
                            </select>
                        </div>
                        <div class="mshhlpr-form-group">
                            <span class="mshhlpr-form-label">Глубина отчетного периода:</span>
                            <select id="mesh-report-depth" class="mshhlpr-select">
                                <option value="1">По 1-й период включительно</option>
                                <option value="2">По 2-й период включительно</option>
                                <option value="3">По 3-й период включительно</option>
                                <option value="Год">За весь учебный год</option>
                            </select>
                        </div>
                    </div>

                    <!-- ПРАВАЯ КОЛОНКА -->
                    <div class="mshhlpr-analysis-main">
                        <div class="mshhlpr-section-title">Критерии самоанализа</div>
                        ${fieldsHtml}
                    </div>
                </div>

                <div class="mshhlpr-analysis-actions">
                    <button id="mesh-generate-pdf-trigger" class="mshhlpr-btn mshhlpr-btn-success mshhlpr-btn-full" style="font-size: 15px !important; padding: 12px !important;">🖨️ Сформировать PDF / Печать</button>
                    <button id="mesh-generate-docx-trigger" class="mshhlpr-btn mshhlpr-btn-info mshhlpr-btn-full" style="font-size: 15px !important; padding: 12px !important;">📝 Скачать отчет в Word (DOCX)</button>
                </div>
            </div>`;

        const getUiValues = () => {
            const cVals = {};
            CRITERIA_CONFIG.forEach(f => {
                const el = container.querySelector(`#mesh-${f.id}-val`);
                cVals[f.id] = el ? el.value.trim() : f.val;
            });

            const finalSubject = container.querySelector('#mesh-subject-val').value.trim();
            const finalFio = container.querySelector('#mesh-fio-val').value.trim();
            const finalYear = container.querySelector('#mesh-year-val').value.trim();

            return {
                periodType: container.querySelector('#mesh-period-type').value,
                reportDepth: container.querySelector('#mesh-report-depth').value,
                finalSubject, finalFio, finalYear,
                finalTitle: `учителя ${finalSubject} ${finalFio} в ${finalYear} уч. г.`,
                cVals
            };
        };

        container.querySelector('#mesh-generate-pdf-trigger').onclick = () => {
            const v = getUiValues();
            generateReportOutput(rawReportData, v, 'pdf');
        };

        container.querySelector('#mesh-generate-docx-trigger').onclick = () => {
            const v = getUiValues();
            generateReportOutput(rawReportData, v, 'docx');
        };
    }

    // === ЕДИНЫЙ ШАБЛОНИЗАТОР И ВЫГРУЗКА ===

    function generateReportOutput(rawReportData, opts, format) {
        const filteredData = rawReportData.filter(i => !(i.group_name || "").toLowerCase().includes('ндо'));
        let targetPeriods = ["1"];
        if (opts.reportDepth === "2") targetPeriods = ["1", "2"];
        else if (opts.reportDepth === "3") targetPeriods = ["1", "2", "3"];
        else if (opts.reportDepth === "Год") targetPeriods = ["1", "2", "3", "Год"];

        const tableData = buildTableContent(filteredData, opts.periodType, targetPeriods);
        const c = opts.cVals;

        const subHeadersHtml = targetPeriods.map(p => `<th style="white-space: nowrap; width: 1%; padding: 2px 3px;">${p === "Год" ? "Год" : `${p} ${opts.periodType}`}</th>`).join('');

        const tableRowsHtml = `
            <tr>
                <td rowspan="${tableData.classSubjectPairs.length + 6}" class="cell-left">1. Успешность учебной работы (динамика учебных достижений, в т. ч. на внешкольных олимпиадах)</td>
                <td rowspan="${tableData.classSubjectPairs.length + 1}" class="cell-left">К1.1. Качество освоения учебных программ (итоги отчетного периода).</td>
                <td colspan="${targetPeriods.length + 3}" class="cell-left" style="background-color: #fafafa; font-weight: bold;">Успеваемость и качество обучения в ${opts.finalYear} учебном году:</td>
            </tr>
            ${tableData.rowsHtml}
            <tr><td class="cell-left">К1.2. Независимая оценка качества</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.k12.replace(/\n/g, '<br>')}</td></tr>
            <tr><td class="cell-left">К2.Успеваемость (ур./кач-во).</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${tableData.k2GeneratedText}</td></tr>
            <tr><td class="cell-left">К3 .Динамика уч. достижений</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${tableData.k3Text}</td></tr>
            <tr><td class="cell-left">К4 .Результативность участия в олимпиадах, конкурсах и др.</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.k4.replace(/\n/g, '<br>')}</td></tr>
            <tr><td class="cell-left">К5.Оценка функциональной грамотности обучающихся</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.k5.replace(/\n/g, '<br>')}</td></tr>
            
            <tr><td rowspan="4" class="cell-left">2. Активность во внеурочной деятельности</td><td class="cell-left">К 6 .Инд. дополн. работа со слабоуспевающими</td><td colspan="${targetPeriods.length + 3}" class="cell-left">Дополнительные занятия со слабоуспевающими обучающимися проходят в индивидуальном формате.</td></tr>
            <tr><td class="cell-left">К7. Индивидуальная дополнительная работа с мотивированными обуч-ся</td><td colspan="${targetPeriods.length + 3}" class="cell-left">Дополнительные занятия с мотивированными обучающимися проходят в индивидуальном формате.</td></tr>
            <tr><td class="cell-left">К8. Работа по привлечению обучающихся к дополнительному, расширенному, углубленному изучению предмета за рамками тарификационных часов. (НОУ, проектн. деятельность, предм. нед. и т.д.)</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.k8.replace(/\n/g, '<br>')}</td></tr>
            <tr><td class="cell-left">К9. Воспитательная работа с обучающимися</td><td colspan="${targetPeriods.length + 3}" class="cell-left">На все вопросы детей их законных представителей даются развёрнутые ответы. Все обращения прочитаны и удовлетворены подробными пояснениями. В случаях некорректного поведения на уроках, с обучающимися проводятся воспитательные беседы, поддерживается связь с родителями (телефонные разговоры, через чат на платформе Сферум в мессенджере MAX).</td></tr>
            
            <tr><td class="cell-left">3. Обобщение передового пед. опыта</td><td class="cell-left">К 10. Проведение мастер-классов, открытых уроков, выступления на конференциях, семинарах, круглых столах, наличие опубликованных работ, наставничество и т.п. (за отчетный период).</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.k10.replace(/\n/g, '<br>')}</td></tr>
            <tr><td class="cell-left">4. Методическая работа</td><td class="cell-left">К 11. Наличие собств. метод.разработок, рекомендаций, и т.п., применяемых в образ. процессе, участие в инн. работе, рук-во МО, наставничество и др.</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.k11.replace(/\n/g, '<br>')}</td></tr>
            <tr><td class="cell-left">5. Использование пед. технологий</td><td class="cell-left">К 12. Мультимедийные средства обучения, ИКТ</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${tableData.k12StaticText}</td></tr>
            <tr><td class="cell-left">6. Повышение квалификации</td><td class="cell-left">К 13. 1.Аттестация. Повышение квалификации и переподготовки. 2.Результаты тестирования профессиональных компетенций</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.k13.replace(/\n/g, '<br>')}</td></tr>
            <tr><td class="cell-left">7. Программы повышенного уровня</td><td class="cell-left">К 14. Профильное обучение</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.k14.replace(/\n/g, '<br>')}</td></tr>
            <tr><td class="cell-left">8. Качество работы кл. руководителя</td><td class="cell-left">К 15. Проведение род. собраний, отсутствие жалоб</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${tableData.k15StaticText}</td></tr>
            
            <tr><td rowspan="4" class="cell-left">9. Дополнительные критерии МАОУ СОШ № 5</td><td class="cell-left">1. 1.Организация и проведение мероприятий разного уровня.</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.mao1.replace(/\n/g, '<br>')}</td></tr>
            <tr><td class="cell-left">2. Обязанности дежурного учителя</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.mao2.replace(/\n/g, '<br>')}</td></tr>
            <tr><td class="cell-left">3. Травматизм обучающихся</td><td colspan="${targetPeriods.length + 3}" class="cell-left">Нет</td></tr>
            <tr><td class="cell-left">4. Содержание кабинета</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.mao4.replace(/\n/g, '<br>')}</td></tr>
            
            <tr><td rowspan="2" class="cell-left">10. Другие критерии</td><td class="cell-left">5. Экспертная деятельность</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.oth5.replace(/\n/g, '<br>')}</td></tr>
            <tr><td class="cell-left">6. Платные образовательные услуги</td><td colspan="${targetPeriods.length + 3}" class="cell-left">${c.oth6.replace(/\n/g, '<br>')}</td></tr>
        `;

        if (format === 'pdf') {
            const html = `
            <html><head><title></title><style>
                /* margin: 0 полностью отключает системную дату, заголовок и about:blank */
                @page { size: portrait; margin: 0; }
                body { font-family: 'Times New Roman', serif; padding: 15mm 10mm; margin: 0; color: #000; line-height: 1.4; box-sizing: border-box; }
                .header { text-align: center; margin-bottom: 25px; }
                .header h1 { font-size: 16px; text-transform: uppercase; font-weight: bold; margin: 0 0 5px 0; }
                .btn-print { background: #2e7d32; color: white; border: none; padding: 10px 25px; cursor: pointer; border-radius: 5px; font-size: 15px; font-weight: bold; margin-top: 15px; }
                table { width: 100%; border-collapse: collapse; text-align: center; font-size: 12.5px; margin-top: 12px; line-height: 1.15; }
                th, td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; }
                th { background-color: #f5f5f5; font-weight: bold; -webkit-print-color-adjust: exact; }
                .cell-left { text-align: left; }
                @media print { 
                    .btn-print, .print-note { display: none !important; } 
                    body { padding: 15mm 10mm !important; } 
                }
            </style></head><body>
                <div class="header">
                    <h1>Самоанализ деятельности</h1>
                    <p style="font-size: 14px; font-weight: bold;">${opts.finalTitle}</p>
                    <button class="btn-print" onclick="window.print()">🖨️ Напечатать отчет / Сохранить в PDF</button>
                </div>
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">Таблица 1.</div>
                <table>
                    <tbody>
                        <tr><th rowspan="2" style="width:15%">Критерии</th><th rowspan="2" style="width:20%">Показатели</th><th colspan="${targetPeriods.length + 3}">Выполненная работа</th></tr>
                        <tr><th style="white-space: nowrap; width: 1%; padding: 2px 3px;">Предмет</th><th style="white-space: nowrap; width: 1%; padding: 2px 3px;">Класс</th>${subHeadersHtml}<th style="padding: 2px 4px;">Динамика</th></tr>
                        ${tableRowsHtml}
                    </tbody>
                </table>
                <div class="print-note" style="font-size:12px;color:#555;margin-top:25px;">ℹ️ В окне печати выберите <b>«Сохранить как PDF»</b>.</div>
            </body></html>`;

            const win = window.open('', '_blank');
            if (win) { win.document.write(html); win.document.close(); }
            else alert('Разрешите всплывающие окна для портала МЭШ.');
        } else {
            const docSource = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head><title>Самоанализ</title><style>
                    @page Section1 { size: 841.9pt 595.3pt; margin: 36.0pt; }
                    div.Section1 { page: Section1; }
                    body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000000; }
                    h1 { font-size: 15pt; text-align: center; text-transform: uppercase; font-weight: bold; margin: 0 0 5px 0; }
                    table { border-collapse: collapse; width: 100%; border: 1px solid #000; }
                    th, td { border: 1px solid #000; padding: 6px; font-size: 10pt; vertical-align: middle; }
                    .cell-left { text-align: left; }
                </style></head>
                <body><div class="Section1">
                    <h1>Самоанализ деятельности</h1>
                    <p style="text-align: center; font-weight: bold; margin-bottom: 20px;">${opts.finalTitle}</p>
                    <div style="font-weight: bold; font-size: 12pt; margin-bottom: 5px;">Таблица 1.</div>
                    <table border="1">
                        <tbody>
                            <tr><th rowspan="2" style="width:15%; background:#f5f5f5;"><b>Критерии</b></th><th rowspan="2" style="width:20%; background:#f5f5f5;"><b>Показатели</b></th><th colspan="${targetPeriods.length + 3}" style="background:#f5f5f5;"><b>Выполненная работа</b></th></tr>
                            <tr><th style="background:#f5f5f5;"><b>Предмет</b></th><th style="background:#f5f5f5;"><b>Класс</b></th>${subHeadersHtml}<th style="background:#f5f5f5;"><b>Динамика</b></th></tr>
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div></body></html>
            `;

            const blob = new Blob(['\ufeff' + docSource], { type: 'application/msword' });
            const cleanSub = opts.finalSubject.replace(/[\\/?*[\]]/g, '').substring(0, 30);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `Самоанализ_${cleanSub}_${opts.finalYear}.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    function buildTableContent(filteredData, periodType, targetPeriods) {
        const classSubjectPairs = [];
        filteredData.forEach(item => {
            const className = extractClassName(item.group_name);
            const subjectName = item.subject_name || "Дисциплина";
            if (!classSubjectPairs.some(p => p.className === className && p.subjectName === subjectName)) {
                classSubjectPairs.push({ className, subjectName });
            }
        });

        classSubjectPairs.sort((a, b) => compareClassNames(a.className, b.className));

        let rowsHtml = '';
        classSubjectPairs.forEach(pair => {
            rowsHtml += `<tr>
                <td style="border: 1px solid #000; padding: 2px 3px; text-align: left; white-space: nowrap; width: 1%;">${pair.subjectName}</td>
                <td style="border: 1px solid #000; padding: 2px 3px; text-align: center; white-space: nowrap; width: 1%;">${pair.className}</td>`;

            const groupRecords = filteredData.filter(item => extractClassName(item.group_name) === pair.className && item.subject_name === pair.subjectName);
            
            targetPeriods.forEach(pNum => {
                const record = groupRecords.find(item => String(item.period_num) === pNum);
                rowsHtml += `<td style="border: 1px solid #000; padding: 2px 3px; text-align: center; white-space: nowrap; width: 1%;"><b>${record ? record.percent_quality : 0}%</b></td>`;
            });

            let dynamicsText = '';
            if (targetPeriods.length === 1) {
                dynamicsText = 'Динамика положительная, либо стабильная';
            } else {
                const parts = [];
                for (let i = 1; i < targetPeriods.length; i++) {
                    const cPeriod = targetPeriods[i];
                    if (cPeriod === "Год") continue;
                    const prevRec = groupRecords.find(item => String(item.period_num) === targetPeriods[i - 1]);
                    const currRec = groupRecords.find(item => String(item.period_num) === cPeriod);
                    const cVal = currRec ? currRec.percent_quality : 0;
                    const pVal = prevRec ? prevRec.percent_quality : 0;
                    const trend = cVal > pVal ? 'положительная' : cVal === pVal ? 'стабильная' : 'отрицательная';
                    parts.push(`${cPeriod} ${periodType} ${trend}`);
                }
                dynamicsText = parts.join(', ') || '—';
            }

            // Динамика забирает всё оставшееся пространство листа
            rowsHtml += `<td style="border: 1px solid #000; padding: 2px 4px; text-align: left;">${dynamicsText}</td></tr>`;
        });

        const subjectProgressMap = {};
        filteredData.forEach(item => {
            const subName = item.subject_name || "дисциплина";
            const className = extractClassName(item.group_name);
            if (String(item.period_num) === targetPeriods[targetPeriods.length - 1] && item.progress_quality < 100) {
                if (!subjectProgressMap[subName]) subjectProgressMap[subName] = [];
                subjectProgressMap[subName].push({ className, progress: item.progress_quality });
            }
        });

        const subjectEntries = Object.entries(subjectProgressMap);
        const k2ExceptionsText = subjectEntries.length 
            ? subjectEntries.map(([sName, list]) => `<b>${sName.toLowerCase()}</b>: ${list.sort((a,b)=>compareClassNames(a.className,b.className)).map(i => `${i.className} (${i.progress}%)`).join(', ')}`).join('<br>')
            : 'все показатели успеваемости составляют 100%';

        return {
            classSubjectPairs,
            rowsHtml,
            k2GeneratedText: `<b>Примечание.</b><br>Анализируя полученные показатели качества и успеваемости за учебный год, можно сделать следующие выводы: показатели успеваемости составляют 100%, за исключением следующих классов:<br>${k2ExceptionsText}.<br>Качество знаний находится в пределах допустимого и оптимального уровней.`,
            k3Text: `<b>Примечание.</b><br>Выводы для тех классов, где наблюдается преемственность – нет преемственности.`,
            k12StaticText: `1. Для всех классов выдаются домашние задания на платформе МЭШ. Для долго отсутствующих обучающихся и для закрепления учебного материала выдаются задания в разделе «Тестирование» в МЭШ (ЦДЗ).<br>2. В д/з прикрепляются видеофрагменты.<br>3. На уроках используется интерактивная смарт-доска.`,
            k15StaticText: `1. Проведение индивидуальных встреч с родителями по вопросам успеваемости и психологических аспектов обучения.<br>2. Консультирование родителей по учебно-методическим вопросам.<br>3. Ведётся конструктивная работа по результатам обратной связи.`
        };
    }

    // === УТИЛИТЫ ===

    function declineLastNameToGenitive(l) {
    if (!l) return '';
    const low = l.toLowerCase();

    // 1. Несклоняемые фамилии (на -о, -их, -ых, -аго, -ово, -э, -и, -у, -ю)
    // Примеры: Глушко, Шевченко, Черных, Дурново, Данте
    if (/(о|их|ых|аго|ово|э|и|у|ю)$/i.test(low)) {
        return l;
    }

    // 2. Женские фамилии на -ая (Маковская -> Маковской, Заречная -> Заречной)
    if (low.endsWith('ая')) {
        return l.slice(0, -2) + 'ой';
    }

    // 3. Мужские фамилии на -ий, -ый (Маковский -> Маковского, Белый -> Белого)
    if (low.endsWith('ий') || low.endsWith('ый')) {
        return l.slice(0, -2) + 'ого';
    }

    // 4. Мужские фамилии на -ов, -ев, -ин (Иванов -> Иванова)
    if (low.endsWith('ов') || low.endsWith('ев') || low.endsWith('ин')) {
        return l + 'а';
    }

    // 5. Женские фамилии на -ова, -ева, -ина (Иванова -> Ивановой)
    if (low.endsWith('ова') || low.endsWith('ева') || low.endsWith('ина')) {
        return l.slice(0, -1) + 'ой';
    }

    // 6. Фамилии на -ка, -га, -ха (Смолка -> Смолки, Белошапка -> Белошапки)
    if (low.endsWith('ка') || low.endsWith('га') || low.endsWith('ха')) {
        return l.slice(0, -1) + 'и';
    }

    // 7. Другие фамилии на -а, -я (Кучма -> Кучмы, Глоба -> Глобы)
    if (low.endsWith('а') || low.endsWith('я')) {
        return l.slice(0, -1) + 'ы';
    }

    // 8. Мужские фамилии на согласную (Шевчук -> Шевчука, Мицкевич -> Мицкевича)
    if (/[бвгджзклмнпрстфхцчшщ]$/i.test(low)) {
        return l + 'а';
    }

    return l;
}
    function declineSingleSubjectToGenitive(rawName) {
        if (!rawName) return 'предмета';
        const s = rawName.trim().toLowerCase();

        // Полный словарь всех официальных предметов школы РФ (ФГОС 2026-2027)
        const dict = {
            'русский язык': 'русского языка',
            'родной язык': 'родного языка',
            'литература': 'литературы',
            'родная литература': 'родной литературы',
            'иностранный язык': 'иностранного языка',
            'английский язык': 'английского языка',
            'немецкий язык': 'немецкого языка',
            'французский язык': 'французского языка',
            'испанский язык': 'испанского языка',
            'китайский язык': 'китайского языка',
            'математика': 'математики',
            'алгебра': 'алгебры',
            'геометрия': 'геометрии',
            'вероятность и статистика': 'вероятности и статистики',
            'информатика': 'информатики',
            'история': 'истории',
            'история россии': 'истории России',
            'всеобщая история': 'всеобщей истории',
            'обществознание': 'обществознания',
            'география': 'географии',
            'физика': 'физики',
            'химия': 'химии',
            'биология': 'биологии',
            'естествознание': 'естествознания',
            'экология': 'экологии',
            'изобразительное искусство': 'изобразительного искусства',
            'изо': 'ИЗО',
            'музыка': 'музыки',
            'физическая культура': 'физической культуры',
            'физкультура': 'физкультуры',
            'труд (технология)': 'труда (технологии)',
            'технология': 'технологии',
            'труд': 'труда',
            'основы безопасности и защиты родины': 'основ безопасности и защиты Родины',
            'обзр': 'ОБЗР',
            'обж': 'ОБЖ',
            'основы духовно-нравственной культуры народов россии': 'основ духовно-нравственной культуры народов России',
            'однкнр': 'ОДНКНР',
            'основы религиозных культур и светской этики': 'основ религиозных культур и светской этики',
            'орксы': 'ОРКСЭ',
            'черчение': 'черчения',
            'индивидуальный проект': 'индивидуального проекта'
        };

        if (dict[s]) return dict[s];

        // Алгоритмические правила на случай внеурочных или редких предметов
        if (s.endsWith(' язык')) return s.replace(/ язык$/, 'ского языка');
        if (s.endsWith('ика') || s.endsWith('рка') || s.endsWith('шка') || s.endsWith('тка')) return s.slice(0, -1) + 'и';
        if (s.endsWith('ия')) return s.slice(0, -1) + 'и';
        if (s.endsWith('ие') || s.endsWith('ье')) return s.slice(0, -1) + 'я';
        if (s.endsWith('ра') || s.endsWith('та') || s.endsWith('ма') || s.endsWith('ла')) return s.slice(0, -1) + 'ы';

        return s;
    }

    function declineSubjectList(subjectNames) {
        if (!subjectNames || !subjectNames.length) return "предмета";
        const declined = subjectNames.map(declineSingleSubjectToGenitive);
        if (declined.length === 1) return declined[0];
        if (declined.length === 2) return `${declined[0]} и ${declined[1]}`;
        return declined.slice(0, -1).join(', ') + ' и ' + declined[declined.length - 1];
    }

    function extractClassName(g) {
        if (!g) return '';
        const match = g.match(/\d+[-_A-Za-zА-Яа-яЁё]?\d*/);
        return match ? match[0].replace('_', '-') : g;
    }

    function calculateAcademicYear() {
        const d = new Date(), y = d.getFullYear();
        return d.getMonth() >= 8 ? `${y}–${y + 1}` : `${y - 1}–${y}`;
    }

    function compareClassNames(a, b) {
        const getNum = s => { const m = s.match(/^\d+/); return m ? parseInt(m[0], 10) : null; };
        const numA = getNum(a), numB = getNum(b);
        if (numA !== null && numB !== null) return numA !== numB ? numA - numB : a.localeCompare(b);
        return numA !== null ? -1 : numB !== null ? 1 : a.localeCompare(b);
    }

    async function fetchReportWithFallback(url, activeTeacherId, token) {
        let lastErr = null;
        for (const sub of ['teacherweb', 'journalsw', 'journalw']) {
            try {
                const res = await fetch(url, { method: "GET", headers: { "accept": "*/*", "aid": "13", "authorization": token, "profile-id": String(activeTeacherId), "x-mes-hostid": "9", "x-mes-roleid": "9", "x-mes-subsystem": sub } });
                if (res.ok) return await res.json();
            } catch (e) { lastErr = e; }
        }
        throw lastErr || new Error('Ошибка сети при запросе отчета.');
    }

    function mouseClick(el) {
        if (!el) return;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        ['mousedown', 'mouseup', 'click'].forEach(ev => el.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window, button: 0 })));
    }

    function setNativeInputValue(input, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(input.__proto__, 'value').set;
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set;
        (valueSetter && valueSetter !== prototypeValueSetter ? prototypeValueSetter : valueSetter).call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    let isScheduled = false;
    const observer = new MutationObserver(() => {
        if (!isScheduled) {
            isScheduled = true;
            window.requestAnimationFrame(() => { injectSelfAnalisButton(); isScheduled = false; });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    injectSelfAnalisButton();
};