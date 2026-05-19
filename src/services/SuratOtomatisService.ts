import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { SuratFormData, SuratTemplateType } from '../types/suratOtomatis';

/**
 * Service untuk generate surat otomatis dari template DOCX
 */
export class SuratOtomatisService {
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
  private static formatTanggalIndonesia(dateString: string): string {
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
