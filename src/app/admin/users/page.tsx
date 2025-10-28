'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminCardTitle } from '@/components/ui/admin-card';
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

      if (response.ok) {
        await fetchUsers(currentPage);
        const data = await response.json();
        alert(data.message || 'User role updated successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      alert('Failed to update user role');
    }
  };

  const banUser = async (userId: string, ban = true) => {
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
  }, [isLoaded, user, searchTerm, roleFilter, sortBy, sortOrder]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (currentPage === 1) {
        fetchUsers(1);
      } else {
        setCurrentPage(1);
      }
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
        <div className="flex items-center gap-2 text-white">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          Loading users...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Users Management</h1>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/20 text-white">
            {totalCount} Total Users
          </Badge>
          <Button
            onClick={() => exportUsers('csv')}
            disabled={exporting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <AdminCard className="bg-white/10 border-white/20 backdrop-blur-sm">
        <AdminCardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-white/70 text-sm">Search</Label>
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <Label className="text-white/70 text-sm">Role Filter</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-white/20 border-white/30 text-white">
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
              <Label className="text-white/70 text-sm">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white/20 border-white/30 text-white">
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
              <Label className="text-white/70 text-sm">Order</Label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="bg-white/20 border-white/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <AdminCard className="bg-blue-600/20 border-blue-400/30 backdrop-blur-sm">
          <AdminCardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">
                {selectedUsers.length} user(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="bg-white/20 border-white/30 text-white w-48">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Apply
                </Button>
                <Button
                  onClick={() => setSelectedUsers([])}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Clear
                </Button>
              </div>
            </div>
          </AdminCardContent>
        </AdminCard>
      )}

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: totalCount, icon: Users },
          { label: 'Admins', value: users.filter(u => u.publicMetadata.role === 'admin').length, icon: Crown },
          { label: 'Managers', value: users.filter(u => u.publicMetadata.role === 'manager').length, icon: Shield },
          { label: 'Validators', value: users.filter(u => u.publicMetadata.role === 'validator').length, icon: CheckCircle },
          { label: 'Regular Users', value: users.filter(u => !u.publicMetadata.role).length, icon: User }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <AdminCard key={stat.label} className="bg-white/10 border-white/20 backdrop-blur-sm">
              <AdminCardContent className="p-4 flex items-center gap-3">
                <Icon className="w-8 h-8 text-white/70" />
                <div>
                  <p className="text-white/70 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </AdminCardContent>
            </AdminCard>
          );
        })}
      </div>

      {/* Users List */}
      <AdminCard className="bg-white/10 border-white/20 backdrop-blur-sm">
        <AdminCardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <AdminCardTitle className="text-white">Users List</AdminCardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleAllUsers}
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10"
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
        </AdminCardHeader>
        <AdminCardContent className="p-4 pt-0">
          <div className="space-y-4">
            {filteredUsers.map((userData) => {
              const RoleIcon = getRoleIcon(userData.publicMetadata.role);
              const isSelected = selectedUsers.includes(userData.id);

              return (
                <div
                  key={userData.id}
                  className={`p-4 rounded-lg border transition-all ${isSelected
                    ? 'bg-blue-600/20 border-blue-400/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => toggleUserSelection(userData.id)}
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto text-white hover:bg-transparent"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-400" />
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
                        <h3 className="text-white font-semibold">
                          {userData.firstName} {userData.lastName}
                        </h3>
                        <p className="text-white/70 text-sm">{userData.emailAddress}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-white/50" />
                          <span className="text-white/50 text-xs">
                            Joined {new Date(userData.createdAt).toLocaleDateString()}
                          </span>
                          {userData.lastSignInAt && (
                            <>
                              <span className="text-white/50 text-xs">•</span>
                              <span className="text-white/50 text-xs">
                                Last active {new Date(userData.lastSignInAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Booking Stats */}
                        {userData.bookingStats && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
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

                      <div className="flex gap-2">
                        <Button
                          onClick={() => fetchUserDetails(userData.id)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
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
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <UserPlus className="w-3 h-3 mr-1" />
                                  Make Staff
                                </Button>
                                <Button
                                  onClick={() => promoteUser(userData.id, 'validator')}
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700 text-white"
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
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Shield className="w-3 h-3 mr-1" />
                                Make Manager
                              </Button>
                            )}
                            {userData.publicMetadata.role === 'manager' && (
                              <Button
                                onClick={() => promoteUser(userData.id, 'validator')}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Make Validator
                              </Button>
                            )}
                            {(userData.publicMetadata.role === 'manager' || userData.publicMetadata.role === 'staff' || userData.publicMetadata.role === 'validator') && (
                              <Button
                                onClick={() => promoteUser(userData.id, '')}
                                size="sm"
                                className="bg-gray-600 hover:bg-gray-700 text-white"
                              >
                                Remove Role
                              </Button>
                            )}

                            <Button
                              onClick={() => banUser(userData.id, true)}
                              size="sm"
                              variant="destructive"
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Ban
                            </Button>
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
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
              <div className="text-sm text-white/70">
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
                  className="border-white/30 text-white hover:bg-white/10"
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
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </AdminCardContent>
      </AdminCard>

      {filteredUsers.length === 0 && !loading && (
        <AdminCard className="bg-white/10 border-white/20 backdrop-blur-sm">
          <AdminCardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-white/50 mx-auto mb-4" />
            <p className="text-white/70">No users found matching your criteria.</p>
          </AdminCardContent>
        </AdminCard>
      )}

      {/* User Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              User Details: {userDetails?.firstName} {userDetails?.lastName}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
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
                      <h3 className="text-xl font-semibold text-white">
                        {userDetails.firstName} {userDetails.lastName}
                      </h3>
                      <p className="text-gray-400">{userDetails.emailAddress}</p>
                      <Badge className={`${getRoleColor(userDetails.publicMetadata.role)} text-white mt-2`}>
                        {userDetails.publicMetadata.role || 'User'}
                      </Badge>
                      {userDetails.banned && (
                        <Badge className="bg-red-600 text-white ml-2 mt-2">
                          Banned
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Joined:</span>
                      <p className="text-white">{new Date(userDetails.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Last Sign In:</span>
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
                  <h4 className="text-lg font-semibold text-white">Statistics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {userDetails.statistics.total.totalBookings}
                      </div>
                      <div className="text-sm text-gray-400">Total Bookings</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {formatCurrency(userDetails.statistics.total.totalSpent)}
                      </div>
                      <div className="text-sm text-gray-400">Total Spent</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {formatCurrency(userDetails.statistics.total.avgBookingValue)}
                      </div>
                      <div className="text-sm text-gray-400">Avg. Booking</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {userDetails.statistics.total.lastBooking
                          ? new Date(userDetails.statistics.total.lastBooking).toLocaleDateString()
                          : 'None'
                        }
                      </div>
                      <div className="text-sm text-gray-400">Last Booking</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking History */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Recent Booking History</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userDetails.bookings.length > 0 ? (
                    userDetails.bookings.map((booking) => (
                      <div key={booking.id} className="bg-white/5 p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">{booking.eventTitle}</div>
                          <div className="text-sm text-gray-400">
                            {new Date(booking.createdAt).toLocaleDateString()} •
                            {booking.quantity} ticket(s) •
                            {booking.paymentMethod}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">
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
                    <p className="text-gray-400 text-center py-4">No bookings found</p>
                  )}
                </div>
              </div>

              {/* Status by Booking */}
              {userDetails.statistics.byStatus.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Booking Status Breakdown</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {userDetails.statistics.byStatus.map((stat) => (
                      <div key={stat._id} className="bg-white/5 p-4 rounded-lg text-center">
                        <div className="text-xl font-bold text-white">{stat.count}</div>
                        <div className="text-sm text-gray-400 capitalize">{stat._id}</div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(stat.totalAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-700">
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
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Unban User
                  </Button>
                )}

                <Button
                  onClick={() => setIsDetailsOpen(false)}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-800"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}