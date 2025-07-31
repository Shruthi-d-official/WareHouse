import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface Worker {
  worker_id: number;
  user_id: string;
  email: string;
  is_approved: boolean;
  created_at: string;
}

interface PendingOTP {
  otp_id: number;
  worker_id: number;
  otp_code: string;
  worker_user_id: string;
  email: string;
  created_at: string;
}

const TeamLeaderDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('workers');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [pendingOTPs, setPendingOTPs] = useState<PendingOTP[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateWorker, setShowCreateWorker] = useState(false);
  const [newWorker, setNewWorker] = useState({ userId: '', password: '', email: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'workers') {
        const response = await axios.get('http://localhost:5000/api/team-leader/workers');
        setWorkers(response.data);
      } else if (activeTab === 'otps') {
        const response = await axios.get('http://localhost:5000/api/team-leader/pending-otps');
        setPendingOTPs(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/team-leader/workers', newWorker);
      setNewWorker({ userId: '', password: '', email: '' });
      setShowCreateWorker(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error creating worker');
    }
  };

  const handleApproveWorker = async (workerId: number) => {
    try {
      await axios.post('http://localhost:5000/api/team-leader/approve-otp', {
        workerId
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error approving worker');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Team Leader Dashboard</h1>
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
              {['workers', 'otps'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm capitalize`}
                >
                  {tab === 'otps' ? 'Pending OTPs' : 'Workers'}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === 'workers' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Workers</h2>
                  <button
                    onClick={() => setShowCreateWorker(true)}
                    className="btn-primary"
                  >
                    Create Worker
                  </button>
                </div>

                {showCreateWorker && (
                  <div className="card mb-6">
                    <div className="card-header">
                      <h3 className="text-lg font-medium">Create New Worker</h3>
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleCreateWorker} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">User ID</label>
                          <input
                            type="text"
                            value={newWorker.userId}
                            onChange={(e) => setNewWorker({ ...newWorker, userId: e.target.value })}
                            className="form-input mt-1"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={newWorker.email}
                            onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                            className="form-input mt-1"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Password</label>
                          <input
                            type="password"
                            value={newWorker.password}
                            onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })}
                            className="form-input mt-1"
                            required
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button type="submit" className="btn-primary">Create</button>
                          <button
                            type="button"
                            onClick={() => setShowCreateWorker(false)}
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
                          <th>Email</th>
                          <th>Status</th>
                          <th>Created At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workers.map((worker) => (
                          <tr key={worker.worker_id}>
                            <td className="font-medium">{worker.user_id}</td>
                            <td>{worker.email}</td>
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
                            <td>
                              {!worker.is_approved && (
                                <button
                                  onClick={() => handleApproveWorker(worker.worker_id)}
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
              </div>
            )}

            {activeTab === 'otps' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-6">Pending OTP Approvals</h2>
                
                {pendingOTPs.length > 0 ? (
                  <div className="card">
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead className="bg-gray-50">
                          <tr>
                            <th>Worker</th>
                            <th>Email</th>
                            <th>OTP Code</th>
                            <th>Requested At</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {pendingOTPs.map((otp) => (
                            <tr key={otp.otp_id}>
                              <td className="font-medium">{otp.worker_user_id}</td>
                              <td>{otp.email}</td>
                              <td>
                                <span className="font-mono text-lg bg-gray-100 px-2 py-1 rounded">
                                  {otp.otp_code}
                                </span>
                              </td>
                              <td>{new Date(otp.created_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m-16-4c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No pending OTPs</h3>
                    <p className="mt-1 text-sm text-gray-500">All OTP requests have been processed.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamLeaderDashboard;