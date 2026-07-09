import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify User Authentication (JWT)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Get user to verify active session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token. Silakan login kembali.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse Request Body
    const { action, payload } = await req.json()
    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Retrieve API Keys from Edge Function secrets
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!geminiApiKey && !openAiApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI API keys are not configured on the server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result: any = null

    // 3. Process Action
    if (action === 'extractSuratData') {
      const { fileBase64, fileType, masterData } = payload
      result = await handleExtractSuratData(fileBase64, fileType, masterData, geminiApiKey, openAiApiKey)
    } else if (action === 'generateTaskSummary') {
      const { tasks, filters } = payload
      result = await handleGenerateTaskSummary(tasks, filters, geminiApiKey, openAiApiKey)
    } else if (action === 'generateAnalyticsInsight') {
      const { analyticsData } = payload
      result = await handleGenerateAnalyticsInsight(analyticsData, geminiApiKey, openAiApiKey)
    } else if (action === 'extractZoomMeeting') {
      const { invitationText } = payload
      result = await handleExtractZoomMeeting(invitationText, geminiApiKey)
    } else if (action === 'extractTasksFromText') {
      const { inputText, contextData } = payload
      result = await handleExtractTasksFromText(inputText, contextData, geminiApiKey, openAiApiKey)
    } else if (action === 'extractArchiveEvaluation') {
      const { text } = payload
      result = await handleExtractArchiveEvaluation(text, geminiApiKey)
    } else if (action === 'extractBudgetTransaction') {
      const { inputText, masters } = payload
      result = await handleExtractBudgetTransaction(inputText, masters, geminiApiKey, openAiApiKey)
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Error processing request:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// --- REST Client for Gemini API ---

async function callGeminiRest(prompt: string, inlineParts: any[], apiKey: string): Promise<string> {
  // Use gemini-1.5-flash which is extremely stable and fast
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const contents = {
    contents: [
      {
        parts: [
          { text: prompt },
          ...inlineParts
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(contents)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${errorText}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned an empty response');
  }
  return text;
}

// --- Handlers ---

async function handleExtractSuratData(fileBase64: string, fileType: string, masterData: any, geminiApiKey?: string, openAiApiKey?: string) {
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
    if (!geminiApiKey) throw new Error('API Key Google tidak ditemukan');
    
    const documentParts = [
      {
        inlineData: {
          data: fileBase64.split(',')[1] || fileBase64,
          mimeType: fileType,
        },
      },
    ];

    const text = await callGeminiRest(prompt, documentParts, geminiApiKey);
    return cleanAndParseJson(text);
  } catch (geminiError: any) {
    console.warn('Gemini Extraction failed, attempting OpenAI Fallback...', geminiError);
    
    if (!openAiApiKey) {
      throw new Error(geminiError.message || 'Gagal mengekstrak data menggunakan AI.');
    }

    // Fallback to OpenAI
    try {
      return await fallbackToOpenAI(prompt, fileBase64, fileType, openAiApiKey);
    } catch (openAiError: any) {
      console.error('OpenAI Fallback Error:', openAiError);
      throw new Error('Kedua AI (Gemini dan OpenAI) gagal merespon: ' + openAiError.message);
    }
  }
}

async function fallbackToOpenAI(prompt: string, fileBase64: string, fileType: string, openAiApiKey: string) {
  const pureBase64 = fileBase64.split(',')[1] || fileBase64;
  const imageUrl = `data:${fileType};base64,${pureBase64}`;
  
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

async function handleGenerateTaskSummary(tasks: any[], filters: any, geminiApiKey?: string, openAiApiKey?: string) {
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
    if (geminiApiKey) {
      return await callGeminiRest(prompt, [], geminiApiKey);
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
      throw new Error('Tidak ada API Key yang dikonfigurasi');
    }
  } catch (e: any) {
    console.error('Failed to generate summary:', e);
    return "Sistem AI gagal mengenerate summary: " + e.message;
  }
}

async function handleGenerateAnalyticsInsight(analyticsData: any, geminiApiKey?: string, openAiApiKey?: string) {
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
    if (geminiApiKey) {
      return await callGeminiRest(prompt, [], geminiApiKey);
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
      throw new Error('Tidak ada API Key yang dikonfigurasi');
    }
  } catch (e: any) {
    console.error('Failed to generate analytics insight:', e);
    return "Sistem AI gagal mengenerate insight: " + e.message;
  }
}

async function handleExtractZoomMeeting(invitationText: string, geminiApiKey?: string) {
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
    if (!geminiApiKey) throw new Error('API Key Google tidak ditemukan');
    
    const text = await callGeminiRest(prompt, [ { text: invitationText } ], geminiApiKey);
    return cleanAndParseJson(text);
  } catch (geminiError: any) {
    console.warn('Gemini Zoom Extraction failed, attempting regex-based fallback...', geminiError);
    return parseZoomInvitationRegex(invitationText);
  }
}

async function handleExtractTasksFromText(inputText: string, contextData?: any, geminiApiKey?: string, openAiApiKey?: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  let contextPrompt = "";
  if (contextData) {
    contextPrompt = `
Gunakan informasi konteks berikut untuk mencocokkan data jika memungkinkan:
${contextData.users ? `- Daftar PIC (nama pengguna) yang Valid: ${contextData.users.join(', ')}` : ''}
${contextData.categories ? `- Daftar Kategori yang Valid: ${contextData.categories.join(', ')}` : ''}
${contextData.subCategories ? `- Daftar Sub-Kategori yang Valid: ${contextData.subCategories.join(', ')}` : ''}
${contextData.projects ? `- Daftar Project yang Valid (nama dan ID): ${JSON.stringify(contextData.projects.map((p: any) => ({ id: p.id, name: p.name })))}` : ''}
`;
  }

  const prompt = `
Anda adalah asisten manajer proyek AI yang cerdas. Tugas Anda adalah menganalisis teks berikut dan memecahnya menjadi daftar task (tugas/pekerjaan) yang terperinci.

Teks input:
"""
${inputText}
"""

${contextPrompt}
Tanggal hari ini: ${todayStr}

Ekstrak semua task yang perlu dilakukan dari teks tersebut. Untuk setiap task, buat objek JSON dengan struktur berikut:
{
  "title": "Judul task singkat dan jelas (Bahasa Indonesia)",
  "description": "Deskripsi lengkap mengenai apa yang harus dikerjakan",
  "priority": "Low" | "Medium" | "High" (pilih salah satu sesuai tingkat urgensi),
  "startDate": "YYYY-MM-DD" (tanggal mulai task, default hari ini jika tidak ada info spesifik),
  "deadline": "YYYY-MM-DD" (tanggal selesai task, perkirakan deadline yang logis berdasarkan konteks teks, atau buat 3-7 hari setelah startDate jika tidak ada info spesifik),
  "pic": ["Nama PIC 1", "Nama PIC 2"] (array nama PIC yang ditugaskan. WAJIB pilih dari Daftar PIC yang Valid di atas jika ada nama yang mirip/cocok. Jika tidak ada yang cocok, Anda boleh menggunakan nama yang tertulis di teks),
  "category": "Nama Kategori" (WAJIB pilih dari Daftar Kategori yang Valid di atas yang paling mendekati/cocok. Jika tidak ada yang cocok, gunakan salah satu kategori yang umum),
  "subCategory": "Nama Sub-Kategori" (WAJIB pilih dari Daftar Sub-Kategori yang Valid di atas yang paling mendekati/cocok),
  "projectId": "ID project" (jika task ini terkait dengan salah satu project dari Daftar Project yang Valid di atas, isi dengan ID-nya. Jika tidak terkait, kosongkan atau isi null)
}

Kembalikan HANYA array JSON berisi objek-objek task tersebut, contoh:
[
  {
    "title": "...",
    "description": "...",
    "priority": "Medium",
    "startDate": "2026-06-29",
    "deadline": "2026-07-02",
    "pic": ["Budi"],
    "category": "Pengembangan Aplikasi",
    "subCategory": "Frontend",
    "projectId": "project-uuid-123"
  }
]

PENTING: Kembalikan HANYA JSON. JANGAN sertakan markdown block seperti \`\`\`json, JANGAN berikan teks pengantar, penjelas, atau penutup. Jika tidak ada task yang bisa diekstrak, kembalikan array kosong [].
`;

  try {
    if (geminiApiKey) {
      const text = await callGeminiRest(prompt, [], geminiApiKey);
      return cleanAndParseJson(text);
    } else if (openAiApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!response.ok) throw new Error('OpenAI Error');
      const data = await response.json();
      const resText = data.choices[0].message.content;
      return cleanAndParseJson(resText);
    } else {
      throw new Error('Tidak ada API Key yang dikonfigurasi');
    }
  } catch (e: any) {
    console.error('Failed to extract tasks from text:', e);
    throw new Error('Gagal mengekstrak task dengan AI: ' + e.message);
  }
}

async function handleExtractArchiveEvaluation(text: string, geminiApiKey?: string) {
  const prompt = `
Anda adalah asisten AI kearsipan yang sangat cerdas. Tugas Anda adalah mengekstrak nilai perolehan (jumlah skor), nilai standar, dan bobot kearsipan dari teks laporan atau ringkasan hasil audit kearsipan berikut.

Teks input sering kali berasal dari copy-paste tabel PDF atau Word yang rusak secara vertikal (baris terpotong/patah dan angka terpisah). Anda harus merekonstruksinya terlebih dahulu.

Teks input:
"""
${text}
"""

---

### PANDUAN REKONSTRUKSI TEKS RUSAK / VERTIKAL:
1. **Gabungkan Angka yang Terpotong**:
   - Jika ada angka terpisah seperti "3" di satu baris dan "00" di baris berikutnya, gabungkan menjadi "300".
   - Jika ada desimal yang terpisah seperti "1000" and ".00", gabungkan menjadi "1000.00".
   - Jika ada "70" dan "0.00", periksa konteksnya: jika subaspek tersebut memiliki standar default 700, maka gabungkan menjadi "700.00".
2. **Urutan Kolom Subaspek**:
   Dalam satu subaspek, angka yang muncul biasanya berurutan sebagai:
   \`[Nilai Perolehan / Jumlah Skor]\` -> \`[Nilai Standar]\` -> \`[Bobot Sub-Aspek]\` -> \`[Nilai Akhir]\`
   *Catatan*: Gunakan logika bahwa Nilai Perolehan biasanya lebih kecil atau sama dengan Nilai Standar. Bobot biasanya berupa desimal (0.2, 0.25, 0.35, 0.5) atau persentase (20%, 25%, 35%, 50%).
3. **Konversi Bobot Desimal ke Persen**:
   - Jika bobot di dalam teks tertulis dalam bentuk desimal (seperti "0.2", "0.25", "0.35", "0.5", "0.7"), Anda **WAJIB mengalikan angka tersebut dengan 100** sebelum dimasukkan ke JSON (misalnya: "0.2" menjadi 20, "0.35" menjadi 35, "0.7" menjadi 70). Jika sudah tertulis dalam persen (seperti "20%" atau "20"), gunakan angka tersebut langsung.

---

### CONTOH ANALISIS (FEW-SHOT EXAMPLE):

Jika teks input adalah:
"""
1.1
Subaspek
Penciptaan Arsip
700
70
0.00
0.2
20
1.2
Subaspek
Penggunaan
Arsip
200
200.00
0.2
20
1.3
Subaspek
Pemeliharaan
Arsip
1100
1000
.00
0.35
35
1.4
Subaspek
Penyusutan
Arsip
200
120
.00
0.25
15
2
.
ASPEK   SUMBER
DAYA KEARSIPAN
300
61,67
0,3
18,5
2.1
Subaspek
Sumber   Daya
Manusia
Kearsipan
 
3
00
70
.00
0.5
11,67
2.2
Subaspek
Prasarana   dan
Saranan
Kearsipan
100
100.00
0.5
50
"""

Maka hasil JSON yang Anda kembalikan harus tepat seperti ini:
{
  "nilai_1_1": 700,
  "standar_1_1": 700,
  "bobot_1_1": 20,
  "nilai_1_2": 200,
  "standar_1_2": 200,
  "bobot_1_2": 20,
  "nilai_1_3": 1000,
  "standar_1_3": 1100,
  "bobot_1_3": 35,
  "nilai_1_4": 120,
  "standar_1_4": 200,
  "bobot_1_4": 25,
  "nilai_2_1": 70,
  "standar_2_1": 300,
  "bobot_2_1": 50,
  "nilai_2_2": 100,
  "standar_2_2": 100,
  "bobot_2_2": 50,
  "bobot_aspek_1": 70,
  "bobot_aspek_2": 30
}

---

### SUBASPEK & NILAI DEFAULT SEBAGAI ACUAN (JIKA TIDAK DISEBUTKAN):
1. **Penciptaan Arsip (Subaspek 1.1)**: Standar default 700, Bobot default 25
2. **Penggunaan Arsip (Subaspek 1.2)**: Standar default 200, Bobot default 25
3. **Pemeliharaan Arsip (Subaspek 1.3)**: Standar default 1100, Bobot default 25
4. **Penyusutan Arsip (Subaspek 1.4)**: Standar default 200, Bobot default 25
5. **Sumber Daya Manusia Kearsipan (Subaspek 2.1)**: Standar default 300, Bobot default 50
6. **Prasarana dan Sarana Kearsipan (Subaspek 2.2)**: Standar default 100, Bobot default 50

---

### OUTPUT FORMAT:
Kembalikan HANYA dalam format JSON berikut (tanpa markdown, tanpa penjelasan):
{
  "nilai_1_1": number,
  "standar_1_1": number,
  "bobot_1_1": number,
  
  "nilai_1_2": number,
  "standar_1_2": number,
  "bobot_1_2": number,
  
  "nilai_1_3": number,
  "standar_1_3": number,
  "bobot_1_3": number,
  
  "nilai_1_4": number,
  "standar_1_4": number,
  "bobot_1_4": number,
  
  "nilai_2_1": number,
  "standar_2_1": number,
  "bobot_2_1": number,
  
  "nilai_2_2": number,
  "standar_2_2": number,
  "bobot_2_2": number,
  
  "bobot_aspek_1": number,
  "bobot_aspek_2": number
}
`;

  try {
    if (!geminiApiKey) throw new Error('API Key Google tidak ditemukan');
    
    const text = await callGeminiRest(prompt, [], geminiApiKey);
    return cleanAndParseJson(text);
  } catch (geminiError: any) {
    console.error('Gemini Archive Evaluation Extraction failed:', geminiError);
    throw new Error('Gagal menganalisis teks dengan AI: ' + geminiError.message);
  }
}

async function handleExtractBudgetTransaction(inputText: string, masters?: any[], geminiApiKey?: string, openAiApiKey?: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  let mastersContext = "";
  if (masters && masters.length > 0) {
    mastersContext = `
Gunakan daftar Master Anggaran berikut untuk memilih "masterId" yang paling cocok berdasarkan detail, kro, ro, atau akun:
${JSON.stringify(masters.map(m => ({ id: m.id, kro: m.kro, ro: m.ro, akun: m.akun, detail: m.detail })), null, 2)}
`;
  }

  const prompt = `
Anda adalah asisten keuangan cerdas. Tugas Anda adalah menganalisis teks berikut dan mengekstrak data transaksi realisasi anggaran.

Teks input:
"""
${inputText}
"""

${mastersContext}
Tanggal hari ini: ${todayStr}

Ekstrak informasi transaksi berikut dan kembalikan HANYA dalam format JSON (tanpa markdown atau teks awalan/akhiran):
{
  "tanggal": "YYYY-MM-DD" (tanggal transaksi, default hari ini jika tidak ada info spesifik),
  "status": "Realisasi" atau "Outstanding" (default "Realisasi". Jika teks menyebutkan "belum dibayar", "outstanding", "utang", "rencana", "piutang", "komitmen", pilih "Outstanding"),
  "nominal": number (nominal transaksi dalam rupiah, ekstrak angka saja. Konversi kata seperti "300rb" menjadi 300000, "1 juta" menjadi 1000000),
  "uraian": "Uraian penggunaan/belanja singkat dan jelas dalam Bahasa Indonesia",
  "bukti": "URL link bukti dukung (jika ada seperti drive.google.com, jika tidak ada kosongkan atau null)",
  "keterangan": "Keterangan tambahan jika ada",
  "masterId": "ID master yang paling cocok dari daftar Master Anggaran di atas (pilih string ID persis). Jika tidak ada master yang cocok atau daftar kosong, isi null."
}

PENTING: Kembalikan HANYA JSON objek tersebut. JANGAN sertakan markdown block seperti \`\`\`json, JANGAN berikan teks pengantar, penjelas, atau penutup.
`;

  try {
    if (geminiApiKey) {
      const text = await callGeminiRest(prompt, [], geminiApiKey);
      return cleanAndParseJson(text);
    } else if (openAiApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!response.ok) throw new Error('OpenAI Error');
      const data = await response.json();
      const resText = data.choices[0].message.content;
      return cleanAndParseJson(resText);
    } else {
      throw new Error('Tidak ada API Key yang dikonfigurasi');
    }
  } catch (e: any) {
    console.error('Failed to extract budget transaction:', e);
    throw new Error('Gagal mengekstrak transaksi dengan AI: ' + e.message);
  }
}

// --- Zoom Invitation Regex Fallback ---

function parseZoomInvitationRegex(text: string): any {
  const result: any = {
    kegiatan: '',
    tanggal: '',
    waktuMulai: '',
    waktuSelesai: '',
    zoomLink: '',
    meetingId: '',
    passcode: ''
  };

  const linkRegex = /(https:\/\/[a-zA-Z0-9-.]*zoom\.us\/j\/[0-9]+(?:\?pwd=[a-zA-Z0-9]+)?)/i;
  const linkMatch = text.match(linkRegex);
  if (linkMatch) {
    result.zoomLink = linkMatch[1];
  }

  const idRegex = /(?:Meeting ID|ID Rapat|ID):\s*([0-9\s]+)/i;
  const idMatch = text.match(idRegex);
  if (idMatch) {
    result.meetingId = idMatch[1].replace(/\s/g, '');
  }

  const passcodeRegex = /(?:Passcode|Password|Sandi|Kode Akses|Pass):\s*([a-zA-Z0-9]+)/i;
  const passcodeMatch = text.match(passcodeRegex);
  if (passcodeMatch) {
    result.passcode = passcodeMatch[1];
  }

  const topicRegex = /(?:Topic|Topik|Kegiatan|Tema|Acara):\s*(.*)/i;
  const topicMatch = text.match(topicRegex);
  if (topicMatch) {
    result.kegiatan = topicMatch[1].trim();
  }

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

  if (!result.kegiatan) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines[0].length < 100) {
      result.kegiatan = lines[0];
    } else {
      result.kegiatan = 'Rapat Zoom';
    }
  }

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

    const yearMatch = str.match(/\b(202[0-9])\b/);
    const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

    let month = '01';
    for (const [mName, mVal] of Object.entries(months)) {
      const reg = new RegExp('\\b' + mName, 'i');
      if (reg.test(str)) {
        month = mVal;
        break;
      }
    }

    const dayMatch = str.match(/\b([0-2]?[0-9]|3[01])\b/);
    let day = dayMatch ? dayMatch[1].padStart(2, '0') : '01';

    const dayNameYearMatch = str.match(/\b(\d{1,2})\s+(?:Jan|Feb|Mar|Apr|Mei|May|Jun|Jul|Agu|Aug|Sep|Okt|Oct|Nov|Des|Dec)[a-z]*\s+(\d{4})\b/i);
    if (dayNameYearMatch) {
      day = dayNameYearMatch[1].padStart(2, '0');
    }

    dateStr = `${year}-${month}-${day}`;

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
