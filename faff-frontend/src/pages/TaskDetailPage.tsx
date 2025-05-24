import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Task, Message, Summary, TypingUser } from '../types';
import apiService from '../services/api';
import socketService from '../services/socket';
import { 
  ArrowLeftIcon,
  PaperClipIcon,
  SparklesIcon,
  PencilIcon,
  EllipsisVerticalIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { 
  formatDate, 
  formatFullDate, 
  capitalizeFirst, 
  formatFileSize,
  getFileIcon,
  isImageFile,
  cn
} from '../utils';
import toast from 'react-hot-toast';

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageContent, setMessageContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (taskId) {
      loadTaskData();
      loadMessages();
      loadSummary();
      
      // Join task room for real-time updates
      socketService.joinTask(parseInt(taskId));
      
      // Set up socket event listeners
      socketService.onNewMessage(handleNewMessage);
      socketService.onUserTyping(handleUserTyping);
      socketService.onTaskRefresh(handleTaskRefresh);
      socketService.onError(handleSocketError);

      return () => {
        // Clean up socket listeners
        socketService.offNewMessage(handleNewMessage);
        socketService.offUserTyping(handleUserTyping);
        socketService.offTaskRefresh(handleTaskRefresh);
        socketService.offError(handleSocketError);
      };
    }
  }, [taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isActionsOpen && actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
    };

    if (isActionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionsOpen]);

  // Cleanup object URLs when attachments change
  useEffect(() => {
    return () => {
      // Clean up any object URLs when component unmounts
      attachments.forEach(file => {
        if (isImageFile(file.type)) {
          const fileUrl = URL.createObjectURL(file);
          URL.revokeObjectURL(fileUrl);
        }
      });
    };
  }, [attachments]);

  const loadTaskData = async () => {
    try {
      const taskData = await apiService.getTask(parseInt(taskId!));
      setTask(taskData);
    } catch (error) {
      toast.error('Failed to load task details');
      navigate('/dashboard');
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTaskMessages(parseInt(taskId!));
      setMessages(response.messages);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await apiService.getTaskSummary(parseInt(taskId!));
      setSummary(summaryData);
    } catch (error) {
      // Summary might not exist yet, that's okay
    }
  };

  const handleNewMessage = (message: Message) => {
    if (message.taskId === parseInt(taskId!)) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleUserTyping = (data: TypingUser) => {
    setTypingUsers(prev => {
      const filtered = prev.filter(user => user.userId !== data.userId);
      if (data.isTyping) {
        return [...filtered, data];
      }
      return filtered;
    });
  };

  const handleTaskRefresh = () => {
    loadTaskData();
  };

  const handleSocketError = (data: { message: string }) => {
    toast.error(data.message);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!messageContent.trim() && attachments.length === 0) return;

    try {
      // For handling file attachments, we need to upload them first
      if (attachments.length > 0) {
        // Upload files and get attachments
        const formData = new FormData();
        attachments.forEach(file => {
          formData.append('files', file);
        });
        
        // Upload files through API since large binary data is better sent via HTTP
        const uploadedAttachments = await apiService.uploadAttachments(parseInt(taskId!), formData);
        
        // Then send a message with attachments via WebSocket
        if (uploadedAttachments && uploadedAttachments.length > 0) {
          socketService.sendMessage({
            taskId: parseInt(taskId!),
            content: messageContent,
            replyToId: replyToMessage?.id,
            attachments: uploadedAttachments,
          });
        }
      } else {
        // Send text-only message via WebSocket
        socketService.sendMessage({
          taskId: parseInt(taskId!),
          content: messageContent,
          replyToId: replyToMessage?.id,
        });
      }
      
      // Clear form
      setMessageContent('');
      setAttachments(prev => {
        // Clean up object URLs before clearing attachments
        prev.forEach(file => {
          if (isImageFile(file.type)) {
            const fileUrl = URL.createObjectURL(file);
            URL.revokeObjectURL(fileUrl);
          }
        });
        return [];
      });
      setReplyToMessage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleTyping = () => {
    socketService.sendTyping(parseInt(taskId!), true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing after 1 second
    typingTimeoutRef.current = setTimeout(() => {
      socketService.sendTyping(parseInt(taskId!), false);
    }, 1000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const totalFiles = attachments.length + files.length;
    
    if (totalFiles > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024); // 10MB limit
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.length} file(s) exceed 10MB limit`);
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const generateSummary = async () => {
    try {
      setGeneratingSummary(true);
      const summaryData = await apiService.generateSummary(parseInt(taskId!));
      setSummary(summaryData);
      toast.success('Summary generated successfully');
      
      // Scroll to summary section after a brief delay to allow UI to update
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest' 
        });
      }, 100);
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    
    try {
      const updatedTask = await apiService.updateTask(task.id, { status: newStatus as any });
      setTask(updatedTask);
      setIsActionsOpen(false);
      toast.success(`Task status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      try {
        await apiService.deleteTask(task.id);
        toast.success('Task deleted successfully');
        navigate('/dashboard');
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
    setIsActionsOpen(false);
  };

  const handleEditTask = () => {
    // For now, we'll show an alert. You can implement a proper edit modal or navigate to edit page
    setIsEditing(true);
    toast.success('Edit functionality will be implemented here');
    // TODO: Implement edit task functionality
    // This could navigate to an edit page or open an edit modal
  };

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Extract steps to reproduce from description if available
  const descriptionParts = task.description?.split('Steps to reproduce');
  const mainDescription = descriptionParts?.[0] || task.description || '';
  const hasStepsToReproduce = descriptionParts && descriptionParts.length > 1;
  const stepsToReproduce = hasStepsToReproduce 
    ? descriptionParts[1].split('\n').filter(line => line.trim().length > 0)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Link to="/dashboard" className="text-primary-600 hover:text-primary-700 mr-4">
                  <ArrowLeftIcon className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-medium text-gray-900">
                  {task.title}
                </h1>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleEditTask}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <div className="relative" ref={actionsDropdownRef}>
                  <button 
                    onClick={() => setIsActionsOpen(!isActionsOpen)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4" />
                    Actions
                  </button>
                  
                  {isActionsOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <div className="py-1">
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Change Status
                        </div>
                        <button
                          onClick={() => handleStatusChange('Logged')}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Mark as Logged
                        </button>
                        <button
                          onClick={() => handleStatusChange('Ongoing')}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Mark as Ongoing
                        </button>
                        <button
                          onClick={() => handleStatusChange('Reviewed')}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Mark as Reviewed
                        </button>
                        <button
                          onClick={() => handleStatusChange('Done')}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Mark as Done
                        </button>
                        <button
                          onClick={() => handleStatusChange('Blocked')}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Mark as Blocked
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={handleDeleteTask}
                          className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete Task
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Ticket #{task.id} • Created on {formatDate(task.createdAt)} • Last updated 2 hours ago
            </div>
            
            <div className="flex items-center space-x-16">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Status:</div>
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium', 
                  task.status === 'Logged' ? 'bg-blue-100 text-blue-800' :
                  task.status === 'Ongoing' ? 'bg-yellow-100 text-yellow-800' :
                  task.status === 'Reviewed' ? 'bg-purple-100 text-purple-800' :
                  task.status === 'Done' ? 'bg-green-100 text-green-800' :
                  task.status === 'Blocked' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                )}>
                  {task.status}
                </span>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Priority:</div>
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium', 
                  task.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                  'bg-red-100 text-red-800'
                )}>
                  {capitalizeFirst(task.priority)}
                </span>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Assignee:</div>
                <div className="flex items-center">
                  <div className="h-6 w-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium mr-2">
                    {task.assignedTo ? task.assignedTo.name.split(' ').map(n => n[0]).join('') : '?'}
                  </div>
                  <span>{task.assignedTo ? task.assignedTo.name : 'Unassigned'}</span>
                </div>
              </div>
            </div>
  {/* Description Section */}
  <div className="">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Description</h2>
            <p className="text-gray-500 mb-6">{mainDescription}</p>
            
            {hasStepsToReproduce && stepsToReproduce.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-3">Steps to reproduce</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  {stepsToReproduce.map((step, index) => (
                    <li key={index}>{step.trim()}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
          </div>
        </div>
      </header>

      <div className="py-6 w-full">
        <div className="space-y-6">
        

          {/* AI Generated Summary */}
          {summary ? (
            <div ref={summaryRef} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-2 text-primary-600" />
                  AI-Generated Summary
                </h2>
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-500">
                    Last updated: {formatDate(summary.updatedAt)}
                  </div>
                  <button
                    onClick={generateSummary}
                    disabled={generatingSummary}
                    className="text-primary-600 text-sm font-medium hover:text-primary-700 disabled:opacity-50"
                  >
                    {generatingSummary ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Regenerating...
                      </div>
                    ) : 'Regenerate'}
                  </button>
                </div>
              </div>
              
              <div className="border-l-4 border-primary-500 pl-4 py-1 mb-4">
                <div className="flex items-center mb-2">
                  <SparklesIcon className="h-5 w-5 mr-2 text-primary-600" />
                  <h3 className="font-medium text-gray-900">Issue:</h3>
                </div>
                <p className="text-gray-700">{summary.content}</p>
              </div>
              
              {summary.keyPoints && summary.keyPoints.length > 0 && (
                <div className="border-l-4 border-primary-500 pl-4 py-1 mb-4">
                  <div className="flex items-center mb-2">
                    <SparklesIcon className="h-5 w-5 mr-2 text-primary-600" />
                    <h3 className="font-medium text-gray-900">Investigation so far:</h3>
                  </div>
                  <p className="text-gray-700">
                    {summary.keyPoints.join(' ')}
                  </p>
                </div>
              )}
              
              <div className="border-l-4 border-primary-500 pl-4 py-1">
                <div className="flex items-center mb-2">
                  <SparklesIcon className="h-5 w-5 mr-2 text-primary-600" />
                  <h3 className="font-medium text-gray-900">Next steps:</h3>
                </div>
                <p className="text-gray-700">
                  {summary.entities && summary.entities.length > 0 
                    ? summary.entities.join(', ')
                    : 'Review discussion and implement necessary changes based on findings.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div ref={summaryRef} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="text-center py-8">
                <SparklesIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Summary Available</h3>
                <p className="text-gray-500 mb-6">
                  Generate an AI-powered summary of this task's discussion to quickly understand the key points, investigation progress, and suggested next steps.
                </p>
                <button
                  onClick={generateSummary}
                  disabled={generatingSummary}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingSummary ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Summary...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      Generate AI Summary
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Discussion and Message Input Combined */}
          <div className="bg-white rounded-lg shadow-sm flex flex-col h-[600px]">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Discussion</h2>
              <div className="flex items-center space-x-3">
                
                <button 
                  onClick={generateSummary}
                  disabled={generatingSummary}
                  className="text-primary-600 text-sm font-medium hover:text-primary-700 disabled:opacity-50"
                >
                  {generatingSummary ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </div>
                  ) : summary ? 'Update Summary' : 'Generate Summary'}
                </button>
              </div>
            </div>

            {/* Messages Section */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <MessageComponent
                      key={message.id}
                      message={message}
                      currentUserId={authState.user?.id}
                      onReply={setReplyToMessage}
                      onImageClick={setSelectedImage}
                    />
                  ))}
                  
                  {/* Typing indicators */}
                  {typingUsers.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <span>
                        {typingUsers.map(user => user.userName).join(', ')} 
                        {typingUsers.length === 1 ? ' is' : ' are'} typing...
                      </span>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>


            {/* Message Input Area */}
            <div className="p-4 border-t border-gray-200">
              {/* Reply indicator */}
              {replyToMessage && (
                <div className="bg-gray-50 border-l-2 border-gray-300 pl-3 py-1.5 mb-4 rounded-r-md">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Replying to <span className="font-medium">{replyToMessage.sender.name}</span>
                    </div>
                    <button
                      onClick={() => setReplyToMessage(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 truncate">{replyToMessage.content}</p>
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Attachments preview */}
                {attachments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {attachments.map((file, index) => {
                      const isImage = isImageFile(file.type);
                      const fileUrl = URL.createObjectURL(file);
                      
                      return (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2">
                          <div className="flex items-center space-x-2">
                            {isImage ? (
                              <img
                                src={fileUrl}
                                alt={file.name}
                                className="w-8 h-8 rounded object-cover cursor-pointer"
                                onClick={() => setSelectedImage(fileUrl)}
                                onLoad={() => {
                                  // Don't revoke here since we're still using it
                                }}
                              />
                            ) : (
                              <span className="text-lg">{getFileIcon(file.type)}</span>
                            )}
                            <span className="text-sm font-medium">{file.name}</span>
                            <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                          </div>
                          <button
                            onClick={() => {
                              if (isImage) {
                                URL.revokeObjectURL(fileUrl);
                              }
                              removeAttachment(index);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <textarea
                  value={messageContent}
                  onChange={(e) => {
                    setMessageContent(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type your message..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />

                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      <PaperClipIcon className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700">
                      <FaceSmileIcon className="h-5 w-5" />
                    </button>
                    <span className="text-xs text-gray-500 ml-2">
                      {attachments.length}/5 files attached (max 10MB each)
                    </span>
                  </div>

                  <button
                    onClick={sendMessage}
                    disabled={!messageContent.trim() && attachments.length === 0}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-4xl p-4">
            <img
              src={selectedImage}
              alt="Full size preview"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Message Component
interface MessageComponentProps {
  message: Message;
  currentUserId?: number;
  onReply: (message: Message) => void;
  onImageClick: (image: string | null) => void;
}

function MessageComponent({ message, currentUserId, onReply, onImageClick }: MessageComponentProps) {
  const initials = message.sender.name.split(' ').map(n => n[0]).join('');
  
  return (
    <div className="flex items-start space-x-3">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
        message.sender.id === 1 ? 'bg-red-100 text-red-800' : 
        message.sender.id === 2 ? 'bg-blue-100 text-blue-800' :
        'bg-green-100 text-green-800'
      }`}>
        {initials}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center mb-1">
          <span className="font-medium text-gray-900 mr-2">{message.sender.name}</span>
          <span className="text-xs text-gray-500">{formatFullDate(message.createdAt)}</span>
          
          {message.replyTo && (
            <span className="ml-3 text-xs text-gray-500">
              Replying to <span className="text-primary-600">{message.replyTo.sender.name}</span>
            </span>
          )}
        </div>
        
        {message.replyTo && (
          <div className="bg-gray-50 border-l-2 border-gray-300 pl-3 py-1.5 mb-2 rounded-r-md">
            <p className="text-sm text-gray-600">{message.replyTo.content}</p>
          </div>
        )}
        
        <div className="text-gray-700">
          {message.content}
        </div>
        
        {message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => {
              const isImage = isImageFile(attachment.mimetype);
              
              if (isImage) {
                return (
                  <div key={attachment.id} className="mt-2">
                    <div className="relative inline-block">
                      <img
                        src={attachment.url}
                        alt={attachment.originalName}
                        className="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                        onClick={() => onImageClick(attachment.url)}
                        onLoad={() => {
                          // Clean up URL if it was created with createObjectURL
                          if (attachment.url.startsWith('blob:')) {
                            URL.revokeObjectURL(attachment.url);
                          }
                        }}
                      />
                      {/* Image overlay with download option */}
                      <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
                        <a
                          href={attachment.url}
                          download={attachment.originalName}
                          className="bg-black bg-opacity-50 text-white p-1 rounded text-xs hover:bg-opacity-75"
                          title="Download image"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ↓
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 truncate">{attachment.originalName}</p>
                      <a 
                        href={attachment.url} 
                        download={attachment.originalName}
                        className="text-xs text-primary-600 hover:text-primary-700 ml-2"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={attachment.id} className="flex items-center bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0">
                      <span className="text-gray-500 mr-3 text-xl">{getFileIcon(attachment.mimetype)}</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{attachment.originalName}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <a 
                        href={attachment.url} 
                        download={attachment.originalName}
                        className="inline-flex items-center px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </a>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
        
        <div className="mt-2 flex space-x-4">
          <button
            onClick={() => onReply(message)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Reply
          </button>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            React
          </button>
        </div>
      </div>
    </div>
  );
} 