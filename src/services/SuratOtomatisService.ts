import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { SuratFormData, SuratTemplateType } from '../types/suratOtomatis';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Service untuk generate surat otomatis dari template DOCX dan PDF
 */
export class SuratOtomatisService {
  /**
   * Helper to convert SVG to PNG data URL
   */
  private static convertSvgToPng(svgUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 200;
        canvas.height = img.height || 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = (err) => reject(err);
      img.src = svgUrl;
    });
  }

  /**
   * Generate PDF Daftar Hadir
   * @param formData - Data dari form
   * @param partnerLogos - List logo partner yang diupload
   */
  static async generateDaftarHadirPDF(
    formData: Record<string, string | number>,
    partnerLogos: { base64: string; aspect: number; format: string }[]
  ): Promise<void> {
    try {
      const namaKegiatan = String(formData.nama_kegiatan || '').toUpperCase();
      const tanggalKegiatan = String(formData.tanggal_kegiatan || '');
      const jumlahBaris = Number(formData.jumlah_baris || 20);

      // Load KPPPA Logo
      let kpppaLogoPng = '';
      try {
        kpppaLogoPng = await this.convertSvgToPng('/Logo.svg');
      } catch (err) {
        console.error('Failed to convert KPPPA logo SVG to PNG:', err);
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const rowsPerPage = 10;
      const totalPages = Math.ceil(jumlahBaris / rowsPerPage);

      // Formatting date (e.g., 23 JUNI 2026)
      const formattedDate = this.formatTanggalIndonesia(tanggalKegiatan).toUpperCase();

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
          doc.addPage();
        }

        // --- DRAW HEADER ---
        // 1. KPPPA Logo on the left
        if (kpppaLogoPng) {
          doc.addImage(kpppaLogoPng, 'PNG', 15, 15, 20, 20);
        }

        // 2. Centered Text (Center of A4 Landscape is 148.5mm)
        doc.setFont('Helvetica', 'bold');
        
        // Title
        doc.setFontSize(12);
        doc.text('DAFTAR HADIR PESERTA', 148.5, 19, { align: 'center' });

        // Activity Name (wrapped if too long)
        doc.setFontSize(10);
        const splitKegiatan = doc.splitTextToSize(namaKegiatan, 180);
        
        let currentY = 24;
        splitKegiatan.forEach((line: string) => {
          doc.text(line, 148.5, currentY, { align: 'center' });
          currentY += 4.5;
        });

        // Date
        doc.text(formattedDate, 148.5, currentY, { align: 'center' });

        // 3. Partner Logos on the right (up to 3)
        if (partnerLogos && partnerLogos.length > 0) {
          const startX = 242;
          const endX = 282;
          const totalWidth = endX - startX; // 40mm
          const count = partnerLogos.length;
          const spacing = 1.5; // 1.5mm
          const availableWidth = totalWidth - (spacing * (count - 1));
          const slotWidth = availableWidth / count;
          const maxHeight = 18; // 18mm
          const centerY = 15; // Y starts at 15

          partnerLogos.forEach((logo, idx) => {
            const slotX = startX + idx * (slotWidth + spacing);
            
            let w = slotWidth;
            let h = slotWidth / logo.aspect;
            
            if (h > maxHeight) {
              h = maxHeight;
              w = maxHeight * logo.aspect;
            }

            const logoX = slotX + (slotWidth - w) / 2;
            const logoY = centerY + (maxHeight - h) / 2;

            try {
              doc.addImage(logo.base64, logo.format, logoX, logoY, w, h);
            } catch (err) {
              console.error('Error adding partner image to PDF:', err);
            }
          });
        }

        // 4. Line under header
        const headerBottomY = Math.max(currentY + 6, 36);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(15, headerBottomY, 282, headerBottomY);

        // --- DRAW TABLE ---
        const startRow = pageIndex * rowsPerPage;
        const endRow = Math.min(jumlahBaris, (pageIndex + 1) * rowsPerPage);
        const pageRowsCount = endRow - startRow;

        const tableData = [];
        for (let i = 0; i < pageRowsCount; i++) {
          const rowNum = startRow + i + 1;
          const sigText = rowNum % 2 !== 0 
            ? `${rowNum}.` 
            : `          ${rowNum}.`;
          
          tableData.push([
            rowNum.toString(),
            '', // Nama
            '', // Asal Instansi
            '', // Jabatan
            '', // Nomor Telepon
            sigText
          ]);
        }

        autoTable(doc, {
          startY: headerBottomY + 4,
          margin: { left: 15, right: 15 },
          head: [[
            { content: 'No.', styles: { halign: 'center', valign: 'middle' } },
            { content: 'Nama', styles: { halign: 'center', valign: 'middle' } },
            { content: 'Asal Instansi', styles: { halign: 'center', valign: 'middle' } },
            { content: 'Jabatan', styles: { halign: 'center', valign: 'middle' } },
            { content: 'Nomor Telepon', styles: { halign: 'center', valign: 'middle' } },
            { content: 'Tanda Tangan', styles: { halign: 'center', valign: 'middle' } }
          ]],
          body: tableData,
          theme: 'grid',
          styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [0, 0, 0], // Black borders like Excel
            lineWidth: 0.15,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [255, 255, 255], // White background like Excel
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: 0.25,
          },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center', valign: 'middle' },
            1: { cellWidth: 60 },
            2: { cellWidth: 60 },
            3: { cellWidth: 50 },
            4: { cellWidth: 45 },
            5: { cellWidth: 40, valign: 'middle', fontStyle: 'bold' } // Tanda tangan
          },
          didParseCell: (data) => {
            if (data.section === 'body') {
              data.cell.styles.minCellHeight = 12; // Height in mm (fits beautifully in Landscape)
            }
          }
        });

        // Page number at the bottom (Y=200 for A4 Landscape)
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Halaman ${pageIndex + 1} dari ${totalPages}`, 282, 200, { align: 'right' });
      }

      // Save PDF
      const timestamp = new Date().toISOString().split('T')[0];
      const activitySanitized = namaKegiatan.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
      doc.save(`daftar_hadir_${activitySanitized || 'kegiatan'}_${timestamp}.pdf`);

    } catch (error: any) {
      console.error('Error generating PDF:', error);
      throw new Error(`Gagal membuat PDF: ${error.message}`);
    }
  }

  /**
   * Generate preview text dari template dan data form
   * @param templateType - Tipe template surat
   * @param formData - Data yang akan diisi ke template
   * @returns Preview text
   */
  static async generatePreview(
    templateType: SuratTemplateType,
    formData: Record<string, string | number>
  ): Promise<string> {
    if (templateType === 'daftar-hadir') {
      return 'Preview Daftar Hadir';
    }

    try {
      // Load template file
      const templatePath = `/surat-keterangan.docx`;
      const response = await fetch(templatePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      
      // Create docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{{',
          end: '}}'
        }
      });

      // Format data untuk template
      const templateData = this.formatDataForTemplate(formData);

      // Set data ke template
      doc.setData(templateData);

      // Render document
      doc.render();

      // Get full text (simplified preview)
      const fullText = doc.getFullText();
      
      return fullText || 'Preview tidak tersedia';
    } catch (error: any) {
      console.error('Error generating preview:', error);
      throw new Error(`Gagal membuat preview: ${error.message}`);
    }
  }

  /**
   * Generate surat dari template dan data form
   * @param templateType - Tipe template surat
   * @param formData - Data yang akan diisi ke template
   * @param outputFileName - Nama file output (opsional)
   */
  static async generateSurat(
    templateType: SuratTemplateType,
    formData: Record<string, string | number>,
    outputFileName?: string
  ): Promise<void> {
    if (templateType === 'daftar-hadir') {
      // PDF Daftar Hadir is handled separately, but let's add a fallback here
      throw new Error('Gunakan generateDaftarHadirPDF untuk template ini.');
    }

    try {
      // Load template file
      const templatePath = `/surat-keterangan.docx`;
      const response = await fetch(templatePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Load template dengan PizZip
      const zip = new PizZip(arrayBuffer);
      
      // Create docxtemplater instance dengan custom delimiters
      // Hanya proses {{...}}, biarkan ${...}
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{{',
          end: '}}'
        }
      });

      // Format data untuk template
      const templateData = this.formatDataForTemplate(formData);

      // Set data ke template
      doc.setData(templateData);

      // Render document
      try {
        doc.render();
      } catch (error: any) {
        console.error('Error rendering document:', error);
        throw new Error(`Error rendering document: ${error.message}`);
      }

      // Generate output
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Download file
      const fileName = outputFileName || this.generateFileName(templateType, formData);
      saveAs(output, fileName);

    } catch (error: any) {
      console.error('Error generating surat:', error);
      throw new Error(`Gagal membuat surat: ${error.message}`);
    }
  }

  /**
   * Format data untuk template docx
   * Konversi format tanggal, format teks, dll
   */
  private static formatDataForTemplate(formData: Record<string, string | number>): Record<string, string> {
    const formatted: Record<string, string> = {};

    for (const [key, value] of Object.entries(formData)) {
      if (value === null || value === undefined || value === '') {
        formatted[key] = '-';
        continue;
      }

      // Format tanggal ke format Indonesia
      if (key.includes('tanggal') || key.includes('periode')) {
        formatted[key] = this.formatTanggalIndonesia(value.toString());
      } 
      // Format waktu
      else if (key.includes('waktu')) {
        formatted[key] = value.toString();
      }
      else {
        formatted[key] = value.toString();
      }
    }

    return formatted;
  }

  /**
   * Format tanggal ke format Indonesia
   * @param dateString - ISO date string
   * @returns Formatted date string (e.g., "15 Januari 2024")
   */
  static formatTanggalIndonesia(dateString: string): string {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      return `${day} ${month} ${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }

  /**
   * Generate nama file output
   */
  private static generateFileName(
    templateType: SuratTemplateType,
    formData: Record<string, string | number>
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const namaLengkap = formData.nama_lengkap 
      ? String(formData.nama_lengkap).replace(/\s+/g, '_')
      : 'draft';
    
    return `${templateType}_${namaLengkap}_${timestamp}.docx`;
  }

  /**
   * Validate form data sebelum generate
   */
  static validateFormData(
    formData: Record<string, string | number>,
    requiredFields: string[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of requiredFields) {
      const value = formData[field];
      if (value === null || value === undefined || value === '') {
        errors.push(`Field ${field} wajib diisi`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
