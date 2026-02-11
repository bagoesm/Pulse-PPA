// src/components/AuditTrailDisplay.tsx
// Component for displaying Disposisi audit trail history
import React, { useState, useEffect } from 'react';
import { DisposisiHistory, DisposisiAction } from '../../types';
import { Clock, User, FileText, Upload, Trash2, Edit, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AuditTrailDisplayProps {
  disposisiId: string;
  className?: string;
}

const AuditTrailDisplay: React.FC<AuditTrailDisplayProps> = ({ disposisiId, className = '' }) => {
  const [history, setHistory] = useState<DisposisiHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchHistory();
  }, [disposisiId]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name');
      
      if (error) throw error;
      if (data) setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const getUserName = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user?.name || userId;
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('disposisi_history')
        .select('*')
        .eq('disposisi_id', disposisiId)
        .order('performed_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped = data.map(mapHistoryFromDB);
        setHistory(mapped);
      }
    } catch (err) {
      console.error('Error fetching audit trail:', err);
      setError('Failed to load audit trail');
    } finally {
      setIsLoading(false);
    }
  };

  const mapHistoryFromDB = (row: any): DisposisiHistory => ({
    id: row.id,
    disposisiId: row.disposisi_id,
    action: row.action,
    oldValue: row.old_value,
    newValue: row.new_value,
    performedBy: row.performed_by,
    performedAt: row.performed_at,
  });

  const getActionIcon = (action: DisposisiAction) => {
    switch (action) {
      case 'created':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'status_changed':
        return <Edit size={16} className="text-blue-600" />;
      case 'assignee_added':
        return <User size={16} className="text-purple-600" />;
      case 'assignee_removed':
        return <User size={16} className="text-red-600" />;
      case 'laporan_uploaded':
        return <Upload size={16} className="text-emerald-600" />;
      case 'laporan_deleted':
        return <Trash2 size={16} className="text-red-600" />;
      case 'notes_updated':
        return <FileText size={16} className="text-amber-600" />;
      case 'deadline_changed':
        return <Calendar size={16} className="text-indigo-600" />;
      default:
        return <Clock size={16} className="text-slate-600" />;
    }
  };

  const getActionLabel = (action: DisposisiAction) => {
    switch (action) {
      case 'created':
        return 'Disposisi dibuat';
      case 'status_changed':
        return 'Status diubah';
      case 'assignee_added':
        return 'Penugasan ditambahkan';
      case 'assignee_removed':
        return 'Penugasan dihapus';
      case 'reassigned':
        return 'Disposisi dilanjutkan';
      case 'text_updated':
        return 'Instruksi diperbarui';
      case 'laporan_uploaded':
        return 'Laporan diunggah';
      case 'laporan_deleted':
        return 'Laporan dihapus';
      case 'notes_updated':
        return 'Catatan diperbarui';
      case 'deadline_changed':
        return 'Deadline diubah';
      default:
        return action;
    }
  };

  const getActionColor = (action: DisposisiAction) => {
    switch (action) {
      case 'created':
        return 'bg-green-50 border-green-200';
      case 'status_changed':
        return 'bg-blue-50 border-blue-200';
      case 'assignee_added':
        return 'bg-purple-50 border-purple-200';
      case 'assignee_removed':
        return 'bg-red-50 border-red-200';
      case 'reassigned':
        return 'bg-indigo-50 border-indigo-200';
      case 'text_updated':
        return 'bg-cyan-50 border-cyan-200';
      case 'laporan_uploaded':
        return 'bg-emerald-50 border-emerald-200';
      case 'laporan_deleted':
        return 'bg-red-50 border-red-200';
      case 'notes_updated':
        return 'bg-amber-50 border-amber-200';
      case 'deadline_changed':
        return 'bg-indigo-50 border-indigo-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderChangeDetails = (item: DisposisiHistory) => {
    if (item.action === 'status_changed') {
      return (
        <div className="text-sm text-slate-600 mt-1">
          <span className="font-medium text-slate-700">{item.oldValue}</span>
          {' → '}
          <span className="font-medium text-slate-700">{item.newValue}</span>
        </div>
      );
    }

    if (item.action === 'laporan_uploaded') {
      return (
        <div className="text-sm text-slate-600 mt-1">
          File: <span className="font-medium text-slate-700">{item.newValue}</span>
        </div>
      );
    }

    if (item.action === 'laporan_deleted') {
      return (
        <div className="text-sm text-slate-600 mt-1">
          File: <span className="font-medium text-slate-700">{item.oldValue}</span>
        </div>
      );
    }

    if (item.action === 'deadline_changed') {
      return (
        <div className="text-sm text-slate-600 mt-1">
          {item.oldValue && (
            <>
              <span className="font-medium text-slate-700">
                {new Date(item.oldValue).toLocaleDateString('id-ID')}
              </span>
              {' → '}
            </>
          )}
          <span className="font-medium text-slate-700">
            {item.newValue === 'No deadline' ? 'Tidak ada deadline' : new Date(item.newValue!).toLocaleDateString('id-ID')}
          </span>
        </div>
      );
    }

    if (item.action === 'notes_updated') {
      return (
        <div className="text-sm text-slate-600 mt-1">
          <div className="text-xs text-slate-500">Catatan diperbarui</div>
        </div>
      );
    }

    if (item.action === 'reassigned') {
      return (
        <div className="text-sm text-slate-600 mt-1">
          <span className="text-slate-500">Dari:</span>{' '}
          <span className="font-medium text-slate-700">{getUserName(item.oldValue || '')}</span>
          {' → '}
          <span className="text-slate-500">Ke:</span>{' '}
          <span className="font-medium text-slate-700">{getUserName(item.newValue || '')}</span>
        </div>
      );
    }

    if (item.action === 'text_updated') {
      return (
        <div className="text-sm text-slate-600 mt-1 space-y-2">
          {item.oldValue && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <div className="text-xs text-red-600 font-medium mb-1">Instruksi Lama:</div>
              <div className="text-slate-700">{item.oldValue}</div>
            </div>
          )}
          {item.newValue && (
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="text-xs text-green-600 font-medium mb-1">Instruksi Baru:</div>
              <div className="text-slate-700">{item.newValue}</div>
            </div>
          )}
        </div>
      );
    }

    if (item.action === 'created') {
      return (
        <div className="text-sm text-slate-600 mt-1">
          {item.newValue}
        </div>
      );
    }

    if (item.action === 'assignee_removed') {
      return (
        <div className="text-sm text-slate-600 mt-1">
          {item.newValue}
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gov-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchHistory}
            className="mt-2 text-sm text-gov-600 hover:text-gov-700 underline"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 p-6 ${className}`}>
        <div className="text-center text-slate-500">
          <Clock size={32} className="mx-auto mb-2 text-slate-400" />
          <p>Belum ada riwayat perubahan</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Clock size={20} className="text-gov-600" />
          Riwayat Perubahan
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {history.length} aktivitas tercatat
        </p>
      </div>

      <div className="p-4">
        <div className="space-y-3">
          {history.map((item, index) => (
            <div
              key={item.id}
              className={`border rounded-lg p-3 ${getActionColor(item.action)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getActionIcon(item.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">
                        {getActionLabel(item.action)}
                      </p>
                      {renderChangeDetails(item)}
                    </div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(item.performedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
                    <User size={12} />
                    <span>{item.performedBy}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuditTrailDisplay;
