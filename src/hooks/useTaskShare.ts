import { useState } from 'react';
import { Task, User } from '../../types';

export interface ShareState {
  isTaskShareOpen: boolean;
  isWeeklyShareOpen: boolean;
  selectedTask: Task | null;
}

export const useTaskShare = () => {
  const [shareState, setShareState] = useState<ShareState>({
    isTaskShareOpen: false,
    isWeeklyShareOpen: false,
    selectedTask: null
  });

  const openTaskShare = (task: Task) => {
    setShareState({
      isTaskShareOpen: true,
      isWeeklyShareOpen: false,
      selectedTask: task
    });
  };

  const openWeeklyShare = () => {
    setShareState({
      isTaskShareOpen: false,
      isWeeklyShareOpen: true,
      selectedTask: null
    });
  };

  const closeShare = () => {
    setShareState({
      isTaskShareOpen: false,
      isWeeklyShareOpen: false,
      selectedTask: null
    });
  };

  return {
    shareState,
    openTaskShare,
    openWeeklyShare,
    closeShare
  };
};