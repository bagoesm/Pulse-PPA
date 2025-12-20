// src/components/TaskViewModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Edit, Calendar, Layers, Paperclip, Download, User, Clock, Flag, FileText, Info, MessageSquare, Eye, Share2, MoreHorizontal, ArrowRight, Send, ExternalLink, Trash2, Activity, ChevronDown } from 'lucide-react';
import { Task, User as UserType, ProjectDefinition, Attachment, Priority, Status, Comment, TaskLink, TaskActivity } from '../../types';
import { supabase } from '../lib/supabaseClient';
import PICDisplay from './PICDisplay';
import UserAvatar from './UserAvatar';

interface TaskViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  task: Task | null;
  currentUser: UserType | null;
  canEdit: boolean;
  projects: ProjectDefinition[];
  users: UserType[];
  comments?: Comment[];
  activities?: TaskActivity[];
  onAddComment?: (taskId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onStatusChange?: (taskId: string, newStatus: Status) => void;
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getPriorityConfig = (priority: Priority) => {
  switch (priority) {
    case Priority.Urgent:
      return { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', icon: '🔥' };
    case Priority.High:
      return { color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', icon: '⚡' };
    case Priority.Medium:
      return { color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', icon: '📋' };
    case Priority.Low:
      return { color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', icon: '📝' };
    default:
      return { color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', icon: '📝' };
  }
};

const ensureHttps = (url: string) => {
  if (!url) return url;
  const trimmedUrl = url.trim();
  if (trimmedUrl && !trimmedUrl.match(/^https?:\/\//i)) {
    return `https://${trimmedUrl}`;
  }
  return trimmedUrl;
};

const getStatusConfig = (status: Status) => {
  switch (status) {
    case Status.ToDo:
      return { color: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50', icon: '⭕' };
    case Status.InProgress:
      return { color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', icon: '🔄' };
    case Status.Pending:
      return { color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', icon: '⏸️' };
    case Status.Review:
      return { color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', icon: '👀' };
    case Status.Done:
      return { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', icon: '✅' };
    default:
      return { color: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50', icon: '⭕' };
  }
};

const TaskViewModal: React.FC<TaskViewModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  task,
  currentUser,
  canEdit,
  projects,
  users,
  comments = [],
  activities = [],
  onAddComment,
  onDeleteComment,
  onStatusChange
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if current user is PIC of this task
  const isCurrentUserPIC = () => {
    if (!currentUser || !task) return false;
    const taskPics = Array.isArray(task.pic) ? task.pic : [task.pic];
    return taskPics.includes(currentUser.name);
  };

  // Can change status: PIC or canEdit (Super Admin/Atasan)
  const canChangeStatus = isCurrentUserPIC() || canEdit;

  const handleStatusChange = async (newStatus: Status) => {
    if (!task || !onStatusChange) return;
    await onStatusChange(task.id, newStatus);
    setIsStatusDropdownOpen(false);
  };

  if (!isOpen || !task) return null;

  const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
  const hasAttachments = task.attachments && task.attachments.length > 0;
  const taskComments = comments.filter(comment => comment.taskId === task.id);
  const taskActivities = activities.filter(activity => activity.taskId === task.id);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || !onAddComment || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await onAddComment(task.id, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Baru saja' : `${diffInMinutes} menit yang lalu`;
    } else if (diffInHours < 24) {
      return `${diffInHours} jam yang lalu`;
    } else {
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      if (attachment.url) {
        window.open(attachment.url, '_blank');
        return;
      }

      if (attachment.path) {
        const { data, error } = await supabase.storage
          .from('attachment')
          .createSignedUrl(attachment.path, 60 * 60);

        if (error) {
          console.error('Download failed:', error);
          return;
        }

        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const isOverdue = () => {
    const today = new Date();
    const deadline = new Date(task.deadline);
    return deadline < today && task.status !== Status.Done;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2 text-gray-600">
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <span className="text-xs sm:text-sm truncate max-w-[200px] sm:max-w-none">
              {project ? `${project.name} / ` : ''}{task.status}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {canEdit && onEdit && (
              <button
                onClick={onEdit}
                className="p-2 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors"
                title="Edit task"
              >
                <Edit size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            
            {/* Title */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-8 leading-tight">
              {task.title}
            </h1>

            {/* Properties List */}
            <div className="space-y-6">
              
              {/* Status */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 w-28 text-gray-500">
                  <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                    <div className={`w-2 h-2 rounded-full ${getStatusConfig(task.status).color}`}></div>
                  </div>
                  <span className="text-sm">Status</span>
                </div>
                {canChangeStatus && onStatusChange ? (
                  <div className="relative" ref={statusDropdownRef}>
                    <button
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                        isStatusDropdownOpen 
                          ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${getStatusConfig(task.status).color}`}></span>
                      <span className="text-sm font-medium text-gray-900">{task.status}</span>
                      <ChevronDown 
                        size={14} 
                        className={`text-gray-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} 
                      />
                    </button>
                    
                    {isStatusDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        {Object.values(Status).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                              task.status === status ? 'bg-blue-50' : ''
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${getStatusConfig(status).color}`}></span>
                            <span className={`text-sm ${task.status === status ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
                              {status}
                            </span>
                            {task.status === status && (
                              <span className="ml-auto text-blue-600">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm font-medium text-gray-900">{task.status}</span>
                )}
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 w-28 text-gray-500">
                  <Calendar size={16} />
                  <span className="text-sm">Tenggat</span>
                </div>
                <span className={`text-sm font-medium ${isOverdue() ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(task.deadline)}
                  {isOverdue() && ' (Terlambat)'}
                </span>
              </div>

              {/* Assignee */}
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3 w-28 text-gray-500">
                  <User size={16} />
                  <span className="text-sm">PIC</span>
                </div>
                <div className="flex items-center gap-3">
                  {Array.isArray(task.pic) ? (
                    task.pic.length > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {task.pic.slice(0, 3).map((picName, index) => {
                            const picUser = users.find(u => u.name === picName);
                            return (
                              <UserAvatar
                                key={index}
                                name={picName}
                                profilePhoto={picUser?.profilePhoto}
                                size="sm"
                                className="border-2 border-white"
                              />
                            );
                          })}
                          {task.pic.length > 3 && (
                            <div 
                              className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs font-medium cursor-help"
                              title={task.pic.slice(3).join(', ')}
                            >
                              +{task.pic.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          {task.pic.slice(0, 2).map((picName, index) => (
                            <span key={index} className="text-sm font-medium text-gray-900">
                              {picName}
                            </span>
                          ))}
                          {task.pic.length > 2 && (
                            <span 
                              className="text-xs text-gray-500 cursor-help"
                              title={task.pic.slice(2).join(', ')}
                            >
                              +{task.pic.length - 2} lainnya
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">Belum ada PIC</span>
                    )
                  ) : (
                    <>
                      {(() => {
                        const picName = typeof task.pic === 'string' ? task.pic : '';
                        const picUser = users.find(u => u.name === picName);
                        return (
                          <UserAvatar
                            name={picName || 'Unknown'}
                            profilePhoto={picUser?.profilePhoto}
                            size="sm"
                          />
                        );
                      })()}
                      <span className="text-sm font-medium text-gray-900">{typeof task.pic === 'string' ? task.pic : 'No PIC'}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Project */}
              {project && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 w-28 text-gray-500">
                    <Layers size={16} />
                    <span className="text-sm">Project</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                    {project.name}
                  </span>
                </div>
              )}

              {/* Category */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 w-28 text-gray-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="7" height="7" x="3" y="3" rx="1"/>
                    <rect width="7" height="7" x="14" y="3" rx="1"/>
                    <rect width="7" height="7" x="14" y="14" rx="1"/>
                    <rect width="7" height="7" x="3" y="14" rx="1"/>
                  </svg>
                  <span className="text-sm">Kategori</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200">
                  {task.category}
                </span>
              </div>

              {/* Sub Category */}
              {task.subCategory && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 w-28 text-gray-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="7" height="7" x="3" y="3" rx="1"/>
                      <rect width="7" height="7" x="14" y="3" rx="1"/>
                      <rect width="7" height="7" x="14" y="14" rx="1"/>
                      <rect width="7" height="7" x="3" y="14" rx="1"/>
                    </svg>
                    <span className="text-sm">Sub Kategori</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{task.subCategory}</span>
                </div>
              )}

              {/* Priority as Tags */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 w-28 text-gray-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="text-sm">Tags</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityConfig(task.priority).bg} ${getPriorityConfig(task.priority).text}`}>
                    {task.priority}
                  </span>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-3 w-28 text-gray-500">
                    <FileText size={16} />
                    <span className="text-sm">Deskripsi</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {task.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Links */}
              {task.links && task.links.length > 0 && (
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-3 w-28 text-gray-500">
                    <ExternalLink size={16} />
                    <span className="text-sm">Link ({task.links.length})</span>
                  </div>
                  <div className="flex-1">
                    <div className="space-y-2">
                      {(task.links || []).map(link => (
                        <div key={link.id} className="bg-gray-50 rounded-lg border border-gray-200 group hover:border-blue-200 transition-colors overflow-hidden">
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-6 h-6 rounded bg-white border border-gray-100 flex items-center justify-center text-blue-600 shrink-0">
                                <ExternalLink size={12} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-700 truncate">
                                  {link.title || 'Untitled Link'}
                                </div>
                              </div>
                            </div>
                            {link.url && (
                              <button 
                                onClick={() => window.open(ensureHttps(link.url), '_blank')} 
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all shrink-0"
                                title={`Buka ${link.title || 'link'}`}
                              >
                                <ExternalLink size={14} />
                              </button>
                            )}
                          </div>
                          {link.url && (
                            <div className="px-3 pb-3">
                              <div className="text-xs text-gray-500 bg-white rounded px-2 py-1 border border-gray-100 font-mono break-all">
                                {link.url}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments */}
              {hasAttachments && (
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-3 w-28 text-gray-500">
                    <Paperclip size={16} />
                    <span className="text-sm">Lampiran ({task.attachments.length})</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">
                        {task.attachments.length} file
                      </span>
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                        <Download size={12} />
                        Download Semua
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {task.attachments.map(file => (
                        <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group">
                          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <FileText size={16} className="text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                            <div className="text-xs text-gray-500">{formatFileSize(file.size)} • Download</div>
                          </div>
                          <button 
                            onClick={() => handleDownloadAttachment(file)} 
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-all"
                            title={`Download ${file.name}`}
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Created By */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3 w-28 text-gray-500">
                  <User size={16} />
                  <span className="text-sm">Dibuat oleh</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                    {task.createdBy && typeof task.createdBy === 'string' ? task.createdBy.charAt(0).toUpperCase() : '?'}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{task.createdBy}</span>
                </div>
              </div>

              {/* Comments & Activity Section with Tabs */}
              <div className="pt-6 border-t border-gray-200 mt-8">
                {/* Tab Bar */}
                <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'comments'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <MessageSquare size={14} />
                    Komentar ({taskComments.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'activity'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Activity size={14} />
                    Aktivitas ({taskActivities.length})
                  </button>
                </div>

                {/* Comments Tab Content */}
                {activeTab === 'comments' && (
                  <>
                    {/* Comment Form */}
                    {currentUser && onAddComment && (
                      <form onSubmit={handleSubmitComment} className="mb-6">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                            {currentUser?.name && typeof currentUser.name === 'string' ? currentUser.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Tulis komentar..."
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                              rows={3}
                              disabled={isSubmittingComment}
                            />
                            <div className="flex justify-end mt-2">
                              <button
                                type="submit"
                                disabled={!newComment.trim() || isSubmittingComment}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                              >
                                {isSubmittingComment ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Mengirim...
                                  </>
                                ) : (
                                  <>
                                    <Send size={14} />
                                    Kirim
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                    )}

                    {/* Comments List */}
                    <div className="space-y-4">
                      {taskComments.length > 0 ? (
                        taskComments
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((comment) => {
                            const commentUser = users.find(u => u.name === comment.userName || u.id === comment.userId);
                            const canDeleteComment = currentUser && (
                              comment.userId === currentUser.id || 
                              comment.userName === currentUser.name ||
                              currentUser.role === 'Super Admin' ||
                              currentUser.role === 'Atasan'
                            );
                            return (
                              <div key={comment.id} className="flex gap-3 group">
                                <UserAvatar
                                  name={comment.userName || 'Unknown'}
                                  profilePhoto={commentUser?.profilePhoto}
                                  size="sm"
                                  className="shrink-0"
                                />
                                <div className="flex-1">
                                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {comment.userName}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">
                                          {formatCommentDate(comment.createdAt)}
                                        </span>
                                        {canDeleteComment && onDeleteComment && (
                                          <button
                                            onClick={() => onDeleteComment(comment.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                            title="Hapus komentar"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">Belum ada komentar</p>
                          <p className="text-xs text-gray-400 mt-1">Jadilah yang pertama berkomentar</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Activity Tab Content */}
                {activeTab === 'activity' && (
                  <div className="space-y-3">
                    {taskActivities.length > 0 ? (
                      taskActivities.map((activity) => {
                        const activityUser = users.find(u => u.name === activity.userName || u.id === activity.userId);
                        
                        const getActivityIcon = () => {
                          switch (activity.actionType) {
                            case 'created': return '🆕';
                            case 'status_change': return '📊';
                            case 'pic_change': return '👤';
                            case 'priority_change': return '🎯';
                            case 'deadline_change': return '📅';
                            case 'category_change': return '📁';
                            default: return '📝';
                          }
                        };

                        const getActivityText = () => {
                          switch (activity.actionType) {
                            case 'created':
                              return 'membuat task ini';
                            case 'status_change':
                              return (
                                <>
                                  mengubah status dari <span className="font-medium text-gray-700">{activity.oldValue}</span> ke <span className="font-medium text-gray-700">{activity.newValue}</span>
                                </>
                              );
                            case 'pic_change':
                              return (
                                <>
                                  mengubah PIC dari <span className="font-medium text-gray-700">{activity.oldValue || '-'}</span> ke <span className="font-medium text-gray-700">{activity.newValue}</span>
                                </>
                              );
                            case 'priority_change':
                              return (
                                <>
                                  mengubah prioritas dari <span className="font-medium text-gray-700">{activity.oldValue}</span> ke <span className="font-medium text-gray-700">{activity.newValue}</span>
                                </>
                              );
                            case 'deadline_change':
                              return (
                                <>
                                  mengubah deadline dari <span className="font-medium text-gray-700">{activity.oldValue}</span> ke <span className="font-medium text-gray-700">{activity.newValue}</span>
                                </>
                              );
                            case 'category_change':
                              return (
                                <>
                                  mengubah kategori dari <span className="font-medium text-gray-700">{activity.oldValue}</span> ke <span className="font-medium text-gray-700">{activity.newValue}</span>
                                </>
                              );
                            default:
                              return 'melakukan perubahan';
                          }
                        };

                        return (
                          <div key={activity.id} className="flex gap-3 items-start">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0">
                              {getActivityIcon()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-600">
                                <UserAvatar
                                  name={activity.userName || 'Unknown'}
                                  profilePhoto={activityUser?.profilePhoto}
                                  size="sm"
                                  className="inline-block mr-2 align-middle"
                                />
                                <span className="font-medium text-gray-900">{activity.userName}</span>{' '}
                                {getActivityText()}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {formatCommentDate(activity.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <Activity size={32} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Belum ada aktivitas</p>
                        <p className="text-xs text-gray-400 mt-1">Aktivitas akan muncul saat ada perubahan pada task</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskViewModal;