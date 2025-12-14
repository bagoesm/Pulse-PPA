import { useState, useCallback } from 'react';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface ConfirmModalState extends ModalState {
  onConfirm: () => void;
  confirmText: string;
  cancelText: string;
}

export const useNotificationModal = () => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showNotification = useCallback((
    title: string, 
    message: string, 
    type: 'success' | 'warning' | 'error' | 'info' = 'info'
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type
    });
  }, []);

  const hideNotification = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    modal,
    showNotification,
    hideNotification
  };
};

export const useConfirmModal = () => {
  const [modal, setModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
    confirmText: 'Konfirmasi',
    cancelText: 'Batal'
  });

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'success' | 'warning' | 'error' | 'info' = 'warning',
    confirmText: string = 'Konfirmasi',
    cancelText: string = 'Batal'
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    modal,
    showConfirm,
    hideConfirm
  };
};