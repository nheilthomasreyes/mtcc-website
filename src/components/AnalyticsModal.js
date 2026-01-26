import { X } from 'lucide-react';
import { Dashboard } from "./Dashboard";
import { ComparisonDashboard } from "./ComparisonDashboard";
import { useState, useMemo } from 'react';

export function AnalyticsModal({ isOpen, onClose, clients, customYears }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('overview');

  // Get unique years from clients and combine with custom years
  const availableYears = useMemo(() => {
    const years = new Set(customYears);
    clients.forEach(client => {
      const year = new Date(client.dateRequested).getFullYear();
      if (!isNaN(year)) {
        years.add(year);
      }
    });
    const yearArray = Array.from(years).sort((a, b) => b - a);
    return yearArray.length > 0 ? yearArray : [new Date().getFullYear()];
  }, [clients, customYears]);

  // Filter clients by selected year
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const year = new Date(client.dateRequested).getFullYear();
      return year === selectedYear;
    });
  }, [clients, selectedYear]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <div className="flex items-center gap-4 flex-1">
            <div>
              <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
              <p className="text-blue-200 text-sm mt-1">Comprehensive service analytics and insights</p>
            </div>
            <div className="flex items-center gap-3 ml-auto mr-4">
              <label htmlFor="analytics-year-filter" className="text-white font-semibold">Year:</label>
              <select
                id="analytics-year-filter"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 hover:bg-white/20 transition-all"
              >
                {availableYears.map(year => (
                  <option key={year} value={year} className="bg-slate-800">{year}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="sticky top-[88px] z-10 flex gap-2 p-4 border-b border-white/10 bg-slate-900/90 backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'comparison'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            Year Comparison
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' ? (
            <Dashboard clients={filteredClients} />
          ) : (
            <ComparisonDashboard clients={clients} selectedYear={selectedYear} customYears={customYears} />
          )}
        </div>
      </div>
    </div>
  );
}
