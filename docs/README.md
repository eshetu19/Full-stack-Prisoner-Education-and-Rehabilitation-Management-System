# 🏛️ Prisoner Education and Rehabilitation System

## 📋 Overview

A comprehensive web-based management system for prison education and rehabilitation programs. This system helps track prisoners, manage educational programs, monitor progress, and generate reports for better rehabilitation outcomes.

## Features

### 🔐 Authentication & Security

- Role-based access control (Admin, Instructor, Viewer)
- Secure login with session management
- Password change functionality

### 👥 Prisoner Management

- Complete CRUD operations for prisoner records
- Profile picture upload
- Skills and education tracking
- Sentence and facility information

### 📚 Program Management

- Create and manage rehabilitation programs
- Track program capacity and enrollment
- Monitor completion rates
- Assign instructors to programs

### 📋 Enrollment Tracking

- Enroll prisoners in programs
- Track progress with percentage completion
- Real-time status updates
- Visual progress indicators

### 📅 Session Scheduling

- Schedule individual and group sessions
- Track session attendance
- Session history and notes

### 👨‍🏫 Staff Management

- Manage staff information
- Track roles and assignments
- Employment status monitoring

### 📊 Reports & Analytics

- Program performance metrics
- Completion rate analysis
- Export to PDF, Excel, CSV
- Demographics visualization

### 🎨 Additional Features

- Dark/Light mode toggle
- Profile picture gallery
- Responsive design for mobile
- Real-time statistics dashboard

## 🛠️ Technologies Used

| Technology          | Purpose                      |
| ------------------- | ---------------------------- |
| **Node.js**         | Backend runtime              |
| **Express.js**      | Web framework                |
| **MySQL**           | Database                     |
| **HTML5/CSS3**      | Frontend structure & styling |
| **JavaScript**      | Client-side interactivity    |
| **bcryptjs**        | Password hashing             |
| **express-session** | Session management           |
| **multer**          | File uploads                 |
| **XLSX**            | Excel export                 |
| **jsPDF**           | PDF generation               |

## Database Schema

### Core Tables

- `users` - Authentication and roles
- `prisoners` - Prisoner records
- `programs` - Rehabilitation programs
- `enrolled_programs` - Enrollment tracking
- `sessions` - Session records
- `staff` - Staff information
- `facilities` - Facility management
- `instructor_programs` - Instructor assignments
- `case_assignments` - Case worker assignments
- `activity_log` - Audit trail

## 👥 User Roles

| Role       | Access Level | Permissions                                 |
| ---------- | ------------ | ------------------------------------------- |
| Admin      | Full access  | Create, Read, Update, Delete all data       |
| Instructor | Limited      | View/Manage assigned prisoners and programs |
| Viewer     | Read-only    | View data only, no modifications            |

## 🚀 Installation Guide

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Step-by-Step Installation

1.Clone the repository

```bash
git clone <repository-url>
cd PrisonProject
```

Install dependencies
''npm install''
Configure environment variables
Create a .env file:

env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=prison_rehab_system
SESSION_SECRET=your_secret_key

### Set up the database

```bash
npm run seed
```

### Start the application

```bash
npm start
```

### Access the system

Open browser and go to http://localhost:3000

### Default Login Credentials

Role Username Password
Administrator admin admin123
Instructor instructor1 admin123
Viewer viewer1 admin123

### System Requirements

- Server Requirements
  Node.js 14+

  MySQL 8+

  2GB RAM minimum

  1GB storage

- Client Requirements
  Modern web browser (Chrome, Firefox, Edge, Safari)
  JavaScript enabled
  1024x768 minimum screen resolution
  ### System Architecture
  
  │ Client Browser │
  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
  │ │ HTML │ │ CSS │ │ JS │ │ Assets │ │
  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
 
  │ HTTP/HTTPS
 
  │ Express Server │
  │ ┌─────────────────────────────────────────────┐ │
  │ │ API Routes / Middleware │ │
  │ └─────────────────────────────────────────────┘ │
  
  │ SQL Queries
 
  │ MySQL Database │
  │ ┌─────────────────────────────────────────────┐ │
  │ │ Users | Prisoners | Programs | Sessions │ │
  │ └─────────────────────────────────────────────┘ │
 

🔒 Security Features
Password hashing with bcrypt

Session-based authentication

Role-based access control

SQL injection prevention (parameterized queries)

XSS protection

CSRF protection via sessions

📈 Performance Optimization
Database indexing on foreign keys

Pagination for large datasets

Optimized SQL queries

Lazy loading for images

Minified CSS/JS in production

🐛 Troubleshooting
Common Issues
Issue Solution
Database connection failed Check MySQL is running and .env credentials
Login not working Verify password hash and user exists
Port 3000 in use Change PORT in .env or kill process
Images not loading Check uploads folder permissions
📝 Future Enhancements
Email notifications

QR code check-in system

Mobile app version

AI-based risk assessment

Video conference integration

Two-factor authentication

Automated backup system

👨‍💻 Developer
Project: Prisoner Education and Rehabilitation System

Type: Database Project

Version: 2.0

📄 License
This project is for educational purposes.

© 2024 Prisoner Education and Rehabilitation System
