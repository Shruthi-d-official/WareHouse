import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface TeamLeader {
  team_leader_id: number;
  user_id: string;
  is_approved: boolean;
  created_at: string;
}

const VendorDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateTeamLeader, setShowCreateTeamLeader] = useState(false);
  const [newTeamLeader, setNewTeamLeader] = useState({ userId: '', password: '' });
  const [hasApprovedTeamLeader, setHasApprovedTeamLeader] = useState(false);

  useEffect(() => {
    fetchTeamLeaders();
  }, []);

  const fetchTeamLeaders = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/vendor/team-leaders');
      setTeamLeaders(response.data);
      setHasApprovedTeamLeader(response.data.some((tl: TeamLeader) => tl.is_approved));
    } catch (error) {
      console.error('Error fetching team leaders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeamLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/vendor/team-leaders', newTeamLeader);
      setNewTeamLeader({ userId: '', password: '' });
      setShowCreateTeamLeader(false);
      fetchTeamLeaders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error creating team leader');
    }
  };

  const handleApproveTeamLeader = async (teamLeaderId: number) => {
    try {
      await axios.post('http://localhost:5000/api/vendor/approve-team-leader', {
        teamLeaderId
      });
      fetchTeamLeaders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error approving team leader');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Vendor Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Team Leaders</h2>
            <button
              onClick={() => setShowCreateTeamLeader(true)}
              className="btn-primary"
            >
              Create Team Leader
            </button>
          </div>

          {hasApprovedTeamLeader && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    You have already approved a team leader. You can only approve one team leader per vendor account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showCreateTeamLeader && (
            <div className="card mb-6">
              <div className="card-header">
                <h3 className="text-lg font-medium">Create New Team Leader</h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleCreateTeamLeader} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User ID</label>
                    <input
                      type="text"
                      value={newTeamLeader.userId}
                      onChange={(e) => setNewTeamLeader({ ...newTeamLeader, userId: e.target.value })}
                      className="form-input mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      value={newTeamLeader.password}
                      onChange={(e) => setNewTeamLeader({ ...newTeamLeader, password: e.target.value })}
                      className="form-input mt-1"
                      required
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button type="submit" className="btn-primary">Create</button>
                    <button
                      type="button"
                      onClick={() => setShowCreateTeamLeader(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="bg-gray-50">
                  <tr>
                    <th>User ID</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamLeaders.map((tl) => (
                    <tr key={tl.team_leader_id}>
                      <td className="font-medium">{tl.user_id}</td>
                      <td>
                        {tl.is_approved ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td>{new Date(tl.created_at).toLocaleDateString()}</td>
                      <td>
                        {!tl.is_approved && !hasApprovedTeamLeader && (
                          <button
                            onClick={() => handleApproveTeamLeader(tl.team_leader_id)}
                            className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {teamLeaders.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team leaders</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new team leader.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;