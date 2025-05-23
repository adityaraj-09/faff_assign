# Faff Frontend - Internal Ticketing & Chat System

A modern React-based frontend for Faff, an internal ticketing interface with real-time threaded chat and task management. Built with TypeScript, Vite, and Tailwind CSS for a responsive and intuitive user experience.

## 🏗️ Architecture Overview

### System Design Philosophy
The frontend follows modern React patterns with a focus on:
- **Component-driven architecture** with reusable UI components
- **Real-time synchronization** using WebSocket connections
- **Optimistic UI updates** for instant user feedback
- **Responsive design** that works across all device sizes
- **Type safety** with comprehensive TypeScript coverage

### Tech Stack
- **React 18** - Component framework with hooks and modern patterns
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.IO Client** - Real-time bidirectional communication
- **React Router** - Client-side routing
- **React Hot Toast** - Elegant notifications

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts for global state
├── hooks/              # Custom React hooks
├── pages/              # Route-level page components
├── services/           # API and external service interfaces
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and helpers
└── styles/             # Global styles and Tailwind config
```

## 🎯 Core Features & Implementation

### 1. Authentication System
**Location**: `src/contexts/AuthContext.tsx`

- **JWT-based authentication** with automatic token refresh
- **Protected routes** using React Router guards
- **Persistent login state** using localStorage
- **Role-based access control** for admin features

```typescript
// Authentication flow
const { login, logout, isAuthenticated } = useAuth();
await login({ email, password }); // Stores JWT token
```

### 2. Real-time Communication
**Location**: `src/services/socket.ts`

- **WebSocket connection** using Socket.IO
- **Automatic reconnection** with exponential backoff
- **Room-based messaging** for task-specific discussions
- **Typing indicators** and user presence

```typescript
// Real-time message handling
socketService.onNewMessage((message) => {
  setMessages(prev => [...prev, message]);
});
```

### 3. Task Management Interface
**Location**: `src/pages/DashboardPage.tsx`

#### Design Patterns:
- **Server state synchronization** with optimistic updates
- **Advanced filtering** with real-time search
- **Infinite scrolling** for performance with large datasets
- **Status-based visual hierarchy** using color coding

#### Key Features:
- Multi-criteria filtering (status, priority, assignee)
- Real-time search across title, description, and metadata
- Bulk operations with keyboard shortcuts
- Export functionality for reporting

### 4. Discussion Interface
**Location**: `src/pages/TaskDetailPage.tsx`

#### Component Architecture:
```
TaskDetailPage
├── TaskHeader (status, actions, metadata)
├── TaskDescription (with steps-to-reproduce parsing)
├── AISummarySection (conditional rendering)
├── DiscussionArea
│   ├── MessageList (virtualized for performance)
│   ├── MessageComponent (with attachment handling)
│   └── MessageInput (with file upload)
└── ImageModal (full-screen preview)
```

#### Message System Design:
- **Threaded conversations** with reply-to functionality
- **Rich media support** with image previews and file attachments
- **Optimistic message sending** for instant feedback
- **Message deduplication** to handle WebSocket/HTTP race conditions

### 5. File Upload & Preview System

#### Image Handling:
- **Progressive image loading** with thumbnails
- **Full-screen modal viewer** with zoom and navigation
- **Memory management** using `createObjectURL` with proper cleanup
- **Drag & drop interface** for intuitive file selection

#### File Management:
```typescript
// Smart file preview based on MIME type
const isImage = file.type.startsWith('image/');
if (isImage) {
  return <ImagePreview src={url} onClick={openModal} />;
} else {
  return <FileIcon type={file.type} />;
}
```

### 6. AI-Powered Summaries

#### Auto-Summary Generation:
- **Context-aware button text** (Generate/Update/Regenerating)
- **Automatic scrolling** to summary after generation
- **Loading states** with animated spinners
- **Error handling** with user-friendly messages

#### Summary Display:
- **Structured content** with Issue/Investigation/Next Steps
- **Dynamic timestamp** showing last update
- **Regeneration capability** for updated discussions

## 🎨 UI/UX Design Principles

### Visual Design System
- **Consistent color palette** using Tailwind's primary colors
- **Typography hierarchy** with clear information architecture
- **Subtle animations** for better user feedback
- **Accessible design** following WCAG guidelines

### Interaction Patterns
- **Progressive disclosure** - show details on demand
- **Contextual actions** - buttons appear when relevant
- **Keyboard navigation** support for power users
- **Touch-friendly** interface for mobile devices

### Responsive Design
```css
/* Mobile-first approach */
.container {
  @apply px-4 sm:px-6 lg:px-8;
  @apply max-w-7xl mx-auto;
}
```

## 🔄 State Management

### Context-based Architecture
- **AuthContext** - User authentication and permissions
- **Local component state** - UI interactions and form data
- **Server state** - API data with optimistic updates

### Data Flow Pattern
```
User Action → Optimistic Update → API Call → Server Response → State Sync
```

### Real-time Synchronization
- **WebSocket events** update local state immediately
- **Conflict resolution** with server-side timestamps
- **Fallback polling** for critical data consistency

## 🚀 Performance Optimizations

### Bundle Optimization
- **Code splitting** by route using React.lazy()
- **Tree shaking** to eliminate unused code
- **Asset optimization** with Vite's built-in features

### Runtime Performance
- **React.memo** for expensive component renders
- **useCallback/useMemo** for function and object memoization
- **Virtual scrolling** for large message lists
- **Image lazy loading** for better initial page load

### Memory Management
- **Object URL cleanup** for file previews
- **WebSocket connection cleanup** on unmount
- **Event listener cleanup** in useEffect hooks

## 🛡️ Error Handling & Resilience

### Network Resilience
- **Automatic retry** for failed API calls
- **Offline detection** with user notifications
- **WebSocket reconnection** with exponential backoff

### User Experience
- **Toast notifications** for all user actions
- **Loading states** for all async operations
- **Error boundaries** to catch component crashes
- **Graceful degradation** when features are unavailable

## 🔧 Development Workflow

### Code Quality
- **TypeScript strict mode** for type safety
- **ESLint configuration** with React best practices
- **Prettier formatting** for consistent code style
- **Component testing** with React Testing Library

### Development Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Check code quality
npm run type-check   # Verify TypeScript types
```

### Environment Configuration
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

## 🎯 Key Design Decisions

### Why WebSocket + HTTP Hybrid?
- **Real-time messages** via WebSocket for instant delivery
- **File uploads** via HTTP for better error handling and progress tracking
- **Fallback mechanism** ensures reliability

### Why Optimistic Updates?
- **Instant user feedback** for better perceived performance
- **Automatic rollback** on server errors
- **Consistent UI state** across all operations

### Why Component Composition?
- **Reusable components** reduce code duplication
- **Easy testing** with isolated component logic
- **Flexible layouts** for different screen sizes

## 🔮 Future Enhancements

### Planned Features
- **Progressive Web App** capabilities for offline use
- **Push notifications** for important updates
- **Advanced search** with full-text indexing
- **Keyboard shortcuts** for power user workflows
- **Theme customization** with dark mode support

### Performance Improvements
- **Service Worker** for caching and offline functionality
- **Virtual scrolling** for extremely large datasets
- **Image optimization** with next-gen formats
- **Bundle analysis** and further code splitting

This frontend provides a solid foundation for a modern internal tool with room for growth and enhancement based on user feedback and evolving requirements.
