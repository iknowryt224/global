import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, User, MapPin, Calendar } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar as CalendarComponent } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { useAuth } from "../context/AuthContext";
import { createShipment, updateShipment, getShipment, getDrivers, addTrackingEvent } from "../lib/supabase";
import { getLocations } from "../lib/locationService";
import { cn, formatDate } from "../lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CreateEditShipmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [senderLocationId, setSenderLocationId] = useState("");
  const [recipientLocationId, setRecipientLocationId] = useState("");
  const [formData, setFormData] = useState({
    sender_name: "",
    sender_email: "",
    sender_phone: "",
    sender_address: "",
    sender_location_id: null,
    sender_latitude: null,
    sender_longitude: null,
    recipient_name: "",
    recipient_email: "",
    recipient_phone: "",
    recipient_address: "",
    recipient_location_id: null,
    recipient_latitude: null,
    recipient_longitude: null,
    package_description: "",
    weight: "",
    dimensions: "",
    estimated_delivery: null,
    assigned_driver_id: ""
  });

  useEffect(() => {
    if (isEdit) {
      fetchShipment();
    }
    if (isAdmin) {
      fetchDrivers();
    }
    fetchLocations();
  }, [id, isAdmin]);

  const fetchShipment = async () => {
    try {
      const { data, error } = await getShipment(id);
      if (error || !data) {
        toast.error("Failed to load shipment");
        navigate("/dashboard/shipments");
        return;
      }
      setFormData({
        sender_name: data.sender_name,
        sender_email: data.sender_email,
        sender_phone: data.sender_phone,
        sender_address: data.sender_address,
        recipient_name: data.recipient_name,
        recipient_email: data.recipient_email,
        recipient_phone: data.recipient_phone,
        recipient_address: data.recipient_address,
        package_description: data.package_description,
        weight: data.weight.toString(),
        dimensions: data.dimensions || "",
        estimated_delivery: data.estimated_delivery ? new Date(data.estimated_delivery) : null,
        assigned_driver_id: data.assigned_driver_id || ""
      });
    } catch (error) {
      toast.error("Error loading shipment");
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await getDrivers();
      if (!error && data) {
        setDrivers(data);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await getLocations();
      if (!error && data) {
        setLocations(data);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const handleSenderLocationSelect = (locationId) => {
    setSenderLocationId(locationId);
    const location = locations.find((l) => l.id === locationId);
    if (location) {
      setFormData({
        ...formData,
        sender_address: location.address,
        sender_location_id: location.id,
        sender_latitude: location.latitude,
        sender_longitude: location.longitude,
      });
    }
  };

  const handleRecipientLocationSelect = (locationId) => {
    setRecipientLocationId(locationId);
    const location = locations.find((l) => l.id === locationId);
    if (location) {
      setFormData({
        ...formData,
        recipient_address: location.address,
        recipient_location_id: location.id,
        recipient_latitude: location.latitude,
        recipient_longitude: location.longitude,
      });
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const requiredFields = [
      "sender_name", "sender_email", "sender_phone", "sender_address",
      "recipient_name", "recipient_email", "recipient_phone", "recipient_address",
      "package_description", "weight"
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        toast.error(`Please fill in ${field.replace(/_/g, " ")}`);
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.sender_email)) {
      toast.error("Please enter a valid sender email");
      return;
    }
    if (!emailRegex.test(formData.recipient_email)) {
      toast.error("Please enter a valid recipient email");
      return;
    }

    if (isNaN(parseFloat(formData.weight)) || parseFloat(formData.weight) <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    setSubmitting(true);

    const payload = {
      sender_name: formData.sender_name,
      sender_email: formData.sender_email,
      sender_phone: formData.sender_phone,
      sender_address: formData.sender_address,
      sender_location_id: formData.sender_location_id || null,
      sender_latitude: formData.sender_latitude || null,
      sender_longitude: formData.sender_longitude || null,
      recipient_name: formData.recipient_name,
      recipient_email: formData.recipient_email,
      recipient_phone: formData.recipient_phone,
      recipient_address: formData.recipient_address,
      recipient_location_id: formData.recipient_location_id || null,
      recipient_latitude: formData.recipient_latitude || null,
      recipient_longitude: formData.recipient_longitude || null,
      package_description: formData.package_description,
      weight: parseFloat(formData.weight),
      dimensions: formData.dimensions || null,
      estimated_delivery: formData.estimated_delivery ? formData.estimated_delivery.toISOString() : null,
      assigned_driver_id: formData.assigned_driver_id || null
    };

    try {
      if (isEdit) {
        const { data, error } = await updateShipment(id, payload);
        if (error) {
          toast.error(error.message || "Failed to update shipment");
        } else {
          toast.success("Shipment updated successfully");
          navigate(`/dashboard/shipments/${id}`);
        }
      } else {
        // Add created_by for new shipments
        payload.created_by = profile.id;
        
        const { data, error } = await createShipment(payload);
        if (error) {
          toast.error(error.message || "Failed to create shipment");
        } else {
          // Add initial tracking event
          await addTrackingEvent({
            shipment_id: data.id,
            status: 'pending',
            location: 'Origin facility',
            notes: 'Shipment created',
            created_by: profile.id
          });
          
          // Send email notification to recipient (non-blocking)
          sendShipmentCreatedEmail(data)
            .then(result => {
              if (result.success) {
                console.log("Shipment notification email sent");
              }
            })
            .catch(err => console.error("Shipment email error:", err));
          
          toast.success("Shipment created successfully! Recipient will receive an email notification.");
          navigate(`/dashboard/shipments/${data.id}`);
        }
      }
    } catch (error) {
      toast.error(`Error ${isEdit ? "updating" : "creating"} shipment`);
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-fill sender info for customers
  useEffect(() => {
    if (!isEdit && !isAdmin && profile) {
      setFormData((prev) => ({
        ...prev,
        sender_name: profile.name || "",
        sender_email: profile.email || "",
        sender_phone: profile.phone || ""
      }));
    }
  }, [profile, isEdit, isAdmin]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-[600px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
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
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>
            {isEdit ? "Edit Shipment" : "Create New Shipment"}
          </h2>
          <p className="text-muted-foreground">
            {isEdit ? "Update shipment details" : "Fill in the shipment information"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Sender Information */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <User className="h-5 w-5 text-[#0A2463]" />
            Sender Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label htmlFor="sender_name">Full Name *</Label>
              <Input
                id="sender_name"
                placeholder="John Doe"
                value={formData.sender_name}
                onChange={(e) => handleChange("sender_name", e.target.value)}
                data-testid="sender-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_email">Email *</Label>
              <Input
                id="sender_email"
                type="email"
                placeholder="john@example.com"
                value={formData.sender_email}
                onChange={(e) => handleChange("sender_email", e.target.value)}
                data-testid="sender-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender_phone">Phone *</Label>
              <Input
                id="sender_phone"
                placeholder="+1 (555) 000-0000"
                value={formData.sender_phone}
                onChange={(e) => handleChange("sender_phone", e.target.value)}
                data-testid="sender-phone-input"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sender_location">Quick Select Location</Label>
              <Select value={senderLocationId} onValueChange={handleSenderLocationSelect}>
                <SelectTrigger id="sender_location">
                  <SelectValue placeholder="Select a location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.location_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sender_address">Address *</Label>
              <Textarea
                id="sender_address"
                placeholder="123 Main St, City, State, ZIP"
                value={formData.sender_address}
                onChange={(e) => handleChange("sender_address", e.target.value)}
                data-testid="sender-address-input"
              />
            </div>
          </div>
        </div>

        {/* Recipient Information */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <MapPin className="h-5 w-5 text-[#FF5722]" />
            Recipient Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label htmlFor="recipient_name">Full Name *</Label>
              <Input
                id="recipient_name"
                placeholder="Jane Smith"
                value={formData.recipient_name}
                onChange={(e) => handleChange("recipient_name", e.target.value)}
                data-testid="recipient-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient_email">Email *</Label>
              <Input
                id="recipient_email"
                type="email"
                placeholder="jane@example.com"
                value={formData.recipient_email}
                onChange={(e) => handleChange("recipient_email", e.target.value)}
                data-testid="recipient-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient_phone">Phone *</Label>
              <Input
                id="recipient_phone"
                placeholder="+1 (555) 000-0000"
                value={formData.recipient_phone}
                onChange={(e) => handleChange("recipient_phone", e.target.value)}
                data-testid="recipient-phone-input"
              />
            </div>
            <div className="space-y-2 md:col-span-2">              <Label htmlFor="recipient_location">Quick Select Location</Label>
              <Select value={recipientLocationId} onValueChange={handleRecipientLocationSelect}>
                <SelectTrigger id="recipient_location">
                  <SelectValue placeholder="Select a location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.location_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">              <Label htmlFor="recipient_address">Address *</Label>
              <Textarea
                id="recipient_address"
                placeholder="456 Oak Ave, City, State, ZIP"
                value={formData.recipient_address}
                onChange={(e) => handleChange("recipient_address", e.target.value)}
                data-testid="recipient-address-input"
              />
            </div>
          </div>
        </div>

        {/* Package Information */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <Package className="h-5 w-5 text-[#0A2463]" />
            Package Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="package_description">Description *</Label>
              <Textarea
                id="package_description"
                placeholder="Describe the package contents..."
                value={formData.package_description}
                onChange={(e) => handleChange("package_description", e.target.value)}
                data-testid="package-description-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
                data-testid="weight-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions (optional)</Label>
              <Input
                id="dimensions"
                placeholder="L x W x H cm"
                value={formData.dimensions}
                onChange={(e) => handleChange("dimensions", e.target.value)}
                data-testid="dimensions-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Delivery (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.estimated_delivery && "text-muted-foreground"
                    )}
                    data-testid="estimated-delivery-btn"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.estimated_delivery ? format(formData.estimated_delivery, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.estimated_delivery}
                    onSelect={(date) => handleChange("estimated_delivery", date)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label>Assign Driver (optional)</Label>
                <Select 
                  value={formData.assigned_driver_id || "none"} 
                  onValueChange={(value) => handleChange("assigned_driver_id", value === "none" ? "" : value)}
                >
                  <SelectTrigger data-testid="driver-select">
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No driver assigned</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate("/dashboard/shipments")}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={submitting}
            className="bg-[#FF5722] hover:bg-[#FF7043]"
            data-testid="submit-shipment-btn"
          >
            {submitting ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update Shipment" : "Create Shipment")}
          </Button>
        </div>
      </form>
    </div>
  );
}
