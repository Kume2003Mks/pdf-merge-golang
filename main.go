package main

import (
	"fmt"
	"log"
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

	// Serve static files from uploads directory
	app.Static("/downloads", "./uploads")

	// Serve static files (CSS, JS)
	app.Static("/static", "./static")

	// Routes
	app.Get("/", handleHome)
	app.Post("/merge", handleMergePDF)
	app.Get("/health", handleHealth)

	// Start server
	log.Println("🚀 Server starting on port 8081...")
	log.Println("📁 Upload directory: ./uploads")
	log.Println("🌐 Access the application at: http://localhost:8081")
	log.Fatal(app.Listen(":8081"))
}

func createDirectories() {
	dirs := []string{"./uploads", "./temp", "./templates", "./static", "./static/css", "./static/js"}
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

	// Save uploaded files temporarily
	tempFiles := make([]string, len(files))
	for i, file := range files {
		tempPath := filepath.Join("./temp", fmt.Sprintf("temp_%d_%s", i, file.Filename))
		if err := c.SaveFile(file, tempPath); err != nil {
			// Clean up already saved files
			for j := 0; j < i; j++ {
				os.Remove(tempFiles[j])
			}
			return c.Status(500).JSON(MergeResponse{
				Success: false,
				Message: fmt.Sprintf("ไม่สามารถบันทึกไฟล์ %s ได้", file.Filename),
			})
		}
		tempFiles[i] = tempPath
	}

	// Generate output filename
	timestamp := time.Now().Format("20060102_150405")
	outputFilename := fmt.Sprintf("merged_pdf_%s.pdf", timestamp)
	outputPath := filepath.Join("./uploads", outputFilename)

	// Merge PDFs using pdfcpu
	err = mergePDFFiles(tempFiles, outputPath)

	// Clean up temporary files
	for _, tempFile := range tempFiles {
		os.Remove(tempFile)
	}

	if err != nil {
		return c.Status(500).JSON(MergeResponse{
			Success: false,
			Message: fmt.Sprintf("ไม่สามารถรวม PDF ได้: %v", err),
		})
	}

	downloadURL := fmt.Sprintf("/downloads/%s", outputFilename)

	return c.JSON(MergeResponse{
		Success:     true,
		Message:     fmt.Sprintf("รวม PDF สำเร็จ! รวม %d ไฟล์เป็นไฟล์เดียว", len(files)),
		Filename:    outputFilename,
		DownloadURL: downloadURL,
	})
}

func mergePDFFiles(inputFiles []string, outputFile string) error {

	//config := model.NewDefaultConfiguration()

	if len(inputFiles) < 2 {
		return fmt.Errorf("ต้องการไฟล์อย่างน้อย 2 ไฟล์ในการรวม")
	}

	// Use pdfcpu API to merge PDFs
	// err := api.MergeCreateFile(inputFiles, outputFile, false, config)
	// if err != nil {
	// 	return fmt.Errorf("การรวม PDF ล้มเหลว: %v", err)
	// }

	err := api.MergeCreateFile(inputFiles, outputFile, false, nil)
	if err != nil {
		return fmt.Errorf("การรวม PDF ล้มเหลว: %v", err)
	}

	return nil
}

func handleHealth(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":    "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "PDF Merger API",
	})
}
