import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Notification, Task, User, NotificationType } from '../../types';

interface UseNotificationsProps {
  currentUser: User | null;
  tasks: Task[];
  onTaskNavigation: (taskId: string) => void;
  onMeetingNavigation?: (meetingId: string) => void;
  onDisposisiNavigation?: (disposisiId: string) => void;
}

interface DbNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  task_id: string | null;
  task_title: string;
  meeting_id?: string;
  meeting_title?: string;
  disposisi_id?: string;
  disposisi_text?: string;
  is_read: boolean;
  created_at: string;
}

const mapDbToNotification = (n: DbNotification): Notification => ({
  id: n.id,
  userId: n.user_id,
  type: n.type,
  title: n.title,
  message: n.message,
  taskId: n.task_id || '',
  taskTitle: n.task_title,
  meetingId: n.meeting_id,
  meetingTitle: n.meeting_title,
  disposisiId: n.disposisi_id,
  disposisiText: n.disposisi_text,
  isRead: n.is_read,
  isDismissed: false,
  createdAt: n.created_at,
  expiresAt: new Date(new Date(n.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
});

export const useNotifications = ({ currentUser, tasks, onTaskNavigation, onMeetingNavigation, onDisposisiNavigation }: UseNotificationsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const deadlineCheckDone = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!currentUser || isLoading) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Dedupe by id just in case
      const mapped = (data || []).map(mapDbToNotification);
      const uniqueNotifications = mapped.filter((n, index, self) =>
        index === self.findIndex(t => t.id === n.id)
      );
      setNotifications(uniqueNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isLoading]);

  // Create notification using RPC function (bypasses RLS for cross-user notifications)
  const createNotification = useCallback(async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    taskId: string | null,
    taskTitle: string,
    meetingId?: string,
    meetingTitle?: string
  ) => {
    try {
      // For deadline type, check if notification already exists today
      if (type === 'deadline') {
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('task_id', taskId)
          .eq('type', type)
          .gte('created_at', today)
          .limit(1);

        if (existing && existing.length > 0) {
          return null; // Skip duplicate deadline notification
        }
      }

      // For meeting notifications, check if already exists for this meeting
      if ((type === 'meeting_pic' || type === 'meeting_invitee') && meetingId) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('meeting_id', meetingId)
          .eq('type', type)
          .limit(1);

        if (existing && existing.length > 0) {
          return null; // Skip duplicate meeting notification
        }
      }

      // Use RPC function to bypass RLS for cross-user notifications
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_task_id: taskId && taskId.length > 0 ? taskId : null,
        p_task_title: taskTitle || null,
        p_meeting_id: meetingId || null,
        p_meeting_title: meetingTitle || null
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
  }, []);

  // Create comment notification
  const createCommentNotification = useCallback(async (
    itemId: string, // task or meeting ID
    itemTitle: string,
    commenterName: string,
    picsToNotify: string[],
    isMeeting: boolean = false
  ) => {
    if (!currentUser) return;

    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name')
        .in('name', picsToNotify);

      if (!users) return;

      // Notify all PICs except the commenter
      const targetUsers = users.filter(u => u.name !== commenterName);

      const notificationType: NotificationType = isMeeting ? 'meeting_comment' : 'comment';

      for (const user of targetUsers) {
        await createNotification(
          user.id,
          notificationType,
          'Komentar Baru',
          `${commenterName} menambahkan komentar pada ${isMeeting ? 'jadwal' : 'task'} "${itemTitle}"`,
          !isMeeting ? itemId : null,
          !isMeeting ? itemTitle : '',
          isMeeting ? itemId : undefined,
          isMeeting ? itemTitle : undefined
        );
      }

      // Refresh if current user is a target
      if (targetUsers.some(u => u.id === currentUser.id)) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error creating comment notification:', error);
    }
  }, [currentUser, createNotification, fetchNotifications]);

  // Create mention notification (when user is mentioned in a comment)
  const createMentionNotification = useCallback(async (
    entityId: string,
    entityTitle: string,
    mentionerName: string,
    mentionedNames: string[],
    isMeeting: boolean = false
  ) => {
    if (!currentUser || mentionedNames.length === 0) return;

    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name')
        .in('name', mentionedNames);

      if (!users || users.length === 0) return;

      // Notify all mentioned users except the mentioner
      const targetUsers = users.filter(u => u.name !== mentionerName);

      const notificationType: NotificationType = isMeeting ? 'meeting_mention' : 'comment';
      const labelType = isMeeting ? 'jadwal kegiatan' : 'task';

      for (const user of targetUsers) {
        await createNotification(
          user.id,
          notificationType,
          'Anda Di-mention',
          `${mentionerName} menyebut Anda dalam komentar pada ${labelType} "${entityTitle}"`,
          isMeeting ? null : entityId, // taskId
          isMeeting ? '' : entityTitle, // taskTitle
          isMeeting ? entityId : undefined, // meetingId
          isMeeting ? entityTitle : undefined // meetingTitle
        );
      }

      // Refresh if current user is a target
      if (targetUsers.some(u => u.id === currentUser.id)) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error creating mention notification:', error);
    }
  }, [currentUser, createNotification, fetchNotifications]);

  // Create assignment notification (when user is assigned as PIC)
  const createAssignmentNotification = useCallback(async (
    taskId: string,
    taskTitle: string,
    assignerName: string,
    newPics: string[],
    oldPics: string[] = [],
    isNewTask: boolean = false
  ) => {
    if (!currentUser) return;

    try {
      // Find PICs that are newly assigned (not in oldPics)
      const newlyAssignedPics = newPics.filter(pic => !oldPics.includes(pic));

      // Don't notify the person who created/edited the task
      const picsToNotify = newlyAssignedPics.filter(pic => pic !== assignerName);

      if (picsToNotify.length === 0) return;

      const { data: users } = await supabase
        .from('profiles')
        .select('id, name')
        .in('name', picsToNotify);

      if (!users || users.length === 0) return;

      for (const user of users) {
        const message = isNewTask
          ? `${assignerName} menugaskan Anda sebagai PIC pada task baru "${taskTitle}"`
          : `${assignerName} menambahkan Anda sebagai PIC pada task "${taskTitle}"`;

        await createNotification(
          user.id,
          'assignment',
          isNewTask ? 'Task Baru' : 'Ditugaskan ke Task',
          message,
          taskId,
          taskTitle
        );
      }

      // Refresh if current user is a target
      if (users.some(u => u.id === currentUser.id)) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error creating assignment notification:', error);
    }
  }, [currentUser, createNotification, fetchNotifications]);

  // Check and create deadline notifications
  const checkDeadlines = useCallback(async () => {
    if (!currentUser || tasks.length === 0) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Find tasks with deadlines within next 24 hours where user is PIC
    const upcomingTasks = tasks.filter(task => {
      if (task.status === 'Done') return false;

      const deadline = new Date(task.deadline);
      const isWithin24Hours = deadline <= tomorrow && deadline >= now;

      const pics = Array.isArray(task.pic) ? task.pic : [task.pic];
      const isUserPic = pics.includes(currentUser.name);

      return isWithin24Hours && isUserPic;
    });

    // Create notifications (database handles duplicates)
    for (const task of upcomingTasks) {
      await createNotification(
        currentUser.id,
        'deadline',
        'Deadline Mendekat',
        `Task "${task.title}" akan berakhir dalam 24 jam (${new Date(task.deadline).toLocaleDateString('id-ID')})`,
        task.id,
        task.title
      );
    }

    if (upcomingTasks.length > 0) {
      fetchNotifications();
    }
  }, [currentUser, tasks, createNotification, fetchNotifications]);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [currentUser]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Check if it's a disposisi notification
    const isDisposisiNotification = notification.type === 'disposisi_assignment' ||
      notification.type === 'disposisi_updated' ||
      notification.type === 'disposisi_deadline';

    if (isDisposisiNotification && notification.disposisiId && onDisposisiNavigation) {
      onDisposisiNavigation(notification.disposisiId);
      return;
    }

    // Check if it's a meeting notification (includes meeting mentions and comments)
    const isMeetingNotification = notification.type === 'meeting_pic' ||
      notification.type === 'meeting_invitee' ||
      notification.type === 'meeting_mention' ||
      notification.type === 'meeting_comment';

    if (isMeetingNotification && notification.meetingId && onMeetingNavigation) {
      onMeetingNavigation(notification.meetingId);
    } else if (notification.taskId) {
      onTaskNavigation(notification.taskId);
    }
  }, [markAsRead, onTaskNavigation, onMeetingNavigation, onDisposisiNavigation]);

  // Dismiss all (just mark as read for simplicity)
  const dismissAllNotifications = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  // Initialize: fetch notifications when user changes
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      deadlineCheckDone.current = false;
      lastUserId.current = null;
      return;
    }

    // Only fetch if user changed
    if (lastUserId.current !== currentUser.id) {
      lastUserId.current = currentUser.id;
      deadlineCheckDone.current = false;
      fetchNotifications();
    }
  }, [currentUser?.id, fetchNotifications]);

  // Check deadlines once per session
  useEffect(() => {
    if (!currentUser || tasks.length === 0 || deadlineCheckDone.current) return;

    const timer = setTimeout(() => {
      deadlineCheckDone.current = true;
      checkDeadlines();
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentUser?.id, tasks.length, checkDeadlines]);

  // Check disposisi deadlines periodically (every 6 hours)
  useEffect(() => {
    if (!currentUser) return;

    const checkDisposisiDeadlines = async () => {
      try {
        // Import dynamically to avoid circular dependencies
        const { disposisiService } = await import('../services/DisposisiService');
        await disposisiService.checkAndCreateDeadlineReminders();
      } catch (error) {
        console.error('Error checking disposisi deadlines:', error);
      }
    };

    // Check immediately on mount
    checkDisposisiDeadlines();

    // Then check every 6 hours
    const interval = setInterval(checkDisposisiDeadlines, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = mapDbToNotification(payload.new as DbNotification);
            // Check if notification already exists to prevent duplicates
            setNotifications(prev => {
              if (prev.some(n => n.id === newNotif.id)) {
                return prev; // Already exists, don't add
              }
              return [newNotif, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToNotification(payload.new as DbNotification);
            setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Cleanup old notifications periodically (every 6 hours)
  useEffect(() => {
    const cleanup = async () => {
      try {
        await supabase.rpc('cleanup_old_notifications');
      } catch (e) {
        // Ignore cleanup errors
      }
    };

    cleanup();
    const interval = setInterval(cleanup, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Create meeting notification (when user is assigned as PIC or invited)
  const createMeetingNotification = useCallback(async (
    meetingId: string,
    meetingTitle: string,
    meetingDate: string,
    picNames: string[],
    inviteeNames: string[],
    creatorName: string,
    allUsers: User[]
  ) => {
    if (!currentUser) return;

    try {
      // Notify PICs (excluding creator)
      for (const picName of picNames) {
        if (picName === creatorName) continue; // Don't notify creator

        const user = allUsers.find(u => u.name === picName);
        if (!user) continue;

        await createNotification(
          user.id,
          'meeting_pic',
          '📅 Anda ditunjuk sebagai PIC',
          `${creatorName} menunjuk Anda sebagai PIC untuk jadwal "${meetingTitle}" pada ${meetingDate}`,
          null, // No task ID
          '', // No task title
          meetingId,
          meetingTitle
        );
      }

      // Notify invitees (excluding creator and PICs)
      for (const inviteeName of inviteeNames) {
        if (inviteeName === creatorName) continue;
        if (picNames.includes(inviteeName)) continue; // Already notified as PIC

        const user = allUsers.find(u => u.name === inviteeName);
        if (!user) continue;

        await createNotification(
          user.id,
          'meeting_invitee',
          '📅 Anda diundang ke rapat',
          `${creatorName} mengundang Anda ke "${meetingTitle}" pada ${meetingDate}`,
          null, // No task ID
          '', // No task title
          meetingId,
          meetingTitle
        );
      }

      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error('Error creating meeting notification:', error);
    }
  }, [currentUser, createNotification, fetchNotifications]);

  return {
    notifications,
    createCommentNotification,
    createMentionNotification,
    createAssignmentNotification,
    createMeetingNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationClick,
    fetchNotifications,
    dismissAllNotifications
  };
};