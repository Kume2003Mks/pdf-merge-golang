package main

import (
	"bytes"
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
	log.Println("🚀 Server starting on port 8082...")
	log.Println("🌐 Access the application at: http://localhost:8082")
	log.Fatal(app.Listen(":8082"))
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

func handleMergePDF(c *fiber.Ctx) error {
	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(400).JSON(MergeResponse{
			Success: false,
			Message: "ไม่สามารถอ่านไฟล์ที่อัพโหลดได้",
		})
	}

	files := form.File["files"]
	if len(files) < 2 {
		return c.Status(400).JSON(MergeResponse{
			Success: false,
			Message: "กรุณาเลือกไฟล์ PDF อย่างน้อย 2 ไฟล์",
		})
	}

	// Validate file types
	for _, file := range files {
		if filepath.Ext(file.Filename) != ".pdf" {
			return c.Status(400).JSON(MergeResponse{
				Success: false,
				Message: fmt.Sprintf("ไฟล์ %s ไม่ใช่ไฟล์ PDF", file.Filename),
			})
		}
	}

	// อ่านไฟล์เข้า memory และรวม PDF
	mergedPDFData, err := mergePDFInMemory(files)
	if err != nil {
		return c.Status(500).JSON(MergeResponse{
			Success: false,
			Message: fmt.Sprintf("ไม่สามารถรวม PDF ได้: %v", err),
		})
	}

	// สร้างชื่อไฟล์
	timestamp := time.Now().Format("20060102_150405")
	outputFilename := fmt.Sprintf("merged_pdf_%s.pdf", timestamp)

	// ส่งไฟล์ PDF โดยตรง
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", outputFilename))
	c.Set("Content-Length", fmt.Sprintf("%d", len(mergedPDFData)))

	return c.Send(mergedPDFData)
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
