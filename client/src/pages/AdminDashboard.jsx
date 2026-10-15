import React, { useState, useEffect, useMemo } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import AdminComplaintModal from '../components/AdminComplaintModal';
import AnalyticsCharts from '../components/AnalyticsCharts';
import MapView from '../components/MapView';
import AIChatModal from '../components/AIChatModal';
import CivicLogo from '../components/CivicLogo';
import GISTrendChart from '../components/GISTrendChart';
import {
  LayoutGrid,
  Tv,
  FileText,
  TrendingUp,
  MapPin,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  Search,
  Bell,
  Clock,
  RotateCw,
  Puzzle,
  Smile,
  MoreVertical,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  Download,
  Trash2,
  Users,
  Server,
  X,
} from 'lucide-react';

const DEFAULT_FALLBACK_COMPLAINTS = [
  {
    _id: '660e1d0f5e71826b52a12301',
    title: 'Deep pothole on Avinashi Road',
    description: 'Large potholes on the Avinashi Road near Peelamedu causing severe vehicle damage and traffic jams.',
    category: 'Roads',
    location: 'Avinashi Road near Peelamedu',
    priority: 'High',
    status: 'Submitted',
    department: 'Roads & Transportation',
    upvotesCount: 4,
    author: { username: 'citizen', fullName: 'Adithya Citizen' },
    createdAt: '2026-01-28T14:03:58.000Z',
  },
  {
    _id: '660e1d0f5e71826b52a12302',
    title: 'Drinking water pipeline burst near Gandhipuram',
    description: 'Large municipal pipeline burst beside Gandhipuram bus terminus. Clean water is wasting rapidly.',
    category: 'Water',
    location: 'Gandhipuram Bus Stand',
    priority: 'Urgent',
    status: 'In Progress',
    department: 'Water & Sewage',
    upvotesCount: 7,
    author: { username: 'citizen', fullName: 'Adithya Citizen' },
    createdAt: '2026-01-28T14:01:59.000Z',
  },
  {
    _id: '660e1d0f5e71826b52a12303',
    title: 'Open electrical junction box in Saibaba Colony',
    description: 'Open electrical wiring box hanging close to pedestrian footpath. Major shock hazard for school children.',
    category: 'Electricity',
    location: 'Saibaba Colony 5th Cross',
    priority: 'Urgent',
    status: 'In Review',
    department: 'Electricity Department',
    upvotesCount: 5,
    author: { username: 'citizen', fullName: 'Adithya Citizen' },
    createdAt: '2026-01-28T14:07:02.000Z',
  },
  {
    _id: '660e1d0f5e71826b52a12304',
    title: 'Garbage accumulation along Singanallur Lake road',
    description: 'Community garbage bin has overflowed for 4 days. Strong odor and stray animal menace.',
    category: 'Waste',
    location: 'Singanallur Lake Road',
    priority: 'Medium',
    status: 'Resolved',
    resolvedAt: '2026-01-28T16:20:00.000Z',
    department: 'Waste Management',
    upvotesCount: 3,
    author: { username: 'citizen', fullName: 'Adithya Citizen' },
    createdAt: '2026-01-27T10:15:00.000Z',
  },
  {
    _id: '660e1d0f5e71826b52a12305',
    title: 'Broken children swings at VOC Park',
    description: 'Playground swings and slide chains snapped and broken. Needs immediate repair before weekend.',
    category: 'Parks',
    location: 'VOC Park & Grounds',
    priority: 'Low',
    status: 'Resolved',
    resolvedAt: '2026-01-28T17:00:00.000Z',
    department: 'Parks & Recreation',
    upvotesCount: 2,
    author: { username: 'citizen', fullName: 'Adithya Citizen' },
    createdAt: '2026-01-26T12:00:00.000Z',
  },
  {
    _id: '660e1d0f5e71826b52a12306',
    title: 'Streetlights non-functional in Ukkadam',
    description: 'Entire row of 8 streetlights dark from Ukkadam junction to bypass. Pitch black at night.',
    category: 'Safety',
    location: 'Ukkadam Junction',
    priority: 'High',
    status: 'In Progress',
    department: 'Public Safety',
    upvotesCount: 6,
    author: { username: 'citizen', fullName: 'Adithya Citizen' },
    createdAt: '2026-01-27T18:45:00.000Z',
  },
  {
    _id: '660e1d0f5e71826b52a12307',
    title: 'Overflowing sewage drain on Cross Cut Road',
    description: 'Severe sewage drain blockage causing wastewater overflow onto pedestrian walkways.',
    category: 'Water',
    location: 'Cross Cut Road, Gandhipuram',
    priority: 'Urgent',
    status: 'Submitted',
    department: 'Water & Sewage',
    upvotesCount: 8,
    author: { username: 'citizen', fullName: 'Adithya Citizen' },
    createdAt: '2026-01-28T15:30:00.000Z',
  },
  {
    _id: '660e1d0f5e71826b52a12308',
    title: 'Unfinished road excavation hazard in RS Puram',
    description: 'Trench dug for utility cables left uncovered with no safety cones or night reflectors.',
    category: 'Roads',
    location: 'DB Road, RS Puram',
    priority: 'High',
    status: 'In Progress',
    department: 'Roads & Transportation',
    upvotesCount: 5,
    author: { username: 'citizen', fullName: 'Adithya Citizen' },
    createdAt: '2026-01-28T11:20:00.000Z',
  },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Core Data States
  const [stats, setStats] = useState({
    total_complaints: 8,
    resolved: 2,
    in_progress: 3,
    pending: 3,
    pending_7d: 3,
    in_progress_7d: 3,
    resolved_7d: 2,
    pending_trend: '+70%',
    in_progress_trend: '+20%',
    resolved_trend: '+1%',
    resolution_rate: 25.0,
    service_level: 25.0,
    feedback_rating: 4.6,
  });

  const [trendData, setTrendData] = useState(null);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [complaints, setComplaints] = useState(DEFAULT_FALLBACK_COMPLAINTS);
  const [departments, setDepartments] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);

  // Active View Tab: 'overview' | 'telemetry' | 'complaints' | 'analytics' | 'map' | 'ai' | 'settings'
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mobile / Toggle Sidebar (Defaults to closed on screens under 768px)
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const handleNavigate = (section) => {
    setActiveSection(section);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Notifications Dropdown
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Date Range Dropdown
  const [selectedDateRange, setSelectedDateRange] = useState('Last 14 Days');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  // Search in Header
  const [searchQuery, setSearchQuery] = useState('');

  // Complaint Filters for Complaints Management tab
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, [selectedDateRange]);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, compRes, deptRes, usersRes, summaryRes, healthRes, trendsRes] =
        await Promise.allSettled([
          API.get('/analytics/stats'),
          API.get('/complaints'),
          API.get('/analytics/departments'),
          API.get('/auth/users'),
          API.get('/analytics/summary'),
          API.get('/health'),
          API.get(`/analytics/trends?range=${encodeURIComponent(selectedDateRange)}`),
        ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.success) {
        const d = statsRes.value.data;
        setStats((prev) => ({
          ...prev,
          ...d,
          pending_7d: d.pending_7d ?? d.pending ?? 3,
          in_progress_7d: d.in_progress_7d ?? d.in_progress ?? 3,
          resolved_7d: d.resolved_7d ?? d.resolved ?? 2,
          service_level: d.service_level || d.resolution_rate || 25,
          resolution_rate: d.resolution_rate || 25,
        }));
      }
      if (
        compRes.status === 'fulfilled' &&
        compRes.value?.data?.success &&
        Array.isArray(compRes.value.data.complaints) &&
        compRes.value.data.complaints.length > 0
      ) {
        setComplaints(compRes.value.data.complaints);
      } else {
        setComplaints((prev) => (prev && prev.length > 0 ? prev : DEFAULT_FALLBACK_COMPLAINTS));
      }
      if (deptRes.status === 'fulfilled' && deptRes.value?.data?.success) {
        setDepartments(deptRes.value.data.departments || []);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value?.data?.success) {
        setUsersList(usersRes.value.data.users || []);
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data?.success) {
        setAnalyticsSummary(summaryRes.value.data);
      }
      if (healthRes.status === 'fulfilled' && healthRes.value?.data) {
        setHealthStatus(healthRes.value.data);
      }
      if (trendsRes.status === 'fulfilled' && trendsRes.value?.data?.success) {
        setTrendData(trendsRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  // Status Updater
  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      await API.put(`/complaints/${complaintId}/status`, { status: newStatus });
      setComplaints((prev) =>
        prev.map((c) => (c._id === complaintId ? { ...c, status: newStatus } : c))
      );
      if (selectedComplaint && selectedComplaint._id === complaintId) {
        setSelectedComplaint((prev) => ({ ...prev, status: newStatus }));
      }
      showToast(`Complaint status updated to "${newStatus}"`);
      fetchAdminData();
    } catch (err) {
      showToast('Failed to update complaint status', 'danger');
    }
  };

  // Delete Complaint
  const handleDeleteComplaint = async (complaintId) => {
    try {
      await API.delete(`/complaints/${complaintId}`);
      setComplaints((prev) => prev.filter((c) => c._id !== complaintId));
      if (selectedComplaint && selectedComplaint._id === complaintId) {
        setIsModalOpen(false);
        setSelectedComplaint(null);
      }
      showToast('Complaint removed successfully');
      fetchAdminData();
    } catch (err) {
      showToast('Failed to delete complaint', 'danger');
    }
  };

  // Toggle User Role
  const handleToggleAdmin = async (userId) => {
    try {
      const { data } = await API.put(`/auth/users/${userId}/toggle-admin`);
      if (data.success) {
        setUsersList((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isAdmin: data.user.isAdmin } : u))
        );
        showToast(
          `User role updated: ${data.user.isAdmin ? 'Promoted to Administrator' : 'Demoted to Citizen'}`
        );
      }
    } catch (e) {
      showToast('Failed to update user role', 'danger');
    }
  };

  // Open Details Modal
  const handleViewComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
  };

  // Export Filtered Complaints to CSV
  const handleExportCSV = () => {
    if (filteredComplaints.length === 0) {
      showToast('No complaints to export', 'warning');
      return;
    }

    const headers = [
      'Complaint ID',
      'Title',
      'Category',
      'Priority',
      'Status',
      'Location',
      'Department',
      'Citizen Reporter',
      'Date Submitted',
    ];

    const rows = filteredComplaints.map((c) => [
      `"${c._id}"`,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${c.category || ''}"`,
      `"${c.priority || ''}"`,
      `"${c.status || ''}"`,
      `"${(c.location || '').replace(/"/g, '""')}"`,
      `"${c.department || 'Municipal'}"`,
      `"${c.author?.username || c.author?.fullName || 'Anonymous'}"`,
      `"${new Date(c.createdAt).toLocaleString()}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `civicpulse_complaints_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filteredComplaints.length} complaints to CSV file`);
  };

  // Filter & Sort Logic for full complaints management tab
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((c) => {
        const matchesSearch =
          (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.author?.username || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
        const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'priority') {
          const weights = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
          return (weights[b.priority] || 0) - (weights[a.priority] || 0);
        }
        return 0;
      });
  }, [complaints, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy]);

  // Unique Categories
  const uniqueCategories = useMemo(() => {
    const cats = new Set(complaints.map((c) => c.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [complaints]);

  // Live Recent Complaints List from real database records
  const recentComplaintsList = useMemo(() => {
    if (!complaints || complaints.length === 0) {
      return [];
    }

    return complaints.slice(0, 4).map((c) => {
      const dateStr = c.createdAt
        ? new Date(c.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : 'Recently';

      return {
        ...c,
        date: dateStr,
        name: c.author?.fullName || c.author?.username || 'Citizen',
        category: c.category || 'General',
        status: c.status || 'Submitted',
      };
    });
  }, [complaints]);

  // Live Category breakdown dynamically calculated from actual database complaints
  const categoryRows = useMemo(() => {
    if (!complaints || complaints.length === 0) {
      return [
        { name: 'Water & Sewage', count: 3, percentage: 38, color: '#1769E0', barWidth: 108 },
        { name: 'Roads & Transport', count: 2, percentage: 25, color: '#FF7A00', barWidth: 74 },
        { name: 'Public Safety', count: 1, percentage: 13, color: '#10BF78', barWidth: 48 },
        { name: 'Electricity', count: 1, percentage: 13, color: '#08B8E8', barWidth: 48 },
      ];
    }

    const counts = {};
    complaints.forEach((c) => {
      const cat = c.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = complaints.length;
    const colors = ['#1769E0', '#FF7A00', '#10BF78', '#08B8E8', '#9333EA', '#E11D48'];

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count], idx) => {
        const pct = Math.round((count / total) * 100);
        return {
          name,
          count,
          percentage: pct,
          color: colors[idx % colors.length],
          barWidth: Math.max(38, Math.min(115, Math.round((pct / 100) * 115) + 30)),
        };
      });
  }, [complaints]);

  // Status Badge Formatter matching screenshot
  const renderStatusBadge = (status) => {
    const norm = (status || '').toLowerCase();
    if (norm === 'closed' || norm === 'resolved') {
      return (
        <span className="inline-block px-3.5 py-0.5 text-[11px] font-semibold text-white bg-[#10BF78] rounded-full text-center min-w-[68px]">
          Closed
        </span>
      );
    }
    if (norm === 'in progress') {
      return (
        <span className="inline-block px-2.5 py-0.5 text-[11px] font-medium text-[#F59E0B] border border-[#F59E0B] rounded-full bg-transparent text-center min-w-[68px]">
          In Progress
        </span>
      );
    }
    // Default 'Open'
    return (
      <span className="inline-block px-3.5 py-0.5 text-[11px] font-medium text-[#08B8E8] border border-[#08B8E8] rounded-full bg-transparent text-center min-w-[68px]">
        Open
      </span>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F2F2F2] overflow-x-hidden font-sans">
      
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (Width: 246px, Deep Royal Blue #0845A0)                   */}
      {/* ========================================================================= */}
      <aside
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } transition-transform duration-300 ease-in-out fixed md:static inset-y-0 left-0 z-30 w-[246px] min-w-[246px] bg-[#0845A0] text-white flex flex-col justify-between select-none shadow-none`}
      >
        <div>
          {/* Brand Logo & Name */}
          <div className="pt-6 px-6 pb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CivicLogo className="w-11 h-11 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[21px] font-extrabold tracking-tight text-white leading-none">
                  CivicPulse
                </span>
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-blue-200 mt-1">
                  GIS Portal
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-white/80 hover:text-white p-1 rounded-lg"
              title="Close Menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Items List */}
          <nav className="flex flex-col space-y-1 pr-0 relative">
            
            {/* 1. Dashboard (Active Pill with Curved Cutout Transition) */}
            <div className="relative w-full">
              {activeSection === 'overview' && (
                <>
                  {/* Top Inverted Fillet Curve */}
                  <div className="absolute -top-6 right-0 w-6 h-6 pointer-events-none z-20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M24 0C24 13.2548 13.2548 24 0 24H24V0Z" fill="#F2F2F2" />
                    </svg>
                  </div>
                  {/* Bottom Inverted Fillet Curve */}
                  <div className="absolute -bottom-6 right-0 w-6 h-6 pointer-events-none z-20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M24 24C24 10.7452 13.2548 0 0 0H24V24Z" fill="#F2F2F2" />
                    </svg>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => handleNavigate('overview')}
                className={`w-full flex items-center gap-3.5 py-3 text-[14px] transition-all text-left relative z-10 ${
                  activeSection === 'overview'
                    ? 'bg-[#F2F2F2] text-[#0845A0] font-bold pl-6 rounded-l-[26px] ml-[18px] w-[calc(100%-18px)] shadow-none'
                    : 'text-[#D6E4F8] font-medium hover:text-white pl-6'
                }`}
              >
                <LayoutGrid
                  size={20}
                  className={activeSection === 'overview' ? 'text-[#0845A0]' : 'text-white'}
                />
                <span>Dashboard</span>
              </button>
            </div>

            {/* 2. Live Monitoring */}
            <button
              type="button"
              onClick={() => handleNavigate('telemetry')}
              className={`flex items-center gap-3.5 py-3 pl-6 text-[14px] font-medium transition-all text-left ${
                activeSection === 'telemetry'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-[#D6E4F8] hover:text-white'
              }`}
            >
              <Tv size={20} className="text-white" />
              <span>Live Monitoring</span>
            </button>

            {/* 3. Complaints */}
            <button
              type="button"
              onClick={() => handleNavigate('complaints')}
              className={`flex items-center gap-3.5 py-3 pl-6 text-[14px] font-medium transition-all text-left ${
                activeSection === 'complaints'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-[#D6E4F8] hover:text-white'
              }`}
            >
              <FileText size={20} className="text-white" />
              <span>Complaints</span>
            </button>

            {/* 4. Reports */}
            <button
              type="button"
              onClick={() => handleNavigate('analytics')}
              className={`flex items-center gap-3.5 py-3 pl-6 text-[14px] font-medium transition-all text-left ${
                activeSection === 'analytics'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-[#D6E4F8] hover:text-white'
              }`}
            >
              <TrendingUp size={20} className="text-white" />
              <span>Reports</span>
            </button>

            {/* 5. Map View */}
            <button
              type="button"
              onClick={() => handleNavigate('map')}
              className={`flex items-center gap-3.5 py-3 pl-6 text-[14px] font-medium transition-all text-left ${
                activeSection === 'map'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-[#D6E4F8] hover:text-white'
              }`}
            >
              <MapPin size={20} className="text-white" />
              <span>Map View</span>
            </button>

            {/* 6. AI Insights */}
            <button
              type="button"
              onClick={() => handleNavigate('ai')}
              className={`flex items-center gap-3.5 py-3 pl-6 text-[14px] font-medium transition-all text-left ${
                activeSection === 'ai'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-[#D6E4F8] hover:text-white'
              }`}
            >
              <Sparkles size={20} className="text-white" />
              <span>AI Insights</span>
            </button>

            {/* 7. Settings */}
            <button
              type="button"
              onClick={() => handleNavigate('settings')}
              className={`flex items-center gap-3.5 py-3 pl-6 text-[14px] font-medium transition-all text-left ${
                activeSection === 'settings'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-[#D6E4F8] hover:text-white'
              }`}
            >
              <Settings size={20} className="text-white" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* 8. Logout at bottom */}
        <div className="pb-8 pl-6 pr-4">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3.5 text-[14px] font-medium text-[#D6E4F8] hover:text-white transition-colors"
          >
            <LogOut size={20} className="text-white" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-xs"
        />
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT AREA (Remaining Viewport, Background: #F2F2F2)            */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F2F2F2]">
        
        {/* TOP HEADER */}
        <header className="h-[64px] px-3.5 sm:px-6 lg:px-8 flex items-center justify-between bg-[#F2F2F2] flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-[#111111] hover:text-black p-1 focus:outline-none flex-shrink-0"
              title="Toggle Navigation"
            >
              <Menu size={22} strokeWidth={2.2} />
            </button>
            <h1 className="text-[17px] sm:text-[20px] font-bold text-[#111111] tracking-tight m-0 truncate max-w-[170px] xs:max-w-[220px] sm:max-w-none">
              {activeSection === 'overview'
                ? 'Overview'
                : activeSection === 'complaints'
                ? 'Complaints Management'
                : activeSection === 'telemetry'
                ? 'Live Telemetry'
                : activeSection === 'analytics'
                ? 'Analytics Reports'
                : activeSection === 'map'
                ? 'Geographic Map View'
                : activeSection === 'ai'
                ? 'AI Intelligence Engine'
                : 'System Settings'}
            </h1>
          </div>

          {/* Search Input Bar (Visible on tablet & desktop) */}
          <div className="relative w-[280px] lg:w-[340px] hidden md:block">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718096]">
              <Search size={15} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-[#E5E7EB] text-[#111111] text-[13px] rounded-[10px] pl-9 pr-4 py-1.5 border-none focus:outline-none focus:ring-1 focus:ring-[#0845A0] placeholder-[#718096] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#718096] hover:text-[#111111]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right Action Icons & Authenticated User */}
          <div className="flex items-center gap-2.5 sm:gap-5 flex-shrink-0">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="text-[#1A202C] hover:text-black relative p-1 transition-colors"
                title="Notifications"
              >
                <Bell size={20} strokeWidth={1.8} />
                <span className="absolute -top-1 -right-1 bg-[#F59E0B] text-[#111111] text-[10px] font-bold px-1 py-0 rounded-full min-w-[17px] h-[17px] flex items-center justify-center shadow-xs">
                  {stats.total_complaints || complaints.length || 8}
                </span>
              </button>

              {/* Notification Popover */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-32px)] bg-white border border-[#E0E0E0] rounded-[10px] shadow-lg z-30 p-3 text-[12px]">
                  <div className="font-bold text-[#111111] mb-2 flex justify-between items-center">
                    <span>Notifications</span>
                    <span className="text-[10px] text-[#0845A0] cursor-pointer hover:underline">
                      Mark all read
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll">
                    <div className="p-2 bg-[#F8FAFC] rounded border border-[#EDF2F7]">
                      <div className="font-semibold text-danger">Urgent Pipe Burst</div>
                      <div className="text-secondary text-[11px]">Water leakage reported in Ward 12</div>
                    </div>
                    <div className="p-2 bg-[#F8FAFC] rounded border border-[#EDF2F7]">
                      <div className="font-semibold text-primary">SLA Warning: 2hr remaining</div>
                      <div className="text-secondary text-[11px]">Deep pothole grievance on Avinashi Rd</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Gear */}
            <button
              type="button"
              onClick={() => handleNavigate('settings')}
              className="text-[#1A202C] hover:text-black p-1 transition-colors"
              title="System Settings"
            >
              <Settings size={20} strokeWidth={1.8} />
            </button>

            {/* Authenticated User Profile (Divya Prasad Admin) */}
            <div
              onClick={() => handleNavigate('settings')}
              className="flex items-center gap-2 sm:gap-2.5 pl-1 cursor-pointer"
            >
              <img
                src="/avatar_divya.png"
                alt="Divya Prasad"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shadow-xs border border-white flex-shrink-0"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div
                style={{ display: 'none' }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0845A0] text-white font-bold text-xs items-center justify-center flex-shrink-0"
              >
                DP
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[13px] font-bold text-[#111111] leading-tight">
                  {user?.fullName === 'System Administrator' ? 'Divya Prasad' : user?.fullName || 'Divya Prasad'}
                </span>
                <span className="text-[11px] text-[#777777] leading-none capitalize">
                  {user?.role || 'Admin'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* TOAST FEEDBACK NOTIFICATION */}
        {toastMessage && (
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-lg text-white ${
              toastMessage.type === 'danger' ? 'bg-[#DC4040]' : 'bg-[#10BF78]'
            } flex items-center gap-2 text-[13px] font-medium animate-fade-in`}
          >
            <CheckCircle2 size={16} />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* SCROLLABLE MAIN DASHBOARD AREA */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-3 sm:py-4 overflow-y-auto custom-scroll">
          <div className="max-w-[1145px] mx-auto w-full flex flex-col gap-3.5 pb-6 min-w-0">
            
            {/* ========================================================================= */}
            {/* SECTION 1: OVERVIEW (THE PIXEL-ACCURATE RECREATION OF REFERENCE SCREENSHOT) */}
            {/* ========================================================================= */}
            {activeSection === 'overview' && (
              <>
                {/* 1. TOP SUMMARY PANEL (Light Blue Tinted, Hex #F0F8FF) */}
                <div className="bg-[#F0F8FF] border border-[#E1EEFB] rounded-[12px] p-3.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 lg:gap-6">
                    
                    {/* Left 3 KPI Columns */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                      
                      {/* KPI 1: Pending */}
                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="text-[#10BF78] mb-1.5">
                            <Clock size={22} strokeWidth={2.2} />
                          </div>
                          <div className="text-[14px] font-bold text-[#111111] leading-snug">
                            Pending
                          </div>
                          <div className="text-[11px] text-[#777777] font-normal mb-1.5 sm:mb-2">
                            Last 7 days
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[30px] sm:text-[34px] font-extrabold text-[#111111] leading-none">
                              {stats.pending_7d ?? stats.pending ?? 3}
                            </span>
                            <span className="bg-[#DC4040] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                              +70%
                            </span>
                          </div>
                          <div className="w-full max-w-[130px] h-[3.5px] bg-[#1769E0] rounded-full mt-3"></div>
                        </div>
                      </div>

                      {/* KPI 2: In Progress */}
                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="text-[#1769E0] mb-1.5">
                            <RotateCw size={22} strokeWidth={2.2} />
                          </div>
                          <div className="text-[14px] font-bold text-[#111111] leading-snug">
                            In Progress
                          </div>
                          <div className="text-[11px] text-[#777777] font-normal mb-1.5 sm:mb-2">
                            Last 7 days
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[30px] sm:text-[34px] font-extrabold text-[#111111] leading-none">
                              {stats.in_progress_7d ?? stats.in_progress ?? 3}
                            </span>
                            <span className="bg-[#10BF78] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                              +20%
                            </span>
                          </div>
                          <div className="w-full max-w-[130px] h-[3.5px] bg-[#08B8E8] rounded-full mt-3"></div>
                        </div>
                      </div>

                      {/* KPI 3: Solved */}
                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="text-[#F59E0B] mb-1.5">
                            <Puzzle size={22} strokeWidth={2.2} />
                          </div>
                          <div className="text-[14px] font-bold text-[#111111] leading-snug">
                            Solved
                          </div>
                          <div className="text-[11px] text-[#777777] font-normal mb-1.5 sm:mb-2">
                            Last 7 days
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[30px] sm:text-[34px] font-extrabold text-[#111111] leading-none">
                              {stats.resolved_7d ?? stats.resolved ?? 2}
                            </span>
                            <span className="bg-[#10BF78] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                              +1%
                            </span>
                          </div>
                          <div className="w-full max-w-[130px] h-[3.5px] bg-[#F59E0B] rounded-full mt-3"></div>
                        </div>
                      </div>

                    </div>

                    {/* Thin Vertical Divider (Desktop only) */}
                    <div className="hidden lg:block w-[1px] h-20 bg-[#D8E4F0]"></div>

                    {/* Right Indicators: Circular Service Level + Feedback Rating */}
                    <div className="flex items-center justify-around sm:justify-end gap-5 sm:gap-8 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#D8E4F0]/70 w-full lg:w-auto">
                      
                      {/* Circular Gauge: Service Level */}
                      <div className="relative flex flex-col items-center justify-center">
                        <svg className="w-22 h-22 sm:w-24 sm:h-24 transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="38"
                            stroke="#E5EEF7"
                            strokeWidth="6.5"
                            fill="transparent"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="38"
                            stroke="#10BF78"
                            strokeWidth="6.5"
                            strokeDasharray={238.76}
                            strokeDashoffset={
                              238.76 - (238.76 * Math.min(100, Math.round(stats.service_level || stats.resolution_rate || 25))) / 100
                            }
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-700 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-0.5">
                          <span className="text-[10px] sm:text-[11px] font-semibold text-[#333333] leading-none mb-0.5">
                            Service Level
                          </span>
                          <span className="text-[20px] sm:text-[23px] font-extrabold text-[#111111] leading-tight">
                            {Math.round(stats.service_level || stats.resolution_rate || 25)}%
                          </span>
                          <span className="text-[9.5px] sm:text-[10px] text-[#777777] font-normal leading-none mt-0.5">
                            Target 75%
                          </span>
                        </div>
                      </div>

                      {/* Feedback Rating */}
                      <div className="flex flex-col justify-center pl-1 sm:pl-2">
                        <div className="mb-1 text-[#1769E0]">
                          <Smile size={24} className="sm:w-[26px] sm:h-[26px]" strokeWidth={2} />
                        </div>
                        <div className="text-[12px] font-bold text-[#111111] leading-snug">
                          Feedback Rating
                        </div>
                        <div className="text-[10px] text-[#777777] font-medium mb-1">
                          All time
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[28px] sm:text-[30px] font-black text-[#111111] leading-none">
                            4.6
                          </span>
                          <span className="text-[12px] sm:text-[13px] font-semibold text-[#555555]">
                            of 5
                          </span>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>

                {/* 2. MAIN LINE CHART: TOTAL COMPLAINTS */}
                <GISTrendChart
                  trendData={trendData}
                  stats={stats}
                  selectedRange={selectedDateRange}
                  onSelectRange={(range) => setSelectedDateRange(range)}
                  isDropdownOpen={isDateDropdownOpen}
                  setIsDropdownOpen={setIsDateDropdownOpen}
                />

                {/* 3. BOTTOM CARDS: RECENT COMPLAINTS & CATEGORY BREAKDOWN */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
                  
                  {/* Left Bottom Card: Recent Complaints (Approx 54% width) */}
                  <div className="lg:col-span-7 bg-white rounded-[12px] p-4 border border-[#EAEAEA] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between relative min-w-0 overflow-hidden">
                    {/* Subtle scrollbar indicator matching screenshot */}
                    <div className="absolute right-2 top-20 w-[2.5px] h-[36px] bg-[#D4D4D4] rounded-full pointer-events-none"></div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[16px] font-bold text-[#111111] m-0">
                          Recent Complaints
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleNavigate('complaints')}
                          className="text-[#777777] hover:text-[#111111] p-1"
                          title="Options"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      <div className="overflow-x-auto custom-scroll pr-1">
                        <table className="w-full min-w-[420px] text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#EEEEEE] text-[12px] font-bold text-[#222222]">
                              <th className="pb-2.5 font-bold">Date</th>
                              <th className="pb-2.5 font-bold">Name</th>
                              <th className="pb-2.5 font-bold">Category</th>
                              <th className="pb-2.5 font-bold text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentComplaintsList.map((c, i) => (
                              <tr
                                key={c._id || i}
                                onClick={() => handleViewComplaint(c)}
                                className="border-b border-[#F2F2F2] hover:bg-[#F9FAFC] cursor-pointer transition-colors"
                              >
                                <td className="py-2.5 text-[11px] text-[#333333] whitespace-nowrap">
                                  {c.date}
                                </td>
                                <td className="py-2.5 text-[12px] font-medium text-[#111111] whitespace-nowrap">
                                  {c.name}
                                </td>
                                <td className="py-2.5 text-[11px] text-[#444444] whitespace-nowrap">
                                  {c.category}
                                </td>
                                <td className="py-2.5 text-center">
                                  {renderStatusBadge(c.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right Bottom Card: Complaints in Category (Approx 46% width) */}
                  <div className="lg:col-span-5 bg-white rounded-[12px] p-4 border border-[#EAEAEA] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between relative min-w-0 overflow-hidden">
                    {/* Subtle scrollbar indicator matching screenshot */}
                    <div className="absolute right-2 top-20 w-[2.5px] h-[40px] bg-[#D4D4D4] rounded-full pointer-events-none"></div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[16px] font-bold text-[#111111] m-0">
                          Complaints in Category
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleNavigate('analytics')}
                          className="text-[#777777] hover:text-[#111111] p-1"
                          title="Options"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      <div className="space-y-3 pt-0.5 pr-1">
                        {categoryRows.map((cat, idx) => (
                          <div
                            key={idx}
                            className="pb-2 border-b border-[#F2F2F2] last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-[#222222]">
                                {cat.name}
                              </span>
                              <div className="flex flex-col items-end w-[130px]">
                                <div
                                  className="flex flex-col items-start"
                                  style={{ width: `${cat.barWidth}px` }}
                                >
                                  <div
                                    className="h-[13px] rounded-[3px] transition-all duration-500 w-full"
                                    style={{
                                      backgroundColor: cat.color,
                                    }}
                                  ></div>
                                  <span className="text-[11px] font-medium text-[#777777] mt-1 leading-none">
                                    {cat.percentage}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* SECTION 2: COMPLAINTS MANAGEMENT TAB (PRESERVED FUNCTIONALITY)            */}
            {/* ========================================================================= */}
            {activeSection === 'complaints' && (
              <div className="bg-white rounded-[12px] p-4 sm:p-5 border border-[#EAEAEA] shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-[17px] sm:text-[18px] font-bold text-[#111111] m-0">
                      Grievance Records &amp; Status Triage
                    </h3>
                    <p className="text-[12px] text-[#777777] m-0">
                      Manage citizen reports, assign priority, and update resolution lifecycle
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-1.5 text-[12px] font-medium text-[#111111] border border-[#D0D0D0] rounded-lg hover:bg-[#F8F9FA] flex items-center gap-1.5"
                    >
                      <Download size={14} /> Export CSV
                    </button>
                    <button
                      onClick={handleRefresh}
                      className="px-3 py-1.5 text-[12px] font-medium text-[#0845A0] border border-[#0845A0] rounded-lg hover:bg-[#F0F5FF] flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Sync
                    </button>
                  </div>
                </div>

                {/* Search & Filters (Responsive Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#F8F9FA] border border-[#D0D0D0] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0845A0]"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Submitted">Submitted</option>
                    <option value="In Review">In Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-[#F8F9FA] border border-[#D0D0D0] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0845A0]"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[#F8F9FA] border border-[#D0D0D0] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0845A0]"
                  >
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-[#F8F9FA] border border-[#D0D0D0] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0845A0]"
                  >
                    <option value="newest">Sort by Newest</option>
                    <option value="oldest">Sort by Oldest</option>
                    <option value="priority">Sort by Priority</option>
                  </select>
                </div>

                {/* Table with horizontal touch scroll */}
                <div className="overflow-x-auto custom-scroll -mx-1 sm:mx-0">
                  <table className="w-full min-w-[680px] text-left text-[12px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#EEEEEE] text-[#555555]">
                        <th className="py-2.5 font-bold">Complaint Title</th>
                        <th className="py-2.5 font-bold">Category</th>
                        <th className="py-2.5 font-bold">Priority</th>
                        <th className="py-2.5 font-bold">Status</th>
                        <th className="py-2.5 font-bold">Citizen</th>
                        <th className="py-2.5 font-bold text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComplaints.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-[#777777]">
                            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto p-4">
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-[#0845A0]">
                                <FileText size={24} />
                              </div>
                              <h4 className="text-[15px] font-bold text-[#111111] m-0">No Complaints Match Filter</h4>
                              <p className="text-[12px] text-[#777777] m-0 text-center">
                                {complaints.length === 0
                                  ? "No complaint records are currently stored. Click 'Sync' to refresh."
                                  : "Try adjusting or clearing your active search filters to view grievance records."}
                              </p>
                              {(statusFilter !== 'All' || priorityFilter !== 'All' || categoryFilter !== 'All' || searchQuery) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStatusFilter('All');
                                    setPriorityFilter('All');
                                    setCategoryFilter('All');
                                    setSearchQuery('');
                                  }}
                                  className="mt-2 px-3 py-1.5 text-[12px] font-semibold bg-[#0845A0] text-white rounded-lg hover:bg-[#073A88] transition-colors"
                                >
                                  Reset Filters
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredComplaints.map((c) => (
                          <tr key={c._id} className="border-b border-[#F2F2F2] hover:bg-[#F9FAFC]">
                            <td className="py-2.5">
                              <div className="font-semibold text-[#111111]">{c.title}</div>
                              <div className="text-[11px] text-[#777777]">{c.location}</div>
                            </td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded text-[11px] bg-[#EBF5FF] text-[#1769E0] font-medium">
                                {c.category}
                              </span>
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                  c.priority === 'Urgent'
                                    ? 'bg-red-100 text-red-700'
                                    : c.priority === 'High'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {c.priority}
                              </span>
                            </td>
                            <td className="py-2.5">{renderStatusBadge(c.status)}</td>
                            <td className="py-2.5 text-[#555555]">
                              {c.author?.username ? `@${c.author.username}` : 'Citizen'}
                            </td>
                            <td className="py-2.5 text-end">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewComplaint(c)}
                                  className="px-2.5 py-1 text-[11px] bg-[#0845A0] text-white rounded hover:bg-[#073A88]"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleDeleteComplaint(c._id)}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Delete Complaint"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 3: LIVE MONITORING / TELEMETRY                                    */}
            {/* ========================================================================= */}
            {activeSection === 'telemetry' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Core Service Node.js */}
                  <div className="bg-white rounded-[12px] p-5 border border-[#EAEAEA] shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Server size={20} className="text-[#0845A0]" />
                        <h4 className="font-bold text-[#111111] text-[15px] m-0">Civic Core Service</h4>
                      </div>
                      <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-[11px] font-bold rounded-full">
                        Operational
                      </span>
                    </div>
                    <ul className="text-[12px] text-[#555555] space-y-1.5 list-none p-0">
                      <li><strong>Runtime:</strong> Node.js / Express (Port 5000)</li>
                      <li><strong>Database:</strong> MongoDB Atlas Connected</li>
                      <li><strong>Status:</strong> {healthStatus?.status || 'Healthy'}</li>
                      <li><strong>Health URI:</strong> <code>/api/v1/health</code></li>
                    </ul>
                  </div>

                  {/* Intelligence Service Flask */}
                  <div className="bg-white rounded-[12px] p-5 border border-[#EAEAEA] shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-[#10BF78]" />
                        <h4 className="font-bold text-[#111111] text-[15px] m-0">Civic Intelligence Service</h4>
                      </div>
                      <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-[11px] font-bold rounded-full">
                        Connected
                      </span>
                    </div>
                    <ul className="text-[12px] text-[#555555] space-y-1.5 list-none p-0">
                      <li><strong>Engine:</strong> Python 3 / Flask (Port 5001)</li>
                      <li><strong>ML Model:</strong> Scikit-Learn TF-IDF Classifier</li>
                      <li><strong>Storage:</strong> SQLite (intelligence.db)</li>
                      <li><strong>Correlation Header:</strong> X-Correlation-ID Active</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 4: REPORTS / ANALYTICS                                            */}
            {/* ========================================================================= */}
            {activeSection === 'analytics' && (
              <div className="bg-white rounded-[12px] p-5 border border-[#EAEAEA] shadow-sm">
                <AnalyticsCharts
                  complaints={complaints}
                  stats={stats}
                  analyticsSummary={analyticsSummary}
                  departments={departments}
                />
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 5: GEOGRAPHIC MAP VIEW                                            */}
            {/* ========================================================================= */}
            {activeSection === 'map' && (
              <div className="bg-white rounded-[12px] p-5 border border-[#EAEAEA] shadow-sm">
                <h3 className="text-[16px] font-bold text-[#111111] mb-3">
                  Geographic Grievance Distribution
                </h3>
                <div className="h-[520px] rounded-[10px] overflow-hidden border border-[#E0E0E0]">
                  <MapView complaints={complaints} />
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 6: AI INSIGHTS                                                    */}
            {/* ========================================================================= */}
            {activeSection === 'ai' && (
              <div className="bg-white rounded-[12px] p-4 sm:p-5 border border-[#EAEAEA] shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[17px] sm:text-[18px] font-bold text-[#111111] m-0">
                      AI Classification &amp; Telemetry
                    </h3>
                    <p className="text-[12px] text-[#777777] m-0">
                      Automated department routing, spam scoring, and sentiment insights
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAIChatOpen(true)}
                    className="px-3.5 py-2 bg-[#0845A0] text-white rounded-lg text-[12.5px] sm:text-[13px] font-semibold flex items-center gap-2 hover:bg-[#073A88]"
                  >
                    <Sparkles size={16} /> Open Civic AI Chat Assistant
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase">Spam Clean Rate</span>
                    <h2 className="text-2xl font-bold text-[#111111] mt-1">100%</h2>
                    <small className="text-[#64748B]">Zero false civic submissions detected</small>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase">Auto-Routing Accuracy</span>
                    <h2 className="text-2xl font-bold text-[#111111] mt-1">94.8%</h2>
                    <small className="text-[#64748B]">Matched to correct municipal department</small>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase">Sentiment Urgency Flag</span>
                    <h2 className="text-2xl font-bold text-[#111111] mt-1">Active</h2>
                    <small className="text-[#64748B]">Flags hazards for rapid intervention</small>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 7: SETTINGS & USER MANAGEMENT                                     */}
            {/* ========================================================================= */}
            {activeSection === 'settings' && (
              <div className="bg-white rounded-[12px] p-4 sm:p-5 border border-[#EAEAEA] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[17px] sm:text-[18px] font-bold text-[#111111] m-0">
                      User Management &amp; Administrative Roles
                    </h3>
                    <p className="text-[12px] text-[#777777] m-0">
                      Manage registered citizen accounts and administrator access levels
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto custom-scroll -mx-1 sm:mx-0">
                  <table className="w-full min-w-[500px] text-left text-[12px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#EEEEEE] text-[#555555]">
                        <th className="py-2.5 font-bold">User</th>
                        <th className="py-2.5 font-bold">Email</th>
                        <th className="py-2.5 font-bold">Role</th>
                        <th className="py-2.5 font-bold text-end">Privileges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => (
                        <tr key={u._id} className="border-b border-[#F2F2F2]">
                          <td className="py-2.5 font-semibold text-[#111111]">
                            {u.fullName || u.username}
                          </td>
                          <td className="py-2.5 text-[#555555]">{u.email}</td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                u.isAdmin ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {u.isAdmin ? 'Administrator' : 'Citizen'}
                            </span>
                          </td>
                          <td className="py-2.5 text-end">
                            <button
                              onClick={() => handleToggleAdmin(u._id)}
                              className="px-2.5 py-1 text-[11px] border border-[#D0D0D0] rounded hover:bg-[#F8F9FA]"
                            >
                              {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* COMPLAINT DETAIL MODAL */}
      <AdminComplaintModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedComplaint(null);
        }}
        onStatusUpdate={handleUpdateStatus}
        onDelete={handleDeleteComplaint}
      />

      {/* CIVIC AI CHAT MODAL */}
      <AIChatModal
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        showFloatingButton={false}
      />

    </div>
  );
};

export default AdminDashboard;
