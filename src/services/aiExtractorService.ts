import { supabase } from '../lib/supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callAiEdgeFunction(action: string, payload: any): Promise<any> {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token || supabaseAnonKey; // Fallback to anon key if no session

  const url = `${supabaseUrl}/functions/v1/ai-extractor`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({ action, payload })
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {
      try {
        const errText = await response.text();
        if (errText) errorMsg = errText;
      } catch {}
    }
    throw new Error(errorMsg);
  }

  const resJson = await response.json();
  return resJson.data;
}

export const aiExtractorService = {
  async extractSuratData(file: File, masterData?: any): Promise<any> {
    const base64Data = await fileToBase64(file);
    try {
      return await callAiEdgeFunction('extractSuratData', {
        fileBase64: base64Data,
        fileType: file.type,
        masterData
      });
    } catch (e: any) {
      console.error('Failed to extract surat data via Edge Function:', e);
      throw new Error(formatError(e));
    }
  },

  async generateTaskSummary(tasks: any[], filters?: any): Promise<string> {
    try {
      return await callAiEdgeFunction('generateTaskSummary', { tasks, filters });
    } catch (e: any) {
      console.error('Failed to generate task summary via Edge Function:', e);
      return "Sistem AI gagal mengenerate summary: " + formatError(e);
    }
  },

  async generateAnalyticsInsight(analyticsData: any): Promise<string> {
    try {
      return await callAiEdgeFunction('generateAnalyticsInsight', { analyticsData });
    } catch (e: any) {
      console.error('Failed to generate analytics insight via Edge Function:', e);
      return "Sistem AI gagal mengenerate insight: " + formatError(e);
    }
  },

  async extractZoomMeeting(invitationText: string): Promise<any> {
    try {
      return await callAiEdgeFunction('extractZoomMeeting', { invitationText });
    } catch (e: any) {
      console.warn('Failed to extract Zoom meeting via Edge Function, running local fallback...', e);
      return parseZoomInvitationRegex(invitationText);
    }
  },

  async extractTasksFromText(
    inputText: string, 
    contextData?: { 
      users?: string[]; 
      categories?: string[]; 
      subCategories?: string[]; 
      projects?: { id: string; name: string }[] 
    }
  ): Promise<any[]> {
    try {
      return await callAiEdgeFunction('extractTasksFromText', { inputText, contextData });
    } catch (e: any) {
      console.error('Failed to extract tasks via Edge Function:', e);
      throw new Error('Gagal mengekstrak task dengan AI: ' + formatError(e));
    }
  },

  async extractArchiveEvaluation(text: string): Promise<any> {
    try {
      return await callAiEdgeFunction('extractArchiveEvaluation', { text });
    } catch (e: any) {
      console.error('Failed to extract archive evaluation via Edge Function:', e);
      throw new Error('Gagal menganalisis teks dengan AI: ' + formatError(e));
    }
  },

  async extractBudgetTransaction(
    inputText: string,
    masters?: any[]
  ): Promise<any> {
    try {
      return await callAiEdgeFunction('extractBudgetTransaction', { inputText, masters });
    } catch (e: any) {
      console.error('Failed to extract budget transaction via Edge Function:', e);
      throw new Error('Gagal mengekstrak transaksi dengan AI: ' + formatError(e));
    }
  }
};

function formatError(error: any): string {
  if (error && error.message) {
    if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
      return "Fungsi AI (Edge Function) tidak ditemukan atau belum dideploy di Supabase. Silakan deploy fungsi 'ai-extractor' terlebih dahulu menggunakan Supabase CLI.";
    }
    return error.message;
  }
  return String(error);
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
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
