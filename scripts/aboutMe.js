// scripts/aboutMe.js

(function() {
    window.initAboutMe = function() {
        console.log('[МЭШ][aboutMe.js] Модуль "Об авторе" инициализирован.');

        function checkAndInsertAvatar() {
            const targetBtn = document.querySelector('button[data-test-component="schoolButtonChoice"]');
            
            if (!targetBtn) return;
            
            const iconContainer = targetBtn.querySelector('.Uk9WOebWsBGRQNio');
            if (!iconContainer) return;
            
            const existingAvatar = iconContainer.querySelector('.mshhlpr-author-avatar');
            
            if (!existingAvatar) {
                console.log('[МЭШ][aboutMe.js] Целевая кнопка найдена, устанавливаем аватарку.');
                
                iconContainer.style.cssText = 'overflow: visible; pointer-events: auto; background: transparent; box-shadow: none;';
                
                const imgUrl = chrome.runtime.getURL('icons/Andrusha.png');
                iconContainer.innerHTML = `<img src="${imgUrl}" class="mshhlpr-author-avatar" alt="Об авторе">`;
                
                const avatarImg = iconContainer.querySelector('.mshhlpr-author-avatar');
                
                avatarImg.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopImmediatePropagation(); // Достаточно для предотвращения всплытия и других обработчиков
                    
                    console.log('[МЭШ][aboutMe.js] Клик по аватарке, открываем модалку.');
                    openAboutModal();
                }, true);
            }
        }

        let isScheduled = false;

        const observer = new MutationObserver(() => {
            if (!isScheduled) {
                isScheduled = true;
                window.requestAnimationFrame(() => {
                    checkAndInsertAvatar();
                    isScheduled = false;
                });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    };

    function openAboutModal() {
        // Защита от дублирования: удаляем старое окно, если оно не закрылось корректно
        const existingModal = document.getElementById('mesh-about-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Динамически получаем отображаемую версию из manifest.json (поле version_name)
        let displayVersion = 'v.1.0';
        try {
            const manifest = chrome.runtime.getManifest();
            displayVersion = manifest.version_name || `v.${manifest.version}`;
        } catch (error) {
            console.error('[МЭШ][aboutMe.js] Ошибка при получении манифеста:', error);
        }

        const avatarUrl = chrome.runtime.getURL('icons/Andreyka.jpg');
        const overlay = document.createElement('div');
        overlay.id = 'mesh-about-modal';
        overlay.className = 'mshhlpr-modal-overlay';
        
        overlay.innerHTML = `
            <div class="mshhlpr-modal-content">
                <div class="mshhlpr-modal-header">
                    <span>✨ Об авторе расширения</span>
                    <button class="mshhlpr-modal-close">&times;</button>
                </div>
                
                <div class="mshhlpr-modal-body">
                    <div class="mshhlpr-modal-info">
                        <div class="mshhlpr-modal-subtitle">Создатель «МЭШ Помогатора»</div>
                        <div class="mshhlpr-modal-title">Храмцов Андрей<br>Константинович</div>
                        
                        <div class="mshhlpr-modal-badges">
                            <span class="mshhlpr-badge mshhlpr-badge-green">👨‍🏫 Учитель информатики (МАОУ СОШ №5 г. Балашиха)</span>
                            <span class="mshhlpr-badge mshhlpr-badge-blue">🎓 Магистрант ГУП (бывш. МГОУ)</span>
                        </div>

                        <div class="mshhlpr-modal-desc">
                            Разработано как часть дипломной работы, но главная<br>
                            цель проекта — <b>избавить коллег от рутины</b>.<br>
                            Расширение автоматизирует скучные процессы,<br>
                            дополняет интерфейс и возвращает вам время для<br>
                            творчества и реальной работы с детьми!
                        </div>

                        <div class="mshhlpr-modal-contacts">
                            Вы можете выразить поддержку автору (и связаться с<br>ним) по ссылке:<br>
                            <a href="https://vk.com/dyusha_sweet" target="_blank" class="mshhlpr-vk-link">VK: @dyusha_sweet</a>
                        </div>
                    </div>
                    
                    <div class="mshhlpr-modal-photo">
                        <img src="${avatarUrl}" alt="Фото автора">
                    </div>
                </div>

                <div class="mshhlpr-modal-footer">
                    <span>Сделано с ❤️ для коллег</span>
                    <span class="mshhlpr-modal-version">МЭШ Помогатор ${displayVersion}</span>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeModal = () => {
            console.log('[МЭШ][aboutMe.js] Модалка закрыта.');
            overlay.remove();
        };

        overlay.querySelector('.mshhlpr-modal-close').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    }
})();