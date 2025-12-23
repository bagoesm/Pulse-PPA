// src/hooks/useFeedbackHandlers.ts
// Feedback CRUD operations
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Feedback, FeedbackCategory, FeedbackStatus, User } from '../../types';

interface UseFeedbackHandlersProps {
    currentUser: User | null;
    feedbacks: Feedback[];
    setFeedbacks: React.Dispatch<React.SetStateAction<Feedback[]>>;
    showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useFeedbackHandlers = ({
    currentUser,
    feedbacks,
    setFeedbacks,
    showNotification
}: UseFeedbackHandlersProps) => {

    // Add feedback
    const handleAddFeedback = useCallback(async (title: string, description: string, category: FeedbackCategory) => {
        if (!currentUser) return;

        const { data, error } = await supabase.from('feedbacks').insert([{
            title, description, category, created_by: currentUser.name
        }]).select().single();

        if (data && !error) {
            setFeedbacks(prev => [...prev, { ...data, createdBy: data.created_by, createdAt: data.created_at, adminResponse: '' }]);
        }
    }, [currentUser, setFeedbacks]);

    // Update feedback status
    const handleUpdateFeedbackStatus = useCallback(async (id: string, status: FeedbackStatus, response?: string) => {
        const updateData: any = { status };
        if (response !== undefined) updateData.admin_response = response;

        const { error } = await supabase.from('feedbacks').update(updateData).eq('id', id);
        if (!error) {
            setFeedbacks(prev => prev.map(f =>
                f.id === id ? { ...f, status, adminResponse: response ?? f.adminResponse } : f
            ));
        }
    }, [setFeedbacks]);

    // Delete feedback
    const handleDeleteFeedback = useCallback(async (id: string) => {
        const { error } = await supabase.from('feedbacks').delete().eq('id', id);
        if (!error) {
            setFeedbacks(prev => prev.filter(f => f.id !== id));
            showNotification('Feedback Dihapus', 'Feedback berhasil dihapus.', 'success');
        }
    }, [setFeedbacks, showNotification]);

    // Vote feedback
    const handleVoteFeedback = useCallback(async (feedbackId: string, type: 'up' | 'down') => {
        if (!currentUser) return;
        const feedback = feedbacks.find(f => f.id === feedbackId);
        if (!feedback) return;

        // Optimistic update
        const upvotes = feedback.upvotes || [];
        const downvotes = feedback.downvotes || [];
        let newUpvotes = [...upvotes];
        let newDownvotes = [...downvotes];

        if (type === 'up') {
            if (upvotes.includes(currentUser.id)) {
                newUpvotes = upvotes.filter(id => id !== currentUser.id);
            } else {
                newUpvotes = [...upvotes.filter(id => id !== currentUser.id), currentUser.id];
                newDownvotes = downvotes.filter(id => id !== currentUser.id);
            }
        } else {
            if (downvotes.includes(currentUser.id)) {
                newDownvotes = downvotes.filter(id => id !== currentUser.id);
            } else {
                newDownvotes = [...downvotes.filter(id => id !== currentUser.id), currentUser.id];
                newUpvotes = upvotes.filter(id => id !== currentUser.id);
            }
        }

        // Apply optimistic update immediately
        setFeedbacks(prev => prev.map(f =>
            f.id === feedbackId ? { ...f, upvotes: newUpvotes, downvotes: newDownvotes } : f
        ));

        // Call RPC
        const { error } = await supabase.rpc('vote_feedback', {
            p_feedback_id: feedbackId,
            p_vote_type: type,
            p_user_id: currentUser.id
        });

        if (error) {
            console.error('Error voting feedback:', error);
            // Revert changes if error
            setFeedbacks(prev => prev.map(f =>
                f.id === feedbackId ? { ...f, upvotes, downvotes } : f
            ));
        }
    }, [currentUser, feedbacks, setFeedbacks]);

    return {
        handleAddFeedback,
        handleUpdateFeedbackStatus,
        handleDeleteFeedback,
        handleVoteFeedback
    };
};

export default useFeedbackHandlers;
