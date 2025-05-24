import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Task, User } from '../types';
import apiService from '../services/api';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { formatDate, cn } from '../utils';

// Status colors
const statusColors = {
  'Logged': 'bg-blue-100 text-blue-800',
  'Ongoing': 'bg-yellow-100 text-yellow-800',
  'Reviewed': 'bg-purple-100 text-purple-800',
  'Done': 'bg-green-100 text-green-800',
  'Blocked': 'bg-red-100 text-red-800'
};

// Priority colors
const priorityColors = {
  'low': 'bg-gray-100 text-gray-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-red-100 text-red-800',
  'urgent': 'bg-red-100 text-red-800'
};

type Priority = 'low' | 'medium' | 'high' | 'urgent';

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isNewTicketDialogOpen, setIsNewTicketDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'low' as Priority,
    assignedToId: '',
  });

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [currentPage, statusFilter, priorityFilter, assigneeFilter, searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [statusFilter, priorityFilter, assigneeFilter, searchTerm]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 5,
      };
      
      // Add filters only if they have values
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assigneeFilter) params.assignedToId = parseInt(assigneeFilter);
      if (searchTerm.trim()) params.search = searchTerm.trim();
      
      const response = await apiService.getTasks(params);
      setTasks(response.tasks);
      setTotalPages(response.totalPages);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await apiService.getUsers();
      console.log(usersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createTask({
        ...newTicket,
        assignedToId: parseInt(newTicket.assignedToId),
      });
      setIsNewTicketDialogOpen(false);
      setNewTicket({
        title: '',
        description: '',
        priority: 'low' as Priority,
        assignedToId: '',
      });
      loadTasks();
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || statusFilter || priorityFilter || assigneeFilter;

  // Since we're now using server-side filtering, we don't need client-side filtering
  const displayTasks = tasks;

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
            >
              <option value="">All Tickets</option>
              <option value="Logged">Logged</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Done">Done</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
            >
              <option value="">All Assignees</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-4 ml-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2"
              />
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="col-span-12 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Dialog */}
      {isNewTicketDialogOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-30  flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Ticket</h3>
              <button
                onClick={() => setIsNewTicketDialogOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as Priority })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1">
                    Assignee
                  </label>
                  <select
                    id="assignee"
                    value={newTicket.assignedToId}
                    onChange={(e) => setNewTicket({ ...newTicket, assignedToId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Assignee</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewTicketDialogOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent Tickets Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Recent Tickets</h2>
          <button 
            onClick={() => setIsNewTicketDialogOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Ticket
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-gray-200 text-sm text-gray-500">
                <th className="text-left py-3 px-4 font-medium">ID</th>
                <th className="text-left py-3 px-4 font-medium">TITLE</th>
                <th className="text-left py-3 px-4 font-medium">STATUS</th>
                <th className="text-left py-3 px-4 font-medium">PRIORITY</th>
                <th className="text-left py-3 px-4 font-medium">ASSIGNEE</th>
                <th className="text-left py-3 px-4 font-medium">CREATED</th>
                <th className="text-left py-3 px-4 font-medium">LAST UPDATE</th>
                <th className="text-left py-3 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : displayTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    {(searchTerm || statusFilter || priorityFilter || assigneeFilter) 
                      ? 'No tasks match the current filters.' 
                      : 'No tasks found.'
                    }
                  </td>
                </tr>
              ) : (
                displayTasks.map((task) => (
                  <tr key={task.id} className="text-sm text-gray-900">
                    <td className="py-3 px-4">#{task.id}</td>
                    <td className="py-3 px-4">{task.title}</td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusColors[task.status])}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', priorityColors[task.priority])}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="h-6 w-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium mr-2">
                          {task.assignedTo?.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span>{task.assignedTo?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{formatDate(task.createdAt)}</td>
                    <td className="py-3 px-4">{formatDate(task.updatedAt)}</td>
                    <td className="py-3 px-4">
                      <Link to={`/tasks/${task.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Showing {((currentPage - 1) * 5) + 1}-{Math.min(currentPage * 5, totalCount)} of {totalCount} results
            {(searchTerm || statusFilter || priorityFilter || assigneeFilter) && 
              <span className="text-primary-600"> (filtered)</span>
            }
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            {/* Show page numbers dynamically */}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 7) {
                pageNumber = i + 1;
              } else if (currentPage <= 4) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNumber = totalPages - 6 + i;
              } else {
                pageNumber = currentPage - 3 + i;
              }
              
              // Show ellipsis
              if (totalPages > 7) {
                if ((currentPage > 4 && i === 0) || (currentPage < totalPages - 3 && i === 6)) {
                  return (
                    <span key={i} className="px-3 py-1 text-gray-600">...</span>
                  );
                }
              }
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  disabled={loading}
                  className={cn(
                    'px-3 py-1 rounded-md',
                    currentPage === pageNumber
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600 disabled:opacity-50'
                  )}
                >
                  {pageNumber}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 