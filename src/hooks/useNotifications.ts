import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Notification, Task, User } from '../../types';

interface UseNotificationsProps {
  currentUser: User | null;
  tasks: Task[];
  onTaskNavigation: (taskId: string) => void;
}

interface DbNotification {
  id: string;
  user_id: string;
  type: 'deadline' | 'comment';
  title: string;
  message: string;
  task_id: string;
  task_title: string;
  is_read: boolean;
  created_at: string;
}

const mapDbToNotification = (n: DbNotification): Notification => ({
  id: n.id,
  userId: n.user_id,
  type: n.type,
  title: n.title,
  message: n.message,
  taskId: n.task_id,
  taskTitle: n.task_title,
  isRead: n.is_read,
  isDismissed: false,
  createdAt: n.created_at,
  expiresAt: new Date(new Date(n.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
});

export const useNotifications = ({ currentUser, tasks, onTaskNavigation }: UseNotificationsProps) => {
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

  // Create notification (handles duplicates via database constraint)
  const createNotification = useCallback(async (
    userId: string,
    type: 'deadline' | 'comment',
    title: string,
    message: string,
    taskId: string,
    taskTitle: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('insert_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_task_id: taskId,
        p_task_title: taskTitle
      });

      if (error) {
        // Fallback: direct insert with upsert behavior
        await supabase
          .from('notifications')
          .upsert({
            user_id: userId,
            type,
            title,
            message,
            task_id: taskId,
            task_title: taskTitle,
            is_read: false
          }, {
            onConflict: 'user_id,task_id,type',
            ignoreDuplicates: true
          });
      }

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, []);

  // Create comment notification
  const createCommentNotification = useCallback(async (
    taskId: string,
    taskTitle: string,
    commenterName: string,
    taskPics: string[]
  ) => {
    if (!currentUser) return;

    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name')
        .in('name', taskPics);

      if (!users) return;

      // Notify all PICs except the commenter
      const targetUsers = users.filter(u => u.name !== commenterName);
      
      for (const user of targetUsers) {
        await createNotification(
          user.id,
          'comment',
          'Komentar Baru',
          `${commenterName} menambahkan komentar pada task "${taskTitle}"`,
          taskId,
          taskTitle
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
    onTaskNavigation(notification.taskId);
  }, [markAsRead, onTaskNavigation]);

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

  return {
    notifications,
    createCommentNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationClick,
    fetchNotifications,
    dismissAllNotifications
  };
};