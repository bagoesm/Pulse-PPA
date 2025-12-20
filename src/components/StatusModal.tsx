import React, { useState } from 'react';
import { X, Music, Heart, MapPin, Coffee, Briefcase, Smile, Send } from 'lucide-react';
import { StatusType, UserStatus } from '../../types';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (status: Omit<UserStatus, 'id' | 'userId' | 'createdAt' | 'expiresAt'>) => void;
  currentUser: { id: string; name: string } | null;
}

const StatusModal: React.FC<StatusModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser
}) => {
  const [selectedType, setSelectedType] = useState<StatusType>('text');
  const [content, setContent] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');

  if (!isOpen) return null;

  const statusTypes = [
    { 
      type: 'text' as StatusType, 
      label: 'Teks', 
      icon: Smile, 
      placeholder: 'Apa yang sedang kamu pikirkan?',
      color: 'bg-blue-100 text-blue-700'
    },
    { 
      type: 'music' as StatusType, 
      label: 'Musik', 
      icon: Music, 
      placeholder: 'Sedang mendengarkan...',
      color: 'bg-purple-100 text-purple-700'
    },
    { 
      type: 'mood' as StatusType, 
      label: 'Mood', 
      icon: Heart, 
      placeholder: 'Bagaimana perasaanmu?',
      color: 'bg-pink-100 text-pink-700'
    },
    { 
      type: 'activity' as StatusType, 
      label: 'Aktivitas', 
      icon: Briefcase, 
      placeholder: 'Sedang apa sekarang?',
      color: 'bg-green-100 text-green-700'
    },
    { 
      type: 'location' as StatusType, 
      label: 'Lokasi', 
      icon: MapPin, 
      placeholder: 'Dimana kamu sekarang?',
      color: 'bg-orange-100 text-orange-700'
    },
    { 
      type: 'food' as StatusType, 
      label: 'Makanan', 
      icon: Coffee, 
      placeholder: 'Sedang makan/minum apa?',
      color: 'bg-amber-100 text-amber-700'
    }
  ];

  const moodEmojis = ['😊', '😎', '🤔', '😴', '🔥', '💪', '🎉', '😅', '🤗', '🙃'];
  const activityEmojis = ['💻', '📚', '☕', '🏃', '🎵', '🎨', '🍕', '🚗', '📞', '✈️'];
  const locationEmojis = ['🏠', '🏢', '🏫', '🏥', '🏪', '🌳', '🚗', '✈️', '🏖️', '🏔️'];
  const foodEmojis = ['☕', '🍕', '🍔', '🍜', '🍱', '🥗', '🍰', '🍎', '🥤', '🍪'];

  const getEmojisForType = () => {
    switch (selectedType) {
      case 'mood': return moodEmojis;
      case 'activity': return activityEmojis;
      case 'location': return locationEmojis;
      case 'food': return foodEmojis;
      default: return [];
    }
  };

  const selectedTypeConfig = statusTypes.find(t => t.type === selectedType);
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    if (wordCount > 25) return;

    onSave({
      type: selectedType,
      content: content.trim(),
      emoji: selectedEmoji || undefined
    });

    // Reset form
    setContent('');
    setSelectedEmoji('');
    setSelectedType('text');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-gov-50 to-blue-50">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Buat Status Baru</h2>
            <p className="text-xs sm:text-sm text-slate-500">Bagikan apa yang sedang kamu lakukan</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto">
          {/* Status Type Selection */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3">Pilih Jenis Status</label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {statusTypes.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.type}
                    type="button"
                    onClick={() => setSelectedType(type.type)}
                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-center ${
                      selectedType === type.type
                        ? `${type.color} border-current shadow-md`
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={18} className="mx-auto mb-0.5 sm:mb-1" />
                    <span className="text-[10px] sm:text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emoji Selection (for certain types) */}
          {['mood', 'activity', 'location', 'food'].includes(selectedType) && (
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">Pilih Emoji (Opsional)</label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {getEmojisForType().map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(selectedEmoji === emoji ? '' : emoji)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 text-base sm:text-lg transition-all ${
                      selectedEmoji === emoji
                        ? 'border-gov-400 bg-gov-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content Input */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
              Status {selectedTypeConfig?.label}
            </label>
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={selectedTypeConfig?.placeholder}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none resize-none text-sm"
                rows={3}
                maxLength={200}
              />
              <div className="absolute bottom-2 right-2 text-[10px] sm:text-xs text-slate-400">
                {wordCount}/25 kata
              </div>
            </div>
            {wordCount > 25 && (
              <p className="text-[10px] sm:text-xs text-red-500 mt-1">Maksimal 25 kata</p>
            )}
          </div>

          {/* Preview */}
          {content.trim() && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1 sm:mb-2">Preview:</p>
              <div className="flex items-center gap-2">
                {selectedEmoji && <span className="text-base sm:text-lg">{selectedEmoji}</span>}
                <span className="text-xs sm:text-sm text-slate-800">{content}</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 safe-area-bottom">
            <div className="text-[10px] sm:text-xs text-slate-500">
              Status akan otomatis hilang dalam 24 jam
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!content.trim() || wordCount > 25}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gov-600 text-white rounded-lg font-bold hover:bg-gov-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 sm:gap-2 text-sm"
              >
                <Send size={14} />
                Posting
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StatusModal;