let videoStream = null;

async function initCamera() {
    const video = document.getElementById('videoPreview');
    const captureBtn = document.getElementById('captureBtn');
    const cameraError = document.getElementById('cameraError');
    const retryBtn = document.getElementById('retryCamera');
    
    if (!video || !captureBtn) return;
    
    async function startCamera() {
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 1280 }
                }
            });
            
            video.srcObject = videoStream;
            captureBtn.disabled = false;
            if (cameraError) cameraError.style.display = 'none';
        } catch (err) {
            console.error('Camera error:', err);
            if (cameraError) cameraError.style.display = 'flex';
            captureBtn.disabled = true;
        }
    }
    
    await startCamera();
    
    if (retryBtn) {
        retryBtn.addEventListener('click', startCamera);
    }
    
    captureBtn.addEventListener('click', captureImage);
}

function captureImage() {
    const video = document.getElementById('videoPreview');
    const canvas = document.getElementById('captureCanvas');
    
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.85);
    analyzeImage(imageData);
}

function initUpload() {
    const uploadInput = document.getElementById('imageUpload');
    
    if (!uploadInput) return;
    
    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            analyzeImage(imageData);
        };
        reader.readAsDataURL(file);
    });
}

async function analyzeImage(imageData) {
    const loading = document.getElementById('loadingOverlay');
    const resultSection = document.getElementById('resultSection');
    const cameraContainer = document.getElementById('cameraContainer');
    const uploadSection = document.getElementById('uploadSection');
    
    if (loading) loading.style.display = 'flex';
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        });
        
        const result = await response.json();
        
        if (loading) loading.style.display = 'none';
        
        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }
        
        displayResult(result);
        
        if (cameraContainer) cameraContainer.style.display = 'none';
        if (uploadSection) uploadSection.style.display = 'none';
        if (resultSection) resultSection.style.display = 'block';
        
    } catch (err) {
        console.error('Analysis error:', err);
        if (loading) loading.style.display = 'none';
        alert('Failed to analyze image. Please try again.');
    }
}

function displayResult(result) {
    const nameEl = document.getElementById('resultName');
    const confidenceEl = document.getElementById('resultConfidence');
    const seriesEl = document.getElementById('resultSeries');
    const attributeEl = document.getElementById('resultAttribute');
    const gPowerEl = document.getElementById('resultGPower');
    const rarityEl = document.getElementById('resultRarity');
    const descEl = document.getElementById('resultDescription');
    
    if (nameEl) nameEl.textContent = result.name || 'Unknown';
    
    if (confidenceEl) {
        const conf = Math.round((result.confidence || 0) * 100);
        confidenceEl.textContent = conf + '%';
        confidenceEl.className = 'confidence-badge';
        if (conf >= 80) confidenceEl.classList.add('high');
        else if (conf >= 50) confidenceEl.classList.add('medium');
        else confidenceEl.classList.add('low');
    }
    
    if (seriesEl) seriesEl.textContent = result.series || '-';
    
    if (attributeEl) {
        attributeEl.textContent = result.attribute || '-';
        attributeEl.className = 'detail-value';
        if (result.attribute) {
            attributeEl.classList.add('attribute-' + result.attribute.toLowerCase());
        }
    }
    
    if (gPowerEl) gPowerEl.textContent = result.g_power ? result.g_power + ' Gs' : '-';
    if (rarityEl) rarityEl.textContent = result.rarity || '-';
    if (descEl) descEl.textContent = result.description || '';
}

document.addEventListener('DOMContentLoaded', () => {
    const scanAgainBtn = document.getElementById('scanAgainBtn');
    
    if (scanAgainBtn) {
        scanAgainBtn.addEventListener('click', () => {
            const cameraContainer = document.getElementById('cameraContainer');
            const uploadSection = document.getElementById('uploadSection');
            const resultSection = document.getElementById('resultSection');
            
            if (cameraContainer) cameraContainer.style.display = 'block';
            if (uploadSection) uploadSection.style.display = 'block';
            if (resultSection) resultSection.style.display = 'none';
        });
    }
});
