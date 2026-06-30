import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDivision } from '../contexts/DivisionContext';
import { useAuth } from '../contexts/AuthContext';
import { PenilaianArsip } from '../../types';
import { archiveEvaluationService } from '../services/ArchiveEvaluationService';
import { aiExtractorService } from '../services/aiExtractorService';
import DivisionFilter from './DivisionFilter';
import ArchiveEditorManager from './ArchiveEditorManager';
import { 
  ClipboardCheck, 
  Calendar, 
  Building2, 
  FileText, 
  BrainCircuit, 
  TrendingUp, 
  Award,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  History,
  PieChart as PieIcon,
  BarChart4,
  ChevronDown,
  Check
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

// Helper to determine category based on score (in Uppercase)
const getCategoryInfo = (score: number) => {
  if (score >= 90 && score <= 100) return { category: 'AA', label: 'SANGAT MEMUASKAN', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-600', fill: '#059669' };
  if (score >= 80 && score < 90) return { category: 'A', label: 'MEMUASKAN', color: 'bg-teal-50 text-teal-700 border-teal-200', text: 'text-teal-600', fill: '#0d9488' };
  if (score >= 70 && score < 80) return { category: 'BB', label: 'SANGAT BAIK', color: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-600', fill: '#2563eb' };
  if (score >= 60 && score < 70) return { category: 'B', label: 'BAIK', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-600', fill: '#4f46e5' };
  if (score >= 50 && score < 60) return { category: 'CC', label: 'CUKUP', color: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-600', fill: '#d97706' };
  if (score >= 30 && score < 50) return { category: 'C', label: 'KURANG', color: 'bg-orange-50 text-orange-700 border-orange-200', text: 'text-orange-600', fill: '#ea580c' };
  return { category: 'D', label: 'SANGAT KURANG', color: 'bg-red-50 text-red-700 border-red-200', text: 'text-red-600', fill: '#dc2626' };
};

const PenilaianArsipPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedDivisi, setSelectedDivisi, divisiList } = useDivision();
  
  // States
  const [selectedTahun, setSelectedTahun] = useState<number>(new Date().getFullYear());
  const [allEvaluations, setAllEvaluations] = useState<PenilaianArsip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState<boolean>(false);
  
  // Year selector dropdown states
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState<boolean>(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Editor and Tab states
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Editor'>('Dashboard');
  const [isUserEditor, setIsUserEditor] = useState<boolean>(false);

  // Close year dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if user has editor privileges for the selected division
  useEffect(() => {
    const checkEditorPrivilege = async () => {
      if (!currentUser || !selectedDivisi) {
        setIsUserEditor(false);
        return;
      }
      if (currentUser.role === 'Super Admin' || currentUser.role === 'Atasan') {
        setIsUserEditor(true);
        return;
      }
      try {
        const hasPrivilege = await archiveEvaluationService.isEditor(currentUser.id, selectedDivisi);
        setIsUserEditor(hasPrivilege);
      } catch (err) {
        console.error('Error checking archive editor status:', err);
        setIsUserEditor(false);
      }
    };
    checkEditorPrivilege();
  }, [currentUser, selectedDivisi]);

  // Ensure non-admin users cannot stay on Editor tab
  useEffect(() => {
    if (currentUser?.role !== 'Super Admin' && currentUser?.role !== 'Atasan') {
      setActiveTab('Dashboard');
    }
  }, [currentUser]);
  
  // AI States
  const [aiText, setAiText] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiSuccess, setAiSuccess] = useState<boolean>(false);

  // Form Fields
  const [formTahun, setFormTahun] = useState<number>(new Date().getFullYear());
  const [formData, setFormData] = useState({
    nilai_1_1: 0,
    nilai_1_2: 0,
    nilai_1_3: 0,
    nilai_1_4: 0,
    nilai_2_1: 0,
    nilai_2_2: 0,
    standar_1_1: 700,
    standar_1_2: 200,
    standar_1_3: 1100,
    standar_1_4: 200,
    standar_2_1: 300,
    standar_2_2: 100,
    bobot_1_1: 25,
    bobot_1_2: 25,
    bobot_1_3: 25,
    bobot_1_4: 25,
    bobot_2_1: 50,
    bobot_2_2: 50,
    bobot_aspek_1: 50,
    bobot_aspek_2: 50
  });
  const [lakiLink, setLakiLink] = useState<string>('');

  // Year Options: Generate years from 2022 (start of system) up to next year
  const getYearOptions = () => {
    const startYear = 2022;
    const currentYear = new Date().getFullYear();
    const yearsList = [];
    for (let y = currentYear + 1; y >= startYear; y--) {
      yearsList.push(y);
    }
    return yearsList;
  };
  const years = getYearOptions();

  // Fetch All Years Data for the selected division
  const fetchData = useCallback(async () => {
    if (!selectedDivisi) return;
    setLoading(true);
    try {
      const data = await archiveEvaluationService.getEvaluations(selectedDivisi);
      setAllEvaluations(data || []);
    } catch (err) {
      console.error('Failed to fetch archive evaluations:', err);
    } fillly: {
      setLoading(false);
    }
  }, [selectedDivisi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Current active evaluation derived from the full list
  const evaluation = allEvaluations.find(ev => ev.tahun === selectedTahun) || null;

  // Load existing data when formTahun changes in the modal
  useEffect(() => {
    if (!isModalOpen || !selectedDivisi) return;

    const existingData = allEvaluations.find(ev => ev.tahun === formTahun);
    if (existingData) {
      setFormData({
        nilai_1_1: existingData.nilai_1_1,
        nilai_1_2: existingData.nilai_1_2,
        nilai_1_3: existingData.nilai_1_3,
        nilai_1_4: existingData.nilai_1_4,
        nilai_2_1: existingData.nilai_2_1,
        nilai_2_2: existingData.nilai_2_2,
        standar_1_1: existingData.standar_1_1 ?? 700,
        standar_1_2: existingData.standar_1_2 ?? 200,
        standar_1_3: existingData.standar_1_3 ?? 1100,
        standar_1_4: existingData.standar_1_4 ?? 200,
        standar_2_1: existingData.standar_2_1 ?? 300,
        standar_2_2: existingData.standar_2_2 ?? 100,
        bobot_1_1: existingData.bobot_1_1 ?? 25,
        bobot_1_2: existingData.bobot_1_2 ?? 25,
        bobot_1_3: existingData.bobot_1_3 ?? 25,
        bobot_1_4: existingData.bobot_1_4 ?? 25,
        bobot_2_1: existingData.bobot_2_1 ?? 50,
        bobot_2_2: existingData.bobot_2_2 ?? 50,
        bobot_aspek_1: existingData.bobot_aspek_1 ?? 50,
        bobot_aspek_2: existingData.bobot_aspek_2 ?? 50
      });
      setLakiLink(existingData.lakiLink || '');
    } else {
      setFormData({
        nilai_1_1: 0,
        nilai_1_2: 0,
        nilai_1_3: 0,
        nilai_1_4: 0,
        nilai_2_1: 0,
        nilai_2_2: 0,
        standar_1_1: 700,
        standar_1_2: 200,
        standar_1_3: 1100,
        standar_1_4: 200,
        standar_2_1: 300,
        standar_2_2: 100,
        bobot_1_1: 25,
        bobot_1_2: 25,
        bobot_1_3: 25,
        bobot_1_4: 25,
        bobot_2_1: 50,
        bobot_2_2: 50,
        bobot_aspek_1: 50,
        bobot_aspek_2: 50
      });
      setLakiLink('');
    }
  }, [formTahun, isModalOpen, selectedDivisi, allEvaluations]);

  // Open Edit/Add Modal
  const handleOpenModal = () => {
    setFormTahun(selectedTahun);
    if (evaluation) {
      setFormData({
        nilai_1_1: evaluation.nilai_1_1,
        nilai_1_2: evaluation.nilai_1_2,
        nilai_1_3: evaluation.nilai_1_3,
        nilai_1_4: evaluation.nilai_1_4,
        nilai_2_1: evaluation.nilai_2_1,
        nilai_2_2: evaluation.nilai_2_2,
        standar_1_1: evaluation.standar_1_1 ?? 700,
        standar_1_2: evaluation.standar_1_2 ?? 200,
        standar_1_3: evaluation.standar_1_3 ?? 1100,
        standar_1_4: evaluation.standar_1_4 ?? 200,
        standar_2_1: evaluation.standar_2_1 ?? 300,
        standar_2_2: evaluation.standar_2_2 ?? 100,
        bobot_1_1: evaluation.bobot_1_1 ?? 25,
        bobot_1_2: evaluation.bobot_1_2 ?? 25,
        bobot_1_3: evaluation.bobot_1_3 ?? 25,
        bobot_1_4: evaluation.bobot_1_4 ?? 25,
        bobot_2_1: evaluation.bobot_2_1 ?? 50,
        bobot_2_2: evaluation.bobot_2_2 ?? 50,
        bobot_aspek_1: evaluation.bobot_aspek_1 ?? 50,
        bobot_aspek_2: evaluation.bobot_aspek_2 ?? 50
      });
      setLakiLink(evaluation.lakiLink || '');
    } else {
      setFormData({
        nilai_1_1: 0,
        nilai_1_2: 0,
        nilai_1_3: 0,
        nilai_1_4: 0,
        nilai_2_1: 0,
        nilai_2_2: 0,
        standar_1_1: 700,
        standar_1_2: 200,
        standar_1_3: 1100,
        standar_1_4: 200,
        standar_2_1: 300,
        standar_2_2: 100,
        bobot_1_1: 25,
        bobot_1_2: 25,
        bobot_1_3: 25,
        bobot_1_4: 25,
        bobot_2_1: 50,
        bobot_2_2: 50,
        bobot_aspek_1: 50,
        bobot_aspek_2: 50
      });
      setLakiLink('');
    }
    setAiText('');
    setAiSuccess(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Run AI Extraction
  const handleAiExtract = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setFormError(null);
    setAiSuccess(false);
    try {
      const extracted = await aiExtractorService.extractArchiveEvaluation(aiText);
      setFormData(prev => {
        const s11 = Number(extracted.standar_1_1) || prev.standar_1_1;
        const s12 = Number(extracted.standar_1_2) || prev.standar_1_2;
        const s13 = Number(extracted.standar_1_3) || prev.standar_1_3;
        const s14 = Number(extracted.standar_1_4) || prev.standar_1_4;
        const s21 = Number(extracted.standar_2_1) || prev.standar_2_1;
        const s22 = Number(extracted.standar_2_2) || prev.standar_2_2;

        const b11 = Number(extracted.bobot_1_1) || prev.bobot_1_1;
        const b12 = Number(extracted.bobot_1_2) || prev.bobot_1_2;
        const b13 = Number(extracted.bobot_1_3) || prev.bobot_1_3;
        const b14 = Number(extracted.bobot_1_4) || prev.bobot_1_4;
        const b21 = Number(extracted.bobot_2_1) || prev.bobot_2_1;
        const b22 = Number(extracted.bobot_2_2) || prev.bobot_2_2;

        const bAspek1 = Number(extracted.bobot_aspek_1) || prev.bobot_aspek_1;
        const bAspek2 = Number(extracted.bobot_aspek_2) || prev.bobot_aspek_2;

        return {
          ...prev,
          nilai_1_1: Math.min(s11, Math.max(0, Number(extracted.nilai_1_1) || 0)),
          nilai_1_2: Math.min(s12, Math.max(0, Number(extracted.nilai_1_2) || 0)),
          nilai_1_3: Math.min(s13, Math.max(0, Number(extracted.nilai_1_3) || 0)),
          nilai_1_4: Math.min(s14, Math.max(0, Number(extracted.nilai_1_4) || 0)),
          nilai_2_1: Math.min(s21, Math.max(0, Number(extracted.nilai_2_1) || 0)),
          nilai_2_2: Math.min(s22, Math.max(0, Number(extracted.nilai_2_2) || 0)),
          standar_1_1: s11,
          standar_1_2: s12,
          standar_1_3: s13,
          standar_1_4: s14,
          standar_2_1: s21,
          standar_2_2: s22,
          bobot_1_1: b11,
          bobot_1_2: b12,
          bobot_1_3: b13,
          bobot_1_4: b14,
          bobot_2_1: b21,
          bobot_2_2: b22,
          bobot_aspek_1: bAspek1,
          bobot_aspek_2: bAspek2
        };
      });
      setAiSuccess(true);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menganalisis teks dengan AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // Save Form
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDivisi) return;

    // Validate weights total
    const totalBobotAspek = Number(formData.bobot_aspek_1) + Number(formData.bobot_aspek_2);
    if (totalBobotAspek !== 100) {
      setFormError(`Jumlah bobot aspek harus 100% (saat ini ${totalBobotAspek}%).`);
      setFormSaving(false);
      return;
    }

    const totalBobotSub1 = Number(formData.bobot_1_1) + Number(formData.bobot_1_2) + Number(formData.bobot_1_3) + Number(formData.bobot_1_4);
    if (totalBobotSub1 !== 100) {
      setFormError(`Jumlah bobot sub-aspek Aspek 1 harus 100% (saat ini ${totalBobotSub1}%).`);
      setFormSaving(false);
      return;
    }

    const totalBobotSub2 = Number(formData.bobot_2_1) + Number(formData.bobot_2_2);
    if (totalBobotSub2 !== 100) {
      setFormError(`Jumlah bobot sub-aspek Aspek 2 harus 100% (saat ini ${totalBobotSub2}%).`);
      setFormSaving(false);
      return;
    }
    
    setFormSaving(true);
    setFormError(null);

    try {
      const existingRecord = allEvaluations.find(ev => ev.tahun === formTahun);
      const recordId = existingRecord ? existingRecord.id : undefined;

      const payload: PenilaianArsip = {
        id: recordId,
        divisiId: selectedDivisi,
        tahun: formTahun,
        nilai_1_1: Number(formData.nilai_1_1),
        nilai_1_2: Number(formData.nilai_1_2),
        nilai_1_3: Number(formData.nilai_1_3),
        nilai_1_4: Number(formData.nilai_1_4),
        nilai_2_1: Number(formData.nilai_2_1),
        nilai_2_2: Number(formData.nilai_2_2),
        
        standar_1_1: Number(formData.standar_1_1),
        standar_1_2: Number(formData.standar_1_2),
        standar_1_3: Number(formData.standar_1_3),
        standar_1_4: Number(formData.standar_1_4),
        standar_2_1: Number(formData.standar_2_1),
        standar_2_2: Number(formData.standar_2_2),

        bobot_1_1: Number(formData.bobot_1_1),
        bobot_1_2: Number(formData.bobot_1_2),
        bobot_1_3: Number(formData.bobot_1_3),
        bobot_1_4: Number(formData.bobot_1_4),
        bobot_2_1: Number(formData.bobot_2_1),
        bobot_2_2: Number(formData.bobot_2_2),

        bobot_aspek_1: Number(formData.bobot_aspek_1),
        bobot_aspek_2: Number(formData.bobot_aspek_2),
        
        lakiLink: lakiLink.trim() || undefined,
        createdBy: currentUser?.id
      };

      await archiveEvaluationService.saveEvaluation(payload);
      setIsModalOpen(false);
      
      // Refresh all years
      fetchData();
      setSelectedTahun(formTahun);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan penilaian.');
    } finally {
      setFormSaving(false);
    }
  };

  // Delete Evaluation
  const handleDelete = async () => {
    if (!evaluation || !evaluation.id) return;
    if (!confirm('Apakah Anda yakin ingin menghapus data penilaian ini?')) return;

    try {
      await archiveEvaluationService.deleteEvaluation(evaluation.id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete evaluation:', err);
      alert('Gagal menghapus penilaian.');
    }
  };

  // Helper to calculate full scores for a single record
  const getCalculatedScoresForRecord = (item: PenilaianArsip) => {
    const n11 = item.nilai_1_1 || 0;
    const n12 = item.nilai_1_2 || 0;
    const n13 = item.nilai_1_3 || 0;
    const n14 = item.nilai_1_4 || 0;
    const n21 = item.nilai_2_1 || 0;
    const n22 = item.nilai_2_2 || 0;

    const s11 = item.standar_1_1 || 700;
    const s12 = item.standar_1_2 || 200;
    const s13 = item.standar_1_3 || 1100;
    const s14 = item.standar_1_4 || 200;
    const s21 = item.standar_2_1 || 300;
    const s22 = item.standar_2_2 || 100;

    const b11 = (item.bobot_1_1 ?? 25) / 100;
    const b12 = (item.bobot_1_2 ?? 25) / 100;
    const b13 = (item.bobot_1_3 ?? 25) / 100;
    const b14 = (item.bobot_1_4 ?? 25) / 100;
    
    const b21 = (item.bobot_2_1 ?? 50) / 100;
    const b22 = (item.bobot_2_2 ?? 50) / 100;

    const bAspek1 = (item.bobot_aspek_1 ?? 50) / 100;
    const bAspek2 = (item.bobot_aspek_2 ?? 50) / 100;

    const n11_persen = s11 > 0 ? (n11 / s11) * 100 : 0;
    const n12_persen = s12 > 0 ? (n12 / s12) * 100 : 0;
    const n13_persen = s13 > 0 ? (n13 / s13) * 100 : 0;
    const n14_persen = s14 > 0 ? (n14 / s14) * 100 : 0;
    const n21_persen = s21 > 0 ? (n21 / s21) * 100 : 0;
    const n22_persen = s22 > 0 ? (n22 / s22) * 100 : 0;

    const n11_akhir = n11_persen * b11;
    const n12_akhir = n12_persen * b12;
    const n13_akhir = n13_persen * b13;
    const n14_akhir = n14_persen * b14;
    const n21_akhir = n21_persen * b21;
    const n22_akhir = n22_persen * b22;

    const nilai_aspek_1 = n11_akhir + n12_akhir + n13_akhir + n14_akhir;
    const nilai_aspek_2 = n21_akhir + n22_akhir;

    const nilai_akhir_aspek_1 = nilai_aspek_1 * bAspek1;
    const nilai_akhir_aspek_2 = nilai_aspek_2 * bAspek2;
    const total_nilai_akhir = nilai_akhir_aspek_1 + nilai_akhir_aspek_2;

    return {
      n11_persen: Number(n11_persen.toFixed(2)),
      n11_akhir: Number(n11_akhir.toFixed(2)),
      n12_persen: Number(n12_persen.toFixed(2)),
      n12_akhir: Number(n12_akhir.toFixed(2)),
      n13_persen: Number(n13_persen.toFixed(2)),
      n13_akhir: Number(n13_akhir.toFixed(2)),
      n14_persen: Number(n14_persen.toFixed(2)),
      n14_akhir: Number(n14_akhir.toFixed(2)),
      n21_persen: Number(n21_persen.toFixed(2)),
      n21_akhir: Number(n21_akhir.toFixed(2)),
      n22_persen: Number(n22_persen.toFixed(2)),
      n22_akhir: Number(n22_akhir.toFixed(2)),
      
      nilai_aspek_1: Number(nilai_aspek_1.toFixed(2)),
      nilai_akhir_aspek_1: Number(nilai_akhir_aspek_1.toFixed(2)),
      nilai_aspek_2: Number(nilai_aspek_2.toFixed(2)),
      nilai_akhir_aspek_2: Number(nilai_akhir_aspek_2.toFixed(2)),
      
      total_nilai_akhir: Number(total_nilai_akhir.toFixed(2)),
      total_standar_1: s11 + s12 + s13 + s14,
      total_skor_1: n11 + n12 + n13 + n14,
      total_standar_2: s21 + s22,
      total_skor_2: n21 + n22
    };
  };

  // Map all historical evaluations with calculated scores, sorted from newest to oldest, limited to 5 years
  const historicalScores = allEvaluations.map(item => {
    const calc = getCalculatedScoresForRecord(item);
    return {
      ...item,
      totalScore: calc.total_nilai_akhir,
      aspek1Score: calc.nilai_akhir_aspek_1,
      aspek2Score: calc.nilai_akhir_aspek_2,
      catInfo: getCategoryInfo(calc.total_nilai_akhir)
    };
  }).sort((a, b) => b.tahun - a.tahun).slice(0, 5);

  // Chronologically sorted data for trend charts (ascending order)
  const chartHistoricalScores = [...historicalScores].sort((a, b) => a.tahun - b.tahun);

  // Derive scores for currently selected year
  const currentScores = evaluation ? getCalculatedScoresForRecord(evaluation) : null;
  const currentCatInfo = currentScores ? getCategoryInfo(currentScores.total_nilai_akhir) : null;

  // Calculate YoY Growth compared to previous year
  const getYoYGrowth = () => {
    if (!currentScores) return null;
    const prevRecord = historicalScores.find(ev => ev.tahun === selectedTahun - 1);
    if (!prevRecord) return null;
    return Number((currentScores.total_nilai_akhir - prevRecord.totalScore).toFixed(2));
  };
  const yoyGrowth = getYoYGrowth();

  // Selected year sub-aspect scores for Bar Chart
  const s11 = evaluation?.standar_1_1 || 700;
  const s12 = evaluation?.standar_1_2 || 200;
  const s13 = evaluation?.standar_1_3 || 1100;
  const s14 = evaluation?.standar_1_4 || 200;
  const s21 = evaluation?.standar_2_1 || 300;
  const s22 = evaluation?.standar_2_2 || 100;

  // Horizontal bar chart data
  const subAspectChartData = [
    { name: 'Penciptaan (1.1)', Capaian: evaluation ? Number(((evaluation.nilai_1_1 / s11) * 100).toFixed(1)) : 0, Skor: evaluation?.nilai_1_1 || 0, Maks: s11 },
    { name: 'Penggunaan (1.2)', Capaian: evaluation ? Number(((evaluation.nilai_1_2 / s12) * 100).toFixed(1)) : 0, Skor: evaluation?.nilai_1_2 || 0, Maks: s12 },
    { name: 'Pemeliharaan (1.3)', Capaian: evaluation ? Number(((evaluation.nilai_1_3 / s13) * 100).toFixed(1)) : 0, Skor: evaluation?.nilai_1_3 || 0, Maks: s13 },
    { name: 'Penyusutan (1.4)', Capaian: evaluation ? Number(((evaluation.nilai_1_4 / s14) * 100).toFixed(1)) : 0, Skor: evaluation?.nilai_1_4 || 0, Maks: s14 },
    { name: 'SDM (2.1)', Capaian: evaluation ? Number(((evaluation.nilai_2_1 / s21) * 100).toFixed(1)) : 0, Skor: evaluation?.nilai_2_1 || 0, Maks: s21 },
    { name: 'Prasarana (2.2)', Capaian: evaluation ? Number(((evaluation.nilai_2_2 / s22) * 100).toFixed(1)) : 0, Skor: evaluation?.nilai_2_2 || 0, Maks: s22 },
  ].reverse(); // Reverse for clean top-down rendering in horizontal chart

  // Donut chart data for Aspects contribution
  const aspectDonutData = currentScores ? [
    { name: 'Pengelolaan Arsip Dinamis', value: currentScores.nilai_akhir_aspek_1, color: '#6366f1' },
    { name: 'Sumber Daya Kearsipan', value: currentScores.nilai_akhir_aspek_2, color: '#0d9488' }
  ] : [];

  const canEdit = currentUser && (
    currentUser.role === 'Super Admin' || 
    currentUser.role === 'Atasan' || 
    isUserEditor
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      
      {/* Header Area (Compact & Proportional) */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 relative z-30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-600 font-semibold text-xs sm:text-sm uppercase tracking-wider mb-1">
              <ClipboardCheck size={16} className="flex-shrink-0" />
              <span>Penilaian Kearsipan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">
              Dashboard Analisis Kearsipan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Visualisasi perkembangan nilai kearsipan, perbandingan aspek, dan audit laporan tahunan
            </p>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Division Filter */}
            <DivisionFilter />

            {/* Year Filter */}
            <div ref={yearDropdownRef} className="relative">
              <button
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm animate-in"
              >
                <Calendar size={14} className="text-slate-400" />
                <span>Detail: {selectedTahun}</span>
                <ChevronDown size={14} className={`transition-transform ${isYearDropdownOpen ? 'rotate-185' : ''}`} />
              </button>
              
              {isYearDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-200 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Pilih Tahun</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {years.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setSelectedTahun(yr);
                          setIsYearDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between ${
                          yr === selectedTahun
                            ? 'bg-indigo-50 text-indigo-600 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>Tahun {yr}</span>
                        {yr === selectedTahun && <Check size={12} className="text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Edit/Add Button */}
            {canEdit && (
              <button
                onClick={handleOpenModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <Plus size={14} />
                <span>{evaluation ? 'Update Nilai' : 'Input Nilai'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation (Only for Super Admin & Atasan) */}
      {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Atasan') && (
        <div className="bg-white border-b border-slate-200 px-6 flex gap-6 z-10">
          <button
            onClick={() => setActiveTab('Dashboard')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'Dashboard'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-750'
            }`}
          >
            Dashboard Analisis
          </button>
          <button
            onClick={() => setActiveTab('Editor')}
            className={`py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'Editor'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-750'
            }`}
          >
            Kelola Editor
          </button>
        </div>
      )}

      {/* Scrollable Content */}
      {activeTab === 'Editor' ? (
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <ArchiveEditorManager />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="animate-spin text-indigo-600" size={36} />
              <span className="text-sm font-medium">Memuat data analisis...</span>
            </div>
          ) : allEvaluations.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm mt-8 space-y-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <ClipboardCheck size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-xl text-slate-800">Belum Ada Data Penilaian</h3>
              <p className="text-base text-slate-500 max-w-md mx-auto">
                Sistem belum memiliki data penilaian kearsipan apa pun untuk satker <strong>{selectedDivisi}</strong>.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all active:scale-95"
              >
                <Plus size={18} />
                <span>Input Nilai Pertama</span>
              </button>
            )}
          </div>
        ) : (
          /* Rich Light-Themed Dashboard */
          <>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Card 1: Score of Selected Year */}
              <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm flex items-center gap-5 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600"></div>
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Award size={30} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nilai Hasil Pengawasan ({selectedTahun})</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-3xl sm:text-4xl font-bold text-indigo-600 leading-none">{currentScores ? currentScores.total_nilai_akhir : '-'}</span>
                    <span className="text-sm text-slate-400 font-bold">/ 100</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Predicate */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-5 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <ClipboardCheck size={30} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Predikat & Kategori</p>
                  {currentCatInfo ? (
                    <div className="space-y-0.5 mt-1">
                      <span className="text-xl sm:text-2xl font-bold text-slate-800 leading-none">{currentCatInfo.category}</span>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">{currentCatInfo.label}</p>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-slate-400">Tidak ada data</span>
                  )}
                </div>
              </div>

              {/* Card 3: YoY Comparison */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-5">
                {yoyGrowth !== null ? (
                  <>
                    <div className={`p-3.5 rounded-2xl ${yoyGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {yoyGrowth >= 0 ? <ArrowUpRight size={30} /> : <ArrowDownRight size={30} />}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Kemajuan dibanding {selectedTahun - 1}</p>
                      <span className={`text-xl sm:text-2xl font-bold ${yoyGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {yoyGrowth >= 0 ? `+${yoyGrowth}` : yoyGrowth}%
                      </span>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Tren Pertumbuhan YoY</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3.5 bg-slate-50 text-slate-400 rounded-2xl">
                      <Minus size={30} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Kemajuan dibanding {selectedTahun - 1}</p>
                      <span className="text-sm font-bold text-slate-400">Tidak ada data acuan</span>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Tahun sebelumnya belum diinput</p>
                    </div>
                  </>
                )}
              </div>

              {/* Card 4: LAKI Document Link */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl flex-shrink-0">
                    <FileText size={30} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Link Dokumen LAKI</p>
                    <p className="text-sm font-bold text-slate-800 truncate mt-1">
                      {evaluation?.lakiLink ? evaluation.lakiLink : 'Belum dilampirkan'}
                    </p>
                  </div>
                </div>
                {evaluation?.lakiLink ? (
                  <a
                    href={evaluation.lakiLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors flex-shrink-0"
                  >
                    <span>Buka</span>
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 font-bold italic flex-shrink-0">Tidak ada</span>
                )}
              </div>
            </div>

            {/* Rich Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Chart 1: Overall Trend */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp size={18} className="text-indigo-600" />
                  <h4 className="font-bold text-slate-800 text-base">Tren Nilai Kearsipan Tahunan</h4>
                </div>
                <div className="flex-1 min-h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartHistoricalScores}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorTotalScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="tahun" tick={{ fontSize: 11, fontWeight: '600', fill: '#475569' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} />
                      <ChartTooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px' }}
                        labelFormatter={(label) => `Tahun ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalScore" 
                        stroke="#6366f1" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorTotalScore)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Aspek 1 vs Aspek 2 YoY */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart4 size={18} className="text-teal-600" />
                  <h4 className="font-bold text-slate-800 text-base">Perbandingan Capaian Aspek YoY</h4>
                </div>
                <div className="flex-1 min-h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartHistoricalScores}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="tahun" tick={{ fontSize: 11, fontWeight: '600', fill: '#475569' }} />
                      <YAxis domain={[0, 50]} tick={{ fontSize: 11, fill: '#475569' }} />
                      <ChartTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', fontWeight: '600' }} />
                      <Bar name="1. Pengelolaan Arsip Dinamis" dataKey="aspek1Score" fill="#6366f1" radius={[3, 3, 0, 0]} />
                      <Bar name="2. Sumber Daya Kearsipan" dataKey="aspek2Score" fill="#0d9488" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Sub-aspect Effectiveness */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart4 size={18} className="text-violet-600" />
                  <h4 className="font-bold text-slate-800 text-base">Tingkat Efektivitas Sub-aspek Tahun {selectedTahun} (%)</h4>
                </div>
                <div className="flex-1 min-h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={subAspectChartData}
                      margin={{ top: 5, right: 10, left: 15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155', fontWeight: '600' }} width={120} />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-800 text-white p-3 rounded-xl text-xs sm:text-sm space-y-1">
                                <p className="font-bold">{data.name}</p>
                                <p>Efektivitas: <span className="text-yellow-400 font-bold">{data.Capaian}%</span></p>
                                <p>Nilai: {data.Skor} / {data.Maks}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="Capaian" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16}>
                        {subAspectChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8b5cf6' : '#a78bfa'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Aspects Contribution */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <PieIcon size={18} className="text-amber-500" />
                  <h4 className="font-bold text-slate-800 text-base">Kontribusi Aspek Terhadap Nilai Akhir ({selectedTahun})</h4>
                </div>
                <div className="flex-1 min-h-[240px] flex items-center justify-center relative">
                  {evaluation ? (
                    <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-5">
                      <div className="w-44 h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={aspectDonutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={65}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {aspectDonutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <ChartTooltip 
                              formatter={(value: any) => [`${value} Poin`, 'Kontribusi']}
                              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Custom Legend */}
                      <div className="flex flex-col gap-2.5 text-xs text-slate-650 font-bold">
                        {aspectDonutData.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: item.color }}></span>
                            <span>{item.name}: <strong className="text-slate-800 text-sm font-bold">{item.value}</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Belum ada data</span>
                  )}
                </div>
              </div>
            </div>

            {/* Table & History Row */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Detailed Spreadsheet Table */}
              <div className="xl:col-span-9 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={20} className="text-indigo-600" />
                    <h4 className="font-bold text-slate-800 text-base">Formulir Hasil Pengawasan Kearsipan - Tahun {selectedTahun}</h4>
                  </div>
                </div>

                {evaluation && currentScores ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-50 text-slate-800 uppercase font-bold text-center text-xs sm:text-sm">
                          <th className="py-3 px-3 border border-slate-200 w-16 text-center">NO</th>
                          <th className="py-3 px-4 border border-slate-200 text-left">ASPEK / SUB ASPEK</th>
                          <th className="py-3 px-4 border border-slate-200 text-right">Nilai Standar</th>
                          <th className="py-3 px-4 border border-slate-200 text-right">Jumlah Skor</th>
                          <th className="py-3 px-4 border border-slate-200 text-right">Nilai (%)</th>
                          <th className="py-3 px-4 border border-slate-200 text-right">Bobot</th>
                          <th className="py-3 px-4 border border-slate-200 text-right">Nilai Akhir</th>
                          <th className="py-3 px-4 border border-slate-200 text-center">Kategori</th>
                        </tr>
                        <tr className="bg-slate-50/50 text-xs text-slate-400 text-center italic">
                          <td className="py-1.5 border border-slate-200">(1)</td>
                          <td className="py-1.5 border border-slate-200 text-left pl-4">(2)</td>
                          <td className="py-1.5 border border-slate-200 text-right pr-4">(3)</td>
                          <td className="py-1.5 border border-slate-200 text-right pr-4">(4)</td>
                          <td className="py-1.5 border border-slate-200 text-right pr-4">(5) = (4)/(3) x 100</td>
                          <td className="py-1.5 border border-slate-200 text-right pr-4">(6)</td>
                          <td className="py-1.5 border border-slate-200 text-right pr-4">(7) = (5) x (6)</td>
                          <td className="py-1.5 border border-slate-200">(8)</td>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700 font-medium text-sm">
                        {/* ASPEK 1 */}
                        <tr className="bg-indigo-50/40 font-bold text-slate-900">
                          <td className="py-3 px-3 border border-slate-200 text-center">1</td>
                          <td className="py-3 px-4 border border-slate-200 uppercase">PENGELOLAAN ARSIP DINAMIS</td>
                          <td className="py-3 px-4 border border-slate-200 text-right">{currentScores.total_standar_1}</td>
                          <td className="py-3 px-4 border border-slate-200 text-right">{currentScores.total_skor_1}</td>
                          <td className="py-3 px-4 border border-slate-200 text-right">{currentScores.nilai_aspek_1}</td>
                          <td className="py-3 px-4 border border-slate-200 text-right">{evaluation.bobot_aspek_1}%</td>
                          <td className="py-3 px-4 border border-slate-200 text-right text-indigo-600">{currentScores.nilai_akhir_aspek_1}</td>
                          <td className="py-3 px-4 border border-slate-200 text-center text-slate-400">-</td>
                        </tr>
                        {/* Sub-aspek 1.1 */}
                        <tr>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400 font-normal">1.1</td>
                          <td className="py-2.5 px-4 border border-slate-200 pl-8 text-slate-600">Penciptaan Arsip</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{s11}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-semibold text-slate-800">{evaluation.nilai_1_1}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-600">{currentScores.n11_persen}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{evaluation.bobot_1_1}%</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-bold text-slate-800">{currentScores.n11_akhir}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400">-</td>
                        </tr>
                        {/* Sub-aspek 1.2 */}
                        <tr>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400 font-normal">1.2</td>
                          <td className="py-2.5 px-4 border border-slate-200 pl-8 text-slate-600">Penggunaan Arsip</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{s12}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-semibold text-slate-800">{evaluation.nilai_1_2}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-600">{currentScores.n12_persen}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{evaluation.bobot_1_2}%</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-bold text-slate-800">{currentScores.n12_akhir}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400">-</td>
                        </tr>
                        {/* Sub-aspek 1.3 */}
                        <tr>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400 font-normal">1.3</td>
                          <td className="py-2.5 px-4 border border-slate-200 pl-8 text-slate-600">Pemeliharaan Arsip</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{s13}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-semibold text-slate-800">{evaluation.nilai_1_3}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-600">{currentScores.n13_persen}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{evaluation.bobot_1_3}%</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-bold text-slate-800">{currentScores.n13_akhir}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400">-</td>
                        </tr>
                        {/* Sub-aspek 1.4 */}
                        <tr>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400 font-normal">1.4</td>
                          <td className="py-2.5 px-4 border border-slate-200 pl-8 text-slate-600">Penyusutan Arsip</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{s14}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-semibold text-slate-800">{evaluation.nilai_1_4}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-600">{currentScores.n14_persen}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{evaluation.bobot_1_4}%</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-bold text-slate-800">{currentScores.n14_akhir}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400">-</td>
                        </tr>

                        {/* ASPEK 2 */}
                        <tr className="bg-teal-50/50 font-bold text-slate-900">
                          <td className="py-3 px-3 border border-slate-200 text-center">2</td>
                          <td className="py-3 px-4 border border-slate-200 uppercase">SUMBER DAYA KEARSIPAN</td>
                          <td className="py-3 px-4 border border-slate-200 text-right">{currentScores.total_standar_2}</td>
                          <td className="py-3 px-4 border border-slate-200 text-right">{currentScores.total_skor_2}</td>
                          <td className="py-3 px-4 border border-slate-200 text-right">{currentScores.nilai_aspek_2}</td>
                          <td className="py-3 px-4 border border-slate-200 text-right">{evaluation.bobot_aspek_2}%</td>
                          <td className="py-3 px-4 border border-slate-200 text-right text-teal-600">{currentScores.nilai_akhir_aspek_2}</td>
                          <td className="py-3 px-4 border border-slate-200 text-center text-slate-400">-</td>
                        </tr>
                        {/* Sub-aspek 2.1 */}
                        <tr>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400 font-normal">2.1</td>
                          <td className="py-2.5 px-4 border border-slate-200 pl-8 text-slate-600">SDM Kearsipan</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{s21}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-semibold text-slate-800">{evaluation.nilai_2_1}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-600">{currentScores.n21_persen}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{evaluation.bobot_2_1}%</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-bold text-slate-800">{currentScores.n21_akhir}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400">-</td>
                        </tr>
                        {/* Sub-aspek 2.2 */}
                        <tr>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400 font-normal">2.2</td>
                          <td className="py-2.5 px-4 border border-slate-200 pl-8 text-slate-600">Prasarana dan Sarana Kearsipan</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{s22}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-semibold text-slate-800">{evaluation.nilai_2_2}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-600">{currentScores.n22_persen}</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right text-slate-500">{evaluation.bobot_2_2}%</td>
                          <td className="py-2.5 px-4 border border-slate-200 text-right font-bold text-slate-800">{currentScores.n22_akhir}</td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center text-slate-400">-</td>
                        </tr>

                        {/* TOTAL ROW */}
                        <tr className="bg-indigo-600 text-white font-bold text-base">
                          <td className="py-3.5 px-3 border border-indigo-600 text-center" colSpan={2}>TOTAL</td>
                          <td className="py-3.5 px-4 border border-indigo-600 text-right text-indigo-200">-</td>
                          <td className="py-3.5 px-4 border border-indigo-600 text-right text-indigo-200">-</td>
                          <td className="py-3.5 px-4 border border-indigo-600 text-right text-indigo-200">-</td>
                          <td className="py-3.5 px-4 border border-indigo-600 text-right text-indigo-200">-</td>
                          <td className="py-3.5 px-4 border border-indigo-600 text-right text-white text-base font-bold">{currentScores.total_nilai_akhir}</td>
                          <td className="py-3.5 px-4 border border-indigo-600 text-center bg-indigo-750 text-sm font-bold">
                            {currentCatInfo?.category} ({currentCatInfo?.label})
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-400 text-base font-semibold">
                    Belum ada data detail kearsipan untuk tahun {selectedTahun}.
                  </div>
                )}
              </div>

              {/* Historical List Card (Compact & Proportional) */}
              <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <History size={18} className="text-slate-600" />
                  <h4 className="font-semibold text-slate-850 text-sm">Riwayat Nilai Tahunan</h4>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] px-1 py-1">
                  {historicalScores.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-8">Belum ada riwayat</p>
                  ) : (
                    historicalScores.map((hScore) => (
                      <div
                        key={hScore.id}
                        onClick={() => setSelectedTahun(hScore.tahun)}
                        className={`w-full py-4 px-5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          hScore.tahun === selectedTahun
                            ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 shadow-sm scale-[1.01]'
                            : 'bg-white hover:border-indigo-300 text-slate-700 border-slate-200 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tahun {hScore.tahun}</span>
                          <span className={`text-xl font-bold ${hScore.tahun === selectedTahun ? 'text-indigo-600' : 'text-slate-855'}`}>
                            {hScore.totalScore}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${
                          hScore.tahun === selectedTahun 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : `${hScore.catInfo.color} border-slate-200`
                        }`}>
                          {hScore.catInfo.category}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      )}

      {/* Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Input Nilai Audit Kearsipan</h3>
                <p className="text-xs text-slate-500 font-bold">{selectedDivisi}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* AI Helper Panel */}
              <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <BrainCircuit size={20} className="text-indigo-600" />
                    <span className="font-bold text-sm">AI Input Helper</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Tempel teks mentah berisi hasil audit, ringkasan, atau rincian nilai kearsipan. AI akan mengekstrak nilai-nilai subaspek secara otomatis.
                  </p>
                  <textarea
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    placeholder="Contoh: Hasil audit kearsipan internal menunjukkan penciptaan mendapatkan nilai 650 dari 700. Sementara penggunaan penuh 200, pemeliharaan 1000, penyusutan 120. SDM dinilai 150, dan sarana prasarana kearsipan bernilai 90..."
                    className="w-full h-48 px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none bg-white font-sans"
                  />
                </div>
                <div className="space-y-2.5">
                  {aiSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                      <ClipboardCheck size={16} className="text-emerald-600 flex-shrink-0" />
                      <span>Nilai berhasil diekstrak dan dimasukkan ke form!</span>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={aiLoading || !aiText.trim()}
                    onClick={handleAiExtract}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Menganalisis Teks...</span>
                      </>
                    ) : (
                      <>
                        <BrainCircuit size={16} />
                        <span>Analisis & Ekstrak dengan AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Form Input Panel */}
              <form onSubmit={handleSave} className="lg:col-span-8 space-y-6 flex flex-col justify-between">
                <div className="space-y-5">
                  {formError && (
                    <div className="p-3.5 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Year Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tahun Penilaian</label>
                    <select
                      value={formTahun}
                      onChange={(e) => setFormTahun(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {years.map((yr) => (
                        <option key={yr} value={yr}>
                          Tahun {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Aspek 1 Fields */}
                  <div className="space-y-4 bg-slate-50/50 p-5 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                      <h4 className="font-bold text-slate-800 text-sm">1. PENGELOLAAN ARSIP DINAMIS</h4>
                      <div className="flex items-center gap-2.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Bobot Aspek (%)</label>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          max={100}
                          required
                          value={formData.bobot_aspek_1}
                          onChange={(e) => setFormData({ ...formData, bobot_aspek_1: Number(e.target.value) })}
                          className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* Sub 1.1 */}
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-6">
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">1.1 Penciptaan (Perolehan)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={formData.standar_1_1}
                            required
                            value={formData.nilai_1_1}
                            onChange={(e) => setFormData({ ...formData, nilai_1_1: Number(e.target.value) })}
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Standar</label>
                          <input
                            type="number"
                            step="any"
                            min={1}
                            required
                            value={formData.standar_1_1}
                            onChange={(e) => setFormData({ ...formData, standar_1_1: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100/50 text-slate-700 text-center"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Bobot (%)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={100}
                            required
                            value={formData.bobot_1_1}
                            onChange={(e) => setFormData({ ...formData, bobot_1_1: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Sub 1.2 */}
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-6">
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">1.2 Penggunaan (Perolehan)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={formData.standar_1_2}
                            required
                            value={formData.nilai_1_2}
                            onChange={(e) => setFormData({ ...formData, nilai_1_2: Number(e.target.value) })}
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Standar</label>
                          <input
                            type="number"
                            step="any"
                            min={1}
                            required
                            value={formData.standar_1_2}
                            onChange={(e) => setFormData({ ...formData, standar_1_2: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100/50 text-slate-700 text-center"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Bobot (%)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={100}
                            required
                            value={formData.bobot_1_2}
                            onChange={(e) => setFormData({ ...formData, bobot_1_2: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Sub 1.3 */}
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-6">
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">1.3 Pemeliharaan (Perolehan)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={formData.standar_1_3}
                            required
                            value={formData.nilai_1_3}
                            onChange={(e) => setFormData({ ...formData, nilai_1_3: Number(e.target.value) })}
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Standar</label>
                          <input
                            type="number"
                            step="any"
                            min={1}
                            required
                            value={formData.standar_1_3}
                            onChange={(e) => setFormData({ ...formData, standar_1_3: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100/50 text-slate-700 text-center"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Bobot (%)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={100}
                            required
                            value={formData.bobot_1_3}
                            onChange={(e) => setFormData({ ...formData, bobot_1_3: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Sub 1.4 */}
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-6">
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">1.4 Penyusutan (Perolehan)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={formData.standar_1_4}
                            required
                            value={formData.nilai_1_4}
                            onChange={(e) => setFormData({ ...formData, nilai_1_4: Number(e.target.value) })}
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Standar</label>
                          <input
                            type="number"
                            step="any"
                            min={1}
                            required
                            value={formData.standar_1_4}
                            onChange={(e) => setFormData({ ...formData, standar_1_4: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100/50 text-slate-700 text-center"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Bobot (%)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={100}
                            required
                            value={formData.bobot_1_4}
                            onChange={(e) => setFormData({ ...formData, bobot_1_4: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aspek 2 Fields */}
                  <div className="space-y-3 bg-slate-50/50 p-5 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                      <h4 className="font-bold text-slate-800 text-sm">2. SUMBER DAYA KEARSIPAN</h4>
                      <div className="flex items-center gap-2.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Bobot Aspek (%)</label>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          max={100}
                          required
                          value={formData.bobot_aspek_2}
                          onChange={(e) => setFormData({ ...formData, bobot_aspek_2: Number(e.target.value) })}
                          className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* Sub 2.1 */}
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-6">
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">2.1 SDM Kearsipan (Perolehan)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={formData.standar_2_1}
                            required
                            value={formData.nilai_2_1}
                            onChange={(e) => setFormData({ ...formData, nilai_2_1: Number(e.target.value) })}
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Standar</label>
                          <input
                            type="number"
                            step="any"
                            min={1}
                            required
                            value={formData.standar_2_1}
                            onChange={(e) => setFormData({ ...formData, standar_2_1: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100/50 text-slate-700 text-center"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Bobot (%)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={100}
                            required
                            value={formData.bobot_2_1}
                            onChange={(e) => setFormData({ ...formData, bobot_2_1: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Sub 2.2 */}
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-6">
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">2.2 Prasarana & Sarana (Perolehan)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={formData.standar_2_2}
                            required
                            value={formData.nilai_2_2}
                            onChange={(e) => setFormData({ ...formData, nilai_2_2: Number(e.target.value) })}
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Standar</label>
                          <input
                            type="number"
                            step="any"
                            min={1}
                            required
                            value={formData.standar_2_2}
                            onChange={(e) => setFormData({ ...formData, standar_2_2: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100/50 text-slate-700 text-center"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 text-center">Bobot (%)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={100}
                            required
                            value={formData.bobot_2_2}
                            onChange={(e) => setFormData({ ...formData, bobot_2_2: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LAKI Link Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Link Dokumen LAKI (e.g. Google Drive, OneDrive)</label>
                    <input
                      type="url"
                      value={lakiLink}
                      onChange={(e) => setLakiLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end gap-3.5 border-t border-slate-100 pt-4.5 mt-4.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-650 text-sm font-semibold rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    {formSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCheck size={16} />
                        <span>Simpan Penilaian</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PenilaianArsipPage;
