package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/pdfcpu/pdfcpu/pkg/api"
)

type MergeResponse struct {
	Success     bool   `json:"success"`
	Message     string `json:"message"`
	Filename    string `json:"filename,omitempty"`
	DownloadURL string `json:"download_url,omitempty"`
	PdfData     string `json:"pdf_data,omitempty"` // Base64 encoded PDF data
	PdfSize     int64  `json:"pdf_size,omitempty"` // Size in bytes
}

type DocumentFiles struct {
	OfficialDocument *multipart.FileHeader `json:"official_document"` // หนังสือราชการ
	IDCard           *multipart.FileHeader `json:"id_card"`           // สำเนาบัตร ปชช
	RequestForm      *multipart.FileHeader `json:"request_form"`      // ตัวแบบคำขอ (optional)
}

func main() {
	// Create necessary directories
	createDirectories()

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		BodyLimit: 100 * 1024 * 1024, // 100MB limit
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// Serve static files (CSS, JS)
	app.Static("/static", "./static")

	// Routes
	app.Get("/", handleHome)
	app.Post("/merge", handleMergePDF)
	app.Get("/health", handleHealth)

	// Start server
	log.Println("🚀 Server starting on port 8081...")
	log.Println("🌐 Access the application at: http://localhost:8081")
	log.Fatal(app.Listen(":8081"))
}

func createDirectories() {
	dirs := []string{"./templates", "./static", "./static/css", "./static/js"}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Fatalf("Failed to create directory %s: %v", dir, err)
		}
	}
}

func handleHome(c *fiber.Ctx) error {
	return c.SendFile("./templates/index.html")
}

/*
รับผ่านตัว key ไม่ซ้ำกัน
1. official_document - หนังสือราชการ (required)
2. id_card - สำเนาบัตร ปชช (required)
3. request_form - ตัวแบบคำขอ (optional)

ไม่เก็บไฟล์ชั่วคราว ประมวลผลใน memory แล้วส่งกลับเป็น base64
*/
func handleMergePDF(c *fiber.Ctx) error {
	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(400).JSON(MergeResponse{
			Success: false,
			Message: "ไม่สามารถอ่านไฟล์ที่อัพโหลดได้",
		})
	}

	// รับไฟล์ตาม key ที่กำหนด
	var documentFiles DocumentFiles
	var filesToMerge []*multipart.FileHeader

	// 1. หนังสือราชการ (required)
	if officialDocs := form.File["official_document"]; len(officialDocs) > 0 {
		documentFiles.OfficialDocument = officialDocs[0]
		filesToMerge = append(filesToMerge, officialDocs[0])
	} else {
		return c.Status(400).JSON(MergeResponse{
			Success: false,
			Message: "กรุณาเลือกไฟล์หนังสือราชการ",
		})
	}

	// 2. สำเนาบัตร ปชช (required)
	if idCards := form.File["id_card"]; len(idCards) > 0 {
		documentFiles.IDCard = idCards[0]
		filesToMerge = append(filesToMerge, idCards[0])
	} else {
		return c.Status(400).JSON(MergeResponse{
			Success: false,
			Message: "กรุณาเลือกไฟล์สำเนาบัตรประชาชน",
		})
	}

	// 3. ตัวแบบคำขอ (optional)
	if requestForms := form.File["request_form"]; len(requestForms) > 0 {
		documentFiles.RequestForm = requestForms[0]
		filesToMerge = append(filesToMerge, requestForms[0])
	}

	// ตรวจสอบประเภทไฟล์
	for _, file := range filesToMerge {
		if filepath.Ext(file.Filename) != ".pdf" {
			return c.Status(400).JSON(MergeResponse{
				Success: false,
				Message: fmt.Sprintf("ไฟล์ %s ไม่ใช่ไฟล์ PDF", file.Filename),
			})
		}
	}

	// อ่านไฟล์เข้า memory และรวม PDF
	mergedPDFData, err := mergePDFInMemory(filesToMerge)
	if err != nil {
		return c.Status(500).JSON(MergeResponse{
			Success: false,
			Message: fmt.Sprintf("ไม่สามารถรวม PDF ได้: %v", err),
		})
	}

	// แปลงเป็น base64
	base64Data := base64.StdEncoding.EncodeToString(mergedPDFData)

	// สร้างชื่อไฟล์
	timestamp := time.Now().Format("20060102_150405")
	outputFilename := fmt.Sprintf("merged_documents_%s.pdf", timestamp)

	// สร้างข้อความตอบกลับที่ระบุประเภทไฟล์
	var includedFiles []string
	if documentFiles.OfficialDocument != nil {
		includedFiles = append(includedFiles, "หนังสือราชการ")
	}
	if documentFiles.IDCard != nil {
		includedFiles = append(includedFiles, "สำเนาบัตรประชาชน")
	}
	if documentFiles.RequestForm != nil {
		includedFiles = append(includedFiles, "ตัวแบบคำขอ")
	}

	message := fmt.Sprintf("รวมเอกสารสำเร็จ! ประกอบด้วย: %s", fmt.Sprintf("%v", includedFiles))

	return c.JSON(MergeResponse{
		Success:  true,
		Message:  message,
		Filename: outputFilename,
		PdfData:  base64Data,
		PdfSize:  int64(len(mergedPDFData)),
	})
}

// รวม PDF ใน memory โดยไม่เก็บไฟล์ชั่วคราว
func mergePDFInMemory(files []*multipart.FileHeader) ([]byte, error) {
	if len(files) < 1 {
		return nil, fmt.Errorf("ต้องการไฟล์อย่างน้อย 1 ไฟล์")
	}

	// อ่านไฟล์ทั้งหมดเข้า memory
	var pdfReaders []io.ReadSeeker

	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			return nil, fmt.Errorf("ไม่สามารถเปิดไฟล์ %s: %v", fileHeader.Filename, err)
		}
		defer file.Close()

		// อ่านข้อมูลไฟล์ทั้งหมดเข้า buffer
		fileData, err := io.ReadAll(file)
		if err != nil {
			return nil, fmt.Errorf("ไม่สามารถอ่านไฟล์ %s: %v", fileHeader.Filename, err)
		}

		// สร้าง ReadSeeker จาก bytes
		reader := bytes.NewReader(fileData)
		pdfReaders = append(pdfReaders, reader)
	}

	// ถ้ามีไฟล์เดียว ส่งกลับเลย
	if len(pdfReaders) == 1 {
		reader := pdfReaders[0]
		reader.Seek(0, io.SeekStart)
		return io.ReadAll(reader)
	}

	// สร้าง buffer สำหรับ output
	var outputBuffer bytes.Buffer

	// ใช้ pdfcpu API สำหรับรวม PDF จาก ReadSeeker
	err := api.MergeRaw(pdfReaders, &outputBuffer, false, nil)
	if err != nil {
		return nil, fmt.Errorf("การรวม PDF ล้มเหลว: %v", err)
	}

	return outputBuffer.Bytes(), nil
}

func handleHealth(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":    "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "PDF Merger API",
	})
}
