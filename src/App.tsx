// src/App.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import { Plus, Search, Layout, CalendarRange, Briefcase, FileText, ListTodo, Loader2 } from 'lucide-react';
import { Task, Status, Category, Priority, FilterState, User, ProjectDefinition, ViewMode, Feedback, FeedbackCategory, FeedbackStatus, DocumentTemplate, UserStatus, Attachment } from '../types';
import Sidebar from './components/Sidebar';
import TaskCard from './components/TaskCard';
import AddTaskModal from './components/AddTaskModal';
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
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  
  // Filtered users (exclude Super Admin from task assignments and dashboard)
  const taskAssignableUsers = useMemo(() => 
    allUsers.filter(user => user.role !== 'Super Admin'), 
    [allUsers]
  );
  
  // Master Data State
  const [jabatanList, setJabatanList] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('Dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectDefinition | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('Board');
  
  // Notification Modal State
  const [notificationModal, setNotificationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'warning' | 'info'
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
        setCurrentUser(data as User);
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
      if (usersData) setAllUsers(usersData as User[]);

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

            return {
              ...t,
              subCategory: safe(t.sub_category) || safe(t.subCategory) || '',
              startDate: t.start_date || t.startDate || new Date().toISOString().split('T')[0],
              projectId: t.project_id || t.projectId || null,
              createdBy: createdByName,
              deadline: t.deadline || (t.deadline_at || null),
              attachments
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
          updatedAt: t.updated_at ? new Date(t.updated_at).toISOString().split('T')[0] : (t.updatedAt || '')
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
    } catch (err) {
      console.error('fetch All Data error', err);
    }
  };
  // --- Permissions Logic ---
  const checkEditPermission = (task: Task) => {
      if (!currentUser) return false;
      if (currentUser.role === 'Super Admin') return true;
      return currentUser.role === 'Atasan' || task.createdBy === currentUser.name;
  };

  const checkDeletePermission = (task: Task) => {
      if (!currentUser) return false;
      if (currentUser.role === 'Super Admin') return true;
      return currentUser.role === 'Atasan' || task.createdBy === currentUser.name;
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
      
      showNotification('Logout Berhasil', 'Anda telah logout dari sistem.', 'success');
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
      
      showNotification('Force Logout', 'Session telah dibersihkan.', 'warning');
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
                  initials: newUser.initials
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
              email: updatedUser.email
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

  // --- Document Templates handlers ---
  const handleAddTemplate = async (name: string, description: string, fileType: string, fileSize: number) => {
      if (!currentUser) return;
      const { data, error } = await supabase.from('document_templates').insert([{
          name, description, file_type: fileType, file_size: fileSize, uploaded_by: currentUser.name
      }]).select().single();

      if (data && !error) {
           const newTmpl = {
               ...data,
               fileType: data.file_type, fileSize: data.file_size, uploadedBy: data.uploaded_by, updatedAt: data.updated_at
           };
           setDocumentTemplates(prev => [newTmpl, ...prev]);
      }
  };
  const handleDeleteTemplate = async (id: string) => {
      const { error } = await supabase.from('document_templates').delete().eq('id', id);
      if (!error) setDocumentTemplates(prev => prev.filter(t => t.id !== id));
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
        created_by_id: userId   // <---- FIX PENTING
    };

    // 3. Jika edit
    if (editingTask) {
        const { error } = await supabase
            .from('tasks')
            .update(payload)
            .eq('id', editingTask.id);

        if (!error) {
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
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (!error) {
          setTasks(prev => prev.filter(t => t.id !== id));
          // Trigger refresh for ProjectOverview
          setProjectRefreshTrigger(prev => prev + 1);
          setIsModalOpen(false);
          setEditingTask(null);
      }
  };

  const handleSaveProject = async (projectData: ProjectDefinition) => {
      try {
          if (editingProject) {
              // Update existing project
              const { data, error } = await supabase
                  .from('projects')
                  .update({
                      name: projectData.name,
                      manager: projectData.manager,
                      description: projectData.description,
                      icon: projectData.icon,
                      color: projectData.color,
                      target_live_date: projectData.targetLiveDate,
                      status: projectData.status
                  })
                  .eq('id', editingProject.id)
                  .select()
                  .single();
              
              if (data && !error) {
                  setProjects(prev => prev.map(p => p.id === editingProject.id ? data : p));
                  showNotification('Project Berhasil Diupdate!', `Project "${projectData.name}" berhasil diperbarui.`, 'success');
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
                  setProjects(prev => [...prev, data]);
                  showNotification('Project Berhasil Dibuat!', `Project "${projectData.name}" berhasil ditambahkan.`, 'success');
              } else {
                  showNotification('Gagal Buat Project', error?.message || 'Terjadi kesalahan saat membuat project.', 'error');
              }
          }
          
          // Close modal and clear editing state
          setIsProjectModalOpen(false);
          setEditingProject(null);
          
      } catch (error: any) {
          console.error('Error saving project:', error);
          showNotification('Kesalahan Tidak Terduga', `Terjadi kesalahan: ${error.message}`, 'error');
      }
  }

  const handleEditClick = (task: Task) => {
      setEditingTask(task);
      setIsModalOpen(true);
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
        query = query.or(`name.ilike.%${filters.search}%,manager.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
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

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,pic.ilike.%${filters.search}%`);
      }

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

      const { data: tasksData, count } = await query;

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

            return {
              ...task,
              subCategory: task.sub_category,
              startDate: task.start_date,
              projectId: task.project_id,
              createdBy: allUsers.find(u => u.id === task.created_by_id)?.name || 'Unknown',
              attachments
            } as Task;
          })
        );

        return {
          tasks: processedTasks,
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        };
      }

      return { tasks: [], totalCount: 0, totalPages: 0 };
    } catch (error) {
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

  // --- Filtering ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title?.toLowerCase().includes(filters.search.toLowerCase()) || 
                            task.pic?.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = filters.category === 'All' || task.category === filters.category;
      const matchesPic = filters.pic === 'All' || task.pic === filters.pic;
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
        
        {/* Top Header / Filter Bar - HIDDEN for Saran Masukan */}
        {activeTab !== 'Dashboard' && activeTab !== 'Project' && activeTab !== 'Master Data' && activeTab !== 'Saran Masukan' && (
        <header className="bg-white border-b border-slate-200 px-6 py-4 z-20">
          <div className="flex flex-col gap-4 mb-4">
             {/* Title Section */}
             <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{activeTab}</h2>
                    <p className="text-sm text-slate-500">Kelola dan pantau aktivitas tim anda.</p>
                </div>
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
                        placeholder="Cari task atau PIC..." 
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
                            {taskAssignableUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
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
          />
        ) : activeTab === 'Project' ? (
          <ProjectOverview
            onTaskClick={handleEditClick}
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
              
              if (window.confirm('Apakah Anda yakin ingin menghapus project ini?')) {
                const { error } = await supabase.from('projects').delete().eq('id', projectId);
                if (!error) {
                  setProjects(prev => prev.filter(p => p.id !== projectId));
                }
              }
            }}
            onCreateProject={() => {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            }}
            canManageProjects={currentUser?.role === 'Super Admin' || currentUser?.role === 'Atasan'}
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
          />
        ) : activeTab === 'Surat & Dokumen' && suratSubTab === 'Templates' ? (
          <DocumentTemplates 
            templates={documentTemplates}
            currentUser={currentUser}
            onAddTemplate={handleAddTemplate}
            onDeleteTemplate={handleDeleteTemplate}
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
                                                    onClick={handleEditClick}
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
                        onTaskClick={handleEditClick} 
                    />
                )}
            </div>
        )}

      </main>
      {/* Modals */}
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
    </div>
  );
};

export default App;