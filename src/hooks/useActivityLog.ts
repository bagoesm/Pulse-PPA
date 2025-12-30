// src/hooks/useActivityLog.ts
// Hook untuk logging aktivitas user ke database

import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../../types';

export type ActivityAction = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view';
export type EntityType = 'auth' | 'task' | 'meeting' | 'project' | 'user' | 'announcement' | 'feedback' | 'master_data';

interface LogActivityParams {
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string;
    entityTitle?: string;
    projectId?: string;
    projectName?: string;
    metadata?: Record<string, any>;
}

interface UseActivityLogProps {
    currentUser: User | null;
}

export const useActivityLog = ({ currentUser }: UseActivityLogProps) => {

    const logActivity = useCallback(async ({
        action,
        entityType,
        entityId,
        entityTitle,
        projectId,
        projectName,
        metadata = {}
    }: LogActivityParams) => {
        if (!currentUser) return;

        try {
            // Get user agent and approximate IP (client-side only has user agent)
            const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

            const { error } = await supabase.from('activity_logs').insert({
                user_id: currentUser.id,
                user_name: currentUser.name,
                action,
                entity_type: entityType,
                entity_id: entityId || null,
                entity_title: entityTitle || null,
                project_id: projectId || null,
                project_name: projectName || null,
                metadata,
                user_agent: userAgent,
                ip_address: null, // Can only be captured server-side
            });

            if (error) {
                console.error('Failed to log activity:', error);
            }
        } catch (err) {
            console.error('Error logging activity:', err);
        }
    }, [currentUser]);

    // Convenience methods
    const logLogin = useCallback(() => {
        return logActivity({
            action: 'login',
            entityType: 'auth',
            entityTitle: 'User Login',
        });
    }, [logActivity]);

    const logLogout = useCallback(() => {
        return logActivity({
            action: 'logout',
            entityType: 'auth',
            entityTitle: 'User Logout',
        });
    }, [logActivity]);

    const logTaskCreate = useCallback((taskId: string, taskTitle: string, projectId?: string, projectName?: string) => {
        return logActivity({
            action: 'create',
            entityType: 'task',
            entityId: taskId,
            entityTitle: taskTitle,
            projectId,
            projectName,
        });
    }, [logActivity]);

    const logTaskUpdate = useCallback((taskId: string, taskTitle: string, changes?: Record<string, any>, projectId?: string, projectName?: string) => {
        return logActivity({
            action: 'update',
            entityType: 'task',
            entityId: taskId,
            entityTitle: taskTitle,
            projectId,
            projectName,
            metadata: changes ? { changes } : {},
        });
    }, [logActivity]);

    const logTaskDelete = useCallback((taskId: string, taskTitle: string, projectId?: string, projectName?: string) => {
        return logActivity({
            action: 'delete',
            entityType: 'task',
            entityId: taskId,
            entityTitle: taskTitle,
            projectId,
            projectName,
        });
    }, [logActivity]);

    const logMeetingCreate = useCallback((meetingId: string, meetingTitle: string, projectId?: string, projectName?: string) => {
        return logActivity({
            action: 'create',
            entityType: 'meeting',
            entityId: meetingId,
            entityTitle: meetingTitle,
            projectId,
            projectName,
        });
    }, [logActivity]);

    const logMeetingUpdate = useCallback((meetingId: string, meetingTitle: string, changes?: Record<string, any>, projectId?: string, projectName?: string) => {
        return logActivity({
            action: 'update',
            entityType: 'meeting',
            entityId: meetingId,
            entityTitle: meetingTitle,
            projectId,
            projectName,
            metadata: changes ? { changes } : {},
        });
    }, [logActivity]);

    const logMeetingDelete = useCallback((meetingId: string, meetingTitle: string, projectId?: string, projectName?: string) => {
        return logActivity({
            action: 'delete',
            entityType: 'meeting',
            entityId: meetingId,
            entityTitle: meetingTitle,
            projectId,
            projectName,
        });
    }, [logActivity]);

    const logProjectCreate = useCallback((projectId: string, projectName: string) => {
        return logActivity({
            action: 'create',
            entityType: 'project',
            entityId: projectId,
            entityTitle: projectName,
            projectId,
            projectName,
        });
    }, [logActivity]);

    const logProjectUpdate = useCallback((projectId: string, projectName: string, changes?: Record<string, any>) => {
        return logActivity({
            action: 'update',
            entityType: 'project',
            entityId: projectId,
            entityTitle: projectName,
            projectId,
            projectName,
            metadata: changes ? { changes } : {},
        });
    }, [logActivity]);

    const logProjectDelete = useCallback((projectId: string, projectName: string) => {
        return logActivity({
            action: 'delete',
            entityType: 'project',
            entityId: projectId,
            entityTitle: projectName,
            projectId,
            projectName,
        });
    }, [logActivity]);

    return {
        logActivity,
        logLogin,
        logLogout,
        logTaskCreate,
        logTaskUpdate,
        logTaskDelete,
        logMeetingCreate,
        logMeetingUpdate,
        logMeetingDelete,
        logProjectCreate,
        logProjectUpdate,
        logProjectDelete,
    };
};

export default useActivityLog;
