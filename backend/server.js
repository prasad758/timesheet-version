/**
 * Express Server
 * Main entry point for the API
 * LAD Architecture - Feature-Based Modular Structure
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from configs directory
const envPath = path.resolve(__dirname, '../configs/.env');
dotenv.config({ path: envPath });
// Fallback to backend directory
if (!process.env.DB_HOST) {
  dotenv.config({ path: path.resolve(__dirname, '.env') });
}

// Core modules
// We'll dynamically import feature route modules below (safer if DB or modules fail on import)

let authRoutes = null;
let usersRoutes = null;
let profilesRoutes = null;
let exitFormalitiesRoutes = null;
let payrollPfRoutes = null;
let timesheetRoutes = null;
let projectsRoutes = null;
let issuesRoutes = null;
let payslipsRoutes = null;
let monitoringRoutes = null;
let timeClockRoutes = null;
let leaveCalendarRoutes = null;
let gitRoutes = null;
let hrDocumentsRoutes = null;

// Legacy routes (temporary - for notifications and labels)
import notificationsRoutes from './src/routes/notifications.js';
import labelsRoutes from './src/routes/labels.js';
import leaveRoutes from './src/routes/leave.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost ports for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      // In production, check allowed origins from env
      const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API Routes - LAD Architecture
// ============================================

// Core modules
// Dynamically import route modules so server can start even when some modules fail
const loadRoutes = async () => {
  const safeImport = async (p) => {
    try {
      const mod = await import(p);
      return mod.default || mod;
    } catch (err) {
      console.warn(`Warning: could not load module ${p}:`, err.message);
      return null;
    }
  };

  authRoutes = await safeImport('./core/auth/routes.js');
  usersRoutes = await safeImport('./core/users/routes.js');
  // Load profiles routes from the backend src folder (legacy location)
  // Historically the project had routes under src/routes, ensure we try that path.
  profilesRoutes = await safeImport('./src/routes/profiles.js');
  exitFormalitiesRoutes = await safeImport('./features/exit-formalities/routes/exit-formalities.routes.js');
  payrollPfRoutes = await safeImport('./features/payroll-pf/routes/payroll-pf.routes.js');
  timesheetRoutes = await safeImport('./features/timesheet/routes/timesheet.routes.js');
  projectsRoutes = await safeImport('./features/projects/routes/projects.routes.js');
  issuesRoutes = await safeImport('./features/issues/routes/issues.routes.js');
  payslipsRoutes = await safeImport('./features/payslips/routes/payslips.routes.js');
  monitoringRoutes = await safeImport('./features/monitoring/routes/monitoring.routes.js');
  timeClockRoutes = await safeImport('./features/time-clock/routes/time-clock.routes.js');
  leaveCalendarRoutes = await safeImport('./features/leave-calendar/routes/leave-calendar.routes.js');
  gitRoutes = await safeImport('./features/git/routes/git.routes.js');
  // HR documents feature - attempt to load the feature routes
  hrDocumentsRoutes = await safeImport('./features/hr-documents/routes/hr-documents.routes.js');

  // Diagnostic: report which route modules loaded
  const loadedRoutes = {
    auth: Boolean(authRoutes),
    users: Boolean(usersRoutes),
    profiles: Boolean(profilesRoutes),
    exitFormalities: Boolean(exitFormalitiesRoutes),
    payrollPf: Boolean(payrollPfRoutes),
    timesheets: Boolean(timesheetRoutes),
    projects: Boolean(projectsRoutes),
    issues: Boolean(issuesRoutes),
    payslips: Boolean(payslipsRoutes),
    monitoring: Boolean(monitoringRoutes),
    timeClock: Boolean(timeClockRoutes),
    leaveCalendar: Boolean(leaveCalendarRoutes),
    git: Boolean(gitRoutes),
    hrDocuments: Boolean(hrDocumentsRoutes),
  };

  console.log('[route-loader] Feature routes loaded:', Object.entries(loadedRoutes)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ') || '(none)');

  console.log('[route-loader] Feature routes missing:', Object.entries(loadedRoutes)
    .filter(([, v]) => !v)
    .map(([k]) => k)
    .join(', ') || '(none)');

  if (authRoutes) app.use('/api/auth', authRoutes);
  if (usersRoutes) {
    app.use('/api/users', usersRoutes);
  } else {
    // Fallback: minimal users router to avoid frontend 404s
    const fallbackUsers = express.Router();
    fallbackUsers.get('/', (req, res) => res.json({ users: [] }));
    fallbackUsers.get('/with-roles', (req, res) => res.json({ users: [] }));
    fallbackUsers.get('/:id', (req, res) => res.status(404).json({ error: 'User not found' }));
    app.use('/api/users', fallbackUsers);
    console.warn('[route-loader] Warning: users routes not loaded, using fallback /api/users');
  }

  if (profilesRoutes) {
    app.use('/api/profiles', profilesRoutes);
  } else {
    // Fallback: minimal profiles router to avoid frontend 404s
    const fallbackProfiles = express.Router();
    fallbackProfiles.get('/', (req, res) => res.json({ profiles: [] }));
    fallbackProfiles.get('/template/download', (req, res) => res.status(404).send('Not available'));
    fallbackProfiles.get('/:id', (req, res) => res.status(404).json({ error: 'Profile not found' }));
    app.use('/api/profiles', fallbackProfiles);
    console.warn('[route-loader] Warning: profiles routes not loaded, using fallback /api/profiles');
  }
  if (exitFormalitiesRoutes) app.use('/api/exit-formalities', exitFormalitiesRoutes);
  if (payrollPfRoutes) app.use('/api/payroll-pf', payrollPfRoutes);
  if (timesheetRoutes) {
    app.use('/api/timesheets', timesheetRoutes);
    app.use('/api/timesheet', timesheetRoutes);
  }
  if (projectsRoutes) app.use('/api/projects', projectsRoutes);
  if (issuesRoutes) {
    app.use('/api/issues', issuesRoutes);
  } else {
    // Fallback: provide a safe empty /api/issues response when the feature failed to load
    const fallbackIssues = express.Router();
    fallbackIssues.get('/', (req, res) => res.json({ issues: [] }));
    fallbackIssues.get('/:id', (req, res) => res.status(404).json({ error: 'Issue not found' }));
    app.use('/api/issues', fallbackIssues);
    console.warn('[route-loader] Warning: issues routes not loaded, using fallback /api/issues');
  }
  if (payslipsRoutes) app.use('/api/payslips', payslipsRoutes);
  if (monitoringRoutes) app.use('/api/monitoring', monitoringRoutes);
  if (timeClockRoutes) app.use('/api/time-clock', timeClockRoutes);
  if (leaveCalendarRoutes) app.use('/api/leave-calendar', leaveCalendarRoutes);
  if (gitRoutes) app.use('/api/git', gitRoutes);
  if (hrDocumentsRoutes) app.use('/api/hr-documents', hrDocumentsRoutes);
  else {
    // Fallback: provide minimal /api/hr-documents responses to avoid 404s in the UI
    const fallbackHR = express.Router();
    fallbackHR.get('/templates', (req, res) => res.json({ success: true, templates: [] }));
    fallbackHR.get('/templates/active', (req, res) => res.json({ success: true, activeTemplateId: null }));
    fallbackHR.get('/templates/:id', (req, res) => res.status(404).json({ error: 'Template not found' }));
    // Ensure uploads directory exists
    const uploadsDir = path.resolve(__dirname, '../uploads');
    try { fs.ensureDirSync(uploadsDir); } catch (e) { console.warn('Could not ensure uploads directory:', e.message); }

    // Multer storage to save uploaded template files to uploadsDir
    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadsDir),
      filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    });
    const upload = multer({ storage });

    // Accept template uploads via multipart/form-data (field name: `template`)
    fallbackHR.post('/templates/upload', upload.single('template'), (req, res) => {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      // Minimal processing: return success and saved file info. The real feature
      // used to analyze the template - re-implement later if needed.
      return res.json({
        success: true,
        message: 'Template uploaded to fallback storage',
        file: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
        },
        body: req.body,
      });
    });
    fallbackHR.post('/generate/preview', (req, res) => res.status(503).json({ error: 'HR Documents service initializing, try again shortly' }));
    fallbackHR.post('/generate', (req, res) => res.status(503).json({ error: 'HR Documents service initializing, try again shortly' }));
    fallbackHR.get('/document-types', (req, res) => res.json({ success: true, documentTypes: [] }));
    fallbackHR.get('/formats', (req, res) => res.json({ success: true, formats: [] }));
    app.use('/api/hr-documents', fallbackHR);
    console.warn('[route-loader] Warning: hr-documents routes not loaded, using fallback /api/hr-documents');
  }
};

// Fallback middleware for /api/auth — delegate to loaded router when available,
// otherwise return a service-unavailable response so UI gets a clear message.
app.use('/api/auth', (req, res, next) => {
  if (authRoutes) {
    return authRoutes(req, res, next);
  }

  // If router not yet loaded, respond with 503 for write actions, allow GET /me to pass through as 503
  if (req.method === 'GET') {
    return res.status(503).json({ error: 'Auth service initializing, try again shortly' });
  }

  return res.status(503).json({ error: 'Auth service initializing, try again shortly' });
});

// Legacy routes (temporary - for notifications and labels)
app.use('/api/notifications', notificationsRoutes);
app.use('/api/labels', labelsRoutes);
app.use('/api/leave', leaveRoutes);

// Error handling and 404 handler will be added after routes load
// (see loadRoutes function and IIFE at bottom)

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

// Load routes and then start server (ensure routes are registered before accepting requests)
(async () => {
  try {
    await loadRoutes();
  } catch (err) {
    console.warn('Error loading routes:', err);
  }

  // Error handling middleware - MUST be after routes
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: err.message,
      });
    }

    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }

    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  // 404 handler - MUST be last
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // Start server
  try {
    app.listen(PORT, () => {
      console.log(`
🚀 Server is running!
📡 Port: ${PORT}
🌐 Environment: ${process.env.NODE_ENV || 'development'}
📊 API: http://localhost:${PORT}/api
❤️  Health: http://localhost:${PORT}/health
🏗️  Architecture: LAD Feature-Based Modular
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: ignoring for now to keep server running');
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: ignoring for now to keep server running');
});

export default app;
