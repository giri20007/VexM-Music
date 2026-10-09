import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Lock,
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { adminGetUsers, adminUpdateUser, adminRevokeUser } from '../../utils/adminApi';
import { formatDate } from '../../utils/formatters';

export function AdminUsers() {
  const showToast = useAdminStore(s => s.showToast);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminGetUsers();
      setUsers(res.users || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async user => {
    if (user.username === 'Spidey') {
      showToast('Cannot modify owner account status', 'error');
      return;
    }
    const newStatus = user.status === 'disabled' ? 'active' : 'disabled';
    try {
      await adminUpdateUser(user.id, { status: newStatus });
      showToast(`User ${user.username} status set to ${newStatus}`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update user', 'error');
    }
  };

  const handleRevokeSession = async user => {
    try {
      await adminRevokeUser(user.id);
      showToast(`Session revoked for ${user.username}`, 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to revoke session', 'error');
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.telegramId && String(u.telegramId).includes(searchTerm))
  );

  return (
    <div className="space-y-6 animate-fade-in text-warm-white select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-bg-card border border-white/5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-accent font-extrabold text-sm uppercase tracking-wider">
            <Users className="w-5 h-5" />
            <span>User Management & Access Control</span>
          </div>
          <p className="text-xs text-warm-muted leading-relaxed">
            Monitor active listeners, Telegram verified users, manage account permissions, and revoke sessions.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-warm-white transition flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search users by username, Telegram ID, or name..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-bg-secondary border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-bg-card border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary/80 border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-warm-muted">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-4 py-3.5">Telegram ID</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-warm-muted">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isOwner = u.role === 'OWNER' || String(u.telegramId) === '5216415651' || u.username === 'Spidey';
                  const isActive = u.status !== 'disabled';

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center font-bold text-accent">
                            {u.displayName ? u.displayName[0]?.toUpperCase() : u.username[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-warm-white flex items-center gap-1.5">
                              <span>{u.displayName || u.username}</span>
                              {isOwner && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-extrabold tracking-wider border border-amber-500/30">
                                  OWNER
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-warm-muted">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-warm-muted font-mono">
                        {u.telegramId ? `#${u.telegramId}` : '—'}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isOwner
                              ? 'bg-amber-500/15 text-amber-300'
                              : u.role === 'ADMIN'
                              ? 'bg-accent/15 text-accent'
                              : 'bg-white/5 text-warm-muted'
                          }`}
                        >
                          {u.role || 'USER'}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-warm-muted">
                        {u.createdAt ? formatDate(u.createdAt) : '—'}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-300 border border-red-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          />
                          {isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {!isOwner && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                                isActive
                                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                  : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                              title={isActive ? 'Disable Account' : 'Enable Account'}
                            >
                              {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleRevokeSession(u)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-warm-muted hover:text-white transition"
                              title="Revoke Sessions"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
