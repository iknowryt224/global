import { useState, useEffect } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { 
  Package, Truck, Users, LayoutDashboard, Plus, LogOut, Menu, X, 
  Globe, Bell, ChevronRight, TrendingUp, Clock, CheckCircle, Wifi
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { getShipments, getDashboardStats, subscribeToShipments } from "../lib/supabase";
import { statusColors, statusLabels, formatDate } from "../lib/utils";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout, isAdmin, isDriver, isCustomer, refreshProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentShipments, setRecentShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    } else if (user && !profile) {
      // Try to refresh profile if user exists but profile doesn't
      refreshProfile();
      setLoading(false);
    }
  }, [profile, user]);

  // Setup realtime subscription
  useEffect(() => {
    if (!profile) return;

    try {
      const unsubscribe = subscribeToShipments(
        profile.id,
        profile.role,
        (payload) => {
          // Show toast notification for status changes
          if (payload.eventType === 'UPDATE' && payload.old?.current_status !== payload.new?.current_status) {
            const statusText = statusLabels[payload.new.current_status] || payload.new.current_status;
            toast.info(`Shipment ${payload.new.tracking_number} updated to: ${statusText}`, {
              icon: <Wifi className="h-4 w-4 text-green-500" />
            });
          } else if (payload.eventType === 'INSERT') {
            toast.info(`New shipment created: ${payload.new.tracking_number}`, {
              icon: <Package className="h-4 w-4 text-blue-500" />
            });
          }
          
          // Refresh data
          fetchDashboardData();
        }
      );

      setIsRealtime(true);

      return () => {
        if (unsubscribe) unsubscribe();
        setIsRealtime(false);
      };
    } catch (error) {
      console.error("Realtime subscription error:", error);
      setIsRealtime(false);
      // Continue without realtime if it fails
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    try {
      const [statsResult, shipmentsResult] = await Promise.all([
        getDashboardStats(profile.id, profile.role, profile.email),
        getShipments(profile.id, profile.role, profile.email)
      ]);

      if (statsResult?.data) {
        setStats(statsResult.data);
      } else {
        // Set default empty stats if query fails
        setStats({ total: 0, pending: 0, inTransit: 0, delivered: 0 });
      }

      if (shipmentsResult?.data) {
        setRecentShipments(shipmentsResult.data.slice(0, 5));
      } else {
        setRecentShipments([]);
      }
    } catch (error) {
      console.error("Dashboard data error:", error);
      // Set defaults so UI doesn't stay in loading state
      setStats({ total: 0, pending: 0, inTransit: 0, delivered: 0 });
      setRecentShipments([]);
      // Don't show error toast - just load UI with empty data
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const navItems = [
    { 
      name: "Overview", 
      path: "/dashboard", 
      icon: LayoutDashboard, 
      roles: ["admin", "customer", "driver"] 
    },
    { 
      name: "Shipments", 
      path: "/dashboard/shipments", 
      icon: Package, 
      roles: ["admin", "customer", "driver"] 
    },
    { 
      name: "Create Shipment", 
      path: "/dashboard/shipments/new", 
      icon: Plus, 
      roles: ["admin", "customer"] 
    },
    { 
      name: "My Deliveries", 
      path: "/dashboard/deliveries", 
      icon: Truck, 
      roles: ["driver"] 
    },
    { 
      name: "Users", 
      path: "/dashboard/users", 
      icon: Users, 
      roles: ["admin"] 
    },
    { 
      name: "Locations", 
      path: "/dashboard/locations", 
      icon: Globe, 
      roles: ["admin"] 
    },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(profile?.role)
  );

  const isOverview = location.pathname === "/dashboard";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside 
        className={`sidebar fixed lg:static z-50 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <Globe className="h-8 w-8 text-[#0A2463]" />
            <span className="font-bold text-lg tracking-tight text-[#0A2463]" style={{ fontFamily: 'Manrope' }}>
              GLOBAL ACCESS
            </span>
          </Link>
        </div>

        <nav className="px-4 space-y-1">
          {filteredNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-[#0A2463] flex items-center justify-center text-white font-semibold">
              {profile?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{profile?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="mobile-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="mobile-sidebar-toggle"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>
                {isOverview ? "Dashboard" : filteredNavItems.find(i => i.path === location.pathname)?.name || "Dashboard"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Realtime indicator */}
              {isRealtime && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 rounded-full" data-testid="realtime-indicator">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-medium text-emerald-700">Live</span>
                </div>
              )}
              <Button variant="ghost" size="icon" data-testid="notifications-btn">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {isOverview ? (
            // Dashboard Overview
            <div className="space-y-6 stagger-enter">
              {/* Stats Grid */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="stat-card card-hover" data-testid="stat-total">
                    <div className="flex items-center justify-between mb-4">
                      <Package className="h-8 w-8 text-[#0A2463]" />
                      <span className="text-xs font-medium text-muted-foreground">Total</span>
                    </div>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Manrope' }}>{stats.total_shipments}</p>
                    <p className="text-sm text-muted-foreground">Total Shipments</p>
                  </div>

                  <div className="stat-card card-hover" data-testid="stat-in-transit">
                    <div className="flex items-center justify-between mb-4">
                      <TrendingUp className="h-8 w-8 text-blue-500" />
                      <span className="text-xs font-medium text-muted-foreground">Active</span>
                    </div>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Manrope' }}>{stats.in_transit}</p>
                    <p className="text-sm text-muted-foreground">In Transit</p>
                  </div>

                  <div className="stat-card card-hover" data-testid="stat-delivered">
                    <div className="flex items-center justify-between mb-4">
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                      <span className="text-xs font-medium text-muted-foreground">Complete</span>
                    </div>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Manrope' }}>{stats.delivered}</p>
                    <p className="text-sm text-muted-foreground">Delivered</p>
                  </div>

                  <div className="stat-card card-hover" data-testid="stat-pending">
                    <div className="flex items-center justify-between mb-4">
                      <Clock className="h-8 w-8 text-yellow-500" />
                      <span className="text-xs font-medium text-muted-foreground">Waiting</span>
                    </div>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Manrope' }}>{stats.pending}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              )}

              {/* Recent Shipments */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold text-lg" style={{ fontFamily: 'Manrope' }}>
                    Recent Shipments
                  </h2>
                  <Link to="/dashboard/shipments">
                    <Button variant="ghost" size="sm" data-testid="view-all-shipments">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>

                {loading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton h-16 rounded-lg" />
                    ))}
                  </div>
                ) : recentShipments.length === 0 ? (
                  <div className="p-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No shipments yet</p>
                    {(isAdmin || isCustomer) && (
                      <Button 
                        className="mt-4 bg-[#FF5722] hover:bg-[#FF7043]"
                        onClick={() => navigate("/dashboard/shipments/new")}
                        data-testid="create-first-shipment"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Shipment
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentShipments.map((shipment) => (
                      <Link
                        key={shipment.id}
                        to={`/dashboard/shipments/${shipment.id}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        data-testid={`shipment-row-${shipment.tracking_number}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#0A2463]/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-[#0A2463]" />
                          </div>
                          <div>
                            <p className="tracking-number text-sm font-medium">
                              {shipment.tracking_number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {shipment.recipient_name} • {formatDate(shipment.created_at)}
                            </p>
                          </div>
                        </div>
                        <span className={`status-badge ${statusColors[shipment.current_status]}`}>
                          {statusLabels[shipment.current_status]}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              {(isAdmin || isCustomer) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => navigate("/dashboard/shipments/new")}
                    className="stat-card card-hover flex items-center gap-4 text-left"
                    data-testid="quick-create-shipment"
                  >
                    <div className="w-12 h-12 rounded-lg bg-[#FF5722] flex items-center justify-center">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ fontFamily: 'Manrope' }}>Create Shipment</p>
                      <p className="text-sm text-muted-foreground">Start a new delivery</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate("/dashboard/shipments")}
                    className="stat-card card-hover flex items-center gap-4 text-left"
                    data-testid="quick-manage-shipments"
                  >
                    <div className="w-12 h-12 rounded-lg bg-[#0A2463] flex items-center justify-center">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ fontFamily: 'Manrope' }}>Manage Shipments</p>
                      <p className="text-sm text-muted-foreground">View and track all shipments</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}
