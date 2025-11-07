# TechieMaya Timesheet Application

## 🚀 Quick Start

**Easiest way to start the application:**

1. **Double-click `start-dev.ps1`** (or right-click → Run with PowerShell)
   - This will start both backend and frontend servers automatically
   - Two PowerShell windows will open (one for backend, one for frontend)
   - Keep both windows open while using the application

2. **Or manually start:**
   - Backend: Open PowerShell in `backend` folder → Run `npm start`
   - Frontend: Open PowerShell in root folder → Run `npm run dev`

**Important:** Both servers must be running for the application to work!

A comprehensive timesheet and time management system built with React, TypeScript, Node.js, and PostgreSQL. This application provides a complete solution for tracking employee work hours, managing leave requests, monitoring GitHub issues, and generating detailed reports.

## 🚀 Features

### Core Functionality
- **Time Tracking** - Record and manage daily work hours with detailed entries
- **Time Clock** - Simple clock-in/clock-out interface with location tracking
- **Timesheet Management** - View, edit, and export timesheets
- **PDF Export** - Generate professional PDF reports of timesheets
- **Issue Management** - Track and manage GitHub issues with assignments and labels
- **Leave Calendar** - Request and manage time off, view team availability
- **Notifications System** - Real-time notifications for important events
- **User Management** - Admin panel for managing users and roles
- **Monitoring Dashboard** - Overview of system activity and statistics
- **Shared Timesheets** - Public view for sharing timesheet data

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible UI components
- **Lucide React** - Beautiful icons
- **date-fns** - Date manipulation
- **jsPDF** - PDF generation
- **Sonner** - Toast notifications

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database (erp schema)
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (v12 or higher)
- pgAdmin or PostgreSQL client

### Setup Instructions

1. **Clone the repository**
```bash
git clone <repository-url>
cd VCP_Automation-TechieMaya-Timesheet
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd backend
npm install
cd ..
```

4. **Set up environment variables**

Create a `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:3001/api
```

Create a `backend/.env` file:
```env
PORT=3001
NODE_ENV=production
POSTGRES_HOST=your_postgres_host
POSTGRES_PORT=5432
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=your_database_name
JWT_SECRET=your_jwt_secret_min_32_characters
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

5. **Set up the database**

Run the SQL migration script in `database/migrate-to-postgresql.sql` in your PostgreSQL database. This will create all necessary tables, functions, and triggers in the `erp` schema.

6. **Start the backend server**
```bash
cd backend
npm start
```

7. **Start the frontend development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in the terminal)

## 🏗️ Project Structure

```
VCP_Automation-TechieMaya-Timesheet/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components
│   │   ├── AuthGuard.tsx   # Authentication wrapper
│   │   ├── Notifications.tsx
│   │   └── NotificationPopup.tsx
│   ├── pages/              # Application pages/routes
│   │   ├── Auth.tsx        # Login/signup page
│   │   ├── Index.tsx       # Dashboard/home page
│   │   ├── Timesheet.tsx   # Main timesheet interface
│   │   ├── TimeClock.tsx   # Clock in/out interface
│   │   ├── LeaveCalendar.tsx
│   │   ├── Issues.tsx      # Issue management
│   │   ├── IssueDetail.tsx
│   │   ├── Users.tsx        # User management (admin)
│   │   ├── Monitoring.tsx   # System monitoring
│   │   └── SharedTimesheet.tsx
│   ├── lib/
│   │   ├── api.ts          # API client
│   │   ├── logger.ts       # Production-safe logging
│   │   └── utils.ts        # Utility functions
│   ├── hooks/              # Custom React hooks
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Application entry point
├── backend/
│   ├── routes/             # API route handlers
│   │   ├── auth.js
│   │   ├── issues.js
│   │   ├── timesheets.js
│   │   ├── users.js
│   │   ├── notifications.js
│   │   ├── leave.js
│   │   └── labels.js
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   ├── db/
│   │   └── connection.js   # PostgreSQL connection pool
│   └── server.js           # Express server
├── database/               # SQL migration scripts
└── package.json
```

## 🎯 Usage

### For Employees
1. **Clock In/Out** - Use the Time Clock page for simple time tracking with location
2. **Add Time Entries** - Go to Timesheet to add detailed work entries
3. **View Assigned Issues** - See issues assigned to you in Timesheet
4. **Request Leave** - Use the Leave Calendar to request time off
5. **View Notifications** - Check the notification bell for updates

### For Administrators
1. **Manage Users** - Add, edit, or change user roles in Users page
2. **Monitor Activity** - View system-wide statistics in Monitoring page
3. **Manage Issues** - Create, assign, and track issues in Issues page
4. **Approve Requests** - Review and approve leave requests
5. **Generate Reports** - Export timesheets as PDF reports

## 🔒 Authentication & Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin/User)
- Protected routes with authentication guards
- CORS configuration for secure API access

## 📊 Database Schema

All tables are created in the `erp` schema:
- **users** - User accounts and profiles
- **user_roles** - User role assignments
- **timesheets** - Weekly timesheet records
- **timesheet_entries** - Individual time entries
- **time_clock** - Clock in/out records
- **leave_requests** - Leave/vacation requests
- **issues** - GitHub issue tracking
- **issue_assignees** - Issue-user assignments
- **issue_labels** - Issue labels
- **issue_comments** - Issue comments
- **issue_activity** - Issue activity log
- **labels** - Available labels
- **notifications** - User notifications

## 🚀 Production Deployment

### Build for production

**Frontend:**
```bash
npm run build
```

**Backend:**
```bash
cd backend
npm start
```

The frontend build files will be in the `dist/` directory, ready for deployment to any static hosting service (Vercel, Netlify, etc.).

The backend should be deployed to a Node.js hosting service (Heroku, Railway, AWS, etc.) with PostgreSQL database access.

### Environment Variables

Make sure to set all environment variables in your production environment:
- Frontend: `VITE_API_URL`
- Backend: `POSTGRES_*`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `CORS_ORIGINS`

## 🔧 Development

### Running the development server

Frontend:
```bash
npm run dev
```

Backend:
```bash
cd backend
npm run dev  # If you have nodemon installed
# or
npm start
```

### Making a user admin

```bash
cd backend
node make-admin.js <email>
```

## 📝 License

This project is proprietary software developed by TechieMaya.

## 👥 Contact

For issues, questions, or contributions, please contact the development team.

## 🙏 Acknowledgments

- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev)
- Built with modern web technologies
