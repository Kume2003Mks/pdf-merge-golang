# Project Structure - โครงสร้างโปรเจกต์

```
go-pdf/
├── main.go                    # ไฟล์หลักของ Go Fiber server
├── go.mod                     # Go modules configuration
├── go.sum                     # Dependency checksums
├── README.md                  # เอกสารคู่มือการใช้งาน
├── templates/                 # HTML templates
│   └── index.html            # หน้าหลักของเว็บแอปพลิเคชัน
├── static/                    # Static files (CSS, JS, images)
│   ├── css/
│   │   └── style.css         # CSS สำหรับตกแต่งหน้าเว็บ
│   └── js/
│       └── app.js            # JavaScript สำหรับการทำงานของหน้าเว็บ
├── uploads/                   # ไฟล์ PDF ที่รวมแล้ว (สร้างอัตโนมัติ)
├── temp/                      # ไฟล์ชั่วคราวระหว่างการประมวลผล (สร้างอัตโนมัติ)
└── STRUCTURE.md              # ไฟล์นี้
```

## คำอธิบายไฟล์

### main.go
- ไฟล์หลักของ Go Fiber server
- จัดการ HTTP routes และ API endpoints
- รวมไฟล์ PDF ด้วย pdfcpu library
- จัดการการอัพโหลดและดาวน์โหลดไฟล์

### templates/index.html
- หน้าเว็บหลักสำหรับการอัพโหลดและรวม PDF
- รองรับ drag & drop
- แสดงผลรายการไฟล์ที่เลือก
- แสดงสถานะการประมวลผล

### static/css/style.css
- CSS สำหรับตกแต่งหน้าเว็บ
- รองรับ responsive design
- animation และ transitions

### static/js/app.js
- JavaScript สำหรับการทำงานของหน้าเว็บ
- จัดการ file upload และ form submission
- ติดต่อกับ API endpoints
- drag & drop functionality

## การแยกไฟล์

### ข้อดี:
1. **Maintainability**: ง่ายต่อการดูแลและแก้ไข
2. **Separation of Concerns**: แยกหน้าที่ของแต่ละไฟล์ชัดเจน
3. **Reusability**: สามารถนำ CSS/JS ไปใช้ในหน้าอื่นได้
4. **Performance**: เบราว์เซอร์สามารถ cache static files ได้
5. **Development**: ง่ายต่อการ debug และพัฒนา

### โครงสร้างเดิม vs ใหม่:

**เดิม**: ทุกอย่างอยู่ในไฟล์ main.go
```go
func handleHome(c *fiber.Ctx) error {
    html := `<!DOCTYPE html>...` // HTML ยาวมาก
    return c.Type("html").Send([]byte(html))
}
```

**ใหม่**: แยกไฟล์เป็นสัดส่วน
```go
func handleHome(c *fiber.Ctx) error {
    return c.SendFile("./templates/index.html")
}
```
