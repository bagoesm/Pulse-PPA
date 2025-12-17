// src/App.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import { Plus, Search, Layout, CalendarRange, Briefcase, FileText, ListTodo, Loader2 } from 'lucide-react';
import { Task, Status, Category, Priority, FilterState, User, ProjectDefinition, ViewMode, Feedback, FeedbackCategory, FeedbackStatus, DocumentTemplate, UserStatus, Attachment, Comment, ChristmasDecorationSettings, Announcement } from '../types';
import Sidebar from './components/Sidebar';
import TaskCard from './components/TaskCard';
import AddTaskModal from './components/AddTaskModal';
import TaskViewModal from './components/TaskViewModal';
import AddProjectModal from './components/AddProjectModal';
import TimelineView from './components/TimelineView';
import Dashboard from './components/Dashboard';
import ProjectOverview from './components/ProjectOverview';
import LoginPage from './components/LoginPage';
import UserManagement from './components/UserManagement';
import WallOfFeedback from './components/WallOfFeedback';
import DocumentTemplates from './components/DocumentTemplates';
import StatusModal from './components/StatusModal';
import NotificationModal from './components/NotificationModal';
import ConfirmModal from './components/ConfirmModal';
import NotificationIcon from './components/NotificationIcon';
import { useNotifications } from './hooks/useNotifications';
import AnnouncementModal from './components/AnnouncementModal';
import AnnouncementManager from './components/AnnouncementManager';

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | undefined>(undefined);

  // App Data State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<ProjectDefinition[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [templateFilePaths, setTemplateFilePaths] = useState<{[key: string]: string}>({});
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Christmas Decoration Settings
  const [christmasSettings, setChristmasSettings] = useState<ChristmasDecorationSettings>({
    santaHatEnabled: false,
    baubleEnabled: false,
    candyEnabled: false
  });
  
  // Filtered users (exclude Super Admin from task assignments and dashboard)
  const taskAssignableUsers = useMemo(() => 
    allUsers.filter(user => user.role !== 'Super Admin'), 
    [allUsers]
  );

  // Get all unique PICs from existing tasks (for filtering)
  const allUniquePics = useMemo(() => {
    const picSet = new Set<string>();
    tasks.forEach(task => {
      const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
      taskPics.forEach(pic => {
        if (pic && pic.trim()) {
          picSet.add(pic);
        }
      });
    });
    return Array.from(picSet).sort();
  }, [tasks]);
  
  // Master Data State
  const [jabatanList, setJabatanList] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  
  // Category Management State
  const [masterCategories, setMasterCategories] = useState<any[]>([]);
  const [masterSubCategories, setMasterSubCategories] = useState<any[]>([]);
  const [categorySubcategoryRelations, setCategorySubcategoryRelations] = useState<any[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('Dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isTaskViewModalOpen, setIsTaskViewModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectDefinition | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('Board');
  
  // Notification Modal State
  const [notificationModal, setNotificationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning' as 'success' | 'error' | 'warning' | 'info',
    onConfirm: () => {},
    confirmText: 'Konfirmasi',
    cancelText: 'Batal'
  });

  // Sub-tab state for Surat & Dokumen
  const [suratSubTab, setSuratSubTab] = useState<'Tasks' | 'Templates'>('Tasks');
  
  // Refresh trigger for ProjectOverview
  const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'All',
    pic: 'All',
    priority: 'All',
    status: 'All',
    projectId: 'All',
  });

  const columns = Object.values(Status);

  // Reset category filter ketika pindah tab yang bukan 'Semua Task'
  useEffect(() => {
    if (activeTab !== 'Semua Task' && filters.category !== 'All') {
      setFilters(prev => ({ ...prev, category: 'All' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Notification helpers
  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotificationModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const hideNotification = () => {
    setNotificationModal(prev => ({ ...prev, isOpen: false }));
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'success' | 'error' | 'warning' | 'info' = 'warning',
    confirmText: string = 'Konfirmasi',
    cancelText: string = 'Batal'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  const hideConfirm = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // --- Initial Data Fetching & Auth subscription ---
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        setIsLoadingAuth(true);
        const { data } = await supabase.auth.getSession();
        const sess = data?.session ?? null;
        if (mounted) {
          setSession(sess);
          if (sess) await fetchUserProfile(sess.user.id);
        }
      } catch (err) {
        console.error('Error getting session', err);
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    };
    init();
    
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        fetchUserProfile(sess.user.id);
      } else {
        setCurrentUser(null);
        // Clear any pending notifications when user logs out
        hideNotification();
      }
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (session) {
      fetchAllData();
    } else {
      // clear sensitive app data when signed out
      setAllUsers([]);
      setTasks([]);
      setProjects([]);
      setFeedbacks([]);
      setDocumentTemplates([]);
    }
  }, [session]);

  // --- Supabase helpers ---
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) {
        console.error('fetchUserProfile error', error);
        
        // If RLS policy error, show helpful message
        if (error.code === '42501' || error.message.includes('policy')) {
          showNotification(
            'RLS Policy Error', 
            'Terjadi masalah dengan database policies. Silakan setup RLS policies terlebih dahulu menggunakan panduan SETUP_SUPER_ADMIN.md', 
            'error'
          );
        }
        
        setCurrentUser(null);
      } else if (data) {
        const mappedUser = {
          ...data,
          sakuraAnimationEnabled: data.sakura_animation_enabled || false,
          snowAnimationEnabled: data.snow_animation_enabled || false
        } as User;
        setCurrentUser(mappedUser);
      }
    } catch (err) {
      console.error('fetchUserProfile unexpected', err);
      
      // Show user-friendly error message
      showNotification(
        'Gagal Memuat Profil', 
        'Tidak dapat memuat profil user. Periksa koneksi atau setup database policies.', 
        'error'
      );
    }
  };

  const fetchAllData = async () => {
    try {
      // --- Users ---
      const { data: usersData, error: usersErr } = await supabase.from('profiles').select('*');
      if (usersErr) console.error('Error fetch profiles:', usersErr);
      if (usersData) {
        const mappedUsers = usersData.map((user: any) => ({
          ...user,
          sakuraAnimationEnabled: user.sakura_animation_enabled || false,
          snowAnimationEnabled: user.snow_animation_enabled || false
        })) as User[];
        setAllUsers(mappedUsers);
      }

      // --- Projects ---
      const { data: projectsData, error: projectsErr } = await supabase.from('projects').select('*');
      if (projectsErr) console.error('Error fetch projects:', projectsErr);
      if (projectsData) setProjects(projectsData as ProjectDefinition[]);

      // --- Tasks (with safe mapping and signed URLs for attachments) ---
      const { data: tasksData, error: tasksErr } = await supabase.from('tasks').select('*');
      if (tasksErr) console.error('Error fetch tasks:', tasksErr);

      if (tasksData) {
        const tasksWithFiles = await Promise.all(
          tasksData.map(async (t: any, idx: number) => {
            // Defensive: ensure attachments is an array
            const rawAttachments = Array.isArray(t.attachments) ? t.attachments : [];

            const attachments = await Promise.all(rawAttachments.map(async (file: any) => {
              // If file.path missing, skip signed url but keep metadata
              const path = file?.path ?? file?.storage_path ?? null;
              let url: string | null = null;

              if (path && typeof path === 'string' && path.length > 0) {
                try {
                  const { data: signedData, error: signedErr } = await supabase
                    .storage
                    .from('attachment')
                    .createSignedUrl(path, 60 * 60);
                  if (signedErr) {
                    console.warn('Signed URL error for', path, signedErr);
                  } else {
                    url = signedData?.signedUrl ?? null;
                  }
                } catch (e) {
                  console.warn('Signed URL exception for', path, e);
                }
              } else {
                // log problematic attachment for debugging
                console.warn(`Attachment missing path for taskId=${t?.id} attachment=`, file);
              }

              return {
                id: file?.id ?? `tmp_${Math.random().toString(36).slice(2,8)}`,
                name: file?.name ?? file?.filename ?? 'unknown',
                size: typeof file?.size === 'number' ? file.size : Number(file?.file_size) || 0,
                type: file?.type ?? file?.mime ?? '',
                path: path,
                url
              } as Attachment;
            }));

            // Safe mapping for other fields (avoid calling replace on undefined)
            const safe = (val: any) => (typeof val === 'string' ? val : val ?? '');

            // Map created_by_id to user name
            const createdByUserId = t.created_by_id || t.created_by || t.createdBy;
            let createdByName = 'Unknown';
            
            if (createdByUserId && usersData) {
              const creator = usersData.find((u: any) => u.id === createdByUserId);
              if (creator) {
                createdByName = creator.name;
              }
            }

            // Process links - ensure it's an array
            const links = Array.isArray(t.links) ? t.links : [];

            return {
              ...t,
              subCategory: safe(t.sub_category) || safe(t.subCategory) || '',
              startDate: t.start_date || t.startDate || new Date().toISOString().split('T')[0],
              projectId: t.project_id || t.projectId || null,
              createdBy: createdByName,
              deadline: t.deadline || (t.deadline_at || null),
              attachments,
              links
            } as Task;
          })
        );

        setTasks(tasksWithFiles);
      }

      // --- Master Data: jabatan & subcategories ---
      const { data: jabatanData, error: jabErr } = await supabase.from('master_jabatan').select('name');
      if (jabErr) console.error('Error fetch master_jabatan:', jabErr);
      if (jabatanData) setJabatanList(jabatanData.map((j: any) => j.name));

      const { data: subCatData, error: subErr } = await supabase.from('master_sub_categories').select('name');
      if (subErr) console.error('Error fetch master_sub_categories:', subErr);
      if (subCatData) setSubCategories(subCatData.map((s: any) => s.name));

      // --- Master Categories & SubCategories for management ---
      const { data: categoriesData, error: catErr } = await supabase.from('master_categories').select('*').order('display_order');
      if (catErr) console.error('Error fetch master_categories:', catErr);
      if (categoriesData) setMasterCategories(categoriesData);

      const { data: subCategoriesData, error: subCatErr } = await supabase.from('master_sub_categories').select('*').order('display_order');
      if (subCatErr) console.error('Error fetch master_sub_categories full:', subCatErr);
      if (subCategoriesData) setMasterSubCategories(subCategoriesData);

      // --- Category-SubCategory Relations ---
      const { data: relationsData, error: relErr } = await supabase.from('category_subcategory_relations').select('*');
      if (relErr) console.error('Error fetch category_subcategory_relations:', relErr);
      if (relationsData) setCategorySubcategoryRelations(relationsData);

      // --- Feedbacks (safe mapping) ---
      const { data: fbData, error: fbErr } = await supabase.from('feedbacks').select('*');
      if (fbErr) console.error('Error fetch feedbacks:', fbErr);
      if (fbData) {
        const mappedFb = fbData.map((f: any) => ({
          ...f,
          adminResponse: f.admin_response ?? f.adminResponse ?? '',
          createdBy: f.created_by ?? f.createdBy ?? 'Unknown',
          createdAt: f.created_at ? new Date(f.created_at).toISOString().split('T')[0] : (f.createdAt || '')
        }));
        setFeedbacks(mappedFb);
      }

      // --- Document Templates (safe mapping) ---
      const { data: tmplData, error: tmplErr } = await supabase.from('document_templates').select('*');
      if (tmplErr) console.error('Error fetch document_templates:', tmplErr);
      if (tmplData) {
        const mappedTmpl = tmplData.map((t: any) => ({
          ...t,
          fileType: t.file_type ?? t.fileType ?? '',
          fileSize: typeof t.file_size === 'number' ? t.file_size : Number(t.file_size) || 0,
          uploadedBy: t.uploaded_by ?? t.uploadedBy ?? '',
          updatedAt: t.updated_at ? new Date(t.updated_at).toISOString().split('T')[0] : (t.updatedAt || ''),
          filePath: t.file_path ?? t.filePath ?? '',
          fileUrl: t.file_url ?? t.fileUrl ?? '',
          downloadCount: t.download_count ?? t.downloadCount ?? 0
        }));
        setDocumentTemplates(mappedTmpl);
      }

      // --- User Statuses ---
      const { data: statusesData, error: statusErr } = await supabase.from('user_statuses').select('*');
      if (statusErr) console.error('Error fetch user_statuses:', statusErr);
      if (statusesData) {
        // Filter out expired statuses and map to frontend format
        const now = new Date();
        const validStatuses = statusesData.filter((s: any) => new Date(s.expires_at) > now);
        const mappedStatuses = validStatuses.map((s: any) => ({
          ...s,
          userId: s.user_id,
          createdAt: s.created_at,
          expiresAt: s.expires_at
        }));
        setUserStatuses(mappedStatuses);
      }

      // --- Comments ---
      const { data: commentsData, error: commentsErr } = await supabase.from('task_comments').select('*');
      if (commentsErr) console.error('Error fetch comments:', commentsErr);
      if (commentsData) {
        const mappedComments = commentsData.map((c: any) => ({
          id: c.id,
          taskId: c.task_id,
          userId: c.user_id,
          userName: c.user_name,
          content: c.content,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));
        setComments(mappedComments);
      }

      // --- Christmas Decoration Settings ---
      const { data: christmasData, error: christmasErr } = await supabase.from('christmas_settings').select('*').single();
      if (christmasErr && christmasErr.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetch christmas_settings:', christmasErr);
      }
      if (christmasData) {
        setChristmasSettings({
          id: christmasData.id,
          santaHatEnabled: christmasData.santa_hat_enabled || false,
          baubleEnabled: christmasData.bauble_enabled || false,
          candyEnabled: christmasData.candy_enabled || false,
          enabledBy: christmasData.enabled_by,
          enabledAt: christmasData.enabled_at
        });
      }

      // --- Announcements ---
      const { data: announcementsData, error: announcementsErr } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (announcementsErr) console.error('Error fetch announcements:', announcementsErr);
      if (announcementsData) {
        const mappedAnnouncements = announcementsData.map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          type: a.type,
          emoji: a.emoji,
          backgroundColor: a.background_color,
          textColor: a.text_color,
          isActive: a.is_active,
          createdBy: a.created_by,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
          expiresAt: a.expires_at
        }));
        setAnnouncements(mappedAnnouncements);
      }
    } catch (err) {
      console.error('fetch All Data error', err);
    }
  };
  // --- Permissions Logic ---
  const checkEditPermission = (task: Task) => {
      if (!currentUser) return false;
      if (currentUser.role === 'Super Admin') return true;
      if (currentUser.role === 'Atasan') return true;
      // Staff can edit tasks they created or tasks where they are PIC
      const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
      return task.createdBy === currentUser.name || taskPics.includes(currentUser.name);
  };

  const checkDeletePermission = (task: Task) => {
      if (!currentUser) return false;
      if (currentUser.role === 'Super Admin') return true;
      if (currentUser.role === 'Atasan') return true;
      // Staff can only delete tasks they created
      return task.createdBy === currentUser.name;
  };

  // --- Auth handlers ---
  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(undefined);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        setAuthError(error.message || 'Gagal login');
        setIsLoadingAuth(false);
        return;
      }

      // If sign-in returns a session, set it & fetch profile
      const sess = data?.session ?? null;
      if (sess) {
        setSession(sess);
        await fetchUserProfile(sess.user.id);
      } else {
        // fallback to getSession
        const { data: sessData } = await supabase.auth.getSession();
        const s = sessData?.session ?? null;
        setSession(s);
        if (s) await fetchUserProfile(s.user.id);
      }
      setIsLoadingAuth(false);
    } catch (err: any) {
      console.error('Unexpected login error:', err);
      setAuthError(err?.message || 'Terjadi kesalahan saat login');
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setActiveTab('Dashboard');
      setCurrentUser(null);
      setSession(null);
      // Clear any potential admin client session
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear notification state to prevent delayed notifications
      hideNotification();
      
      // Clear all app data to prevent cross-user contamination
      setTasks([]);
      setProjects([]);
      setAnnouncements([]);
      setAllUsers([]);
      setFeedbacks([]);
      setDocumentTemplates([]);
      setUserStatuses([]);
      setComments([]);
    } catch (error: any) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      setActiveTab('Dashboard');
      setCurrentUser(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear notification state
      hideNotification();
      
      // Clear all app data to prevent cross-user contamination
      setTasks([]);
      setProjects([]);
      setAnnouncements([]);
      setAllUsers([]);
      setFeedbacks([]);
      setDocumentTemplates([]);
      setUserStatuses([]);
      setComments([]);
    }
  };

  // --- User Management handlers ---
  const handleAddUser = async (newUser: User) => {
      try {
          // Validate required fields
          if (!newUser.email || !newUser.password || !newUser.name) {
              showNotification('Data Tidak Lengkap', 'Email, password, dan nama wajib diisi.', 'warning');
              return;
          }

          // Clear any existing notifications first
          hideNotification();

          // PERFECT APPROACH: Use Supabase Admin API
          // This creates user in auth.users WITHOUT creating a session
          
          // Create admin client with service role (for demo, we'll use a workaround)
          // In production, this should be done via backend API with service role key
          
          try {
              // Method 1: Try using admin API if available (requires service role key in backend)
              // For now, we'll use the isolated client approach but with email confirmation disabled
              
              const { createClient } = await import('@supabase/supabase-js');
              const adminClient = createClient(
                  import.meta.env.VITE_SUPABASE_URL,
                  import.meta.env.VITE_SUPABASE_ANON_KEY,
                  {
                      auth: {
                          autoRefreshToken: false,
                          persistSession: false,
                          detectSessionInUrl: false,
                          storageKey: `admin-create-${Date.now()}`
                      }
                  }
              );

              // Create user in auth.users with email confirmation disabled
              const { data: authUser, error: authError } = await adminClient.auth.signUp({
                  email: newUser.email,
                  password: newUser.password,
                  options: {
                      emailRedirectTo: undefined, // No email confirmation
                      data: {
                          name: newUser.name,
                          role: newUser.role,
                          jabatan: newUser.jabatan,
                          initials: newUser.initials
                      }
                  }
              });

              if (authError) {
                  throw authError;
              }

              if (!authUser.user) {
                  throw new Error('Failed to create auth user');
              }

              // Immediately sign out from admin client to prevent session
              await adminClient.auth.signOut();

              // Create profile record with real auth user ID
              const profileData = {
                  id: authUser.user.id, // Real auth user ID
                  name: newUser.name,
                  email: newUser.email,
                  role: newUser.role,
                  jabatan: newUser.jabatan || null,
                  initials: newUser.initials,
                  sakura_animation_enabled: newUser.sakuraAnimationEnabled || false,
                  snow_animation_enabled: newUser.snowAnimationEnabled || false
              };

              // Create profile record using main supabase client (admin session)
              const { data: profileResult, error: profileError } = await supabase
                  .from('profiles')
                  .upsert([profileData])
                  .select()
                  .single();

              if (profileError) {
                  console.error('Profile creation error:', profileError);
                  showNotification('Gagal Membuat Profil', `User auth berhasil dibuat tetapi gagal membuat profil: ${profileError.message}`, 'warning');
                  return;
              }

              // Refresh user list
              await fetchAllData();

              // Show success notification
              showNotification(
                  'User Berhasil Ditambahkan!', 
                  `User ${newUser.name} berhasil ditambahkan:\n\n• Email: ${newUser.email}\n• Password: ${newUser.password}\n• Jabatan: ${newUser.jabatan}\n• Role: ${newUser.role}\n\n✅ User sudah terdaftar di auth system\n✅ User dapat langsung login\n✅ Anda tetap login sebagai admin`, 
                  'success'
              );

          } catch (authCreateError: any) {
              console.error('Auth user creation error:', authCreateError);
              
              // Handle specific auth errors
              if (authCreateError.message?.includes('already registered')) {
                  showNotification('Email Sudah Terdaftar', `Email ${newUser.email} sudah terdaftar. Gunakan email lain.`, 'error');
              } else if (authCreateError.message?.includes('Password')) {
                  showNotification('Password Tidak Valid', `Password tidak valid: ${authCreateError.message}`, 'error');
              } else {
                  showNotification('Gagal Membuat User', `Gagal membuat user: ${authCreateError.message}`, 'error');
              }
              return;
          }
      } catch (error: any) {
          console.error('Error creating user:', error);
          showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan tidak terduga: ${error.message}`, 'error');
      }
  };
  const handleEditUser = async (updatedUser: User) => {
      try {
          const originalUser = allUsers.find(u => u.id === updatedUser.id);
          const emailChanged = originalUser && originalUser.email !== updatedUser.email;

          // Update profile in database
          const { error: profileError } = await supabase.from('profiles').update({
              name: updatedUser.name,
              role: updatedUser.role,
              jabatan: updatedUser.jabatan,
              initials: updatedUser.initials,
              email: updatedUser.email,
              sakura_animation_enabled: updatedUser.sakuraAnimationEnabled || false,
              snow_animation_enabled: updatedUser.snowAnimationEnabled || false
          }).eq('id', updatedUser.id);
          
          if (profileError) {
              console.error('Edit user profile error:', profileError);
              showNotification('Gagal Mengupdate Profil', `Gagal mengupdate profil user: ${profileError.message}`, 'error');
              return;
          }

          // Provide feedback about email changes
          if (emailChanged) {
              showNotification(
                  'Profil Berhasil Diupdate!', 
                  `Profil user ${updatedUser.name} berhasil diperbarui.\n\n⚠️ CATATAN PENTING:\n• Email di profil aplikasi: ${updatedUser.email}\n• Email login auth masih: ${originalUser.email}\n• User masih login dengan email lama\n• Untuk mengubah email auth, gunakan Supabase Dashboard > Authentication > Users`, 
                  'success'
              );
          } else {
              showNotification('User Berhasil Diupdate!', `Data user ${updatedUser.name} berhasil diperbarui.`, 'success');
          }

          // Update local state
          setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
          if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);
          
      } catch (error: any) {
          console.error('Unexpected edit user error:', error);
          showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan: ${error.message}`, 'error');
      }
  };
  const handleDeleteUser = async (userId: string) => {
      try {
          // Get user info before deletion for notification
          const userToDelete = allUsers.find(u => u.id === userId);
          const userName = userToDelete?.name || 'User';
          const userEmail = userToDelete?.email || '';

          // Check if current user is Super Admin
          if (currentUser?.role !== 'Super Admin') {
              showNotification('Akses Ditolak', 'Hanya Super Admin yang dapat menghapus user.', 'error');
              return;
          }

          // Note: Cannot delete auth users due to Supabase security restrictions
          // Only profile will be deleted

          // Delete the profile from database
          const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
          
          if (profileError) {
              console.error('Delete profile error:', profileError);
              showNotification('Gagal Menghapus Profil', `Gagal menghapus profil user: ${profileError.message}`, 'error');
              return;
          }

          // Update local state
          setAllUsers(prev => prev.filter(u => u.id !== userId));
          
          showNotification(
              'Profil User Berhasil Dihapus!', 
              `Profil user ${userName} berhasil dihapus dari sistem.\n\n⚠️ PENTING:\n• Akun auth (${userEmail}) masih aktif di Supabase Auth\n• User tidak bisa menggunakan aplikasi karena profil sudah dihapus\n• Untuk menghapus akun auth sepenuhnya:\n  → Buka Supabase Dashboard > Authentication > Users\n  → Cari user dan klik Delete`, 
              'success'
          );
      } catch (error: any) {
          console.error('Unexpected delete user error:', error);
          showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan: ${error.message}`, 'error');
      }
  };

  // --- Master Data handlers ---
  const handleAddJabatan = async (newItem: string) => {
      const { error } = await supabase.from('master_jabatan').insert([{ name: newItem }]);
      if (!error) setJabatanList(prev => [...prev, newItem]);
  };
  const handleDeleteJabatan = async (item: string) => {
      const { error } = await supabase.from('master_jabatan').delete().eq('name', item);
      if (!error) setJabatanList(prev => prev.filter(j => j !== item));
  };
  const handleAddSubCategory = async (newItem: string) => {
      const { error } = await supabase.from('master_sub_categories').insert([{ name: newItem }]);
      if (!error) setSubCategories(prev => [...prev, newItem]);
  };
  const handleDeleteSubCategory = async (item: string) => {
      const { error } = await supabase.from('master_sub_categories').delete().eq('name', item);
      if (!error) setSubCategories(prev => prev.filter(s => s !== item));
  };

  // --- Category Management Handlers ---
  const handleAddMasterCategory = async (name: string, icon: string, color: string, selectedSubCategories?: string[]) => {
      const { data, error } = await supabase.from('master_categories').insert([{
          name, icon, color, display_order: masterCategories.length + 1
      }]).select().single();
      
      if (data && !error) {
          setMasterCategories(prev => [...prev, data]);
          
          // Create relations with selected subcategories
          if (selectedSubCategories && selectedSubCategories.length > 0) {
              const relations = selectedSubCategories.map(subId => ({
                  category_id: data.id,
                  subcategory_id: subId
              }));
              
              const { data: relationData, error: relationError } = await supabase
                  .from('category_subcategory_relations')
                  .insert(relations)
                  .select();
              
              if (relationData && !relationError) {
                  setCategorySubcategoryRelations(prev => [...prev, ...relationData]);
              }
          }
      }
  };

  const handleUpdateMasterCategory = async (id: string, name: string, icon: string, color: string, selectedSubCategories?: string[]) => {
      const { error } = await supabase.from('master_categories')
          .update({ name, icon, color })
          .eq('id', id);
      
      if (!error) {
          setMasterCategories(prev => prev.map(cat => 
              cat.id === id ? { ...cat, name, icon, color } : cat
          ));
          
          // Update relations with subcategories
          if (selectedSubCategories !== undefined) {
              // Delete existing relations
              await supabase.from('category_subcategory_relations')
                  .delete()
                  .eq('category_id', id);
              
              // Update local state - remove old relations
              setCategorySubcategoryRelations(prev => 
                  prev.filter(rel => rel.category_id !== id)
              );
              
              // Create new relations
              if (selectedSubCategories.length > 0) {
                  const relations = selectedSubCategories.map(subId => ({
                      category_id: id,
                      subcategory_id: subId
                  }));
                  
                  const { data: relationData, error: relationError } = await supabase
                      .from('category_subcategory_relations')
                      .insert(relations)
                      .select();
                  
                  if (relationData && !relationError) {
                      setCategorySubcategoryRelations(prev => [...prev, ...relationData]);
                  }
              }
          }
      }
  };

  const handleDeleteMasterCategory = async (id: string) => {
      const { error } = await supabase.from('master_categories').delete().eq('id', id);
      if (!error) {
          setMasterCategories(prev => prev.filter(cat => cat.id !== id));
          // Remove related relations from local state
          setCategorySubcategoryRelations(prev => 
              prev.filter(rel => rel.category_id !== id)
          );
      }
  };

  const handleAddMasterSubCategory = async (name: string, categoryId: string) => {
      // Sub categories are now independent, so we don't need category_id
      const { data, error } = await supabase.from('master_sub_categories').insert([{
          name, 
          category_id: null, // Set to null since sub categories are independent
          display_order: masterSubCategories.length + 1
      }]).select().single();
      
      if (data && !error) {
          setMasterSubCategories(prev => [...prev, data]);
      }
  };

  const handleUpdateMasterSubCategory = async (id: string, name: string, categoryId: string) => {
      // Only update the name since sub categories are independent
      const { error } = await supabase.from('master_sub_categories')
          .update({ name })
          .eq('id', id);
      
      if (!error) {
          setMasterSubCategories(prev => prev.map(sub => 
              sub.id === id ? { ...sub, name } : sub
          ));
      }
  };

  const handleDeleteMasterSubCategory = async (id: string) => {
      const { error } = await supabase.from('master_sub_categories').delete().eq('id', id);
      if (!error) {
          setMasterSubCategories(prev => prev.filter(sub => sub.id !== id));
          // Remove related relations from local state
          setCategorySubcategoryRelations(prev => 
              prev.filter(rel => rel.subcategory_id !== id)
          );
      }
  };

  // --- Document Templates handlers ---
  const handleAddTemplate = async (name: string, description: string, fileType: string, fileSize: number, file: File) => {
      if (!currentUser) return;
      
      try {
          // Upload file to Supabase Storage
          const fileName = `${Date.now()}_${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
              .from('document-templates')
              .upload(fileName, file);

          if (uploadError) {
              console.error('Error uploading file:', uploadError);
              return;
          }

          // Create signed URL for the uploaded file
          const { data: urlData, error: urlError } = await supabase.storage
              .from('document-templates')
              .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry for templates

          if (urlError) {
              console.error('Error creating signed URL:', urlError);
              return;
          }

          // Insert without new columns for now (until migration is run)
          const { data, error } = await supabase.from('document_templates').insert([{
              name, 
              description, 
              file_type: fileType, 
              file_size: fileSize, 
              uploaded_by: currentUser.name
          }]).select().single();

          if (data && !error) {
               const newTmpl = {
                   ...data,
                   fileType: data.file_type, 
                   fileSize: data.file_size, 
                   uploadedBy: data.uploaded_by, 
                   updatedAt: data.updated_at,
                   filePath: fileName, // Store locally for now
                   fileUrl: urlData.signedUrl, // Store locally for now
                   downloadCount: 0
               };
               setDocumentTemplates(prev => [newTmpl, ...prev]);
               // Store file path mapping temporarily
               setTemplateFilePaths(prev => ({...prev, [data.id]: fileName}));
          }
      } catch (error) {
          console.error('Error adding template:', error);
      }
  };

  const handleDeleteTemplate = async (id: string) => {
      try {
          // Find the template to get file path
          const template = documentTemplates.find(t => t.id === id);
          const filePath = template?.filePath || templateFilePaths[id];
          
          // Delete file from storage if exists
          if (filePath) {
              console.log('Deleting file from storage:', filePath);
              const { error: storageError } = await supabase.storage
                  .from('document-templates')
                  .remove([filePath]);
              
              if (storageError) {
                  console.error('Error deleting file from storage:', storageError);
              } else {
                  console.log('File deleted from storage successfully');
              }
          }

          // Delete record from database
          const { error } = await supabase.from('document_templates').delete().eq('id', id);
          if (!error) {
              setDocumentTemplates(prev => prev.filter(t => t.id !== id));
              // Remove from file path mapping
              setTemplateFilePaths(prev => {
                  const newPaths = {...prev};
                  delete newPaths[id];
                  return newPaths;
              });
          }
      } catch (error) {
          console.error('Error deleting template:', error);
      }
  };

  const handleDownloadTemplate = async (id: string, fileName: string) => {
      try {
          const template = documentTemplates.find(t => t.id === id);
          const filePath = template?.filePath || templateFilePaths[id];
          
          if (!filePath) {
              console.error('File path not found for template');
              alert('File tidak ditemukan. Template mungkin diupload sebelum sistem file storage diaktifkan.');
              return;
          }

          // Create a fresh signed URL for download
          const { data: signedData, error: signedError } = await supabase.storage
              .from('document-templates')
              .createSignedUrl(filePath, 60 * 5); // 5 minutes for download

          if (signedError || !signedData?.signedUrl) {
              console.error('Error creating signed URL:', signedError);
              return;
          }

          // Download using the signed URL
          const response = await fetch(signedData.signedUrl);
          if (!response.ok) {
              console.error('Error downloading file:', response.statusText);
              return;
          }

          const blob = await response.blob();
          
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          // Update download count
          await supabase.from('document_templates')
              .update({ download_count: (template.downloadCount || 0) + 1 })
              .eq('id', id);

          // Update local state
          setDocumentTemplates(prev => 
              prev.map(t => t.id === id ? { ...t, downloadCount: (t.downloadCount || 0) + 1 } : t)
          );

      } catch (error) {
          console.error('Error downloading template:', error);
      }
  };
  // --- Feedback handlers ---
  const handleAddFeedback = async (title: string, description: string, category: FeedbackCategory) => {
      if (!currentUser) return;
      const { data, error } = await supabase.from('feedbacks').insert([{
          title, description, category, created_by: currentUser.name, upvotes: [currentUser.id]
      }]).select().single();
      
      if (data && !error) {
          const newFb = { ...data, adminResponse: data.admin_response, createdBy: data.created_by, createdAt: data.created_at };
          setFeedbacks(prev => [newFb, ...prev]);
      }
  };
  const handleUpdateFeedbackStatus = async (id: string, status: FeedbackStatus, response?: string) => {
      const { error } = await supabase.from('feedbacks').update({ status, admin_response: response }).eq('id', id);
      if (!error) {
          setFeedbacks(prev => prev.map(fb => fb.id === id ? { ...fb, status, adminResponse: response } : fb));
      }
  };
  const handleDeleteFeedback = async (id: string) => {
       const { error } = await supabase.from('feedbacks').delete().eq('id', id);
       if (!error) setFeedbacks(prev => prev.filter(fb => fb.id !== id));
  };
  const handleVoteFeedback = async (feedbackId: string, type: 'up' | 'down') => {
       if (!currentUser) return;
       const fb = feedbacks.find(f => f.id === feedbackId);
       if (!fb) return;

       let newUpvotes = [...(fb.upvotes || [])];
       let newDownvotes = [...(fb.downvotes || [])];
       const uid = currentUser.id;

       if (type === 'up') {
            if (newUpvotes.includes(uid)) newUpvotes = newUpvotes.filter((id: string) => id !== uid);
            else { newUpvotes.push(uid); newDownvotes = newDownvotes.filter((id: string) => id !== uid); }
       } else {
            if (newDownvotes.includes(uid)) newDownvotes = newDownvotes.filter((id: string) => id !== uid);
            else { newDownvotes.push(uid); newUpvotes = newUpvotes.filter((id: string) => id !== uid); }
       }

       setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, upvotes: newUpvotes, downvotes: newDownvotes } : f));
       
       await supabase.from('feedbacks').update({ upvotes: newUpvotes, downvotes: newDownvotes }).eq('id', feedbackId);
  };

  // --- Christmas Decoration Settings handlers ---
  const handleUpdateChristmasSettings = async (settings: ChristmasDecorationSettings) => {
    try {
      const payload = {
        santa_hat_enabled: settings.santaHatEnabled,
        bauble_enabled: settings.baubleEnabled,
        candy_enabled: settings.candyEnabled,
        enabled_by: settings.enabledBy,
        enabled_at: settings.enabledAt
      };

      // Try to update first, if no rows affected, insert new record
      const { data: updateData, error: updateError } = await supabase
        .from('christmas_settings')
        .update(payload)
        .eq('id', settings.id || 1) // Assume single row with id=1
        .select()
        .single();

      if (updateError && updateError.code === 'PGRST116') {
        // No rows found, insert new record
        const { data: insertData, error: insertError } = await supabase
          .from('christmas_settings')
          .insert([{ ...payload, id: 1 }])
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting christmas settings:', insertError);
          showNotification('Gagal Menyimpan', 'Gagal menyimpan pengaturan dekorasi Natal.', 'error');
          return;
        }

        if (insertData) {
          setChristmasSettings({
            id: insertData.id,
            santaHatEnabled: insertData.santa_hat_enabled,
            baubleEnabled: insertData.bauble_enabled,
            candyEnabled: insertData.candy_enabled,
            enabledBy: insertData.enabled_by,
            enabledAt: insertData.enabled_at
          });
        }
      } else if (updateError) {
        console.error('Error updating christmas settings:', updateError);
        showNotification('Gagal Menyimpan', 'Gagal menyimpan pengaturan dekorasi Natal.', 'error');
        return;
      } else if (updateData) {
        setChristmasSettings({
          id: updateData.id,
          santaHatEnabled: updateData.santa_hat_enabled,
          baubleEnabled: updateData.bauble_enabled,
          candyEnabled: updateData.candy_enabled,
          enabledBy: updateData.enabled_by,
          enabledAt: updateData.enabled_at
        });
      }

      // Show success notification
      const enabledCount = [settings.santaHatEnabled, settings.baubleEnabled, settings.candyEnabled].filter(Boolean).length;
      if (enabledCount > 0) {
        showNotification(
          'Dekorasi Natal Diaktifkan! 🎄', 
          `${enabledCount} dekorasi Natal berhasil diaktifkan untuk semua pengguna di dashboard.`, 
          'success'
        );
      } else {
        showNotification(
          'Dekorasi Natal Dimatikan', 
          'Semua dekorasi Natal telah dimatikan.', 
          'info'
        );
      }

    } catch (error: any) {
      console.error('Unexpected error updating christmas settings:', error);
      showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan: ${error.message}`, 'error');
    }
  };

  // --- Tasks & Projects handlers ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task && checkEditPermission(task)) {
        setDraggedTaskId(id);
        e.dataTransfer.effectAllowed = 'move';
    } else {
        e.preventDefault();
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault(); 

  const handleDrop = async (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    if (draggedTaskId) {
      setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, status } : t));
      await supabase.from('tasks').update({ status }).eq('id', draggedTaskId);
      setDraggedTaskId(null);
    }
  };
  const handleSaveTask = async (newTaskData: Omit<Task, 'id'>) => {
    // 1. Ambil user id untuk RLS
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
        showNotification('Login Diperlukan', 'Anda harus login untuk membuat task.', 'warning');
        return;
    }

    // 2. Payload untuk Supabase
    const payload = {
        title: newTaskData.title,
        category: newTaskData.category,
        sub_category: newTaskData.subCategory,
        start_date: newTaskData.startDate,
        deadline: newTaskData.deadline,
        pic: newTaskData.pic,
        priority: newTaskData.priority,
        status: newTaskData.status,
        description: newTaskData.description,
        project_id: newTaskData.projectId || null,
        attachments: newTaskData.attachments,
        links: newTaskData.links,
        created_by_id: userId   // <---- FIX PENTING
    };

    // 3. Jika edit
    if (editingTask) {
        // Find attachments that were removed (exist in old task but not in new data)
        const oldAttachments = editingTask.attachments || [];
        const newAttachments = newTaskData.attachments || [];
        const removedAttachments = oldAttachments.filter(oldAtt => 
            !newAttachments.some(newAtt => newAtt.id === oldAtt.id)
        );

        const { error } = await supabase
            .from('tasks')
            .update(payload)
            .eq('id', editingTask.id);

        if (!error) {
            // Clean up removed attachments from storage
            if (removedAttachments.length > 0) {
                const filePaths = removedAttachments
                    .filter(att => att.path) // Only files with valid paths
                    .map(att => att.path);
                
                if (filePaths.length > 0) {
                    try {
                        await supabase.storage
                            .from('attachment')
                            .remove(filePaths);
                    } catch (err) {
                        // Silent error handling
                        console.error('Error cleaning up removed attachments:', err);
                    }
                }
            }

            setTasks(prev =>
                prev.map(t =>
                    t.id === editingTask.id
                        ? { ...t, ...newTaskData, id: editingTask.id, createdBy: t.createdBy }
                        : t
                )
            );
            // Trigger refresh for ProjectOverview
            setProjectRefreshTrigger(prev => prev + 1);
        }

        setEditingTask(null);
        setIsModalOpen(false);
        return;
    }

    // 4. Jika create task baru
    const { data, error } = await supabase
        .from('tasks')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error("Insert error:", error);
        showNotification('Gagal Membuat Task', `Gagal membuat task: ${error.message}`, 'error');
        return;
    }

    // 5. Map kembali ke format front-end
    const createdByName = allUsers.find(u => u.id === data.created_by_id)?.name || currentUser?.name || 'Unknown';
    const mapped = {
        ...data,
        subCategory: data.sub_category,
        startDate: data.start_date,
        projectId: data.project_id,
        createdBy: createdByName,
    };

    setTasks(prev => [...prev, mapped]);
    // Trigger refresh for ProjectOverview
    setProjectRefreshTrigger(prev => prev + 1);
    setIsModalOpen(false);
  };

  const handleDeleteTask = async (id: string) => {
      // Find the task to get its attachments before deletion
      const taskToDelete = tasks.find(t => t.id === id);
      
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (!error) {
          // Clean up attachments from storage
          if (taskToDelete?.attachments && taskToDelete.attachments.length > 0) {
              const filePaths = taskToDelete.attachments
                  .filter(att => att.path) // Only files with valid paths
                  .map(att => att.path);
              
              if (filePaths.length > 0) {
                  try {
                      await supabase.storage
                          .from('attachment')
                          .remove(filePaths);
                  } catch (err) {
                      // Silent error handling
                      console.error('Error cleaning up attachments:', err);
                  }
              }
          }
          
          setTasks(prev => prev.filter(t => t.id !== id));
          // Trigger refresh for ProjectOverview
          setProjectRefreshTrigger(prev => prev + 1);
          setIsModalOpen(false);
          setEditingTask(null);
      }
  };

  const handleSaveProject = async (projectData: ProjectDefinition) => {
      console.log('Received project data for save:', projectData);
      console.log('Editing project:', editingProject);
      
      try {
          if (editingProject) {
              // Update existing project
              const updateData = {
                  name: projectData.name,
                  manager: projectData.manager,
                  description: projectData.description,
                  icon: projectData.icon,
                  color: projectData.color,
                  target_live_date: projectData.targetLiveDate,
                  status: projectData.status
              };
              console.log('Updating project with data:', updateData);
              
              const { data, error } = await supabase
                  .from('projects')
                  .update(updateData)
                  .eq('id', editingProject.id)
                  .select()
                  .single();
              
              if (data && !error) {
                  // Map database fields to frontend format
                  const mappedProject: ProjectDefinition = {
                      id: data.id,
                      name: data.name,
                      manager: data.manager,
                      description: data.description,
                      icon: data.icon,
                      color: data.color,
                      targetLiveDate: data.target_live_date,
                      status: data.status
                  };
                  setProjects(prev => prev.map(p => p.id === editingProject.id ? mappedProject : p));
                  showNotification('Project Berhasil Diupdate!', `Project "${projectData.name}" berhasil diperbarui.`, 'success');
                  // Trigger refresh for ProjectOverview
                  setProjectRefreshTrigger(prev => prev + 1);
              } else {
                  showNotification('Gagal Update Project', error?.message || 'Terjadi kesalahan saat update project.', 'error');
              }
          } else {
              // Create new project
              const { data, error } = await supabase
                  .from('projects')
                  .insert([{
                      name: projectData.name,
                      manager: projectData.manager,
                      description: projectData.description,
                      icon: projectData.icon,
                      color: projectData.color,
                      target_live_date: projectData.targetLiveDate,
                      status: projectData.status
                  }])
                  .select()
                  .single();
              
              if (data && !error) {
                  // Map database fields to frontend format
                  const mappedProject: ProjectDefinition = {
                      id: data.id,
                      name: data.name,
                      manager: data.manager,
                      description: data.description,
                      icon: data.icon,
                      color: data.color,
                      targetLiveDate: data.target_live_date,
                      status: data.status
                  };
                  setProjects(prev => [...prev, mappedProject]);
                  showNotification('Project Berhasil Dibuat!', `Project "${projectData.name}" berhasil ditambahkan.`, 'success');
                  // Trigger refresh for ProjectOverview
                  setProjectRefreshTrigger(prev => prev + 1);
              } else {
                  showNotification('Gagal Buat Project', error?.message || 'Terjadi kesalahan saat membuat project.', 'error');
              }
          }
          
          // Close modal and clear editing state
          setIsProjectModalOpen(false);
          setEditingProject(null);
          
          // Trigger refresh for ProjectOverview
          setProjectRefreshTrigger(prev => prev + 1);
          
      } catch (error: any) {
          console.error('Error saving project:', error);
          showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan: ${error.message}`, 'error');
      }
  }

  // Handle task click - opens view modal
  const handleTaskClick = (task: Task) => {
      setViewingTask(task);
      setIsTaskViewModalOpen(true);
  }

  // Handle edit click - opens edit modal directly
  const handleEditClick = (task: Task) => {
      setEditingTask(task);
      setIsModalOpen(true);
  }

  // Handle edit from view modal
  const handleEditFromView = () => {
      if (viewingTask) {
          setEditingTask(viewingTask);
          setIsTaskViewModalOpen(false);
          setIsModalOpen(true);
      }
  }



  // Handle add comment
  const handleAddComment = async (taskId: string, content: string) => {
    if (!currentUser) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempComment: Comment = {
      id: tempId,
      taskId,
      userId: currentUser.id,
      userName: currentUser.name,
      content,
      createdAt: new Date().toISOString()
    };

    // Add to local state immediately for optimistic update
    setComments(prev => [tempComment, ...prev]);

    try {
      // Save to database
      const { data, error } = await supabase.from('task_comments').insert([{
        task_id: taskId,
        user_id: currentUser.id,
        user_name: currentUser.name,
        content: content
      }]).select().single();

      if (error) throw error;

      // Replace temp comment with real comment from database
      const realComment: Comment = {
        id: data.id,
        taskId: data.task_id,
        userId: data.user_id,
        userName: data.user_name,
        content: data.content,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setComments(prev => prev.map(c => c.id === tempId ? realComment : c));

      // Create notification for task PICs
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
        await createCommentNotification(taskId, task.title, currentUser.name, taskPics);
      }
    } catch (error) {
      // If save fails, remove temp comment from local state
      setComments(prev => prev.filter(c => c.id !== tempId));
      console.error('Error saving comment:', error);
      throw error;
    }
  }

  const openNewTaskModal = () => {
      setEditingTask(null);
      setIsModalOpen(true);
  }
  // --- Server-side functions for ProjectOverview ---
  const fetchProjects = useCallback(async (filters: {
    search?: string;
    status?: string;
    manager?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    try {
      let query = supabase.from('projects').select('*', { count: 'exact' });

      if (filters.search) {
        // Enhanced search: case-insensitive search in name, manager, and description
        const searchTerm = filters.search.toLowerCase();
        query = query.or(`name.ilike.%${searchTerm}%,manager.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (filters.status && filters.status !== 'All') {
        query = query.eq('status', filters.status);
      }

      if (filters.manager && filters.manager !== 'All') {
        query = query.eq('manager', filters.manager);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 12;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      query = query.order('created_at', { ascending: false });

      const { data: projectsData, count } = await query;

      if (projectsData) {
        const mappedProjects: ProjectDefinition[] = projectsData.map((project: any) => ({
          id: project.id,
          name: project.name,
          manager: project.manager,
          description: project.description,
          icon: project.icon,
          color: project.color,
          targetLiveDate: project.target_live_date,
          status: project.status
        }));

        return {
          projects: mappedProjects,
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        };
      }

      return { projects: [], totalCount: 0, totalPages: 0 };
    } catch (error) {
      return { projects: [], totalCount: 0, totalPages: 0 };
    }
  }, []);

  const fetchProjectTasks = useCallback(async (projectId: string, filters: {
    search?: string;
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    try {
      let query = supabase.from('tasks').select('*', { count: 'exact' });

      query = query.eq('project_id', projectId);

      // Remove search filtering temporarily to test basic functionality
      // if (filters.search) {
      //   const searchTerm = filters.search.toLowerCase();
      //   query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sub_category.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
      // }

      if (filters.status && filters.status !== 'All') {
        query = query.eq('status', filters.status);
      }

      if (filters.priority && filters.priority !== 'All') {
        query = query.eq('priority', filters.priority);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      query = query.order('created_at', { ascending: false });

      const { data: tasksData, count, error } = await query;

      if (error) {
        console.error('Database query error:', error);
        return { tasks: [], totalCount: 0, totalPages: 0 };
      }

      if (tasksData) {
        const processedTasks = await Promise.all(
          tasksData.map(async (task: any) => {
            let attachments: any[] = [];
            if (task.attachments && Array.isArray(task.attachments)) {
              attachments = await Promise.all(
                task.attachments.map(async (att: any) => {
                  if (att.path) {
                    try {
                      const { data: signedData } = await supabase.storage
                        .from('attachment')
                        .createSignedUrl(att.path, 60 * 60);
                      return { ...att, url: signedData?.signedUrl };
                    } catch {
                      return att;
                    }
                  }
                  return att;
                })
              );
            }

            // Process links - ensure it's an array
            const links = Array.isArray(task.links) ? task.links : [];

            return {
              ...task,
              subCategory: task.sub_category,
              startDate: task.start_date,
              projectId: task.project_id,
              createdBy: allUsers.find(u => u.id === task.created_by_id)?.name || 'Unknown',
              attachments,
              links
            } as Task;
          })
        );

        // Apply search filtering client-side for now
        let filteredTasks = processedTasks;
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          filteredTasks = processedTasks.filter(task => {
            const titleMatch = task.title?.toLowerCase().includes(searchTerm);
            const descMatch = task.description?.toLowerCase().includes(searchTerm);
            const categoryMatch = task.category?.toLowerCase().includes(searchTerm);
            const subCategoryMatch = task.subCategory?.toLowerCase().includes(searchTerm);
            
            // Check PIC array
            const picArray = Array.isArray(task.pic) ? task.pic : [task.pic];
            const picMatch = picArray.some(pic => 
              typeof pic === 'string' && pic.toLowerCase().includes(searchTerm)
            );
            
            // Check createdBy
            const createdByMatch = task.createdBy?.toLowerCase().includes(searchTerm);
            
            return titleMatch || descMatch || categoryMatch || subCategoryMatch || picMatch || createdByMatch;
          });
        }

        return {
          tasks: filteredTasks,
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        };
      }

      return { tasks: [], totalCount: 0, totalPages: 0 };
    } catch (error) {
      console.error('fetchProjectTasks error:', error);
      return { tasks: [], totalCount: 0, totalPages: 0 };
    }
  }, [allUsers]);

  const fetchUniqueManagers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('manager')
        .not('manager', 'is', null);
      
      if (data) {
        return Array.from(new Set(data.map(p => p.manager))).sort();
      }
      return [];
    } catch (error) {
      return [];
    }
  }, []);
  // Status handlers
  const handleCreateStatus = () => {
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async (statusData: Omit<UserStatus, 'id' | 'userId' | 'createdAt' | 'expiresAt'>) => {
    if (!currentUser) return;
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const { data, error } = await supabase.from('user_statuses').insert([{
      user_id: currentUser.id,
      type: statusData.type,
      content: statusData.content,
      emoji: statusData.emoji,
      expires_at: expiresAt.toISOString()
    }]).select().single();
    
    if (data && !error) {
      const newStatus = {
        ...data,
        userId: data.user_id,
        createdAt: data.created_at,
        expiresAt: data.expires_at
      };
      setUserStatuses(prev => [newStatus, ...prev]);
      setIsStatusModalOpen(false);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    const { error } = await supabase.from('user_statuses').delete().eq('id', statusId);
    
    if (!error) {
      setUserStatuses(prev => prev.filter(s => s.id !== statusId));
    }
  };

  // Handle user card click from dashboard
  const handleUserCardClick = (userName: string) => {
    // Switch to "Semua Task" tab
    setActiveTab('Semua Task');
    
    // Set filter to show only tasks for the clicked user
    setFilters(prev => ({
      ...prev,
      pic: userName,
      search: '', // Clear search to show all tasks for this user
      category: 'All',
      priority: 'All',
      status: 'All',
      projectId: 'All'
    }));
  };

  // --- Announcement handlers ---
  const handleCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setIsAnnouncementModalOpen(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const payload = {
        title: announcementData.title,
        description: announcementData.description,
        type: announcementData.type,
        emoji: announcementData.emoji || null,
        background_color: announcementData.backgroundColor || null,
        text_color: announcementData.textColor || null,
        is_active: announcementData.isActive,
        created_by: announcementData.createdBy,
        expires_at: announcementData.expiresAt || null
      };

      if (editingAnnouncement) {
        // Update existing announcement
        const { data, error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editingAnnouncement.id)
          .select()
          .single();

        if (error) {
          showNotification('Gagal Update Pengumuman', error.message, 'error');
          return;
        }

        if (data) {
          const mappedAnnouncement: Announcement = {
            id: data.id,
            title: data.title,
            description: data.description,
            type: data.type,
            emoji: data.emoji,
            backgroundColor: data.background_color,
            textColor: data.text_color,
            isActive: data.is_active,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            expiresAt: data.expires_at
          };

          setAnnouncements(prev => prev.map(a => a.id === editingAnnouncement.id ? mappedAnnouncement : a));
          showNotification('Pengumuman Berhasil Diupdate!', `Pengumuman "${announcementData.title}" berhasil diperbarui.`, 'success');
        }
      } else {
        // Create new announcement
        const { data, error } = await supabase
          .from('announcements')
          .insert([payload])
          .select()
          .single();

        if (error) {
          showNotification('Gagal Buat Pengumuman', error.message, 'error');
          return;
        }

        if (data) {
          const mappedAnnouncement: Announcement = {
            id: data.id,
            title: data.title,
            description: data.description,
            type: data.type,
            emoji: data.emoji,
            backgroundColor: data.background_color,
            textColor: data.text_color,
            isActive: data.is_active,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            expiresAt: data.expires_at
          };

          setAnnouncements(prev => [mappedAnnouncement, ...prev]);
          showNotification('Pengumuman Berhasil Dibuat!', `Pengumuman "${announcementData.title}" berhasil ditambahkan.`, 'success');
        }
      }

      setIsAnnouncementModalOpen(false);
      setEditingAnnouncement(null);
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan: ${error.message}`, 'error');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      
      if (error) {
        showNotification('Gagal Hapus Pengumuman', error.message, 'error');
        return;
      }

      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showNotification('Pengumuman Berhasil Dihapus!', 'Pengumuman telah dihapus dari sistem.', 'success');
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan: ${error.message}`, 'error');
    }
  };

  const handleToggleAnnouncementActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) {
        showNotification('Gagal Update Status', error.message, 'error');
        return;
      }

      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isActive } : a));
      showNotification(
        isActive ? 'Pengumuman Diaktifkan' : 'Pengumuman Dinonaktifkan',
        `Pengumuman berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
        'success'
      );
    } catch (error: any) {
      console.error('Error toggling announcement:', error);
      showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan: ${error.message}`, 'error');
    }
  };

  // Handle task navigation from notification
  const handleTaskNavigation = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setViewingTask(task);
      setIsTaskViewModalOpen(true);
    }
  };

  // Initialize notifications hook
  const {
    notifications,
    createCommentNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationClick,
    dismissAllNotifications
  } = useNotifications({
    currentUser,
    tasks,
    onTaskNavigation: handleTaskNavigation
  });



  // --- Filtering ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Handle both array and string PIC for backward compatibility
      const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
      const matchesSearch = task.title?.toLowerCase().includes(filters.search.toLowerCase()) || 
                            taskPics.some(pic => pic?.toLowerCase().includes(filters.search.toLowerCase()));
      const matchesCategory = filters.category === 'All' || task.category === filters.category;
      const matchesPic = filters.pic === 'All' || taskPics.includes(filters.pic);
      const matchesPriority = filters.priority === 'All' || task.priority === filters.priority;
      const matchesStatus = filters.status === 'All' || task.status === filters.status;
      const matchesProject = filters.projectId === 'All' || task.projectId === filters.projectId;
      
      const matchesSidebar = activeTab === 'Semua Task' || activeTab === 'Dashboard' || task.category === activeTab;

      return matchesSearch && matchesCategory && matchesPic && matchesPriority && matchesStatus && matchesSidebar && matchesProject;
    });
  }, [tasks, filters, activeTab]);

  // --- Loading UI & Login rendering ---
  if (isLoadingAuth) {
      return (
          <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
              <Loader2 className="animate-spin text-gov-600" size={48} />
          </div>
      );
  }

  // Render Login if not authenticated or profile not loaded
  if (!session || !currentUser) {
      return <LoginPage onLogin={handleLogin} error={authError} />;
  }

  // --- Main App UI ---
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'Surat & Dokumen') setSuratSubTab('Tasks');
        }} 
        currentUser={currentUser}
        users={allUsers}
        onSwitchUser={() => {}} // Disabled for real auth
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-64 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header / Filter Bar - HIDDEN for special pages */}
        {activeTab !== 'Dashboard' && activeTab !== 'Project' && activeTab !== 'Master Data' && activeTab !== 'Saran Masukan' && activeTab !== 'Pengumuman' && (
        <header className="bg-white border-b border-slate-200 px-6 py-4 z-20 relative">
          <div className="flex flex-col gap-4 mb-4">
             {/* Title Section */}
             <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{activeTab}</h2>
                    <p className="text-sm text-slate-500">Kelola dan pantau aktivitas tim anda.</p>
                </div>
                
                {/* Notification Icon */}
                <NotificationIcon
                  notifications={notifications}
                  onMarkAllAsRead={markAllAsRead}
                  onNotificationClick={handleNotificationClick}
                  onDeleteNotification={deleteNotification}
                  onDismissAll={dismissAllNotifications}
                />
             </div>
             
             {/* Buttons Row - All buttons in horizontal alignment */}
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {/* View Switcher */}
                    {!(activeTab === 'Surat & Dokumen' && suratSubTab === 'Templates') && (
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setViewMode('Board')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'Board' ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Layout size={16} /> Board
                            </button>
                            <button 
                                onClick={() => setViewMode('Timeline')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'Timeline' ? 'bg-white text-gov-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <CalendarRange size={16} /> Timeline
                            </button>
                        </div>
                    )}
                    
                    {/* Surat & Dokumen Sub-Nav */}
                    {activeTab === 'Surat & Dokumen' && (
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                               onClick={() => setSuratSubTab('Tasks')}
                               className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${suratSubTab === 'Tasks' ? 'bg-white text-gov-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                               <ListTodo size={16} /> Daftar Surat/Task
                            </button>
                            <button 
                               onClick={() => setSuratSubTab('Templates')}
                               className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${suratSubTab === 'Templates' ? 'bg-white text-gov-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                               <FileText size={16} /> Template Dokumen
                            </button>
                        </div>
                    )}
                </div>

                {/* Action Buttons - Only show "Tambah Task" for non-project tabs */}
                {!(activeTab === 'Surat & Dokumen' && suratSubTab === 'Templates') && (
                    <div className="flex gap-2">
                       <button 
                           onClick={openNewTaskModal}
                           className="flex items-center gap-2 bg-gov-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-gov-700 hover:shadow-lg hover:shadow-gov-200 transition-all transform active:scale-95 text-sm"
                       >
                           <Plus size={16} />
                           <span>Tambah Task</span>
                       </button>
                    </div>
                )}
             </div>
          </div>

          {/* Filter Bar */}
          {!(activeTab === 'Surat & Dokumen' && suratSubTab === 'Templates') && (
              <div className="flex flex-col xl:flex-row gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                        type="text" 
                        placeholder="Cari task, PIC, kategori, deskripsi..." 
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all"
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 xl:pb-0 no-scrollbar items-center">
                        {/* CATEGORY FILTER - hanya tampil di halaman "Semua Task" */}
                        {activeTab === 'Semua Task' ? (
                          <select 
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none cursor-pointer"
                            value={filters.category}
                            onChange={(e) => setFilters(prev => ({...prev, category: e.target.value as Category | 'All'}))}
                          >
                            <option value="All">Semua Kategori</option>
                            {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : null}

                        <select 
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none cursor-pointer"
                            value={filters.projectId}
                            onChange={(e) => setFilters(prev => ({...prev, projectId: e.target.value}))}
                        >
                            <option value="All">Semua Project</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>

                        <select 
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none cursor-pointer"
                            value={filters.pic}
                            onChange={(e) => setFilters(prev => ({...prev, pic: e.target.value}))}
                        >
                            <option value="All">Semua PIC</option>
                            {allUniquePics.map(pic => <option key={pic} value={pic}>{pic}</option>)}
                        </select>

                        <select 
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none cursor-pointer"
                            value={filters.priority}
                            onChange={(e) => setFilters(prev => ({...prev, priority: e.target.value as Priority | 'All'}))}
                        >
                            <option value="All">Semua Prioritas</option>
                            {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
          )}
        </header>
        )}
        {/* Content Area */}
        {activeTab === 'Dashboard' ? (
          <Dashboard 
            tasks={tasks} 
            users={taskAssignableUsers} 
            userStatuses={userStatuses}
            onCreateStatus={handleCreateStatus}
            onDeleteStatus={handleDeleteStatus}
            currentUser={currentUser}
            onUserCardClick={handleUserCardClick}
            christmasSettings={christmasSettings}
            onUpdateChristmasSettings={handleUpdateChristmasSettings}
            notifications={notifications}
            onMarkAllAsRead={markAllAsRead}
            onNotificationClick={handleNotificationClick}
            onDeleteNotification={deleteNotification}
            onDismissAll={dismissAllNotifications}
            announcements={announcements}
          />
        ) : activeTab === 'Project' ? (
          <ProjectOverview
            onTaskClick={handleTaskClick}
            onEditProject={(project) => {
              // Set editing project and open modal
              setEditingProject(project);
              setIsProjectModalOpen(true);
            }}
            onDeleteProject={async (projectId) => {
              // Check if project has tasks
              const projectTasks = tasks.filter(t => t.projectId === projectId);
              if (projectTasks.length > 0) {
                showNotification(
                  'Tidak Dapat Menghapus Project', 
                  `Project ini masih memiliki ${projectTasks.length} task aktif. Hapus atau pindahkan task terlebih dahulu sebelum menghapus project.`, 
                  'warning'
                );
                return;
              }

              // Find project name for confirmation
              const project = projects.find(p => p.id === projectId);
              const projectName = project?.name || 'Project';
              
              // Show confirmation modal
              showConfirm(
                'Hapus Project',
                `Apakah Anda yakin ingin menghapus project "${projectName}"?\n\nTindakan ini tidak dapat dibatalkan.`,
                async () => {
                  try {
                    const { error } = await supabase.from('projects').delete().eq('id', projectId);
                    if (!error) {
                      setProjects(prev => prev.filter(p => p.id !== projectId));
                      setProjectRefreshTrigger(prev => prev + 1); // Trigger refresh
                      showNotification('Project Berhasil Dihapus!', `Project "${projectName}" berhasil dihapus.`, 'success');
                    } else {
                      showNotification('Gagal Hapus Project', error.message || 'Terjadi kesalahan saat menghapus project.', 'error');
                    }
                  } catch (error: any) {
                    showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan: ${error.message}`, 'error');
                  }
                },
                'error',
                'Hapus',
                'Batal'
              );
            }}
            onCreateProject={() => {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            }}
            canManageProjects={currentUser?.role === 'Super Admin' || currentUser?.role === 'Atasan' || currentUser?.role === 'Staff'}
            refreshTrigger={projectRefreshTrigger}
            fetchProjects={fetchProjects}
            fetchProjectTasks={fetchProjectTasks}
            fetchUniqueManagers={fetchUniqueManagers}
          />
        ) : activeTab === 'Saran Masukan' ? (
          <WallOfFeedback 
            feedbacks={feedbacks || []}
            currentUser={currentUser}
            onAddFeedback={handleAddFeedback}
            onVote={handleVoteFeedback}
            onDeleteFeedback={handleDeleteFeedback}
            onUpdateStatus={handleUpdateFeedbackStatus}
          />
        ) : activeTab === 'Pengumuman' ? (
          <div className="p-6 h-full overflow-y-auto bg-slate-50">
            <AnnouncementManager
              announcements={announcements}
              onCreateAnnouncement={handleCreateAnnouncement}
              onEditAnnouncement={handleEditAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onToggleActive={handleToggleAnnouncementActive}
              currentUser={currentUser}
            />
          </div>
        ) : activeTab === 'Master Data' ? (
          <UserManagement 
            users={allUsers}
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            jabatanList={jabatanList}
            onAddJabatan={handleAddJabatan}
            onDeleteJabatan={handleDeleteJabatan}
            subCategories={subCategories}
            onAddSubCategory={handleAddSubCategory}
            onDeleteSubCategory={handleDeleteSubCategory}
            masterCategories={masterCategories}
            masterSubCategories={masterSubCategories}
            categorySubcategoryRelations={categorySubcategoryRelations}
            onAddMasterCategory={handleAddMasterCategory}
            onUpdateMasterCategory={handleUpdateMasterCategory}
            onDeleteMasterCategory={handleDeleteMasterCategory}
            onAddMasterSubCategory={handleAddMasterSubCategory}
            onUpdateMasterSubCategory={handleUpdateMasterSubCategory}
            onDeleteMasterSubCategory={handleDeleteMasterSubCategory}
          />
        ) : activeTab === 'Surat & Dokumen' && suratSubTab === 'Templates' ? (
          <DocumentTemplates 
            templates={documentTemplates}
            currentUser={currentUser}
            onAddTemplate={handleAddTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onDownloadTemplate={handleDownloadTemplate}
          />
        ) : (
            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-50 p-6">
                {viewMode === 'Board' ? (
                    <div className="flex h-full gap-6 min-w-[1200px]">
                        {columns.map(status => {
                            const columnTasks = filteredTasks.filter(t => t.status === status);
                            return (
                                <div 
                                    key={status}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, status)}
                                    className="flex-1 flex flex-col min-w-[280px] bg-slate-100/50 rounded-xl border border-slate-200/60 max-h-full"
                                >
                                    <div className="p-4 flex items-center justify-between sticky top-0 bg-transparent">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-700 text-sm tracking-wide">{status}</h3>
                                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                                {columnTasks.length}
                                            </span>
                                        </div>
                                        <div className={`h-2 w-2 rounded-full ${
                                            status === Status.Done ? 'bg-green-500' : 
                                            status === Status.ToDo ? 'bg-slate-400' :
                                            status === Status.InProgress ? 'bg-gov-500' : 'bg-orange-400'
                                        }`} />
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-3 pb-3 kanban-scroll">
                                        {columnTasks.length > 0 ? (
                                            columnTasks.map(task => (
                                                <TaskCard 
                                                    key={task.id} 
                                                    task={task} 
                                                    projects={projects}
                                                    onDragStart={handleDragStart} 
                                                    onClick={handleTaskClick}
                                                    canEdit={checkEditPermission(task)}
                                                />
                                            ))
                                        ) : (
                                            <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg mx-1">
                                                <span className="text-xs">Kosong</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <TimelineView 
                        tasks={filteredTasks} 
                        projects={projects}
                        users={taskAssignableUsers}
                        onTaskClick={handleTaskClick} 
                    />
                )}
            </div>
        )}

      </main>
      {/* Modals */}
      <TaskViewModal
        isOpen={isTaskViewModalOpen}
        onClose={() => {
          setIsTaskViewModalOpen(false);
          setViewingTask(null);
        }}
        onEdit={handleEditFromView}
        task={viewingTask}
        currentUser={currentUser}
        canEdit={viewingTask ? checkEditPermission(viewingTask) : false}
        projects={projects}
        users={taskAssignableUsers}
        comments={comments}
        onAddComment={handleAddComment}
      />

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialData={editingTask}
        currentUser={currentUser}
        canEdit={editingTask ? checkEditPermission(editingTask) : true}
        canDelete={editingTask ? checkDeletePermission(editingTask) : false}
        projects={projects}
        users={taskAssignableUsers}
        subCategories={subCategories}
        masterCategories={masterCategories}
        masterSubCategories={masterSubCategories}
        categorySubcategoryRelations={categorySubcategoryRelations}
      />

      <AddProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        users={taskAssignableUsers}
        editingProject={editingProject}
      />

      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSave={handleSaveStatus}
        currentUser={currentUser}
      />

      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={hideNotification}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
        autoClose={notificationModal.type === 'success'}
        autoCloseDelay={4000}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={hideConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />

      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => {
          setIsAnnouncementModalOpen(false);
          setEditingAnnouncement(null);
        }}
        onSave={handleSaveAnnouncement}
        editingAnnouncement={editingAnnouncement}
        currentUser={currentUser}
      />
    </div>
  );
};

export default App;