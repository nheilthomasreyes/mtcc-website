import { Download, Edit, Trash2, CheckCircle, Clock, AlertCircle, FileCheck, FileQuestion, FileX, Filter, X as XIcon, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { TEST_TYPE_LABELS } from "./types";
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import ExcelJS from 'exceljs';

export function ServiceTable({ clients, onEdit, onDelete, onComplete, onCancel, onRevert }) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedClientType, setSelectedClientType] = useState('All');
  const [selectedTestType, setSelectedTestType] = useState('All');
  const [searchClientName, setSearchClientName] = useState('');

  // Complete dialog state
  const [completeDialog, setCompleteDialog] = useState(null); // { clientId, isForRelease }

  // Delete/Cancel dialog states
  const [deleteDialog, setDeleteDialog]   = useState(null); // { clientId, client }
  const [finalDialog, setFinalDialog]     = useState(null); // { action: 'Cancel'|'Delete', clientId, client }
  const [revertDialog, setRevertDialog]   = useState(null); // { clientId, client }

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const availableCategories = useMemo(() => {
    const cats = new Set(clients.map(c => c.category || '(No Category)'));
    return ['All', ...Array.from(cats).sort()];
  }, [clients]);

  const availableTestTypes = ['All', 'FTIR', 'CN', 'CT', 'CTT', 'MO', 'HT', 'FT', 'TS', 'BT', 'HP', 'RE', 'UC', 'FD'];

  // ─── Helpers to derive fields from serviceTests array ────────────────────────

  /** Returns array of test type strings, e.g. ['FTIR', 'CN'] */
  const getTestTypes = (client) => {
    if (Array.isArray(client.serviceTests) && client.serviceTests.length > 0) {
      return client.serviceTests.map(t => t.testType).filter(Boolean);
    }
    // Fallback: legacy flat field (for records that may not have been migrated)
    if (client.testTypes) {
      if (Array.isArray(client.testTypes)) return client.testTypes;
      if (typeof client.testTypes === 'string') return client.testTypes.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  };

  const testTypeCounts = useMemo(() => {
    const base = clients.filter(c => {
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchesClientType = selectedClientType === 'All' ||
        (selectedClientType === '(No Category)' ? !c.category : c.category === selectedClientType);
      return matchesStatus && matchesClientType;
    });
    const counts = { All: base.length };
    base.forEach(c => {
      getTestTypes(c).forEach(t => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [clients, statusFilter, selectedClientType]);

  const clientTypeCounts = useMemo(() => {
    const base = clients.filter(c => {
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchesTestType = selectedTestType === 'All' || getTestTypes(c).includes(selectedTestType);
      return matchesStatus && matchesTestType;
    });
    const counts = { All: base.length };
    base.forEach(c => {
      const cat = c.category || '(No Category)';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [clients, statusFilter, selectedTestType]);

  const statusCounts = useMemo(() => {
    const base = clients.filter(c => {
      const matchesClientType = selectedClientType === 'All' ||
        (selectedClientType === '(No Category)' ? !c.category : c.category === selectedClientType);
      const matchesTestType = selectedTestType === 'All' || getTestTypes(c).includes(selectedTestType);
      return matchesClientType && matchesTestType;
    });
    return {
      All:              base.length,
      ForTest:          base.filter(c => c.status === 'For Test').length,
      OnHold:           base.filter(c => c.status === 'On-Hold').length,
      AwaitingROA:      base.filter(c => c.status === 'Awaiting ROA').length,
      ForRelease:       base.filter(c => c.status === 'For Release').length,
      ServiceCompleted: base.filter(c => c.status === 'Service Completed').length,
      Cancelled:        base.filter(c => c.status === 'Cancelled').length,
    };
  }, [clients, selectedClientType, selectedTestType]);

  /** Total amount: sum across all serviceTests rows */
  const getTotalAmount = (client) => {
    if (Array.isArray(client.serviceTests) && client.serviceTests.length > 0) {
      return client.serviceTests.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    }
    return Number(client.amount) || 0;
  };

  /** Total sample count: sum across all serviceTests rows */
  const getTotalSampleCount = (client) => {
    if (Array.isArray(client.serviceTests) && client.serviceTests.length > 0) {
      return client.serviceTests.reduce((sum, t) => sum + (Number(t.sampleCount) || 0), 0);
    }
    return Number(client.sampleCount) || 0;
  };

  /**
   * Sample No. display: join each test's range string.
   * If a test has both sampleNo1 and sampleNo2 → "start – end"
   * If only one → just that value
   * Multiple tests → comma-separated
   */
  const getSampleNoDisplay = (client) => {
    if (Array.isArray(client.serviceTests) && client.serviceTests.length > 0) {
      const parts = client.serviceTests
        .map(t => {
          if (t.sampleNo1 && t.sampleNo2) return `${t.sampleNo1} - ${t.sampleNo2}`;
          if (t.sampleNo1) return String(t.sampleNo1);
          if (t.sampleNo2) return String(t.sampleNo2);
          return null;
        })
        .filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : '-';
    }
    // Fallback: legacy flat fields
    if (client.sampleNo1 && client.sampleNo2) return `${client.sampleNo1} - ${client.sampleNo2}`;
    if (client.sampleNo1) return String(client.sampleNo1);
    if (client.sampleNo2) return String(client.sampleNo2);
    return '-';
  };

  /**
   * Specimen No. display: unique specimen numbers across all tests,
   * comma-separated (deduplicated).
   */
  const getSpecimenNoDisplay = (client) => {
    if (Array.isArray(client.serviceTests) && client.serviceTests.length > 0) {
      const unique = [...new Set(
        client.serviceTests.map(t => t.specimenNo).filter(Boolean)
      )];
      return unique.length > 0 ? unique.join(', ') : '-';
    }
    return client.specimenNo || '-';
  };

  // ─── Filtering ────────────────────────────────────────────────────────────────

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const clientTestTypes = getTestTypes(client);
      const matchesTestType = selectedTestType === 'All' || clientTestTypes.includes(selectedTestType);
      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      const matchesClientType = selectedClientType === 'All' ||
        (selectedClientType === '(No Category)' ? !client.category : client.category === selectedClientType);

      const searchTerm = searchClientName.toLowerCase().trim();
      if (!searchTerm) return matchesStatus && matchesClientType && matchesTestType;

      const clientName = (client.name || '').toLowerCase();
      const clientCompany = (client.company || '').toLowerCase();
      const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);

      let matchesSearch;
      if (searchWords.length >= 2) {
        const combinedText = `${clientName} ${clientCompany}`;
        const allWordsMatch = searchWords.every(w => clientName.includes(w) || clientCompany.includes(w));
        matchesSearch = allWordsMatch || combinedText.includes(searchTerm);
      } else {
        matchesSearch = clientName.includes(searchTerm) || clientCompany.includes(searchTerm);
      }

      return matchesSearch && matchesStatus && matchesClientType && matchesTestType;
    });
  }, [clients, searchClientName, statusFilter, selectedClientType, selectedTestType]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedClientType, selectedTestType]);

  // ─── Status helpers ───────────────────────────────────────────────────────────

  const getStatusIcon = (status) => {
    switch (status) {
      case 'On-Hold':          return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'For Test':         return <Clock className="w-5 h-5 text-blue-400" />;
      case 'Awaiting ROA':     return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'For Release':      return <Download className="w-5 h-5 text-lime-400" />;
      case 'Service Completed':return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'Cancelled':        return <XIcon className="w-5 h-5 text-red-400" />;
      default:                 return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'On-Hold':          return 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300';
      case 'For Test':         return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300';
      case 'Awaiting ROA':     return 'from-yellow-500/20 to-yellow-400/20 border-yellow-500/30 text-yellow-300';
      case 'For Release':      return 'from-lime-500/20 to-green-400/20 border-lime-500/30 text-lime-300';
      case 'Service Completed':return 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300';
      case 'Cancelled':        return 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-300';
      default:                 return '';
    }
  };

  const getRequestFormIcon = (status) => {
    switch (status) {
      case 'Signed':   return <FileCheck className="w-4 h-4" />;
      case 'Unsigned': return <FileX className="w-4 h-4" />;
      default:         return <FileQuestion className="w-4 h-4" />;
    }
  };

  const getRequestFormColor = (status) => {
    switch (status) {
      case 'Signed':   return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'Unsigned': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:         return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // ─── Service Request Form name ────────────────────────────────────────────────

  const getServiceRequestName = (client, allClients) => {
    if (!client.dateRequested || (!client.roa && !client.ts)) return '-';
    const date = new Date(client.dateRequested);
    const monthYear = format(date, 'MMyyyy');
    const type = client.roa ? 'ROA' : 'TS';
    const yearlyGroup = allClients
      .filter(c => {
        if (!c.dateRequested) return false;
        const cDate = new Date(c.dateRequested);
        const cType = c.roa ? 'ROA' : 'TS';
        return cDate.getFullYear() === date.getFullYear() && cType === type;
      })
      .sort((a, b) => new Date(a.dateRequested) - new Date(b.dateRequested));
    const index = yearlyGroup.findIndex(c => c.id === client.id);
    const sequenceNumber = index !== -1 ? index + 1 : 1;
    return `${monthYear}-Material-Testing-Service-Request-Form_${type}#${sequenceNumber}`;
  };

  // ─── Export ───────────────────────────────────────────────────────────────────

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const exportYear = clients.length > 0 && clients[0].dateRequested
        ? new Date(clients[0].dateRequested).getFullYear()
        : new Date().getFullYear();
      const ws = workbook.addWorksheet(`Service Records ${exportYear}`);

      ws.columns = [
        { header: 'Service No.',         key: 'serviceNo',       width: 15 },
        { header: 'Client Name',          key: 'name',            width: 30 },
        { header: 'Category',             key: 'category',        width: 20 },
        { header: 'Company',              key: 'company',         width: 30 },
        { header: 'Service Request Form', key: 'srf',             width: 25 },
        { header: 'Request Date',         key: 'dateRequested',   width: 20 },
        { header: 'Signed Request Form',  key: 'signedSrf',       width: 25 },
        { header: 'Official Receipt',     key: 'orStatus',        width: 15 },
        { header: 'Date of Test',         key: 'testDate',        width: 20 },
        { header: 'Report of Analysis',   key: 'roaStatus',       width: 15 },
        { header: 'Released of ROA',      key: 'roaReleasedDate', width: 20 },
        { header: 'Sample No.',           key: 'sampleNo',        width: 20 },
        { header: 'Specimen No.',         key: 'specimenNo',      width: 20 },
        { header: 'Type of Test',         key: 'testTypes',       width: 30 },
        { header: 'Amount',               key: 'amount',          width: 12 },
        { header: 'Sample Count',         key: 'sampleCount',     width: 12 },
        { header: 'Status',               key: 'status',          width: 15 },
        { header: 'Remarks',              key: 'remarks',         width: 30 },
        { header: 'Received By',          key: 'log',             width: 25 },
      ];

      const dataToExport = clients;

      dataToExport.forEach(client => {
        const row = ws.addRow({
          serviceNo:       client.serviceNo || '',
          name:            client.name || '',
          category:        client.category || '',
          company:         client.company || '',
          srf:             getServiceRequestName(client, clients),
          dateRequested:   client.dateRequested ? format(new Date(client.dateRequested), 'yyyy-MM-dd') : '-',
          signedSrf:       client.requestForm || '',
          orStatus:        (client.officialReceipt === true || client.officialReceipt === 1) ? '☑' : '☐',
          testDate:        client.testDate ? format(new Date(client.testDate), 'yyyy-MM-dd') : '',
          roaStatus:       (client.roaV === true || client.roaV === 1) ? '☑' : '☐',
          roaReleasedDate: client.releasedROA ? format(new Date(client.releasedROA), 'yyyy-MM-dd') : '',
          // ── Use aggregated helpers ──────────────────────────────────────────
          sampleNo:        getSampleNoDisplay(client),
          specimenNo:      getSpecimenNoDisplay(client),
          testTypes:       getTestTypes(client).join(', '),
          amount:          getTotalAmount(client),
          sampleCount:     getTotalSampleCount(client),
          // ───────────────────────────────────────────────────────────────────
          status:          client.status || '',
          remarks:         client.remarks || '',
          log:             client.log || '',
        });

        const orCell  = row.getCell('orStatus');
        const roaCell = row.getCell('roaStatus');
        [orCell, roaCell].forEach(cell => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = {
            size: 14, bold: true,
            ...(cell.value === '☑' ? { color: { argb: 'FF008000' } } : {}),
          };
        });
      });

      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F6228' } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Service_Records_${exportYear}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  // ─── Revert status logic ─────────────────────────────────────────────────────

  const getRevertStatus = (client) => {
    if (client.officialReceipt && client.testDate && client.roaV) return 'For Release';
    if (client.officialReceipt && client.testDate && !client.roaV) return 'Awaiting ROA';
    if (client.officialReceipt && !client.testDate) return 'For Test';
    return 'On-Hold';
  };

  // ─── Custom scrollable filter dropdown ───────────────────────────────────────

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [testDropdownOpen, setTestDropdownOpen]   = useState(false);

  const FilterDropdown = ({ open, setOpen, value, onChange, options, getCounts, formatLabel }) => {
    const currentLabel = value === 'All' ? formatLabel('All') : (formatLabel ? formatLabel(value) : value);
    const currentCount = getCounts[value] ?? 0;
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 whitespace-nowrap"
        >
          <span>{currentLabel}</span>
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 min-w-[22px]">
            {currentCount}
          </span>
          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full mt-1 right-0 z-50 bg-slate-900 border border-white/10 rounded-lg shadow-2xl min-w-[180px] overflow-hidden">
              <div className="overflow-y-auto" style={{ maxHeight: `${6 * 40}px` }}>
                {options.map(opt => {
                  const label = formatLabel ? formatLabel(opt) : opt;
                  const count = getCounts[opt] ?? 0;
                  const isSelected = value === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => { onChange(opt); setOpen(false); }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-300 hover:bg-white/10'}`}
                    >
                      <span className="truncate">{label}</span>
                      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold min-w-[22px] flex-shrink-0 ${isSelected ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40' : 'bg-white/10 text-gray-400 border border-white/10'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden flex flex-col h-[calc(100vh-230px)]">
      {/* Frozen Header Section */}
      <div className="flex-none p-6 border-b border-white/10 bg-slate-900/50 relative z-50 w-full">
        <div className="flex flex-row items-center justify-between w-full gap-4">
          <div className="flex-shrink-0">
            <h2 className="text-2xl font-bold text-white tracking-tight">Service Records</h2>
            <p className="text-blue-200/70 text-sm mt-0.5">Manage all client services and requests</p>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
            {/* Search */}
            <div className="relative w-48 xl:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="w-3.5 h-3.5 text-cyan-500/50" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchClientName}
                onChange={(e) => { setSearchClientName(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-500"
              />
              {searchClientName && (
                <button onClick={() => setSearchClientName('')} className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-red-400">
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Selects */}
            <div className="flex items-center gap-2">
              <FilterDropdown
                open={statusDropdownOpen}
                setOpen={setStatusDropdownOpen}
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                options={['All', 'On-Hold', 'For Test', 'Awaiting ROA', 'For Release', 'Service Completed', 'Cancelled']}
                getCounts={{ 'All': statusCounts.All, 'For Test': statusCounts.ForTest, 'On-Hold': statusCounts.OnHold, 'Awaiting ROA': statusCounts.AwaitingROA, 'For Release': statusCounts.ForRelease, 'Service Completed': statusCounts.ServiceCompleted, 'Cancelled': statusCounts.Cancelled }}
                formatLabel={(v) => v === 'All' ? 'All Status' : v}
              />

              <FilterDropdown
                open={clientDropdownOpen}
                setOpen={setClientDropdownOpen}
                value={selectedClientType}
                onChange={(v) => { setSelectedClientType(v); setCurrentPage(1); }}
                options={availableCategories}
                getCounts={clientTypeCounts}
                formatLabel={(v) => v === 'All' ? 'All Clients' : v}
              />

              <FilterDropdown
                open={testDropdownOpen}
                setOpen={setTestDropdownOpen}
                value={selectedTestType}
                onChange={(v) => { setSelectedTestType(v); setCurrentPage(1); }}
                options={availableTestTypes}
                getCounts={testTypeCounts}
                formatLabel={(v) => v === 'All' ? 'All Tests' : v}
              />
            </div>

            {/* Export */}
            <button onClick={exportToExcel} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-lg border border-green-500/50 flex-shrink-0">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline font-bold">Export to Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Table */}
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-slate-900/20">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-40">
            <tr className="bg-slate-900 shadow-md">
              <th className="sticky left-0 top-0 z-50 w-[100px] min-w-[100px] px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase bg-slate-900 border-b border-white/10 border-r border-white/10">Service No.</th>
              <th className="sticky left-[100px] top-0 z-50 w-[250px] min-w-[250px] px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase bg-slate-900 border-b border-white/10 border-r border-white/10">Client Name</th>
              <th className="sticky left-[350px] top-0 z-50 w-[200px] min-w-[200px] px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase bg-slate-900 border-b border-white/10 border-r border-white/10">Company</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Category</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Service Request Form</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Request Date</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Signed Request Form</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Official Receipt</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Date of Test</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Report of Analysis</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Released of ROA</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Sample No.</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Specimen No.</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Sample Count</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900 min-w-[200px]">Types of Test</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Amount</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Status</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Remarks</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Received By</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-cyan-300 uppercase tracking-wider border-b border-white/10 bg-slate-900">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {paginatedClients.map((client, index) => {
              // ── Derive all test-related values from serviceTests ────────────
              const clientTestTypes    = getTestTypes(client);
              const totalAmount        = getTotalAmount(client);
              const totalSampleCount   = getTotalSampleCount(client);
              const sampleNoDisplay    = getSampleNoDisplay(client);
              const specimenNoDisplay  = getSpecimenNoDisplay(client);

              return (
                <tr key={client.id ?? index} className="hover:bg-white/5 transition-colors">
                  {/* Service No */}
                  <td className="sticky left-0 z-30 w-[100px] min-w-[100px] px-5 py-5 bg-slate-900 border-r border-white/10">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-200 border border-cyan-500/50">
                      {client.serviceNo}
                    </span>
                  </td>

                  {/* Client Name */}
                  <td className="sticky left-[100px] z-30 w-[250px] min-w-[250px] px-5 py-5 bg-slate-900 border-r border-white/10">
                    <div className="space-y-1">
                      <p className="text-white font-semibold truncate">{client.name}</p>
                      <p className="text-gray-400 text-sm truncate">{client.address}</p>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="sticky left-[350px] z-30 w-[200px] px-5 py-5 bg-slate-900 overflow-hidden border-r border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    <p className="text-sm text-gray-300 truncate">{client.company || '-'}</p>
                  </td>

                  {/* Category */}
                  <td className="px-5 py-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">{client.category}</span>
                  </td>

                  {/* Service Request Form */}
                  <td className="px-5 py-5">
                    <p className="inline-flex items-center px-3 py-1 rounded-lg text-md font-medium bg-blue-500/20 text-gray-300 border border-gray-500/30 whitespace-nowrap">{getServiceRequestName(client, clients)}</p>
                  </td>

                  {/* Request Date */}
                  <td className="px-5 py-5">
                    <p className="text-sm text-gray-300 whitespace-nowrap">{client.dateRequested ? format(new Date(client.dateRequested), 'MMM dd, yyyy') : '-'}</p>
                  </td>

                  {/* Signed Request Form */}
                  <td className="px-5 py-5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border ${getRequestFormColor(client.requestForm)} whitespace-nowrap`}>
                      {getRequestFormIcon(client.requestForm)} {client.requestForm}
                    </div>
                  </td>

                  {/* Official Receipt */}
                  <td className="px-5 py-5 text-center">
                    <div className="flex justify-center">
                      {(client.officialReceipt === true || client.officialReceipt === 1) ? (
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-green-500/20 text-green-400 border border-green-500/40"><CheckCircle className="h-4 w-4" /></span>
                      ) : (
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-red-500/20 text-red-400 border border-red-500/40"><XIcon className="h-4 w-4" /></span>
                      )}
                    </div>
                  </td>

                  {/* Date of Test */}
                  <td className="px-5 py-5">
                    <p className="text-sm text-gray-300 whitespace-nowrap">{client.testDate ? format(new Date(client.testDate), 'MMM dd, yyyy') : '-'}</p>
                  </td>

                  {/* Report of Analysis */}
                  <td className="px-5 py-5 text-center">
                    <div className="flex justify-center">
                      {(client.roaV === true || client.roaV === 1) ? (
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-green-500/20 text-green-400 border border-green-500/40"><CheckCircle className="h-4 w-4" /></span>
                      ) : (
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-red-500/20 text-red-400 border border-red-500/40"><XIcon className="h-4 w-4" /></span>
                      )}
                    </div>
                  </td>

                  {/* Released of ROA */}
                  <td className="px-5 py-5">
                    <p className="text-sm text-gray-300 whitespace-nowrap">{client.releasedROA ? format(new Date(client.releasedROA), 'MMMM dd, yyyy') : '-'}</p>
                  </td>

                  {/* Sample No. — now from serviceTests */}
                  <td className="px-5 py-5">
                    <p className="text-sm text-gray-300 whitespace-nowrap">{sampleNoDisplay}</p>
                  </td>

                  {/* Specimen No. — now from serviceTests */}
                  <td className="px-5 py-5">
                    <p className="text-sm text-gray-300 whitespace-nowrap">{specimenNoDisplay}</p>
                  </td>

                  {/* Sample Count — summed from serviceTests */}
                  <td className="px-5 py-5">
                    <p className="text-sm text-gray-300 text-center whitespace-nowrap">
                      {totalSampleCount > 0 ? totalSampleCount : '-'}
                    </p>
                  </td>

                  {/* Types of Test — from serviceTests */}
                  <td className="px-5 py-5">
                    <div className="grid grid-cols-3 gap-2 w-fit max-w-xs">
                      {clientTestTypes.length > 0
                        ? clientTestTypes.map((type, idx) => (
                          <span
                            key={`${type}-${idx}`}
                            className="inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/30 min-w-[45px]"
                            title={TEST_TYPE_LABELS[type]}
                          >
                            {type}
                          </span>
                        ))
                        : <span className="text-sm text-gray-400">-</span>
                      }
                    </div>
                  </td>

                  {/* Amount — summed from serviceTests */}
                  <td className="px-5 py-5">
                    <p className="text-lg font-bold text-amber-300 whitespace-nowrap">
                      ₱{totalAmount.toLocaleString()}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium bg-gradient-to-r border ${getStatusColor(client.status)} whitespace-nowrap`}>
                      {getStatusIcon(client.status)} {client.status}
                    </div>
                  </td>

                  {/* Remarks */}
                  <td className="px-5 py-5">
                    <p className="text-sm text-gray-400 italic max-w-[200px] truncate" title={client.remarks || ''}>
                      {client.remarks || <span className="text-gray-600">No remarks</span>}
                    </p>
                  </td>

                  {/* Received By */}
                  <td className="px-5 py-5">
                    <p className="text-sm text-gray-400 italic max-w-[200px] truncate" title={client.log || ''}>
                      {client.log || <span className="text-gray-600">No Receiver</span>}
                    </p>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(client)} className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 hover:scale-110" title="Edit"><Edit className="w-4 h-4" /></button>
                      {client.status !== 'Service Completed' && onComplete && (
                        <button onClick={() => setCompleteDialog({ clientId: client.id, isForRelease: client.status === 'For Release' })} className="p-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 transition-all duration-200 hover:scale-110" title="Mark as Completed"><CheckCircle className="w-4 h-4" /></button>
                      )}
                      {client.status === 'Cancelled' ? (
                        <button onClick={() => setRevertDialog({ clientId: client.id, client })} className="p-2 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 hover:border-orange-500/50 transition-all duration-200 hover:scale-110" title="Revert Cancelled Status"><RotateCcw className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => setDeleteDialog({ clientId: client.id, client })} className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all duration-200 hover:scale-110" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      )}
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

        {/* Pagination */}
        {filteredClients.length > 0 && (
          <div className="px-1 py-1 flex items-center justify-between border-t border-white/5 bg-slate-900/40 backdrop-blur-sm sticky bottom-0 left-0 w-full z-40">
            <div className="text-sm text-gray-400">
              Showing {Math.min(endIndex, filteredClients.length)} of {filteredClients.length} entries
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-all ${currentPage === 1 ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-sm text-gray-300 font-medium">Page {currentPage} of {totalPages}</div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-all ${currentPage === totalPages ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Complete Confirmation Dialog */}
    {completeDialog && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-8 space-y-6">
          {completeDialog.isForRelease ? (
            <>
              <div className="flex items-center gap-4">
                <CheckCircle className="w-9 h-9 text-green-400 flex-shrink-0" />
                <h3 className="text-2xl font-bold text-white tracking-wide">CONFIRMATION</h3>
              </div>
              <p className="text-gray-200 text-base leading-relaxed">
                Are you sure the Report of Analysis (ROA) is released?
              </p>
              <div className="flex justify-end gap-4 pt-2">
                <button
                  onClick={() => setCompleteDialog(null)}
                  className="px-7 py-3 rounded-lg bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-all text-base font-medium"
                >
                  NO
                </button>
                <button
                  onClick={() => { onComplete(completeDialog.clientId); setCompleteDialog(null); }}
                  className="px-7 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-all text-base font-semibold"
                >
                  YES
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <AlertCircle className="w-9 h-9 text-amber-400 flex-shrink-0" />
                <h3 className="text-2xl font-bold text-white tracking-wide">CAUTION</h3>
              </div>
              <p className="text-gray-200 text-base leading-relaxed">
                No Report of Analysis (ROA) reported. Please verify the availability of ROA.
              </p>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setCompleteDialog(null)}
                  className="px-7 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-all text-base font-semibold"
                >
                  OK
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    {/* ── Step 1: Delete/Cancel choice dialog ───────────────────────────────── */}
    {deleteDialog && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-9 h-9 text-red-400 flex-shrink-0" />
              <h3 className="text-2xl font-bold text-white tracking-wide">WARNING</h3>
            </div>
            <button onClick={() => setDeleteDialog(null)} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10 transition-all">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-200 text-base leading-relaxed">
            Cancellation and Deletion Activated: Select Process
          </p>
          <div className="flex justify-end gap-4 pt-2">
            <button
              onClick={() => { setDeleteDialog(null); setFinalDialog({ action: 'Cancel', clientId: deleteDialog.clientId, client: deleteDialog.client }); }}
              className="px-7 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-all text-base font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => { setDeleteDialog(null); setFinalDialog({ action: 'Delete', clientId: deleteDialog.clientId, client: deleteDialog.client }); }}
              className="px-7 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all text-base font-semibold"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Step 2: Final confirmation dialog ─────────────────────────────────── */}
    {finalDialog && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-8 space-y-6">
          <div className="flex items-center gap-4">
            <AlertCircle className="w-9 h-9 text-red-400 flex-shrink-0" />
            <h3 className="text-2xl font-bold text-white tracking-wide">FINAL WARNING</h3>
          </div>
          <p className="text-gray-200 text-base leading-relaxed">
            Do you want to <span className="font-bold text-white">{finalDialog.action.toUpperCase()}</span> this transaction?
          </p>
          <div className="flex justify-end gap-4 pt-2">
            <button
              onClick={() => setFinalDialog(null)}
              className="px-7 py-3 rounded-lg bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-all text-base font-medium"
            >
              NO
            </button>
            <button
              onClick={() => {
                if (finalDialog.action === 'Delete') {
                  onDelete(finalDialog.clientId);
                } else {
                  onCancel && onCancel(finalDialog.clientId);
                }
                setFinalDialog(null);
              }}
              className={`px-7 py-3 rounded-lg text-white transition-all text-base font-semibold ${finalDialog.action === 'Delete' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}
            >
              YES
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Revert dialog ─────────────────────────────────────────────────────── */}
    {revertDialog && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-8 space-y-6">
          <div className="flex items-center gap-4">
            <RotateCcw className="w-9 h-9 text-orange-400 flex-shrink-0" />
            <h3 className="text-2xl font-bold text-white tracking-wide">REVERT CHANGES?</h3>
          </div>
          <p className="text-gray-200 text-base leading-relaxed">
            Do you want to remove <span className="font-bold text-white">'Cancelled'</span> status?
          </p>
          <div className="flex justify-end gap-4 pt-2">
            <button
              onClick={() => setRevertDialog(null)}
              className="px-7 py-3 rounded-lg bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-all text-base font-medium"
            >
              NO
            </button>
            <button
              onClick={() => {
                const newStatus = getRevertStatus(revertDialog.client);
                onRevert && onRevert(revertDialog.clientId, newStatus);
                setRevertDialog(null);
              }}
              className="px-7 py-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-all text-base font-semibold"
            >
              YES
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}