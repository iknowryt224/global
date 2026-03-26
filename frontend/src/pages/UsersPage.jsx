import { useState, useEffect } from "react";
import { Users, Search, Shield, Truck, User, UserCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { getAllProfiles, updateProfile } from "../lib/supabase";
import { formatDate } from "../lib/utils";
import { toast } from "sonner";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await getAllProfiles();
      if (error) {
        toast.error("Failed to load users");
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      toast.error("Error loading users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { error } = await updateProfile(userId, { role: newRole });
      if (error) {
        toast.error("Failed to update user role");
      } else {
        toast.success("User role updated successfully");
        fetchUsers();
      }
    } catch (error) {
      toast.error("Error updating user role");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const roleIcons = {
    admin: Shield,
    driver: Truck,
    customer: User
  };

  const roleColors = {
    admin: "bg-purple-100 text-purple-800",
    driver: "bg-blue-100 text-blue-800",
    customer: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>User Management</h2>
        <p className="text-muted-foreground">Manage user accounts and roles</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card" data-testid="users-total-stat">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0A2463]/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-[#0A2463]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
        <div className="stat-card" data-testid="users-drivers-stat">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.role === "driver").length}</p>
              <p className="text-sm text-muted-foreground">Drivers</p>
            </div>
          </div>
        </div>
        <div className="stat-card" data-testid="users-customers-stat">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.role === "customer").length}</p>
              <p className="text-sm text-muted-foreground">Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="users-search"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="role-filter">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="driver">Driver</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
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
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || roleFilter !== "all" 
                ? "No users match your filters" 
                : "No users found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const RoleIcon = roleIcons[user.role];
                  return (
                    <TableRow key={user.id} data-testid={`user-${user.email}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0A2463] flex items-center justify-center text-white font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{user.phone || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={roleColors[user.role]}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select 
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                        >
                          <SelectTrigger className="w-32" data-testid={`change-role-${user.email}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="driver">Driver</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
