import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface Bin {
  bin_id: number;
  bin_name: string;
}

interface CountingSession {
  whName: string;
  startTime: Date | null;
  entries: CountingEntry[];
}

interface CountingEntry {
  binId: number;
  binName: string;
  qtyCounted: number;
}

const WorkerDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [bins, setBins] = useState<Bin[]>([]);
  const [session, setSession] = useState<CountingSession>({
    whName: '',
    startTime: null,
    entries: []
  });
  const [currentEntry, setCurrentEntry] = useState({
    binId: '',
    qtyCounted: ''
  });
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBins();
  }, []);

  const fetchBins = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/counting/bins');
      setBins(response.data);
    } catch (error) {
      console.error('Error fetching bins:', error);
    }
  };

  const filteredBins = bins.filter(bin =>
    bin.bin_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartCounting = async () => {
    if (!session.whName) {
      alert('Please enter warehouse name');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/counting/start', {
        whName: session.whName
      });
      
      setSession(prev => ({
        ...prev,
        startTime: new Date()
      }));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error starting counting session');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = () => {
    if (!currentEntry.binId || !currentEntry.qtyCounted) {
      alert('Please select a bin and enter quantity');
      return;
    }

    const selectedBin = bins.find(bin => bin.bin_id === parseInt(currentEntry.binId));
    if (!selectedBin) return;

    const newEntry: CountingEntry = {
      binId: parseInt(currentEntry.binId),
      binName: selectedBin.bin_name,
      qtyCounted: parseInt(currentEntry.qtyCounted)
    };

    setSession(prev => ({
      ...prev,
      entries: [...prev.entries, newEntry]
    }));

    setCurrentEntry({ binId: '', qtyCounted: '' });
    setShowConfirmDialog(false);
  };

  const handleConfirmEntry = async () => {
    if (!currentEntry.binId || !currentEntry.qtyCounted) {
      alert('Please select a bin and enter quantity');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/counting/entry', {
        whName: session.whName,
        binId: parseInt(currentEntry.binId),
        qtyCounted: parseInt(currentEntry.qtyCounted)
      });

      handleAddEntry();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error adding counting entry');
    } finally {
      setLoading(false);
    }
  };

  const handleEndCounting = async () => {
    if (!session.startTime) {
      alert('No active counting session');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/counting/end', {
        whName: session.whName,
        startTime: session.startTime.toISOString()
      });

      alert(`Counting session completed!\n${JSON.stringify(response.data.summary, null, 2)}`);
      
      // Reset session
      setSession({
        whName: '',
        startTime: null,
        entries: []
      });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error ending counting session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Worker Dashboard</h1>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Counting Controls */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium text-gray-900">Counting Session</h2>
              </div>
              <div className="card-body space-y-4">
                {!session.startTime ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warehouse Name
                    </label>
                    <input
                      type="text"
                      value={session.whName}
                      onChange={(e) => setSession(prev => ({ ...prev, whName: e.target.value }))}
                      className="form-input w-full"
                      placeholder="Enter warehouse name"
                    />
                    <button
                      onClick={handleStartCounting}
                      disabled={loading || !session.whName}
                      className="btn-primary w-full mt-4"
                    >
                      {loading ? 'Starting...' : 'Start Counting'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-green-700">
                            <strong>Active Session:</strong> {session.whName}
                          </p>
                          <p className="text-sm text-green-700">
                            <strong>Started:</strong> {session.startTime.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Search Bins
                        </label>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="form-input w-full"
                          placeholder="Search bin names..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Bin
                        </label>
                        <select
                          value={currentEntry.binId}
                          onChange={(e) => setCurrentEntry(prev => ({ ...prev, binId: e.target.value }))}
                          className="form-select w-full"
                        >
                          <option value="">Select a bin</option>
                          {filteredBins.map(bin => (
                            <option key={bin.bin_id} value={bin.bin_id}>
                              {bin.bin_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity Counted
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={currentEntry.qtyCounted}
                          onChange={(e) => setCurrentEntry(prev => ({ ...prev, qtyCounted: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter quantity"
                        />
                      </div>

                      <button
                        onClick={() => setShowConfirmDialog(true)}
                        disabled={loading || !currentEntry.binId || !currentEntry.qtyCounted}
                        className="btn-primary w-full"
                      >
                        Add Entry
                      </button>

                      <button
                        onClick={handleEndCounting}
                        disabled={loading || session.entries.length === 0}
                        className="btn-danger w-full"
                      >
                        {loading ? 'Ending...' : 'End Counting Session'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Session Entries */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium text-gray-900">
                  Current Session Entries ({session.entries.length})
                </h2>
              </div>
              <div className="card-body">
                {session.entries.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {session.entries.map((entry, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="font-medium text-gray-900">{entry.binName}</p>
                          <p className="text-sm text-gray-500">Quantity: {entry.qtyCounted}</p>
                        </div>
                        <span className="text-sm text-gray-400">#{index + 1}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M9 5H7a2 2 0 00-2 2v1a2 2 0 002 2h2m0 0h10m-2 0v10m-5-5l5 5m0 0l5-5m-5 5V9m0 0a2 2 0 012-2h2a2 2 0 012 2v1a2 2 0 01-2 2H9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No entries yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Start counting to see entries here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Confirm Entry</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to add this counting entry?
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <p><strong>Bin:</strong> {bins.find(b => b.bin_id === parseInt(currentEntry.binId))?.bin_name}</p>
                  <p><strong>Quantity:</strong> {currentEntry.qtyCounted}</p>
                </div>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={handleConfirmEntry}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Adding...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;