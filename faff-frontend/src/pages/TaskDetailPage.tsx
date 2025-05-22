import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Task, Message, Summary, TypingUser, Attachment } from '../types';
import apiService from '../services/api';
import socketService from '../services/socket';
import { 
  ArrowLeftIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  SparklesIcon,
  PencilIcon,
  EllipsisVerticalIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { 
  formatDate, 
  formatFullDate, 
  getPriorityColor, 
  getStatusColor, 
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      const messageData = {
        taskId: parseInt(taskId!),
        content: messageContent,
        replyToId: replyToMessage?.id,
        files: attachments.length > 0 ? attachments : undefined,
      };

      await apiService.createMessage(messageData);
      
      // Clear form
      setMessageContent('');
      setAttachments([]);
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
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
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
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <EllipsisVerticalIcon className="h-4 w-4" />
                  Actions
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Ticket #{task.id} • Created on {formatDate(task.createdAt)} • Last updated 2 hours ago
            </div>
            
            <div className="flex items-center space-x-16">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Status:</div>
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium', 
                  task.status === 'open' ? 'bg-blue-100 text-blue-800' :
                  task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                  task.status === 'resolved' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                )}>
                  {task.status === 'in_progress' ? 'In Progress' : capitalizeFirst(task.status)}
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
          {summary && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-2 text-primary-600" />
                  AI-Generated Summary
                </h2>
                <div className="text-sm text-gray-500">
                  Last updated: 30 minutes ago
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
                  Implement monitoring for database connection pool, review recent code changes, and consider implementing circuit breaker as a short-term mitigation.
                </p>
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
                  className="text-primary-600 text-sm font-medium"
                >
                  Show AI Summary
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
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getFileIcon(file.type)}</span>
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                        </div>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
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
    </div>
  );
}

// Message Component
interface MessageComponentProps {
  message: Message;
  currentUserId?: number;
  onReply: (message: Message) => void;
}

function MessageComponent({ message, currentUserId, onReply }: MessageComponentProps) {
  const isCurrentUser = message.senderId === currentUserId;
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
            {message.attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center bg-gray-50 rounded p-2 border border-gray-200">
                <span className="text-gray-500 mr-2">{getFileIcon(attachment.mimetype)}</span>
                <span className="text-sm font-medium">{attachment.originalName}</span>
                <span className="text-xs text-gray-500 ml-2">({formatFileSize(attachment.size)})</span>
                <a href={attachment.url} download className="ml-auto text-primary-600 text-sm">Download</a>
              </div>
            ))}
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