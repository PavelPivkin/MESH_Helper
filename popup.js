// popup.js

(() => {
    console.log('[МЭШ][popup.js] Инициализация всплывающего окна.');

    const extensionToggle = document.getElementById('extensionToggle');
    const versionText = document.getElementById('versionText');

    const manifest = chrome.runtime.getManifest();
    versionText.textContent = manifest.version_name || `v.${manifest.version}`;

    chrome.storage.local.get([
        'extensionEnabled', 
        'activeTeacher'
    ], (result) => {
        extensionToggle.checked = (result.extensionEnabled !== false);

        const teacherContainer = document.getElementById('activeTeacherContainer');
        const teacherNameSpan = document.getElementById('activeTeacherName');

        if (result.activeTeacher) {
            teacherNameSpan.textContent = result.activeTeacher;
            teacherContainer.style.display = 'block';
        } else {
            teacherContainer.style.display = 'none';
        }
    });

    // Генерация аккуратных пастельных бейджей
    const getBadge = (type, text) => {
        const baseStyle = 'padding: 2px 8px; font-size: 11px; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;';
        if (type === 'green') {
            return `<span style="background: #e8f5e9; color: #2e7d32; ${baseStyle}">🟢 ${text}</span>`;
        }
        if (type === 'red') {
            return `<span style="background: #ffebee; color: #c62828; ${baseStyle}">🔴 ${text}</span>`;
        }
        if (type === 'yellow') {
            return `<span style="background: #fff3e0; color: #e65100; ${baseStyle}">🟡 ${text}</span>`;
        }
        return `<span style="background: #f0f0f0; color: #888; ${baseStyle}">⏳ ${text}</span>`;
    };

    const updateStatusUI = (status) => {
        if (!status) return;

        const internetSpan = document.getElementById('statusInternet');
        const meshSpan = document.getElementById('statusMesh');
        const sessionSpan = document.getElementById('statusSession');

        internetSpan.innerHTML = status.internet === 'online' ? getBadge('green', 'Ок') : getBadge('red', 'Отключен');

        if (status.mesh === 'online') {
            meshSpan.innerHTML = getBadge('green', 'Работает');
        } else if (status.mesh === 'offline') {
            meshSpan.innerHTML = getBadge('red', 'Сбой');
        } else {
            meshSpan.innerHTML = getBadge('yellow', 'Ожидание');
        }

        if (status.session === 'active') {
            sessionSpan.innerHTML = getBadge('green', 'Ок');
        } else if (status.session === 'expired') {
            sessionSpan.innerHTML = getBadge('yellow', 'Истекла');
        } else {
            sessionSpan.innerHTML = getBadge('yellow', 'Ожидание');
        }
    };

    chrome.storage.session.get(['msh_network_status'], (res) => {
        if (res.msh_network_status) {
            updateStatusUI(res.msh_network_status);
        }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
            if (changes.extensionEnabled) extensionToggle.checked = changes.extensionEnabled.newValue !== false;
        }
        if (areaName === 'session' && changes.msh_network_status) {
            updateStatusUI(changes.msh_network_status.newValue);
        }
    });

    extensionToggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ extensionEnabled: e.target.checked });
    });
})();