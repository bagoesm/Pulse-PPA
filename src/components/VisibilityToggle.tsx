import React, { useState, useCallback } from 'react';
import { Lock, Unlock, Loader2 } from 'lucide-react';
import { VisibilityToggleProps } from '../../types';
import { useNotificationModal, useConfirmModal } from '../hooks/useModal';
import NotificationModal from './NotificationModal';
import ConfirmModal from './ConfirmModal';

/**
 * VisibilityToggle Component
 * 
 * Toggle button for locking/unlocking satker visibility.
 * Shows lock icon when locked, unlock icon when unlocked.
 * Includes confirmation dialog before toggle and handles loading/error states.
 * 
 * Requirements: 1.2, 1.3, 1.4, 1.5, 3.2, 3.3
 */
const VisibilityToggle: React.FC<VisibilityToggleProps> = ({
  satkerId,
  isLocked,
  onToggle,
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal hooks for notifications and confirmations
  const { modal: notificationModal, showNotification, hideNotification } = useNotificationModal();
  const { modal: confirmModal, showConfirm, hideConfirm } = useConfirmModal();

  /**
   * Handle toggle action with confirmation
   */
  const handleToggleClick = useCallback(() => {
    if (disabled || isLoading) return;

    const newStatus = !isLocked;
    const actionText = newStatus ? 'mengunci' : 'membuka kunci';
    const confirmTitle = newStatus ? 'Kunci Satker' : 'Buka Kunci Satker';
    const confirmMessage = newStatus
      ? 'Apakah Anda yakin ingin mengunci satker ini?\n\nSatker yang dikunci hanya dapat dilihat oleh admin dan anggota satker tersebut.'
      : 'Apakah Anda yakin ingin membuka kunci satker ini?\n\nSatker yang tidak dikunci dapat dilihat oleh semua user.';

    showConfirm(
      confirmTitle,
      confirmMessage,
      () => performToggle(newStatus, actionText),
      'warning',
      newStatus ? 'Kunci' : 'Buka Kunci',
      'Batal'
    );
  }, [isLocked, disabled, isLoading, showConfirm]);

  /**
   * Perform the actual toggle operation
   */
  const performToggle = async (newStatus: boolean, actionText: string) => {
    try {
      setIsLoading(true);
      await onToggle(satkerId, newStatus);
      
      showNotification(
        'Berhasil',
        `Satker berhasil di${newStatus ? 'kunci' : 'buka kunci'}.`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling visibility:', error);
      showNotification(
        'Error',
        `Gagal ${actionText} satker. Silakan coba lagi.`,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Determine button state
  const isDisabled = disabled || isLoading;
  const buttonLabel = isLocked ? 'Buka Kunci' : 'Kunci';
  const Icon = isLoading ? Loader2 : (isLocked ? Unlock : Lock);

  return (
    <>
      <button
        onClick={handleToggleClick}
        disabled={isDisabled}
        aria-label={buttonLabel}
        title={buttonLabel}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium 
          transition-all duration-200
          ${isLocked 
            ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' 
            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-offset-1
          ${isLocked ? 'focus:ring-green-300' : 'focus:ring-red-300'}
        `}
      >
        <Icon 
          size={14} 
          className={isLoading ? 'animate-spin' : ''} 
        />
        <span className="hidden sm:inline">{buttonLabel}</span>
      </button>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={hideConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={hideNotification}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
        autoClose={notificationModal.type === 'success'}
        autoCloseDelay={3000}
      />
    </>
  );
};

export default VisibilityToggle;
