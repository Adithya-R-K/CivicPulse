# CivicPulse — MERN Stack Transformation Blueprint & Implementation Guide

This document outlines the step-by-step roadmap to transition **CivicPulse** from Python/Flask + SQLite to the full **MERN Stack** (**M**ongoDB, **E**xpress.js, **R**eact.js, **N**ode.js) with **Tailwind CSS**, **MongoDB Atlas**, **Postman**, **Vercel**, and **Render**.

---

## 🏗️ 1. Architecture Overview

```
CivicPulse (Repository Root)
├── client/                          # React 18 + Vite + Tailwind CSS (Deploy to Vercel)
│   ├── src/
│   │   ├── components/              # Navbar, ComplaintCard, StatusBadge, MapView, AIChat
│   │   ├── context/                 # AuthContext (JWT session), NotificationContext
│   │   ├── pages/                   # Home, Login, Register, Dashboard, SubmitComplaint, Admin
│   │   ├── services/                # api.js (Axios client with interceptors)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── vercel.json                  # SPA routing configuration for Vercel
│   └── package.json
│
├── server/                          # Node.js + Express.js + Mongoose (Deploy to Render)
│   ├── config/                      # db.js (MongoDB Atlas connection)
│   ├── models/                      # User.js, Complaint.js, Comment.js, Notification.js
│   ├── controllers/                 # authController, complaintController, analyticsController
│   ├── routes/                      # authRoutes, complaintRoutes, analyticsRoutes, chatRoutes
│   ├── middleware/                  # authMiddleware (JWT verify), errorMiddleware
│   ├── utils/                       # aiService.js (Groq AI & rule-based auto-categorization)
│   ├── server.js                    # Express application entry point
│   ├── package.json
│   └── .env.example
│
├── postman/                         # API Testing Collection
│   └── CivicPulse_API.postman_collection.json
│
├── package.json                     # Root orchestrator (runs client + server concurrently)
└── README.md                        # Documentation with setup & deployment instructions
```

---

## 🍃 2. Step 1: MongoDB & MongoDB Atlas Setup

### What You Need to Do on Your Laptop:
1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account (M0 Free Cluster).
2. Create a database named `civicpulse`.
3. Under **Database Access**, create a database user (e.g., `civicadmin`) with a secure password.
4. Under **Network Access**, add IP Access: choose **Allow Access from Anywhere** (`0.0.0.0/0`) so both your laptop and Render can connect.
5. Click **Connect -> Drivers -> Node.js** to copy your connection string:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/civicpulse?retryWrites=true&w=majority
   ```

### Mongoose Data Models:
* **User**: `name`, `email`, `password` (hashed with `bcryptjs`), `role` ('citizen' | 'admin'), `phone`, `address`, `createdAt`.
* **Complaint**: `title`, `description`, `category` ('Roads', 'Water', 'Electricity', 'Waste', 'Parks', 'Safety', 'Construction', 'Other'), `priority` ('Low', 'Medium', 'High', 'Urgent'), `status` ('Submitted', 'In Review', 'In Progress', 'Resolved', 'Rejected'), `location`, `latitude`, `longitude`, `imageUrl`, `upvotes` [User IDs], `department`, `author` (ref: User), `createdAt`, `resolvedAt`.
* **Comment**: `complaint` (ref: Complaint), `user` (ref: User), `text`, `createdAt`.
* **Notification**: `user` (ref: User), `complaint` (ref: Complaint), `title`, `message`, `type`, `read`, `actionUrl`, `createdAt`.

---

## ⚡ 3. Step 2: Node.js & Express.js Backend

### Core Packages:
```bash
npm install express mongoose dotenv cors bcryptjs jsonwebtoken morgan multer axios
npm install -D nodemon
```

### Key Endpoints to Implement:
* **Authentication**:
  * `POST /api/auth/register` (Citizen registration)
  * `POST /api/auth/login` (JWT token issue)
  * `GET /api/auth/me` (Current logged-in profile)
* **Complaints**:
  * `GET /api/complaints` (Search, category filter, pagination)
  * `POST /api/complaints` (Create new complaint with AI categorization)
  * `GET /api/complaints/:id` (Details with comments)
  * `PUT /api/complaints/:id/status` (Admin status update)
  * `POST /api/complaints/:id/upvote` (Toggle upvote)
  * `POST /api/complaints/:id/comments` (Add discussion comment)
* **Analytics & Geospatial**:
  * `GET /api/analytics/dashboard` (Counts by status, department SLA, trends)
  * `GET /api/analytics/geojson` (FeatureCollection for Leaflet / Mapbox map markers)
* **AI & Chat**:
  * `POST /api/chat` (Groq API AI assistant)
  * `POST /api/ai/predict` (Predict category & priority from title and description)
* **Notifications**:
  * `GET /api/notifications` & `PUT /api/notifications/:id/read`

---

## 🎨 4. Step 3: React.js + Vite + Tailwind CSS Frontend

### Core Stack:
* **Framework**: React 18 with Vite (`npm create vite@latest client -- --template react`)
* **Styling**: Tailwind CSS + PostCSS + Autoprefixer
* **Icons**: Lucide React (`lucide-react`)
* **Routing**: React Router DOM v6 (`react-router-dom`)
* **Maps**: Leaflet + React-Leaflet (`leaflet`, `react-leaflet`)
* **HTTP Client**: Axios (`axios`)
* **Charts**: Chart.js / Recharts for live statistics

### Key Views:
1. **Public Landing Page**: Hero section, live platform statistics, recent public complaints preview.
2. **Citizen Dashboard**: User's submitted complaints, real-time status trackers, upvote interactions.
3. **Complaint Submission**: Title, description, interactive map coordinate picker, auto-suggested AI category badge, photo upload.
4. **Admin Dashboard**: Moderation queue, SLA tracking charts, user privilege management, bulk status updates.
5. **Interactive City Map**: Color-coded complaint markers based on category and priority with popup details.
6. **AI Assistant Modal**: Floating civic assistant bot powered by Groq.

---

## 📮 5. Step 4: Postman Collection

We will generate a complete `CivicPulse_API.postman_collection.json` containing:
* Pre-configured environment variables (`{{base_url}}`, `{{token}}`).
* Saved request templates with JSON request bodies:
  * Register citizen & admin
  * Login with auto-saving JWT token to collection environment
  * Submit complaint with GPS coordinates
  * Query analytics and GeoJSON
  * Test AI predictions and chat assistant
* Automated Postman test scripts (e.g., `pm.response.to.have.status(200)`).

---

## 🚀 6. Step 5: Cloud Deployment (Vercel & Render)

### Backend on Render (Web Service):
1. Push repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), create a **New Web Service**.
3. Link your GitHub repository (`Adithya-R-K/CivicPulse`).
4. Set:
   * **Root Directory**: `server`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
5. Add Environment Variables:
   * `MONGO_URI`: Your MongoDB Atlas connection string.
   * `JWT_SECRET`: A secure random string.
   * `GROQ_API_KEY`: Your Groq API key for the AI assistant.
   * `CLIENT_URL`: Your Vercel frontend URL (for CORS).

### Frontend on Vercel:
1. In [Vercel Dashboard](https://vercel.com), click **Add New Project**.
2. Select your repository `CivicPulse`.
3. Set:
   * **Root Directory**: `client`
   * **Framework Preset**: Vite
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Add Environment Variable:
   * `VITE_API_URL`: Your deployed Render backend URL (e.g. `https://civicpulse-api.onrender.com/api`).
5. Include `vercel.json` in `client/` for Single Page Application client-side routing rewrites:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

---

## ⏱️ 7. Implementation Roadmap

We can build this in 4 smooth, structured phases:
* **Phase 1 (Backend)**: Scaffold `server/`, create Mongoose schemas, JWT authentication, and complaint REST endpoints.
* **Phase 2 (Postman)**: Create the Postman collection JSON file with all endpoints documented and ready to import.
* **Phase 3 (Frontend)**: Scaffold `client/` with Vite, configure Tailwind CSS, build modern components and pages.
* **Phase 4 (Deploy Configs)**: Add `render.yaml`, `vercel.json`, root `package.json` for running both concurrently with `npm run dev`.
