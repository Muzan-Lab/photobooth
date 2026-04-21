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
    const closeBtn = document.querySelector('.close-btn');
    const downloadBtn = document.getElementById('downloadBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const frameOptions = document.querySelectorAll('.frame-option');
    const toggleCameraBtn = document.getElementById('toggleCamera');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const shotsIndicator = document.getElementById('shotsIndicator');

    let currentStream = null;
    let selectedFrame = 'none';
    let facingMode = 'user';
    let isCapturing = false;
    let sessionMode = 'strip'; // 'strip' or 'single'

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
            alert("Could not access camera.");
        }
    }

    // 1.5 Handle Mode Selection
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isCapturing) return;
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sessionMode = btn.dataset.mode;
            
            // Show/Hide shots indicator
            if (sessionMode === 'single') {
                shotsIndicator.classList.add('hidden');
            } else {
                shotsIndicator.classList.remove('hidden');
            }
        });
    });

    // 2. Handle Frame Selection
    frameOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (isCapturing) return;
            frameOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            selectedFrame = option.dataset.frame;
            if (selectedFrame === 'none') {
                frameOverlay.style.backgroundImage = 'none';
            } else {
                frameOverlay.style.backgroundImage = `url('assets/frames/${selectedFrame}.png')`;
                
                // Adjust blend mode based on frame style
                if (selectedFrame === 'floral') {
                    frameOverlay.style.mixBlendMode = 'multiply';
                } else {
                    frameOverlay.style.mixBlendMode = 'screen';
                }
            }
        });
    });

    // 3. Countdown Helper
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function runCountdown() {
        countdownEl.classList.add('active');
        for (let i = 3; i > 0; i--) {
            countdownEl.textContent = i;
            await sleep(1000);
        }
        countdownEl.classList.remove('active');
        countdownEl.textContent = '';
    }

    // 4. Multi-Capture Sequence
    captureBtn.addEventListener('click', async () => {
        if (isCapturing) return;
        isCapturing = true;
        captureBtn.style.opacity = '0.5';
        captureBtn.disabled = true;

        if (sessionMode === 'strip') {
            const capturedShots = [];
            dots.forEach(dot => dot.classList.remove('active'));

            for (let i = 0; i < 3; i++) { // Changed from 4 to 3
                await runCountdown();
                const shot = captureSingleFrame();
                capturedShots.push(shot);
                dots[i].classList.add('active');
                flashEffect.classList.add('active');
                setTimeout(() => flashEffect.classList.remove('active'), 500);
                await sleep(1000);
            }
            await generateStrip(capturedShots);
        } else {
            // Single Mode
            await runCountdown();
            const shot = captureSingleFrame();
            flashEffect.classList.add('active');
            setTimeout(() => flashEffect.classList.remove('active'), 500);
            await generateSingle(shot);
        }
        
        isCapturing = false;
        captureBtn.style.opacity = '1';
        captureBtn.disabled = false;
    });

    async function generateSingle(shot) {
        const size = 1080;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Draw Shot
        ctx.drawImage(shot, 0, 0, size, size);

        // Apply Frame if selected
        if (selectedFrame !== 'none') {
            const frameImg = new Image();
            frameImg.src = `assets/frames/${selectedFrame}.png`;
            await new Promise(r => frameImg.onload = r);
            
            ctx.save();
            ctx.globalCompositeOperation = (selectedFrame === 'floral') ? 'multiply' : 'screen';
            ctx.drawImage(frameImg, 0, 0, size, size);
            ctx.restore();
        }

        resultImage.src = canvas.toDataURL('image/png');
        previewModal.classList.add('active');
    }

    function captureSingleFrame() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1080;
        tempCanvas.height = 1080;
        const ctx = tempCanvas.getContext('2d');

        // Draw Video (Mirrored)
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

    async function generateStrip(shots) {
        // Strip Dimensions for a classic vertical photobooth look
        const stripW = 400;
        const padding = 12; // Thinner padding for larger photos
        const shotSize = stripW - (padding * 2); 
        const headerH = 120;
        const footerH = 220;
        const gap = 8; // Minimal gap like in professional strips
        const totalH = headerH + (shotSize * shots.length) + (gap * (shots.length - 1)) + footerH;
        
        canvas.width = stripW;
        canvas.height = totalH;
        const ctx = canvas.getContext('2d');

        // Background Color (Pure White)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, stripW, totalH);

        // --- Draw Header (Logo + Text) ---
        ctx.fillStyle = '#111111';
        
        // Placeholder Logo Icon (A rounded square with 'B')
        const iconSize = 50;
        const iconX = padding + 20;
        const iconY = 35;
        
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(iconX, iconY, iconSize, iconSize, 12);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 32px Inter';
        ctx.fillText('B', iconX + iconSize/2, iconY + iconSize/2 + 12);
        ctx.restore();

        // Brand Text
        ctx.fillStyle = '#111111';
        ctx.textAlign = 'left';
        
        // BestBost - Bold
        ctx.font = '800 24px Inter';
        ctx.fillText('BestBost', iconX + iconSize + 15, iconY + 22);
        
        // photobooth - Clean sans
        ctx.font = '400 16px Inter';
        ctx.fillStyle = '#555';
        ctx.fillText('photobooth', iconX + iconSize + 15, iconY + 45);

        // --- Draw Shots ---
        for (let i = 0; i < shots.length; i++) {
            const yPos = headerH + (i * (shotSize + gap));
            ctx.drawImage(shots[i], padding, yPos, shotSize, shotSize);
        }

        // --- Apply Frame Overlay ---
        if (selectedFrame !== 'none') {
            const frameImg = new Image();
            frameImg.src = `assets/frames/${selectedFrame}.png`;
            await new Promise(r => {
                frameImg.onload = r;
                frameImg.onerror = r;
            });
            
            for (let i = 0; i < shots.length; i++) {
                const yPos = headerH + (i * (shotSize + gap));
                ctx.save();
                ctx.globalCompositeOperation = (selectedFrame === 'floral') ? 'multiply' : 'screen';
                ctx.drawImage(frameImg, padding, yPos, shotSize, shotSize);
                ctx.restore();
            }
        }

        // --- Draw QR Code Section ---
        const igUser = 'asyrafm08_';
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://www.instagram.com/${igUser}`;
        
        try {
            const qrImg = new Image();
            qrImg.crossOrigin = 'anonymous';
            qrImg.src = qrUrl;
            await new Promise((resolve) => {
                qrImg.onload = resolve;
                qrImg.onerror = resolve;
            });
            
            if (qrImg.complete && qrImg.naturalWidth !== 0) {
                const qrSize = 140; // Large and clear
                const qrX = (stripW - qrSize) / 2;
                const qrY = totalH - footerH + 20;
                
                // Draw QR
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                
                // IG Handle with icon-like styling
                ctx.fillStyle = '#111111';
                ctx.font = 'bold 15px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(`@${igUser}`, stripW / 2, qrY + qrSize + 30);
            }
        } catch (err) {
            console.error("QR drawing failed:", err);
        }

        resultImage.src = canvas.toDataURL('image/png');
        previewModal.classList.add('active');
    }

    // Modal & Download Controls
    closeBtn.addEventListener('click', () => previewModal.classList.remove('active'));
    retakeBtn.addEventListener('click', () => previewModal.classList.remove('active'));
    
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `GlowBooth-Strip-${Date.now()}.png`;
        link.href = resultImage.src;
        link.click();
    });

    toggleCameraBtn.addEventListener('click', () => {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        startCamera();
    });

    startCamera();
});
