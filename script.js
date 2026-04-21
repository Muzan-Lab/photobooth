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
        // Strip Dimensions tuned for a premium vertical look
        const stripW = 400;
        const padding = 20;
        const shotSize = stripW - (padding * 2); 
        const headerH = 100;
        const footerH = 180;
        const gap = 15;
        const totalH = headerH + (shotSize * shots.length) + (gap * (shots.length - 1)) + footerH;
        
        canvas.width = stripW;
        canvas.height = totalH;
        const ctx = canvas.getContext('2d');

        // Background Color (Pure White like the ref)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, stripW, totalH);

        // Draw Header Text
        ctx.fillStyle = '#1a1a1a';
        ctx.textAlign = 'center';
        
        // BestBost - Bold & Elegant
        ctx.font = '800 28px Inter';
        ctx.fillText('BestBost', stripW / 2, 45);
        
        // photobooth - Light & Spaced
        ctx.font = '300 18px Inter';
        ctx.fillText('photobooth', stripW / 2, 75);

        // Draw Shots
        for (let i = 0; i < shots.length; i++) {
            const yPos = headerH + (i * (shotSize + gap));
            ctx.drawImage(shots[i], padding, yPos, shotSize, shotSize);
        }

        // Apply Frame Overlay
        if (selectedFrame !== 'none') {
            const frameImg = new Image();
            frameImg.src = `assets/frames/${selectedFrame}.png`;
            await new Promise(r => {
                frameImg.onload = r;
                frameImg.onerror = () => {
                    console.error("Failed to load frame:", selectedFrame);
                    r(); // Continue anyway
                }
            });
            
            for (let i = 0; i < shots.length; i++) {
                const yPos = headerH + (i * (shotSize + gap));
                
                ctx.save();
                if (selectedFrame === 'floral') {
                    ctx.globalCompositeOperation = 'multiply';
                } else {
                    ctx.globalCompositeOperation = 'screen';
                }
                
                ctx.drawImage(frameImg, padding, yPos, shotSize, shotSize);
                ctx.restore();
            }
        }

        // Draw QR Code pointing to Instagram
        const igUser = 'asyrafm08_';
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://www.instagram.com/${igUser}`;
        
        try {
            const qrImg = new Image();
            qrImg.crossOrigin = 'anonymous'; // Critical for canvas export
            qrImg.src = qrUrl;
            await new Promise((resolve, reject) => {
                qrImg.onload = resolve;
                qrImg.onerror = () => {
                    console.warn("QR Code failed to load, proceeding without it.");
                    resolve();
                };
            });
            
            if (qrImg.complete && qrImg.naturalWidth !== 0) {
                const qrSize = 100;
                const qrX = (stripW - qrSize) / 2;
                const qrY = totalH - footerH + 30;
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                
                // IG Handle below QR
                ctx.fillStyle = '#666';
                ctx.font = '600 14px Inter';
                ctx.fillText(`@${igUser}`, stripW / 2, qrY + qrSize + 25);
            }
        } catch (err) {
            console.error("Error drawing QR code:", err);
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
