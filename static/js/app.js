const fileInput = document.getElementById('pdfFiles');
const singleFileInput = document.getElementById('singleFileInput');
const fileList = document.getElementById('fileList');
const selectedFiles = document.getElementById('selectedFiles');
const form = document.getElementById('mergeForm');
const loading = document.getElementById('loading');
const result = document.getElementById('result');

// เก็บไฟล์ที่เลือกไว้ในอาเรย์
let selectedFilesList = [];

fileInput.addEventListener('change', function() {
    handleMultipleFiles(this.files);
});

singleFileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
        addSingleFile(this.files[0]);
        this.value = ''; // ล้างค่าเพื่อให้สามารถเลือกไฟล์เดิมได้อีก
    }
});

function selectMultipleFiles() {
    fileInput.click();
}

function selectSingleFile() {
    singleFileInput.click();
}

function handleMultipleFiles(files) {
    // เพิ่มไฟล์ทั้งหมดจาก file input
    for (let i = 0; i < files.length; i++) {
        addSingleFile(files[i]);
    }
    fileInput.value = ''; // ล้างค่า input
}

function addSingleFile(file) {
    // ตรวจสอบว่าไฟล์นี้มีอยู่แล้วหรือไม่
    const isDuplicate = selectedFilesList.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
    );
    
    if (isDuplicate) {
        showResult('error', `ไฟล์ "${file.name}" มีอยู่ในรายการแล้ว`);
        return;
    }
    
    // ตรวจสอบว่าเป็นไฟล์ PDF หรือไม่
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showResult('error', `ไฟล์ "${file.name}" ไม่ใช่ไฟล์ PDF`);
        return;
    }
    
    selectedFilesList.push(file);
    displaySelectedFiles();
}

function removeFile(index) {
    selectedFilesList.splice(index, 1);
    displaySelectedFiles();
    if (selectedFilesList.length === 0) {
        result.style.display = 'none';
    }
}

function displaySelectedFiles() {
    const fileCountElement = document.getElementById('fileCount');
    
    if (selectedFilesList.length > 0) {
        fileList.style.display = 'block';
        selectedFiles.innerHTML = '';
        
        selectedFilesList.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-item-content">
                    📄 ${file.name} (${formatFileSize(file.size)})
                </div>
                <button type="button" class="file-remove-btn" onclick="removeFile(${index})" title="ลบไฟล์นี้">
                    ✕
                </button>
            `;
            selectedFiles.appendChild(fileItem);
        });
        
        // อัปเดตจำนวนไฟล์
        if (fileCountElement) {
            fileCountElement.textContent = selectedFilesList.length;
        }
    } else {
        fileList.style.display = 'none';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function clearFiles() {
    selectedFilesList = [];
    fileInput.value = '';
    singleFileInput.value = '';
    fileList.style.display = 'none';
    result.style.display = 'none';
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (selectedFilesList.length < 2) {
        showResult('error', 'กรุณาเลือกไฟล์ PDF อย่างน้อย 2 ไฟล์');
        return;
    }

    const formData = new FormData();
    selectedFilesList.forEach(file => {
        formData.append('files', file);
    });

    loading.style.display = 'block';
    result.style.display = 'none';

    try {
        const response = await fetch('/merge', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            showResult('success', `รวม PDF สำเร็จ! <br><a href="${data.download_url}" target="_blank" style="color: #155724; font-weight: bold;">📥 ดาวน์โหลดไฟล์ที่รวมแล้ว</a>`);
        } else {
            showResult('error', 'เกิดข้อผิดพลาด: ' + data.message);
        }
    } catch (error) {
        showResult('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message);
    } finally {
        loading.style.display = 'none';
    }
});

function showResult(type, message) {
    result.className = 'result ' + type;
    result.innerHTML = message;
    result.style.display = 'block';
}

// Drag and drop functionality
const uploadArea = document.querySelector('.upload-area');

uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = '#667eea';
    uploadArea.style.background = '#f0f4ff';
});

uploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = '#ddd';
    uploadArea.style.background = '#f9f9f9';
});

uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = '#ddd';
    uploadArea.style.background = '#f9f9f9';
    
    const files = e.dataTransfer.files;
    // เพิ่มไฟล์ที่ลากมาวางทีละไฟล์
    for (let i = 0; i < files.length; i++) {
        addSingleFile(files[i]);
    }
});
