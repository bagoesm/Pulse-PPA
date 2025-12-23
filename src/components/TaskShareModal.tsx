import React, { useState, useRef, useEffect } from 'react';
import { X, Download, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';
import { Task, User, Priority } from '../../types';
import { addRoundRectSupport, loadImage, loadSVGAsImage } from '../lib/canvasUtils';

interface TaskShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  users: User[];
}

interface BackgroundOption {
  id: string;
  name: string;
  url: string;
  type: 'unsplash' | 'upload';
}

const TaskShareModal: React.FC<TaskShareModalProps> = ({
  isOpen,
  onClose,
  task,
  users
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState<BackgroundOption | null>(null);
  const [customBackground, setCustomBackground] = useState<string | null>(null);

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

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.Urgent:
        return '#ef4444'; // red-500
      case Priority.High:
        return '#f97316'; // orange-500
      case Priority.Medium:
        return '#3b82f6'; // blue-500
      case Priority.Low:
        return '#6b7280'; // gray-500
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done':
        return '#22c55e'; // green-500
      case 'In Progress':
        return '#3b82f6'; // blue-500
      case 'Review':
        return '#8b5cf6'; // purple-500
      case 'Pending':
        return '#f59e0b'; // amber-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  const generateImage = async () => {
    if (!canvasRef.current || !selectedBackground) return;

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
        const logoSize = 100; // Logo size (slightly smaller for task modal)
        const logoX = 80; // Left margin
        const logoY = 60; // Top margin
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
      } catch (error) {
        console.warn('Could not load logo:', error);
      }

      // Add hashtag in top right corner
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.fillText('#AyoJoinPulse', width - 80, 100);

      // Text styling - Left aligned
      ctx.textAlign = 'left';
      ctx.fillStyle = 'white';

      const leftMargin = 80;
      let currentY = 300; // Much more spacing between logo and content

      // Title
      ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
      ctx.fillText('Update Tugas', leftMargin, currentY);
      currentY += 100;

      // Task title (with text wrapping)
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      const maxWidth = width - 160; // Account for left margin
      const words = task.title.split(' ');
      let line = '';

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, leftMargin, currentY);
          line = words[n] + ' ';
          currentY += 60;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, leftMargin, currentY);
      currentY += 150; // Increased spacing between task title and data

      // Category
      ctx.font = '40px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(task.category, leftMargin, currentY);
      currentY += 50;
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'white';
      ctx.fillText('KATEGORI', leftMargin, currentY);
      currentY += 120; // Increased spacing between sections

      // Status
      ctx.font = 'bold 60px system-ui, -apple-system, sans-serif';
      ctx.fillText(task.status, leftMargin, currentY);
      currentY += 50;
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText('STATUS', leftMargin, currentY);
      currentY += 120; // Increased spacing between sections

      // Priority
      ctx.font = 'bold 60px system-ui, -apple-system, sans-serif';
      ctx.fillText(task.priority, leftMargin, currentY);
      currentY += 50;
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText('PRIORITAS', leftMargin, currentY);
      currentY += 120; // Increased spacing between sections

      // Deadline info
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      const deadlineDate = new Date(task.deadline).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      ctx.fillText(deadlineDate, leftMargin, currentY);
      currentY += 50;
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText('BATAS WAKTU', leftMargin, currentY);
      currentY += 120; // Increased spacing between sections

      // PIC info
      if (task.pic && task.pic.length > 0) {
        ctx.font = '36px system-ui, -apple-system, sans-serif';
        const picNames = Array.isArray(task.pic) ? task.pic.join(', ') : task.pic;
        ctx.fillText(picNames, leftMargin, currentY);
        currentY += 50;
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.fillText('PENANGGUNG JAWAB', leftMargin, currentY);
      }

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
    link.download = `task-${task.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.jpg`;
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  // Generate image when modal opens or background changes
  useEffect(() => {
    if (isOpen && selectedBackground) {
      generateImage();
    }
  }, [isOpen, selectedBackground, task]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Share Task</h2>
            <p className="text-sm text-slate-600">Generate and share task information</p>
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
              {/* Task Info Preview */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Task Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-600 block">Title:</span>
                    <span className="font-medium">{task.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Category:</span>
                    <span className="font-medium">{task.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Status:</span>
                    <span className="font-medium">{task.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Priority:</span>
                    <span className="font-medium">{task.priority}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Deadline:</span>
                    <span className="font-medium">
                      {new Date(task.deadline).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  {task.pic && task.pic.length > 0 && (
                    <div>
                      <span className="text-slate-600 block">Assigned to:</span>
                      <span className="font-medium">
                        {Array.isArray(task.pic) ? task.pic.join(', ') : task.pic}
                      </span>
                    </div>
                  )}
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
                      className={`relative w-20 h-36 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${selectedBackground?.id === bg.id
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

export default TaskShareModal;