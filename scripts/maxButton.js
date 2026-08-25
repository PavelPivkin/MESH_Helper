// scripts/maxButton.js

window.initMaxButton = function() {
    console.log('[МЭШ][maxButton.js] Модуль кнопки MAX инициализирован.');

    // Выносим SVG иконку в константу, чтобы не засорять логику
    const MAX_ICON_SVG = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; color: #ffffff;">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"></path>
            <circle cx="12" cy="10" r="2"></circle>
            <circle cx="7" cy="10" r="2"></circle>
            <circle cx="17" cy="10" r="2"></circle>
        </svg>
    `;

    // Функция, которая проверяет наличие родной кнопки и вставляет нашу
    function checkAndInsertButton() {
        const container = document.querySelector('.Zz52eqOAMeU-.rbrtfGqv-zM-.V07OAWmf3MA-, div.Zz52eqOAMeU-');
        
        if (!container) return; // Если контейнера нет — уходим
        if (container.querySelector('#mesh-max-feedback-btn')) return; // Если наша кнопка уже есть — уходим

        const writeUsBtn = container.querySelector('button.CZdki5fD-9I-.BbWGknTpbnA-');
        
        if (writeUsBtn) {
            console.log('[МЭШ][maxButton.js] Внедряем кнопку MAX.');

            // Клонируем родную кнопку
            const maxButton = writeUsBtn.cloneNode(true);
            maxButton.id = 'mesh-max-feedback-btn';
            
            // Принудительно задаем наш градиентный фон и стили
            maxButton.style.cssText = `
                background: linear-gradient(135deg, #4caf50, #2e7d32) !important;
                color: #000000 !important;
                margin-left: 0 !important;
                margin-right: 8px !important;
                flex-shrink: 0 !important;
                cursor: pointer !important;
                border: 1px solid rgba(0, 0, 0, 0.15) !important;
            `;

            // Внедряем нашу иконку и текст
            const innerDiv = maxButton.querySelector('div');
            if (innerDiv) {
                innerDiv.style.cssText = 'display: flex !important; align-items: center !important; color: #000000 !important; padding: 0 4px !important;';
                innerDiv.innerHTML = `
                    ${MAX_ICON_SVG}
                    <span style="font-weight: bold; white-space: nowrap; color: #000000;">Написать Храмцову А.К. в MAX</span>
                `;
            }

            // Вставляем строго ПЕРЕД кнопкой "Написать нам"
            writeUsBtn.before(maxButton);

            // Клик для открытия ссылки в MAX
            maxButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[МЭШ][maxButton.js] Нажата кнопка связи в MAX.');
                window.open('https://web.max.ru/u/f9LHodD0cOIsC8R474ssCmngGgzkR08a4xgM4aDzYqR3QQQW0HWmK_RmzME', '_blank');
            }, true);
        }
    }

    // Запуск умного Observer'а с requestAnimationFrame
    let isScheduled = false;

    const observer = new MutationObserver(() => {
        if (!isScheduled) {
            isScheduled = true;
            window.requestAnimationFrame(() => {
                checkAndInsertButton();
                isScheduled = false;
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
};