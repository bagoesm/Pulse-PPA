import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Notification, Task, User } from '../../types';

interface UseNotificationsProps {
  currentUser: User | null;
  tasks: Task[];
  onTaskNavigation: (taskId: string) => void;
}

export const useNotifications = ({ currentUser, tasks, onTaskNavigation }: UseNotificationsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset notifications when user changes
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setIsLoading(false);
    }
  }, [currentUser?.id]); // Use currentUser.id to detect user changes

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    if (isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_dismissed', false) // Only get non-dismissed notifications
        .gt('expires_at', new Date().toISOString()) // Only get non-expired notifications
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      if (data) {
        const mappedNotifications: Notification[] = data.map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message,
          taskId: n.task_id,
          taskTitle: n.task_title,
          isRead: n.is_read,
          isDismissed: n.is_dismissed || false,
          createdAt: n.created_at,
          expiresAt: n.expires_at
        }));

        console.log(`Fetched ${mappedNotifications.length} notifications, ${mappedNotifications.filter(n => !n.isRead).length} unread`);
        setNotifications(mappedNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isLoading]);

  // Create notification for comment
  const createCommentNotification = useCallback(async (
    taskId: string,
    taskTitle: string,
    commenterName: string,
    taskPics: string[]
  ) => {
    if (!currentUser) return;

    try {
      // Get user IDs for PICs (excluding the commenter)
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('name', taskPics);

      if (usersError || !users) {
        console.error('Error fetching users for notification:', usersError);
        return;
      }

      // Filter out the commenter
      const targetUsers = users.filter(user => user.name !== commenterName);

      if (targetUsers.length === 0) return;

      // Create notifications for each PIC
      const notificationsToCreate = targetUsers.map(user => ({
        user_id: user.id,
        type: 'comment',
        title: 'Komentar Baru',
        message: `${commenterName} menambahkan komentar pada task "${taskTitle}"`,
        task_id: taskId,
        task_title: taskTitle,
        is_read: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (error) {
        console.error('Error creating comment notifications:', error);
      } else {
        // Refresh notifications if current user is one of the PICs
        if (targetUsers.some(user => user.id === currentUser.id)) {
          fetchNotifications();
        }
      }
    } catch (error) {
      console.error('Error creating comment notification:', error);
    }
  }, [currentUser, fetchNotifications]);

  // Create notification for deadline (24 hours before)
  const createDeadlineNotification = useCallback(async (task: Task) => {
    if (!currentUser) return;

    try {
      // Get user IDs for PICs
      const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
      
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('name', taskPics);

      if (usersError || !users) {
        console.error('Error fetching users for deadline notification:', usersError);
        return;
      }

      // Create notifications for each PIC
      const notificationsToCreate = users.map(user => ({
        user_id: user.id,
        type: 'deadline',
        title: 'Deadline Mendekat',
        message: `Task "${task.title}" akan berakhir dalam 24 jam (${new Date(task.deadline).toLocaleDateString('id-ID')})`,
        task_id: task.id,
        task_title: task.title,
        is_read: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (error) {
        console.error('Error creating deadline notifications:', error);
      } else {
        // Refresh notifications if current user is one of the PICs
        if (users.some(user => user.id === currentUser.id)) {
          fetchNotifications();
        }
      }
    } catch (error) {
      console.error('Error creating deadline notification:', error);
    }
  }, [currentUser, fetchNotifications]);

  // Check for upcoming deadlines (run daily)
  const checkUpcomingDeadlines = useCallback(async () => {
    if (!currentUser) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Find tasks with deadlines in the next 24 hours
    const upcomingTasks = tasks.filter(task => {
      const deadline = new Date(task.deadline);
      return deadline >= tomorrow && deadline < dayAfterTomorrow && task.status !== 'Done';
    });

    // Create notifications for each upcoming task
    for (const task of upcomingTasks) {
      // Check if notification already exists for this task for current user
      // Include both active and deleted notifications to prevent recreation
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id, is_read, created_at')
        .eq('task_id', task.id)
        .eq('type', 'deadline')
        .eq('user_id', currentUser.id)
        .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()); // Check notifications created in last 24 hours

      // Only create notification if no recent deadline notification exists for this user and task
      if (!existingNotifications || existingNotifications.length === 0) {
        await createDeadlineNotification(task);
      } else {
        console.log(`Skipping deadline notification for task ${task.id} - already exists for user`);
      }
    }
  }, [currentUser, tasks, createDeadlineNotification]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [currentUser]);

  // Dismiss all notifications (mark as seen in dropdown)
  const dismissAllNotifications = useCallback(async () => {
    if (!currentUser) return;

    try {
      const notificationIds = notifications.map(n => n.id);
      if (notificationIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_dismissed: true })
        .in('id', notificationIds);

      if (error) {
        console.error('Error dismissing notifications:', error);
        return;
      }

      // Clear local notifications since they're now dismissed
      setNotifications([]);
    } catch (error) {
      console.error('Error dismissing notifications:', error);
    }
  }, [currentUser, notifications]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return;
      }
      
      // Update local state immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Handle notification click (navigate to task)
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    onTaskNavigation(notification.taskId);
  }, [onTaskNavigation, markAsRead]);

  // Clean up expired notifications (run periodically)
  const cleanupExpiredNotifications = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired notifications:', error);
      }
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
    }
  }, []);

  // Clean up duplicate notifications
  const cleanupDuplicateNotifications = useCallback(async () => {
    if (!currentUser) return;

    try {
      // Try using database function first
      const { error } = await supabase.rpc('cleanup_duplicate_deadline_notifications', {
        user_id_param: currentUser.id
      });

      if (error) {
        // Fallback: manual cleanup
        const { data: allDeadlineNotifications } = await supabase
          .from('notifications')
          .select('id, task_id, created_at')
          .eq('user_id', currentUser.id)
          .eq('type', 'deadline')
          .order('created_at', { ascending: false });

        if (allDeadlineNotifications && allDeadlineNotifications.length > 0) {
          // Group by task_id and find duplicates
          const taskGroups: { [key: string]: any[] } = {};
          allDeadlineNotifications.forEach(notif => {
            if (!taskGroups[notif.task_id]) {
              taskGroups[notif.task_id] = [];
            }
            taskGroups[notif.task_id].push(notif);
          });

          // Find tasks with multiple notifications
          const duplicateTasks = Object.keys(taskGroups).filter(taskId => taskGroups[taskId].length > 1);
          
          if (duplicateTasks.length > 0) {
            // Delete older notifications, keep the latest one
            for (const taskId of duplicateTasks) {
              const notifications = taskGroups[taskId];
              const toDelete = notifications.slice(1); // Keep first (latest), delete rest
              
              if (toDelete.length > 0) {
                const idsToDelete = toDelete.map(n => n.id);
                await supabase
                  .from('notifications')
                  .delete()
                  .in('id', idsToDelete);
              }
            }
          }
        }
      }
      
      // Refresh notifications after cleanup
      fetchNotifications();
    } catch (error) {
      console.error('Error cleaning up duplicate notifications:', error);
    }
  }, [currentUser, fetchNotifications]);

  // Initialize notifications and cleanup when user changes
  useEffect(() => {
    if (currentUser && !isLoading) {
      // Debounce to prevent multiple rapid calls
      const timeoutId = setTimeout(() => {
        fetchNotifications();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else if (!currentUser) {
      // Clear notifications when user logs out
      setNotifications([]);
    }
  }, [currentUser?.id]); // Only depend on user ID, not the whole fetchNotifications function

  // Check for upcoming deadlines daily
  useEffect(() => {
    if (!currentUser || !tasks.length) return;

    const checkDeadlinesOnce = async () => {
      const today = new Date().toDateString();
      
      // Check if we already created deadline notifications today by looking at database
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: todayNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('type', 'deadline')
        .gte('created_at', todayStart.toISOString());

      // Only run deadline check if no deadline notifications were created today
      if (!todayNotifications || todayNotifications.length === 0) {
        console.log('Running daily deadline check...');
        await checkUpcomingDeadlines();
      } else {
        console.log('Deadline check already done today, skipping...');
      }
    };

    // Run once when component mounts
    checkDeadlinesOnce();

    // Set up daily check (every 4 hours, but with database check to prevent duplicates)
    const interval = setInterval(checkDeadlinesOnce, 4 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkUpcomingDeadlines, currentUser, tasks]);

  // Clean up expired notifications periodically
  useEffect(() => {
    // Clean up immediately
    cleanupExpiredNotifications();

    // Set up periodic cleanup (every hour)
    const interval = setInterval(cleanupExpiredNotifications, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [cleanupExpiredNotifications]);

  return {
    notifications,
    createCommentNotification,
    createDeadlineNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationClick,
    fetchNotifications,
    cleanupDuplicateNotifications,
    dismissAllNotifications
  };
};