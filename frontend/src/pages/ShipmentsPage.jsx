import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Plus, Search, Filter, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "../components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "../components/ui/alert-dialog";
import { useAuth } from "../context/AuthContext";
import { getShipments, deleteShipment } from "../lib/supabase";
import { statusColors, statusLabels, formatDate } from "../lib/utils";
import { toast } from "sonner";

export default function ShipmentsPage() {
  const navigate = useNavigate();
  const { profile, isAdmin, isCustomer } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (profile) {
      fetchShipments();
    }
  }, [profile]);

  const fetchShipments = async () => {
    try {
      const { data, error } = await getShipments(profile.id, profile.role, profile.email);
      if (error) {
        toast.error("Failed to load shipments");
      } else {
        setShipments(data || []);
      }
    } catch (error) {
      toast.error("Error loading shipments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shipmentId) => {
    try {
      const { error } = await deleteShipment(shipmentId);
      if (error) {
        toast.error("Failed to delete shipment");
      } else {
        toast.success("Shipment deleted successfully");
        fetchShipments();
      }
    } catch (error) {
      toast.error("Error deleting shipment");
    }
  };

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch = 
      shipment.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.sender_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || shipment.current_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>Shipments</h2>
          <p className="text-muted-foreground">Manage and track all shipments</p>
        </div>
        {(isAdmin || isCustomer) && (
          <Button 
            onClick={() => navigate("/dashboard/shipments/new")}
            className="bg-[#FF5722] hover:bg-[#FF7043]"
            data-testid="create-shipment-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Shipment
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tracking number, sender, or recipient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
            data-testid="shipments-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed_delivery">Failed Delivery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" 
                ? "No shipments match your filters" 
                : "No shipments yet"}
            </p>
            {(isAdmin || isCustomer) && !searchTerm && statusFilter === "all" && (
              <Button 
                className="mt-4 bg-[#FF5722] hover:bg-[#FF7043]"
                onClick={() => navigate("/dashboard/shipments/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Shipment
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking Number</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.map((shipment) => (
                  <TableRow key={shipment.id} data-testid={`shipment-${shipment.tracking_number}`}>
                    <TableCell>
                      <span className="tracking-number text-sm font-medium">
                        {shipment.tracking_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{shipment.sender_name}</p>
                        <p className="text-xs text-muted-foreground">{shipment.sender_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{shipment.recipient_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {shipment.recipient_address}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`status-badge ${statusColors[shipment.current_status]}`}>
                        {statusLabels[shipment.current_status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(shipment.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/dashboard/shipments/${shipment.id}`)}
                          data-testid={`view-shipment-${shipment.tracking_number}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/dashboard/shipments/${shipment.id}/edit`)}
                              data-testid={`edit-shipment-${shipment.tracking_number}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`delete-shipment-${shipment.tracking_number}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this shipment? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(shipment.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
