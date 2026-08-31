// background.js
console.log('[МЭШ][background.js] Скрипт инициализирован.');

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[МЭШ][background.js] Расширение успешно установлено.');
        chrome.storage.local.set({ extensionEnabled: true });
    } else if (details.reason === 'update') {
        console.log('[МЭШ][background.js] Расширение обновлено до версии:', chrome.runtime.getManifest().version);
    }

    // Разрешаем контентным скриптам доступ к session storage
    if (chrome.storage.session && chrome.storage.session.setAccessLevel) {
        chrome.storage.session.setAccessLevel({ 
            accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' 
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[МЭШ][background.js] Получено сообщение:', request);
    return true; 
});

// Синхронизация профилей учителей
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        chrome.storage.local.get(['activeTeacher', 'profiles'], (res) => {
            const active = res.activeTeacher;
            if (!active) return;

            let profiles = res.profiles || {};
            let isChanged = false;

            if (!profiles[active]) {
                profiles[active] = {};
            }

            const keysToSync = ['extensionEnabled', 'zipScheduleEnabled'];
            keysToSync.forEach(key => {
                if (changes[key] && changes[key].newValue !== undefined) {
                    if (profiles[active][key] !== changes[key].newValue) {
                        profiles[active][key] = changes[key].newValue;
                        isChanged = true;
                    }
                }
            });

            if (isChanged) {
                chrome.storage.local.set({ profiles });
            }
        });
    }
});

// [БЕЗОПАСНО] Перехватчик пишет токен ТОЛЬКО в оперативную память (RAM)
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        let authToken = null;
        let profileId = null;
        let aid = null; // ID учебного года

        if (details.requestHeaders) {
            for (const header of details.requestHeaders) {
                const name = header.name.toLowerCase();
                if (name === 'authorization') {
                    authToken = header.value; 
                }
                if (name === 'profile-id') {
                    profileId = header.value; 
                }
                if (name === 'aid') {
                    aid = header.value;
                }
            }
        }

        // Записываем данные сессии строго в chrome.storage.session (RAM)
        if (authToken) {
            chrome.storage.session.set({
                currentBearerToken: authToken.replace('Bearer ', ''),
                currentProfileId: profileId || "",
                ...(aid && { currentAid: aid })
            });
        }
    },
    { urls: ["*://authedu.mosreg.ru/api/*"] },
    ["requestHeaders"]
);