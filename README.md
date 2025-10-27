# TechieMaya Timesheet Application

A comprehensive timesheet and time management system built with React, TypeScript, and Supabase. This application provides a complete solution for tracking employee work hours, managing leave requests, monitoring GitHub issues, and generating detailed reports.

## 🚀 Features

### Core Functionality
- **Time Tracking** - Record and manage daily work hours with detailed entries
- **Time Clock** - Simple clock-in/clock-out interface for employees
- **Timesheet Management** - View, edit, and export timesheets
- **PDF Export** - Generate professional PDF reports of timesheets

### Advanced Features
- **Leave Calendar** - Request and manage time off, view team availability
- **GitHub Issues Integration** - Track and manage GitHub issues directly in the app
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
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Row Level Security (RLS)

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/TechieMaya/VCP_Automation.git
cd VCP_Automation
git checkout TechieMaya-Timesheet
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Supabase**

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up the database**

Run the SQL scripts in the `database/` folder in the following order:
- `create-notifications-system.sql` - Sets up notifications
- `add-email-notifications.sql` - Adds email notification support
- `create-leave-calendar-system.sql` - Creates leave management tables
- `create-github-issues-system.sql` - Sets up GitHub issues tracking

5. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
timesheet/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (buttons, dialogs, etc.)
│   │   ├── AuthGuard.tsx   # Authentication wrapper
│   │   └── Notifications.tsx
│   ├── pages/              # Application pages/routes
│   │   ├── Auth.tsx        # Login/signup page
│   │   ├── Index.tsx       # Dashboard/home page
│   │   ├── Timesheet.tsx   # Main timesheet interface
│   │   ├── TimeClock.tsx   # Clock in/out interface
│   │   ├── LeaveCalendar.tsx
│   │   ├── Issues.tsx      # GitHub issues management
│   │   ├── IssueDetail.tsx
│   │   ├── Users.tsx       # User management (admin)
│   │   ├── Monitoring.tsx  # System monitoring
│   │   └── SharedTimesheet.tsx
│   ├── integrations/
│   │   └── supabase/       # Supabase client configuration
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Application entry point
├── database/               # SQL setup scripts
├── public/                 # Static assets
└── package.json
```

## 🎯 Usage

### For Employees
1. **Clock In/Out** - Use the Time Clock page for simple time tracking
2. **Add Time Entries** - Go to Timesheet to add detailed work entries
3. **Request Leave** - Use the Leave Calendar to request time off
4. **View Notifications** - Check the notification bell for updates

### For Administrators
1. **Manage Users** - Add, edit, or deactivate user accounts
2. **Monitor Activity** - View system-wide statistics and activity
3. **Approve Requests** - Review and approve leave requests
4. **Generate Reports** - Export timesheets as PDF reports

## 🔒 Authentication & Security

- Email-based authentication via Supabase
- Row Level Security (RLS) policies for data protection
- Role-based access control (Admin/User)
- Protected routes with authentication guards

## 📊 Database Tables

- **profiles** - User profiles and roles
- **timesheet_entries** - Time tracking records
- **leave_requests** - Leave/vacation requests
- **github_issues** - GitHub issue tracking
- **notifications** - User notifications
- **email_notifications** - Email notification queue

## 🚀 Deployment

### Build for production
```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service (Vercel, Netlify, etc.).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software developed by TechieMaya.

## 👥 Contact

- **Repository**: [https://github.com/TechieMaya/VCP_Automation](https://github.com/TechieMaya/VCP_Automation)
- **Branch**: TechieMaya-Timesheet

## 🙏 Acknowledgments

- Built with [Supabase](https://supabase.com)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev)
