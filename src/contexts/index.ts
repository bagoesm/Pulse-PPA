// src/contexts/index.ts
export { AuthProvider, useAuth } from './AuthContext';
export { UIProvider, useUI } from './UIContext';

// Domain-specific contexts
export { UsersProvider, useUsers } from './UsersContext';
export { TasksProvider, useTasks } from './TasksContext';
export { ProjectsProvider, useProjects } from './ProjectsContext';
export { MeetingsProvider, useMeetings } from './MeetingsContext';
export { MasterDataProvider, useMasterData } from './MasterDataContext';
export { AppContentProvider, useAppContent } from './AppContentContext';
export { SuratsProvider, useSurats } from './SuratsContext';

// Legacy aggregate hook (deprecated - use domain-specific hooks instead)
export { DataProvider, useData } from './DataContext';
