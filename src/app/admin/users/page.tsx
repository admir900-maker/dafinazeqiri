'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  Search,
  Crown,
  Shield,
  User,
  Mail,
  Calendar,
  MoreVertical,
  UserPlus,
  Download,
  Eye,
  Ban,
  UserCheck,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckSquare,
  Square,
  Euro,
  Activity,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

interface UserData {
  id: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  createdAt: string;
  lastSignInAt: string;
  banned?: boolean;
  publicMetadata: {
    role?: string;
  };
  bookingStats?: {
    totalBookings: number;
    totalSpent: number;
    lastBooking: string | null;
  };
}

interface UserDetails extends UserData {
  banned: boolean;
  bookings: Array<{
    id: string;
    eventTitle: string;
    eventDate: string;
    status: string;
    totalAmount: number;
    quantity: number;
    createdAt: string;
    paymentMethod: string;
  }>;
  statistics: {
    byStatus: Array<{ _id: string; count: number; totalAmount: number; }>;
    total: {
      totalBookings: number;
      totalSpent: number;
      firstBooking: string | null;
      lastBooking: string | null;
      avgBookingValue: number;
    };
    monthlyActivity: Array<{
      _id: { year: number; month: number; };
      bookings: number;
      spent: number;
    }>;
  };
}

export default function UsersManagementPage() {
  const { user, isLoaded } = useUser();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [roleCounts, setRoleCounts] = useState({ admin: 0, manager: 0, staff: 0, validator: 0, user: 0 });
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [exporting, setExporting] = useState(false);

  const limit = 20;

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sortBy,
        sortOrder
      });

      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
        setTotalCount(data.totalCount);
        setHasMore(data.pagination.hasMore);
        if (data.roleCounts) {
          setRoleCounts(data.roleCounts);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();

      if (data.success) {
        setUserDetails(data.user);
        setIsDetailsOpen(true);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const exportUsers = async (format = 'csv') => {
    try {
      setExporting(true);
      const params = new URLSearchParams({
        format,
        includeStats: 'true'
      });

      if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter);

      const response = await fetch(`/api/admin/users/export?${params}`); if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        console.log('Export data:', data);
      }
    } catch (error) {
      console.error('Error exporting users:', error);
    } finally {
      setExporting(false);
    }
  };

  const performBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;

    try {
      let data: any = {};

      if (bulkAction === 'updateRole') {
        const role = prompt('Enter role (admin, manager, staff, validator, or leave empty for user):');
        if (role === null) return;
        data.role = role;
      }

      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: bulkAction,
          userIds: selectedUsers,
          data
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setSelectedUsers([]);
        setBulkAction('');
        await fetchUsers(currentPage);
      } else {
        alert(result.error || 'Bulk operation failed');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Bulk operation failed');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const promoteUser = async (userId: string, role: string) => {
    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'User role updated successfully');
        await fetchUsers(currentPage);
      } else {
        alert(data.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      alert('Failed to update user role');
    }
  };

  const banUser = async (userId: string, ban = true) => {
    if (!confirm(`Are you sure you want to ${ban ? 'ban' : 'unban'} this user?`)) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: ban })
      });

      if (response.ok) {
        await fetchUsers(currentPage);
        alert(`User ${ban ? 'banned' : 'unbanned'} successfully`);
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${ban ? 'ban' : 'unban'} user`);
      }
    } catch (error) {
      console.error(`Error ${ban ? 'banning' : 'unbanning'} user:`, error);
      alert(`Failed to ${ban ? 'ban' : 'unban'} user`);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchUsers(1);
    }
  }, [isLoaded, user, roleFilter, sortBy, sortOrder]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers(1);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const filteredUsers = users;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'manager': return 'bg-blue-600';
      case 'staff': return 'bg-green-600';
      case 'validator': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'manager': return Shield;
      case 'staff': return User;
      case 'validator': return CheckCircle;
      default: return User;
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-2 text-orange-100">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          Loading users...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">Users Management</h1>
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-500/20 text-orange-100">
              {totalCount} Total Users
            </Badge>
            <Button
              onClick={() => exportUsers('csv')}
              disabled={exporting}
              className="bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-black font-bold"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="bg-black/60 border-2 border-orange-500/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-orange-100/70 text-sm">Search</Label>
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-orange-500/20 border-orange-500/30 text-orange-100 placeholder:text-orange-100/40"
                />
              </div>
              <div>
                <Label className="text-orange-100/70 text-sm">Role Filter</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="bg-orange-500/20 border-orange-500/30 text-orange-100">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="validator">Validator</SelectItem>
                    <SelectItem value="user">Regular User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-orange-100/70 text-sm">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-orange-500/20 border-orange-500/30 text-orange-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Registration Date</SelectItem>
                    <SelectItem value="last_sign_in_at">Last Sign In</SelectItem>
                    <SelectItem value="first_name">First Name</SelectItem>
                    <SelectItem value="last_name">Last Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-orange-100/70 text-sm">Order</Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="bg-orange-500/20 border-orange-500/30 text-orange-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <Card className="bg-orange-500/10 border-2 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-orange-100 font-medium">
                  {selectedUsers.length} user(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="bg-orange-500/20 border-orange-500/30 text-orange-100 w-48">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updateRole">Update Role</SelectItem>
                      <SelectItem value="ban">Ban Users</SelectItem>
                      <SelectItem value="unban">Unban Users</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={performBulkAction}
                    disabled={!bulkAction}
                    className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                  >
                    Apply
                  </Button>
                  <Button
                    onClick={() => setSelectedUsers([])}
                    variant="outline"
                    className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Users', value: totalCount, icon: Users, role: 'all' },
            { label: 'Admins', value: roleCounts.admin, icon: Crown, role: 'admin' },
            { label: 'Managers', value: roleCounts.manager, icon: Shield, role: 'manager' },
            { label: 'Validators', value: roleCounts.validator, icon: CheckCircle, role: 'validator' },
            { label: 'Regular Users', value: roleCounts.user, icon: User, role: 'user' }
          ].map((stat) => {
            const Icon = stat.icon;
            const isActive = roleFilter === stat.role;
            return (
              <Card
                key={stat.label}
                onClick={() => {
                  setRoleFilter(stat.role);
                  setCurrentPage(1);
                }}
                className={`bg-black/60 border-2 cursor-pointer transition-all ${isActive
                  ? 'border-orange-500 ring-2 ring-orange-500/30'
                  : 'border-orange-500/30 hover:border-orange-500/60'
                  }`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={`w-8 h-8 ${isActive ? 'text-orange-500' : 'text-orange-100/70'}`} />
                  <div>
                    <p className="text-orange-100/70 text-sm">{stat.label}</p>
                    <p className="text-2xl font-black text-orange-500">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Users List */}
        <Card className="bg-black/60 border-2 border-orange-500/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Users List</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={toggleAllUsers}
                  variant="outline"
                  size="sm"
                  className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                >
                  {selectedUsers.length === users.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Select All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-4">
              {filteredUsers.map((userData) => {
                const RoleIcon = getRoleIcon(userData.publicMetadata.role);
                const isSelected = selectedUsers.includes(userData.id);

                return (
                  <div
                    key={userData.id}
                    className={`p-4 rounded-lg border transition-all ${isSelected
                      ? 'bg-orange-500/20 border-orange-500/50'
                      : 'bg-black/40 border-orange-500/10 hover:bg-orange-500/10'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          onClick={() => toggleUserSelection(userData.id)}
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto text-orange-100 hover:bg-transparent"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-orange-500" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </Button>

                        <img
                          src={userData.imageUrl || '/placeholder-avatar.svg'}
                          alt={`${userData.firstName} ${userData.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />

                        <div>
                          <h3 className="text-orange-100 font-semibold">
                            {userData.firstName} {userData.lastName}
                          </h3>
                          <p className="text-orange-100/70 text-sm">{userData.emailAddress}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-orange-100/40" />
                            <span className="text-orange-100/40 text-xs">
                              Joined {new Date(userData.createdAt).toLocaleDateString()}
                            </span>
                            {userData.lastSignInAt && (
                              <>
                                <span className="text-orange-100/40 text-xs">•</span>
                                <span className="text-orange-100/40 text-xs">
                                  Last active {new Date(userData.lastSignInAt).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Booking Stats */}
                          {userData.bookingStats && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-orange-100/50">
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {userData.bookingStats.totalBookings} bookings
                              </div>
                              <div className="flex items-center gap-1">
                                <Euro className="w-3 h-3" />
                                {formatCurrency(userData.bookingStats.totalSpent)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={`${getRoleColor(userData.publicMetadata.role)} text-white`}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {userData.publicMetadata.role || 'User'}
                        </Badge>

                        {userData.banned && (
                          <Badge className="bg-red-600 text-white">
                            <Ban className="w-3 h-3 mr-1" />
                            Banned
                          </Badge>
                        )}

                        <div className="flex gap-2">
                          <Button
                            onClick={() => fetchUserDetails(userData.id)}
                            size="sm"
                            className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                          </Button>

                          {userData.publicMetadata.role !== 'admin' && (
                            <>
                              {!userData.publicMetadata.role && (
                                <>
                                  <Button
                                    onClick={() => promoteUser(userData.id, 'staff')}
                                    size="sm"
                                    className="bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-black font-bold"
                                  >
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    Make Staff
                                  </Button>
                                  <Button
                                    onClick={() => promoteUser(userData.id, 'validator')}
                                    size="sm"
                                    className="bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-black font-bold"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Make Validator
                                  </Button>
                                </>
                              )}
                              {userData.publicMetadata.role === 'staff' && (
                                <Button
                                  onClick={() => promoteUser(userData.id, 'manager')}
                                  size="sm"
                                  className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                                >
                                  <Shield className="w-3 h-3 mr-1" />
                                  Make Manager
                                </Button>
                              )}
                              {userData.publicMetadata.role === 'manager' && (
                                <Button
                                  onClick={() => promoteUser(userData.id, 'validator')}
                                  size="sm"
                                  className="bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-black font-bold"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Make Validator
                                </Button>
                              )}
                              {(userData.publicMetadata.role === 'manager' || userData.publicMetadata.role === 'staff' || userData.publicMetadata.role === 'validator') && (
                                <Button
                                  onClick={() => promoteUser(userData.id, '')}
                                  size="sm"
                                  className="bg-black/40 border border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                                >
                                  Remove Role
                                </Button>
                              )}

                              {userData.banned ? (
                                <Button
                                  onClick={() => banUser(userData.id, false)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  Unban
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => banUser(userData.id, true)}
                                  size="sm"
                                  variant="destructive"
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  <Ban className="w-3 h-3 mr-1" />
                                  Ban
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalCount > limit && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-orange-500/10">
                <div className="text-sm text-orange-100/70">
                  Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setCurrentPage(prev => prev - 1);
                      fetchUsers(currentPage - 1);
                    }}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-white px-3 py-1">
                    Page {currentPage} of {Math.ceil(totalCount / limit)}
                  </span>
                  <Button
                    onClick={() => {
                      setCurrentPage(prev => prev + 1);
                      fetchUsers(currentPage + 1);
                    }}
                    disabled={!hasMore}
                    variant="outline"
                    size="sm"
                    className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {filteredUsers.length === 0 && !loading && (
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-orange-100/40 mx-auto mb-4" />
              <p className="text-orange-100/70">No users found matching your criteria.</p>
            </CardContent>
          </Card>
        )}

        {/* User Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-2 border-orange-500/50">
            <DialogHeader>
              <DialogTitle className="text-white">
                User Details: {userDetails?.firstName} {userDetails?.lastName}
              </DialogTitle>
              <DialogDescription className="text-orange-100/40">
                Comprehensive user information and activity history
              </DialogDescription>
            </DialogHeader>

            {userDetails && (
              <div className="space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={userDetails.imageUrl || '/placeholder-avatar.svg'}
                        alt={`${userDetails.firstName} ${userDetails.lastName}`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="text-xl font-semibold text-orange-100">
                          {userDetails.firstName} {userDetails.lastName}
                        </h3>
                        <p className="text-orange-100/40">{userDetails.emailAddress}</p>
                        <Badge className={`${getRoleColor(userDetails.publicMetadata.role)} text-orange-100 mt-2`}>
                          {userDetails.publicMetadata.role || 'User'}
                        </Badge>
                        {userDetails.banned && (
                          <Badge className="bg-red-600 text-orange-100 ml-2 mt-2">
                            Banned
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-orange-100/40">Joined:</span>
                        <p className="text-white">{new Date(userDetails.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-orange-100/40">Last Sign In:</span>
                        <p className="text-white">
                          {userDetails.lastSignInAt
                            ? new Date(userDetails.lastSignInAt).toLocaleDateString()
                            : 'Never'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-orange-500">Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 p-4 rounded-lg">
                        <div className="text-2xl font-black text-orange-500">
                          {userDetails.statistics.total.totalBookings}
                        </div>
                        <div className="text-sm text-orange-100/40">Total Bookings</div>
                      </div>
                      <div className="bg-black/40 p-4 rounded-lg">
                        <div className="text-2xl font-black text-orange-500">
                          {formatCurrency(userDetails.statistics.total.totalSpent)}
                        </div>
                        <div className="text-sm text-orange-100/40">Total Spent</div>
                      </div>
                      <div className="bg-black/40 p-4 rounded-lg">
                        <div className="text-2xl font-black text-orange-500">
                          {formatCurrency(userDetails.statistics.total.avgBookingValue)}
                        </div>
                        <div className="text-sm text-orange-100/40">Avg. Booking</div>
                      </div>
                      <div className="bg-black/40 p-4 rounded-lg">
                        <div className="text-2xl font-black text-orange-500">
                          {userDetails.statistics.total.lastBooking
                            ? new Date(userDetails.statistics.total.lastBooking).toLocaleDateString()
                            : 'None'
                          }
                        </div>
                        <div className="text-sm text-orange-100/40">Last Booking</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking History */}
                <div>
                  <h4 className="text-lg font-semibold text-orange-500 mb-4">Recent Booking History</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {userDetails.bookings.length > 0 ? (
                      userDetails.bookings.map((booking) => (
                        <div key={booking.id} className="bg-black/40 p-3 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="text-orange-100 font-medium">{booking.eventTitle}</div>
                            <div className="text-sm text-orange-100/40">
                              {new Date(booking.createdAt).toLocaleDateString()} •
                              {booking.quantity} ticket(s) •
                              {booking.paymentMethod}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-orange-100 font-medium">
                              {formatCurrency(booking.totalAmount)}
                            </div>
                            <Badge className={`text-xs ${booking.status === 'confirmed' ? 'bg-green-600' :
                              booking.status === 'pending' ? 'bg-orange-700' :
                                'bg-red-600'
                              }`}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-orange-100/40 text-center py-4">No bookings found</p>
                    )}
                  </div>
                </div>

                {/* Status by Booking */}
                {userDetails.statistics.byStatus.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-orange-500 mb-4">Booking Status Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {userDetails.statistics.byStatus.map((stat) => (
                        <div key={stat._id} className="bg-black/40 p-4 rounded-lg text-center">
                          <div className="text-xl font-bold text-orange-500">{stat.count}</div>
                          <div className="text-sm text-orange-100/40 capitalize">{stat._id}</div>
                          <div className="text-xs text-orange-100/40">
                            {formatCurrency(stat.totalAmount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-orange-500/30">
                  {!userDetails.banned ? (
                    <Button
                      onClick={() => {
                        banUser(userDetails.id, true);
                        setIsDetailsOpen(false);
                      }}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Ban User
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        banUser(userDetails.id, false);
                        setIsDetailsOpen(false);
                      }}
                      className="bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-black font-bold"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Unban User
                    </Button>
                  )}

                  <Button
                    onClick={() => setIsDetailsOpen(false)}
                    variant="outline"
                    className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}