import { useNotificationModal, useConfirmModal } from './useModal';

export const useModals = () => {
    const {
        modal: notificationModal,
        showNotification,
        hideNotification
    } = useNotificationModal();

    const {
        modal: confirmModal,
        showConfirm,
        hideConfirm
    } = useConfirmModal();

    return {
        notificationModal,
        showNotification,
        hideNotification,
        confirmModal,
        showConfirm,
        hideConfirm,
        // Helper for common error notification
        showError: (title: string, message: string) => showNotification(title, message, 'error'),
        // Helper for common success notification
        showSuccess: (title: string, message: string) => showNotification(title, message, 'success')
    };
};
