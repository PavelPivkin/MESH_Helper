// scripts/checkStatus.js

(() => {
    console.log('[МЭШ][checkStatus.js] Скрипт мониторинга сети запущен.');

    let checkTimer = null, isInitialCheck = true, isCollapsed = false;

    // --- ЗАЩИТА КОНТЕКСТА ---
    // Предотвращает ошибку "Extension context invalidated" при перезагрузке расширения
    const isContextValid = () => {
        try {
            if (!chrome?.runtime?.id) throw new Error();
            return true;
        } catch {
            if (checkTimer) { clearInterval(checkTimer); checkTimer = null; }
            return false;
        }
    };

    const saveStatus = (s) => isContextValid() && chrome.storage.session.set({ msh_network_status: s }).catch(() => {});

    // --- ЛОГИКА ПРОВЕРКИ ---
    async function performHealthCheck() {
        if (document.hidden || document.visibilityState !== 'visible' || !isContextValid()) return;

        let s = { internet: 'online', mesh: 'online', session: 'active', timestamp: Date.now() };

        if (!navigator.onLine) {
            s.internet = 'offline'; s.mesh = s.session = 'unknown';
            return saveStatus(s);
        }

        if (isInitialCheck) {
            isInitialCheck = false;
            return saveStatus(s);
        }

        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 10000);

        try {
            const { currentBearerToken: t, currentProfileId: p } = await chrome.storage.session.get(['currentBearerToken', 'currentProfileId']);
            const res = await fetch("https://authedu.mosreg.ru/api/ej/acl/v1/sessions", {
                method: "POST",
                headers: { "accept": "application/json", "content-type": "application/json", "x-mes-hostid": "9", "x-mes-roleid": "9", "x-mes-subsystem": "teacherweb", ...(t && {"authorization": `Bearer ${t}`}), ...(p && {"profile-id": p}) },
                body: JSON.stringify({ auth_token: t || "" }),
                signal: ctrl.signal
            });

            if ([401, 403].includes(res.status)) s.session = 'expired';
            else if (!res.ok) { s.mesh = 'offline'; s.session = 'unknown'; }
        } catch {
            s.mesh = 'offline'; s.session = 'unknown';
        } finally {
            clearTimeout(tid);
        }

        saveStatus(s);
    }

    // --- РЕНДЕРИНГ И УПРАВЛЕНИЕ UI ---
    function updateToastUI(status) {
        const hasIssue = status.internet !== 'online' || status.mesh !== 'online' || status.session !== 'active';
        let toast = document.getElementById('mshhlpr-status-toast');
        
        if (!hasIssue) {
            toast?.remove();
            isCollapsed = false;
            return;
        }

        const desc = status.internet !== 'online' ? 'Потеряно подключение к Интернету. Проверьте кабель или Wi-Fi.' :
                     status.mesh !== 'online' ? 'Школьный портал временно недоступен. Сервер перегружен или ведутся работы.' :
                     'Ваша сессия Госуслуг истекла. Обновите страницу.';

        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'mshhlpr-status-toast';
            toast.className = 'mshhlpr-sidebar-container mshhlpr-sidebar-transition mshhlpr-status-red';
            toast.innerHTML = `
                <div id="mshhlpr-status-expanded-content" style="display:flex;flex-direction:column;width:100%;height:100%">
                    <div id="mshhlpr-status-header" class="mshhlpr-status-red-header"><span>⚠️ Проблема с соединением</span><span style="font-size:11px">▼</span></div>
                    <div class="mshhlpr-status-red-body"></div>
                </div>
                <div id="mshhlpr-status-collapsed-content" title="Обнаружены проблемы с соединением. Кликните, чтобы развернуть.">!</div>
            `;
            document.body.appendChild(toast);

            toast.querySelector('#mshhlpr-status-header').onclick = e => { e.stopPropagation(); isCollapsed = true; updateToastUI(status); };
            toast.onclick = e => { if (toast.classList.contains('mshhlpr-sidebar-collapsed')) { e.stopPropagation(); isCollapsed = false; updateToastUI(status); } };
        }

        toast.querySelector('.mshhlpr-status-red-body').textContent = desc;
        toast.classList.toggle('mshhlpr-sidebar-collapsed', isCollapsed);
        toast.classList.toggle('mshhlpr-sidebar-expanded', !isCollapsed);
    }

    // --- ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ ---
    chrome.storage.onChanged.addListener((c, a) => {
        if (isContextValid() && a === 'session' && c.msh_network_status) updateToastUI(c.msh_network_status.newValue);
    });

    window.addEventListener('online', performHealthCheck);
    window.addEventListener('offline', performHealthCheck);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && performHealthCheck());

    performHealthCheck();
    checkTimer = setInterval(performHealthCheck, 120000);
})();