import { supabase } from '../lib/supabaseClient';
import { NotificationType, Disposisi, User } from '../../types';

/**
 * NotificationService handles creation and management of notifications for Disposisi
 */
export class NotificationService {
  /**
   * Create a notification using RPC function (bypasses RLS for cross-user notifications)
   */
  private static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    taskId?: string,
    taskTitle?: string,
    meetingId?: string,
    meetingTitle?: string,
    disposisiId?: string,
    disposisiText?: string
  ): Promise<any> {
    try {
      // Check for duplicate notifications based on type (using 'assignment' for disposisi)
      if (type === 'assignment' && disposisiId) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('disposisi_id', disposisiId)
          .eq('type', type)
          .limit(1);

        if (existing && existing.length > 0) {
          return null; // Skip duplicate
        }
      }

      if (type === 'deadline' && disposisiId) {
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('disposisi_id', disposisiId)
          .eq('type', type)
          .gte('created_at', today)
          .limit(1);

        if (existing && existing.length > 0) {
          return null; // Skip duplicate deadline notification for today
        }
      }

      // Use RPC function to bypass RLS for cross-user notifications
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_task_id: taskId || null,
        p_task_title: taskTitle || null,
        p_meeting_id: meetingId || null,
        p_meeting_title: meetingTitle || null,
        p_disposisi_id: disposisiId || null,
        p_disposisi_text: disposisiText || null
      });

      if (error) {
        console.error('Failed to create notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  /**
   * Create notification when a user is assigned to a Disposisi
   * Validates: Requirements 8.1
   */
  static async createDisposisiAssignmentNotification(
    disposisi: Disposisi,
    assignerName: string,
    suratNumber: string,
    kegiatanTitle: string
  ): Promise<void> {
    try {
      // Get the assigned user's profile
      const { data: user, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', disposisi.assignedTo)
        .single();

      if (error || !user) {
        console.error('Failed to fetch assigned user:', error);
        return;
      }

      // Don't notify if the assigner is the same as the assignee
      if (user.name === assignerName) {
        return;
      }

      const message = `${assignerName} menugaskan Anda untuk disposisi Surat "${suratNumber}" terkait kegiatan "${kegiatanTitle}"`;

      await this.createNotification(
        user.id,
        'assignment',
        '📋 Disposisi Baru',
        message,
        undefined, // No task ID
        undefined, // No task title
        disposisi.kegiatanId, // Meeting ID
        kegiatanTitle, // Meeting title
        disposisi.id,
        disposisi.disposisiText
      );
    } catch (error) {
      console.error('Error creating disposisi assignment notification:', error);
    }
  }

  /**
   * Create notification when a Disposisi is updated
   * Validates: Requirements 8.5
   */
  static async createDisposisiUpdateNotification(
    disposisi: Disposisi,
    updaterName: string,
    suratNumber: string,
    kegiatanTitle: string,
    changeDescription: string
  ): Promise<void> {
    try {
      // Get the assigned user's profile
      const { data: user, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', disposisi.assignedTo)
        .single();

      if (error || !user) {
        console.error('Failed to fetch assigned user:', error);
        return;
      }

      // Don't notify if the updater is the same as the assignee
      if (user.name === updaterName) {
        return;
      }

      const message = `${updaterName} memperbarui disposisi Anda untuk Surat "${suratNumber}": ${changeDescription}`;

      await this.createNotification(
        user.id,
        'comment',
        '🔄 Disposisi Diperbarui',
        message,
        undefined, // No task ID
        undefined, // No task title
        disposisi.kegiatanId, // Meeting ID
        kegiatanTitle, // Meeting title
        disposisi.id,
        disposisi.disposisiText
      );
    } catch (error) {
      console.error('Error creating disposisi update notification:', error);
    }
  }

  /**
   * Create reminder notification for approaching deadlines
   * Validates: Requirements 8.4
   */
  static async createDisposisiDeadlineReminder(
    disposisi: Disposisi,
    suratNumber: string,
    kegiatanTitle: string
  ): Promise<void> {
    try {
      // Only create reminder if status is not Completed or Cancelled
      if (disposisi.status === 'Completed' || disposisi.status === 'Cancelled') {
        return;
      }

      // Get the assigned user's profile
      const { data: user, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', disposisi.assignedTo)
        .single();

      if (error || !user) {
        console.error('Failed to fetch assigned user:', error);
        return;
      }

      const deadlineDate = new Date(disposisi.deadline!);
      const formattedDate = deadlineDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const message = `Disposisi untuk Surat "${suratNumber}" terkait kegiatan "${kegiatanTitle}" akan berakhir pada ${formattedDate}`;

      await this.createNotification(
        user.id,
        'deadline',
        '⏰ Deadline Disposisi Mendekat',
        message,
        undefined, // No task ID
        undefined, // No task title
        disposisi.kegiatanId, // Meeting ID
        kegiatanTitle, // Meeting title
        disposisi.id,
        disposisi.disposisiText
      );
    } catch (error) {
      console.error('Error creating disposisi deadline reminder:', error);
    }
  }

  /**
   * Check all disposisi for approaching deadlines and create reminders
   * This should be called periodically (e.g., daily)
   */
  static async checkAndCreateDeadlineReminders(): Promise<void> {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      // Fetch all disposisi with deadlines within next 24 hours
      const { data: disposisiList, error } = await supabase
        .from('disposisi')
        .select(`
          *,
          surats:surat_id (nomor_surat),
          meetings:kegiatan_id (title)
        `)
        .not('deadline', 'is', null)
        .lte('deadline', tomorrow.toISOString())
        .gte('deadline', now.toISOString())
        .in('status', ['Pending', 'In Progress']);

      if (error) {
        console.error('Failed to fetch disposisi for deadline reminders:', error);
        return;
      }

      if (!disposisiList || disposisiList.length === 0) {
        return;
      }

      // Create reminders for each disposisi
      for (const disposisi of disposisiList) {
        const suratNumber = (disposisi as any).surats?.nomor_surat || 'Unknown';
        const kegiatanTitle = (disposisi as any).meetings?.title || 'Unknown';

        await this.createDisposisiDeadlineReminder(
          {
            id: disposisi.id,
            suratId: disposisi.surat_id,
            kegiatanId: disposisi.kegiatan_id,
            assignedTo: disposisi.assigned_to,
            disposisiText: disposisi.disposisi_text,
            status: disposisi.status,
            deadline: disposisi.deadline,
            laporan: disposisi.laporan,
            attachments: disposisi.attachments,
            notes: disposisi.notes,
            createdBy: disposisi.created_by,
            createdAt: disposisi.created_at,
            updatedAt: disposisi.updated_at,
            completedAt: disposisi.completed_at,
            completedBy: disposisi.completed_by
          },
          suratNumber,
          kegiatanTitle
        );
      }
    } catch (error) {
      console.error('Error checking deadline reminders:', error);
    }
  }

  /**
   * Create notifications for multiple users when they are assigned to a Disposisi
   */
  static async createMultiUserAssignmentNotifications(
    disposisiList: Disposisi[],
    assignerName: string,
    suratNumber: string,
    kegiatanTitle: string
  ): Promise<void> {
    for (const disposisi of disposisiList) {
      await this.createDisposisiAssignmentNotification(
        disposisi,
        assignerName,
        suratNumber,
        kegiatanTitle
      );
    }
  }
}
