import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Package, Truck, Globe, Shield, Clock, ArrowRight, Menu, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuth } from "../context/AuthContext";
import { trackShipment } from "../lib/supabase";
import { statusColors, statusLabels, formatDateTime } from "../lib/utils";
import { toast } from "sonner";

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const trackingResultRef = useRef(null);

  // Scroll to tracking result when it's loaded
  useEffect(() => {
    if (trackingResult && trackingResultRef.current) {
      trackingResultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [trackingResult]);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await trackShipment(trackingNumber.trim());
      console.log("Track response:", { data, error });
      if (error) {
        console.error("Tracking error:", error);
        toast.error("Failed to track shipment");
        setTrackingResult(null);
        return;
      }
      if (!data) {
        toast.error("Shipment not found");
        setTrackingResult(null);
        return;
      }
      console.log("Setting tracking result:", data);
      setTrackingResult(data);
      toast.success("Shipment found!");
    } catch (error) {
      console.error("Track error:", error);
      toast.error("Error tracking shipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 nav-glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Globe className="h-8 w-8 text-[#0A2463]" />
              <span className="font-bold text-xl tracking-tight text-[#0A2463]" style={{ fontFamily: 'Manrope' }}>
                GLOBAL ACCESS
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#tracking" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Track Shipment
              </a>
              {isAuthenticated ? (
                <Button 
                  data-testid="dashboard-nav-btn"
                  onClick={() => navigate("/dashboard")}
                  className="bg-[#0A2463] hover:bg-[#1E3B8A]"
                >
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    data-testid="login-nav-btn"
                    variant="ghost" 
                    onClick={() => navigate("/login")}
                  >
                    Login
                  </Button>
                  <Button 
                    data-testid="register-nav-btn"
                    onClick={() => navigate("/register")}
                    className="bg-[#FF5722] hover:bg-[#FF7043]"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-border p-4 space-y-4">
            <a href="#features" className="block text-sm font-medium text-muted-foreground">Features</a>
            <a href="#tracking" className="block text-sm font-medium text-muted-foreground">Track Shipment</a>
            {isAuthenticated ? (
              <Button 
                className="w-full bg-[#0A2463] hover:bg-[#1E3B8A]"
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </Button>
            ) : (
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>Login</Button>
                <Button className="w-full bg-[#FF5722] hover:bg-[#FF7043]" onClick={() => navigate("/register")}>Get Started</Button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="hero-section relative pt-16" id="hero">
        <div 
          className="hero-background"
          style={{ backgroundImage: 'url(https://images.pexels.com/photos/35982637/pexels-photo-35982637.jpeg)' }}
        />
        <div className="hero-overlay" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-48">
          <div className="max-w-3xl">
            <p className="text-[#FF5722] font-mono text-sm tracking-[0.2em] uppercase mb-4">
              Enterprise Shipping Solutions
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6" style={{ fontFamily: 'Manrope' }}>
              Delivering Excellence <br />
              <span className="text-[#FF5722]">Worldwide</span>
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-xl" style={{ fontFamily: 'IBM Plex Sans' }}>
              Track shipments in real-time, manage deliveries efficiently, and provide your customers with transparent logistics solutions.
            </p>
            
            {/* Tracking Input */}
            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4 mb-8">
              <Input
                type="text"
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                className="hero-search flex-1"
                data-testid="hero-tracking-input"
              />
              <Button 
                type="submit"
                disabled={loading}
                className="bg-[#FF5722] hover:bg-[#FF7043] text-white px-8 h-14"
                data-testid="hero-track-btn"
              >
                {loading ? (
                  <span className="animate-pulse">Tracking...</span>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Track
                  </>
                )}
              </Button>
            </form>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
              {!isAuthenticated && (
                <Button 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => navigate("/register")}
                  data-testid="hero-create-account-btn"
                >
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tracking Result */}
      {trackingResult && (
        <section ref={trackingResultRef} className="py-12 bg-background" id="tracking-result">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-card rounded-xl border border-border p-6 shadow-lg" data-testid="tracking-result-card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Tracking Number</p>
                  <p className="tracking-number text-xl font-bold text-[#0A2463]">
                    {trackingResult.tracking_number}
                  </p>
                </div>
                <span className={`status-badge ${statusColors[trackingResult.current_status]}`}>
                  {statusLabels[trackingResult.current_status]}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-medium">{trackingResult.sender_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="font-medium">{trackingResult.recipient_name}</p>
                  <p className="text-sm text-muted-foreground">{trackingResult.recipient_address}</p>
                </div>
              </div>

              {trackingResult.estimated_delivery && (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                  <p className="font-medium">{formatDateTime(trackingResult.estimated_delivery)}</p>
                </div>
              )}

              {/* Tracking Timeline */}
              {trackingResult.tracking_history && trackingResult.tracking_history.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-4">Tracking History</h3>
                  <div className="tracking-timeline">
                    {[...trackingResult.tracking_history].reverse().map((event, index) => (
                      <div 
                        key={index} 
                        className={`tracking-event ${event.status === 'delivered' ? 'delivered' : ''} ${event.status === 'failed_delivery' ? 'failed' : ''}`}
                      >
                        <div className="ml-4">
                          <p className="font-medium">{statusLabels[event.status]}</p>
                          <p className="text-sm text-muted-foreground">{event.location}</p>
                          {event.notes && <p className="text-sm text-muted-foreground">{event.notes}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{formatDateTime(event.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-background" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-[#FF5722] font-mono text-sm tracking-[0.2em] uppercase mb-4">
              Why Choose Us
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'Manrope' }}>
              Enterprise-Grade Shipping Solutions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Package,
                title: "Real-Time Tracking",
                description: "Track every shipment with live status updates and location information."
              },
              {
                icon: Truck,
                title: "Fleet Management",
                description: "Manage your delivery fleet efficiently with driver assignments and route optimization."
              },
              {
                icon: Shield,
                title: "Secure Logistics",
                description: "Enterprise-grade security for your shipments and customer data."
              },
              {
                icon: Clock,
                title: "On-Time Delivery",
                description: "Advanced scheduling and notifications ensure timely deliveries."
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="stat-card card-hover"
                data-testid={`feature-card-${index}`}
              >
                <feature.icon className="h-10 w-10 text-[#0A2463] mb-4" />
                <h3 className="font-semibold text-lg mb-2" style={{ fontFamily: 'Manrope' }}>
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Track Section */}
      <section className="py-20 hero-gradient noise-overlay" id="tracking">
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6" style={{ fontFamily: 'Manrope' }}>
            Track Your Shipment
          </h2>
          <p className="text-white/80 mb-8">
            Enter your tracking number to get real-time updates on your shipment.
          </p>
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Input
              type="text"
              placeholder="Enter tracking number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              className="hero-search"
              data-testid="section-tracking-input"
            />
            <Button 
              type="submit"
              disabled={loading}
              className="bg-[#FF5722] hover:bg-[#FF7043] text-white px-8 h-14"
              data-testid="section-track-btn"
            >
              {loading ? "Tracking..." : "Track Shipment"}
            </Button>
          </form>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6" style={{ fontFamily: 'Manrope' }}>
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of businesses that trust Global Access for their shipping needs.
          </p>
          {!isAuthenticated && (
            <Button 
              size="lg"
              className="bg-[#0A2463] hover:bg-[#1E3B8A] text-white px-8"
              onClick={() => navigate("/register")}
              data-testid="cta-register-btn"
            >
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A2463] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Globe className="h-6 w-6" />
              <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'Manrope' }}>
                GLOBAL ACCESS
              </span>
            </div>
            <p className="text-sm text-white/60">
              © 2024 Global Access Shipping. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
