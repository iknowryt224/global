import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Package, ArrowLeft, MapPin, Phone, Mail, Calendar, Truck, 
  Clock, CheckCircle, AlertTriangle, User, Edit, Plus, Wifi
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import { getShipment, addTrackingEvent, subscribeToTrackingEvents, subscribeToShipmentStatus } from "../lib/supabase";
import { statusColors, statusLabels, statusDotColors, formatDateTime } from "../lib/utils";
import { toast } from "sonner";
import { sendShipmentUpdateEmail } from "../lib/emailService";
import { ShipmentMapViewer } from "../components/ShipmentMapViewer";

export default function ShipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin, isDriver } = useAuth();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: "",
    location: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);

  useEffect(() => {
    fetchShipment();
  }, [id]);

  // Setup realtime subscriptions for this shipment
  useEffect(() => {
    if (!id) return;

    // Subscribe to tracking events
    const unsubscribeTracking = subscribeToTrackingEvents(id, (payload) => {
      if (payload.new) {
        toast.info(`New tracking update: ${statusLabels[payload.new.status]}`, {
          icon: <Wifi className="h-4 w-4 text-green-500" />,
          description: payload.new.location
        });
        // Refresh shipment data to get new tracking event
        fetchShipment();
      }
    });

    // Subscribe to shipment status changes
    const unsubscribeStatus = subscribeToShipmentStatus(id, (payload) => {
      if (payload.new && payload.old?.current_status !== payload.new.current_status) {
        setShipment(prev => prev ? { ...prev, current_status: payload.new.current_status } : prev);
      }
    });

    setIsRealtime(true);

    return () => {
      unsubscribeTracking();
      unsubscribeStatus();
      setIsRealtime(false);
    };
  }, [id]);

  const fetchShipment = async () => {
    try {
      const { data, error } = await getShipment(id);
      if (error || !data) {
        toast.error("Shipment not found");
        navigate("/dashboard/shipments");
        return;
      }
      setShipment(data);
      setUpdateData((prev) => ({ ...prev, status: data.current_status }));
    } catch (error) {
      toast.error("Error loading shipment");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    
    if (!updateData.status || !updateData.location) {
      toast.error("Please fill in status and location");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await addTrackingEvent({
        shipment_id: id,
        status: updateData.status,
        location: updateData.location,
        notes: updateData.notes || null,
        created_by: profile.id
      });

      if (error) {
        toast.error(error.message || "Failed to update status");
      } else {
        // Send email notification to recipient (non-blocking)
        sendShipmentUpdateEmail(shipment, updateData.status, updateData.location, updateData.notes)
          .then(result => {
            if (result.success) {
              console.log("Status update email sent to recipient");
            }
          })
          .catch(err => console.error("Status email error:", err));
        
        toast.success("Status updated successfully! Recipient notified by email.");
        setUpdateDialogOpen(false);
        setUpdateData({ status: "", location: "", notes: "" });
        fetchShipment();
      }
    } catch (error) {
      toast.error("Error updating status");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Shipment not found</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate("/dashboard/shipments")}
        >
          Back to Shipments
        </Button>
      </div>
    );
  }

  const canUpdateStatus = isAdmin || (isDriver && shipment.assigned_driver_id === profile?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/dashboard/shipments")}
            data-testid="back-btn"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Shipment</p>
              {isRealtime && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 rounded-full" data-testid="realtime-badge">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700">Live</span>
                </div>
              )}
            </div>
            <h2 className="tracking-number text-2xl font-bold text-[#0A2463]" data-testid="tracking-number">
              {shipment.tracking_number}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/dashboard/shipments/${id}/edit`)}
              data-testid="edit-shipment-btn"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canUpdateStatus && (
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#FF5722] hover:bg-[#FF7043]" data-testid="update-status-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
              </DialogTrigger>
              <DialogContent className="z-[9999]">
                <DialogHeader>
                  <DialogTitle>Update Shipment Status</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleStatusUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Status *</Label>
                    <Select 
                      value={updateData.status || undefined} 
                      onValueChange={(value) => setUpdateData((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger data-testid="update-status-select">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location *</Label>
                    <Input
                      placeholder="e.g., Distribution Center, City"
                      value={updateData.location}
                      onChange={(e) => setUpdateData((prev) => ({ ...prev, location: e.target.value }))}
                      data-testid="update-location-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Additional notes..."
                      value={updateData.notes}
                      onChange={(e) => setUpdateData((prev) => ({ ...prev, notes: e.target.value }))}
                      data-testid="update-notes-input"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setUpdateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={submitting}
                      className="bg-[#0A2463] hover:bg-[#1E3B8A]"
                      data-testid="submit-status-update"
                    >
                      {submitting ? "Updating..." : "Update Status"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div 
        className={`p-4 rounded-xl ${statusColors[shipment.current_status]} flex items-center justify-between`}
        data-testid="status-banner"
      >
        <div className="flex items-center gap-3">
          {shipment.current_status === "delivered" && <CheckCircle className="h-6 w-6" />}
          {shipment.current_status === "failed_delivery" && <AlertTriangle className="h-6 w-6" />}
          {["in_transit", "out_for_delivery"].includes(shipment.current_status) && (
            <Truck className="h-6 w-6 pulse-animation" />
          )}
          {["pending", "picked_up"].includes(shipment.current_status) && <Clock className="h-6 w-6" />}
          <span className="font-semibold text-lg">{statusLabels[shipment.current_status]}</span>
        </div>
        {shipment.estimated_delivery && (
          <span className="text-sm">
            Est. Delivery: {formatDateTime(shipment.estimated_delivery)}
          </span>
        )}
      </div>

      {/* Tracking Map */}
      <ShipmentMapViewer 
        shipment={shipment} 
        trackingEvents={shipment.tracking_history || []} 
      />

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sender Info */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <User className="h-5 w-5 text-[#0A2463]" />
            Sender Information
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{shipment.sender_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{shipment.sender_email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{shipment.sender_phone}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <p className="text-sm">{shipment.sender_address}</p>
            </div>
          </div>
        </div>

        {/* Recipient Info */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <MapPin className="h-5 w-5 text-[#FF5722]" />
            Recipient Information
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{shipment.recipient_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{shipment.recipient_email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{shipment.recipient_phone}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <p className="text-sm">{shipment.recipient_address}</p>
            </div>
          </div>
        </div>

        {/* Package Info */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <Package className="h-5 w-5 text-[#0A2463]" />
            Package Details
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{shipment.package_description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Weight</p>
                <p className="font-medium">{shipment.weight} kg</p>
              </div>
              {shipment.dimensions && (
                <div>
                  <p className="text-sm text-muted-foreground">Dimensions</p>
                  <p className="font-medium">{shipment.dimensions}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Driver Info */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <Truck className="h-5 w-5 text-[#0A2463]" />
            Delivery Assignment
          </h3>
          {shipment.assigned_driver ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Assigned Driver</p>
                <p className="font-medium">{shipment.assigned_driver.name}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No driver assigned yet</p>
          )}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Created: {formatDateTime(shipment.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Timeline */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-lg mb-6" style={{ fontFamily: 'Manrope' }}>
          Tracking History
        </h3>
        {shipment.tracking_history && shipment.tracking_history.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#0A2463] to-gray-200" />
            
            <div className="space-y-6">
              {[...shipment.tracking_history].reverse().map((event, index) => (
                <div key={event.id} className="relative flex gap-4 pl-10" data-testid={`tracking-event-${index}`}>
                  {/* Timeline dot */}
                  <div 
                    className="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-background z-10"
                    style={{ backgroundColor: statusDotColors[event.status] }}
                  >
                    {event.status === "delivered" ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : event.status === "failed_delivery" ? (
                      <AlertTriangle className="h-4 w-4 text-white" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`status-badge ${statusColors[event.status]}`}>
                        {statusLabels[event.status]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(event.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{event.location}</span>
                    </div>
                    {event.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{event.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No tracking events yet</p>
        )}
      </div>
    </div>
  );
}
