import React, { useState, useRef, useEffect } from 'react';
import { X, Download, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';
import { Task, User } from '../../types';
import { addRoundRectSupport, loadImage, loadSVGAsImage, getWeekRange } from '../lib/canvasUtils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  users: User[];
  currentUser: User | null;
}

interface BackgroundOption {
  id: string;
  name: string;
  url: string;
  type: 'unsplash' | 'upload';
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  tasks,
  users,
  currentUser
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState<BackgroundOption | null>(null);
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({
    completed: 0,
    inProgress: 0,
    total: 0,
    completionRate: 0
  });

  // Default background options from Unsplash
  const defaultBackgrounds: BackgroundOption[] = [
    {
      id: 'gradient-1',
      name: 'Blue Gradient',
      url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=711&fit=crop',
      type: 'unsplash'
    },
    {
      id: 'gradient-2', 
      name: 'Purple Gradient',
      url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=711&fit=crop',
      type: 'unsplash'
    },
    {
      id: 'minimal-1',
      name: 'Minimal White',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=711&fit=crop',
      type: 'unsplash'
    },
    {
      id: 'nature-1',
      name: 'Nature',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=711&fit=crop',
      type: 'unsplash'
    }
  ];

  // Calculate weekly stats
  useEffect(() => {
    if (!currentUser) return;

    const { startOfWeek, endOfWeek } = getWeekRange();

    const userTasks = tasks.filter(task => 
      Array.isArray(task.pic) ? task.pic.includes(currentUser.name) : task.pic === currentUser.name
    );

    const weeklyTasks = userTasks.filter(task => {
      const taskDate = new Date(task.startDate);
      return taskDate >= startOfWeek && taskDate <= endOfWeek;
    });

    const completed = weeklyTasks.filter(task => task.status === 'Done').length;
    const inProgress = weeklyTasks.filter(task => task.status !== 'Done').length;
    const total = weeklyTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    setWeeklyStats({ completed, inProgress, total, completionRate });
  }, [tasks, currentUser]);

  // Set default background
  useEffect(() => {
    if (defaultBackgrounds.length > 0 && !selectedBackground) {
      setSelectedBackground(defaultBackgrounds[0]);
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomBackground(result);
        setSelectedBackground({
          id: 'custom',
          name: 'Custom Upload',
          url: result,
          type: 'upload'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!canvasRef.current || !currentUser || !selectedBackground) return;

    setIsGenerating(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Add roundRect support for older browsers
      addRoundRectSupport(ctx);

      // Set canvas size (9:16 ratio)
      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;

      // Load background image
      const bgImage = await loadImage(selectedBackground.url);

      // Draw background
      ctx.drawImage(bgImage, 0, 0, width, height);

      // Add dark overlay for better text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, width, height);

      // Add gradient overlay from bottom
      const gradient = ctx.createLinearGradient(0, height * 0.6, 0, height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Load and draw logo
      try {
        const logoImage = await loadSVGAsImage('/Logo.svg');
        const logoSize = 120; // Logo size
        const logoX = 80; // Left margin
        const logoY = 80; // Top margin
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
      } catch (error) {
        console.warn('Could not load logo:', error);
      }

      // Add hashtag in top right corner
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText('#AyoJoinPulse', width - 80, 120);

      // Text styling - Left aligned
      ctx.textAlign = 'left';
      ctx.fillStyle = 'white';

      const leftMargin = 80;
      let currentY = 350; // Much more spacing between logo and content

      // Title
      ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
      ctx.fillText('Progress Mingguan', leftMargin, currentY);
      currentY += 80;

      // User name
      ctx.font = '48px system-ui, -apple-system, sans-serif';
      ctx.fillText(currentUser.name, leftMargin, currentY);
      currentY += 60;

      // Date range
      const { startOfWeek, endOfWeek } = getWeekRange();
      
      ctx.font = '36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(
        `${startOfWeek.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        leftMargin,
        currentY
      );
      currentY += 180; // Increased spacing between date and task data

      // Stats section - vertical layout (angka dulu, judul di bawah)
      ctx.fillStyle = 'white';
      
      // Completed tasks
      ctx.font = 'bold 120px system-ui, -apple-system, sans-serif';
      ctx.fillText(weeklyStats.completed.toString(), leftMargin, currentY);
      currentY += 60;
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillText('TUGAS SELESAI', leftMargin, currentY);
      currentY += 150; // Increased spacing between sections

      // In progress tasks  
      ctx.font = 'bold 120px system-ui, -apple-system, sans-serif';
      ctx.fillText(weeklyStats.inProgress.toString(), leftMargin, currentY);
      currentY += 60;
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillText('TUGAS BERJALAN', leftMargin, currentY);
      currentY += 150; // Increased spacing between sections

      // Total tasks
      ctx.font = 'bold 120px system-ui, -apple-system, sans-serif';
      ctx.fillText(weeklyStats.total.toString(), leftMargin, currentY);
      currentY += 60;
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillText('TOTAL TUGAS', leftMargin, currentY);
      currentY += 150; // Increased spacing between sections

      // Completion rate
      ctx.font = 'bold 120px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${weeklyStats.completionRate}%`, leftMargin, currentY);
      currentY += 60;
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillText('TINGKAT PENYELESAIAN', leftMargin, currentY);
      currentY += 150; // Increased spacing between sections

      // Performance message - Always show vision
      const performanceMessage = 'Perempuan Berdaya Anak Terlindungi Menuju Indonesia Emas 2045';

      // Font size for the vision message
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      
      // Handle text wrapping for the vision message
      const maxWidth = width - 160; // Account for margins
      const words = performanceMessage.split(' ');
      let line = '';
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, leftMargin, currentY);
          line = words[n] + ' ';
          currentY += 45; // Line height for wrapped text
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, leftMargin, currentY);

      // Footer
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Dibuat Oleh Pulse, Manajemen Kerja Kemen PPPA', width / 2, height - 100);
      
      const currentDate = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      ctx.fillText(currentDate, width / 2, height - 60);

    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `weekly-progress-${currentUser?.name}-${new Date().toISOString().split('T')[0]}.jpg`;
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  // Generate image when modal opens or background changes
  useEffect(() => {
    if (isOpen && selectedBackground) {
      generateImage();
    }
  }, [isOpen, selectedBackground, weeklyStats]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Share Weekly Progress</h2>
            <p className="text-sm text-slate-600">Generate and share your task summary</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
          {/* Controls */}
          <div className="lg:w-1/3 p-6 border-r border-slate-200 overflow-y-auto">
            <div className="space-y-6">
              {/* Stats Preview */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Weekly Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Completed:</span>
                    <span className="font-medium text-green-600">{weeklyStats.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">In Progress:</span>
                    <span className="font-medium text-blue-600">{weeklyStats.inProgress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Tasks:</span>
                    <span className="font-medium">{weeklyStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Completion Rate:</span>
                    <span className="font-medium text-purple-600">{weeklyStats.completionRate}%</span>
                  </div>
                </div>
              </div>

              {/* Background Selection */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Background</h3>
                
                {/* Upload Custom Background */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mb-3 p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-gov-400 transition-colors flex items-center justify-center gap-2 text-slate-600 hover:text-gov-600"
                >
                  <Upload size={16} />
                  Upload Custom Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Default Backgrounds */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {defaultBackgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBackground(bg)}
                      className={`relative w-20 h-36 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedBackground?.id === bg.id
                          ? 'border-gov-500 ring-2 ring-gov-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={bg.url}
                        alt={bg.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-end p-1">
                        <span className="text-white text-[10px] font-medium leading-tight">{bg.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={generateImage}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gov-600 text-white rounded-lg font-medium hover:bg-gov-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ImageIcon size={16} />
                      Regenerate
                    </>
                  )}
                </button>

                <button
                  onClick={downloadImage}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <Download size={16} />
                  Download JPG
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:w-2/3 p-6 overflow-y-auto">
            <div className="text-center">
              <h3 className="font-semibold text-slate-800 mb-4">Preview</h3>
              <div className="inline-block bg-slate-100 p-4 rounded-lg">
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto border border-slate-200 rounded-lg shadow-sm"
                  style={{ maxHeight: '500px' }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Image will be generated at 1080x1920 pixels (9:16 ratio)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;