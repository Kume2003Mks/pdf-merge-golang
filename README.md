# PDF Merger System - ระบบรวม PDF

ระบบรวมไฟล์ PDF หลายไฟล์เป็นไฟล์เดียว ใช้ Go Fiber และ pdfcpu

## คุณสมบัติ

- 🔗 รวมไฟล์ PDF หลายไฟล์เป็นไฟล์เดียว
- 📱 Web Interface ที่ใช้งานง่าย (รองรับภาษาไทย)
- 🎯 Drag & Drop ไฟล์
- 📋 แสดงรายการไฟล์ที่เลือก
- ➕ **เลือกไฟล์ทีละไฟล์ได้โดยไม่ลบไฟล์เก่า**
- 🗑️ **ลบไฟล์แต่ละไฟล์ออกจากรายการได้**
- 📊 **แสดงจำนวนไฟล์ที่เลือก**
- 🔍 **ตรวจสอบไฟล์ซ้ำ**
- ⚡ ประมวลผลรวดเร็ว
- 💾 ดาวน์โหลดไฟล์ที่รวมแล้วได้ทันที

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

1. **เลือกไฟล์ PDF**: 
   - **วิธีที่ 1**: คลิก "เลือกหลายไฟล์" เพื่อเลือกไฟล์พร้อมกันหลายไฟล์
   - **วิธีที่ 2**: คลิก "เพิ่มไฟล์ทีละไฟล์" เพื่อเลือกทีละไฟล์ (ไม่ลบไฟล์เก่า)
   - **วิธีที่ 3**: ลากไฟล์มาวางในพื้นที่อัพโหลด
2. **จัดการไฟล์**: ดูรายการไฟล์ที่เลือก และลบไฟล์ที่ไม่ต้องการได้
3. **ตรวจสอบ**: ระบบจะแสดงจำนวนไฟล์และตรวจสอบไฟล์ซ้ำ
4. **รวม PDF**: คลิกปุ่ม "รวม PDF"
5. **ดาวน์โหลด**: คลิกลิงค์ดาวน์โหลดเมื่อการรวมเสร็จสิ้น

## API Endpoints

### GET /
- หน้าหลักของแอปพลิเคชัน (Web Interface)

### POST /merge
- รวมไฟล์ PDF
- **Input**: Multipart form data with `files` field
- **Output**: JSON response with download URL

**Request Example:**
```bash
curl -X POST http://localhost:8081/merge \
  -F "files=@file1.pdf" \
  -F "files=@file2.pdf" \
  -F "files=@file3.pdf"
```

**Response Example:**
```json
{
  "success": true,
  "message": "รวม PDF สำเร็จ! รวม 3 ไฟล์เป็นไฟล์เดียว",
  "filename": "merged_pdf_20250730_170300.pdf",
  "download_url": "/downloads/merged_pdf_20250730_170300.pdf"
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

1. **รวม 3 ไฟล์ PDF:**
   - เลือกไฟล์: `document1.pdf`, `document2.pdf`, `document3.pdf`
   - ผลลัพธ์: `merged_pdf_20250730_170300.pdf`

2. **ใช้งานผ่าน API:**
   ```bash
   curl -X POST http://localhost:8081/merge \
     -F "files=@invoice1.pdf" \
     -F "files=@invoice2.pdf" \
     -F "files=@invoice3.pdf"
   ```

## การแก้ไขปัญหา

### ปัญหา: ไฟล์ PDF เสียหาย
- ตรวจสอบว่าไฟล์ PDF ต้นฉบับไม่เสียหาย
- ลองเปิดไฟล์ด้วยโปรแกรมอ่าน PDF อื่น

### ปัญหา: ขนาดไฟล์ใหญ่เกินไป
- เพิ่มขนาด BodyLimit ในไฟล์ main.go
- หรือลดขนาดไฟล์ก่อนอัพโหลด
