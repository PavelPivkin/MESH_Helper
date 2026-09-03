// scripts/tools.js

(() => {
    // =========================================================================
    // 1. ИНСТРУМЕНТЫ (QR-ГЕНЕРАТОР И ПАНЕЛЬ)
    // =========================================================================
    /**
     * Создает панель утилит в шапке сайта и содержит логику генератора QR-кодов.
     * Позволяет быстро генерировать QR-коды для учеников (сохранение в PDF, печать).
     */
    (() => {
        const LOG = '[МЭШ][tools.js][QR-Tools]:';

        window.initTools = async () => {
            console.log(LOG, 'Запуск модуля инструментов...');
            const panel = await getPanel();
            if (panel && !document.getElementById('mshhlpr-tool-qr-btn')) initQrTool(panel);
        };

        const getPanel = () => new Promise(res => {
            const start = Date.now(), check = () => {
                let p = document.getElementById('mshhlpr-tools-panel');
                if (p) return res(p);
                let mc = document.querySelector('.FiCE_4mpW39ds__cWjtHm') || document.querySelector('button[data-qa-id="MenuItem"]')?.parentElement;
                if (mc) {
                    p = document.createElement('div'); p.id = 'mshhlpr-tools-panel'; p.className = 'mshhlpr-tools-panel';
                    mc.parentNode.insertBefore(p, mc); return res(p);
                }
                Date.now() - start > 10000 ? res(null) : setTimeout(check, 500);
            }; check();
        });

        const initQrTool = (panel) => {
            const btn = document.createElement('button');
            btn.id = 'mshhlpr-tool-qr-btn'; btn.className = 'mshhlpr-tool-btn'; btn.title = 'Открыть генератор QR-кода';
            btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M9 14v1m5-6h1m-6 0h1v1H9zm10 0v1M9 19h1m4 0h5v-5h-5v5z"/></svg><span>Генератор<br>QR-кодов</span>`;
            btn.onclick = () => {
                if (!window.QRious) return alert('Ошибка: Библиотека QRious не найдена!');
                
                document.querySelectorAll('.mshhlpr-modal-overlay').forEach(e => e.remove());
                const ov = document.createElement('div'); ov.className = 'mshhlpr-modal-overlay';
                ov.innerHTML = `<div class="mshhlpr-modal-content" style="width:500px;height:80vh;display:flex;flex-direction:column;padding:0"><div class="mshhlpr-modal-header mshhlpr-qr-header"><span>✨ Генератор QR-кода</span><button class="mshhlpr-modal-close">&times;</button></div><div class="mshhlpr-modal-body mshhlpr-qr-body"><div class="mshhlpr-qr-inputs"><div class="mshhlpr-qr-input-row"><input type="text" id="qr-input" class="mshhlpr-qr-input-field" placeholder="Введите ссылку или текст..."><button id="qr-paste" class="mshhlpr-universal-toggle-btn mshhlpr-qr-btn-small">📋 Вставить</button></div><input type="text" id="qr-label" class="mshhlpr-qr-input-field" placeholder="Добавить надпись..."></div><div class="mshhlpr-qr-preview-container"><div id="qr-label-preview" class="mshhlpr-qr-label-preview mshhlpr-hidden"></div><canvas id="qr-canvas" class="mshhlpr-qr-canvas mshhlpr-hidden"></canvas><div id="qr-loader" class="mshhlpr-qr-loader">Буфер обмена пуст. Введите текст...</div></div><div class="mshhlpr-qr-action-grid"><button id="qr-print" class="mshhlpr-universal-toggle-btn mshhlpr-qr-btn-action">🖨️ Печать</button><button id="qr-pdf" class="mshhlpr-universal-toggle-btn mshhlpr-qr-btn-action">📄 PDF</button><button id="qr-open" class="mshhlpr-universal-toggle-btn mshhlpr-qr-btn-action">👁️ Открыть</button></div></div></div>`;
                document.body.appendChild(ov);
                
                const cls = () => ov.remove();
                ov.querySelector('.mshhlpr-modal-close').onclick = cls;
                ov.onclick = e => e.target === ov && cls();

                const $ = s => ov.querySelector(s), [inp, lbl, prev, cvs, ldr] = [$('#qr-input'), $('#qr-label'), $('#qr-label-preview'), $('#qr-canvas'), $('#qr-loader')];
                const qr = new window.QRious({ element: cvs, size: 800 });

                const update = t => {
                    const ok = !!t.trim(); cvs.classList.toggle('mshhlpr-hidden', !ok); ldr.classList.toggle('mshhlpr-hidden', ok);
                    if (ok) qr.value = t;
                };

                lbl.oninput = () => { prev.textContent = lbl.value.trim(); prev.classList.toggle('mshhlpr-hidden', !lbl.value.trim()); };
                inp.oninput = () => update(inp.value);
                $('#qr-paste').onclick = async () => { try { const t = await navigator.clipboard.readText(); inp.value = t; update(t); } catch(e) { alert('Вставьте вручную (Ctrl+V)'); } };
                navigator.clipboard.readText().then(t => { if (t.trim()) { inp.value = t; update(t); } }).catch(()=>{});

                const html = (img, t) => `<html><head><title>${t}</title><style>@page{size:auto;margin:0}body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#fff}img{width:100vw;height:100vh;object-fit:contain}</style></head><body><img src="${img}" onload="window.focus();${t==='Печать'?'window.print()':''}"></body></html>`;
                const getImg = () => {
                    if (!lbl.value.trim()) return cvs;
                    const c = document.createElement('canvas'), ctx = c.getContext('2d'), th = Math.round(cvs.height * 0.12);
                    c.width = cvs.width; c.height = cvs.height + th;
                    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
                    ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${Math.round(cvs.height * 0.045)}px sans-serif`;
                    ctx.fillText(lbl.value.trim(), c.width / 2, th / 2); ctx.drawImage(cvs, 0, th);
                    return c;
                };

                $('#qr-print').onclick = () => { if(inp.value.trim()){ const f = document.createElement('iframe'); f.style.cssText = 'position:absolute;width:0;height:0;border:none'; document.body.appendChild(f); f.contentWindow.document.write(html(getImg().toDataURL(), 'Печать')); f.contentWindow.document.close(); setTimeout(()=>f.remove(), 1000); } };
                $('#qr-open').onclick = () => { if(inp.value.trim()) window.open().document.write(html(getImg().toDataURL(), 'QR-код')); };
                $('#qr-pdf').onclick = () => {
                    if(!inp.value.trim()) return;
                    const c = getImg(), b = atob(c.toDataURL('image/jpeg', 1.0).split(',')[1]), w = 595.28, h = 841.89;
                    let iw = w, ih = (c.height / c.width) * iw; if (ih > h) { ih = h; iw = (c.width / c.height) * ih; }
                    const dx = (w - iw) / 2, dy = (h - ih) / 2, out = [], offs = []; let off = 0;
                    const ap = s => { out.push(new Uint8Array([...s].map(x => x.charCodeAt(0)))); off += s.length; };
                    
                    ap("%PDF-1.3\n");
                    [ `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`, `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`, `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 4 0 R /Resources << /XObject << /I1 5 0 R >> >> >>\nendobj\n` ].forEach(s => { offs.push(off); ap(s); });
                    const st = `q\n${iw.toFixed(2)} 0 0 ${ih.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)} cm\n/I1 Do\nQ\n`;
                    offs.push(off); ap(`4 0 obj\n<< /Length ${st.length} >>\nstream\n${st}endstream\nendobj\n`);
                    offs.push(off); ap(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${b.length} >>\nstream\n`);
                    ap(b); ap("\nendstream\nendobj\n");
                    
                    const xo = off; ap(`xref\n0 6\n0000000000 65535 f \n`);
                    for(let i=1; i<=5; i++) ap(offs[i-1].toString().padStart(10, '0') + " 00000 n \n");
                    ap(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF\n`);
                    
                    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(out, { type: 'application/pdf' })); a.download = `QR_${Math.random().toString(36).substr(2,6).toUpperCase()}.pdf`; document.body.appendChild(a); a.click(); a.remove();
                };
            };
            panel.appendChild(btn);
        };
    })();

    // =========================================================================
    // 2. БЛОКИРОВЩИК КОНТЕНТА
    // =========================================================================
    /**
     * Скрывает ненужные элементы интерфейса МЭШ (рекламу, версию, футер).
     */
    (() => {
        window.initContentBlocker = () => {
            console.log('[МЭШ][tools.js][ContentBlocker] Инициализация.');
            if (document.getElementById('msh-cb-style')) return;
            const s = document.createElement('style'); s.id = 'msh-cb-style';
            s.innerHTML = '.Ye8apDO3Xo0-.k3hdo6KAAUc-, .OZl7vfGooEY-, .WQ53aIH17rw-.XbzdO3-e2w8-.DeFh-eomiJE-, .M1-QVz6YwA8- { display: none !important; }';
            document.head.appendChild(s);
        };
    })();

    // =========================================================================
    // 3. КНОПКА СВЯЗИ В MAX
    // =========================================================================
    /**
     * Добавляет кнопку "Написать в MAX" рядом со стандартной.
     */
    (() => {
        window.initMaxButton = () => {
            console.log('[МЭШ][tools.js][MaxButton] Инициализирован.');
            let sch = false;
            new MutationObserver(() => {
                if (sch) return; sch = true;
                requestAnimationFrame(() => {
                    const c = document.querySelector('.Zz52eqOAMeU-.rbrtfGqv-zM-.V07OAWmf3MA-, div.Zz52eqOAMeU-');
                    const w = c?.querySelector('button.CZdki5fD-9I-.BbWGknTpbnA-');
                    if (w && !c.querySelector('#msh-max-btn')) {
                        const b = w.cloneNode(true); b.id = 'msh-max-btn';
                        b.style.cssText = 'background:linear-gradient(135deg,#4caf50,#2e7d32)!important;color:#000!important;margin:0 8px 0 0!important;flex-shrink:0!important;cursor:pointer!important;border:1px solid rgba(0,0,0,0.15)!important;';
                        const inD = b.querySelector('div');
                        if (inD) {
                            inD.style.cssText = 'display:flex!important;align-items:center!important;color:#000!important;padding:0 4px!important;';
                            inD.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right:8px;color:#fff"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/><circle cx="12" cy="10" r="2"/><circle cx="7" cy="10" r="2"/><circle cx="17" cy="10" r="2"/></svg><span style="font-weight:bold;white-space:nowrap;color:#000">Написать Храмцову А.К. в MAX</span>`;
                        }
                        w.before(b);
                        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); window.open('https://web.max.ru/u/f9LHodD0cOIsC8R474ssCmngGgzkR08a4xgM4aDzYqR3QQQW0HWmK_RmzME', '_blank'); }, true);
                    }
                    sch = false;
                });
            }).observe(document.body, { childList: true, subtree: true });
        };
    })();

    // =========================================================================
    // 4. ОБ АВТОРЕ (АВАТАРКА И МОДАЛЬНОЕ ОКНО)
    // =========================================================================
    /**
     * Заменяет аватарку пользователя и выводит модалку об авторе.
     */
    (() => {
        window.initAboutMe = () => {
            console.log('[МЭШ][tools.js][AboutMe] Инициализирован.');
            let sch = false;
            new MutationObserver(() => {
                if (sch) return; sch = true;
                requestAnimationFrame(() => {
                    const c = document.querySelector('button[data-test-component="schoolButtonChoice"] .Uk9WOebWsBGRQNio');
                    if (c && !c.querySelector('.msh-author-av')) {
                        c.style.cssText = 'overflow:visible;pointer-events:auto;background:transparent;box-shadow:none;';
                        c.innerHTML = `<img src="${chrome.runtime.getURL('icons/Andrusha.png')}" class="msh-author-av" alt="Об авторе" style="width:44px;height:44px;border-radius:4px;object-fit:cover;cursor:pointer;pointer-events:auto;transition:transform .25s;border:none;display:block;position:relative;z-index:100;outline:none">`;
                        const img = c.querySelector('.msh-author-av');
                        img.onmouseover = () => img.style.transform = 'scale(1.4) translateY(-2px)';
                        img.onmouseout = () => img.style.transform = 'none';
                        img.addEventListener('click', e => {
                            e.preventDefault(); e.stopImmediatePropagation();
                            document.getElementById('msh-abt-modal')?.remove();
                            let v = 'v.1.0'; try { const m = chrome.runtime.getManifest(); v = m.version_name || `v.${m.version}`; } catch(e){}
                            const ov = document.createElement('div'); ov.id = 'msh-abt-modal'; ov.className = 'mshhlpr-modal-overlay';
                            ov.innerHTML = `<div class="mshhlpr-modal-content"><div class="mshhlpr-modal-header"><span>✨ Об авторе расширения</span><button class="mshhlpr-modal-close">&times;</button></div><div class="mshhlpr-modal-body"><div class="mshhlpr-modal-info"><div class="mshhlpr-modal-subtitle">Создатель «МЭШ Помогатора»</div><div class="mshhlpr-modal-title">Храмцов Андрей<br>Константинович</div><div class="mshhlpr-modal-badges"><span class="mshhlpr-badge mshhlpr-badge-green">👨‍🏫 Учитель информатики (МАОУ СОШ №5 г. Балашиха)</span><span class="mshhlpr-badge mshhlpr-badge-blue">🎓 Магистрант ГУП (бывш. МГОУ)</span></div><div class="mshhlpr-modal-desc" style="padding-top:15px;border-top:1px solid #eee;margin-top:15px">Разработано как часть дипломной работы, но главная<br>цель проекта — <b>избавить коллег от рутины</b>.<br>Расширение автоматизирует скучные процессы,<br>дополняет интерфейс и возвращает вам время для<br>творчества и реальной работы с детьми!</div><div class="mshhlpr-modal-contacts">Вы можете выразить поддержку автору по ссылке:<br><a href="https://vk.com/dyusha_sweet" target="_blank" class="mshhlpr-vk-link">VK: @dyusha_sweet</a></div></div><div class="mshhlpr-modal-photo"><img src="${chrome.runtime.getURL('icons/Andreyka.jpg')}" alt="Автор"></div></div><div class="mshhlpr-modal-footer"><span>Сделано с ❤️ для коллег</span><span class="mshhlpr-modal-version">МЭШ Помогатор ${v}</span></div></div>`;
                            document.body.appendChild(ov);
                            const cls = () => ov.remove(); ov.querySelector('.mshhlpr-modal-close').onclick = cls; ov.onclick = ev => ev.target === ov && cls();
                        }, true);
                    }
                    sch = false;
                });
            }).observe(document.body, { childList: true, subtree: true });
        };
    })();

    // =========================================================================
    // 5. ИДЕНТИФИКАЦИЯ УЧИТЕЛЯ (АКТИВНЫЙ ПРОФИЛЬ)
    // =========================================================================
    /**
     * Определяет ФИО авторизованного учителя по токену и управляет профилями кэша.
     */
    (() => {
        window.initIdentity = () => {
            console.log('[МЭШ][tools.js][Identity] Запущен.');
            
            const isValid = t => {
                try {
                    const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(t.split('.')[1].length + (4 - t.split('.')[1].length % 4) % 4, '=')));
                    return (p.exp - Date.now() / 1000) > 60;
                } catch { return false; }
            };

            const fetchProfile = (token, pid) => {
                fetch("https://authedu.mosreg.ru/api/ej/acl/v1/sessions", {
                    method: "POST", headers: { "accept": "application/json", "authorization": `Bearer ${token}`, "content-type": "application/json", "profile-id": pid || "", "x-mes-hostid": "9", "x-mes-roleid": "9", "x-mes-subsystem": "teacherweb" }, body: JSON.stringify({ auth_token: token })
                }).then(r => r.ok ? r.json() : null).then(d => {
                    if (d?.first_name && d?.last_name) {
                        const name = `${d.last_name} ${d.first_name} ${d.middle_name || ""}`.trim();
                        sessionStorage.setItem('msh_identity_resolved', 'true');
                        chrome.storage.local.get(['activeTeacher', 'profiles', 'extensionEnabled', 'zipScheduleEnabled'], res => {
                            if (res.activeTeacher === name) return;
                            const p = res.profiles || {};
                            if (!p[name]) p[name] = { extensionEnabled: res.extensionEnabled !== false, zipScheduleEnabled: res.zipScheduleEnabled !== false };
                            chrome.storage.local.set({ activeTeacher: name, profiles: p, extensionEnabled: p[name].extensionEnabled, zipScheduleEnabled: p[name].zipScheduleEnabled });
                        });
                    }
                }).catch(()=>{});
            };

            chrome.storage.local.get(['activeTeacher'], l => chrome.storage.session.get(['currentBearerToken', 'currentProfileId'], s => {
                if (l.activeTeacher && isValid(s.currentBearerToken)) return sessionStorage.setItem('msh_identity_resolved', 'true');
                if (isValid(s.currentBearerToken) && !sessionStorage.getItem('msh_identity_resolved')) fetchProfile(s.currentBearerToken, s.currentProfileId);
            }));

            chrome.storage.onChanged.addListener((c, a) => {
                if (a === 'session' && c.currentBearerToken && !sessionStorage.getItem('msh_identity_resolved') && isValid(c.currentBearerToken.newValue)) {
                    chrome.storage.session.get(['currentProfileId'], s => fetchProfile(c.currentBearerToken.newValue, s.currentProfileId));
                }
            });
        };
    })();

    // =========================================================================
    // 6. МОНИТОРИНГ СЕТИ И СЕССИИ (АВТОЗАПУСК)
    // =========================================================================
    /**
     * Пингует API каждые 2 минуты, выводя Toast-уведомление при разрыве связи.
     */
    (() => {
        console.log('[МЭШ][tools.js][CheckStatus] Запущен.');
        let tmr = null, init = true, col = false;
        const valid = () => { try { return !!chrome?.runtime?.id; } catch { if(tmr) clearInterval(tmr); return false; } };
        const save = s => valid() && chrome.storage.session.set({ msh_network_status: s }).catch(()=>{});

        const check = async () => {
            if (document.hidden || !valid()) return;
            let s = { internet: 'online', mesh: 'online', session: 'active', timestamp: Date.now() };
            if (!navigator.onLine) { s.internet = 'offline'; s.mesh = s.session = 'unknown'; return save(s); }
            if (init) { init = false; return save(s); }

            const ctrl = new AbortController(), tid = setTimeout(() => ctrl.abort(), 10000);
            try {
                const { currentBearerToken: t, currentProfileId: p } = await chrome.storage.session.get(['currentBearerToken', 'currentProfileId']);
                const r = await fetch("https://authedu.mosreg.ru/api/ej/acl/v1/sessions", { method: "POST", headers: { "accept": "application/json", "content-type": "application/json", "x-mes-hostid": "9", "x-mes-roleid": "9", "x-mes-subsystem": "teacherweb", ...(t && {"authorization": `Bearer ${t}`}), ...(p && {"profile-id": p}) }, body: JSON.stringify({ auth_token: t || "" }), signal: ctrl.signal });
                if ([401, 403].includes(r.status)) s.session = 'expired'; else if (!r.ok) { s.mesh = 'offline'; s.session = 'unknown'; }
            } catch { s.mesh = 'offline'; s.session = 'unknown'; } finally { clearTimeout(tid); }
            save(s);
        };

        const updateUI = s => {
            const bad = s.internet !== 'online' || s.mesh !== 'online' || s.session !== 'active';
            let t = document.getElementById('mshhlpr-status-toast');
            if (!bad) { t?.remove(); col = false; return; }

            const txt = s.internet !== 'online' ? 'Потеряно подключение к Интернету.' : s.mesh !== 'online' ? 'Школьный портал недоступен.' : 'Ваша сессия истекла. Обновите страницу.';
            if (!t) {
                t = document.createElement('div'); t.id = 'mshhlpr-status-toast'; t.className = 'mshhlpr-sidebar-container mshhlpr-sidebar-transition mshhlpr-status-red';
                t.innerHTML = `<div id="msh-st-exp" style="display:flex;flex-direction:column;width:100%;height:100%"><div id="msh-st-hdr" class="mshhlpr-status-red-header"><span>⚠️ Проблема соединения</span><span style="font-size:11px">▼</span></div><div class="mshhlpr-status-red-body"></div></div><div id="msh-st-col" title="Проблемы с соединением">!</div>`;
                document.body.appendChild(t);
                t.querySelector('#msh-st-hdr').onclick = e => { e.stopPropagation(); col = true; updateUI(s); };
                t.onclick = e => { if (t.classList.contains('mshhlpr-sidebar-collapsed')) { e.stopPropagation(); col = false; updateUI(s); } };
            }
            t.querySelector('.mshhlpr-status-red-body').textContent = txt;
            t.classList.toggle('mshhlpr-sidebar-collapsed', col); t.classList.toggle('mshhlpr-sidebar-expanded', !col);
        };

        chrome.storage.onChanged.addListener((c, a) => { if (valid() && a === 'session' && c.msh_network_status) updateUI(c.msh_network_status.newValue); });
        window.addEventListener('online', check); window.addEventListener('offline', check); document.addEventListener('visibilitychange', () => !document.hidden && check());
        check(); tmr = setInterval(check, 120000);
    })();

    // =========================================================================
    // 7. ТУМБЛЕР РАСШИРЕНИЯ (АКТИВАЦИЯ/ДЕАКТИВАЦИЯ)
    // =========================================================================
    /**
     * Внедряет переключатель (тумблер) для полного отключения расширения 
     * прямо в левое боковое меню сайта МЭШ.
     */
    (() => {
        console.log('[МЭШ][tools.js][ExtensionToggle] Инициализация.');

        const initToggle = () => {
            const container = document.querySelector('div.Vg9HLOeW2ZECug7o');
            if (!container || container.querySelector('#mesh-extension-toggle-item')) return;

            document.querySelectorAll('#mesh-extension-toggle-item').forEach(el => el.remove());
            const targetBtn = Array.from(container.querySelectorAll('button[data-qa-id="MenuItem"]')).find(b => b.textContent.includes('Кабинет учителя'));
            if (!targetBtn) return;

            const label = document.createElement('label');
            label.id = 'mesh-extension-toggle-item';
            label.className = 'mshhlpr-universal-toggle-btn';
            label.style.marginBottom = '8px';
            label.innerHTML = `<span class="mshhlpr-universal-toggle-text">МЭШ Помогатор</span><div class="mshhlpr-ios-switch"><input type="checkbox" id="mesh-main-toggle-input"><span class="mshhlpr-ios-slider"></span></div>`;
            container.insertBefore(label, targetBtn);

            const cb = document.getElementById('mesh-main-toggle-input');
            chrome.storage.local.get(['extensionEnabled'], r => { if(cb) cb.checked = r.extensionEnabled !== false; });
            cb.addEventListener('change', e => chrome.storage.local.set({ extensionEnabled: e.target.checked }));
        };

        chrome.storage.onChanged.addListener((c, a) => {
            if (a === 'local' && c.extensionEnabled) {
                const cb = document.getElementById('mesh-main-toggle-input');
                if (cb) cb.checked = c.extensionEnabled.newValue !== false;
            }
        });

        let sch = false;
        new MutationObserver(() => {
            if (sch) return; sch = true;
            requestAnimationFrame(() => { initToggle(); sch = false; });
        }).observe(document.body, { childList: true, subtree: true });

        if (document.readyState === 'complete' || document.readyState === 'interactive') initToggle();
        else window.addEventListener('DOMContentLoaded', initToggle);
    })();
})();