// PDF Merger Application JavaScript

class PDFMerger {
    constructor() {
        this.form = document.getElementById('pdfForm');
        this.mergeBtn = document.getElementById('mergeBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.retryBtn = document.getElementById('retryBtn');
        
        this.loadingState = document.getElementById('loadingState');
        this.resultSection = document.getElementById('resultSection');
        this.errorSection = document.getElementById('errorSection');
        
        this.mergedPdfData = null;
        this.mergedFileName = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupFileInputs();
    }
    
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Reset button
        this.resetBtn.addEventListener('click', () => this.resetForm());
        
        // Download button
        this.downloadBtn.addEventListener('click', () => this.downloadPDF());
        
        // Retry button
        this.retryBtn.addEventListener('click', () => this.hideError());
    }
    
    setupFileInputs() {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => this.handleFileSelect(e));
        });
    }
    
    handleFileSelect(event) {
        const input = event.target;
        const fileDisplay = input.parentElement.querySelector('.file-display span');
        const uploadGroup = input.closest('.file-upload-group');
        
        if (input.files.length > 0) {
            const file = input.files[0];
            
            // Check if file is PDF
            if (file.type !== 'application/pdf') {
                this.showError('กรุณาเลือกไฟล์ PDF เท่านั้น');
                input.value = '';
                return;
            }
            
            // Check file size (max 50MB)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                this.showError('ขนาดไฟล์ต้องไม่เกิน 50MB');
                input.value = '';
                return;
            }
            
            // Update display
            fileDisplay.textContent = `✓ ${file.name} (${this.formatFileSize(file.size)})`;
            uploadGroup.classList.add('file-selected');
            
            // Update merge button state
            this.updateMergeButtonState();
        } else {
            // Reset display
            const labelText = this.getDefaultLabelText(input.name);
            fileDisplay.textContent = labelText;
            uploadGroup.classList.remove('file-selected');
            
            // Update merge button state
            this.updateMergeButtonState();
        }
    }
    
    getDefaultLabelText(inputName) {
        const labels = {
            'official_document': 'เลือกไฟล์หนังสือราชการ (PDF)',
            'id_card': 'เลือกไฟล์สำเนาบัตรประชาชน (PDF)',
            'request_form': 'เลือกไฟล์ตัวแบบคำขอ (PDF)'
        };
        return labels[inputName] || 'เลือกไฟล์ PDF';
    }
    
    updateMergeButtonState() {
        const officialDoc = document.getElementById('official_document');
        const idCard = document.getElementById('id_card');
        
        const hasRequiredFiles = officialDoc.files.length > 0 && idCard.files.length > 0;
        
        this.mergeBtn.disabled = !hasRequiredFiles;
        
        if (hasRequiredFiles) {
            this.mergeBtn.innerHTML = '<i class="fas fa-magic"></i><span>รวม PDF</span>';
        } else {
            this.mergeBtn.innerHTML = '<i class="fas fa-magic"></i><span>กรุณาเลือกไฟล์ที่จำเป็น</span>';
        }
    }
    
    async handleFormSubmit(event) {
        event.preventDefault();
        
        // Validate required files
        const officialDoc = document.getElementById('official_document');
        const idCard = document.getElementById('id_card');
        
        if (!officialDoc.files.length) {
            this.showError('กรุณาเลือกไฟล์หนังสือราชการ');
            return;
        }
        
        if (!idCard.files.length) {
            this.showError('กรุณาเลือกไฟล์สำเนาบัตรประชาชน');
            return;
        }
        
        await this.mergePDFs();
    }
    
    async mergePDFs() {
        try {
            this.showLoading();
            
            // Prepare form data
            const formData = new FormData(this.form);
            
            // Send request to server
            const response = await fetch('/merge', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.mergedPdfData = result.pdf_data;
                this.mergedFileName = result.filename;
                this.showSuccess(result);
            } else {
                this.showError(result.message);
            }
            
        } catch (error) {
            console.error('Error merging PDFs:', error);
            this.showError('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        } finally {
            this.hideLoading();
        }
    }
    
    showLoading() {
        this.hideAllSections();
        this.loadingState.classList.remove('hidden');
        this.mergeBtn.disabled = true;
    }
    
    hideLoading() {
        this.loadingState.classList.add('hidden');
        this.updateMergeButtonState();
    }
    
    showSuccess(result) {
        this.hideAllSections();
        
        // Update result information
        document.getElementById('resultMessage').textContent = result.message;
        document.getElementById('fileName').textContent = `ชื่อไฟล์: ${result.filename}`;
        document.getElementById('fileSize').textContent = `ขนาด: ${this.formatFileSize(result.pdf_size)}`;
        
        this.resultSection.classList.remove('hidden');
        
        // Scroll to result
        this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    showError(message) {
        this.hideAllSections();
        document.getElementById('errorMessage').textContent = message;
        this.errorSection.classList.remove('hidden');
        
        // Scroll to error
        this.errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    hideError() {
        this.errorSection.classList.add('hidden');
    }
    
    hideAllSections() {
        this.loadingState.classList.add('hidden');
        this.resultSection.classList.add('hidden');
        this.errorSection.classList.add('hidden');
    }
    
    downloadPDF() {
        if (!this.mergedPdfData || !this.mergedFileName) {
            this.showError('ไม่มีข้อมูล PDF สำหรับดาวน์โหลด');
            return;
        }
        
        try {
            // Convert base64 to blob
            const byteCharacters = atob(this.mergedPdfData);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.mergedFileName;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Show success message
            this.showNotification('ดาวน์โหลดไฟล์สำเร็จ!', 'success');
            
        } catch (error) {
            console.error('Error downloading PDF:', error);
            this.showError('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');
        }
    }
    
    resetForm() {
        // Reset form
        this.form.reset();
        
        // Reset file displays
        const fileGroups = document.querySelectorAll('.file-upload-group');
        fileGroups.forEach(group => {
            group.classList.remove('file-selected');
            const span = group.querySelector('.file-display span');
            const input = group.querySelector('input[type="file"]');
            span.textContent = this.getDefaultLabelText(input.name);
        });
        
        // Hide all sections
        this.hideAllSections();
        
        // Reset merge button
        this.updateMergeButtonState();
        
        // Clear stored data
        this.mergedPdfData = null;
        this.mergedFileName = null;
        
        // Show notification
        this.showNotification('เริ่มต้นใหม่เรียบร้อยแล้ว', 'info');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '10px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '500',
            zIndex: '10000',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: '300px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            background: this.getNotificationColor(type),
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
    
    getNotificationColor(type) {
        const colors = {
            'success': 'linear-gradient(135deg, #48bb78, #38a169)',
            'error': 'linear-gradient(135deg, #e53e3e, #c53030)',
            'warning': 'linear-gradient(135deg, #ed8936, #dd6b20)',
            'info': 'linear-gradient(135deg, #4299e1, #3182ce)'
        };
        return colors[type] || colors.info;
    }
}

// Health check function
async function checkServerHealth() {
    try {
        const response = await fetch('/health');
        const result = await response.json();
        console.log('Server health:', result);
        return result.status === 'healthy';
    } catch (error) {
        console.error('Server health check failed:', error);
        return false;
    }
}

// Drag and drop functionality
function setupDragAndDrop() {
    const fileGroups = document.querySelectorAll('.file-upload-group');
    
    fileGroups.forEach(group => {
        const input = group.querySelector('input[type="file"]');
        
        group.addEventListener('dragover', (e) => {
            e.preventDefault();
            group.style.borderColor = '#4299e1';
            group.style.background = '#ebf8ff';
        });
        
        group.addEventListener('dragleave', (e) => {
            e.preventDefault();
            group.style.borderColor = '';
            group.style.background = '';
        });
        
        group.addEventListener('drop', (e) => {
            e.preventDefault();
            group.style.borderColor = '';
            group.style.background = '';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                input.dispatchEvent(new Event('change'));
            }
        });
    });
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Check server health
    const isHealthy = await checkServerHealth();
    if (!isHealthy) {
        console.warn('Server health check failed. Some features may not work properly.');
    }
    
    // Initialize PDF Merger
    const pdfMerger = new PDFMerger();
    
    // Setup drag and drop
    setupDragAndDrop();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    e.preventDefault();
                    pdfMerger.resetForm();
                    break;
                case 'Enter':
                    if (!pdfMerger.mergeBtn.disabled) {
                        e.preventDefault();
                        pdfMerger.form.dispatchEvent(new Event('submit'));
                    }
                    break;
            }
        }
    });
    
    console.log('PDF Merger application initialized successfully!');
});
