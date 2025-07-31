import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface Vendor {
  vendor_id: number;
  user_id: string;
  approved_team_leader_id: number | null;
  created_at: string;
}

interface TeamLeader {
  team_leader_id: number;
  user_id: string;
  is_approved: boolean;
  vendor_user_id: string;
  created_at: string;
}

interface Worker {
  worker_id: number;
  user_id: string;
  email: string;
  is_approved: boolean;
  team_leader_user_id: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({ userId: '', password: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'vendors':
          const vendorsResponse = await axios.get('http://localhost:5000/api/admin/vendors');
          setVendors(vendorsResponse.data);
          break;
        case 'team-leaders':
          const teamLeadersResponse = await axios.get('http://localhost:5000/api/admin/team-leaders');
          setTeamLeaders(teamLeadersResponse.data);
          break;
        case 'workers':
          const workersResponse = await axios.get('http://localhost:5000/api/admin/workers');
          setWorkers(workersResponse.data);
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/admin/vendors', newVendor);
      setNewVendor({ userId: '', password: '' });
      setShowCreateVendor(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error creating vendor');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
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
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['vendors', 'team-leaders', 'workers', 'reports'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm capitalize`}
                >
                  {tab.replace('-', ' ')}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === 'vendors' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Vendors</h2>
                  <button
                    onClick={() => setShowCreateVendor(true)}
                    className="btn-primary"
                  >
                    Create Vendor
                  </button>
                </div>

                {showCreateVendor && (
                  <div className="card mb-6">
                    <div className="card-header">
                      <h3 className="text-lg font-medium">Create New Vendor</h3>
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleCreateVendor} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">User ID</label>
                          <input
                            type="text"
                            value={newVendor.userId}
                            onChange={(e) => setNewVendor({ ...newVendor, userId: e.target.value })}
                            className="form-input mt-1"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Password</label>
                          <input
                            type="password"
                            value={newVendor.password}
                            onChange={(e) => setNewVendor({ ...newVendor, password: e.target.value })}
                            className="form-input mt-1"
                            required
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button type="submit" className="btn-primary">Create</button>
                          <button
                            type="button"
                            onClick={() => setShowCreateVendor(false)}
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
                          <th>Approved Team Leader</th>
                          <th>Created At</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vendors.map((vendor) => (
                          <tr key={vendor.vendor_id}>
                            <td className="font-medium">{vendor.user_id}</td>
                            <td>
                              {vendor.approved_team_leader_id ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td>{new Date(vendor.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team-leaders' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Team Leaders</h2>
                <div className="card">
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead className="bg-gray-50">
                        <tr>
                          <th>User ID</th>
                          <th>Vendor</th>
                          <th>Status</th>
                          <th>Created At</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teamLeaders.map((tl) => (
                          <tr key={tl.team_leader_id}>
                            <td className="font-medium">{tl.user_id}</td>
                            <td>{tl.vendor_user_id}</td>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'workers' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Workers</h2>
                <div className="card">
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead className="bg-gray-50">
                        <tr>
                          <th>User ID</th>
                          <th>Email</th>
                          <th>Team Leader</th>
                          <th>Status</th>
                          <th>Created At</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workers.map((worker) => (
                          <tr key={worker.worker_id}>
                            <td className="font-medium">{worker.user_id}</td>
                            <td>{worker.email}</td>
                            <td>{worker.team_leader_user_id}</td>
                            <td>
                              {worker.is_approved ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td>{new Date(worker.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Reports & Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card">
                    <div className="card-body">
                      <h3 className="text-lg font-medium text-gray-900">Total Vendors</h3>
                      <p className="text-3xl font-bold text-primary-600">{vendors.length}</p>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body">
                      <h3 className="text-lg font-medium text-gray-900">Total Team Leaders</h3>
                      <p className="text-3xl font-bold text-primary-600">{teamLeaders.length}</p>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body">
                      <h3 className="text-lg font-medium text-gray-900">Total Workers</h3>
                      <p className="text-3xl font-bold text-primary-600">{workers.length}</p>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body">
                      <h3 className="text-lg font-medium text-gray-900">Active Users</h3>
                      <p className="text-3xl font-bold text-primary-600">
                        {vendors.length + teamLeaders.filter(tl => tl.is_approved).length + workers.filter(w => w.is_approved).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;