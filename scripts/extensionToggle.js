// scripts/extensionToggle.js

(() => {
    console.log('[МЭШ][extensionToggle.js] Инициализация скрипта тумблера.');

    const TARGET_CONTAINER_CLASS = 'Vg9HLOeW2ZECug7o';
    const TEACHER_OFFICE_BTN_QA = 'MenuItem';

    function initToggle() {
        const container = document.querySelector(`div.${TARGET_CONTAINER_CLASS}`);
        if (!container) return;

        // Если тумблер уже находится в актуальном активном контейнере — выходим
        if (container.querySelector('#mesh-extension-toggle-item')) {
            return;
        }

        // Предотвращаем конфликты SPA: удаляем старые копии из неактивных/удаленных частей DOM
        document.querySelectorAll('#mesh-extension-toggle-item').forEach(el => el.remove());

        const buttons = container.querySelectorAll(`button[data-qa-id="${TEACHER_OFFICE_BTN_QA}"]`);
        let teacherBtn = null;

        for (const btn of buttons) {
            if (btn.textContent.includes('Кабинет учителя')) {
                teacherBtn = btn;
                break;
            }
        }

        if (!teacherBtn) return;

        console.log('[МЭШ][extensionToggle.js] Найден блок меню, внедряем тумблер.');

        const toggleItem = document.createElement('div');
        toggleItem.id = 'mesh-extension-toggle-item';
        toggleItem.className = 'mshhlpr-universal-toggle-btn'; 
        toggleItem.style.marginBottom = '8px'; 

        toggleItem.innerHTML = `
            <span class="mshhlpr-universal-toggle-text">МЭШ Помогатор</span>
            <label class="mshhlpr-ios-switch">
                <input type="checkbox" id="mesh-main-toggle-input">
                <span class="mshhlpr-ios-slider"></span>
            </label>
        `;

        container.insertBefore(toggleItem, teacherBtn);

        const checkbox = document.getElementById('mesh-main-toggle-input');

        // Читаем начальное состояние
        chrome.storage.local.get(['extensionEnabled'], (result) => {
            const isEnabled = result.extensionEnabled !== false;
            if (checkbox) checkbox.checked = isEnabled;
        });

        // Клик по тумблеру в меню сайта
        checkbox.addEventListener('change', (e) => {
            const newState = e.target.checked;
            console.log('[МЭШ][extensionToggle.js] Тумблер на странице переключен в:', newState);
            chrome.storage.local.set({ extensionEnabled: newState });
        });
    }

    // Слушатель регистрируется ОДИН раз глобально
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.extensionEnabled) {
            const checkbox = document.getElementById('mesh-main-toggle-input');
            if (checkbox) {
                checkbox.checked = changes.extensionEnabled.newValue !== false;
            }
        }
    });

    // Оптимизированный наблюдатель с защитой от перегрузки процессора через кадровую синхронизацию
    let isScheduled = false;
    const observer = new MutationObserver(() => {
        if (!isScheduled) {
            isScheduled = true;
            window.requestAnimationFrame(() => {
                initToggle();
                isScheduled = false;
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initToggle();
    } else {
        window.addEventListener('DOMContentLoaded', initToggle);
    }
})();