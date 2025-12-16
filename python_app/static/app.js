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
        
        if (result.name && result.name !== 'Unknown' && result.name !== 'Error') {
            fetchMarketData(result.name, result.attribute);
        }
        
    } catch (err) {
        console.error('Analysis error:', err);
        if (loading) loading.style.display = 'none';
        alert('Failed to analyze image. Please try again.');
    }
}

async function fetchMarketData(bakuganName, attribute) {
    const marketSection = document.getElementById('marketSection');
    const marketLoading = document.getElementById('marketLoading');
    const pricingData = document.getElementById('pricingData');
    const referenceImages = document.getElementById('referenceImages');
    
    if (!marketSection) return;
    
    marketSection.style.display = 'block';
    if (marketLoading) marketLoading.style.display = 'flex';
    if (pricingData) pricingData.style.display = 'none';
    if (referenceImages) referenceImages.style.display = 'none';
    
    try {
        let url = `/api/market-data?name=${encodeURIComponent(bakuganName)}`;
        if (attribute) {
            url += `&attribute=${encodeURIComponent(attribute)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (marketLoading) marketLoading.style.display = 'none';
        
        displayMarketData(data);
        
    } catch (err) {
        console.error('Market data error:', err);
        if (marketLoading) marketLoading.style.display = 'none';
        if (marketSection) {
            marketSection.innerHTML = '<p class="market-error">Could not load market data</p>';
        }
    }
}

function displayMarketData(data) {
    const pricingData = document.getElementById('pricingData');
    const referenceImages = document.getElementById('referenceImages');
    
    if (pricingData && data.pricing) {
        pricingData.style.display = 'block';
        
        if (data.pricing.success && data.pricing.average_price) {
            const avgPrice = document.getElementById('avgPrice');
            const priceRange = document.getElementById('priceRange');
            const numListings = document.getElementById('numListings');
            
            if (avgPrice) avgPrice.textContent = '$' + data.pricing.average_price.toFixed(2);
            if (priceRange) priceRange.textContent = '$' + data.pricing.min_price.toFixed(2) + ' - $' + data.pricing.max_price.toFixed(2);
            if (numListings) numListings.textContent = data.pricing.num_listings + ' recent sales';
            
            const listingsContainer = document.getElementById('recentListings');
            if (listingsContainer && data.pricing.listings) {
                listingsContainer.innerHTML = '';
                data.pricing.listings.slice(0, 3).forEach(listing => {
                    const item = document.createElement('div');
                    item.className = 'listing-item';
                    item.innerHTML = `
                        <span class="listing-price">$${listing.price.toFixed(2)}</span>
                        <span class="listing-title">${listing.title.substring(0, 40)}...</span>
                    `;
                    if (listing.url) {
                        item.style.cursor = 'pointer';
                        item.onclick = () => window.open(listing.url, '_blank');
                    }
                    listingsContainer.appendChild(item);
                });
            }
        } else {
            pricingData.innerHTML = '<p class="no-data">No pricing data found</p>';
        }
    }
    
    if (referenceImages && data.images) {
        referenceImages.style.display = 'block';
        
        if (data.images.success && data.images.items && data.images.items.length > 0) {
            const imagesGrid = document.getElementById('imagesGrid');
            if (imagesGrid) {
                imagesGrid.innerHTML = '';
                data.images.items.forEach(img => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'reference-image';
                    imgContainer.innerHTML = `
                        <img src="${img.url}" alt="${img.title}" onerror="this.parentElement.remove()">
                        <span class="image-source">${img.source}</span>
                    `;
                    imagesGrid.appendChild(imgContainer);
                });
            }
        } else {
            referenceImages.innerHTML = '<p class="no-data">No reference images found</p>';
        }
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
    
    const marketSection = document.getElementById('marketSection');
    if (marketSection) {
        marketSection.innerHTML = `
            <div id="marketLoading" class="market-loading" style="display: none;">
                <div class="loading-spinner small"></div>
                <p>Looking up market data...</p>
            </div>
            <div id="pricingData" class="pricing-section" style="display: none;">
                <h3>Market Value</h3>
                <div class="price-summary">
                    <div class="price-main">
                        <span class="price-label">Average Price</span>
                        <span id="avgPrice" class="price-value">-</span>
                    </div>
                    <div class="price-details">
                        <span id="priceRange" class="price-range">-</span>
                        <span id="numListings" class="listing-count">-</span>
                    </div>
                </div>
                <div id="recentListings" class="recent-listings"></div>
            </div>
            <div id="referenceImages" class="images-section" style="display: none;">
                <h3>Reference Images</h3>
                <div id="imagesGrid" class="images-grid"></div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const scanAgainBtn = document.getElementById('scanAgainBtn');
    
    if (scanAgainBtn) {
        scanAgainBtn.addEventListener('click', () => {
            const cameraContainer = document.getElementById('cameraContainer');
            const uploadSection = document.getElementById('uploadSection');
            const resultSection = document.getElementById('resultSection');
            const marketSection = document.getElementById('marketSection');
            
            if (cameraContainer) cameraContainer.style.display = 'block';
            if (uploadSection) uploadSection.style.display = 'block';
            if (resultSection) resultSection.style.display = 'none';
            if (marketSection) marketSection.style.display = 'none';
        });
    }
});
