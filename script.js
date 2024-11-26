class QRCodeScanner {
    constructor() {
        this.fileInput = document.getElementById('file-input');
        this.scanButton = document.getElementById('scan-button');
        this.previewImage = document.getElementById('preview-image');
        this.resultDiv = document.getElementById('result');
        this.resultText = document.getElementById('result-text');
        this.copyAllButton = document.getElementById('copy-all');
        this.hiddenCanvas = document.getElementById('hidden-canvas');
        this.lastScannedData = null;
        this.isProcessing = false;
        
        this.initializeEvents();
        this.cropper = null;
        this.createResizeButton();
    }
    setLoadingState(loading) {
        this.isProcessing = loading;
        const button = this.scanButton;
        const fileInput = this.fileInput;
        const spinner = button.querySelector('.loading-spinner');
        const buttonText = button.querySelector('.button-text');

        if (loading) {
            button.classList.add('loading');
            fileInput.classList.add('loading-state');
            spinner.style.display = 'block';
            button.disabled = true;
            fileInput.disabled = true;
        } else {
            button.classList.remove('loading');
            fileInput.classList.remove('loading-state');
            spinner.style.display = 'none';
            button.disabled = false;
            fileInput.disabled = false;
        }
    }

    formatDate(dateString) {
        // Check if the string matches the format DDMMYYYY
        if (dateString.length === 8) {
            const day = dateString.substring(0, 2);
            const month = dateString.substring(2, 4);
            const year = dateString.substring(4, 8);
            return `${day}/${month}/${year}`;
        }
        return dateString; // Return original string if it doesn't match expected format
    }
    initializeEvents() {
        this.scanButton.addEventListener('click', () => this.handleScan());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.copyAllButton.addEventListener('click', () => this.copyAllData());
    }

    showToast(message = 'Đã sao chép vào clipboard!') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show';
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 3000);
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast();
        } catch (err) {
            console.error('Failed to copy text: ', err);
            this.showToast('Không thể sao chép văn bản!');
        }
    }

    copyAllData() {
        if (this.lastScannedData) {
            const fields = this.lastScannedData.split('|');
            const fieldNames = [
                'CC/CCCD 12 số',
                'CMND 9 số',
                'Họ và tên',
                'Ngày sinh',
                'Giới tính',
                'Địa chỉ',
                'Ngày cấp',
                'Trường 8',
                'Trường 9',
                'Trường 10',
                'Trường 11'
            ];
    
            const formattedData = fields
                .map((value, index) => value ? `${fieldNames[index]}: ${ (index === 3 || index === 6) ? this.formatDate(value) :  value}` : null)
                .filter(item => item !== null)
                .join('\n');
    
            this.copyToClipboard(formattedData);
        }
    }

    async handleFileSelect(event) {
        if (this.isProcessing) return;

        const file = event.target.files[0];
        if (file) {
            this.setLoadingState(true);
            try {
                await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const originalWidth = img.width;
                            const originalHeight = img.height;
                            
                            let newWidth = originalWidth;
                            let newHeight = originalHeight;
                            
                            if (originalWidth > originalHeight) {
                                if (originalWidth > 500) {
                                    newWidth = 500;
                                    newHeight = (originalHeight * 500) / originalWidth;
                                }
                            } else {
                                if (originalHeight > 500) {
                                    newHeight = 500;
                                    newWidth = (originalWidth * 500) / originalHeight;
                                }
                            }
                            
                            this.previewImage.style.width = `${newWidth}px`;
                            this.previewImage.style.height = `${newHeight}px`;
                            resolve();
                        };
                        img.onerror = reject;
                        img.src = e.target.result;
                        this.previewImage.src = e.target.result;
                        this.previewImage.style.display = 'block';
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            } catch (error) {
                console.error('Error loading image:', error);
                this.showToast('Lỗi khi tải ảnh lên!');
            } finally {
                this.setLoadingState(false);
            }
        }
        this.resizeButton.style.display = 'inline-block';

    }

    visualizeData(qrData) {
        this.lastScannedData = qrData;
        const fields = qrData.split('|');
        const fieldNames = [
            'CC/CCCD 12 số',
            'CMND 9 số',
            'Họ và tên',
            'Ngày sinh',
            'Giới tính',
            'Địa chỉ',
            'Ngày cấp',
            'Trường 8',
            'Trường 9',
            'Trường 10',
            'Trường 11'
        ];

        let htmlContent = '';
        
        fields.forEach((value, index) => {
            if (value) {
                // Format dates for specific fields
                let displayValue = value;
                if (index === 3 || index === 6) { // Ngày sinh or Ngày cấp
                    displayValue = this.formatDate(value);
                }

                htmlContent += `
                    <div class="result-card">
                        <div class="result-label">
                            ${fieldNames[index]}
                            <i class="fas fa-copy copy-icon" 
                               onclick="qrScanner.copyToClipboard('${displayValue}')"
                               title="Sao chép"></i>
                        </div>
                        <div class="result-value">${displayValue}</div>
                    </div>
                `;
            }
        });

        const currentTime = new Date().toLocaleString('vi-VN');
        htmlContent += `
            <div style="margin-top: 20px; font-size: 0.9em; color: #666;">
                Thời gian quét: ${currentTime}
            </div>
        `;

        this.resultText.innerHTML = htmlContent;
        this.copyAllButton.style.display = 'block';
    }

    async handleScan() {
        if (this.isProcessing) return;
    
        try {
            if (!this.fileInput.files.length) {
                alert('Vui lòng chọn ảnh trước!');
                return;
            }
    
            this.setLoadingState(true);
            // Pass the image element instead of the URL
            const result = await this.decodeQRCode(this.previewImage);
            
            this.resultDiv.style.display = 'block';
            if (result) {
                this.visualizeData(result.text ?? result.data);
            } else {
                this.resultText.textContent = 'Không tìm thấy mã QR trong ảnh.';
                this.resultText.style.color = '#f44336';
                this.copyAllButton.style.display = 'none';
            }
        } catch (error) {
            console.error('Lỗi khi quét mã QR:', error);
            this.resultDiv.style.display = 'block';
            this.resultText.textContent = error.message || 'Có lỗi xảy ra khi quét mã QR. Vui lòng thử lại.';
            this.resultText.style.color = '#f44336';
            this.copyAllButton.style.display = 'none';
        } finally {
            this.setLoadingState(false);
        }
    }
    
    async decodeQRCode(imageElement) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Quá thời gian xử lý QR (5 giây)'));
            }, 5000);
    
            try {
                // Wait for image to be fully loaded
                if (!imageElement.complete) {
                    imageElement.onload = () => processImage();
                    imageElement.onerror = () => reject(new Error('Lỗi khi tải ảnh'));
                } else {
                    processImage();
                }
    
                function processImage() {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
    
                        // Set canvas size to match image
                        canvas.width = imageElement.naturalWidth;
                        canvas.height = imageElement.naturalHeight;
    
                        // Draw image onto canvas
                        ctx.drawImage(imageElement, 0, 0);
    
                        // Get image data
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        // Try to decode QR code with different inversion attempts
                        let code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert"
                        });
                        
                        if (!code) {
                            // Try again with inversion if first attempt failed
                            code = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: "invertFirst"
                            });
                        }
                        
                        clearTimeout(timeout);
                        
                        if (code) {
                            resolve(code);
                        } else {
                            reject(new Error('Không tìm thấy mã QR'));
                        }
                    } catch (error) {
                        clearTimeout(timeout);
                        reject(new Error('Lỗi khi xử lý ảnh: ' + error.message));
                    }
                }
            } catch (error) {
                clearTimeout(timeout);
                reject(new Error('Lỗi khi xử lý ảnh: ' + error.message));
            }
        });
    }

    createResizeButton() {
        // Create resize controls container
        const resizeControls = document.createElement('div');
        resizeControls.className = 'resize-controls';
        
        // Create resize button
        this.resizeButton = document.createElement('button');
        this.resizeButton.className = 'button resize-button';
        this.resizeButton.innerHTML = '<i class="fas fa-crop"></i> Chỉnh sửa ảnh';
        // Create apply and cancel buttons
        const applyButton = document.createElement('button');
        applyButton.className = 'button margin-4';
        applyButton.innerHTML = '<i class="fas fa-check"></i> Áp dụng';
        applyButton.style.display = 'none';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'button margin-4';
        cancelButton.innerHTML = '<i class="fas fa-times"></i> Hủy';
        cancelButton.style.display = 'none';

        resizeControls.appendChild(applyButton);
        resizeControls.appendChild(cancelButton);
        
        // Add event listeners
        this.resizeButton.addEventListener('click', () => this.startResize());
        applyButton.addEventListener('click', () => this.applyResize());
        cancelButton.addEventListener('click', () => this.cancelResize());
        
        // Insert buttons
        const previewContainer = this.previewImage.parentElement;
        previewContainer.insertBefore(this.resizeButton, this.previewImage);
        previewContainer.insertBefore(resizeControls, this.previewImage);
        
        this.resizeControls = resizeControls;
        this.applyButton = applyButton;
        this.cancelButton = cancelButton;
    }

    startResize() {

        if (!this.fileInput.files.length) {
            alert('Vui lòng chọn ảnh trước!');
            return;
        }


        this.resizeButton.style.display = 'none';
        this.applyButton.style.display = 'inline-block';
        this.cancelButton.style.display = 'inline-block';
        
        // Initialize cropper
        this.cropper = new Cropper(this.previewImage, {
            aspectRatio: NaN,
            viewMode: 1,
            dragMode: 'move',
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    }

    async applyResize() {
        if (this.cropper) {
            try {
                // Get cropped canvas
                const croppedCanvas = this.cropper.getCroppedCanvas();
                
                // Convert to blob
                const blob = await new Promise(resolve => {
                    croppedCanvas.toBlob(resolve, 'image/jpeg', 0.9);
                });
                
                // Create URL and update preview
                const url = URL.createObjectURL(blob);
                this.previewImage.src = url;
                
                // Cleanup
                this.cleanupResize();
                this.showToast('Đã cập nhật ảnh thành công!');
            } catch (error) {
                console.error('Error applying resize:', error);
                this.showToast('Lỗi khi cập nhật ảnh!');
            }
        }
    }

    cancelResize() {
        this.cleanupResize();
    }

    cleanupResize() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        this.resizeButton.style.display = 'inline-block';
        this.applyButton.style.display = 'none';
        this.cancelButton.style.display = 'none';
    }
}

// Initialize the scanner when the page loads
let qrScanner;
document.addEventListener('DOMContentLoaded', () => {
    qrScanner = new QRCodeScanner();
});