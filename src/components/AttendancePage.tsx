// src/components/AttendancePage.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { 
  Camera, CheckCircle, AlertTriangle, Trash2, Users, Settings, 
  Download, Search, FileText, MapPin, RotateCcw, ShieldAlert, 
  Sparkles, Smile, Eye, RefreshCw, Lock, Plus, Map, LayoutDashboard, 
  ClipboardList, UserCheck, AlertCircle, X, ShieldCheck, LogOut,
  ArrowLeft, ChevronRight, Clock, User as UserIcon
} from 'lucide-react';
import { attendanceService } from '../services/AttendanceService';
import { User, EmployeeFace, Attendance, Geofence, AttendanceEditor } from '../../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SearchableSelect from './SearchableSelect';
import ConfirmModal from './ConfirmModal';
import SimpleToast from './SimpleToast';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';

// EAR Blink Threshold helper (Eye Aspect Ratio)
function getEAR(eyeLandmarks: faceapi.Point[]): number {
  // eyeLandmarks: 6 points of one eye
  // EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
  const p1 = eyeLandmarks[0];
  const p2 = eyeLandmarks[1];
  const p3 = eyeLandmarks[2];
  const p4 = eyeLandmarks[3];
  const p5 = eyeLandmarks[4];
  const p6 = eyeLandmarks[5];

  const distY1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
  const distY2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
  const distX = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));

  if (distX === 0) return 0;
  return (distY1 + distY2) / (2.0 * distX);
}

// Haversine formula to compute distance in meters between coords
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

interface AttendancePageProps {
  isPublic: boolean;
  currentUser?: User;
  showNotification?: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ 
  isPublic, 
  currentUser, 
  showNotification: parentShowNotification 
}) => {
  // --- Global States ---
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isEditor, setIsEditor] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(!isPublic);
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'history' | 'geofence' | 'editors' | 'faces'>('dashboard');

  // Toast notifications state
  const [toastState, setToastState] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
    type: 'success'
  });

  const showNotification = useCallback((title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
    setToastState({
      isOpen: true,
      message,
      type
    });
  }, []);

  // Custom Confirm Modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {}
  });

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, type: 'success' | 'warning' | 'error' | 'info' = 'warning') => {
    setConfirmModalState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm
    });
  }, []);

  // --- Time-based constraints ---
  const isBefore12PM = new Date().getHours() < 12;

  // --- Live Clock State ---
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Public Kiosk States ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchedProfiles, setSearchedProfiles] = useState<User[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null);
  const [registeredFace, setRegisteredFace] = useState<EmployeeFace | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);

  // Webcam & face-api states
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [nearestGeofence, setNearestGeofence] = useState<{ geo: Geofence; dist: number } | null>(null);
  const [isInGeofenceRange, setIsInGeofenceRange] = useState<boolean>(false);
  const [mockLocationMode, setMockLocationMode] = useState<'real' | 'inside' | 'outside'>('real');

  // Active Liveness states
  const [livenessStatus, setLivenessStatus] = useState<'idle' | 'prompting' | 'verifying' | 'success' | 'failed'>('idle');
  const [livenessPrompt, setLivenessPrompt] = useState<string>('');
  const [livenessAction, setLivenessAction] = useState<'blink' | 'smile' | 'none'>('none');
  const [livenessProgress, setLivenessProgress] = useState<number>(0);
  const [verificationFeedback, setVerificationFeedback] = useState<string>('');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  
  // Wizards
  const [isRegisteringFace, setIsRegisteringFace] = useState<boolean>(false);
  const [isMatchingFace, setIsMatchingFace] = useState<boolean>(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<{ type: 'in' | 'out'; time: string } | null>(null);

  // Refs for video & canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<any>(null);

  // Dev mode detector
  const isLocalDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname.startsWith('192.168.') || 
                     window.location.hostname.startsWith('10.') ||
                     window.location.hostname.endsWith('.loca.lt') ||
                     window.location.hostname.endsWith('.ngrok-free.app');

  // --- Admin/Editor States ---
  const [adminStats, setAdminStats] = useState<{
    totalEmployees: number;
    registeredFaces: number;
    unregisteredFaces: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
    checkedOutToday: number;
  }>({
    totalEmployees: 0,
    registeredFaces: 0,
    unregisteredFaces: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    checkedOutToday: 0,
  });

  const [logsList, setLogsList] = useState<Attendance[]>([]);
  const [allProfiles, setAllProfiles] = useState<User[]>([]);
  const [facesList, setFacesList] = useState<EmployeeFace[]>([]);
  const [editorsList, setEditorsList] = useState<AttendanceEditor[]>([]);
  const [geofencesList, setGeofencesList] = useState<Geofence[]>([]);

  // Helper to get local date string YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Admin filter states
  const [adminStartDate, setAdminStartDate] = useState<string>(getLocalDateString());
  const [adminEndDate, setAdminEndDate] = useState<string>(getLocalDateString());
  const [adminSelectedDivisi, setAdminSelectedDivisi] = useState<string>('Semua');
  const [adminSearchUser, setAdminSearchUser] = useState<string>('');
  const [facesSelectedDivisi, setFacesSelectedDivisi] = useState<string>('Semua');
  const [facesFilterStatus, setFacesFilterStatus] = useState<string>('Semua');
  const [historySearchUser, setHistorySearchUser] = useState<string>('');
  const [filterBelumPulang, setFilterBelumPulang] = useState<boolean>(false);

  // Geofence Modal states
  const [editingGeofence, setEditingGeofence] = useState<Partial<Geofence> | null>(null);
  const [showGeofenceModal, setShowGeofenceModal] = useState<boolean>(false);

  // Export Modal states
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportStartDate, setExportStartDate] = useState<string>(getLocalDateString());
  const [exportEndDate, setExportEndDate] = useState<string>(getLocalDateString());
  const [exportDivisi, setExportDivisi] = useState<string>('Semua');
  const [isExportLoading, setIsExportLoading] = useState<boolean>(false);

  // Editors panel search & select
  const [newEditorUser, setNewEditorUser] = useState<string>('');
  const [newEditorDivisi, setNewEditorDivisi] = useState<string>('');

  // --- Chart Data Memoizations ---
  const dailyTrendData = useMemo(() => {
    const dateMap: { [key: string]: { date: string; Masuk: number; Terlambat: number; Pulang: number } } = {};
    
    let current = new Date(adminStartDate);
    const end = new Date(adminEndDate);
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      const dayName = current.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      dateMap[dateStr] = { date: dayName, Masuk: 0, Terlambat: 0, Pulang: 0 };
      current.setDate(current.getDate() + 1);
    }

    logsList.forEach(log => {
      if (!log.checkIn) return;
      const dateStr = log.checkIn.slice(0, 10);
      if (dateMap[dateStr]) {
        dateMap[dateStr].Masuk += 1;
        if (log.status === 'Terlambat') {
          dateMap[dateStr].Terlambat += 1;
        }
        if (log.checkOut) {
          dateMap[dateStr].Pulang += 1;
        }
      }
    });

    return Object.values(dateMap);
  }, [logsList, adminStartDate, adminEndDate]);

  const statusDistributionData = useMemo(() => {
    let tepatWaktu = 0;
    let terlambat = 0;
    logsList.forEach(log => {
      if (log.status === 'Terlambat') {
        terlambat += 1;
      } else {
        tepatWaktu += 1;
      }
    });
    return [
      { name: 'Tepat Waktu', value: tepatWaktu, color: '#10B981' },
      { name: 'Terlambat', value: terlambat, color: '#F59E0B' }
    ].filter(item => item.value > 0);
  }, [logsList]);

  const divisionPresenceData = useMemo(() => {
    const divMap: { [key: string]: { name: string; Hadir: number; Total: number } } = {};
    
    allProfiles.forEach(p => {
      const div = p.divisi || 'Tanpa Divisi';
      if (!divMap[div]) {
        divMap[div] = { name: div, Hadir: 0, Total: 0 };
      }
      divMap[div].Total += 1;
    });

    logsList.forEach(log => {
      const div = log.employeeDivisi || 'Tanpa Divisi';
      if (divMap[div]) {
        divMap[div].Hadir += 1;
      }
    });

    return Object.values(divMap).map(d => ({
      name: d.name,
      'Tingkat Kehadiran (%)': d.Total > 0 ? Math.round((d.Hadir / d.Total) * 100) : 0,
      'Jumlah Hadir': d.Hadir
    })).sort((a, b) => b['Jumlah Hadir'] - a['Jumlah Hadir']);
  }, [allProfiles, logsList]);

  const arrivalTimeData = useMemo(() => {
    let early = 0; // < 07:30
    let standard = 0; // 07:30 - 08:00
    let late = 0; // 08:00 - 08:30
    let veryLate = 0; // > 08:30

    logsList.forEach(log => {
      if (!log.checkIn) return;
      const time = new Date(log.checkIn);
      const hour = time.getHours();
      const min = time.getMinutes();
      const totalMinutes = hour * 60 + min;

      if (totalMinutes < 7 * 60 + 30) {
        early += 1;
      } else if (totalMinutes <= 8 * 60) {
        standard += 1;
      } else if (totalMinutes <= 8 * 60 + 30) {
        late += 1;
      } else {
        veryLate += 1;
      }
    });

    return [
      { name: 'Sebelum 07:30', Jumlah: early, fill: '#10B981' },
      { name: '07:30 - 08:00', Jumlah: standard, fill: '#3B82F6' },
      { name: '08:00 - 08:30', Jumlah: late, fill: '#F59E0B' },
      { name: 'Setelah 08:30', Jumlah: veryLate, fill: '#EF4444' }
    ];
  }, [logsList]);

  const topLateEmployees = useMemo(() => {
    const empMap: { [key: string]: { name: string; divisi: string; lateCount: number; totalCheckIns: number } } = {};
    
    logsList.forEach(log => {
      const id = log.employeeId;
      if (!empMap[id]) {
        empMap[id] = { name: log.employeeName, divisi: log.employeeDivisi || '-', lateCount: 0, totalCheckIns: 0 };
      }
      empMap[id].totalCheckIns += 1;
      if (log.status === 'Terlambat') {
        empMap[id].lateCount += 1;
      }
    });

    return Object.values(empMap)
      .filter(e => e.lateCount > 0)
      .map(e => ({
        name: e.name,
        divisi: e.divisi,
        lateCount: e.lateCount,
        totalCheckIns: e.totalCheckIns,
        latePercentage: Math.round((e.lateCount / e.totalCheckIns) * 100)
      }))
      .sort((a, b) => b.lateCount - a.lateCount || b.latePercentage - a.latePercentage)
      .slice(0, 5); // top 5 late
  }, [logsList]);

  const topPunctualEmployees = useMemo(() => {
    const empMap: { [key: string]: { name: string; divisi: string; checkIns: number[]; totalMinutes: number } } = {};
    
    logsList.forEach(log => {
      if (!log.checkIn) return;
      const time = new Date(log.checkIn);
      const hour = time.getHours();
      const min = time.getMinutes();
      const minutes = hour * 60 + min;

      const id = log.employeeId;
      if (!empMap[id]) {
        empMap[id] = { name: log.employeeName, divisi: log.employeeDivisi || '-', checkIns: [], totalMinutes: 0 };
      }
      empMap[id].checkIns.push(minutes);
      empMap[id].totalMinutes += minutes;
    });

    return Object.values(empMap)
      .map(e => {
        const avgMinutes = Math.round(e.totalMinutes / e.checkIns.length);
        const avgHour = Math.floor(avgMinutes / 60);
        const avgMin = avgMinutes % 60;
        const formattedTime = `${String(avgHour).padStart(2, '0')}:${String(avgMin).padStart(2, '0')}`;
        return {
          name: e.name,
          divisi: e.divisi,
          avgTime: formattedTime,
          count: e.checkIns.length,
          avgMinutes
        };
      })
      .sort((a, b) => a.avgMinutes - b.avgMinutes)
      .slice(0, 5); // top 5 punctual
  }, [logsList]);

  const averageFaceConfidence = useMemo(() => {
    if (logsList.length === 0) return 0;
    const total = logsList.reduce((acc, log) => acc + log.faceConfidence, 0);
    return Math.round((total / logsList.length) * 100);
  }, [logsList]);

  const checkoutComplianceRate = useMemo(() => {
    const totalCheckIns = logsList.length;
    if (totalCheckIns === 0) return 0;
    const totalCheckOuts = logsList.filter(l => l.checkOut).length;
    return Math.round((totalCheckOuts / totalCheckIns) * 100);
  }, [logsList]);

  const generatedLogsReport = useMemo(() => {
    const dates: string[] = [];
    let current = new Date(adminStartDate);
    const end = new Date(adminEndDate);
    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }

    const reportRows: Array<{
      id: string;
      employeeId: string;
      employeeName: string;
      employeeNip: string;
      employeeDivisi: string;
      date: string;
      checkIn?: string;
      checkOut?: string;
      status: 'Hadir' | 'Terlambat' | 'Tidak Hadir' | 'Belum Absen';
      faceConfidence?: number;
      device?: string;
      ipAddress?: string;
    }> = [];

    const filteredEmployees = allProfiles.filter(p => {
      const matchDiv = adminSelectedDivisi === 'Semua' || p.divisi === adminSelectedDivisi;
      const matchName = !historySearchUser || p.name.toLowerCase().includes(historySearchUser.toLowerCase());
      return matchDiv && matchName;
    });

    dates.forEach(dateStr => {
      const dateLogs = logsList.filter(l => {
        const logDate = l.checkIn ? l.checkIn.slice(0, 10) : l.createdAt.slice(0, 10);
        return logDate === dateStr;
      });

      filteredEmployees.forEach(emp => {
        const empLog = dateLogs.find(l => l.employeeId === emp.id);

        if (empLog) {
          if (filterBelumPulang && empLog.checkOut) {
            return;
          }

          reportRows.push({
            id: empLog.id,
            employeeId: emp.id,
            employeeName: emp.name,
            employeeNip: emp.nip || '',
            employeeDivisi: emp.divisi || '',
            date: dateStr,
            checkIn: empLog.checkIn,
            checkOut: empLog.checkOut,
            status: empLog.status as any,
            faceConfidence: empLog.faceConfidence,
            device: empLog.device,
            ipAddress: empLog.ipAddress
          });
        } else {
          if (filterBelumPulang) return;

          reportRows.push({
            id: `absent-${emp.id}-${dateStr}`,
            employeeId: emp.id,
            employeeName: emp.name,
            employeeNip: emp.nip || '',
            employeeDivisi: emp.divisi || '',
            date: dateStr,
            status: 'Tidak Hadir'
          });
        }
      });
    });

    return reportRows.sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [allProfiles, logsList, adminStartDate, adminEndDate, adminSelectedDivisi, historySearchUser, filterBelumPulang]);

  // --- 1. Permissions check on mount (Admin mode) ---
  useEffect(() => {
    const verifyPermissions = async () => {
      if (isPublic || !currentUser) {
        setAuthLoading(false);
        return;
      }
      try {
        setAuthLoading(true);
        const checkIsAdmin = currentUser.role === 'Super Admin';
        setIsAdmin(checkIsAdmin);

        // Check if designated editor for current user's division
        const checkIsEditor = await attendanceService.checkIsAttendanceEditor(currentUser.id, currentUser.divisi || '');
        setIsEditor(checkIsAdmin || checkIsEditor);

        if (checkIsAdmin || checkIsEditor) {
          // If authorized, load initial admin data
          loadAdminData();
        }
      } catch (err) {
        console.error('Failed to verify attendance editor status', err);
      } finally {
        setAuthLoading(false);
      }
    };
    verifyPermissions();
  }, [isPublic, currentUser]);

  // Load admin panels data
  const loadAdminData = async () => {
    try {
      const logs = await attendanceService.getAttendanceLogs({
        startDate: adminStartDate,
        endDate: adminEndDate,
        divisi: adminSelectedDivisi
      });
      setLogsList(logs);

      const geos = await attendanceService.getGeofences();
      setGeofencesList(geos);

      const profiles = await attendanceService.getAllProfiles();
      setAllProfiles(profiles);

      // Fetch all faces from local storage / DB metadata mock
      const mockFaces: EmployeeFace[] = [];
      for (const p of profiles) {
        const face = await attendanceService.getEmployeeFacePublic(p.id);
        if (face) mockFaces.push(face);
      }
      setFacesList(mockFaces);

      // Fetch all editors list
      // In this setup, we can fetch all or local editors
      const editors = (attendanceService as any).getLocalEditors ? (attendanceService as any).getLocalEditors() : [];
      setEditorsList(editors);

      // Compute statistics
      const totalEmployees = profiles.length;
      const registeredFaces = mockFaces.length;
      const unregisteredFaces = totalEmployees - registeredFaces;

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayLogs = logs.filter(l => l.createdAt.startsWith(todayStr));
      const presentToday = todayLogs.length;
      const lateToday = todayLogs.filter(l => l.status === 'Terlambat').length;
      const checkedOutToday = todayLogs.filter(l => l.checkOut).length;
      const absentToday = Math.max(0, totalEmployees - presentToday);

      setAdminStats({
        totalEmployees,
        registeredFaces,
        unregisteredFaces,
        presentToday,
        lateToday,
        absentToday,
        checkedOutToday
      });

    } catch (err) {
      console.error('Failed to load admin attendance data', err);
    }
  };

  // Re-run logs load on filter change
  useEffect(() => {
    if (!isPublic && (isAdmin || isEditor)) {
      loadAdminLogs();
    }
  }, [adminStartDate, adminEndDate, adminSelectedDivisi]);

  const loadAdminLogs = async () => {
    const logs = await attendanceService.getAttendanceLogs({
      startDate: adminStartDate,
      endDate: adminEndDate,
      divisi: adminSelectedDivisi
    });
    setLogsList(logs);
  };

  const handleResetLogs = async () => {
    try {
      await attendanceService.resetAllAttendances();
      await loadAdminLogs();
      setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      showNotification('Sukses', 'Berhasil mereset seluruh data log absensi.', 'success');
    } catch (err) {
      console.error('Failed to reset attendance logs:', err);
      showNotification('Error', 'Gagal mereset data log absensi.', 'error');
    }
  };

  const divisions = useMemo(() => {
    const divs = new Set(allProfiles.map(p => p.divisi).filter(Boolean));
    return ['Semua', ...Array.from(divs)];
  }, [allProfiles]);

  // --- 2. Public Kiosk Search & Profil Selection ---
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim().length >= 2) {
      const results = await attendanceService.searchProfiles(q);
      setSearchedProfiles(results);
    } else {
      setSearchedProfiles([]);
    }
  };

  const verifyGeofence = async (profile: User, mode: 'real' | 'inside' | 'outside', activeGeos: Geofence[]) => {
    setGpsLoading(true);

    if (mode === 'inside' && activeGeos.length > 0) {
      const testGeo = activeGeos[0];
      setUserLocation({ lat: testGeo.latitude, lon: testGeo.longitude, acc: 10 });
      setNearestGeofence({ geo: testGeo, dist: 10 });
      setIsInGeofenceRange(true);
      setGpsLoading(false);
      return;
    }

    if (mode === 'outside' && activeGeos.length > 0) {
      const testGeo = activeGeos[0];
      // Simulate coordinates far away
      setUserLocation({ lat: testGeo.latitude + 0.1, lon: testGeo.longitude + 0.1, acc: 15 });
      const dist = getHaversineDistance(testGeo.latitude + 0.1, testGeo.longitude + 0.1, testGeo.latitude, testGeo.longitude);
      setNearestGeofence({ geo: testGeo, dist });
      setIsInGeofenceRange(false);
      setGpsLoading(false);
      return;
    }

    // Real GPS logic
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const acc = pos.coords.accuracy;
          setUserLocation({ lat, lon, acc });
          setGpsLoading(false);

          if (activeGeos.length > 0) {
            let nearest: { geo: Geofence; dist: number } | null = null;
            activeGeos.forEach((geo) => {
              const dist = getHaversineDistance(lat, lon, geo.latitude, geo.longitude);
              if (!nearest || dist < nearest.dist) {
                nearest = { geo, dist };
              }
            });
            setNearestGeofence(nearest);
            if (nearest) {
              setIsInGeofenceRange(nearest.dist <= nearest.geo.radius);
            }
          }
        },
        (err) => {
          console.error('GPS error:', err);
          setGpsLoading(false);
          
          // Local testing fallback if real GPS fails
          const hostname = window.location.hostname;
          const isLocal = hostname === 'localhost' || 
                          hostname === '127.0.0.1' || 
                          hostname.startsWith('192.168.') || 
                          hostname.startsWith('10.') ||
                          hostname.endsWith('.loca.lt') ||
                          hostname.endsWith('.ngrok-free.app');
          if (isLocal && activeGeos.length > 0) {
            const testGeo = activeGeos[0];
            setUserLocation({ lat: testGeo.latitude, lon: testGeo.longitude, acc: 10 });
            setNearestGeofence({ geo: testGeo, dist: 0 });
            setIsInGeofenceRange(true);
            showNotification?.('GPS Simu-Aktif', 'Menggunakan lokasi simulasi karena GPS browser gagal.', 'info');
          } else {
            showNotification?.('GPS Gagal', 'Gagal mendeteksi lokasi GPS. Pastikan izin lokasi diaktifkan.', 'error');
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsLoading(false);
      // Local testing fallback if geolocation not supported
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || 
                      hostname === '127.0.0.1' || 
                      hostname.startsWith('192.168.') || 
                      hostname.startsWith('10.') ||
                      hostname.endsWith('.loca.lt') ||
                      hostname.endsWith('.ngrok-free.app');
      if (isLocal && activeGeos.length > 0) {
        const testGeo = activeGeos[0];
        setUserLocation({ lat: testGeo.latitude, lon: testGeo.longitude, acc: 10 });
        setNearestGeofence({ geo: testGeo, dist: 0 });
        setIsInGeofenceRange(true);
        showNotification?.('GPS Simu-Aktif', 'Browser memblokir GPS di HTTP. Lokasi disimulasikan.', 'info');
      } else {
        showNotification?.('GPS Tidak Didukung', 'Browser Anda memblokir GPS pada protokol HTTP biasa.', 'error');
      }
    }
  };

  const handleMockLocationChange = async (mode: 'real' | 'inside' | 'outside') => {
    setMockLocationMode(mode);
    if (selectedProfile && geofences.length > 0) {
      await verifyGeofence(selectedProfile, mode, geofences);
    }
  };

  const selectProfile = async (profile: User) => {
    setSelectedProfile(profile);
    setSearchQuery('');
    setSearchedProfiles([]);
    setGpsLoading(true);
    setAttendanceSuccess(null);
    setRegisteredFace(null);
    setTodayAttendance(null);

    try {
      // 1. Fetch face profile
      const face = await attendanceService.getEmployeeFacePublic(profile.id);
      setRegisteredFace(face);

      // 2. Fetch today's check-in
      const todayLog = await attendanceService.getTodayAttendancePublic(profile.id);
      setTodayAttendance(todayLog);

      // 3. Load Geofences & Get GPS Location
      const activeGeos = await attendanceService.getActiveGeofencesPublic();
      setGeofences(activeGeos);

      await verifyGeofence(profile, mockLocationMode, activeGeos);
    } catch (err) {
      console.error('Error fetching employee status', err);
      setGpsLoading(false);
    }
  };

  const resetKioskState = () => {
    setSelectedProfile(null);
    setRegisteredFace(null);
    setTodayAttendance(null);
    setUserLocation(null);
    setNearestGeofence(null);
    setIsInGeofenceRange(false);
    stopCamera();
    setIsRegisteringFace(false);
    setIsMatchingFace(false);
    setLivenessStatus('idle');
    setVerificationFeedback('');
    setMatchScore(null);
    setAttendanceSuccess(null);
  };

  // --- 3. Face API and Camera controls ---
  const loadFaceApiModels = async () => {
    if (modelsLoaded) return true;
    try {
      setLoadingModels(true);
      // Serve model weights from the local public path
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      setModelsLoaded(true);
      setLoadingModels(false);
      return true;
    } catch (err) {
      console.error('Failed to load faceapi models', err);
      setLoadingModels(false);
      showNotification?.('Error Model', 'Gagal memuat model pengenal wajah.', 'error');
      return false;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errMsg = 'Browser Anda memblokir akses kamera pada koneksi HTTP biasa. Silakan gunakan protokol HTTPS (misalnya lewat ngrok) atau gunakan komputer (localhost) untuk menguji kamera.';
      setCameraError(errMsg);
      showNotification?.('Akses Kamera Ditolak', errMsg, 'error');
      return;
    }
    try {
      const constraints = {
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Webcam stream play promise interrupted:', playErr);
        });
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Webcam error:', err);
      const errMsg = 'Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan pada browser Anda.';
      setCameraError(errMsg);
      showNotification?.('Izin Kamera Dibutuhkan', errMsg, 'warning');
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // --- 4. Face Registration Wizard (Public) ---
  const startRegistrationFlow = async () => {
    const ok = await loadFaceApiModels();
    if (!ok) return;

    setIsRegisteringFace(true);
    await startCamera();
    
    // Begin liveness detection loop
    setLivenessStatus('prompting');
    setLivenessProgress(0);
    // Randomly select liveness action: blink or smile
    const action = Math.random() > 0.5 ? 'blink' : 'smile';
    setLivenessAction(action);
    setLivenessPrompt(
      action === 'blink' 
        ? 'Silakan BERKEDIP beberapa kali di depan kamera.' 
        : 'Silakan TERSENYUM dengan lebar menghadap kamera.'
    );
    setVerificationFeedback('Mendeteksi wajah Anda...');

    // Run interval analysis
    let frameCount = 0;
    let successCount = 0;
    let modelWeightsLoaded = false;

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      if (width === 0 || height === 0) return;

      canvasRef.current.width = width;
      canvasRef.current.height = height;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Analyze Face Landmarks using SsdMobilenetv1 for higher stability and accuracy
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks();

      ctx.clearRect(0, 0, width, height);

      if (!detection) {
        setVerificationFeedback('Wajah tidak terdeteksi. Silakan sejajarkan wajah Anda.');
        return;
      }

      // Draw scanning box on canvas
      const box = detection.detection.box;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Laser line scanning animation
      const scanLineY = box.y + (Math.sin(Date.now() / 200) + 1) / 2 * box.height;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(box.x, scanLineY);
      ctx.lineTo(box.x + box.width, scanLineY);
      ctx.stroke();

      setVerificationFeedback('Wajah terdeteksi. Melakukan Liveness check...');

      const landmarks = detection.landmarks;

      if (action === 'blink') {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const earLeft = getEAR(leftEye);
        const earRight = getEAR(rightEye);
        const avgEAR = (earLeft + earRight) / 2.0;

        // If EAR falls below 0.23, count as closed eye (more tolerant threshold)
        if (avgEAR < 0.23) {
          successCount++;
          const progress = Math.min(100, Math.round((successCount / 2) * 100));
          setLivenessProgress(progress);
          if (successCount >= 2) {
            clearInterval(detectionIntervalRef.current);
            setLivenessStatus('success');
            setVerificationFeedback('Liveness Terverifikasi! Mengambil foto pendaftaran...');
            captureAndRegisterFace(detection);
          }
        }
      } else if (action === 'smile') {
        const mouth = landmarks.getMouth();
        // Measure mouth width (distance corners 48 to 54) relative to nose bridge height
        const cornerLeft = mouth[0];
        const cornerRight = mouth[6];
        const mouthWidth = Math.sqrt(Math.pow(cornerRight.x - cornerLeft.x, 2) + Math.pow(cornerRight.y - cornerLeft.y, 2));
        
        const jawLeft = landmarks.getJawOutline()[0];
        const jawRight = landmarks.getJawOutline()[16];
        const jawWidth = Math.sqrt(Math.pow(jawRight.x - jawLeft.x, 2) + Math.pow(jawRight.y - jawLeft.y, 2));

        const smileRatio = mouthWidth / jawWidth;

        // A smile usually causes width/jaw-width to increase above 0.42 (lowered from 0.45 for snappy check)
        if (smileRatio > 0.42) {
          successCount++;
          const progress = Math.min(100, Math.round((successCount / 3) * 100));
          setLivenessProgress(progress);
          if (successCount >= 3) {
            clearInterval(detectionIntervalRef.current);
            setLivenessStatus('success');
            setVerificationFeedback('Liveness Terverifikasi! Mengambil foto pendaftaran...');
            captureAndRegisterFace(detection);
          }
        }
      }

      frameCount++;
      // If 15 seconds pass with no success, fail the check
      if (frameCount > 75) {
        clearInterval(detectionIntervalRef.current);
        setLivenessStatus('failed');
        setVerificationFeedback('Waktu liveness habis. Mohon ulangi gerakan.');
        stopCamera();
      }

    }, 200);
  };

  const captureAndRegisterFace = async (detection: any) => {
    if (!videoRef.current || !selectedProfile) return;

    try {
      // 1. Get 128-dimensional embedding
      const fullDetection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!fullDetection) {
        setLivenessStatus('failed');
        setVerificationFeedback('Gagal mengambil embedding wajah berkualitas tinggi. Pastikan cahaya cukup.');
        stopCamera();
        return;
      }

      const embedding = Array.from(fullDetection.descriptor);

      // 2. Capture canvas image to Blob
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoRef.current.videoWidth;
      tempCanvas.height = videoRef.current.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
      }

      tempCanvas.toBlob(async (blob) => {
        if (!blob) {
          setLivenessStatus('failed');
          setVerificationFeedback('Gagal mengolah file foto.');
          return;
        }

        const photoFile = new File([blob], `registration_${selectedProfile.id}.jpg`, { type: 'image/jpeg' });
        
        // 3. Save via Service
        const faceReg = await attendanceService.registerEmployeeFacePublic(
          selectedProfile.id,
          embedding,
          photoFile
        );

        setRegisteredFace(faceReg);
        stopCamera();
        setIsRegisteringFace(false);
        showNotification?.('Registrasi Sukses', `Wajah ${selectedProfile.name} berhasil didaftarkan.`, 'success');
      }, 'image/jpeg', 0.9);

    } catch (err) {
      console.error('Registration failed:', err);
      setLivenessStatus('failed');
      setVerificationFeedback('Pendaftaran ke database gagal.');
      stopCamera();
    }
  };

  // --- 5. Attendance Matching Wizard (Check-In / Out) ---
  const startAttendanceVerification = async (type: 'in' | 'out') => {
    if (!selectedProfile || !registeredFace) return;

    // 1. Validate Geofence
    if (!isInGeofenceRange) {
      showNotification?.('Akses Ditolak', 'Anda berada di luar radius wilayah absensi kantor.', 'error');
      return;
    }

    const ok = await loadFaceApiModels();
    if (!ok) return;

    setIsMatchingFace(true);
    await startCamera();

    setLivenessStatus('verifying');
    setVerificationFeedback('Mencocokkan wajah...');

    let matchAttempts = 0;

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      if (width === 0 || height === 0) return;

      canvasRef.current.width = width;
      canvasRef.current.height = height;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Detect face and compute descriptor using SsdMobilenetv1 for accuracy
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      ctx.clearRect(0, 0, width, height);

      if (!detection) {
        setVerificationFeedback('Sejajarkan wajah Anda dengan kamera...');
        return;
      }

      // Draw bounds
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.strokeRect(detection.detection.box.x, detection.detection.box.y, detection.detection.box.width, detection.detection.box.height);

      // Match face embedding
      const currentDescriptor = detection.descriptor;
      const registeredDescriptor = new Float32Array(registeredFace.embedding);

      // Compute Euclidean Distance (threshold: < 0.58 is a match for optimal balance)
      const distance = faceapi.euclideanDistance(currentDescriptor, registeredDescriptor);
      const confidence = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
      setMatchScore(confidence);

      if (distance < 0.58) {
        // MATCH FOUND!
        clearInterval(detectionIntervalRef.current);
        setLivenessStatus('success');
        setVerificationFeedback(`Cocok! Tingkat kemiripan: ${confidence}%`);
        stopCamera();
        setIsMatchingFace(false);
        saveAttendanceRecord(type, confidence);
      } else {
        matchAttempts++;
        setVerificationFeedback(`Mencari kemiripan... (${confidence}%)`);
        
        // Timeout after 8 seconds of matching
        if (matchAttempts > 40) {
          clearInterval(detectionIntervalRef.current);
          setLivenessStatus('failed');
          setVerificationFeedback('Pencocokan wajah gagal. Wajah tidak sesuai dengan foto terdaftar.');
          stopCamera();
        }
      }

    }, 200);
  };

  const saveAttendanceRecord = async (type: 'in' | 'out', confidence: number) => {
    if (!selectedProfile) return;

    // Validate Check-In / Check-Out business logic here
    if (type === 'out') {
      if (!todayAttendance) {
        showNotification?.('Peringatan', 'Anda harus melakukan absen masuk terlebih dahulu sebelum absen pulang.', 'warning');
        setAttendanceSuccess(null);
        resetKioskState();
        return;
      }
      if (isBefore12PM) {
        showNotification?.('Peringatan', 'Absen pulang (Check-Out) baru dibuka setelah pukul 12:00 siang.', 'warning');
        setAttendanceSuccess(null);
        resetKioskState();
        return;
      }
    }

    try {
      const browserInfo = navigator.userAgent;
      
      // Determine device type
      let device = 'Desktop';
      if (/Mobi|Android|iPhone/i.test(browserInfo)) {
        device = 'Mobile';
      }

      // Detect status based on check-in time
      let status: 'Hadir' | 'Terlambat' | 'WFA' = 'Hadir';
      const now = new Date();
      
      // Default late threshold: 07:30 AM
      const threshold = new Date(now);
      threshold.setHours(7, 30, 0, 0);

      if (now > threshold) {
        status = 'Terlambat';
      }

      if (type === 'in') {
        if (todayAttendance) {
          // UPDATE today's existing check-in log
          const log = await attendanceService.updateCheckInPublic(todayAttendance.id, {
            checkIn: new Date().toISOString(),
            status,
            locationId: nearestGeofence?.geo.id,
            latitude: userLocation?.lat || 0,
            longitude: userLocation?.lon || 0,
            accuracy: userLocation?.acc || 0,
            faceConfidence: confidence / 100,
            livenessScore: 1.0,
            browser: 'Browser',
            device,
            ipAddress: '127.0.0.1' // fallback IP
          });
          setTodayAttendance(log);
          setAttendanceSuccess({ type: 'in', time: new Date().toLocaleTimeString('id-ID') });
          showNotification?.('Absen Masuk Diperbarui', `Absen masuk berhasil diperbarui. Status: ${status}`, 'success');
        } else {
          // INSERT new check-in log
          const log = await attendanceService.checkInPublic({
            employeeId: selectedProfile.id,
            checkIn: new Date().toISOString(),
            status,
            locationId: nearestGeofence?.geo.id,
            latitude: userLocation?.lat || 0,
            longitude: userLocation?.lon || 0,
            accuracy: userLocation?.acc || 0,
            faceConfidence: confidence / 100,
            livenessScore: 1.0,
            browser: 'Browser',
            device,
            ipAddress: '127.0.0.1' // fallback IP
          });
          setTodayAttendance(log);
          setAttendanceSuccess({ type: 'in', time: new Date().toLocaleTimeString('id-ID') });
          showNotification?.('Absen Masuk Sukses', `Check-in berhasil disimpan. Status: ${status}`, 'success');
        }
      } else {
        if (!todayAttendance) return;
        // UPDATE existing check-out log (updates check_out time directly)
        const log = await attendanceService.checkOutPublic(todayAttendance.id, {
          checkOut: new Date().toISOString(),
          latitude: userLocation?.lat || 0,
          longitude: userLocation?.lon || 0,
          accuracy: userLocation?.acc || 0
        });
        setTodayAttendance(log);
        setAttendanceSuccess({ type: 'out', time: new Date().toLocaleTimeString('id-ID') });
        showNotification?.('Absen Pulang Sukses', 'Absen pulang berhasil disimpan.', 'success');
      }
    } catch (err) {
      console.error('Attendance submission failed:', err);
      showNotification?.('Gagal', 'Gagal memproses absensi ke database.', 'error');
    }
  };


  // --- 6. Admin Panel Functions (Protected) ---

  // Helper to format date as DD/MM/YYYY
  const formatAttendanceDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Execute custom export (Excel or PDF) from the export modal
  const handleExecuteExport = async (format: 'excel' | 'pdf') => {
    setIsExportLoading(true);
    try {
      const logs = await attendanceService.getAttendanceLogs({
        startDate: exportStartDate,
        endDate: exportEndDate,
        divisi: exportDivisi
      });

      // Generate dates list for export range
      const dates: string[] = [];
      let current = new Date(exportStartDate);
      const end = new Date(exportEndDate);
      while (current <= end) {
        dates.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
      }

      // Filter employees by export division
      const filteredEmployees = allProfiles.filter(p => {
        return exportDivisi === 'Semua' || p.divisi === exportDivisi;
      });

      const exportRows: Array<{
        employeeName: string;
        employeeNip: string;
        employeeDivisi: string;
        date: string;
        checkIn: string;
        checkOut: string;
        status: string;
      }> = [];

      dates.forEach(dateStr => {
        const dateLogs = logs.filter(l => {
          const logDate = l.checkIn ? l.checkIn.slice(0, 10) : l.createdAt.slice(0, 10);
          return logDate === dateStr;
        });

        filteredEmployees.forEach(emp => {
          const empLog = dateLogs.find(l => l.employeeId === emp.id);

          if (empLog) {
            exportRows.push({
              employeeName: emp.name,
              employeeNip: emp.nip || '-',
              employeeDivisi: emp.divisi || '-',
              date: dateStr,
              checkIn: empLog.checkIn ? new Date(empLog.checkIn).toLocaleString('id-ID') : '-',
              checkOut: empLog.checkOut ? new Date(empLog.checkOut).toLocaleString('id-ID') : 'Belum Pulang',
              status: empLog.status || 'Hadir'
            });
          } else {
            exportRows.push({
              employeeName: emp.name,
              employeeNip: emp.nip || '-',
              employeeDivisi: emp.divisi || '-',
              date: dateStr,
              checkIn: '-',
              checkOut: '-',
              status: 'Tidak Hadir'
            });
          }
        });
      });

      // Sort export rows by date ascending, then name ascending
      exportRows.sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.employeeName.localeCompare(b.employeeName);
      });

      if (format === 'excel') {
        const dataToExport = exportRows.map((row) => ({
          'NAMA': row.employeeName,
          'NIP': row.employeeNip,
          'DIVISI': row.employeeDivisi,
          'TANGGAL': formatAttendanceDate(row.date),
          'JAM MASUK': row.checkIn,
          'JAM PULANG': row.checkOut,
          'STATUS': row.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Kehadiran');
        XLSX.writeFile(wb, `Laporan_Absensi_Pulse_${exportStartDate}_s.d._${exportEndDate}.xlsx`);
        showNotification?.('Sukses', 'Laporan Kehadiran berhasil diexport ke Excel.', 'success');
      } else {
        const doc = new jsPDF();
        doc.text('Laporan Kehadiran Pegawai - Pulse', 14, 15);
        doc.setFontSize(10);
        doc.text(`Periode: ${exportStartDate} s.d. ${exportEndDate} | Divisi: ${exportDivisi}`, 14, 22);

        const tableData = exportRows.map((row) => [
          row.employeeName,
          row.employeeNip,
          row.employeeDivisi,
          formatAttendanceDate(row.date),
          row.checkIn,
          row.checkOut,
          row.status
        ]);

        autoTable(doc, {
          head: [['NAMA', 'NIP', 'DIVISI', 'TANGGAL', 'JAM MASUK', 'JAM PULANG', 'STATUS']],
          body: tableData,
          startY: 28,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235] }
        });

        doc.save(`Laporan_Absensi_Pulse_${exportStartDate}_s.d._${exportEndDate}.pdf`);
        showNotification?.('Sukses', 'Laporan Kehadiran berhasil dicetak ke PDF.', 'success');
      }
      setShowExportModal(false);
    } catch (err) {
      console.error('Export failed:', err);
      showNotification?.('Gagal', 'Terjadi kesalahan saat mengekspor data.', 'error');
    } finally {
      setIsExportLoading(false);
    }
  };

  // Reset face profile
  const handleResetFace = async (employeeId: string, employeeName: string) => {
    showConfirm(
      'Reset Data Wajah',
      `Apakah Anda yakin ingin me-reset (menghapus) data pendaftaran wajah ${employeeName}? Pegawai harus melakukan registrasi ulang.`,
      async () => {
        try {
          await attendanceService.resetEmployeeFace(employeeId);
          showNotification('Wajah Direset', `Data wajah ${employeeName} berhasil dihapus.`, 'success');
          loadAdminData();
        } catch (err) {
          console.error('Reset face failed:', err);
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      },
      'warning'
    );
  };

  // Manage Geofences
  const handleSaveGeofence = async () => {
    if (!editingGeofence.name || !editingGeofence.latitude || !editingGeofence.longitude || !editingGeofence.radius) {
      showNotification('Peringatan', 'Mohon isi semua data koordinat geofence.', 'warning');
      return;
    }
    try {
      await attendanceService.saveGeofence(editingGeofence);
      setShowGeofenceModal(false);
      setEditingGeofence(null);
      showNotification('Sukses', 'Lokasi Geofence berhasil disimpan.', 'success');
      loadAdminData();
    } catch (err) {
      console.error('Save geofence failed:', err);
    }
  };

  const handleDeleteGeofence = async (id: string, name: string) => {
    showConfirm(
      'Hapus Lokasi Geofence',
      `Apakah Anda yakin ingin menghapus lokasi geofence "${name}"?`,
      async () => {
        try {
          await (attendanceService as any).deleteGeofence(id);
          showNotification('Sukses', 'Lokasi Geofence berhasil dihapus.', 'success');
          loadAdminData();
        } catch (err) {
          console.error('Delete geofence failed:', err);
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      },
      'warning'
    );
  };

  // Designate Editor
  const handleAddEditor = async () => {
    if (!newEditorUser) {
      showNotification('Peringatan', 'Silakan pilih pegawai terlebih dahulu.', 'warning');
      return;
    }
    try {
      await attendanceService.saveAttendanceEditor(newEditorUser, 'Global');
      setNewEditorUser('');
      showNotification('Sukses', 'Pegawai berhasil ditunjuk sebagai Editor Absensi.', 'success');
      loadAdminData();
    } catch (err) {
      console.error('Add editor failed:', err);
    }
  };

  const handleRemoveEditor = async (userId: string, divisi: string, name: string) => {
    showConfirm(
      'Cabut Akses Editor',
      `Hapus hak akses editor absensi untuk ${name}?`,
      async () => {
        try {
          await attendanceService.removeAttendanceEditor(userId, divisi);
          showNotification('Sukses', 'Akses Editor berhasil dicabut.', 'success');
          loadAdminData();
        } catch (err) {
          console.error('Remove editor failed:', err);
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      },
      'warning'
    );
  };


  // --- 7. UI Renders ---

  // RENDER 1: Public Kiosk View (/hadir)
  if (isPublic) {
    const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formattedDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
      <div className="min-h-screen bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] text-slate-800 flex flex-col justify-between p-6 overflow-x-hidden relative font-sans">
        
        {/* Top Header */}
        <header className="flex items-center justify-between gap-4 max-w-6xl mx-auto w-full border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-3">
            <img src="/Logo.svg" alt="Logo Pulse" className="h-10 w-10" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-none">Sistem Absensi Pulse</h1>
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold tracking-wider uppercase">Kementerian PPPA</span>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-base sm:text-lg font-bold text-slate-900 font-mono tracking-tight">{formattedTime}</div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-medium">{formattedDate}</div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-6xl mx-auto w-full flex items-center justify-center py-10">
          
          {!selectedProfile ? (
            // Search Form
            <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-indigo-100/50">
                  <UserIcon size={24} className="text-indigo-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Selamat Datang</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5">Cari nama atau NIP Anda untuk mencatat kehadiran hari ini.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Ketik Nama atau NIP Anda..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-sm sm:text-base"
                />
              </div>

              {/* Autocomplete Search Results */}
              {searchedProfiles.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {searchedProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectProfile(p)}
                      className="w-full text-left px-4 py-3.5 hover:bg-slate-50/80 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 text-indigo-700 rounded-lg font-bold flex items-center justify-center text-xs sm:text-sm group-hover:bg-indigo-100 transition-colors">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-xs sm:text-sm">{p.name}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500">{p.nip ? `NIP. ${p.nip}` : 'NIP tidak tersedia'} • {p.divisi}</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Profile Actions Dashboard (Webcam enrollment/matching)
            <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-stretch bg-white border border-slate-200 p-8 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              
              {/* Profile Card details */}
              <div className="flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <button 
                    onClick={resetKioskState}
                    className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 hover:text-slate-700 transition-all font-semibold uppercase tracking-wider"
                  >
                    <ArrowLeft size={12} />
                    <span>Cari Pegawai Lain</span>
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-700 border border-indigo-100/50 rounded-xl font-bold text-xl flex items-center justify-center">
                      {selectedProfile.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{selectedProfile.name}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">NIP. {selectedProfile.nip || '-'} • {selectedProfile.divisi}</p>
                    </div>
                  </div>
                </div>

                {/* Info Boxes Stack */}
                <div className="space-y-3.5 flex-1 py-2">
                  {/* GPS Status */}
                  <div className="p-4 bg-slate-50/50 border border-slate-200/60 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1"><MapPin size={12} /> Verifikasi Lokasi (GPS)</span>
                      {gpsLoading ? (
                        <span className="text-indigo-600 flex items-center gap-0.5">
                          <RefreshCw size={10} className="animate-spin" /> Melacak...
                        </span>
                      ) : userLocation ? (
                        <span className="text-emerald-600">Aktif</span>
                      ) : (
                        <span className="text-rose-600">Nonaktif</span>
                      )}
                    </div>

                    {gpsLoading ? (
                      <div className="h-5 w-full bg-slate-200/50 animate-pulse rounded" />
                    ) : nearestGeofence ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700">
                          <span>{nearestGeofence.geo.name}</span>
                          <span className={isInGeofenceRange ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}>
                            {Math.round(nearestGeofence.dist)}m
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-400">
                          Radius Maks: {nearestGeofence.geo.radius}m • Akurasi GPS: {Math.round(userLocation?.acc || 0)}m
                        </div>
                        <div className="pt-1">
                          {isInGeofenceRange ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] sm:text-xs font-semibold">
                              <CheckCircle size={12} /> Dalam Radius Kantor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 border border-rose-100 text-rose-700 text-[10px] sm:text-xs font-semibold animate-pulse">
                              <AlertTriangle size={12} /> Di Luar Radius Kantor
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">Belum mendapat data lokasi geofence.</div>
                    )}
                  </div>

                  {/* Face Status */}
                  <div className="p-4 bg-slate-50/50 border border-slate-200/60 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <UserIcon size={12} /> Data Biometrik Wajah
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                        {registeredFace ? 'Sudah Terdaftar (Aktif)' : 'Belum Registrasi Wajah'}
                      </div>
                    </div>
                    {registeredFace ? (
                      <ShieldCheck className="text-emerald-600" size={24} />
                    ) : (
                      <ShieldAlert className="text-amber-500" size={24} />
                    )}
                  </div>

                  {/* Today's Log */}
                  {todayAttendance && (
                    <div className="p-4 bg-indigo-50/20 border border-indigo-100/50 rounded-xl space-y-1.5">
                      <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock size={12} /> Riwayat Absensi Hari Ini
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700 font-medium">
                        <div className="space-y-0.5">
                          <div className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Jam Masuk (In)</div>
                          <div className="font-bold text-emerald-600 text-sm">
                            {new Date(todayAttendance.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-[10px] sm:text-xs text-slate-400">
                            Status: <span className={todayAttendance.status === 'Terlambat' ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>{todayAttendance.status}</span>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Jam Pulang (Out)</div>
                          {todayAttendance.checkOut ? (
                            <div className="font-bold text-rose-600 text-sm">
                              {new Date(todayAttendance.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : (
                            <div className="text-slate-400 text-xs italic mt-1">Belum Pulang</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-2 space-y-2">
                  {attendanceSuccess ? (
                    // Success View
                    <div className="bg-emerald-50 border border-emerald-200/80 p-6 rounded-xl text-center space-y-2.5 animate-slideDown">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">Absensi Berhasil!</h4>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                          {selectedProfile.name} berhasil melakukan absen {attendanceSuccess.type === 'in' ? 'Masuk' : 'Pulang'} pada pukul {attendanceSuccess.time}.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setAttendanceSuccess(null);
                          resetKioskState();
                        }}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                      >
                        Kembali ke Beranda
                      </button>
                    </div>
                  ) : !registeredFace ? (
                    // Needs Registration
                    <div className="space-y-2.5">
                      <div className="text-xs sm:text-sm text-amber-700 font-semibold text-center bg-amber-50 border border-amber-100 py-2.5 px-3.5 rounded-lg leading-normal">
                        PENTING: Registrasi wajah hanya dapat dilakukan 1 (satu) kali. Pastikan cahaya cukup dan wajah terlihat jelas tanpa masker/kacamata.
                      </div>
                      <button
                        onClick={startRegistrationFlow}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                      >
                        <Camera size={16} />
                        <span>Mulai Registrasi Wajah</span>
                      </button>
                    </div>
                  ) : (
                    // Ready to Check In/Out
                    <>
                      <div className="flex gap-3">
                        {/* Check-In Button */}
                        <button
                          onClick={() => startAttendanceVerification('in')}
                          disabled={gpsLoading}
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                        >
                          <UserCheck size={16} />
                          <span>Absen Masuk</span>
                        </button>

                        {/* Check-Out Button */}
                        <button
                          onClick={() => startAttendanceVerification('out')}
                          disabled={gpsLoading}
                          className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md shadow-rose-600/10 flex items-center justify-center gap-1.5"
                          title={isBefore12PM ? "Absen pulang baru bisa dilakukan setelah pukul 12:00 siang" : ""}
                        >
                          <LogOut size={16} />
                          <span>Absen Pulang</span>
                        </button>
                      </div>

                      {todayAttendance && !todayAttendance.checkOut && isBefore12PM && !attendanceSuccess && (
                        <p className="text-xs sm:text-sm text-amber-600 font-semibold text-center bg-amber-50 border border-amber-100/50 py-2 px-3 rounded-lg">
                          * Absen pulang (Check-Out) baru dibuka setelah jam 12:00 siang.
                        </p>
                      )}
                    </>
                  )}

                  {/* Removed re-registration button as it is a one-time setup */}
                </div>
              </div>

              {/* Webcam Scanning Box */}
              <div className="flex flex-col items-center justify-center">
                {/* Active Camera Grid */}
                <div className={`relative w-full aspect-square bg-slate-900 border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm ${isCameraActive ? 'block' : 'hidden'}`}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                  />
                  
                  {/* Scanning Lasers Overlay */}
                  {livenessStatus === 'prompting' && (
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/90 text-white text-center py-3 text-xs sm:text-sm font-semibold tracking-wide border-t border-slate-800/60 backdrop-blur-sm z-10">
                      {livenessPrompt}
                    </div>
                  )}

                  {livenessStatus === 'prompting' && livenessProgress > 0 && (
                    <div className="absolute top-4 inset-x-6 z-10">
                      <div className="w-full bg-slate-950/60 backdrop-blur-sm h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${livenessProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera Inactive Placeholder */}
                <div className={`w-full aspect-square bg-slate-50 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-3 ${!isCameraActive ? 'flex' : 'hidden'}`}>
                  {cameraError ? (
                    <>
                      <AlertTriangle size={36} className="text-rose-500 animate-bounce" />
                      <p className="text-xs sm:text-sm font-semibold text-rose-600">Akses Kamera Gagal</p>
                      <p className="text-xs text-slate-500 leading-normal max-w-xs">{cameraError}</p>
                    </>
                  ) : (
                    <>
                      <Camera size={36} className="text-slate-300 animate-pulse" />
                      <p className="text-xs sm:text-sm font-semibold text-slate-400">Kamera Nonaktif</p>
                      <p className="text-xs text-slate-500 leading-normal max-w-xs">Gunakan tombol registrasi atau tombol absensi untuk mengaktifkan sensor kamera.</p>
                    </>
                  )}
                </div>

                {/* Subtitle feed */}
                {isCameraActive && (
                  <div className="mt-3 text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1.5 bg-slate-100/80 border border-slate-200 px-3.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                    <span>{verificationFeedback}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 font-medium max-w-6xl mx-auto w-full border-t border-slate-200/60 pt-4 mt-8 flex flex-col md:flex-row justify-between items-center gap-2">
          <span>&copy; 2026 Kementerian Pemberdayaan Perempuan dan Perlindungan Anak RI. All rights reserved.</span>
          <span>Sistem Absensi Terpadu</span>
        </footer>

        {/* Developer Sandbox Geofence Controller */}
        {isLocalDev && (
          <div className="fixed bottom-4 left-4 z-50 bg-slate-900 text-white p-3.5 rounded-xl shadow-lg border border-slate-800 text-[10px] sm:text-xs space-y-1.5 max-w-[240px] animate-slideUp">
            <div className="font-bold uppercase tracking-wider text-indigo-400">Dev GPS Simulator</div>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleMockLocationChange('inside')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${mockLocationMode === 'inside' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                Kantor
              </button>
              <button
                onClick={() => handleMockLocationChange('outside')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${mockLocationMode === 'outside' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                Luar
              </button>
              <button
                onClick={() => handleMockLocationChange('real')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${mockLocationMode === 'real' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                GPS Asli
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER 2: Internal Admin/Editor Panel ---
  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 h-full">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto text-gov-600 mb-2" size={32} />
          <span className="text-sm text-slate-500">Memeriksa otorisasi absen...</span>
        </div>
      </div>
    );
  }

  if (!isEditor && !isAdmin) {
    return (
      <div className="p-6 text-center h-full flex items-center justify-center bg-slate-50">
        <div className="bg-red-50 text-red-600 border border-red-100 px-6 py-8 rounded-2xl max-w-md mx-auto space-y-3 shadow-sm">
          <ShieldAlert className="mx-auto text-red-500" size={48} />
          <h4 className="font-bold text-lg">Akses Terbatas</h4>
          <p className="text-sm text-slate-500">
            Anda tidak memiliki izin untuk mengelola modul Absensi. Halaman ini hanya tersedia untuk Super Admin atau pegawai yang ditunjuk sebagai Editor Absensi.
          </p>
          <div className="pt-2 text-xs font-semibold text-slate-400">
            Untuk melakukan absen mandiri, gunakan tautan publik kantor di <a href="/hadir" className="text-gov-600 hover:underline">pulse.kpppa.go.id/hadir</a>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 sm:gap-3">
            <Camera className="text-gov-600" size={24} />
            Pemantauan Absensi Wajah & Geofence
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola koordinat lokasi geofence kantor, penugasan editor, dan pantau log kehadiran harian pegawai.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveAdminTab('dashboard')}
            className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeAdminTab === 'dashboard' ? 'border-gov-600 text-gov-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard size={16} />
            Dashboard Kehadiran
          </button>
          <button
            onClick={() => setActiveAdminTab('history')}
            className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeAdminTab === 'history' ? 'border-gov-600 text-gov-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList size={16} />
            Log Absensi
          </button>
          <button
            onClick={() => setActiveAdminTab('faces')}
            className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeAdminTab === 'faces' ? 'border-gov-600 text-gov-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={16} />
            Profil Wajah Pegawai
          </button>
          <button
            onClick={() => setActiveAdminTab('geofence')}
            className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeAdminTab === 'geofence' ? 'border-gov-600 text-gov-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin size={16} />
            Koordinat Geofence
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveAdminTab('editors')}
              className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeAdminTab === 'editors' ? 'border-gov-600 text-gov-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings size={16} />
              Penugasan Editor
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Render Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 relative space-y-6">

        {/* TAB: DASHBOARD */}
        {activeAdminTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              
              {/* Card 1: Total Pegawai */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[108px]">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Pegawai</div>
                <div className="mt-1">
                  <div className="text-3xl font-black text-slate-800">{adminStats.totalEmployees}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">dari data master</div>
                </div>
              </div>

              {/* Card 2: Wajah Terdaftar */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[108px]">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Wajah Terdaftar</div>
                <div className="mt-1">
                  <div className="text-3xl font-black text-emerald-600">{adminStats.registeredFaces}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">({Math.round((adminStats.registeredFaces / (adminStats.totalEmployees || 1)) * 100)}% terdaftar)</div>
                </div>
              </div>

              {/* Card 3: Hadir Hari Ini */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[108px]">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Hadir Hari Ini</div>
                <div className="mt-1">
                  <div className="text-3xl font-black text-gov-600">{adminStats.presentToday}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">kehadiran masuk</div>
                </div>
              </div>

              {/* Card 4: Terlambat / Pulang */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[108px]">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Terlambat / Pulang</div>
                <div className="mt-1">
                  <div className="text-3xl font-black text-amber-500">
                    {adminStats.lateToday} <span className="text-xs text-slate-400 font-bold">/ {adminStats.checkedOutToday}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">terlambat / pulang</div>
                </div>
              </div>

              {/* Card 5: Akurasi Deteksi */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[108px]">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Akurasi Deteksi</div>
                <div className="mt-1">
                  <div className="text-3xl font-black text-indigo-600">{averageFaceConfidence}%</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">rerata kecocokan</div>
                </div>
              </div>

              {/* Card 6: Kepatuhan Checkout */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[108px]">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Kepatuhan Checkout</div>
                <div className="mt-1">
                  <div className="text-3xl font-black text-teal-600">{checkoutComplianceRate}%</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">absen pulang lengkap</div>
                </div>
              </div>

            </div>

            {/* Bento Grid Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Card 1: Tren Kehadiran */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
                <h3 className="font-bold text-sm text-slate-800 mb-4">Tren Kehadiran Harian</h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrendData}>
                      <defs>
                        <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPulang" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Area name="Absen Masuk" type="monotone" dataKey="Masuk" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorMasuk)" />
                      <Area name="Absen Pulang" type="monotone" dataKey="Pulang" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorPulang)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 2: Kehadiran Per Divisi */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
                <h3 className="font-bold text-sm text-slate-800 mb-4">Kehadiran Per Unit Kerja / Divisi</h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={divisionPresenceData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                      <XAxis type="number" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={9} tickLine={false} width={120} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                      <Bar name="Jumlah Hadir" dataKey="Jumlah Hadir" fill="#3B82F6" radius={[0, 6, 6, 0]} maxBarSize={16}>
                        {divisionPresenceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3B82F6' : '#60A5FA'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 3: Distribusi Jam Kedatangan */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
                <h3 className="font-bold text-sm text-slate-800 mb-4">Analitik Waktu Datang (Check-In)</h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={arrivalTimeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                      <Bar dataKey="Jumlah" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={30}>
                        {arrivalTimeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 4: Distribusi Status Kehadiran */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
                <h3 className="font-bold text-sm text-slate-800 mb-4">Ketepatan Waktu Absensi</h3>
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  {statusDistributionData.length === 0 ? (
                    <span className="text-slate-400 text-xs font-semibold">Belum ada data status absensi.</span>
                  ) : (
                    <>
                      <div className="w-[60%] h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                            <Pie
                              data={statusDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {statusDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-[40%] space-y-3 pl-4">
                        {statusDistributionData.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                            <div className="text-[11px] font-bold text-slate-700">
                              {entry.name}: <span className="text-slate-900">{entry.value} Pegawai</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Card 5: Top Late Employees */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
                <h3 className="font-bold text-sm text-slate-800 mb-2">Pegawai Paling Sering Terlambat</h3>
                <p className="text-[10px] text-slate-400 font-semibold mb-4">Frekuensi keterlambatan terbanyak selama periode log aktif (bahan evaluasi SDMO).</p>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {topLateEmployees.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">Tidak ada data keterlambatan.</div>
                  ) : (
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                          <th className="pb-2">Nama</th>
                          <th className="pb-2">Divisi</th>
                          <th className="pb-2 text-center">Jumlah Terlambat</th>
                          <th className="pb-2 text-right">Rasio Terlambat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                        {topLateEmployees.map((emp, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-4 h-4 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-[9px] font-black">{index + 1}</span>
                              {emp.name}
                            </td>
                            <td className="py-2.5 text-slate-500 truncate max-w-[120px]">{emp.divisi}</td>
                            <td className="py-2.5 text-center text-red-600 font-black">{emp.lateCount}x</td>
                            <td className="py-2.5 text-right font-black text-slate-500">{emp.latePercentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Card 6: Top Punctual Employees */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
                <h3 className="font-bold text-sm text-slate-800 mb-2">Pegawai Paling Punctual (Rerata Jam Masuk)</h3>
                <p className="text-[10px] text-slate-400 font-semibold mb-4">Rerata jam masuk paling awal selama periode log aktif.</p>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {topPunctualEmployees.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">Belum ada data kehadiran.</div>
                  ) : (
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                          <th className="pb-2">Nama</th>
                          <th className="pb-2">Divisi</th>
                          <th className="pb-2 text-right">Rerata Masuk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                        {topPunctualEmployees.map((emp, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-4 h-4 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-[9px] font-black">{index + 1}</span>
                              {emp.name}
                            </td>
                            <td className="py-2.5 text-slate-500 truncate max-w-[140px]">{emp.divisi}</td>
                            <td className="py-2.5 text-right font-black text-emerald-600">{emp.avgTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB: HISTORY LOGS */}
        {activeAdminTab === 'history' && (
          <div className="space-y-4">
            
            {/* Filters panel */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Mulai Tanggal</label>
                  <input
                    type="date"
                    value={adminStartDate}
                    onChange={(e) => setAdminStartDate(e.target.value)}
                    className="block bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-gov-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={adminEndDate}
                    onChange={(e) => setAdminEndDate(e.target.value)}
                    className="block bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-gov-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Filter Divisi / Satker</label>
                  <SearchableSelect
                    options={divisions.map((div) => ({ value: div, label: div }))}
                    value={adminSelectedDivisi}
                    onChange={(val) => setAdminSelectedDivisi(val)}
                    placeholder="Pilih Divisi"
                    emptyOption="Semua Divisi"
                    className="min-w-[180px] text-xs font-semibold text-slate-700 shadow-sm"
                  />
                </div>

                {/* Search Name Input */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cari Nama</label>
                  <div className="bg-white border border-slate-200 px-3 py-2.5 rounded-xl shadow-sm flex items-center gap-2 max-w-[200px] h-[34px]">
                    <Search size={14} className="text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Nama..."
                      value={historySearchUser}
                      onChange={(e) => setHistorySearchUser(e.target.value)}
                      className="w-full text-xs font-semibold focus:outline-none text-slate-700 bg-transparent"
                    />
                  </div>
                </div>

                {/* Belum Absen Pulang Filter */}
                <div className="flex items-center gap-2 self-end h-[34px]">
                  <input
                    type="checkbox"
                    id="chk-belum-pulang"
                    checked={filterBelumPulang}
                    onChange={(e) => setFilterBelumPulang(e.target.checked)}
                    className="rounded text-gov-600 focus:ring-gov-400 h-4 w-4 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="chk-belum-pulang" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                    Belum Absen Pulang
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                {/* 
                <button
                  onClick={() => {
                    showConfirm(
                      'Reset Seluruh Log Absensi',
                      'Apakah Anda yakin ingin menghapus SEMUA data log absensi? Tindakan ini bersifat permanen, tidak dapat dibatalkan, dan akan menghapus seluruh data kehadiran masuk/pulang pegawai.',
                      handleResetLogs,
                      'error'
                    );
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs shadow-sm transition-colors"
                >
                  <Trash2 size={14} /> Reset Log
                </button>
                */}
                <button
                  onClick={() => {
                    setExportStartDate(adminStartDate);
                    setExportEndDate(adminEndDate);
                    setExportDivisi(adminSelectedDivisi);
                    setShowExportModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 bg-white text-slate-700 rounded-xl font-bold text-xs shadow-sm"
                >
                  <Download size={14} /> Export Excel
                </button>
                <button
                  onClick={() => {
                    setExportStartDate(adminStartDate);
                    setExportEndDate(adminEndDate);
                    setExportDivisi(adminSelectedDivisi);
                    setShowExportModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-gov-100"
                >
                  <FileText size={14} /> Cetak PDF
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-6 py-3">Nama Pegawai</th>
                      <th className="px-6 py-3">NIP</th>
                      <th className="px-6 py-3">Divisi</th>
                      <th className="px-6 py-3">Tanggal</th>
                      <th className="px-6 py-3">Check In</th>
                      <th className="px-6 py-3">Check Out</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Akurasi</th>
                      <th className="px-6 py-3">Device/IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {generatedLogsReport.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-slate-400 font-semibold">Tidak ditemukan data absensi untuk filter terpilih.</td>
                      </tr>
                    ) : (
                      generatedLogsReport.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-bold text-slate-800">{l.employeeName}</td>
                          <td className="px-6 py-3.5">{l.employeeNip || '-'}</td>
                          <td className="px-6 py-3.5">{l.employeeDivisi}</td>
                          <td className="px-6 py-3.5 font-semibold text-slate-600">
                            {new Date(l.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-3.5 font-semibold text-slate-850">
                            {l.checkIn ? new Date(l.checkIn).toLocaleTimeString('id-ID') : '-'}
                          </td>
                          <td className="px-6 py-3.5 font-semibold">
                            {l.status === 'Tidak Hadir' ? '-' : (
                              l.checkOut ? new Date(l.checkOut).toLocaleTimeString('id-ID') : (
                                <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold">Belum Pulang</span>
                              )
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600' :
                              l.status === 'Terlambat' ? 'bg-amber-50 text-amber-600' : 
                              l.status === 'Tidak Hadir' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'
                            }`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-bold">
                            {l.faceConfidence !== undefined ? `${Math.round(l.faceConfidence * 100)}%` : '-'}
                          </td>
                          <td className="px-6 py-3.5 text-slate-400">
                            {l.device || l.ipAddress ? `${l.device || '-'} • ${l.ipAddress || '-'}` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB: FACES PROFILES */}
        {activeAdminTab === 'faces' && (
          <div className="space-y-4">
            
            {/* Search & Division filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm max-w-sm flex items-center gap-3 flex-1">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari pegawai..."
                  value={adminSearchUser}
                  onChange={(e) => setAdminSearchUser(e.target.value)}
                  className="w-full text-xs font-semibold focus:outline-none text-slate-700"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase hidden sm:inline">Divisi:</span>
                <SearchableSelect
                  options={divisions.map((div) => ({ value: div, label: div }))}
                  value={facesSelectedDivisi}
                  onChange={(val) => setFacesSelectedDivisi(val)}
                  placeholder="Pilih Divisi"
                  emptyOption="Semua Divisi"
                  className="min-w-[180px] text-xs font-semibold text-slate-700 shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase hidden sm:inline">Status:</span>
                <SearchableSelect
                  options={[
                    { value: 'Semua', label: 'Semua Status' },
                    { value: 'Terdaftar', label: 'Terdaftar Wajah' },
                    { value: 'Belum', label: 'Belum Terdaftar' }
                  ]}
                  value={facesFilterStatus}
                  onChange={(val) => setFacesFilterStatus(val)}
                  placeholder="Pilih Status"
                  emptyOption="Semua Status"
                  className="min-w-[150px] text-xs font-semibold text-slate-700 shadow-sm"
                />
              </div>
            </div>

            {/* Profiles Grid */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allProfiles
                .filter(p => {
                  const matchSearch = !adminSearchUser || p.name.toLowerCase().includes(adminSearchUser.toLowerCase());
                  const matchDivisi = facesSelectedDivisi === 'Semua' || p.divisi === facesSelectedDivisi;
                  
                  const hasFace = facesList.some(f => f.employeeId === p.id);
                  const matchStatus = facesFilterStatus === 'Semua' || 
                    (facesFilterStatus === 'Terdaftar' && hasFace) || 
                    (facesFilterStatus === 'Belum' && !hasFace);

                  return matchSearch && matchDivisi && matchStatus;
                })
                .map((p) => {
                  const face = facesList.find(f => f.employeeId === p.id);
                  return (
                    <div key={p.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between items-center text-center space-y-4">
                      <div className="space-y-2">
                        {face ? (
                          <img 
                            src={face.profilePhotoUrl} 
                            alt={p.name}
                            className="w-16 h-16 rounded-full object-cover mx-auto ring-4 ring-emerald-500/25 border-2 border-emerald-500"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 text-slate-400 border border-slate-200 rounded-full flex items-center justify-center font-bold text-2xl mx-auto">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">{p.name}</h4>
                          <p className="text-xs text-slate-400 font-semibold">{p.divisi}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">NIP. {p.nip || '-'}</p>
                        </div>
                      </div>

                      <div className="w-full pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className={`font-bold ${face ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {face ? 'Terdaftar' : 'Belum Wajah'}
                        </span>
                        {face && (
                          <button
                            onClick={() => handleResetFace(p.id, p.name)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                            title="Hapus data wajah"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

          </div>
        )}

        {/* TAB: GEOFENCES */}
        {activeAdminTab === 'geofence' && (
          <div className="space-y-4">
            
            {/* Topbar add */}
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-800">Daftar Koordinat Absensi Kantor</h3>
              <button
                onClick={() => {
                  setEditingGeofence({ name: '', latitude: -6.2087634, longitude: 106.845599, radius: 50, isActive: true });
                  setShowGeofenceModal(true);
                }}
                className="flex items-center gap-1 px-3 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-gov-100"
              >
                <Plus size={14} /> Tambah Lokasi
              </button>
            </div>

            {/* Geofences list */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {geofencesList.map((g) => (
                <div key={g.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gov-500/10 text-gov-600 rounded-lg flex items-center justify-center">
                        <Map size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{g.name}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${g.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                          {g.isActive ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingGeofence(g);
                          setShowGeofenceModal(true);
                        }}
                        className="text-slate-400 hover:text-gov-600 p-1 hover:bg-slate-50 rounded"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteGeofence(g.id, g.name)}
                        className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-slate-500 font-medium">
                    <div className="flex justify-between">
                      <span>Latitude:</span>
                      <span className="font-bold text-slate-700">{g.latitude}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Longitude:</span>
                      <span className="font-bold text-slate-700">{g.longitude}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                      <span>Radius Absensi:</span>
                      <span className="font-black text-gov-600">{g.radius} meter</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB: PENUGASAN EDITORS */}
        {activeAdminTab === 'editors' && (
          <div className="space-y-6">
            
            {/* Assign Form */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm max-w-md space-y-4">
              <h3 className="font-bold text-sm text-slate-855">Tunjuk Editor Absensi Baru</h3>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Pilih Pegawai</label>
                <SearchableSelect
                  options={allProfiles.map((p) => ({ value: p.id, label: `${p.name} (${p.divisi || 'Tanpa Divisi'})` }))}
                  value={newEditorUser}
                  onChange={(val) => setNewEditorUser(val)}
                  placeholder="Pilih Pegawai"
                  emptyOption="-- Pilih Pegawai --"
                  className="w-full mt-1 text-xs font-semibold text-slate-700 shadow-sm"
                />
              </div>
              <button
                onClick={handleAddEditor}
                className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                <Plus size={14} /> Berikan Hak Editor
              </button>
            </div>

            {/* List of Editors */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-150 bg-slate-50/50">
                <h3 className="font-bold text-sm text-slate-800">Daftar Pegawai yang Ditunjuk (Editor Absensi)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-6 py-3">Nama Pegawai</th>
                      <th className="px-6 py-3">Akses Hak Editor</th>
                      <th className="px-6 py-3">Tanggal Ditunjuk</th>
                      <th className="px-6 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {editorsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-semibold">Belum ada pegawai ditunjuk.</td>
                      </tr>
                    ) : (
                      editorsList.map((e) => {
                        const profile = allProfiles.find(p => p.id === e.userId);
                        return (
                          <tr key={e.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-3.5 font-bold text-slate-855">{profile?.name || 'Loading...'}</td>
                            <td className="px-6 py-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">Akses Global (Semua Divisi)</span>
                            </td>
                            <td className="px-6 py-3.5">{new Date(e.createdAt).toLocaleDateString('id-ID')}</td>
                            <td className="px-6 py-3.5 text-center">
                              <button
                                onClick={() => handleRemoveEditor(e.userId, e.divisi, profile?.name || '')}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded transition-all font-bold"
                              >
                                Cabut Akses
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* GEOFENCE CONFIG MODAL */}
      {showGeofenceModal && editingGeofence && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-slideDown">
            <div className="p-6 border-b border-slate-150 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-base">Atur Lokasi Absensi Kantor</h4>
              <button 
                onClick={() => {
                  setShowGeofenceModal(false);
                  setEditingGeofence(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Nama Lokasi</label>
                <input
                  type="text"
                  placeholder="Contoh: Kantor Datin"
                  value={editingGeofence.name}
                  onChange={(e) => setEditingGeofence({ ...editingGeofence, name: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none text-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Latitude</label>
                  <input
                    type="number"
                    step="0.0000001"
                    placeholder="-6.208"
                    value={editingGeofence.latitude}
                    onChange={(e) => setEditingGeofence({ ...editingGeofence, latitude: parseFloat(e.target.value) })}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Longitude</label>
                  <input
                    type="number"
                    step="0.0000001"
                    placeholder="106.84"
                    value={editingGeofence.longitude}
                    onChange={(e) => setEditingGeofence({ ...editingGeofence, longitude: parseFloat(e.target.value) })}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none text-slate-700"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Radius Maksimal (Meter)</label>
                <input
                  type="number"
                  placeholder="50"
                  value={editingGeofence.radius}
                  onChange={(e) => setEditingGeofence({ ...editingGeofence, radius: parseInt(e.target.value) })}
                  className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none text-slate-700"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="geo-status-chk"
                  checked={editingGeofence.isActive !== false}
                  onChange={(e) => setEditingGeofence({ ...editingGeofence, isActive: e.target.checked })}
                  className="rounded text-gov-600"
                />
                <label htmlFor="geo-status-chk" className="cursor-pointer select-none">Aktifkan koordinat lokasi untuk absen</label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-150 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowGeofenceModal(false);
                  setEditingGeofence(null);
                }}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs shadow-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSaveGeofence}
                className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-gov-100"
              >
                Simpan Lokasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE EXPORT FILTER MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-slideDown animate-fadeIn">
            <div className="p-6 border-b border-slate-150 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-base">Export Laporan Kehadiran</h4>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Unit Kerja / Divisi</label>
                <SearchableSelect
                  options={divisions.map((div) => ({ value: div, label: div }))}
                  value={exportDivisi}
                  onChange={(val) => setExportDivisi(val)}
                  placeholder="Pilih Divisi"
                  emptyOption="Semua Divisi"
                  className="w-full text-xs font-semibold text-slate-700 shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Mulai Tanggal</label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-150 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs shadow-sm"
                disabled={isExportLoading}
              >
                Batal
              </button>
              <button
                onClick={() => handleExecuteExport('excel')}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-emerald-600 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5"
                disabled={isExportLoading}
              >
                <Download size={14} /> {isExportLoading ? 'Memproses...' : 'Export Excel'}
              </button>
              <button
                onClick={() => handleExecuteExport('pdf')}
                className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-gov-100 flex items-center gap-1.5"
                disabled={isExportLoading}
              >
                <FileText size={14} /> {isExportLoading ? 'Memproses...' : 'Cetak PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <SimpleToast
        isOpen={toastState.isOpen}
        message={toastState.message}
        type={toastState.type}
        onClose={() => setToastState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        type={confirmModalState.type}
        onConfirm={confirmModalState.onConfirm}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        confirmText="Konfirmasi"
        cancelText="Batal"
      />

    </div>
  );
};
