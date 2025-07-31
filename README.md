# PDF Document Merger - ระบบรวมเอกสารราชการ

ระบบรวมเอกสารราชการเป็นไฟล์ PDF เดียว ใช้ Go Fiber และ pdfcpu

## คุณสมบัติ

- � **รวมเอกสารราชการตามประเภทที่กำหนด**
  - � หนังสือราชการ (บังคับ)
  - � สำเนาบัตรประชาชน (บังคับ) 
  - � ตัวแบบคำขอ (ไม่บังคับ)
- 🔑 **รับไฟล์ผ่าน key แยกต่างหาก** (ไม่ซ้ำกัน)
- ✅ **ตรวจสอบไฟล์ PDF** และประเภทเอกสาร
- 🎨 **UI ที่เข้าใจง่าย** แบ่งแยกตามประเภทเอกสาร
- ⚡ **ประมวลผลรวดเร็ว** ด้วย pdfcpu
- 💾 **ดาวน์โหลดทันที** หลังรวมเสร็จ

## การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies

```bash
go mod tidy
```

### 2. รัน Server

```bash
go run main.go
```

### 3. เปิดเว็บเบราว์เซอร์

```
http://localhost:8081
```

## วิธีการใช้งาน

1. **เลือกเอกสารตามประเภท**: 
   - **📄 หนังสือราชการ** (บังคับ): เลือกไฟล์หนังสือราชการ
   - **🆔 สำเนาบัตรประชาชน** (บังคับ): เลือกไฟล์สำเนาบัตรประชาชน
   - **📝 ตัวแบบคำขอ** (ไม่บังคับ): เลือกไฟล์ตัวแบบคำขอ (ถ้ามี)
2. **ตรวจสอบ**: ระบบจะแสดงไฟล์ที่เลือกและตรวจสอบประเภท PDF
3. **รวมเอกสาร**: คลิกปุ่ม "รวมเอกสาร" (จะเปิดใช้งานเมื่อมีไฟล์บังคับครบ)
4. **ดาวน์โหลด**: คลิกลิงค์ดาวน์โหลดเมื่อการรวมเสร็จสิ้น

## API Endpoints

### GET /
- หน้าหลักของแอปพลิเคชัน (Web Interface)

### POST /merge
- รวมเอกสารราชการตามประเภทที่กำหนด
- **Input**: Multipart form data with specific keys:
  - `official_document`: หนังสือราชการ (required)
  - `id_card`: สำเนาบัตรประชาชน (required)  
  - `request_form`: ตัวแบบคำขอ (optional)
- **Output**: JSON response with download URL

**Request Example:**
```bash
curl -X POST http://localhost:8081/merge \
  -F "official_document=@official_doc.pdf" \
  -F "id_card=@id_card_copy.pdf" \
  -F "request_form=@request_form.pdf"
```

**Response Example:**
```json
{
  "success": true,
  "message": "รวมเอกสารสำเร็จ! ประกอบด้วย: [หนังสือราชการ สำเนาบัตรประชาชน ตัวแบบคำขอ]",
  "filename": "merged_documents_20250731_111900.pdf",
  "download_url": "/downloads/merged_documents_20250731_111900.pdf"
}
```

### GET /health
- ตรวจสอบสถานะ Server

### GET /downloads/{filename}
- ดาวน์โหลดไฟล์ที่รวมแล้ว

## โครงสร้างโปรเจกต์

```
go-pdf/
├── main.go                    # ไฟล์หลักของแอปพลิเคชัน
├── go.mod                     # Go modules
├── go.sum                     # Dependency checksums
├── templates/                 # Templates HTML
│   └── index.html            # หน้าหลักของเว็บ
├── static/                    # Static files
│   ├── css/
│   │   └── style.css         # CSS สำหรับตกแต่ง
│   └── js/
│       └── app.js            # JavaScript สำหรับการทำงาน
├── uploads/                   # โฟลเดอร์เก็บไฟล์ที่รวมแล้ว (สร้างอัตโนมัติ)
├── temp/                      # โฟลเดอร์ไฟล์ชั่วคราว (สร้างอัตโนมัติ)
└── README.md                  # เอกสารนี้
```

## Dependencies

- **Go Fiber**: Web framework สำหรับ HTTP server
- **pdfcpu**: ไลบรารี่สำหรับจัดการไฟล์ PDF

## ข้อกำหนด

- Go 1.18+
- ไฟล์ที่อัพโหลดต้องเป็น PDF เท่านั้น
- ขนาดไฟล์รวม ไม่เกิน 100MB
- ต้องเลือกไฟล์อย่างน้อย 2 ไฟล์

## ตัวอย่างการใช้งาน

1. **รวมเอกสารราชการพื้นฐาน:**
   - หนังสือราชการ: `official_letter.pdf`
   - สำเนาบัตรประชาชน: `id_card_copy.pdf`
   - ผลลัพธ์: `merged_documents_20250731_111900.pdf`

2. **รวมเอกสารพร้อมตัวแบบคำขอ:**
   - หนังสือราชการ: `request_letter.pdf`
   - สำเนาบัตรประชาชน: `citizen_id.pdf`
   - ตัวแบบคำขอ: `application_form.pdf`
   - ผลลัพธ์: เอกสารรวม 3 ไฟล์

3. **ใช้งานผ่าน API:**
   ```bash
   curl -X POST http://localhost:8081/merge \
     -F "official_document=@letter.pdf" \
     -F "id_card=@id.pdf"
   ```

## การแก้ไขปัญหา

### ปัญหา: ไฟล์ PDF เสียหาย
- ตรวจสอบว่าไฟล์ PDF ต้นฉบับไม่เสียหาย
- ลองเปิดไฟล์ด้วยโปรแกรมอ่าน PDF อื่น

### ปัญหา: ขนาดไฟล์ใหญ่เกินไป
- เพิ่มขนาด BodyLimit ในไฟล์ main.go
- หรือลดขนาดไฟล์ก่อนอัพโหลด
