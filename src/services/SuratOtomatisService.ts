import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { SuratFormData, SuratTemplateType } from '../types/suratOtomatis';

/**
 * Service untuk generate surat otomatis dari template DOCX dan PDF
 */
export class SuratOtomatisService {
  /**
   * Helper to convert SVG to PNG data URL with aspect ratio
   */
  private static convertSvgToPng(svgUrl: string): Promise<{ base64: string; aspect: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const aspect = img.width / img.height || 1;
        // Use high-resolution canvas maintaining aspect ratio
        canvas.width = 300 * aspect;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve({
            base64: canvas.toDataURL('image/png'),
            aspect
          });
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
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    try {
      const tipeDaftarHadir = String(formData.tipe_daftar_hadir || 'PESERTA').trim().toUpperCase();
      const namaKegiatan = String(formData.nama_kegiatan || '').toUpperCase();
      const tanggalKegiatan = String(formData.tanggal_kegiatan || '');
      const tempatKegiatan = String(formData.tempat_kegiatan || '').trim().toUpperCase();
      const perluRekening = String(formData.perlu_rekening || 'Tidak') === 'Ya';
      const jumlahBaris = Number(formData.jumlah_baris || 20);

      // Load KPPPA Logo
      let kpppaLogo = { base64: '', aspect: 1 };
      try {
        kpppaLogo = await this.convertSvgToPng('/Logo.svg');
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

      // Formatting date (e.g., 23 JUNI 2026 or 12, 19, dan 26 September 2025)
      const formattedDate = this.formatMultipleDates(tanggalKegiatan).toUpperCase();
      const tempatPrefix = tempatKegiatan ? `${tempatKegiatan}, ` : '';
      const dateLine = `${tempatPrefix}${formattedDate}`;

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
          doc.addPage();
        }

        // --- DRAW HEADER ---
        // 1. KPPPA Logo on the left (Respect aspect ratio)
        if (kpppaLogo.base64) {
          const maxW = 20;
          const maxH = 20;
          let w = maxW;
          let h = maxW / kpppaLogo.aspect;
          
          if (h > maxH) {
            h = maxH;
            w = maxH * kpppaLogo.aspect;
          }
          
          // Center the logo inside the 20x20mm bounding box starting at X=15, Y=15
          const logoX = 15 + (maxW - w) / 2;
          const logoY = 15 + (maxH - h) / 2;
          
          doc.addImage(kpppaLogo.base64, 'PNG', logoX, logoY, w, h);
        }

        // 2. Centered Text (Center of A4 Landscape is 148.5mm)
        doc.setFont('Helvetica', 'bold');
        
        // Title (Uniform size: 11pt, dynamic type)
        doc.setFontSize(11);
        doc.text(`DAFTAR HADIR ${tipeDaftarHadir}`, 148.5, 19, { align: 'center' });

        // Activity Name (wrapped if too long, size: 11pt)
        doc.setFontSize(11);
        const splitKegiatan = doc.splitTextToSize(namaKegiatan, 180);
        
        let currentY = 24;
        splitKegiatan.forEach((line: string) => {
          doc.text(line, 148.5, currentY, { align: 'center' });
          currentY += 4.5;
        });

        // Date (Uniform size: 11pt)
        doc.text(dateLine, 148.5, currentY, { align: 'center' });

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

        // 4. Line under header (REMOVED as requested)
        const headerBottomY = Math.max(currentY + 6, 36);

        // --- DRAW TABLE ---
        const startRow = pageIndex * rowsPerPage;
        const endRow = Math.min(jumlahBaris, (pageIndex + 1) * rowsPerPage);
        const pageRowsCount = endRow - startRow;

        const tableData = [];
        for (let i = 0; i < pageRowsCount; i++) {
          const rowNum = startRow + i + 1;
          const sigText = `${rowNum}.`;
          
          if (perluRekening) {
            tableData.push([
              rowNum.toString(),
              '', // Nama
              '', // Instansi
              '', // Jabatan
              '', // Nomor Telepon
              '', // Nama Bank
              '', // Nomor Rekening
              '', // Nama Pemilik Rekening
              sigText
            ]);
          } else {
            tableData.push([
              rowNum.toString(),
              '', // Nama
              '', // Instansi
              '', // Jabatan
              '', // Nomor Telepon
              sigText
            ]);
          }
        }

        const tableHeaders = perluRekening 
          ? [
              { content: 'No.', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Nama', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Instansi', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Jabatan', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Nomor Telepon', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Nama Bank', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Nomor Rekening', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Nama Pemilik Rekening', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Tanda Tangan', styles: { halign: 'center' as const, valign: 'middle' as const } }
            ]
          : [
              { content: 'No.', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Nama', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Instansi', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Jabatan', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Nomor Telepon', styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: 'Tanda Tangan', styles: { halign: 'center' as const, valign: 'middle' as const } }
            ];

        const columnStyles = perluRekening
          ? {
              0: { cellWidth: 10, halign: 'center' as const, valign: 'middle' as const },
              1: { cellWidth: 40 },
              2: { cellWidth: 40 },
              3: { cellWidth: 32 },
              4: { cellWidth: 30 },
              5: { cellWidth: 30 },
              6: { cellWidth: 30 },
              7: { cellWidth: 30 },
              8: { cellWidth: 25, valign: 'middle' as const, halign: 'left' as const, fontStyle: 'bold' as const } // Tanda tangan
            }
          : {
              0: { cellWidth: 12, halign: 'center' as const, valign: 'middle' as const },
              1: { cellWidth: 60 },
              2: { cellWidth: 60 },
              3: { cellWidth: 50 },
              4: { cellWidth: 45 },
              5: { cellWidth: 40, valign: 'middle' as const, halign: 'left' as const, fontStyle: 'bold' as const } // Tanda tangan
            };

        autoTable(doc, {
          startY: headerBottomY + 4,
          margin: { left: 15, right: 15 },
          head: [tableHeaders],
          body: tableData,
          theme: 'grid',
          styles: {
            fontSize: perluRekening ? 8 : 9,
            cellPadding: 2.5,
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
          columnStyles: columnStyles,
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
   * Helper to get template filename from public directory
   */
  private static getTemplateFileName(templateType: SuratTemplateType, formData?: Record<string, string | number>): string {
    if (templateType === 'simperjadin') {
      const jenis = String(formData?.jenis_dokumen_simperjadin || '');
      if (jenis.includes('Tergabung') || jenis.includes('1 File')) {
        return 'simperjadin-lengkap.docx';
      }
      if (jenis.includes('Rincian')) {
        return 'simperjadin-rincian.docx';
      }
      if (jenis.includes('Riil')) {
        return 'simperjadin-riil.docx';
      }
      return 'simperjadin-kwitansi.docx';
    }

    switch (templateType) {
      case 'surat-keterangan-umum':
      default:
        return 'surat-keterangan.docx';
    }
  }

  /**
   * Helper function to convert number to Indonesian words (Terbilang)
   */
  static terbilang(n: number): string {
    const units = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

    if (n < 0) return 'Minus ' + this.terbilang(-n);
    if (n === 0) return 'Nol Rupiah';

    const count = (val: number): string => {
      val = Math.floor(val);
      if (val < 12) return units[val];
      if (val < 20) return count(val - 10) + ' Belas';
      if (val < 100) return count(Math.floor(val / 10)) + ' Puluh' + (val % 10 !== 0 ? ' ' + count(val % 10) : '');
      if (val < 200) return 'Seratus' + (val - 100 !== 0 ? ' ' + count(val - 100) : '');
      if (val < 1000) return count(Math.floor(val / 100)) + ' Ratus' + (val % 100 !== 0 ? ' ' + count(val % 100) : '');
      if (val < 2000) return 'Seribu' + (val - 1000 !== 0 ? ' ' + count(val - 1000) : '');
      if (val < 1000000) return count(Math.floor(val / 1000)) + ' Ribu' + (val % 1000 !== 0 ? ' ' + count(val % 1000) : '');
      if (val < 1000000000) return count(Math.floor(val / 1000000)) + ' Juta' + (val % 1000000 !== 0 ? ' ' + count(val % 1000000) : '');
      if (val < 1000000000000) return count(Math.floor(val / 1000000000)) + ' Milyar' + (val % 1000000000 !== 0 ? ' ' + count(val % 1000000000) : '');
      return count(Math.floor(val / 1000000000000)) + ' Triliun' + (val % 1000000000000 !== 0 ? ' ' + count(val % 1000000000000) : '');
    };

    return count(n) + ' Rupiah';
  }

  /**
   * Helper function to format number as Rupiah currency string (e.g. 552,685)
   */
  static formatRupiah(num: number | string): string {
    const val = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(val)) return '0';
    return val.toLocaleString('en-US');
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
      const templateFileName = this.getTemplateFileName(templateType, formData);
      const templatePath = `/${templateFileName}`;
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
        nullGetter() {
          return '';
        },
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
      throw new Error('Gunakan generateDaftarHadirPDF untuk template ini.');
    }

    // Handle SIMPERJADIN option
    if (templateType === 'simperjadin') {
      const isPdf = String(formData.format_output || '').includes('PDF');
      const jenisDokumen = String(formData.jenis_dokumen_simperjadin || '');

      if (isPdf) {
        if (jenisDokumen.includes('3 File Terpisah')) {
          await this.generateAllSimperjadinPDF(formData);
          return;
        } else {
          await this.generateSimperjadinPDF(templateType, formData, outputFileName);
          return;
        }
      } else {
        if (jenisDokumen.includes('3 File Terpisah')) {
          await this.generateAllSimperjadin(formData);
          return;
        }
      }
    }

    try {
      const templateFileName = this.getTemplateFileName(templateType, formData);
      const templatePath = `/${templateFileName}`;
      const response = await fetch(templatePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Load template dengan PizZip
      const zip = new PizZip(arrayBuffer);
      
      // Create docxtemplater instance dengan custom delimiters & nullGetter
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() {
          return '';
        },
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

      // Generate output as uint8array
      const output = doc.getZip().generate({
        type: 'uint8array',
        compression: 'DEFLATE',
      });

      // Wrap in a native Blob with the correct MIME type
      const blob = new Blob([output as any], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Download file
      const fileName = outputFileName || this.generateFileName(templateType, formData);
      saveAs(blob, fileName);

    } catch (error: any) {
      console.error('Error generating surat:', error);
      throw new Error(`Gagal membuat surat: ${error.message}`);
    }
  }

  /**
   * Helper internal untuk mengunduh 1 file SIMPERJADIN spesifik (Word)
   */
  private static async generateSingleSimperjadinFile(
    templateFileName: string,
    formData: Record<string, string | number>,
    outputFileName: string
  ): Promise<void> {
    const response = await fetch(`/${templateFileName}`);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter() {
        return '';
      },
      delimiters: { start: '{{', end: '}}' }
    });

    const templateData = this.formatDataForTemplate(formData);
    doc.setData(templateData);
    doc.render();

    const output = doc.getZip().generate({
      type: 'uint8array',
      compression: 'DEFLATE',
    });

    const blob = new Blob([output as any], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    saveAs(blob, outputFileName);
  }

  /**
   * Generate 3 file SIMPERJADIN sekaligus (Word)
   */
  static async generateAllSimperjadin(formData: Record<string, string | number>): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const nama = formData.nama_pegawai ? String(formData.nama_pegawai).replace(/\s+/g, '_') : 'pegawai';

    await this.generateSingleSimperjadinFile('simperjadin-kwitansi.docx', formData, `simperjadin_kwitansi_${nama}_${timestamp}.docx`);
    await new Promise(r => setTimeout(r, 500));
    await this.generateSingleSimperjadinFile('simperjadin-rincian.docx', formData, `simperjadin_rincian_biaya_${nama}_${timestamp}.docx`);
    await new Promise(r => setTimeout(r, 500));
    await this.generateSingleSimperjadinFile('simperjadin-riil.docx', formData, `simperjadin_pengeluaran_riil_${nama}_${timestamp}.docx`);
  }

  /**
   * Helper internal menggambar Header Kop PDF SIMPERJADIN
   */
  private static drawSimperjadinPdfHeader(doc: any, kpppaLogo: { base64: string; aspect: number }, docType: string, data: Record<string, string>) {
    if (kpppaLogo.base64) {
      const maxW = 12;
      const maxH = 12;
      let w = maxW;
      let h = maxW / kpppaLogo.aspect;
      if (h > maxH) {
        h = maxH;
        w = maxH * kpppaLogo.aspect;
      }
      doc.addImage(kpppaLogo.base64, 'PNG', 15 + (maxW - w) / 2, 4 + (maxH - h) / 2, w, h);
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('KEMENTERIAN PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK', 87, 4.5, { align: 'center' });
    doc.text('REPUBLIK INDONESIA', 87, 8.0, { align: 'center' });
    doc.setFontSize(9.0);
    doc.text('SEKRETARIAT KEMENTERIAN', 87, 11.8, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.text('JALAN MEDAN MERDEKA BARAT NOMOR 15 JAKARTA 10110', 87, 15.0, { align: 'center' });
    doc.text('TELEPON (021) 3842638, 3805563', 87, 17.5, { align: 'center' });
    doc.text('Laman: https://www.kemenpppa.go.id – Email: persuratan@kemenpppa.go.id', 87, 20.0, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.0);

    if (docType === 'kwitansi') {
      doc.text('Tanda Pengeluaran', 142, 4.5);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Mata Anggaran :   ${data.mata_anggaran || ''}`, 142, 8.5);
      doc.text(`Dibayarkan Tgl :   ${data.tanggal_dibayarkan || ''}`, 142, 12.5);
      doc.text(`Pembukuan No :   ${data.pembukuan_no || ''}`, 142, 16.5);
    } else if (docType === 'rincian') {
      doc.text('LAMPIRAN II', 142, 4.5);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(5.8);
      const splitText = doc.splitTextToSize('PERATURAN MENTERI KEUANGAN NO 113/PMK.05/2012 TENTANG PERJALANAN DINAS JABATAN DALAM NEGERI BAGI PEJABAT NEGARA, PEGAWAI NEGERI DAN PEGAWAI TIDAK TETAP.', 53);
      let ty = 7.8;
      splitText.forEach((l: string) => {
        doc.text(l, 142, ty);
        ty += 2.6;
      });
    } else if (docType === 'riil') {
      doc.text('LAMPIRAN II', 142, 4.5);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(5.8);
      const splitText = doc.splitTextToSize('PERATURAN DIREKTUR JENDERAL PERBENDAHARAAN NOMOR PER ...../PB/2007 TENTANG PETUNJUK PELAKSANAAN DINAS JABATAN DALAM NEGERI BAGI PEJABAT NEGARA, PEGAWAI NEGERI DAN PEGAWAI TIDAK TETEP.', 53);
      let ty = 7.8;
      splitText.forEach((l: string) => {
        doc.text(l, 142, ty);
        ty += 2.6;
      });
    }

    doc.setLineWidth(0.5);
    doc.setDrawColor(46, 59, 78);
    doc.line(15, 26.5, 195, 26.5);
  }

  /**
   * Helper internal untuk menggambar Halaman Kwitansi pada PDF
   */
  private static renderKwitansiPdfPage(doc: any, autoTable: any, data: Record<string, string>) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('KWITANSI', 105, 35, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      theme: 'plain',
      styles: { font: 'Helvetica', fontSize: 8.5, cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 0 }, textColor: [31, 41, 55], valign: 'top' },
      bodyStyles: { valign: 'top' },
      columnStyles: {
        0: { cellWidth: 48, fontStyle: 'bold', valign: 'top' },
        1: { cellWidth: 6, fontStyle: 'bold', valign: 'top', halign: 'left' },
        2: { cellWidth: 126, valign: 'top' }
      },
      body: [
        ['Sudah Terima Dari', ':', 'KUASA PENGGUNA ANGGARAN / PEJABAT PEMBUAT KOMITMEN KEMENTERIAN PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK'],
        ['Uang Sebesar', ':', `Rp. ${data.uang_sebesar_format}\n(${data.uang_sebesar_terbilang})`],
        ['Untuk Pembayaran', ':', `Biaya perjalanan dinas menurut surat perjalanan dinas dari\nKEMENTERIAN PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK\ntgl ${data.tanggal_spd}\nNo. ${data.nomor_spd}`],
        [{ content: 'Maksud Perjalanan Dinas', colSpan: 3, styles: { fontStyle: 'bold' } }],
        [{ content: data.maksud_perjalanan_dinas || '', colSpan: 3 }],
        [{ content: `Pada ${data.periode_perjadin || ''}`, colSpan: 3 }],
        ['Jumlah', ':', `Rp. ${data.uang_sebesar_format}`]
      ]
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 105;

    // Top Signatures (Bendahara & Yang Bertugas - Shifted right for center PPK alignment)
    autoTable(doc, {
      startY: finalY + 14,
      theme: 'plain',
      styles: { font: 'Helvetica', fontSize: 8.5, cellPadding: 1, textColor: [31, 41, 55] },
      columnStyles: {
        0: { cellWidth: 128, halign: 'left' },
        1: { cellWidth: 52, halign: 'left' }
      },
      body: [
        [
          `Bendahara Pengeluaran\n\n\n\n\n${data.nama_bendahara}${data.nip_bendahara ? '\nNIP. ' + data.nip_bendahara : ''}`,
          `Jakarta, ${data.tanggal_dibayarkan}\nYang Bertugas,\n\n\n\n\n${data.nama_pegawai}${data.nip_pegawai ? '\nNIP. ' + data.nip_pegawai : ''}`
        ]
      ]
    });

    const finalY_top = (doc as any).lastAutoTable?.finalY || (finalY + 45);

    // Bottom Signature (PPK - Centered BELOW upper NIPs)
    autoTable(doc, {
      startY: finalY_top + 12,
      theme: 'plain',
      styles: { font: 'Helvetica', fontSize: 8.5, cellPadding: 1, textColor: [31, 41, 55] },
      columnStyles: {
        0: { cellWidth: 180, halign: 'center' }
      },
      body: [
        [
          `Mengetahui,\nA/n Kuasa Pengguna Anggaran,\nPejabat Pembuat Komitmen,\n\n\n\n${data.nama_ppk}${data.nip_ppk ? '\nNIP. ' + data.nip_ppk : ''}`
        ]
      ]
    });
  }

  /**
   * Helper internal untuk menggambar Halaman Rincian Biaya pada PDF
   */
  private static renderRincianPdfPage(doc: any, autoTable: any, data: Record<string, string>) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RINCIAN BIAYA PERJALANAN DINAS', 105, 35, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      theme: 'plain',
      styles: { font: 'Helvetica', fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 0, right: 0 }, valign: 'top' },
      bodyStyles: { valign: 'top' },
      columnStyles: {
        0: { cellWidth: 48, fontStyle: 'bold', valign: 'top' },
        1: { cellWidth: 6, fontStyle: 'bold', valign: 'top', halign: 'left' },
        2: { cellWidth: 126, valign: 'top' }
      },
      body: [
        ['Lampiran SPD NO.', ':', data.nomor_spd || ''],
        ['Tanggal', ':', data.tanggal_spd || ''],
        ['Maksud Perjalanan Dinas', ':', data.maksud_perjalanan_dinas || '']
      ]
    });

    const startY2 = (doc as any).lastAutoTable?.finalY || 47;

    autoTable(doc, {
      startY: startY2 + 3,
      theme: 'plain',
      head: [['No', 'PERINCIAN BIAYA', 'DETAIL', 'JUMLAH', 'KETERANGAN']],
      styles: { font: 'Helvetica', fontSize: 7.5, cellPadding: 1.5, textColor: [0, 0, 0] },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 60, halign: 'left' },
        2: { cellWidth: 45, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 30, halign: 'center' }
      },
      body: [
        ['1.', 'Uang Harian', `${data.hari_harian} Hari @ Rp. ${data.tarif_harian_format}`, `Rp. ${data.total_harian_format}`, ''],
        ['2.', 'Uang Penginapan', `${data.hari_penginapan} Hari @ Rp. ${data.tarif_penginapan_format}`, `Rp. ${data.total_penginapan_format}`, ''],
        ['3.', `Transport - ${data.asal_transport1} PP`, `${data.tujuan_transport1} PP`, `Rp. ${data.total_transport1_format}`, ''],
        ['4.', `Transport - ${data.asal_transport2} PP`, `${data.tujuan_transport2} PP`, `Rp. ${data.total_transport2_format}`, ''],
        ['5.', 'Uang Representatif', `${data.hari_representatif} Hari @ Rp. ${data.tarif_representatif_format}`, `Rp. ${data.total_representatif_format}`, ''],
        ['6.', 'Uang Airport Tax', 'PP', `Rp. ${data.total_airport_tax_format}`, ''],
        ['7.', 'Uang Transport Kantor - B/S/T (Taksi)', 'PP', `Rp. ${data.total_transport_taksi_format}`, ''],
        ['8.', 'Uang Transport B/S/T - Lokasi (Taksi)', 'PP', `Rp. ${data.total_transport_lokasi_format}`, ''],
        ['9.', 'Uang Transport Kota/Kab.', 'PP', `Rp. ${data.total_transport_kota_format}`, ''],
        ['10.', 'Sewa Kendaraan (Roda 4)', '', `Rp. ${data.total_sewa_kendaraan_format}`, ''],
        [{ content: `Jumlah Yang Dibayarkan : Rp. ${data.uang_sebesar_format}`, colSpan: 5, styles: { halign: 'center', fontStyle: 'bold' } }],
        [{ content: `Terbilang : ${data.uang_sebesar_terbilang}`, colSpan: 5, styles: { halign: 'center', fontStyle: 'italic' } }]
      ],
      didDrawCell: (dataObj: any) => {
        const d = dataObj.doc;
        const cell = dataObj.cell;
        const row = dataObj.row;
        const column = dataObj.column;

        d.setLineWidth(0.2);
        d.setDrawColor(0, 0, 0);

        const x = cell.x;
        const y = cell.y;
        const w = cell.width;
        const h = cell.height;

        if (row.section === 'head' || row.index === 0) {
          d.line(x, y, x + w, y);
          d.line(x, y + h, x + w, y + h);
        }

        if (row.index === 10) {
          d.line(x, y, x + w, y);
          d.line(x, y + h, x + w, y + h);
        }

        if (row.index === 11) {
          d.line(x, y, x + w, y);
          d.line(x, y + h, x + w, y + h);
        }

        if (column.index === 0) {
          d.line(x, y, x, y + h);
        }

        d.line(x + w, y, x + w, y + h);
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 155;

    // Top Signatures (Bendahara & Yang Menerima)
    autoTable(doc, {
      startY: finalY + 12,
      theme: 'plain',
      styles: { font: 'Helvetica', fontSize: 8, cellPadding: 1, textColor: [31, 41, 55] },
      columnStyles: {
        0: { cellWidth: 128, halign: 'left' },
        1: { cellWidth: 52, halign: 'left' }
      },
      body: [
        [
          `Telah Dibayar Sejumlah\nRp. ${data.uang_sebesar_format}\nBendahara Pengeluaran\n\n\n\n\n${data.nama_bendahara}${data.nip_bendahara ? '\nNIP. ' + data.nip_bendahara : ''}`,
          `Jakarta, ${data.tanggal_dibayarkan}\nTelah menerima jumlah uang\nRp. ${data.uang_sebesar_format}\nYang Menerima,\n\n\n\n\n${data.nama_pegawai}${data.nip_pegawai ? '\nNIP. ' + data.nip_pegawai : ''}`
        ]
      ]
    });

    const finalY_rincian_top = (doc as any).lastAutoTable?.finalY || (finalY + 45);

    // Bottom Signature (PPK - Centered BELOW upper NIPs)
    autoTable(doc, {
      startY: finalY_rincian_top + 12,
      theme: 'plain',
      styles: { font: 'Helvetica', fontSize: 8, cellPadding: 1, textColor: [31, 41, 55] },
      columnStyles: {
        0: { cellWidth: 180, halign: 'center' }
      },
      body: [
        [
          `Mengetahui,\nPejabat Pembuat Komitmen,\n\n\n\n${data.nama_ppk}${data.nip_ppk ? '\nNIP. ' + data.nip_ppk : ''}`
        ]
      ]
    });
  }

  /**
   * Helper internal untuk menggambar Halaman Pengeluaran Riil pada PDF
   */
  private static renderRiilPdfPage(doc: any, autoTable: any, data: Record<string, string>) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DAFTAR PENGELUARAN RIIL', 105, 35, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      theme: 'plain',
      styles: { font: 'Helvetica', fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 0, right: 0 }, valign: 'top' },
      bodyStyles: { valign: 'top' },
      columnStyles: {
        0: { cellWidth: 48, fontStyle: 'bold', valign: 'top' },
        1: { cellWidth: 6, fontStyle: 'bold', valign: 'top', halign: 'left' },
        2: { cellWidth: 126, valign: 'top' }
      },
      body: [
        ['Nama', ':', data.nama_pegawai || ''],
        ['NIP', ':', data.nip_pegawai || ''],
        ['Maksud Perjalanan Dinas', ':', data.maksud_perjalanan_dinas || '']
      ]
    });

    const startY1 = (doc as any).lastAutoTable?.finalY || 47;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    const stmt1 = doc.splitTextToSize(`Berdasar Surat Perjalanan Dinas (SPD) tanggal ${data.tanggal_spd} Nomor. ${data.nomor_spd} dengan ini kami menyatakan dengan sesungguhnya bahwa :`, 180);
    let ty = startY1 + 5;
    stmt1.forEach((line: string) => {
      doc.text(line, 15, ty);
      ty += 4;
    });

    doc.text('1. Biaya transport pegawai dan/atau biaya penginapan dibawah ini yang tidak dapat diperoleh bukti bukti pengeluaranya meliputi :', 15, ty + 2);

    autoTable(doc, {
      startY: ty + 6,
      theme: 'plain',
      head: [['No', 'URAIAN', 'JUMLAH']],
      styles: { font: 'Helvetica', fontSize: 7.5, cellPadding: 1.5, textColor: [0, 0, 0] },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 128, halign: 'left' },
        2: { cellWidth: 40, halign: 'right' }
      },
      body: [
        ['A.', 'Transport Kantor - B/S/T (Taksi) PP', `Rp. ${data.riil_transport_taksi_format}`],
        ['B.', 'Transport B/S/T - Lokasi (Taksi) PP', `Rp. ${data.riil_transport_lokasi_format}`],
        ['C.', 'Uang Transport Kota/Kab. (Taksi) PP', `Rp. ${data.riil_transport_kota_format}`],
        ['D.', '', 'Rp. 0'],
        ['E.', '', 'Rp. 0'],
        ['F.', '', 'Rp. 0'],
        [{ content: '', styles: { halign: 'center' } }, { content: 'Jumlah Yang Dibayarkan :', styles: { halign: 'left', fontStyle: 'bold' } }, { content: `Rp. ${data.riil_total_format}`, styles: { halign: 'right', fontStyle: 'bold' } }]
      ],
      didDrawCell: (dataObj: any) => {
        const d = dataObj.doc;
        const cell = dataObj.cell;
        const row = dataObj.row;
        const column = dataObj.column;

        d.setLineWidth(0.2);
        d.setDrawColor(0, 0, 0);

        const x = cell.x;
        const y = cell.y;
        const w = cell.width;
        const h = cell.height;

        if (row.section === 'head' || row.index === 0) {
          d.line(x, y, x + w, y);
          d.line(x, y + h, x + w, y + h);
        }

        if (row.index === 6) {
          d.line(x, y, x + w, y);
          d.line(x, y + h, x + w, y + h);
        }

        if (column.index === 0) {
          d.line(x, y, x, y + h);
        }

        d.line(x + w, y, x + w, y + h);
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 105;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    const stmt2 = doc.splitTextToSize('2. Jumlah uang tersebut pada angka 1 benar benar dikeluarkan untuk pelaksanaan perjalanan dinas dimaksud dan apabila dikemudian hari terdapat kelebihan atas pembayaran, kami bersedia untuk menyetorkan kelebihan tersebut ke Kas Negara.', 180);
    let ty2 = finalY + 5;
    stmt2.forEach((line: string) => {
      doc.text(line, 15, ty2);
      ty2 += 4;
    });

    doc.text('Demikian Pernyataan ini kami buat dengan sebenar benarnya, untuk digunakan sebagai mana mestinya.', 15, ty2 + 3);

    autoTable(doc, {
      startY: ty2 + 8,
      theme: 'plain',
      styles: { font: 'Helvetica', fontSize: 8, cellPadding: 1, textColor: [31, 41, 55] },
      columnStyles: {
        0: { cellWidth: 90, halign: 'left' },
        1: { cellWidth: 90, halign: 'left' }
      },
      body: [
        [
          `Bendahara Pengeluaran\n\n\n\n\n${data.nama_bendahara}${data.nip_bendahara ? '\nNIP. ' + data.nip_bendahara : ''}`,
          `Jakarta, ${data.tanggal_dibayarkan}\nPejabat Negara/Pegawai Negeri yang melakukan perjalanan dinas\n\n\n\n\n${data.nama_pegawai}${data.nip_pegawai ? '\nNIP. ' + data.nip_pegawai : ''}`
        ]
      ]
    });
  }

  /**
   * Helper internal untuk membuat file PDF SIMPERJADIN
   */
  static async generateSimperjadinPDF(
    templateType: string,
    formData: Record<string, string | number>,
    outputFileName?: string
  ): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const data = this.formatDataForTemplate(formData);
    const timestamp = new Date().toISOString().split('T')[0];
    const nama = data.nama_pegawai ? String(data.nama_pegawai).replace(/\s+/g, '_') : 'pegawai';

    let kpppaLogo = { base64: '', aspect: 1 };
    try {
      kpppaLogo = await this.convertSvgToPng('/Logo.svg');
    } catch (e) {
      console.error('Logo conversion failed:', e);
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const jenisDokumen = String(formData.jenis_dokumen_simperjadin || '');

    if (jenisDokumen.includes('Tergabung') || jenisDokumen.includes('1 File')) {
      // 1-FILE COMBINED PDF (Page 1 Kwitansi, Page 2 Rincian, Page 3 Riil)
      this.drawSimperjadinPdfHeader(doc, kpppaLogo, 'kwitansi', data);
      this.renderKwitansiPdfPage(doc, autoTable, data);

      doc.addPage();
      this.drawSimperjadinPdfHeader(doc, kpppaLogo, 'rincian', data);
      this.renderRincianPdfPage(doc, autoTable, data);

      doc.addPage();
      this.drawSimperjadinPdfHeader(doc, kpppaLogo, 'riil', data);
      this.renderRiilPdfPage(doc, autoTable, data);

      const defaultFileName = outputFileName || `simperjadin_lengkap_${nama}_${timestamp}.pdf`;
      doc.save(defaultFileName);
      return;
    }

    let docSubType = 'kwitansi';
    if (jenisDokumen.includes('Rincian')) docSubType = 'rincian';
    else if (jenisDokumen.includes('Riil')) docSubType = 'riil';

    this.drawSimperjadinPdfHeader(doc, kpppaLogo, docSubType, data);

    if (docSubType === 'kwitansi') {
      this.renderKwitansiPdfPage(doc, autoTable, data);
      const defaultFileName = outputFileName || `simperjadin_kwitansi_${nama}_${timestamp}.pdf`;
      doc.save(defaultFileName);
    } else if (docSubType === 'rincian') {
      this.renderRincianPdfPage(doc, autoTable, data);
      const defaultFileName = outputFileName || `simperjadin_rincian_biaya_${nama}_${timestamp}.pdf`;
      doc.save(defaultFileName);
    } else if (docSubType === 'riil') {
      this.renderRiilPdfPage(doc, autoTable, data);
      const defaultFileName = outputFileName || `simperjadin_pengeluaran_riil_${nama}_${timestamp}.pdf`;
      doc.save(defaultFileName);
    }
  }

  /**
   * Helper internal untuk mengunduh 3 file SIMPERJADIN PDF sekaligus
   */
  static async generateAllSimperjadinPDF(formData: Record<string, string | number>): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const data = this.formatDataForTemplate(formData);
    const nama = data.nama_pegawai ? String(data.nama_pegawai).replace(/\s+/g, '_') : 'pegawai';

    await this.generateSimperjadinPDF('simperjadin', { ...formData, jenis_dokumen_simperjadin: 'Kwitansi (Tanda Pengeluaran)' }, `simperjadin_kwitansi_${nama}_${timestamp}.pdf`);
    await new Promise(r => setTimeout(r, 500));
    await this.generateSimperjadinPDF('simperjadin', { ...formData, jenis_dokumen_simperjadin: 'Rincian Biaya Perjalanan Dinas' }, `simperjadin_rincian_biaya_${nama}_${timestamp}.pdf`);
    await new Promise(r => setTimeout(r, 500));
    await this.generateSimperjadinPDF('simperjadin', { ...formData, jenis_dokumen_simperjadin: 'Daftar Pengeluaran Riil' }, `simperjadin_pengeluaran_riil_${nama}_${timestamp}.pdf`);
  }

  /**
   * Format data untuk template docx
   * Konversi format tanggal, format teks, perhitungan biaya & terbilang
   */
  private static formatDataForTemplate(formData: Record<string, string | number>): Record<string, string> {
    const formatted: Record<string, string> = {};

    // First copy all raw keys
    for (const [key, value] of Object.entries(formData)) {
      if (value === null || value === undefined || value === '') {
        formatted[key] = '';
      } else if (key.includes('tanggal') || key.includes('periode')) {
        // Format ISO date string to Indonesian formatted date if valid date
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          formatted[key] = this.formatTanggalIndonesia(value);
        } else {
          formatted[key] = value.toString();
        }
      } else {
        formatted[key] = value.toString();
      }
    }

    // SIMPERJADIN Financial Calculations & Periode Perjadin
    const tglMulai = String(formData.tanggal_mulai_perjadin || '');
    const tglSelesai = String(formData.tanggal_selesai_perjadin || '');

    if (tglMulai || tglSelesai) {
      const fmtMulai = tglMulai.match(/^\d{4}-\d{2}-\d{2}$/) ? this.formatTanggalIndonesia(tglMulai) : tglMulai;
      const fmtSelesai = tglSelesai.match(/^\d{4}-\d{2}-\d{2}$/) ? this.formatTanggalIndonesia(tglSelesai) : tglSelesai;

      if (fmtMulai && fmtSelesai) {
        formatted['periode_perjadin'] = `${fmtMulai} s/d ${fmtSelesai}`;
      } else if (fmtMulai) {
        formatted['periode_perjadin'] = fmtMulai;
      } else if (fmtSelesai) {
        formatted['periode_perjadin'] = fmtSelesai;
      }
    }

    const hari_harian = Number(formData.hari_harian || 0);
    const tarif_harian = Number(formData.tarif_harian || 0);
    const total_harian = hari_harian * tarif_harian;
    formatted['hari_harian'] = hari_harian ? hari_harian.toString() : '0';
    formatted['tarif_harian_format'] = this.formatRupiah(tarif_harian);
    formatted['total_harian_format'] = this.formatRupiah(total_harian);

    const hari_penginapan = Number(formData.hari_penginapan || 0);
    const tarif_penginapan = Number(formData.tarif_penginapan || 0);
    const total_penginapan = hari_penginapan * tarif_penginapan;
    formatted['hari_penginapan'] = hari_penginapan ? hari_penginapan.toString() : '0';
    formatted['tarif_penginapan_format'] = this.formatRupiah(tarif_penginapan);
    formatted['total_penginapan_format'] = this.formatRupiah(total_penginapan);

    const tarif_transport1 = Number(formData.tarif_transport1 || 0);
    formatted['total_transport1_format'] = this.formatRupiah(tarif_transport1);

    const tarif_transport2 = Number(formData.tarif_transport2 || 0);
    formatted['total_transport2_format'] = this.formatRupiah(tarif_transport2);

    const hari_representatif = Number(formData.hari_representatif || 0);
    const tarif_representatif = Number(formData.tarif_representatif || 0);
    const total_representatif = hari_representatif * tarif_representatif;
    formatted['hari_representatif'] = hari_representatif ? hari_representatif.toString() : '0';
    formatted['tarif_representatif_format'] = this.formatRupiah(tarif_representatif);
    formatted['total_representatif_format'] = this.formatRupiah(total_representatif);

    const tarif_airport_tax = Number(formData.tarif_airport_tax || 0);
    formatted['total_airport_tax_format'] = this.formatRupiah(tarif_airport_tax);

    const riil_transport_taksi = Number(formData.riil_transport_taksi || 0);
    formatted['riil_transport_taksi_format'] = this.formatRupiah(riil_transport_taksi);
    formatted['total_transport_taksi_format'] = this.formatRupiah(riil_transport_taksi);

    const riil_transport_lokasi = Number(formData.riil_transport_lokasi || 0);
    formatted['riil_transport_lokasi_format'] = this.formatRupiah(riil_transport_lokasi);
    formatted['total_transport_lokasi_format'] = this.formatRupiah(riil_transport_lokasi);

    const riil_transport_kota = Number(formData.riil_transport_kota || 0);
    formatted['riil_transport_kota_format'] = this.formatRupiah(riil_transport_kota);
    formatted['total_transport_kota_format'] = this.formatRupiah(riil_transport_kota);

    const tarif_sewa_kendaraan = Number(formData.tarif_sewa_kendaraan || 0);
    formatted['total_sewa_kendaraan_format'] = this.formatRupiah(tarif_sewa_kendaraan);

    const grand_total = total_harian + total_penginapan + tarif_transport1 + tarif_transport2 + total_representatif + tarif_airport_tax + riil_transport_taksi + riil_transport_lokasi + riil_transport_kota + tarif_sewa_kendaraan;
    formatted['uang_sebesar_format'] = this.formatRupiah(grand_total);
    formatted['uang_sebesar_terbilang'] = this.terbilang(grand_total);

    const riil_total = riil_transport_taksi + riil_transport_lokasi + riil_transport_kota;
    formatted['riil_total_format'] = this.formatRupiah(riil_total);

    return formatted;
  }

  /**
   * Format tanggal ke format Indonesia
   * @param dateString - ISO date string
   * @returns Formatted date string (e.g., "15 Januari 2024")
   */
  static formatTanggalIndonesia(dateString: string): string {
    if (!dateString || dateString === 'undefined' || dateString === 'null') return '';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
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
   * Format multiple comma-separated dates to Indonesian text
   * @param datesStr - Comma-separated ISO date strings (e.g. "2025-09-12,2025-09-19,2025-09-26")
   * @returns Formatted date string (e.g. "12, 19, dan 26 September 2025")
   */
  static formatMultipleDates(datesStr: string): string {
    if (!datesStr) return '';
    const dateStrings = datesStr.split(',').map(d => d.trim()).filter(Boolean);
    if (dateStrings.length === 0) return '';
    if (dateStrings.length === 1) {
      return this.formatTanggalIndonesia(dateStrings[0]);
    }

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const parsed = dateStrings
      .map(d => {
        const date = new Date(d);
        return {
          day: date.getDate(),
          monthNum: date.getMonth(),
          monthName: months[date.getMonth()],
          year: date.getFullYear(),
          time: date.getTime()
        };
      })
      .filter(p => !isNaN(p.time))
      .sort((a, b) => a.time - b.time);

    if (parsed.length === 0) return '';
    if (parsed.length === 1) {
      return `${parsed[0].day} ${parsed[0].monthName} ${parsed[0].year}`;
    }

    // Check if all are in the same month and year
    const allSameMonthAndYear = parsed.every(
      p => p.monthNum === parsed[0].monthNum && p.year === parsed[0].year
    );

    if (allSameMonthAndYear) {
      const days = parsed.map(p => p.day);
      const lastDay = days.pop();
      return `${days.join(', ')} dan ${lastDay} ${parsed[0].monthName} ${parsed[0].year}`;
    }

    // Check if all are in the same year
    const allSameYear = parsed.every(p => p.year === parsed[0].year);

    if (allSameYear) {
      const formattedParts = parsed.map(p => `${p.day} ${p.monthName}`);
      const lastPart = formattedParts.pop();
      return `${formattedParts.join(', ')} dan ${lastPart} ${parsed[0].year}`;
    }

    // Different years
    const formattedParts = parsed.map(p => `${p.day} ${p.monthName} ${p.year}`);
    const lastPart = formattedParts.pop();
    return `${formattedParts.join(', ')} dan ${lastPart}`;
  }

  /**
   * Generate nama file output
   */
  private static generateFileName(
    templateType: SuratTemplateType,
    formData: Record<string, string | number>
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const nama = (formData.nama_pegawai || formData.nama_lengkap || 'draft').toString().replace(/\s+/g, '_');

    if (templateType === 'simperjadin') {
      const jenis = String(formData.jenis_dokumen_simperjadin || '');
      if (jenis.includes('Rincian')) return `simperjadin_rincian_biaya_${nama}_${timestamp}.docx`;
      if (jenis.includes('Riil')) return `simperjadin_pengeluaran_riil_${nama}_${timestamp}.docx`;
      if (jenis.includes('Kwitansi')) return `simperjadin_kwitansi_${nama}_${timestamp}.docx`;
      return `simperjadin_lengkap_${nama}_${timestamp}.docx`;
    }

    return `${templateType}_${nama}_${timestamp}.docx`;
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
