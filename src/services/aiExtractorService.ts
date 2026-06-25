import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// OpenAI Configuration (Fallback)
const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

export const aiExtractorService = {
  async extractSuratData(file: File, masterData?: any): Promise<any> {
    const base64Data = await fileToBase64(file);
    
    let masterDataContext = "";
    if (masterData) {
      masterDataContext = `
Gunakan daftar Master Data berikut untuk memilih nilai yang paling cocok jika memungkinkan (berikan string persis seperti di daftar ini):
- Sifat Surat: ${masterData.sifatSuratList?.join(', ')}
- Jenis Naskah: ${masterData.jenisNaskahList?.join(', ')}
- Klasifikasi Surat: ${masterData.klasifikasiSuratList?.join(', ')}
- Unit Internal: ${masterData.unitInternalList?.join(', ')}
- Unit Eksternal: ${masterData.unitEksternalList?.join(', ')}
`;
    }

    const prompt = `
Anda adalah asisten administrasi cerdas. Tugas Anda adalah mengekstrak data dari dokumen surat resmi berikut.
Ekstrak informasi ini dan kembalikan HANYA dalam format JSON (tanpa markdown atau teks awalan/akhiran).
${masterDataContext}

Struktur JSON yang WAJIB dipatuhi:
{
  "jenisSurat": "Masuk", 
  "nomorSurat": "Nomor surat yang tertera",
  "tanggalSurat": "Tanggal surat diterbitkan dalam format YYYY-MM-DD",
  "hal": "Hal atau Perihal surat",
  "asalSuratType": "Eksternal atau Internal",
  "asalSuratUnit": "Nama instansi/lembaga/unit pengirim surat (jika dari KemenPPPA pilih Internal dan unitnya, jika dari luar pilih Eksternal dan unit eksternalnya)",
  "jenisNaskah": "Pilih dari daftar master data jika ada yang cocok, atau tebak",
  "sifatSurat": "Pilih dari daftar master data jika ada yang cocok",
  "klasifikasiSurat": "Pilih dari daftar master data klasifikasi jika ada yang cocok, atau buat baru",
  "terkaitKegiatan": boolean (true jika surat ini terkait undangan kegiatan/rapat/acara),
  "kegiatanTitle": "Judul kegiatan (jika terkaitKegiatan=true)",
  "kegiatanDate": "YYYY-MM-DD tanggal pelaksanaan (jika ada)",
  "kegiatanStartTime": "HH:MM (jika ada)",
  "kegiatanEndTime": "HH:MM (jika ada, jika tidak ada isi '10:00')",
  "kegiatanLocation": "Lokasi kegiatan (jika ada)"
}

Peraturan:
1. Jika surat berasal dari internal organisasi (KemenPPPA), tapi ditujukan untuk pihak lain atau sesama internal, jadikan jenisSurat = "Masuk" jika itu dari luar organisasi, dan "Keluar" / "Masuk" tergantung penerimanya (asumsi default "Masuk"). 
2. Pastikan tanggal berformat YYYY-MM-DD. Jika tertulis 15 Mei 2026, jadikan 2026-05-15.
3. Kembalikan HANYA JSON.
    `;

    try {
      if (!genAI) throw new Error('API Key Google tidak ditemukan di .env (VITE_GEMINI_API_KEY)');
      
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
      const documentParts = [
        {
          inlineData: {
            data: base64Data.split(',')[1],
            mimeType: file.type,
          },
        },
      ];

      const result = await model.generateContent([prompt, ...documentParts]);
      const response = await result.response;
      let text = response.text();
      
      return cleanAndParseJson(text);
    } catch (geminiError: any) {
      console.warn('Gemini Extraction failed, attempting OpenAI Fallback...', geminiError);
      
      if (!openAiApiKey) {
        throw new Error(geminiError.message || 'Gagal mengekstrak data menggunakan AI. Pastikan dokumen dapat dibaca.');
      }

      // Fallback to OpenAI
      try {
        return await fallbackToOpenAI(file, prompt, base64Data);
      } catch (openAiError: any) {
        console.error('OpenAI Fallback Error:', openAiError);
        throw new Error('Kedua AI (Gemini dan OpenAI) gagal merespon: ' + openAiError.message);
      }
    }
  },

  async generateTaskSummary(tasks: any[], filters?: any): Promise<string> {
    const prompt = `
Anda adalah asisten manajer proyek cerdas. Tugas Anda adalah membuat ringkasan/narasi eksekutif berdasarkan daftar task (pekerjaan) yang telah difilter.
Berikut adalah data task yang dikerjakan:

${JSON.stringify(tasks.map(t => ({
  judul: t.title,
  pic: Array.isArray(t.pic) ? t.pic.join(', ') : t.pic,
  status: t.status,
  tanggalMulai: t.startDate,
  tanggalSelesai: t.deadline,
  prioritas: t.priority
})), null, 2)}

Filter yang sedang aktif: ${JSON.stringify(filters || {})}

Buatlah paragraf ringkasan naratif berbahasa Indonesia yang profesional (sekitar 3-4 kalimat). Jelaskan apa yang telah dilakukan/dikerjakan oleh PIC tersebut, fokus pada pencapaian, status pengerjaan, dan rentang waktu. Jangan gunakan format list/bullet, gunakan paragraf naratif.

PENTING: LANGSUNG JAWAB DENGAN PARAGRAF NARASINYA SAJA. JANGAN tuliskan pemikiran Anda, JANGAN tuliskan rekap data ulang, dan JANGAN beri pengantar/penutup apapun.
`;

    try {
      if (genAI) {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
      } else if (openAiApiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: "user", content: prompt }]
          })
        });
        if (!response.ok) throw new Error('OpenAI Error');
        const data = await response.json();
        return data.choices[0].message.content.trim();
      } else {
        throw new Error('Tidak ada API Key yang dikonfigurasi (Gemini atau OpenAI)');
      }
    } catch (e: any) {
      console.error('Failed to generate summary:', e);
      return "Sistem AI gagal mengenerate summary: " + e.message;
    }
  },

  async generateAnalyticsInsight(analyticsData: any): Promise<string> {
    const prompt = `
Anda adalah Data Analyst Ahli. Tugas Anda adalah memberikan analisis tajam dan rekomendasi eksekutif berdasarkan data dashboard berikut:

DATA:
${JSON.stringify(analyticsData, null, 2)}

Buatlah laporan ringkas berbahasa Indonesia yang mencakup:
1. Kesimpulan Utama (1-2 kalimat tentang kondisi tim).
2. Temuan Kritis (Apa yang berjalan baik, dan apa yang perlu diwaspadai, misalnya beban kerja PIC tertentu atau SLA).
3. Rekomendasi Tindakan (Langkah konkret yang harus diambil).

Format output menggunakan paragraf yang rapi dan mudah dibaca (boleh pakai markdown bullet). Jangan menggunakan kata-kata basa-basi, langsung ke poin analisis.

PENTING: LANGSUNG OUTPUT HASIL ANALISIS. DILARANG KERAS menuliskan "Role:", "Input:", "Output requirements:", atau proses berpikir. Jangan mengulang instruksi.
`;

    try {
      if (genAI) {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
      } else if (openAiApiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: "user", content: prompt }]
          })
        });
        if (!response.ok) throw new Error('OpenAI Error');
        const data = await response.json();
        return data.choices[0].message.content.trim();
      } else {
        throw new Error('Tidak ada API Key yang dikonfigurasi (Gemini atau OpenAI)');
      }
    } catch (e: any) {
      console.error('Failed to generate analytics insight:', e);
      return "Sistem AI gagal mengenerate insight: " + e.message;
    }
  },
  
  async extractZoomMeeting(invitationText: string): Promise<any> {
    const prompt = `
Anda adalah asisten administrasi cerdas. Tugas Anda adalah mengekstrak data dari salinan/copyan undangan Zoom berikut.
Ekstrak informasi ini dan kembalikan HANYA dalam format JSON (tanpa markdown atau teks awalan/akhiran).

Struktur JSON yang WAJIB dipatuhi:
{
  "kegiatan": "Judul kegiatan/rapat/acara (jika ada, biasanya setelah 'Topic:' atau 'Topik:')",
  "tanggal": "Tanggal pelaksanaan dalam format YYYY-MM-DD (jika ada, konversi dari tanggal yang tertulis)",
  "waktuMulai": "Waktu mulai dalam format HH:MM (jika ada, format 24 jam, hilangkan AM/PM)",
  "waktuSelesai": "Waktu selesai dalam format HH:MM (jika ada, jika tidak ada isi 2 jam setelah waktuMulai)",
  "zoomLink": "URL Link Zoom Meeting lengkap (cari yang memiliki format https://...zoom.us/j/...)",
  "meetingId": "Zoom Meeting ID (biasanya angka saja, bersihkan dari spasi)",
  "passcode": "Zoom Passcode/Sandi (jika ada)"
}

Peraturan:
1. Pastikan tanggal berformat YYYY-MM-DD. Jika tertulis 28 Jun 2026 atau June 28, 2026, jadikan 2026-06-28.
2. Pastikan waktuMulai dan waktuSelesai berformat HH:MM dalam format 24 jam. Jika tertulis 09:00 AM, jadikan 09:00. Jika 02:00 PM, jadikan 14:00.
3. Kembalikan HANYA JSON.
    `;

    try {
      if (!genAI) throw new Error('API Key Google tidak ditemukan di .env (VITE_GEMINI_API_KEY)');
      
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
      const result = await model.generateContent([prompt, invitationText]);
      const response = await result.response;
      let text = response.text();
      
      return cleanAndParseJson(text);
    } catch (geminiError: any) {
      console.warn('Gemini Zoom Extraction failed, attempting regex-based fallback...', geminiError);
      return parseZoomInvitationRegex(invitationText);
    }
  }
};

export function parseZoomInvitationRegex(text: string): any {
  const result: any = {
    kegiatan: '',
    tanggal: '',
    waktuMulai: '',
    waktuSelesai: '',
    zoomLink: '',
    meetingId: '',
    passcode: ''
  };

  // 1. Zoom Link
  const linkRegex = /(https:\/\/[a-zA-Z0-9-.]*zoom\.us\/j\/[0-9]+(?:\?pwd=[a-zA-Z0-9]+)?)/i;
  const linkMatch = text.match(linkRegex);
  if (linkMatch) {
    result.zoomLink = linkMatch[1];
  }

  // 2. Meeting ID
  const idRegex = /(?:Meeting ID|ID Rapat|ID):\s*([0-9\s]+)/i;
  const idMatch = text.match(idRegex);
  if (idMatch) {
    result.meetingId = idMatch[1].replace(/\s/g, '');
  }

  // 3. Passcode
  const passcodeRegex = /(?:Passcode|Password|Sandi|Kode Akses|Pass):\s*([a-zA-Z0-9]+)/i;
  const passcodeMatch = text.match(passcodeRegex);
  if (passcodeMatch) {
    result.passcode = passcodeMatch[1];
  }

  // 4. Topic/Kegiatan
  const topicRegex = /(?:Topic|Topik|Kegiatan|Tema|Acara):\s*(.*)/i;
  const topicMatch = text.match(topicRegex);
  if (topicMatch) {
    result.kegiatan = topicMatch[1].trim();
  }

  // 5. Date & Time
  const timeRegex = /(?:Time|Waktu|Tanggal):\s*(.*)/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    const parsed = parseDateTimeString(timeMatch[1].trim());
    if (parsed) {
      result.tanggal = parsed.date;
      result.waktuMulai = parsed.startTime;
      result.waktuSelesai = parsed.endTime;
    }
  }

  // Fallback: If no topic is found, use the first line of the text or "Rapat Zoom"
  if (!result.kegiatan) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines[0].length < 100) {
      result.kegiatan = lines[0];
    } else {
      result.kegiatan = 'Rapat Zoom';
    }
  }

  // Fallback: If no date/time is found, use today
  if (!result.tanggal) {
    const today = new Date();
    result.tanggal = today.toISOString().split('T')[0];
  }
  if (!result.waktuMulai) {
    result.waktuMulai = '09:00';
  }
  if (!result.waktuSelesai) {
    result.waktuSelesai = '11:00';
  }

  return result;
}

function parseDateTimeString(str: string): { date: string; startTime: string; endTime: string } | null {
  try {
    let dateStr = '';
    let startTimeStr = '09:00';
    let endTimeStr = '11:00';

    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05', jun: '06',
      jul: '07', agu: '08', aug: '08', sep: '09', okt: '10', oct: '10', nov: '11', des: '12', dec: '12'
    };

    // Try to extract year: 4 digits
    const yearMatch = str.match(/\b(202[0-9])\b/);
    const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

    // Try to extract month
    let month = '01';
    for (const [mName, mVal] of Object.entries(months)) {
      const reg = new RegExp('\\b' + mName, 'i');
      if (reg.test(str)) {
        month = mVal;
        break;
      }
    }

    // Try to extract day: 1 or 2 digits
    const dayMatch = str.match(/\b([0-2]?[0-9]|3[01])\b/);
    let day = dayMatch ? dayMatch[1].padStart(2, '0') : '01';

    // Refine day if part of a standard date format like "28 Jun 2026"
    const dayNameYearMatch = str.match(/\b(\d{1,2})\s+(?:Jan|Feb|Mar|Apr|Mei|May|Jun|Jul|Agu|Aug|Sep|Okt|Oct|Nov|Des|Dec)[a-z]*\s+(\d{4})\b/i);
    if (dayNameYearMatch) {
      day = dayNameYearMatch[1].padStart(2, '0');
    }

    dateStr = `${year}-${month}-${day}`;

    // Extract time: e.g., "09:00 AM" or "13:00"
    const timeMatches = str.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s*(AM|PM)?\b/gi);
    if (timeMatches && timeMatches.length > 0) {
      const firstTime = timeMatches[0];
      const match = firstTime.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s*(AM|PM)?\b/i);
      if (match) {
        let hour = parseInt(match[1]);
        const minute = match[2];
        const ampm = match[3];
        if (ampm) {
          if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
          if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
        }
        startTimeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
        
        let endHour = (hour + 2) % 24;
        endTimeStr = `${endHour.toString().padStart(2, '0')}:${minute}`;
      }

      if (timeMatches.length > 1) {
        const secondTime = timeMatches[1];
        const match2 = secondTime.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s*(AM|PM)?\b/i);
        if (match2) {
          let hour = parseInt(match2[1]);
          const minute = match2[2];
          const ampm = match2[3];
          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
            if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
          }
          endTimeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
        }
      }
    }

    return { date: dateStr, startTime: startTimeStr, endTime: endTimeStr };
  } catch (e) {
    console.error('Error parsing date time string:', e);
    return null;
  }
}

async function fallbackToOpenAI(file: File, prompt: string, base64Data: string) {
  const imageUrl = `data:${file.type};base64,${base64Data.split(',')[1]}`;
  
  const payload = {
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ]
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAiApiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  return cleanAndParseJson(text);
}

function cleanAndParseJson(text: string) {
  let cleaned = text;
  if (cleaned.includes('```json')) {
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```/g, '');
  }
  return JSON.parse(cleaned.trim());
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
