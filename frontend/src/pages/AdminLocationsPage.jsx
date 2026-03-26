import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { Edit2, Trash2 } from "lucide-react";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../lib/locationService";
import { useNavigate } from "react-router-dom";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AdminLocationsPage() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [mapCenter, setMapCenter] = useState([20, 0]);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    location_type: "hub",
    description: "",
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await getLocations();
      
      if (error) {
        console.error("Location fetch error:", error);
        toast.error(`Failed to load locations: ${error.message}`);
      } else {
        setLocations(data || []);
        if (data?.length > 0) {
          setMapCenter([data[0].latitude, data[0].longitude]);
        }
      }
    } catch (error) {
      console.error("Fetch locations exception:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat, lng) => {
    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString(),
    });
    toast.success(`Location set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.latitude || !formData.longitude) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        location_type: formData.location_type,
        description: formData.description,
      };

      let result;
      if (editing) {
        result = await updateLocation(editing, payload);
      } else {
        result = await createLocation(payload);
      }

      if (result.error) {
        toast.error(result.error.message || "Operation failed");
      } else {
        toast.success(editing ? "Location updated" : "Location created");
        resetForm();
        fetchLocations();
      }
    } catch (error) {
      toast.error("Error saving location");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (location) => {
    setEditing(location.id);
    setFormData({
      name: location.name,
      address: location.address,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      location_type: location.location_type,
      description: location.description || "",
    });
    setMapCenter([location.latitude, location.longitude]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this location?")) return;

    try {
      const { error } = await deleteLocation(id);
      if (error) {
        toast.error("Failed to delete location");
      } else {
        toast.success("Location deleted");
        fetchLocations();
      }
    } catch (error) {
      toast.error("Failed to delete location");
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      location_type: "hub",
      description: "",
    });
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Manage Locations</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{editing ? "Edit Location" : "Add New Location"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Location Name *</Label>
                <Input
                  placeholder="e.g., New York Hub"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div>
                <Label>Address</Label>
                <Input
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div>
                <Label>Type *</Label>
                <Select
                  value={formData.location_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, location_type: value })
                  }
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hub">Distribution Hub</SelectItem>
                    <SelectItem value="pickup">Pickup Point</SelectItem>
                    <SelectItem value="delivery">Delivery Station</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Latitude *</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="-90 to 90"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label>Longitude *</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="-180 to 180"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Additional details"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
                {editing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-500">
                💡 Tip: Click on the map to set coordinates
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Click on Map to Set Location</CardTitle>
          </CardHeader>
          <CardContent>
            <MapContainer
              center={mapCenter}
              zoom={5}
              style={{ height: "400px", borderRadius: "8px" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              <MapClickHandler onMapClick={handleMapClick} />

              {/* Current form location */}
              {formData.latitude && formData.longitude && (
                <Marker
                  position={[parseFloat(formData.latitude), parseFloat(formData.longitude)]}
                  icon={defaultIcon}
                >
                  <Popup>{formData.name || "New Location"}</Popup>
                </Marker>
              )}

              {/* All saved locations */}
              {locations.map((loc) => (
                <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={defaultIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{loc.name}</p>
                      <p className="text-gray-600">{loc.location_type}</p>
                      <p className="text-xs text-gray-500">
                        {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </CardContent>
        </Card>
      </div>

      {/* Locations List */}
      <Card>
        <CardHeader>
          <CardTitle>All Locations ({locations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-gray-500">No locations created yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Address</th>
                    <th className="text-left p-2">Coordinates</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-medium">{loc.name}</td>
                      <td className="p-2 text-xs">{loc.location_type}</td>
                      <td className="p-2 text-xs text-gray-600">{loc.address}</td>
                      <td className="p-2 text-xs font-mono">
                        ({loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)})
                      </td>
                      <td className="p-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(loc)}
                          disabled={submitting}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(loc.id)}
                          disabled={submitting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
