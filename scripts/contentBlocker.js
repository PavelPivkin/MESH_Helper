// scripts/contentBlocker.js

window.initContentBlocker = function () {
    console.log('[МЭШ][contentBlocker.js] Инициализация блокировщика контента.');

    // 1. Собираем все селекторы элементов для скрытия в один массив
    const selectors = [
        '.Ye8apDO3Xo0-.k3hdo6KAAUc-', // Версия
        '.OZl7vfGooEY-',             // Кнопки магазинов
        '.WQ53aIH17rw-.XbzdO3-e2w8-.DeFh-eomiJE-', // Логотип/панель снизу
        '.M1-QVz6YwA8-'              // Пользовательское соглашение
    ];

    // 2. Проверяем, не добавляли ли мы уже этот стиль (защита от двойного запуска)
    if (document.getElementById('mesh-content-blocker-style')) {
        return;
    }

    // 3. Динамически создаем стили для мгновенного скрытия
    const style = document.createElement('style');
    style.id = 'mesh-content-blocker-style';
    style.innerHTML = `
        ${selectors.join(', ')} {
            display: none !important;
        }
    `;
    
    document.head.appendChild(style);
};