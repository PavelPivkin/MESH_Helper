// scripts/identity.js

window.initIdentity = function() {
    console.log('[МЭШ][identity.js] Скрипт identity запущен.');

    // Функция проверки времени жизни токена
    function isTokenValid(token) {
        if (!token) return false;
        try {
            const parts = token.split('.');
            if (parts.length < 2) return false;
            
            const base64Url = parts[1];
            let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            
            while (base64.length % 4) {
                base64 += '=';
            }
            
            const payload = JSON.parse(atob(base64));
            if (!payload || !payload.exp) return false;
            
            const currentTime = Math.floor(Date.now() / 1000);
            const timeLeft = payload.exp - currentTime;
            return timeLeft > 60; 
        } catch (e) {
            return false;
        }
    }

    // 1. Проверяем кэш при запуске страницы (активного учителя из local, токен из session)
    chrome.storage.local.get(['activeTeacher'], (localRes) => {
        chrome.storage.session.get(['currentBearerToken', 'currentProfileId'], (sessionRes) => {
            const activeTeacher = localRes.activeTeacher;
            const cachedToken = sessionRes.currentBearerToken;

            if (activeTeacher && isTokenValid(cachedToken)) {
                console.log(`[МЭШ][identity.js] Сессия подтверждена по кэшу. Учитель: ${activeTeacher}`);
                sessionStorage.setItem('msh_identity_resolved', 'true');
                return;
            }

            if (isTokenValid(cachedToken) && sessionStorage.getItem('msh_identity_resolved') !== 'true') {
                fetchTeacherData(cachedToken, sessionRes.currentProfileId);
            }
        });
    });

    // 2. Реактивный слушатель сессионного хранилища оперативной памяти (areaName === 'session')
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'session' && changes.currentBearerToken) {
            const newToken = changes.currentBearerToken.newValue;
            
            if (sessionStorage.getItem('msh_identity_resolved') === 'true') {
                return;
            }

            if (isTokenValid(newToken)) {
                chrome.storage.session.get(['currentProfileId'], (sessionRes) => {
                    fetchTeacherData(newToken, sessionRes.currentProfileId);
                });
            }
        }
    });

    // 3. Запрос данных учителя
    function fetchTeacherData(token, profileId) {
        const authHeader = `Bearer ${token}`;

        console.log('[МЭШ][identity.js] Отправка фонового запроса профиля...');

        fetch("https://authedu.mosreg.ru/api/ej/acl/v1/sessions", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "authorization": authHeader,
                "content-type": "application/json",
                "profile-id": profileId || "",
                "x-mes-hostid": "9",
                "x-mes-roleid": "9",
                "x-mes-subsystem": "teacherweb"
            },
            body: JSON.stringify({ auth_token: token }),
            mode: "cors"
        })
        .then(response => {
            if (!response.ok) throw new Error(`Код ответа: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.first_name && data.last_name) {
                const middleName = data.middle_name || "";
                const fullName = `${data.last_name} ${data.first_name} ${middleName}`.trim();
                
                console.log('[МЭШ][identity.js] Данные профиля успешно получены:', fullName);
                
                sessionStorage.setItem('msh_identity_resolved', 'true');
                switchProfile(fullName);
            }
        })
        .catch(err => {
            console.error('[МЭШ][identity.js] Ошибка при запросе профиля к API:', err);
        });
    }

    function switchProfile(name) {
        chrome.storage.local.get(['activeTeacher', 'profiles', 'extensionEnabled', 'zipScheduleEnabled'], (res) => {
            const profiles = res.profiles || {};
            
            if (res.activeTeacher === name) return;

            console.log(`[МЭШ][identity.js] Переключение профиля настроек на: ${name}`);

            if (!profiles[name]) {
                profiles[name] = {
                    extensionEnabled: res.extensionEnabled !== false,
                    zipScheduleEnabled: res.zipScheduleEnabled !== false
                };
            }

            chrome.storage.local.set({
                activeTeacher: name,
                profiles: profiles,
                extensionEnabled: profiles[name].extensionEnabled,
                zipScheduleEnabled: profiles[name].zipScheduleEnabled
            });
        });
    }
};