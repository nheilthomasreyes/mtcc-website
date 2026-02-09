import { Edit, Trash2, CheckCircle, Clock, AlertCircle, FileCheck, FileQuestion, FileX, Filter, X as XIcon, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { TEST_TYPE_LABELS } from "./types";
import { format } from 'date-fns';
import { useState, useMemo } from 'react';

export function ServiceTable({ clients, onEdit, onDelete, onComplete }) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedClientType, setSelectedClientType] = useState('All Category');
  const [selectedTestType, setSelectedTestType] = useState('All Test');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Dynamic list of Client Types (Categories)
  const availableCategories = useMemo(() => {
    const cats = new Set(clients.map(c => c.category).filter(Boolean));
    return ['All Category', ...Array.from(cats).sort()];
  }, [clients]);

  const availableTestTypes = ['All Test', 'FTIR', 'CT', 'CTT', 'MO', 'HT', 'FT', 'TS', 'BT', 'RE', 'UC', 'FD', 'NTA', 'O'];

  // Helper function to parse testTypes from database (string) to array
  const parseTestTypes = (testTypes) => {
    if (!testTypes) return [];
    if (Array.isArray(testTypes)) return testTypes;
    if (typeof testTypes === 'string') {
      // Split by comma and trim whitespace
      return testTypes.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  };

  // Filter clients based on status, client type, and test type
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      const matchesClientType = selectedClientType === 'All Category' || client.category === selectedClientType;
      
      // Parse testTypes properly before checking
      const clientTestTypes = parseTestTypes(client.testTypes);
      const matchesTestType = selectedTestType === 'All Test' || clientTestTypes.includes(selectedTestType);
      
      return matchesStatus && matchesClientType && matchesTestType;
    });
  }, [clients, statusFilter, selectedClientType, selectedTestType]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedClientType, selectedTestType]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'Ongoing':
        return <Clock className="w-5 h-5 text-blue-400" />;
      case 'Completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'Cancelled':
        return <XIcon className="w-5 h-5 text-red-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300';
      case 'Ongoing':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300';
      case 'Completed':
        return 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300';
      case 'Cancelled':
        return 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-300';
    }
  };

  const getRequestFormIcon = (status) => {
    switch (status) {
      case 'Signed':
        return <FileCheck className="w-4 h-4 text-green-400" />;
      case 'Waiting':
        return <FileQuestion className="w-4 h-4 text-amber-400" />;
      case 'N/A':
        return <FileX className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRequestFormColor = (status) => {
    switch (status) {
      case 'Signed':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'Waiting':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'N/A':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getServiceRequestName = (client, allClients) => {
    if (!client.dateRequested || (!client.roa && !client.ts)) return '-';

    const date = new Date(client.dateRequested);
    const year = date.getFullYear();
    const monthYear = format(date, 'MM/yyyy');
    const type = client.roa ? 'ROA' : 'TS';

    // 1. Filter: Get all entries from the same YEAR with the same SERVICE TYPE
    const yearlyGroup = allClients
      .filter(c => {
        if (!c.dateRequested) return false;
        const cDate = new Date(c.dateRequested);
        const cType = c.roa ? 'ROA' : 'TS';
        return cDate.getFullYear() === year && cType === type;
      })
      // 2. Sort by date so the order is consistent (Oldest to Newest)
      .sort((a, b) => new Date(a.dateRequested) - new Date(b.dateRequested));

    // 3. Find where THIS client sits in that specific yearly group
    const index = yearlyGroup.findIndex(c => c.id === client.id);
    const sequenceNumber = index !== -1 ? index + 1 : 1;

    return `${monthYear}-Material-Testing-Service-Request-Form_${type}#${sequenceNumber}`;
  };

  return (
    <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Service Records</h2>
          <p className="text-blue-200 text-sm mt-1">Manage all client services and requests</p>
        </div>
        
        {/* Status Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-300" />
            <span className="text-sm font-medium text-cyan-300">Filter by Status:</span>
          </div>
          <button
            onClick={() => setStatusFilter('All')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === 'All'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50 border border-cyan-500'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            All ({clients.length})
          </button>
          <button
            onClick={() => setStatusFilter('Ongoing')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === 'Ongoing'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50 border border-blue-500'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            Ongoing ({clients.filter(c => c.status === 'Ongoing').length})
          </button>
          <button
            onClick={() => setStatusFilter('Pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === 'Pending'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/50 border border-amber-500'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            Pending ({clients.filter(c => c.status === 'Pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('Completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === 'Completed'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50 border border-green-500'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            Completed ({clients.filter(c => c.status === 'Completed').length})
          </button>
          <button
            onClick={() => setStatusFilter('Cancelled')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === 'Cancelled'
                ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/50 border border-red-500'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            Cancelled ({clients.filter(c => c.status === 'Cancelled').length})
          </button>

          {/* Client Type and Test Type Dropdowns */}
          <select
            value={selectedClientType}
            onChange={(e) => setSelectedClientType(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {availableCategories.map(cat => (
              <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
            ))}
          </select>

          <select
            value={selectedTestType}
            onChange={(e) => setSelectedTestType(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {availableTestTypes.map(type => (
              <option key={type} value={type} className="bg-gray-900">{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container with frozen columns */}
      <div className="relative">
        {/* Wrapper for horizontal scroll */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Frozen Header */}
            <thead className="sticky top-0 z-20 bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg">
              <tr>
                {/* Frozen Columns Headers */}
                <th className="sticky left-0 z-30 px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/10 border-r border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  Service No.
                </th>
                <th className="sticky left-[99px] z-30 px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/10 border-r border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                  Client Name
                </th>
                
                {/* Scrollable Columns Headers */}
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Category</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Service Request Form</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Request Date</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Signed Request Form</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Official Receipt</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Date of Test</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Report of Analysis</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Released of ROA</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Sample No.</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Specimen No.</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Types of Test</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Amount</th>
                <th className="px-5 py-4 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Sample Count</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Status</th>
                <th className="px-5 py-4 text-right text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedClients.map((client, index) => {
                // Parse testTypes for this client
                const clientTestTypes = parseTestTypes(client.testTypes);
                
                return (
                  <tr key={client.id ?? index} className={`hover:bg-white/5 transition-colors ${client.doNotDelete ? 'bg-red-500/5' : ''}`}>
                    {/* Frozen Service No. Column */}
                    <td className="sticky left-0 z-10 px-5 py-5 bg-slate-900 border-r border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-200 border border-cyan-500/50">{client.serviceNo}</span>
                        {client.doNotDelete && (
                          <ShieldAlert className="w-4 h-4 text-red-400" title="DO NOT DELETE - Protected Record" />
                        )}
                      </div>
                    </td>
                    
                    {/* Frozen Client Name Column */}
                    <td className="sticky left-[99px] z-10 px-5 py-5 bg-slate-900 border-r border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      <div className="space-y-1 min-w-[220px]">
                        <p className="text-white font-semibold">{client.name}</p>
                        <p className="text-gray-400 text-sm">{client.address}</p>
                      </div>
                    </td>
                    
                    {/* Scrollable Columns */}
                    <td className="px-5 py-5">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">{client.category}</span>
                    </td>
                    <td className="px-5 py-5">
                      <p className="inline-flex items-center px-3 py-1 rounded-lg text-md font-medium bg-blue-500/20 text-gray-300 border border-gray-500/30 whitespace-nowrap">{getServiceRequestName(client, clients)}</p>
                    </td>
                    <td className="px-5 py-5">
                      <p className="text-sm text-gray-300 whitespace-nowrap">{client.dateRequested ? format(new Date(client.dateRequested), 'MMM dd, yyyy') : '-'}</p>
                    </td>
                    <td className="px-5 py-5">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border ${getRequestFormColor(client.requestForm)} whitespace-nowrap`}>
                        {getRequestFormIcon(client.requestForm)}
                        {client.requestForm}
                      </div>
                    </td>
                    
                    {/* FIXED: Check for boolean or number (0/1) */}
                    <td className="px-5 py-5 text-center">
                      <div className="flex justify-center">
                        {client.officialReceipt === true || client.officialReceipt === 1 ? (
                          /* Green Checkmark for True */
                          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-green-500/20 text-green-400 border border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline></svg>
                          </span>
                        ) : (
                          /* Red X for False */
                          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <p className="text-sm text-gray-300 whitespace-nowrap">{client.testDate ? format(new Date(client.testDate), 'MMM dd, yyyy') : '-'}</p>
                    </td>
                    
                    {/* FIXED: Check for boolean or number (0/1) */}
                    <td className="px-5 py-5 text-center">
                      <div className="flex justify-center">
                        {client.roa === true || client.roa === 1 ? (
                          /* Green Checkmark for True */
                          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-green-500/20 text-green-400 border border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline></svg>
                          </span>
                        ) : (
                          /* Red X for False */
                          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line> </svg>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <p className="text-sm text-gray-300 whitespace-nowrap">{client.releasedROA ? format(new Date(client.releasedROA), 'MMM dd, yyyy') : '-'}</p>
                    </td>
                    <td className="px-5 py-5">
                      <p className="text-sm text-gray-300 whitespace-nowrap">{client.sampleNo || '-'}</p>
                    </td>
                    <td className="px-5 py-5">
                      <p className="text-sm text-gray-300 whitespace-nowrap"> {client.specimenNo || '-'}</p>
                    </td>
                    
                    {/* FIXED: Use parsed testTypes array */}
                    <td className="px-5 py-5">
                      <div className="flex flex-wrap gap-2 max-w-xs">
                        {clientTestTypes.length > 0 ? clientTestTypes.map((type, idx) => (
                          <span
                            key={`${type}-${idx}`}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/30"
                            title={TEST_TYPE_LABELS[type]}>{type}</span>
                        )) : <span className="text-sm text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <p className="text-lg font-bold text-amber-300 whitespace-nowrap">₱{client.amount?.toLocaleString() || '0'}</p>
                    </td>
                    <td className="px-5 py-5">
                      <p className="text-sm text-gray-300 text-center whitespace-nowrap">{client.sampleCount || '-'}</p>
                    </td>
                    <td className="px-5 py-5">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium bg-gradient-to-r border ${getStatusColor(client.status)} whitespace-nowrap`}>
                        {getStatusIcon(client.status)}
                        {client.status}
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(client)}
                          className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 hover:scale-110"
                          title="Edit"><Edit className="w-4 h-4" />
                        </button>
                        {client.status !== 'Completed' && (
                          <button
                            onClick={() => onComplete(client.id)}
                            className="p-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 transition-all duration-200 hover:scale-110"
                            title="Mark as Completed"><CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(client.id)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all duration-200 hover:scale-110"
                          title="Delete"><Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No clients found matching the selected filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredClients.length > 0 && (
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredClients.length)} of {filteredClients.length} entries
          </div>
          
          <div className="flex items-center gap-3">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition-all ${
                currentPage === 1
                  ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                  : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Page Indicator */}
            <div className="text-sm text-gray-300 font-medium">
              Page {currentPage} of {totalPages}
            </div>

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg transition-all ${
                currentPage === totalPages
                  ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                  : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}