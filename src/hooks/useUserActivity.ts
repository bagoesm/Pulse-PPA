import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../../types';

export const useUserActivity = (currentUser: User | null) => {
  useEffect(() => {
    if (!currentUser?.id) return;

    const updateLastSeen = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', currentUser.id);
      } catch (err) {
        console.error('Error updating last_seen activity:', err);
      }
    };

    // Update immediately on login or component mount
    updateLastSeen();

    // Set up heartbeat interval every 60 seconds
    const interval = setInterval(updateLastSeen, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [currentUser?.id]);
};
