import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { TEST_TYPE_LABELS } from "./types";
import axios from 'axios';

const SERVICE_TYPES = [
  'Material Testing',
  'Calibration',
  'Both',
];

const STATUSES = ['Pending', 'Ongoing', 'Completed', 'Cancelled'];

const REQUEST_FORMS = ['Signed', 'Waiting', 'N/A'];

const TEST_TYPES = ['FTIR', 'CN', 'CT', 'CTT', 'MO', 'HT', 'FT', 'TS', 'BT', 'RE', 'UC', 'FD', 'HP', 'O'];

// Helper function to convert NULL string or null to empty string
const sanitizeValue = (value) => {
  if (value === null || value === undefined || value === 'NULL' || value === 'null') {
    return '';
  }
  return value;
};

// Helper function to convert dates to YYYY-MM-DD format
const sanitizeDate = (value) => {
  if (!value || value === 'NULL' || value === 'null') {
    return '';
  }
  // If it's already in YYYY-MM-DD format, return as-is
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  // If it's an ISO timestamp or Date object, convert to YYYY-MM-DD
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    return '';
  }
  return '';
};

export function EditClientModal({ client, onClose, onSave }) {
  const [categories, setCategories] = useState([
    'BatStateU College',
    'Private HEIs',
    'Industry',
    'Private Individual',
    'Senior High',
    'BatStateU IS',
  ]);

  // Fetch saved categories from backend
  useEffect(() => {
    axios.get('http://192.168.103.84:5000/categories')
      .then(res => {
        const saved = res.data.map(cat => cat.company || cat.name);
        // Merge default categories with saved ones, avoiding duplicates
        setCategories(prev => [...prev, ...saved.filter(s => !prev.includes(s))]);
      })
      .catch(err => console.error("Error fetching categories:", err));
  }, []);
  
  const today = new Date().toISOString().split('T')[0];
  const handleDateChange = (field, value) => {
    if (value > today) {
      setFormData(prev => ({ ...prev, [field]: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  }
  
  // Sanitize client data before setting state
  const [formData, setFormData] = useState({
    ...client,
    name: sanitizeValue(client.name),
    company: sanitizeValue(client.company),
    address: sanitizeValue(client.address),
    email: sanitizeValue(client.email),
    phone: sanitizeValue(client.phone),
    dateRequested: sanitizeDate(client.dateRequested),
    startDate: sanitizeDate(client.startDate),
    dueDate: sanitizeDate(client.dueDate),
    dateReleased: sanitizeDate(client.dateReleased),
    dateClaimed: sanitizeDate(client.dateClaimed),
    testDate: sanitizeDate(client.testDate),
    releasedROA: sanitizeDate(client.releasedROA),
    sampleNo1: sanitizeValue(client.sampleNo1),
    sampleNo2: sanitizeValue(client.sampleNo2),
    specimenNo: sanitizeValue(client.specimenNo),
    remarks: sanitizeValue(client.remarks),
    // ADD THESE BOOLEANS EXPLICITLY:
    roa: client.roa === 1 || client.roa === true,
    ts: client.ts === 1 || client.ts === true,
    roaV: client.roaV === 1 || client.roaV === true,
    // Parse testTypes if it's a string
    testTypes: Array.isArray(client.testTypes)
      ? client.testTypes 
      : typeof client.testTypes === 'string' && client.testTypes.trim()
      ? client.testTypes.split(',').map(t => t.trim())
      : [],
  });

  // Calculate sample count based on sampleNo1 and sampleNo2
  useEffect(() => {
    const start = parseInt(formData.sampleNo1);
    const end = parseInt(formData.sampleNo2);
    
    if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
      setFormData(prev => ({
        ...prev,
        sampleCount: (end - start) + 1
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        sampleCount: 0
      }));
    }
  }, [formData.sampleNo1, formData.sampleNo2]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (new Date(formData.dateRequested) > new Date()) {  
      alert("Date Requested cannot be in the future");
      return;
    }
    
    // Transform data before saving (convert array back to string for testTypes)
    const dataForBackend = {
      ...formData,
      testTypes: Array.isArray(formData.testTypes) 
        ? formData.testTypes.join(', ') 
        : formData.testTypes,
      roa: formData.roa || false,
      ts: formData.ts || false,
      roaV: formData.roaV || false,
    };

    console.log('=== EDIT CLIENT DATA BEING SENT ===');
    console.log('roa:', dataForBackend.roa);
    console.log('ts:', dataForBackend.ts);
    console.log('roaV:', dataForBackend.roaV);
    console.log('Full data:', dataForBackend);
    console.log('===================================');

    onSave(dataForBackend);
    onClose();
  }
  
  const toggleTestType = (type) => {
    setFormData(prev => ({
      ...prev,
      testTypes: prev.testTypes.includes(type)
        ? prev.testTypes.filter(t => t !== type)
        : [...prev.testTypes, type],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white">Edit Client</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Info Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Client Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const regex = /[^a-zA-Z.'()-\s]/g;
                    const onlyLetters = value.replace(regex, "");
                    setFormData({ ...formData, name: onlyLetters });
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.company || ''}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Enter company name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Enter address"
                />
              </div>
            </div>
          </div>
          
          {/* Contact Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    const truncated = rawValue.slice(0, 11);
                    let formatted = truncated;
                    if (truncated.length > 4) {
                      formatted = `${truncated.slice(0, 4)} ${truncated.slice(4)}`;
                    }
                    if (truncated.length > 7) {
                      formatted = `${truncated.slice(0, 4)} ${truncated.slice(4, 7)} ${truncated.slice(7)}`;
                    }
                    setFormData({ ...formData, phone: formatted });
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="09XX XXX XXXX"
                />
              </div>
            </div>
          </div>

          {/* Service Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">Service Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.category || 'Industry'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-800">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Service Type <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.serviceType || 'Material Testing'}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {SERVICE_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-slate-800">
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.status || 'Pending'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status} className="bg-slate-800">
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Progress and Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">Progress & Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Progress (%) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={formData.progress ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setFormData({ ...formData, progress: "" });
                      return;
                    }
                    const numValue = Number(val);
                    if (numValue > 100 || numValue < 0) {
                      setFormData({ ...formData, progress: "" });
                    } else {
                      setFormData({ ...formData, progress: numValue });
                    }
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date Requested <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={formData.dateRequested || ''}
                  max={today}                  
                  onChange={(e) => handleDateChange('dateRequested', e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{ colorScheme: 'dark' }}
                />
                {(() => {
                  const dateValue = formData.dateRequested;
                  const year = dateValue ? parseInt(dateValue.split('-')[0]) : 0;
                  const isComplete = dateValue?.length === 10 && year > 1900;

                  if (isComplete) {
                    return (
                      <div className="mt-3 p-3 bg-white/5 border border-white/8 rounded-lg flex gap-8 animate-in fade-in zoom-in-95 duration-200">
                        <label className="flex items-center block text-md font-md text-gray-300">Service Request Form<span className="text-red-500">*</span></label>
                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              id='roa'
                              checked={formData.roa || false}
                              onChange={(e) => {
                                setFormData({ ...formData, roa: e.target.checked });
                                if (e.target.checked) setFormData(prev => ({ ...prev, ts: false }));
                              }}
                              className="w-4 h-4 rounded border-white/20 bg-transparent text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                            />
                            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">ROA</span>
                          </label>

                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              id='ts'
                              checked={formData.ts || false}
                              onChange={(e) => {
                                setFormData({ ...formData, ts: e.target.checked });
                                if (e.target.checked) setFormData(prev => ({ ...prev, roa: false }));
                              }}
                              className="w-4 h-4 rounded border-white/20 bg-transparent text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                            />
                            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">TS</span>
                          </label>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div>

                <label className="block text-sm font-medium text-gray-300 mb-2">Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Due Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date Claimed</label>
                <input
                  type="date"
                  value={formData.dateClaimed || ''}
                  max={today}
                  onChange={(e) => handleDateChange('dateClaimed', e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date Released</label>
                <input
                  type="date"
                  value={formData.dateReleased || ''}
                  max={today}
                  onChange={(e) => handleDateChange('dateReleased', e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          </div>

          {/* Request Form and Amount */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">Documentation & Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Request Form Status <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.requestForm || 'Waiting'}
                  onChange={(e) => setFormData({ ...formData, requestForm: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {REQUEST_FORMS.map((form) => (
                    <option key={form} value={form} className="bg-slate-800">
                      {form}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date of Test</label>
                <input
                  type="date"
                  value={formData.testDate || ''}
                  onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Released of ROA Date</label>
                <input
                  type="date"
                  value={formData.releasedROA || ''}
                  onChange={(e) => setFormData({ ...formData, releasedROA: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Report of Analysis</label>
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="roaV"
                      checked={formData.roaV || false}
                      onChange={(e) => setFormData({ ...formData, roaV: e.target.checked })}
                      className="w-5 h-5 rounded bg-white/5 border border-white/10 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <label htmlFor="roaV" className="text-sm font-medium text-green-300">
                      ROA Available
                    </label>
                  </div>
                </div> 
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sample No.</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={formData.sampleNo1 || ''}
                    onChange={(e) => setFormData({ ...formData, sampleNo1: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="10"
                  />
                  <span className="text-gray-300 font-medium">-</span>
                  <input
                    type="number"
                    min="1"
                    value={formData.sampleNo2 || ''}
                    onChange={(e) => setFormData({ ...formData, sampleNo2: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="15"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Specimen No.</label>
                <input
                  type="text"
                  value={formData.specimenNo || ''}
                  onChange={(e) => setFormData({ ...formData, specimenNo: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="e.g., SP-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sample Count</label>
                <div className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  {formData.sampleCount > 0 ? formData.sampleCount : '0'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (₱) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.amount ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setFormData({ ...formData, amount: "" });
                      return;
                    }
                    const numValue = Number(val);
                    if (numValue < 0) {
                      setFormData({ ...formData, amount: "" });
                    } else {
                      setFormData({ ...formData, amount: numValue });
                    }
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div> 
                <label className="block text-sm font-medium text-gray-300 mb-2">Official Receipt</label>
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="officialReceipt"
                      checked={formData.officialReceipt || false}
                      onChange={(e) => setFormData({ ...formData, officialReceipt: e.target.checked })}
                      className="w-5 h-5 rounded bg-white/5 border border-white/10 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <label htmlFor="officialReceipt" className="text-sm font-medium text-green-300">
                      Receipt Available
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Remarks</label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Additional notes or remarks"
                rows={3}
              />
            </div>
          </div>

          {/* Test Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">Test Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {TEST_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleTestType(type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.testTypes.includes(type)
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/50 border border-pink-500'
                      : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                  }`}
                  title={TEST_TYPE_LABELS[type] || type}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              Selected: {formData.testTypes.length > 0 ? formData.testTypes.join(', ') : 'None'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 border border-gray-500/30 hover:border-gray-500/50 transition-all"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300 hover:scale-105 font-semibold"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}