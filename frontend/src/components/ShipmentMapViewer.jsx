import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function ShipmentMapViewer({ shipment, trackingEvents = [] }) {
  if (!shipment?.sender_latitude || !shipment?.recipient_latitude) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shipment Tracking Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-gray-500 text-center">
            No location data available for tracking
          </div>
        </CardContent>
      </Card>
    );
  }

  const startPoint = [shipment.sender_latitude, shipment.sender_longitude];
  const endPoint = [shipment.recipient_latitude, shipment.recipient_longitude];

  // Build route from tracking events (sorted by date)
  const routePoints = trackingEvents
    ?.filter((e) => e.latitude && e.longitude)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((e) => [e.latitude, e.longitude]) || [];

  const allPoints = [startPoint, ...routePoints, endPoint];
  const mapCenter = startPoint;

  return (
    <Card className="relative z-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Shipment Tracking Map</CardTitle>
      </CardHeader>
      <CardContent className="relative z-0">
        <MapContainer
          center={mapCenter}
          zoom={7}
          style={{ height: "500px", borderRadius: "8px", position: "relative", zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          {/* Route line */}
          {routePoints.length > 0 && (
            <Polyline positions={allPoints} color="blue" weight={2} opacity={0.6} />
          )}

          {/* Pickup marker */}
          <Marker position={startPoint} icon={greenIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-green-600">Pickup Location</p>
                <p>{shipment.sender_name}</p>
                <p className="text-xs text-gray-500">{shipment.sender_address}</p>
              </div>
            </Popup>
          </Marker>

          {/* Delivery marker */}
          <Marker position={endPoint} icon={redIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-red-600">Delivery Location</p>
                <p>{shipment.recipient_name}</p>
                <p className="text-xs text-gray-500">{shipment.recipient_address}</p>
              </div>
            </Popup>
          </Marker>

          {/* Tracking points */}
          {trackingEvents?.map((event) => {
            if (!event.latitude || !event.longitude) return null;
            return (
              <Marker
                key={event.id}
                position={[event.latitude, event.longitude]}
                icon={defaultIcon}
              >
                <Tooltip>{event.status}</Tooltip>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold capitalize">{event.status}</p>
                    <p className="text-xs text-gray-500">{event.location}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    {event.notes && <p className="text-xs mt-1">{event.notes}</p>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded-full"></div>
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
            <span>In Transit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded-full"></div>
            <span>Delivery</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
