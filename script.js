document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('captureBtn');
    const frameOverlay = document.getElementById('frameOverlay');
    const flashEffect = document.getElementById('flashEffect');
    const countdownEl = document.getElementById('countdown');
    const dots = document.querySelectorAll('.dot');
    const previewModal = document.getElementById('previewModal');
    const frameOptions = document.querySelectorAll('.frame-option');
    const toggleCameraBtn = document.getElementById('toggleCamera');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const cameraUI = document.querySelector('.camera-ui');
    const shotsIndicator = document.getElementById('shotsIndicator');
    const setupScreen = document.getElementById('setupScreen');
    const startSessionBtn = document.getElementById('startSessionBtn');
    const finishSessionBtn = document.getElementById('finishSessionBtn');
    const sessionTimerEl = document.getElementById('sessionTimer');
    const timeLeftEl = document.getElementById('timeLeft');
    const galleryInner = document.getElementById('galleryInner');
    const optBtns = document.querySelectorAll('.opt-btn');

    // 2. State
    let currentStream = null;
    let selectedFrame = 'none';
    let facingMode = 'user';
    let isCapturing = false;
    let sessionMode = 'strip'; 
    let sessionActive = false;
    let sessionInterval = null;
    let timeRemaining = 0; 
    let captureTimer = 5; 
    let sessionCaptures = [];
    let selectedPhotos = [];

    // 3. Setup Logic (Listeners) - Attach immediately
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isCapturing) return;
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sessionMode = btn.dataset.mode;
            if (sessionMode === 'single') {
                shotsIndicator?.classList.add('hidden');
            } else {
                if (sessionActive) shotsIndicator?.classList.remove('hidden');
            }
        });
    });

    optBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = btn.parentElement;
            parent.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (parent.dataset.type === 'capture') {
                captureTimer = parseInt(btn.dataset.val);
            }
        });
    });

    startSessionBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedBtn = document.querySelector('.option-row[data-type="session"] .opt-btn.active');
        if (!selectedBtn) return;
        const selectedDuration = parseInt(selectedBtn.dataset.val);
        startSession(selectedDuration);
    });

    finishSessionBtn?.addEventListener('click', () => {
        if (sessionCaptures.length === 0) {
            if (confirm("No photos taken yet. Finish session anyway?")) endSession();
        } else {
            if (confirm("Finish session and pick your photos?")) endSession();
        }
    });

    // 4. Initialization - Start Camera
    async function startCamera() {
        try {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
            const constraints = {
                video: { facingMode: facingMode, width: { ideal: 1080 }, height: { ideal: 1080 } },
                audio: false
            };
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;
        } catch (err) {
            console.error("Camera Error:", err);
            if (sessionActive) alert("Could not access camera. Please check permissions.");
        }
    }

    // 5. Session Management
    function startSession(minutes) {
        timeRemaining = minutes * 60;
        sessionActive = true;
        setupScreen.classList.remove('active');
        sessionTimerEl.classList.remove('hidden');
        cameraUI.classList.remove('hidden');
        if (sessionMode === 'strip') shotsIndicator?.classList.remove('hidden');
        updateTimerDisplay();
        sessionInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) endSession();
        }, 1000);
    }

    function updateTimerDisplay() {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        timeLeftEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        timeLeftEl.style.color = timeRemaining < 60 ? '#ff4b2b' : '';
    }

    function endSession() {
        clearInterval(sessionInterval);
        sessionActive = false;
        cameraUI.classList.add('hidden');
        shotsIndicator?.classList.add('hidden');
        showSelectionGallery();
    }

    // 6. Capture Logic
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function runCountdown(duration) {
        countdownEl.classList.add('active');
        for (let i = duration; i > 0; i--) {
            countdownEl.textContent = i;
            await sleep(1000);
        }
        countdownEl.classList.remove('active');
        countdownEl.textContent = '';
    }

    captureBtn.addEventListener('click', async () => {
        if (isCapturing || !sessionActive) return;
        isCapturing = true;
        captureBtn.disabled = true;

        if (sessionMode === 'strip') {
            dots.forEach(dot => dot.classList.remove('active'));
            for (let i = 0; i < 3; i++) {
                await runCountdown(captureTimer);
                const shot = captureSingleFrame();
                const dataUrl = shot.toDataURL('image/png');
                sessionCaptures.push(dataUrl);
                updateGalleryUI(dataUrl);
                dots[i].classList.add('active');
                flashEffect.classList.add('active');
                setTimeout(() => flashEffect.classList.remove('active'), 500);
                await sleep(1000);
            }
        } else {
            await runCountdown(captureTimer);
            const shot = captureSingleFrame();
            const dataUrl = shot.toDataURL('image/png');
            sessionCaptures.push(dataUrl);
            updateGalleryUI(dataUrl);
            flashEffect.classList.add('active');
            setTimeout(() => flashEffect.classList.remove('active'), 500);
        }
        isCapturing = false;
        captureBtn.disabled = false;
    });

    function captureSingleFrame() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1080; tempCanvas.height = 1080;
        const ctx = tempCanvas.getContext('2d');
        ctx.save();
        ctx.translate(1080, 0); ctx.scale(-1, 1);
        const vW = video.videoWidth, vH = video.videoHeight;
        const min = Math.min(vW, vH);
        const x = (vW - min) / 2, y = (vH - min) / 2;
        ctx.drawImage(video, x, y, min, min, 0, 0, 1080, 1080);
        ctx.restore();
        return tempCanvas;
    }

    function updateGalleryUI(src) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="${src}" alt="Capture">`;
        galleryInner.appendChild(item);
        item.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    // 7. Gallery Logic
    function showSelectionGallery() {
        const modalContent = previewModal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="close-btn" id="modalClose">&times;</button>
            <h2 style="color: var(--accent-color); margin-bottom: 0.5rem; letter-spacing: 4px;">MENU HASIL FOTO</h2>
            <p style="margin-bottom: 1.5rem; color: #a0a0a5; font-size: 0.9rem;">Select 3 photos for a strip or download individually.</p>
            <div class="selection-grid" id="selectionGrid"></div>
            <div class="modal-actions-gallery">
                <button id="genStripBtn" class="download-btn">GENERATE STRIP (0/3)</button>
                <button id="downloadSelectedBtn" class="primary-btn secondary-style">DOWNLOAD SELECTED</button>
                <button id="downloadAllBtn" class="secondary-btn">DOWNLOAD ALL</button>
            </div>
        `;

        const grid = document.getElementById('selectionGrid');
        sessionCaptures.forEach((src) => {
            const item = document.createElement('div');
            item.className = 'selection-item';
            if (selectedPhotos.includes(src)) item.classList.add('selected');
            item.innerHTML = `<img src="${src}"><div class="check">✓</div>`;
            item.addEventListener('click', () => toggleSelection(item, src));
            grid.appendChild(item);
        });

        updateSelectionUI();
        document.getElementById('downloadAllBtn').addEventListener('click', downloadAllPhotos);
        document.getElementById('downloadSelectedBtn').addEventListener('click', downloadSelectedPhotos);
        document.getElementById('genStripBtn').addEventListener('click', generateStripFromSelected);
        document.getElementById('modalClose').addEventListener('click', () => location.reload());
        previewModal.classList.add('active');
    }

    function toggleSelection(item, src) {
        if (item.classList.contains('selected')) {
            item.classList.remove('selected');
            selectedPhotos = selectedPhotos.filter(s => s !== src);
        } else {
            item.classList.add('selected');
            selectedPhotos.push(src);
        }
        updateSelectionUI();
    }

    function updateSelectionUI() {
        const count = selectedPhotos.length;
        const genBtn = document.getElementById('genStripBtn');
        const downBtn = document.getElementById('downloadSelectedBtn');
        if (genBtn) {
            genBtn.textContent = `GENERATE STRIP (${count}/3)`;
            genBtn.style.opacity = count === 3 ? '1' : '0.6';
            genBtn.disabled = count !== 3;
        }
        if (downBtn) downBtn.textContent = `DOWNLOAD SELECTED (${count})`;
    }

    async function generateStripFromSelected() {
        if (selectedPhotos.length !== 3) return;
        const btn = document.getElementById('genStripBtn');
        btn.classList.add('processing');
        btn.textContent = 'GENERATING...';
        btn.disabled = true;

        try {
            const shots = await Promise.all(selectedPhotos.map(src => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = src;
                });
            }));
            await generateStrip(shots);
        } catch (err) {
            alert("Error generating strip.");
            btn.classList.remove('processing');
            updateSelectionUI();
        }
    }

    async function generateStrip(shots) {
        const stripW = 400, padding = 12, shotSize = stripW - (padding * 2); 
        const headerH = 120, footerH = 220, gap = 8;
        const totalH = headerH + (shotSize * shots.length) + (gap * (shots.length - 1)) + footerH;
        
        const stripCanvas = document.createElement('canvas');
        stripCanvas.width = stripW; stripCanvas.height = totalH;
        const ctx = stripCanvas.getContext('2d');

        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, stripW, totalH);

        // Branding Header
        ctx.fillStyle = '#111111';
        const iconSize = 50, iconX = padding + 20, iconY = 35;
        ctx.save();
        ctx.beginPath(); ctx.roundRect(iconX, iconY, iconSize, iconSize, 12); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = 'bold 32px Inter';
        ctx.fillText('B', iconX + iconSize/2, iconY + iconSize/2 + 12);
        ctx.restore();
        ctx.fillStyle = '#111111'; ctx.textAlign = 'left'; ctx.font = '800 24px Inter';
        ctx.fillText('BestBost', iconX + iconSize + 15, iconY + 22);
        ctx.font = '400 16px Inter'; ctx.fillStyle = '#555';
        ctx.fillText('photobooth', iconX + iconSize + 15, iconY + 45);

        for (let i = 0; i < shots.length; i++) {
            const yPos = headerH + (i * (shotSize + gap));
            ctx.drawImage(shots[i], padding, yPos, shotSize, shotSize);
            if (selectedFrame !== 'none') {
                const frameImg = new Image();
                frameImg.src = `assets/frames/${selectedFrame}.png`;
                await new Promise(r => frameImg.onload = r);
                ctx.save();
                ctx.globalCompositeOperation = (selectedFrame === 'floral') ? 'multiply' : 'screen';
                ctx.drawImage(frameImg, padding, yPos, shotSize, shotSize);
                ctx.restore();
            }
        }

        const igUser = 'asyrafm08_';
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://www.instagram.com/${igUser}`;
        const qrImg = new Image(); qrImg.crossOrigin = 'anonymous'; qrImg.src = qrUrl;
        await new Promise(r => qrImg.onload = r);
        const qrSize = 140, qrX = (stripW - qrSize) / 2, qrY = totalH - footerH + 20;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        ctx.fillStyle = '#111111'; ctx.font = 'bold 15px Inter'; ctx.textAlign = 'center';
        ctx.fillText(`@${igUser}`, stripW / 2, qrY + qrSize + 30);

        showFinalResult(stripCanvas.toDataURL('image/png'));
    }

    function showFinalResult(url) {
        const modalContent = previewModal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="close-btn" id="finalModalClose">&times;</button>
            <h2 style="color: var(--accent-color); margin-bottom: 2rem; letter-spacing: 4px;">HASIL STRIP</h2>
            <div class="result-container"><img src="${url}" alt="Final"></div>
            <div class="modal-actions">
                <button id="finalDownloadBtn" class="download-btn">DOWNLOAD STRIP</button>
                <button id="backToGalleryBtn" class="secondary-btn">KEMBALI</button>
            </div>
        `;
        document.getElementById('finalDownloadBtn').addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `BestBost-Strip-${Date.now()}.png`;
            link.href = url; link.click();
        });
        document.getElementById('backToGalleryBtn').addEventListener('click', showSelectionGallery);
        document.getElementById('finalModalClose').addEventListener('click', () => location.reload());
        previewModal.classList.add('active');
    }

    function downloadAllPhotos() {
        sessionCaptures.forEach((src, idx) => downloadWithFrame(src, `BestBost-${idx + 1}.png`));
    }

    function downloadSelectedPhotos() {
        selectedPhotos.forEach((src, idx) => downloadWithFrame(src, `BestBost-Sel-${idx + 1}.png`));
    }

    async function downloadWithFrame(src, filename) {
        const img = new Image(); img.src = src;
        await new Promise(r => img.onload = r);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1080; tempCanvas.height = 1080;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        if (selectedFrame !== 'none') {
            const frameImg = new Image();
            frameImg.src = `assets/frames/${selectedFrame}.png`;
            await new Promise(r => frameImg.onload = r);
            ctx.save();
            ctx.globalCompositeOperation = (selectedFrame === 'floral') ? 'multiply' : 'screen';
            ctx.drawImage(frameImg, 0, 0, 1080, 1080);
            ctx.restore();
        }
        const link = document.createElement('a');
        link.download = filename; link.href = tempCanvas.toDataURL('image/png'); link.click();
    }

    // 8. Visual Listeners
    frameOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectedFrame = option.dataset.frame;
            frameOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            if (selectedFrame === 'none') {
                frameOverlay.style.backgroundImage = 'none';
            } else {
                frameOverlay.style.backgroundImage = `url('assets/frames/${selectedFrame}.png')`;
                frameOverlay.style.mixBlendMode = (selectedFrame === 'floral') ? 'multiply' : 'screen';
            }
        });
    });

    toggleCameraBtn?.addEventListener('click', () => {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        startCamera();
    });

    // Final Init
    startCamera();
});
