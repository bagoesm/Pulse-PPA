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
      if (!genAI) throw new Error('API Key Gemini tidak ditemukan di .env (VITE_GEMINI_API_KEY)');
      
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
  }
};

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
