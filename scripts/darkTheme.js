// scripts/darkTheme.js

(() => {
    const STYLE_ID = 'mshhlpr-dark-theme-styles';
    const STACK_STYLE_ID = 'mshhlpr-stack-styles';
    const DARK_CLASS = 'mshhlpr-dark-mode';

    const STACK_CSS = `
        #mshhlpr-header-toggle-stack{display:inline-flex!important;flex-direction:column!important;justify-content:center!important;gap:3px!important;margin-right:8px!important;vertical-align:middle!important;flex-shrink:0!important;min-width:138px!important}
        #mshhlpr-header-toggle-stack .mshhlpr-universal-toggle-btn{height:24px!important;min-height:24px!important;max-height:24px!important;padding:0 8px!important;margin:0!important;border-radius:6px!important;width:100%!important;box-sizing:border-box!important;display:inline-flex!important;justify-content:space-between!important;align-items:center!important}
        #mshhlpr-header-toggle-stack .mshhlpr-universal-toggle-text{font-size:11px!important;font-weight:600!important;white-space:nowrap!important;line-height:1!important}
        #mshhlpr-header-toggle-stack .mshhlpr-ios-switch{width:28px!important;height:15px!important;flex-shrink:0!important}
        #mshhlpr-header-toggle-stack .mshhlpr-ios-slider{border-radius:15px!important}
        #mshhlpr-header-toggle-stack .mshhlpr-ios-slider:before{height:11px!important;width:11px!important;left:2px!important;bottom:2px!important}
        #mshhlpr-header-toggle-stack input:checked+.mshhlpr-ios-slider:before{transform:translateX(13px)!important}
    `;

    const DARK_CSS = `
        html.${DARK_CLASS}{filter:invert(1) hue-rotate(180deg)!important;background-color:#121212!important}
        html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"],html.${DARK_CLASS} div[data-qa-id="Header"],html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"],html.${DARK_CLASS} img,html.${DARK_CLASS} svg image,html.${DARK_CLASS} image,html.${DARK_CLASS} video,html.${DARK_CLASS} iframe,html.${DARK_CLASS} [style*="background-image"],html.${DARK_CLASS} [style*="background: url"],html.${DARK_CLASS} [style*="background:url"],html.${DARK_CLASS} .mshhlpr-emoji,html.${DARK_CLASS} .mshhlpr-loader-icon,html.${DARK_CLASS} .mshhlpr-modal-header,html.${DARK_CLASS} #mshhlpr-sidebar-header,html.${DARK_CLASS} .mshhlpr-universal-toggle-btn:not([class*="YKSuD_1gBgYqYImk"] *),html.${DARK_CLASS} #msh-max-btn,html.${DARK_CLASS} .mshhlpr-btn:not(#msh-af-btn),html.${DARK_CLASS} .mshhlpr-modal-photo img,html.${DARK_CLASS} #mesh-wheel-canvas,html.${DARK_CLASS} .mshhlpr-qr-preview-container,html.${DARK_CLASS} td.mshhlpr-final-correct,html.${DARK_CLASS} td.mshhlpr-final-missing,html.${DARK_CLASS} td.mshhlpr-final-wrong,html.${DARK_CLASS} .mshhlpr-bg-error,html.${DARK_CLASS} .mshhlpr-rainbow-bg,html.${DARK_CLASS} .mesh-zh,html.${DARK_CLASS} .msh-injected-cab,html.${DARK_CLASS} #mshhlpr-status-toast,html.${DARK_CLASS} #mshhlpr-ktp-notify-root,html.${DARK_CLASS} #mshhlpr-global-stat-tooltip{filter:invert(1) hue-rotate(180deg)!important}
        html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"] *,html.${DARK_CLASS} div[data-qa-id="Header"] *,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] *,html.${DARK_CLASS} .mshhlpr-universal-toggle-btn *,html.${DARK_CLASS} #msh-max-btn *,html.${DARK_CLASS} .mshhlpr-qr-preview-container *{filter:none!important}
        html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"],html.${DARK_CLASS} div[data-qa-id="Header"]{background:#141724!important;border-bottom:1px solid rgba(255,255,255,0.08)!important;box-shadow:0 2px 8px rgba(0,0,0,0.3)!important}
        html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"]{background:#10131e!important;border-right:1px solid rgba(255,255,255,0.08)!important;box-shadow:2px 0 10px rgba(0,0,0,0.3)!important}
        html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"] svg.VGJMG8xK86IYTaBf path,html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"] [data-qa-id="UserInfo"] span,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] [data-test-component="selectAcademicYear"] span,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] button[data-test-component="mainMenuBurger"] svg path{fill:#fff!important;color:#fff!important}
        html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"] button[data-qa-id="MenuItem"],html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] a[data-test-component^="mainNavigationLink"]{color:#d1d5db!important;background:transparent!important;transition:all .2s!important}
        html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"] button[data-qa-id="MenuItem"]:hover,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] a[data-test-component^="mainNavigationLink"]:hover{color:#fff!important;background:rgba(255,255,255,0.08)!important;border-radius:6px!important}
        html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"] button[data-qa-id="MenuItem"].Js0c2_xvPCw_1LgY,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] a[aria-current="page"]{background:rgba(76,175,80,0.2)!important;color:#4caf50!important;border-radius:6px!important}
        html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"] [data-qa-id="UserInfo"] .BSbI21eZ3RM9SS72,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] [data-test-component^="mainNavigationGroupLabel"],html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] .dqXl3QZcPaUz64sa{color:#94a3b8!important}
        html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] a[data-test-component^="mainNavigationLink"] svg,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] a[data-test-component^="mainNavigationLink"] svg path,html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"] button[data-qa-id="MenuItem"] svg{fill:currentColor!important;color:inherit!important}
        html.${DARK_CLASS} [class*="YKSuD_1gBgYqYImk"] [data-qa-id="Messages"] svg path,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] [data-test-component="selectAcademicYear"] svg path,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] [data-test-component="saveArchiveButton"] svg path{fill:#d1d5db!important}
        html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] [data-test-component="selectAcademicYear"]{background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:6px!important}
        html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] [data-test-component="selectAcademicYear"] div,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] .PHAz0X8vqxsX42Mh,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] .cDVW_Y0Yl7cSo1XH,html.${DARK_CLASS} [class*="iudEEv9UsI1DjYxw"] .r26k8lNdGIUa72mq{background:transparent!important}
        html.${DARK_CLASS} .mshhlpr-day-stats-inline,html.${DARK_CLASS} .mshhlpr-total-column,html.${DARK_CLASS} .mshhlpr-stat-stack{background:transparent!important}
        html.${DARK_CLASS} .mshhlpr-stat-pill{filter:none!important;background:rgba(229,57,53,0.2)!important;color:#ff8a80!important;border:1px dashed rgba(239,83,80,0.6)!important}
        html.${DARK_CLASS} .mshhlpr-total-mini{color:#81c784!important}
        html.${DARK_CLASS} .mshhlpr-modal-overlay{background-color:rgba(255,255,255,0.45)!important}
        html.${DARK_CLASS} .mshhlpr-qr-preview-container{background:#fff!important;border-color:#ccc!important}
        html.${DARK_CLASS} .mshhlpr-emoji,html.${DARK_CLASS} .mshhlpr-loader-icon{display:inline-block!important;vertical-align:middle!important}
    `;

    let isExtensionEnabled = true, isDarkThemeEnabled = false, throttle = null;
    const EMOJI_REGEX = /(\p{Extended_Pictographic})/gu;

    const injectCss = (id, css) => {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('style');
            el.id = id;
            el.textContent = css;
            (document.head || document.documentElement).appendChild(el);
        }
    };

    const removeCss = (id) => document.getElementById(id)?.remove();

    const enforceProtection = (on) => {
        document.querySelectorAll('[class*="YKSuD_1gBgYqYImk"], div[data-qa-id="Header"], [class*="iudEEv9UsI1DjYxw"]').forEach(el => {
            on ? el.style.setProperty('filter', 'invert(1) hue-rotate(180deg)', 'important') : el.style.removeProperty('filter');
        });
    };

    const injectDarkToggle = () => {
        injectCss(STACK_STYLE_ID, STACK_CSS);
        const mainToggle = document.getElementById('mesh-extension-toggle-item');
        let darkLabel = document.getElementById('mesh-dark-theme-toggle-item');

        if (!isExtensionEnabled) {
            if (darkLabel) darkLabel.style.setProperty('display', 'none', 'important');
            return;
        }
        if (!mainToggle) return;

        let stack = document.getElementById('mshhlpr-header-toggle-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.id = 'mshhlpr-header-toggle-stack';
            mainToggle.parentNode.insertBefore(stack, mainToggle);
            stack.appendChild(mainToggle);
        }

        if (!darkLabel) {
            darkLabel = document.createElement('label');
            darkLabel.id = 'mesh-dark-theme-toggle-item';
            darkLabel.className = 'mshhlpr-universal-toggle-btn';
            darkLabel.innerHTML = `<span class="mshhlpr-universal-toggle-text">Тёмная тема</span><div class="mshhlpr-ios-switch"><input type="checkbox" id="mesh-dark-toggle-input"><span class="mshhlpr-ios-slider"></span></div>`;
            darkLabel.querySelector('input').addEventListener('change', e => chrome.storage.local.set({ darkThemeEnabled: e.target.checked }));
        }

        if (darkLabel.parentNode !== stack) stack.appendChild(darkLabel);
        darkLabel.style.setProperty('display', 'inline-flex', 'important');
        const darkCb = document.getElementById('mesh-dark-toggle-input');
        if (darkCb) darkCb.checked = isDarkThemeEnabled;
    };

    const scanAndWrapEmojis = (root) => {
        if (!root || !isExtensionEnabled || !isDarkThemeEnabled) return;

        const run = () => {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode: (n) => (n.nodeValue && EMOJI_REGEX.test(n.nodeValue) && n.parentElement && !['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(n.parentElement.tagName) && !n.parentElement.closest('.mshhlpr-emoji, [class*="YKSuD_1gBgYqYImk"], [class*="iudEEv9UsI1DjYxw"]')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
            });
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(n => {
                const frag = document.createDocumentFragment();
                let idx = 0;
                n.nodeValue.replace(EMOJI_REGEX, (match, em, offset) => {
                    if (offset > idx) frag.appendChild(document.createTextNode(n.nodeValue.slice(idx, offset)));
                    const sp = document.createElement('span');
                    sp.className = 'mshhlpr-emoji';
                    sp.textContent = em;
                    frag.appendChild(sp);
                    idx = offset + match.length;
                });
                if (idx < n.nodeValue.length) frag.appendChild(document.createTextNode(n.nodeValue.slice(idx)));
                n.parentNode?.replaceChild(frag, n);
            });
        };

        'requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 1000 }) : setTimeout(run, 60);
    };

    const applyTheme = () => {
        const on = isExtensionEnabled && isDarkThemeEnabled;
        document.documentElement.classList.toggle(DARK_CLASS, on);
        on ? injectCss(STYLE_ID, DARK_CSS) : removeCss(STYLE_ID);
        enforceProtection(on);
        injectDarkToggle();
        if (on) scanAndWrapEmojis(document.body);
    };

    injectCss(STACK_STYLE_ID, STACK_CSS);

    chrome.storage.local.get(['extensionEnabled', 'darkThemeEnabled'], r => {
        isExtensionEnabled = r.extensionEnabled !== false;
        isDarkThemeEnabled = r.darkThemeEnabled === true;
        applyTheme();
    });

    chrome.storage.onChanged.addListener((c, a) => {
        if (a === 'local' && (c.extensionEnabled || c.darkThemeEnabled)) {
            if (c.extensionEnabled) isExtensionEnabled = c.extensionEnabled.newValue !== false;
            if (c.darkThemeEnabled) isDarkThemeEnabled = c.darkThemeEnabled.newValue !== false;
            applyTheme();
        }
    });

    new MutationObserver((muts) => {
        if (muts) muts.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && isExtensionEnabled && isDarkThemeEnabled && scanAndWrapEmojis(n)));
        if (throttle) return;
        throttle = setTimeout(() => {
            if (isExtensionEnabled && isDarkThemeEnabled && !document.documentElement.classList.contains(DARK_CLASS)) {
                document.documentElement.classList.add(DARK_CLASS);
            }
            isExtensionEnabled && isDarkThemeEnabled ? injectCss(STYLE_ID, DARK_CSS) : removeCss(STYLE_ID);
            enforceProtection(isExtensionEnabled && isDarkThemeEnabled);
            injectDarkToggle();
            throttle = null;
        }, 350);
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

})();