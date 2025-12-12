// src/App.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabaseClient';
import { Plus, Search, Layout, CalendarRange, Briefcase, FileText, ListTodo, Loader2 } from 'lucide-react';
import { Task, Status, Category, Priority, FilterState, User, ProjectDefinition, ViewMode, Feedback, FeedbackCategory, FeedbackStatus, DocumentTemplate, Attachment } from '../types';
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
  
  // Master Data State
  const [jabatanList, setJabatanList] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('Dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('Board');

  // Sub-tab state for Surat & Dokumen
  const [suratSubTab, setSuratSubTab] = useState<'Tasks' | 'Templates'>('Tasks');

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
  // we intentionally don't add 'filters' to deps to avoid infinite loop;
  // only watch activeTab. If you want strict linting, you can include filters in deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeTab]);


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
      if (sess) fetchUserProfile(sess.user.id);
      else setCurrentUser(null);
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
        setCurrentUser(null);
      } else if (data) {
        setCurrentUser(data as User);
      }
    } catch (err) {
      console.error('fetchUserProfile unexpected', err);
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

          return {
            ...t,
            subCategory: safe(t.sub_category) || safe(t.subCategory) || '',
            projectId: t.project_id || t.projectId || null,
            createdBy: safe(t.created_by) || safe(t.createdBy) || 'Unknown',
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
    await supabase.auth.signOut();
    setActiveTab('Dashboard');
    setCurrentUser(null);
    setSession(null);
  };

  // --- User Management handlers ---
  const handleAddUser = async (newUser: User) => {
      alert("Untuk menambah user login, gunakan Supabase Dashboard > Authentication. Disini hanya simulasi data profil.");
  };
  const handleEditUser = async (updatedUser: User) => {
      const { error } = await supabase.from('profiles').update({
          name: updatedUser.name,
          role: updatedUser.role,
          jabatan: updatedUser.jabatan,
          initials: updatedUser.initials
      }).eq('id', updatedUser.id);
      
      if (!error) {
          setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
          if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);
      }
  };
  const handleDeleteUser = async (userId: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (!error) setAllUsers(prev => prev.filter(u => u.id !== userId));
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
        alert("Anda harus login untuk membuat task.");
        return;
    }

    // 2. Payload untuk Supabase
    const payload = {
        title: newTaskData.title,
        category: newTaskData.category,
        sub_category: newTaskData.subCategory,
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
                        ? { ...t, ...newTaskData, id: editingTask.id }
                        : t
                )
            );
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
        alert("Gagal membuat task: " + error.message);
        return;
    }

    // 5. Map kembali ke format front-end
    const mapped = {
        ...data,
        subCategory: data.sub_category,
        projectId: data.project_id,
        createdBy: data.created_by_id,
    };

    setTasks(prev => [...prev, mapped]);
    setIsModalOpen(false);
};


  const handleDeleteTask = async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (!error) {
          setTasks(prev => prev.filter(t => t.id !== id));
          setIsModalOpen(false);
          setEditingTask(null);
      }
  };

  const handleSaveProject = async (newProject: ProjectDefinition) => {
      const { data, error } = await supabase.from('projects').insert([{
          name: newProject.name, manager: newProject.manager, description: newProject.description
      }]).select().single();
      
      if (data && !error) {
          setProjects(prev => [...prev, data]);
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
        
        {/* Top Header / Filter Bar */}
        {activeTab !== 'Dashboard' && activeTab !== 'Project' && activeTab !== 'Master Data' && activeTab !== 'Wall of Feedback' && (
        <header className="bg-white border-b border-slate-200 px-6 py-4 z-20">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
             <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{activeTab}</h2>
                        <p className="text-sm text-slate-500">Kelola dan pantau aktivitas tim anda.</p>
                    </div>
                    
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
                </div>
             </div>
             
             {/* Surat & Dokumen Sub-Nav */}
             {activeTab === 'Surat & Dokumen' && (
                 <div className="flex bg-slate-100 p-1 rounded-lg mr-4">
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

             {/* Action Buttons */}
             {!(activeTab === 'Surat & Dokumen' && suratSubTab === 'Templates') && (
                 <div className="flex gap-2">
                    <button 
                        onClick={() => setIsProjectModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-slate-900 transition-all text-sm shadow-sm"
                    >
                        <Briefcase size={16} />
                        <span>Buat Project</span>
                    </button>

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
                            {allUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
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
        {/* Content Area */}
{activeTab === 'Dashboard' ? (
  <Dashboard tasks={tasks} users={allUsers} />
) : activeTab === 'Project' ? (
  <ProjectOverview
    projects={projects}
    tasks={tasks}
    users={allUsers}
  />
) : activeTab === 'Wall of Feedback' ? (
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
        users={allUsers}
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
  users={allUsers}            // <-- dari state yg di-fetch dari supabase
  subCategories={subCategories} // <-- dari state yg di-fetch dari supabase
/>


      <AddProjectModal
  isOpen={isProjectModalOpen}
  onClose={() => setIsProjectModalOpen(false)}
  onSave={handleSaveProject}
  users={allUsers} // <-- kirim data user dari DB
/>


    </div>
  );
};

export default App;
