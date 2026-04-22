document.addEventListener('DOMContentLoaded', function() {
    // 1. DOM Elements
    var video = document.getElementById('video');
    var canvas = document.getElementById('canvas');
    var captureBtn = document.getElementById('captureBtn');
    var frameOverlay = document.getElementById('frameOverlay');
    var flashEffect = document.getElementById('flashEffect');
    var countdownEl = document.getElementById('countdown');
    var sessionDots = document.querySelectorAll('.dot');
    var previewModal = document.getElementById('previewModal');
    var frameOptions = document.querySelectorAll('.frame-option');
    var toggleCameraBtn = document.getElementById('toggleCamera');
    var modeBtns = document.querySelectorAll('.mode-btn');
    var cameraUI = document.querySelector('.camera-ui');
    var shotsIndicator = document.getElementById('shotsIndicator');
    var setupScreen = document.getElementById('setupScreen');
    var startSessionBtn = document.getElementById('startSessionBtn');
    var finishSessionBtn = document.getElementById('finishSessionBtn');
    var sessionTimerEl = document.getElementById('sessionTimer');
    var timeLeftEl = document.getElementById('timeLeft');
    var galleryInner = document.getElementById('galleryInner');
    var optBtns = document.querySelectorAll('.opt-btn');

    // 2. State
    var currentStream = null;
    var selectedFrame = 'none';
    var facingMode = 'user';
    var isCapturing = false;
    var sessionMode = 'strip'; 
    var sessionActive = false;
    var sessionInterval = null;
    var timeRemaining = 0; 
    var captureTimer = 5; 
    var sessionCaptures = [];
    var selectedPhotos = [];

    // 3. Setup Listeners
    modeBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (isCapturing) return;
            modeBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            sessionMode = btn.dataset.mode;
            if (sessionMode === 'single') {
                if (shotsIndicator) shotsIndicator.classList.add('hidden');
            } else {
                if (sessionActive && shotsIndicator) shotsIndicator.classList.remove('hidden');
            }
        });
    });

    optBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var parent = btn.parentElement;
            parent.querySelectorAll('.opt-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            if (parent.dataset.type === 'capture') {
                captureTimer = parseInt(btn.dataset.val);
            }
        });
    });

    if (startSessionBtn) {
        startSessionBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var selectedBtn = document.querySelector('.option-row[data-type="session"] .opt-btn.active');
            if (!selectedBtn) return;
            var selectedDuration = parseInt(selectedBtn.dataset.val);
            startSession(selectedDuration);
        });
    }

    if (finishSessionBtn) {
        finishSessionBtn.addEventListener('click', function() {
            if (sessionCaptures.length === 0) {
                if (confirm("No photos taken yet. Finish session anyway?")) endSession();
            } else {
                if (confirm("Finish session and pick your photos?")) endSession();
            }
        });
    }

    // 4. Camera Init
    async function startCamera() {
        try {
            if (currentStream) {
                currentStream.getTracks().forEach(function(track) { track.stop(); });
            }
            var constraints = {
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

    // 5. Session Flow
    function startSession(minutes) {
        timeRemaining = minutes * 60;
        sessionActive = true;
        if (setupScreen) setupScreen.classList.remove('active');
        if (sessionTimerEl) sessionTimerEl.classList.remove('hidden');
        if (cameraUI) cameraUI.classList.remove('hidden');
        if (sessionMode === 'strip' && shotsIndicator) shotsIndicator.classList.remove('hidden');
        updateTimerDisplay();
        sessionInterval = setInterval(function() {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) endSession();
        }, 1000);
    }

    function updateTimerDisplay() {
        if (!timeLeftEl) return;
        var mins = Math.floor(timeRemaining / 60);
        var secs = timeRemaining % 60;
        timeLeftEl.textContent = (mins < 10 ? '0' + mins : mins) + ':' + (secs < 10 ? '0' + secs : secs);
        timeLeftEl.style.color = timeRemaining < 60 ? '#ff4b2b' : '';
    }

    function endSession() {
        clearInterval(sessionInterval);
        sessionActive = false;
        if (cameraUI) cameraUI.classList.add('hidden');
        if (shotsIndicator) shotsIndicator.classList.add('hidden');
        showSelectionGallery();
    }

    // 6. Capture Functions
    var sleep = function(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); };

    async function runCountdown(duration) {
        if (!countdownEl) return;
        countdownEl.classList.add('active');
        for (var i = duration; i > 0; i--) {
            countdownEl.textContent = i;
            await sleep(1000);
        }
        countdownEl.classList.remove('active');
        countdownEl.textContent = '';
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', async function() {
            if (isCapturing || !sessionActive) return;
            isCapturing = true;
            captureBtn.disabled = true;
            if (finishSessionBtn) finishSessionBtn.disabled = true;

            try {
                if (sessionMode === 'strip') {
                    sessionDots.forEach(function(dot) { dot.classList.remove('active'); });
                    for (var i = 0; i < 3; i++) {
                        await runCountdown(captureTimer);
                        var shot = captureSingleFrame();
                        var dataUrl = shot.toDataURL('image/png');
                        sessionCaptures.push(dataUrl);
                        updateGalleryUI(dataUrl);
                        if (sessionDots[i]) sessionDots[i].classList.add('active');
                        if (flashEffect) {
                            flashEffect.classList.add('active');
                            setTimeout(function() { flashEffect.classList.remove('active'); }, 500);
                        }
                        await sleep(800); // Slightly faster wait (800ms vs 1000ms)
                    }
                } else {
                    await runCountdown(captureTimer);
                    var shot = captureSingleFrame();
                    var dataUrl = shot.toDataURL('image/png');
                    sessionCaptures.push(dataUrl);
                    updateGalleryUI(dataUrl);
                    if (flashEffect) {
                        flashEffect.classList.add('active');
                        setTimeout(function() { flashEffect.classList.remove('active'); }, 500);
                    }
                }
            } catch (err) {
                console.error("Capture Error:", err);
            } finally {
                isCapturing = false;
                captureBtn.disabled = false;
                if (finishSessionBtn) finishSessionBtn.disabled = false;
            }
        });
    }

    function captureSingleFrame() {
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1080; tempCanvas.height = 1080;
        var ctx = tempCanvas.getContext('2d');
        ctx.save();
        ctx.translate(1080, 0); ctx.scale(-1, 1);
        var vW = video.videoWidth, vH = video.videoHeight;
        var min = Math.min(vW, vH);
        var x = (vW - min) / 2, y = (vH - min) / 2;
        ctx.drawImage(video, x, y, min, min, 0, 0, 1080, 1080);
        ctx.restore();
        return tempCanvas;
    }

    function updateGalleryUI(src) {
        if (!galleryInner) return;
        var item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = '<img src="' + src + '" alt="Capture">';
        galleryInner.appendChild(item);
        item.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    // 7. Gallery Management
    function showSelectionGallery() {
        var modalContent = previewModal.querySelector('.modal-content');
        modalContent.innerHTML = 
            '<button class="close-btn" id="modalClose">&times;</button>' +
            '<h2 style="color: var(--accent-color); margin-bottom: 0.5rem; letter-spacing: 4px;">MENU HASIL FOTO</h2>' +
            '<p style="margin-bottom: 1.5rem; color: #a0a0a5; font-size: 0.9rem;">Select 3 photos for a strip or download individually.</p>' +
            '<div class="selection-grid" id="selectionGrid"></div>' +
            '<div class="modal-actions-gallery">' +
                '<button id="genStripBtn" class="download-btn">GENERATE STRIP (0/3)</button>' +
                '<button id="downloadSelectedBtn" class="primary-btn secondary-style">DOWNLOAD SELECTED</button>' +
                '<button id="downloadAllBtn" class="secondary-btn">DOWNLOAD ALL</button>' +
            '</div>';

        var grid = document.getElementById('selectionGrid');
        sessionCaptures.forEach(function(src) {
            var item = document.createElement('div');
            item.className = 'selection-item';
            if (selectedPhotos.indexOf(src) > -1) item.classList.add('selected');
            item.innerHTML = '<img src="' + src + '"><div class="check">✓</div>';
            item.addEventListener('click', function() { toggleSelection(item, src); });
            grid.appendChild(item);
        });

        updateSelectionUI();
        document.getElementById('downloadAllBtn').addEventListener('click', downloadAllPhotos);
        document.getElementById('downloadSelectedBtn').addEventListener('click', downloadSelectedPhotos);
        document.getElementById('genStripBtn').addEventListener('click', generateStripFromSelected);
        document.getElementById('modalClose').addEventListener('click', function() { location.reload(); });
        if (previewModal) previewModal.classList.add('active');
    }

    function toggleSelection(item, src) {
        var idx = selectedPhotos.indexOf(src);
        if (idx > -1) {
            item.classList.remove('selected');
            selectedPhotos.splice(idx, 1);
        } else {
            item.classList.add('selected');
            selectedPhotos.push(src);
        }
        updateSelectionUI();
    }

    function updateSelectionUI() {
        var count = selectedPhotos.length;
        var genBtn = document.getElementById('genStripBtn');
        var downBtn = document.getElementById('downloadSelectedBtn');
        if (genBtn) {
            genBtn.textContent = 'GENERATE STRIP (' + count + '/3)';
            genBtn.style.opacity = count === 3 ? '1' : '0.6';
            genBtn.disabled = count !== 3;
        }
        if (downBtn) downBtn.textContent = 'DOWNLOAD SELECTED (' + count + ')';
    }

    async function generateStripFromSelected() {
        if (selectedPhotos.length !== 3) return;
        var btn = document.getElementById('genStripBtn');
        btn.classList.add('processing');
        btn.textContent = 'GENERATING...';
        btn.disabled = true;

        try {
            var shots = await Promise.all(selectedPhotos.map(function(src) {
                return new Promise(function(resolve, reject) {
                    var img = new Image();
                    img.onload = function() { resolve(img); };
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
        var stripW = 400, padding = 12, shotSize = stripW - (padding * 2); 
        var headerH = 120, footerH = 220, gap = 8;
        var totalH = headerH + (shotSize * shots.length) + (gap * (shots.length - 1)) + footerH;
        
        var stripCanvas = document.createElement('canvas');
        stripCanvas.width = stripW; stripCanvas.height = totalH;
        var ctx = stripCanvas.getContext('2d');

        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, stripW, totalH);

        // Branding Header
        ctx.fillStyle = '#111111';
        var iconSize = 50, iconX = padding + 20, iconY = 35;
        ctx.beginPath(); 
        ctx.rect(iconX, iconY, iconSize, iconSize);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = 'bold 32px Inter';
        ctx.fillText('B', iconX + iconSize/2, iconY + iconSize/2 + 12);
        
        ctx.fillStyle = '#111111'; ctx.textAlign = 'left'; ctx.font = '800 24px Inter';
        ctx.fillText('BestBost', iconX + iconSize + 15, iconY + 22);
        ctx.font = '400 16px Inter'; ctx.fillStyle = '#555';
        ctx.fillText('photobooth', iconX + iconSize + 15, iconY + 45);

        for (var i = 0; i < shots.length; i++) {
            var yPos = headerH + (i * (shotSize + gap));
            ctx.drawImage(shots[i], padding, yPos, shotSize, shotSize);
            if (selectedFrame !== 'none') {
                var frameImg = new Image();
                frameImg.src = 'assets/frames/' + selectedFrame + '.png';
                await new Promise(function(r) { frameImg.onload = r; frameImg.onerror = r; });
                ctx.save();
                ctx.globalCompositeOperation = (selectedFrame === 'floral') ? 'multiply' : 'screen';
                ctx.drawImage(frameImg, padding, yPos, shotSize, shotSize);
                ctx.restore();
            }
        }

        var igUser = 'asyrafm08_';
        var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://www.instagram.com/' + igUser;
        var qrImg = new Image(); qrImg.crossOrigin = 'anonymous'; qrImg.src = qrUrl;
        await new Promise(function(r) { qrImg.onload = r; qrImg.onerror = r; });
        var qrSize = 140, qrX = (stripW - qrSize) / 2, qrY = totalH - footerH + 20;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        ctx.fillStyle = '#111111'; ctx.font = 'bold 15px Inter'; ctx.textAlign = 'center';
        ctx.fillText('@' + igUser, stripW / 2, qrY + qrSize + 30);

        showFinalResult(stripCanvas.toDataURL('image/png'));
    }

    function showFinalResult(url) {
        var modalContent = previewModal.querySelector('.modal-content');
        modalContent.innerHTML = 
            '<button class="close-btn" id="finalModalClose">&times;</button>' +
            '<h2 style="color: var(--accent-color); margin-bottom: 2rem; letter-spacing: 4px;">HASIL STRIP</h2>' +
            '<div class="result-container"><img src="' + url + '" alt="Final"></div>' +
            '<div class="modal-actions">' +
                '<button id="finalDownloadBtn" class="download-btn">DOWNLOAD STRIP</button>' +
                '<button id="backToGalleryBtn" class="secondary-btn">KEMBALI</button>' +
            '</div>';
        
        document.getElementById('finalDownloadBtn').addEventListener('click', function() {
            var link = document.createElement('a');
            link.download = 'BestBost-Strip-' + Date.now() + '.png';
            link.href = url; link.click();
        });
        document.getElementById('backToGalleryBtn').addEventListener('click', showSelectionGallery);
        document.getElementById('finalModalClose').addEventListener('click', function() { location.reload(); });
        if (previewModal) previewModal.classList.add('active');
    }

    function downloadAllPhotos() {
        sessionCaptures.forEach(function(src, idx) { downloadWithFrame(src, 'BestBost-' + (idx + 1) + '.png'); });
    }

    function downloadSelectedPhotos() {
        selectedPhotos.forEach(function(src, idx) { downloadWithFrame(src, 'BestBost-Sel-' + (idx + 1) + '.png'); });
    }

    async function downloadWithFrame(src, filename) {
        var img = new Image(); img.src = src;
        await new Promise(function(r) { img.onload = r; img.onerror = r; });
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1080; tempCanvas.height = 1080;
        var ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        if (selectedFrame !== 'none') {
            var frameImg = new Image();
            frameImg.src = 'assets/frames/' + selectedFrame + '.png';
            await new Promise(function(r) { frameImg.onload = r; frameImg.onerror = r; });
            ctx.save();
            ctx.globalCompositeOperation = (selectedFrame === 'floral') ? 'multiply' : 'screen';
            ctx.drawImage(frameImg, 0, 0, 1080, 1080);
            ctx.restore();
        }
        var link = document.createElement('a');
        link.download = filename; link.href = tempCanvas.toDataURL('image/png'); link.click();
    }

    // 8. Visual Listeners
    frameOptions.forEach(function(option) {
        option.addEventListener('click', function() {
            selectedFrame = option.dataset.frame;
            frameOptions.forEach(function(opt) { opt.classList.remove('active'); });
            option.classList.add('active');
            if (selectedFrame === 'none') {
                if (frameOverlay) frameOverlay.style.backgroundImage = 'none';
            } else {
                if (frameOverlay) {
                    frameOverlay.style.backgroundImage = 'url("assets/frames/' + selectedFrame + '.png")';
                    frameOverlay.style.mixBlendMode = (selectedFrame === 'floral') ? 'multiply' : 'screen';
                }
            }
        });
    });

    if (toggleCameraBtn) {
        toggleCameraBtn.addEventListener('click', function() {
            facingMode = facingMode === 'user' ? 'environment' : 'user';
            startCamera();
        });
    }

    // Final Init
    startCamera();
});
