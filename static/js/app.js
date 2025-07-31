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
    
    // ทำความสะอาด URLs ที่สร้างไว้
    cleanupUrls();
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
            // สร้างลิงก์ดาวน์โหลดจาก base64 data
            if (data.pdf_data) {
                const downloadLink = createDownloadLinkFromBase64(data.pdf_data, data.filename);
                showResult('success', `${data.message}<br><br>
                    <div style="margin-top: 15px;">
                        <p style="margin-bottom: 10px;"><strong>📊 ข้อมูลไฟล์:</strong></p>
                        <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
                            <li><strong>ชื่อไฟล์:</strong> ${data.filename}</li>
                            <li><strong>ขนาดไฟล์:</strong> ${formatFileSize(data.pdf_size)}</li>
                            <li><strong>จำนวนไฟล์ที่รวม:</strong> ${selectedFilesList.length} ไฟล์</li>
                        </ul>
                        ${downloadLink}
                    </div>`);
            } else {
                showResult('success', data.message);
            }
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

// ฟังก์ชันสำหรับสร้างลิงก์ดาวน์โหลดจาก base64
function createDownloadLinkFromBase64(base64Data, filename) {
    try {
        // แปลง base64 เป็น binary data
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // สร้าง Blob object
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // สร้าง URL สำหรับ blob
        const url = URL.createObjectURL(blob);
        
        // สร้างปุ่มดาวน์โหลด
        return `
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 15px;">
                <a href="${url}" download="${filename}" class="download-btn" style="
                    display: inline-block; 
                    padding: 12px 24px; 
                    background: #28a745; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                    📥 ดาวน์โหลดไฟล์ PDF
                </a>
                <button onclick="previewPDF('${url}')" class="preview-btn" style="
                    padding: 12px 24px; 
                    background: #007bff; 
                    color: white; 
                    border: none; 
                    border-radius: 8px; 
                    font-weight: bold; 
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                    👁️ ดูตัวอย่าง PDF
                </button>
            </div>
        `;
    } catch (error) {
        console.error('Error creating download link:', error);
        return '<p style="color: #dc3545;">❌ เกิดข้อผิดพลาดในการสร้างลิงก์ดาวน์โหลด</p>';
    }
}

// ฟังก์ชันสำหรับดูตัวอย่าง PDF
function previewPDF(url) {
    window.open(url, '_blank');
}

// เก็บ URLs ที่สร้างไว้เพื่อทำ cleanup
let createdUrls = [];

// ฟังก์ชันสำหรับทำความสะอาด memory
function cleanupUrls() {
    createdUrls.forEach(url => {
        URL.revokeObjectURL(url);
    });
    createdUrls = [];
}

// เรียก cleanup เมื่อผู้ใช้ปิดหน้าเว็บ
window.addEventListener('beforeunload', cleanupUrls);

// ปรับปรุงฟังก์ชัน createDownloadLinkFromBase64 ให้เก็บ URL ไว้
function createDownloadLinkFromBase64(base64Data, filename) {
    try {
        // แปลง base64 เป็น binary data
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // สร้าง Blob object
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // สร้าง URL สำหรับ blob
        const url = URL.createObjectURL(blob);
        
        // เก็บ URL ไว้เพื่อทำ cleanup ในภายหลัง
        createdUrls.push(url);
        
        // สร้างปุ่มดาวน์โหลด
        return `
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 15px;">
                <a href="${url}" download="${filename}" class="download-btn" style="
                    display: inline-block; 
                    padding: 12px 24px; 
                    background: #28a745; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                    📥 ดาวน์โหลดไฟล์ PDF
                </a>
                <button onclick="previewPDF('${url}')" class="preview-btn" style="
                    padding: 12px 24px; 
                    background: #007bff; 
                    color: white; 
                    border: none; 
                    border-radius: 8px; 
                    font-weight: bold; 
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                    👁️ ดูตัวอย่าง PDF
                </button>
            </div>
        `;
    } catch (error) {
        console.error('Error creating download link:', error);
        return '<p style="color: #dc3545;">❌ เกิดข้อผิดพลาดในการสร้างลิงก์ดาวน์โหลด</p>';
    }
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
