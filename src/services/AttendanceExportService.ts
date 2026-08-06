// src/services/AttendanceExportService.ts
import { User, Attendance } from '../../types';
import saveAs from 'file-saver';

export class AttendanceExportService {
  /**
   * Helper to convert image URL or data URL to Base64 data string
   */
  private async getBase64FromUrl(url?: string): Promise<string | null> {
    if (!url) return null;
    if (url.startsWith('data:image')) return url;
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Could not load image for export Base64:', url, e);
      return null;
    }
  }

  /**
   * Format date to Indonesian string e.g. "22 Juli 2026"
   */
  private formatDateIndo(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const fullMonths = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${day} ${fullMonths[monthIdx] || ''} ${year}`;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  /**
   * Format ISO date/time string to "HH.mm WIB" preserving exact input time
   */
  private formatTimeWib(isoStr?: string): string {
    if (!isoStr) return '-';
    try {
      if (isoStr.length === 5 && isoStr.includes(':')) {
        return `${isoStr.replace(':', '.')} WIB`;
      }
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) {
        // Fallback: if it looks like "HH:MM" inside a 'T' string, just use it
        if (isoStr.includes('T')) {
          const timePart = isoStr.substring(11, 16);
          if (timePart && timePart.includes(':')) {
            return `${timePart.replace(':', '.')} WIB`;
          }
        }
        return isoStr;
      }
      const wibTime = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
      return `${wibTime.replace(':', '.')} WIB`;
    } catch {
      return isoStr;
    }
  }

  /**
   * Helper to generate consecutive calendar date array YYYY-MM-DD
   */
  private getAllDatesInRange(startStr?: string, endStr?: string, fallbackRecords: Attendance[] = []): string[] {
    if (startStr && endStr) {
      const dates: string[] = [];
      const cur = new Date(startStr + 'T00:00:00Z');
      const end = new Date(endStr + 'T00:00:00Z');

      while (cur <= end) {
        dates.push(cur.toISOString().substring(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
      return dates;
    }

    // Default: Derive 16th to 15th period from current date or records
    const now = new Date();
    const d = now.getDate();
    let startY = now.getFullYear();
    let startM = now.getMonth();
    let endY = now.getFullYear();
    let endM = now.getMonth();

    if (d >= 16) {
      if (endM === 11) { endY++; endM = 0; } else { endM++; }
    } else {
      if (startM === 0) { startY--; startM = 11; } else { startM--; }
    }

    const sMStr = String(startM + 1).padStart(2, '0');
    const eMStr = String(endM + 1).padStart(2, '0');
    return this.getAllDatesInRange(`${startY}-${sMStr}-16`, `${endY}-${eMStr}-15`);
  }

  /**
   * Group attendance records by date YYYY-MM-DD
   */
  private groupAttendancesByDate(records: Attendance[]): Map<string, Attendance[]> {
    const map = new Map<string, Attendance[]>();
    records.forEach((item) => {
      const dateKey = item.checkIn ? item.checkIn.substring(0, 10) : new Date().toISOString().substring(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(item);
    });
    return map;
  }

  /**
   * Export to Word (.doc) matching exact layout of Bukti Presensi Juli_ Amad Yusuf.docx with LARGER photos and clear spacing
   */
  async exportToDocx(user: User, periodLabel: string, records: Attendance[], startDate?: string, endDate?: string): Promise<void> {
    const sanitizedName = (user.name || 'Pegawai').replace(/[^a-zA-Z0-9]/g, '_');
    const recordsMap = this.groupAttendancesByDate(records);

    // Get all calendar dates in the 16th to 15th period range
    const allDates = this.getAllDatesInRange(startDate, endDate, records);

    let rowsHtml = '';
    for (const dateKey of allDates) {
      const formattedDate = this.formatDateIndo(dateKey);
      const items = recordsMap.get(dateKey);

      if (!items || items.length === 0) {
        // Unrecorded date in the period -> render row with -
        rowsHtml += `
          <tr>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold; vertical-align: top; width: 22%;">${formattedDate}</td>
            <td style="border: 1px solid #000; padding: 6px; vertical-align: top; width: 39%;">-</td>
            <td style="border: 1px solid #000; padding: 6px; vertical-align: top; width: 39%;">-</td>
          </tr>
        `;
      } else {
        const mainItem = items[0];
        if (mainItem.status && mainItem.status !== 'Hadir' && mainItem.status !== 'Terlambat' && mainItem.status !== 'WFA') {
          const linkStr = mainItem.suratKeteranganUrl
            ? `<a href="${mainItem.suratKeteranganUrl}" target="_blank">${mainItem.suratKeteranganUrl}</a>`
            : '-';

          rowsHtml += `
            <tr>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; vertical-align: top; width: 22%;">${formattedDate}</td>
              <td colspan="2" style="border: 1px solid #000; padding: 6px; vertical-align: top;">
                <strong>Status: ${mainItem.status}</strong><br/>
                Link Surat Keterangan : ${linkStr}
              </td>
            </tr>
          `;
        } else {
          // Presensi Pagi (Larger photo: 220px, clear bottom margin 16px)
          let pagiContent = '-';
          if (mainItem.checkIn) {
            const pagiTime = this.formatTimeWib(mainItem.checkIn);
            const pagiLocation = mainItem.locationName || 'KemenPPPA';

            if (mainItem.isManual) {
              const b64In = await this.getBase64FromUrl(mainItem.checkInPhotoUrl);
              const photoHtml = b64In
                ? `<img src="${b64In}" width="220" height="220" style="max-width: 220px; max-height: 220px; display: block; margin-top: 4px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 6px;" /><br/>`
                : '';
              pagiContent = `${photoHtml}Lokasi : ${pagiLocation}<br/>Waktu : ${pagiTime}`;
            } else {
              const coords = (mainItem.latitude && mainItem.longitude) 
                ? `${Math.round(mainItem.latitude * 100000)} ${Math.round(mainItem.longitude * 100000)}` 
                : '';
              pagiContent = `${coords ? coords + '<br/>' : ''}Lokasi : ${pagiLocation}<br/>Waktu : ${pagiTime}`;
            }
          }

          // Presensi Sore (Larger photo: 220px, clear bottom margin 16px)
          let soreContent = '-';
          if (mainItem.checkOut) {
            const soreTime = this.formatTimeWib(mainItem.checkOut);
            const soreLocation = mainItem.locationName || 'KemenPPPA';

            if (mainItem.isManual) {
              const b64Out = await this.getBase64FromUrl(mainItem.checkOutPhotoUrl);
              const photoHtml = b64Out
                ? `<img src="${b64Out}" width="220" height="220" style="max-width: 220px; max-height: 220px; display: block; margin-top: 4px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 6px;" /><br/>`
                : '';
              soreContent = `${photoHtml}Lokasi : ${soreLocation}<br/>Waktu : ${soreTime}`;
            } else {
              const coords = (mainItem.latitude && mainItem.longitude) 
                ? `${Math.round(mainItem.latitude * 100000)} ${Math.round(mainItem.longitude * 100000)}` 
                : '';
              soreContent = `${coords ? coords + '<br/>' : ''}Lokasi : ${soreLocation}<br/>Waktu : ${soreTime}`;
            }
          }

          rowsHtml += `
            <tr>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; vertical-align: top; width: 22%;">${formattedDate}</td>
              <td style="border: 1px solid #000; padding: 6px; vertical-align: top; width: 39%;">${pagiContent}</td>
              <td style="border: 1px solid #000; padding: 6px; vertical-align: top; width: 39%;">${soreContent}</td>
            </tr>
          `;
        }
      }
    }

    const htmlDocument = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <title>BUKTI PRESENSI</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; line-height: 1.3; }
          h1 { font-size: 14pt; font-weight: bold; margin-bottom: 12pt; }
          .meta-table { border: none; margin-bottom: 14pt; width: 100%; }
          .meta-table td { border: none; padding: 2px 4px; font-size: 11pt; font-weight: bold; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .data-table th { border: 1px solid #000; padding: 6px; background-color: #f2f2f2; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <h1>BUKTI PRESENSI</h1>
        <table class="meta-table">
          <tr><td style="width: 130px;">Nama</td><td>: ${user.name}</td></tr>
          <tr><td>Unit Organisasi</td><td>: ${user.divisi || 'Kementerian Pemberdayaan Perempuan dan Perlindungan Anak'}</td></tr>
          <tr><td>Periode</td><td>: ${periodLabel}</td></tr>
        </table>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 22%;">Tanggal</th>
              <th style="width: 39%;">Presensi Pagi</th>
              <th style="width: 39%;">Presensi Sore</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="3" style="border: 1px solid #000; padding: 12px; text-align: center;">Tidak ada data presensi.</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlDocument], {
      type: 'application/msword;charset=utf-8',
    });
    saveAs(blob, `Bukti_Presensi_${sanitizedName}.doc`);
  }

  /**
   * Export to PDF (.pdf) matching exact layout of Bukti Presensi Juli_ Amad Yusuf.docx with LARGER photos and clean spacing
   */
  async exportToPdf(user: User, periodLabel: string, records: Attendance[], startDate?: string, endDate?: string): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BUKTI PRESENSI', 14, 20);

    // Meta Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nama               : ${user.name}`, 14, 28);
    doc.text(`Unit Organisasi : ${user.divisi || 'Kementerian Pemberdayaan Perempuan dan Perlindungan Anak'}`, 14, 34);
    doc.text(`Periode            : ${periodLabel}`, 14, 40);

    const recordsMap = this.groupAttendancesByDate(records);
    const allDates = this.getAllDatesInRange(startDate, endDate, records);

    const tableBody: any[] = [];
    const imagesToDraw: { rowIdx: number; colIdx: number; b64: string }[] = [];

    for (let rIdx = 0; rIdx < allDates.length; rIdx++) {
      const dateKey = allDates[rIdx];
      const formattedDate = this.formatDateIndo(dateKey);
      const items = recordsMap.get(dateKey);

      if (!items || items.length === 0) {
        tableBody.push([formattedDate, '-', '-']);
      } else {
        const mainItem = items[0];
        if (mainItem.status && mainItem.status !== 'Hadir' && mainItem.status !== 'Terlambat' && mainItem.status !== 'WFA') {
          const linkStr = mainItem.suratKeteranganUrl || '-';
          tableBody.push([
            formattedDate,
            {
              content: `Status: ${mainItem.status}\nLink Surat Keterangan : ${linkStr}`,
              colSpan: 2,
            },
          ]);
        } else {
          // Presensi Pagi (Larger photo: 38mm x 38mm, 12 linebreaks for clear gap)
          let pagiText = '-';
          if (mainItem.checkIn) {
            const pagiTime = this.formatTimeWib(mainItem.checkIn);
            const pagiLocation = mainItem.locationName || 'KemenPPPA';

            if (mainItem.isManual) {
              const b64In = await this.getBase64FromUrl(mainItem.checkInPhotoUrl);
              if (b64In) {
                imagesToDraw.push({ rowIdx: tableBody.length, colIdx: 1, b64: b64In });
              }
              pagiText = `${b64In ? '\n\n\n\n\n\n\n\n\n\n\n\n\n' : ''}Lokasi : ${pagiLocation}\nWaktu : ${pagiTime}`;
            } else {
              const coords = (mainItem.latitude && mainItem.longitude) 
                ? `${Math.round(mainItem.latitude * 100000)} ${Math.round(mainItem.longitude * 100000)}` 
                : '';
              pagiText = `${coords ? coords + '\n' : ''}Lokasi : ${pagiLocation}\nWaktu : ${pagiTime}`;
            }
          }

          // Presensi Sore (Larger photo: 38mm x 38mm, 12 linebreaks for clear gap)
          let soreText = '-';
          if (mainItem.checkOut) {
            const soreTime = this.formatTimeWib(mainItem.checkOut);
            const soreLocation = mainItem.locationName || 'KemenPPPA';

            if (mainItem.isManual) {
              const b64Out = await this.getBase64FromUrl(mainItem.checkOutPhotoUrl);
              if (b64Out) {
                imagesToDraw.push({ rowIdx: tableBody.length, colIdx: 2, b64: b64Out });
              }
              soreText = `${b64Out ? '\n\n\n\n\n\n\n\n\n\n\n\n\n' : ''}Lokasi : ${soreLocation}\nWaktu : ${soreTime}`;
            } else {
              const coords = (mainItem.latitude && mainItem.longitude) 
                ? `${Math.round(mainItem.latitude * 100000)} ${Math.round(mainItem.longitude * 100000)}` 
                : '';
              soreText = `${coords ? coords + '\n' : ''}Lokasi : ${soreLocation}\nWaktu : ${soreTime}`;
            }
          }

          tableBody.push([formattedDate, pagiText, soreText]);
        }
      }
    }

    autoTable(doc, {
      startY: 46,
      head: [['Tanggal', 'Presensi Pagi', 'Presensi Sore']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'left',
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [0, 0, 0],
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
        valign: 'top',
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 71 },
        2: { cellWidth: 71 },
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const imgMatch = imagesToDraw.find(
            (i) => i.rowIdx === data.row.index && i.colIdx === data.column.index
          );
          if (imgMatch) {
            try {
              // Draw photo: 38mm x 38mm
              doc.addImage(imgMatch.b64, 'JPEG', data.cell.x + 4, data.cell.y + 3, 38, 38);
            } catch (e) {
              console.warn('Failed to add PDF cell image:', e);
            }
          }
        }
      },
    });

    const sanitizedName = (user.name || 'Pegawai').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Bukti_Presensi_${sanitizedName}.pdf`);
  }
}

export const attendanceExportService = new AttendanceExportService();
