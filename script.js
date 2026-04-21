document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('captureBtn');
    const frameOverlay = document.getElementById('frameOverlay');
    const flashEffect = document.getElementById('flashEffect');
    const countdownEl = document.getElementById('countdown');
    const dots = document.querySelectorAll('.dot');
    const previewModal = document.getElementById('previewModal');
    const resultImage = document.getElementById('resultImage');
    const frameOptions = document.querySelectorAll('.frame-option');
    const toggleCameraBtn = document.getElementById('toggleCamera');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const shotsIndicator = document.getElementById('shotsIndicator');
    
    // UI Elements for Photobox System
    const setupScreen = document.getElementById('setupScreen');
    const startSessionBtn = document.getElementById('startSessionBtn');
    const finishSessionBtn = document.getElementById('finishSessionBtn');
    const sessionTimerEl = document.getElementById('sessionTimer');
    const timeLeftEl = document.getElementById('timeLeft');
    const galleryInner = document.getElementById('galleryInner');
    const optBtns = document.querySelectorAll('.opt-btn');

    let currentStream = null;
    let selectedFrame = 'none';
    let facingMode = 'user';
    let isCapturing = false;
    let sessionMode = 'strip'; // Matches HTML default
    
    // Session State
    let sessionActive = false;
    let sessionInterval = null;
    let timeRemaining = 0; 
    let captureTimer = 5; 
    let sessionCaptures = [];
    let selectedForStrip = [];

    // 1. Initialize Camera
    async function startCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        const constraints = {
            video: { facingMode: facingMode, width: { ideal: 1080 }, height: { ideal: 1080 } },
            audio: false
        };
        try {
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = currentStream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please check permissions.");
        }
    }

    // 2. Mode & Setup Listeners
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isCapturing) return;
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sessionMode = btn.dataset.mode;
            
            if (sessionMode === 'single') {
                shotsIndicator.classList.add('hidden');
            } else {
                shotsIndicator.classList.remove('hidden');
            }
        });
    });

    optBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.parentElement;
            parent.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (parent.dataset.type === 'capture') {
                captureTimer = parseInt(btn.dataset.val);
            }
        });
    });

    startSessionBtn.addEventListener('click', () => {
        const selectedDuration = parseInt(document.querySelector('.option-row[data-type="session"] .opt-btn.active').dataset.val);
        startSession(selectedDuration);
    });

    finishSessionBtn.addEventListener('click', () => {
        if (sessionCaptures.length === 0) {
            if (confirm("No photos taken yet. Finish session anyway?")) endSession();
        } else {
            if (confirm("Finish session and pick your photos?")) endSession();
        }
    });

    function startSession(minutes) {
        timeRemaining = minutes * 60;
        sessionActive = true;
        setupScreen.classList.add('hidden');
        sessionTimerEl.classList.remove('hidden');
        
        updateTimerDisplay();
        sessionInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                endSession();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        timeLeftEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (timeRemaining < 60) {
            timeLeftEl.style.color = '#ff4b2b';
        }
    }

    function endSession() {
        clearInterval(sessionInterval);
        sessionActive = false;
        isCapturing = false;
        showSelectionGallery();
    }

    // 3. Capture Logic
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
        tempCanvas.width = 1080;
        tempCanvas.height = 1080;
        const ctx = tempCanvas.getContext('2d');
        ctx.save();
        ctx.translate(1080, 0);
        ctx.scale(-1, 1);
        
        const vW = video.videoWidth;
        const vH = video.videoHeight;
        const min = Math.min(vW, vH);
        const x = (vW - min) / 2;
        const y = (vH - min) / 2;
        
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

    // 4. Selection Gallery
    function showSelectionGallery() {
        selectedForStrip = [];
        const modalContent = previewModal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="close-btn" id="modalClose">&times;</button>
            <h2 style="color: var(--accent-color); margin-bottom: 1rem;">SESSION COMPLETE</h2>
            <p style="margin-bottom: 2rem; color: #a0a0a5;">Select 3 photos to generate a strip, or download all individually.</p>
            <div class="selection-grid" id="selectionGrid"></div>
            <div class="modal-actions">
                <button id="genStripBtn" class="download-btn">GENERATE STRIP (0/3)</button>
                <button id="downloadAllBtn" class="secondary-btn">DOWNLOAD ALL</button>
            </div>
        `;

        const grid = document.getElementById('selectionGrid');
        sessionCaptures.forEach((src) => {
            const item = document.createElement('div');
            item.className = 'selection-item';
            item.innerHTML = `<img src="${src}"><div class="check">✓</div>`;
            item.addEventListener('click', () => toggleSelection(item, src));
            grid.appendChild(item);
        });

        document.getElementById('downloadAllBtn').addEventListener('click', downloadAllPhotos);
        document.getElementById('genStripBtn').addEventListener('click', generateStripFromSelected);
        document.getElementById('modalClose').addEventListener('click', () => location.reload());
        previewModal.classList.add('active');
    }

    function toggleSelection(item, src) {
        if (item.classList.contains('selected')) {
            item.classList.remove('selected');
            selectedForStrip = selectedForStrip.filter(s => s !== src);
        } else {
            if (selectedForStrip.length < 3) {
                item.classList.add('selected');
                selectedForStrip.push(src);
            } else {
                alert("Please select exactly 3 photos for the strip.");
            }
        }
        document.getElementById('genStripBtn').textContent = `GENERATE STRIP (${selectedForStrip.length}/3)`;
    }

    async function generateStripFromSelected() {
        if (selectedForStrip.length < 3) {
            alert("Please select 3 photos first.");
            return;
        }

        const shots = await Promise.all(selectedForStrip.map(src => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = src;
            });
        }));

        await generateStrip(shots);
    }

    async function generateStrip(shots) {
        const stripW = 400;
        const padding = 12;
        const shotSize = stripW - (padding * 2); 
        const headerH = 120;
        const footerH = 220;
        const gap = 8;
        const totalH = headerH + (shotSize * shots.length) + (gap * (shots.length - 1)) + footerH;
        
        const stripCanvas = document.createElement('canvas');
        stripCanvas.width = stripW;
        stripCanvas.height = totalH;
        const ctx = stripCanvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, stripW, totalH);

        // Header
        ctx.fillStyle = '#111111';
        const iconSize = 50;
        const iconX = padding + 20;
        const iconY = 35;
        
        // Manual rounded rect for compatibility
        const r = 12;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(iconX + r, iconY);
        ctx.arcTo(iconX + iconSize, iconY, iconX + iconSize, iconY + iconSize, r);
        ctx.arcTo(iconX + iconSize, iconY + iconSize, iconX, iconY + iconSize, r);
        ctx.arcTo(iconX, iconY + iconSize, iconX, iconY, r);
        ctx.arcTo(iconX, iconY, iconX + iconSize, iconY, r);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 32px Inter';
        ctx.fillText('B', iconX + iconSize/2, iconY + iconSize/2 + 12);
        ctx.restore();

        ctx.fillStyle = '#111111';
        ctx.textAlign = 'left';
        ctx.font = '800 24px Inter';
        ctx.fillText('BestBost', iconX + iconSize + 15, iconY + 22);
        ctx.font = '400 16px Inter';
        ctx.fillStyle = '#555';
        ctx.fillText('photobooth', iconX + iconSize + 15, iconY + 45);

        // Photos
        for (let i = 0; i < shots.length; i++) {
            const yPos = headerH + (i * (shotSize + gap));
            ctx.drawImage(shots[i], padding, yPos, shotSize, shotSize);
        }

        // Frames
        if (selectedFrame !== 'none') {
            const frameImg = new Image();
            frameImg.src = `assets/frames/${selectedFrame}.png`;
            await new Promise(r => frameImg.onload = r);
            for (let i = 0; i < shots.length; i++) {
                const yPos = headerH + (i * (shotSize + gap));
                ctx.save();
                ctx.globalCompositeOperation = (selectedFrame === 'floral') ? 'multiply' : 'screen';
                ctx.drawImage(frameImg, padding, yPos, shotSize, shotSize);
                ctx.restore();
            }
        }

        // QR
        const igUser = 'asyrafm08_';
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://www.instagram.com/${igUser}`;
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        qrImg.src = qrUrl;
        await new Promise(r => qrImg.onload = r);
        const qrSize = 140;
        const qrX = (stripW - qrSize) / 2;
        const qrY = totalH - footerH + 20;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        ctx.fillStyle = '#111111';
        ctx.font = 'bold 15px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`@${igUser}`, stripW / 2, qrY + qrSize + 30);

        showFinalResult(stripCanvas.toDataURL('image/png'));
    }

    function showFinalResult(url) {
        const modalContent = previewModal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <button class="close-btn" id="finalModalClose">&times;</button>
            <h2 style="color: var(--accent-color); margin-bottom: 2rem;">YOUR MASTERPIECE</h2>
            <div class="result-container">
                <img src="${url}" alt="Final Strip">
            </div>
            <div class="modal-actions">
                <button id="finalDownloadBtn" class="download-btn">DOWNLOAD PHOTO</button>
                <button id="backToGalleryBtn" class="secondary-btn">BACK TO GALLERY</button>
            </div>
        `;

        document.getElementById('finalDownloadBtn').addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `BestBost-Strip-${Date.now()}.png`;
            link.href = url;
            link.click();
        });

        document.getElementById('backToGalleryBtn').addEventListener('click', showSelectionGallery);
        document.getElementById('finalModalClose').addEventListener('click', () => location.reload());
    }

    function downloadAllPhotos() {
        sessionCaptures.forEach((src, idx) => {
            const link = document.createElement('a');
            link.download = `BestBost-Capture-${idx + 1}.png`;
            link.href = src;
            link.click();
        });
    }

    // Frame selection
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

    toggleCameraBtn.addEventListener('click', () => {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        startCamera();
    });

    startCamera();
});
