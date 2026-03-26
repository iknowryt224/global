import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, MapPin, Clock, CheckCircle, Truck, AlertTriangle, Eye } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import { getShipments, addTrackingEvent, getShipmentWithTracking } from "../lib/supabase";
import { ShipmentMapViewer } from "../components/ShipmentMapViewer";
import { statusColors, statusLabels } from "../lib/utils";
import { toast } from "sonner";

export default function DeliveriesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: "",
    location: "",
    latitude: "",
    longitude: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchDeliveries();
    }
  }, [profile]);

  const fetchDeliveries = async () => {
    try {
      const { data, error } = await getShipments(profile.id, profile.role, profile.email);
      if (error) {
        toast.error("Failed to load deliveries");
      } else {
        setShipments(data || []);
      }
    } catch (error) {
      toast.error("Error loading deliveries");
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
        shipment_id: selectedShipment.id,
        status: updateData.status,
        location: updateData.location,
        latitude: updateData.latitude ? parseFloat(updateData.latitude) : null,
        longitude: updateData.longitude ? parseFloat(updateData.longitude) : null,
        notes: updateData.notes || null,
        created_by: profile.id
      });

      if (error) {
        toast.error(error.message || "Failed to update status");
      } else {
        toast.success("Status updated successfully");
        setUpdateDialogOpen(false);
        setSelectedShipment(null);
        setUpdateData({ status: "", location: "", latitude: "", longitude: "", notes: "" });
        fetchDeliveries();
      }
    } catch (error) {
      toast.error("Error updating status");
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateDialog = (shipment) => {
    setSelectedShipment(shipment);
    setUpdateData({ status: shipment.current_status, location: "", latitude: "", longitude: "", notes: "" });
    setUpdateDialogOpen(true);
  };

  const activeDeliveries = shipments.filter(s => 
    ["picked_up", "in_transit", "out_for_delivery"].includes(s.current_status)
  );

  const pendingPickups = shipments.filter(s => s.current_status === "pending");

  const completedDeliveries = shipments.filter(s => 
    ["delivered", "failed_delivery"].includes(s.current_status)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>My Deliveries</h2>
        <p className="text-muted-foreground">Manage your assigned shipments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card card-hover" data-testid="pending-pickups-stat">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingPickups.length}</p>
              <p className="text-sm text-muted-foreground">Pending Pickups</p>
            </div>
          </div>
        </div>
        <div className="stat-card card-hover" data-testid="active-deliveries-stat">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Truck className="h-5 w-5 text-blue-600 pulse-animation" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeDeliveries.length}</p>
              <p className="text-sm text-muted-foreground">Active Deliveries</p>
            </div>
          </div>
        </div>
        <div className="stat-card card-hover" data-testid="completed-deliveries-stat">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedDeliveries.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : shipments.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No deliveries assigned to you yet</p>
        </div>
      ) : (
        <>
          {/* Pending Pickups */}
          {pendingPickups.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Pickups
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {pendingPickups.map((shipment) => (
                  <DeliveryCard 
                    key={shipment.id} 
                    shipment={shipment} 
                    onUpdate={() => openUpdateDialog(shipment)}
                    onView={() => navigate(`/dashboard/shipments/${shipment.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active Deliveries */}
          {activeDeliveries.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
                <Truck className="h-5 w-5 text-blue-500" />
                Active Deliveries
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {activeDeliveries.map((shipment) => (
                  <DeliveryCard 
                    key={shipment.id} 
                    shipment={shipment} 
                    onUpdate={() => openUpdateDialog(shipment)}
                    onView={() => navigate(`/dashboard/shipments/${shipment.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completedDeliveries.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Completed Deliveries
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {completedDeliveries.slice(0, 5).map((shipment) => (
                  <DeliveryCard 
                    key={shipment.id} 
                    shipment={shipment} 
                    onView={() => navigate(`/dashboard/shipments/${shipment.id}`)}
                    completed
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="tracking-number text-sm font-medium text-[#0A2463]">
                  {selectedShipment.tracking_number}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  To: {selectedShipment.recipient_name}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select 
                  value={updateData.status || undefined} 
                  onValueChange={(value) => setUpdateData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger data-testid="delivery-status-select">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed_delivery">Failed Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Location *</Label>
                <Input
                  placeholder="e.g., Downtown Distribution Center"
                  value={updateData.location}
                  onChange={(e) => setUpdateData((prev) => ({ ...prev, location: e.target.value }))}
                  data-testid="delivery-location-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Latitude (optional)</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="-90 to 90"
                    value={updateData.latitude}
                    onChange={(e) => setUpdateData((prev) => ({ ...prev, latitude: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude (optional)</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="-180 to 180"
                    value={updateData.longitude}
                    onChange={(e) => setUpdateData((prev) => ({ ...prev, longitude: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={updateData.notes}
                  onChange={(e) => setUpdateData((prev) => ({ ...prev, notes: e.target.value }))}
                  data-testid="delivery-notes-input"
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
                  className="bg-[#FF5722] hover:bg-[#FF7043]"
                  data-testid="submit-delivery-update"
                >
                  {submitting ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeliveryCard({ shipment, onUpdate, onView, completed }) {
  return (
    <div 
      className="bg-card rounded-xl border border-border p-4 card-hover"
      data-testid={`delivery-card-${shipment.tracking_number}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="tracking-number text-sm font-medium text-[#0A2463]">
              {shipment.tracking_number}
            </span>
            <span className={`status-badge ${statusColors[shipment.current_status]}`}>
              {statusLabels[shipment.current_status]}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">To:</span>
              <span>{shipment.recipient_name}</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6 truncate max-w-md">
              {shipment.recipient_address}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onView}
            data-testid={`view-delivery-${shipment.tracking_number}`}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {!completed && onUpdate && (
            <Button 
              size="sm"
              className="bg-[#FF5722] hover:bg-[#FF7043]"
              onClick={onUpdate}
              data-testid={`update-delivery-${shipment.tracking_number}`}
            >
              Update Status
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
