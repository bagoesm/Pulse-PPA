import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../../types';

export const useUnreadChatCount = (currentUser: User | null) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      // 1. Get room memberships for the current user
      const { data: memberships, error: memberErr } = await supabase
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', currentUser.id);

      if (memberErr) throw memberErr;
      const roomIds = memberships?.map(m => m.room_id) || [];

      if (roomIds.length === 0) {
        setUnreadCount(0);
        return;
      }

      // 2. Count unread messages in those rooms that are sent by others
      const { count, error: countErr } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('room_id', roomIds)
        .neq('sender_id', currentUser.id)
        .eq('is_read', false);

      if (countErr) throw countErr;
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching global unread chat count:', err);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    // Subscribe to messages changes to recalculate the unread badge
    const channel = supabase
      .channel('global-unread-chats-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, fetchUnreadCount]);

  return unreadCount;
};
