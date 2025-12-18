import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, Trash2, ZoomIn, ZoomOut, RotateCw, Check, AlertCircle } from 'lucide-react';
import { User } from '../../types';

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSave: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const PREVIEW_SIZE = 256; // Preview container size in pixels

const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
  onRemove,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Draw preview on canvas whenever parameters change
  useEffect(() => {
    if (!previewUrl || !previewCanvasRef.current || !loadedImageRef.current) return;
    
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = loadedImageRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    
    // Create circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Fill background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

    // Calculate base dimensions (cover behavior)
    const imgAspect = img.width / img.height;
    let baseWidth, baseHeight;
    
    if (imgAspect > 1) {
      baseHeight = PREVIEW_SIZE;
      baseWidth = PREVIEW_SIZE * imgAspect;
    } else {
      baseWidth = PREVIEW_SIZE;
      baseHeight = PREVIEW_SIZE / imgAspect;
    }
    
    // Apply zoom
    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;
    
    // Calculate position (centered + offset)
    const x = (PREVIEW_SIZE - drawWidth) / 2 + position.x;
    const y = (PREVIEW_SIZE - drawHeight) / 2 + position.y;

    // Apply rotation around center
    ctx.translate(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-PREVIEW_SIZE / 2, -PREVIEW_SIZE / 2);

    // Draw image
    ctx.drawImage(img, x, y, drawWidth, drawHeight);
    ctx.restore();
    
  }, [previewUrl, zoom, rotation, position]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG, GIF)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Ukuran file maksimal 1MB');
      return;
    }

    setError(null);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        loadedImageRef.current = img;
        setImageSize({ width: img.width, height: img.height });
        setPreviewUrl(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG, GIF)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Ukuran file maksimal 1MB');
      return;
    }

    setError(null);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      const img = new Image();
      img.onload = () => {
        loadedImageRef.current = img;
        setImageSize({ width: img.width, height: img.height });
        setPreviewUrl(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewUrl) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const cropAndSave = async () => {
    if (!previewUrl || !canvasRef.current || !loadedImageRef.current) return;

    setIsLoading(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const outputSize = 256;
      canvas.width = outputSize;
      canvas.height = outputSize;

      const img = loadedImageRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, outputSize, outputSize);

      // Create circular clip
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Calculate base dimensions (same as preview)
      const imgAspect = img.width / img.height;
      let baseWidth, baseHeight;
      
      if (imgAspect > 1) {
        baseHeight = outputSize;
        baseWidth = outputSize * imgAspect;
      } else {
        baseWidth = outputSize;
        baseHeight = outputSize / imgAspect;
      }
      
      // Apply zoom
      const drawWidth = baseWidth * zoom;
      const drawHeight = baseHeight * zoom;
      
      // Calculate position (centered + offset)
      const x = (outputSize - drawWidth) / 2 + position.x;
      const y = (outputSize - drawHeight) / 2 + position.y;

      // Apply rotation around center
      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-outputSize / 2, -outputSize / 2);

      // Draw image
      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      ctx.restore();

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.9
        );
      });

      const croppedFile = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
      
      await onSave(croppedFile);
      onClose();
    } catch (err) {
      console.error('Error cropping image:', err);
      setError('Gagal memproses gambar. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    try {
      await onRemove();
      onClose();
    } catch (err) {
      console.error('Error removing photo:', err);
      setError('Gagal menghapus foto. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setPreviewUrl(null);
    setError(null);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    loadedImageRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">Foto Profil</h3>
          <button
            onClick={() => { resetState(); onClose(); }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!previewUrl ? (
            /* Upload Area */
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-gov-400 hover:bg-gov-50/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                {currentUser.profilePhoto ? (
                  <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <Camera size={32} className="text-slate-400" />
                )}
              </div>
              
              <p className="text-slate-600 font-medium mb-1">Klik atau drag foto ke sini</p>
              <p className="text-slate-400 text-sm">JPG, PNG, GIF • Maksimal 1MB</p>
            </div>
          ) : (
            /* Crop Area */
            <div>
              {/* Preview Canvas */}
              <div
                className="relative w-64 h-64 mx-auto mb-4 cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <canvas
                  ref={previewCanvasRef}
                  width={PREVIEW_SIZE}
                  height={PREVIEW_SIZE}
                  className="rounded-full"
                  style={{ width: '256px', height: '256px' }}
                />
                {/* Crop overlay border */}
                <div className="absolute inset-0 border-4 border-slate-300 rounded-full pointer-events-none" />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 mb-4">
                {/* Zoom */}
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    className="p-2 hover:bg-slate-200 rounded-md transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={18} className="text-slate-600" />
                  </button>
                  <span className="text-sm text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                    className="p-2 hover:bg-slate-200 rounded-md transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={18} className="text-slate-600" />
                  </button>
                </div>

                {/* Rotate */}
                <button
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Rotate"
                >
                  <RotateCw size={18} className="text-slate-600" />
                </button>
              </div>

              {/* Change Photo Button */}
              <button
                onClick={() => { resetState(); fileInputRef.current?.click(); }}
                className="w-full py-2 text-sm text-gov-600 hover:text-gov-700 font-medium"
              >
                Pilih foto lain
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Hidden canvas for final crop */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
          {currentUser.profilePhoto && !previewUrl ? (
            <button
              onClick={handleRemove}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              Hapus Foto
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => { resetState(); onClose(); }}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Batal
            </button>
            {previewUrl && (
              <button
                onClick={cropAndSave}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gov-600 text-white rounded-lg font-medium hover:bg-gov-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Simpan
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePhotoModal;
