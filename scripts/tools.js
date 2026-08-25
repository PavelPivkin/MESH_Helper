// scripts/tools.js

(() => {
    const LOG_TAG = '[МЭШ Помогатор][Tools]:';

    window.initTools = async function() {
        console.log(LOG_TAG, 'Запуск модуля инструментов...');
        const toolsPanel = await getOrCreateToolsPanel();
        if (toolsPanel) initQrTool(toolsPanel);
    };

    async function getOrCreateToolsPanel() {
        return new Promise(resolve => {
            const start = Date.now();
            const check = () => {
                let panel = document.getElementById('mshhlpr-tools-panel');
                if (panel) return resolve(panel);
                let menuContainer = document.querySelector('.FiCE_4mpW39ds__cWjtHm') || document.querySelector('button[data-qa-id="MenuItem"]')?.parentElement;
                if (menuContainer) {
                    panel = document.createElement('div');
                    panel.id = 'mshhlpr-tools-panel';
                    panel.className = 'mshhlpr-tools-panel';
                    menuContainer.parentNode.insertBefore(panel, menuContainer);
                    return resolve(panel);
                }
                if (Date.now() - start > 10000) return resolve(null);
                setTimeout(check, 500);
            };
            check();
        });
    }

    function createModal(width, height, html) {
        document.querySelectorAll('.mshhlpr-modal-overlay').forEach(el => el.remove());
        const ov = document.createElement('div'); 
        ov.className = 'mshhlpr-modal-overlay';
        ov.innerHTML = `<div class="mshhlpr-modal-content" style="width:${width}; height:${height}; max-width:95vw; max-height:90vh; display:flex; flex-direction:column; padding:0; overflow:hidden;">${html}</div>`;
        document.body.appendChild(ov);
        const close = () => ov.remove();
        ov.addEventListener('click', e => { if (e.target === ov) close(); });
        const closeBtn = ov.querySelector('.mshhlpr-modal-close');
        if (closeBtn) closeBtn.onclick = close;
        return { ov, close };
    }

    function initQrTool(panel) {
        if (document.getElementById('mshhlpr-tool-qr-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'mshhlpr-tool-qr-btn';
        btn.className = 'mshhlpr-tool-btn';
        btn.title = 'Открыть генератор QR-кода';
        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><path d="M9 14v1"></path><path d="M14 9h1"></path><path d="M9 9h1v1H9z"></path><path d="M19 9v1"></path><path d="M9 19h1"></path><path d="M14 19h5v-5h-5v5z"></path></svg><span>Генератор<br>QR-кодов</span>`;
        btn.onclick = () => openQrModal();
        panel.appendChild(btn);
        
        async function openQrModal() {
            if (typeof window.QRious === 'undefined') return alert('Ошибка: Библиотека QRious не найдена! Обратитесь к разработчику.');

            // Чистая HTML-структура, полагающаяся только на классы из styles.css
            const { ov } = createModal('500px', '80vh', `
                <div class="mshhlpr-modal-header mshhlpr-qr-header">
                    <span>✨ Генератор QR-кода</span>
                    <button class="mshhlpr-modal-close">&times;</button>
                </div>
                <div class="mshhlpr-modal-body mshhlpr-qr-body">
                    <div class="mshhlpr-qr-inputs">
                        <div class="mshhlpr-qr-input-row">
                            <input type="text" id="qr-input" class="mshhlpr-qr-input-field" placeholder="Введите ссылку или текст...">
                            <button id="qr-paste" class="mshhlpr-universal-toggle-btn mshhlpr-qr-btn-small">📋 Вставить скопированное</button>
                        </div>
                        <input type="text" id="qr-label" class="mshhlpr-qr-input-field" placeholder="Добавить надпись...">
                    </div>
                    
                    <div class="mshhlpr-qr-preview-container">
                        <div id="qr-label-preview" class="mshhlpr-qr-label-preview mshhlpr-hidden"></div>
                        <canvas id="qr-canvas" class="mshhlpr-qr-canvas mshhlpr-hidden"></canvas>
                        <div id="qr-loader" class="mshhlpr-qr-loader">Буфер обмена пуст. Введите текст...</div>
                    </div>

                    <div class="mshhlpr-qr-action-grid">
                        <button id="qr-print" class="mshhlpr-universal-toggle-btn mshhlpr-qr-btn-action">🖨️ Печать</button>
                        <button id="qr-pdf" class="mshhlpr-universal-toggle-btn mshhlpr-qr-btn-action">📄 PDF</button>
                        <button id="qr-open" class="mshhlpr-universal-toggle-btn mshhlpr-qr-btn-action">👁️ Открыть</button>
                    </div>
                </div>
            `);

            const $ = id => ov.querySelector(id);
            const [input, labelInput, labelPreview, canvas, loader] = [$('#qr-input'), $('#qr-label'), $('#qr-label-preview'), $('#qr-canvas'), $('#qr-loader')];
            
            // ВАЖНО: Убран padding: 0. Библиотека сама сбалансирует отступы и центрирует матрицу
            const qr = new window.QRious({ element: canvas, size: 800 });

            const updateQr = (text) => {
                const hasText = !!text.trim();
                canvas.classList.toggle('mshhlpr-hidden', !hasText);
                loader.classList.toggle('mshhlpr-hidden', hasText);
                if (hasText) qr.value = text;
            };

            labelInput.addEventListener('input', () => {
                labelPreview.textContent = labelInput.value.trim();
                labelPreview.classList.toggle('mshhlpr-hidden', !labelInput.value.trim());
            });

            navigator.clipboard.readText().then(t => { if(t.trim()) { input.value = t; updateQr(t); } }).catch(()=>{});
            input.addEventListener('input', () => updateQr(input.value));
            $('#qr-paste').onclick = async () => { try { const t = await navigator.clipboard.readText(); input.value = t; updateQr(t); } catch(e) { alert('Вставьте вручную (Ctrl+V)'); } };

            const renderFullPage = (imgData, title) => `<html><head><title>${title}</title><style>@page{size:auto;margin:0}body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#fff}img{width:100vw;height:100vh;object-fit:contain;display:block}</style></head><body><img src="${imgData}" onload="window.focus();${title==='Печать'?'window.print();':''}"></body></html>`;

            $('#qr-print').onclick = () => {
                if(!input.value.trim()) return;
                const iframe = document.createElement('iframe'); iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;'; document.body.appendChild(iframe);
                iframe.contentWindow.document.write(renderFullPage(getCompositeCanvas(canvas, labelInput.value.trim()).toDataURL('image/png'), 'Печать')); iframe.contentWindow.document.close();
                setTimeout(() => iframe.remove(), 1000);
            };

            $('#qr-open').onclick = () => {
                if(!input.value.trim()) return;
                window.open('', '_blank').document.write(renderFullPage(getCompositeCanvas(canvas, labelInput.value.trim()).toDataURL('image/png'), 'QR-код'));
            };

            $('#qr-pdf').onclick = () => {
                if(!input.value.trim()) return;
                const a = document.createElement('a');
                a.href = URL.createObjectURL(generatePdfOffline(getCompositeCanvas(canvas, labelInput.value.trim())));
                a.download = "QR_" + Math.random().toString(36).substring(2, 8).toUpperCase() + ".pdf";
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
            };
        }

        // Идеальное центрирование надписи над QR-кодом
        function getCompositeCanvas(qrCanvas, text) {
            if (!text) return qrCanvas;
            const tC = document.createElement('canvas');
            const th = Math.round(qrCanvas.height * 0.12);
            tC.width = qrCanvas.width;
            tC.height = qrCanvas.height + th;
            
            const ctx = tC.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tC.width, tC.height);
            ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.round(qrCanvas.height * 0.045)}px sans-serif`;
            
            ctx.fillText(text, tC.width / 2, th / 2);
            ctx.drawImage(qrCanvas, 0, th);
            return tC;
        }

        // PDF-генератор без отступов, с максимальным растягиванием
        function generatePdfOffline(canvasElement) {
            const bin = atob(canvasElement.toDataURL('image/jpeg', 1.0).split(',')[1]);
            const pdfW = 595.28, pdfH = 841.89;
            let imgW = pdfW, imgH = (canvasElement.height / canvasElement.width) * imgW;
            if (imgH > pdfH) { imgH = pdfH; imgW = (canvasElement.width / canvasElement.height) * imgH; }
            const dX = (pdfW - imgW) / 2, dY = (pdfH - imgH) / 2; 

            const out = [], offsets = []; let offset = 0;
            const append = (str) => { const u8 = new Uint8Array(str.length); for(let i=0; i<str.length; i++) u8[i] = str.charCodeAt(i); out.push(u8); offset += str.length; };
            const appendBin = (str) => { const u8 = new Uint8Array(str.length); for(let i=0; i<str.length; i++) u8[i] = str.charCodeAt(i); out.push(u8); offset += str.length; };

            append("%PDF-1.3\n");
            offsets.push(offset); append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
            offsets.push(offset); append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
            offsets.push(offset); append(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Contents 4 0 R /Resources << /XObject << /I1 5 0 R >> >> >>\nendobj\n`);
            
            const stream = `q\n${imgW.toFixed(2)} 0 0 ${imgH.toFixed(2)} ${dX.toFixed(2)} ${dY.toFixed(2)} cm\n/I1 Do\nQ\n`;
            offsets.push(offset); append(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`);
            offsets.push(offset); append(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvasElement.width} /Height ${canvasElement.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bin.length} >>\nstream\n`);
            
            appendBin(bin); append("\nendstream\nendobj\n");
            const xrefOffset = offset;
            append(`xref\n0 6\n0000000000 65535 f \n`);
            for(let i=1; i<=5; i++) append(offsets[i-1].toString().padStart(10, '0') + " 00000 n \n");
            append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

            return new Blob(out, { type: 'application/pdf' });
        }
    }
})();