# Privacy Policy / Политика конфиденциальности
**Effective Date:** 01.09.2023 / **Дата вступления в силу:** 01.09.2023

---

## English Version

This Privacy Policy describes how the "МЭШ Помогатор" (hereinafter "Extension") handles your data. 

**1. Data Collection and Usage**
The Extension **DOES NOT** collect, transmit, distribute, or sell any personal data, passwords, or user analytics to any third-party servers. All data processing happens entirely locally on your device within the browser.

**2. Use of Permissions (`webRequest`)**
The Extension requires the `webRequest` permission strictly for technical operation. 
- It intercepts the network request exclusively to the first-party domain `authedu.mosreg.ru` to read the `Authorization` header (Bearer token) and `profile-id`. 
- This token is saved **securely and temporarily in the browser's RAM** (`chrome.storage.session`) and is destroyed when the browser is closed.
- The token is used solely to make necessary API calls back to the same official `authedu.mosreg.ru` domain to provide the Extension's core features (e.g., fetching schedule data, checking network status).

**3. Data Storage**
- User preferences (e.g., toggle states, bell schedule text) are saved locally using `chrome.storage.local`. 
- We do not have access to this data.

**4. Third Parties**
We do not sell, trade, or otherwise transfer your information to outside parties.

**Contact**
If you have any questions regarding this Privacy Policy, you can contact the developer via GitHub Issues in the project repository.

---

## Русская Версия

Данная Политика конфиденциальности описывает, как расширение "МЭШ Помогатор" (далее "Расширение") работает с вашими данными.

**1. Сбор и использование данных**
Расширение **НЕ** собирает, не передает, не распространяет и не продает ваши персональные данные, пароли или аналитику на сторонние серверы. Вся обработка данных происходит исключительно локально на вашем устройстве внутри браузера.

**2. Использование разрешений (`webRequest`)**
Расширению требуется разрешение `webRequest` исключительно для технической работы:
- Оно перехватывает сетевой запрос только к официальному домену `authedu.mosreg.ru`, чтобы прочитать заголовок `Authorization` (токен) и `profile-id`.
- Этот токен сохраняется **безопасно и временно в оперативной памяти браузера** (`chrome.storage.session`) и безвозвратно уничтожается при закрытии вкладки/браузера.
- Токен используется только для выполнения необходимых API-запросов к тому же официальному домену `authedu.mosreg.ru` для работы функций расширения (например, скрытие расписания, проверка статуса сети).

**3. Хранение данных**
- Пользовательские настройки (состояние тумблеров, текст расписания звонков) сохраняются локально с помощью `chrome.storage.local`.
- Разработчик не имеет доступа к этим данным.

**4. Передача третьим лицам**
Мы не продаем, не обмениваем и никаким иным образом не передаем вашу информацию третьим лицам.

**Контакты**
Если у вас есть вопросы по Политике конфиденциальности, вы можете связаться с разработчиком через создание Issue в репозитории проекта на GitHub.