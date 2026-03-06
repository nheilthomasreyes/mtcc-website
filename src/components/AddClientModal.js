import { useState, useEffect } from 'react';
import { X, FlaskConical } from 'lucide-react';
import { TEST_TYPE_LABELS } from "./types";
import axios from 'axios';

const SERVICE_TYPES = ['Material Testing', 'Calibration', 'Both'];
const STATUSES = ['Cancelled'];
const REQUEST_FORMS = ['Signed', 'Waiting', 'N/A'];
const TEST_TYPES = ['FTIR', 'CN', 'CT', 'CTT', 'MO', 'HT', 'FT', 'TS', 'BT', 'HP', 'RE', 'UC', 'FD'];

const formatDateForInput = (dateValue) => {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }} catch (e) { return '';
  }  return '';
};

const defaultTestData = () => ({
  sampleRangeStart: '', sampleRangeEnd: '', sampleCount: 0, specimenNo: '', amount: 0,
});

export function AddClientModal({ isOpen, onClose, onAdd }) {
  const [errors, setErrors] = useState({ service: "" });
  const [categories, setCategories] = useState([
    'BatStateU College', 'Private HEIs', 'Industry', 'Private Individual', 'Senior High', 'BatStateU IS',
  ]);

  useEffect(() => {
    axios.get('/categories')
      .then(res => {
        const saved = res.data.map(cat => cat.company);
        setCategories(prev => [...prev, ...saved.filter(s => !prev.includes(s))]);
      }).catch(err => console.error(err)); 
    }, [isOpen]);

  const [isAdding, setIsAdding] = useState(false);
  const [newcat, setNewCat] = useState({ name: '', color: '#06b6d4' });
  const today = new Date().toISOString().split('T')[0];

  const handleDateChange = (field, value) => {
    if (value > today) { setFormData(prev => ({ ...prev, [field]: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    address: '',
    email: '',
    phone: '',
    category: 'Industry',
    serviceType: 'Material Testing',
    status: 'On-Hold',
    progress: 0,
    dateRequested: '',
    startDate: '',
    dueDate: '',
    dateReleased: '',
    dateClaimed: '',
    testDate: '',
    releasedROA: '',
    requestForm: 'Waiting',
    roaV: false,
    roa: false,
    ts: false,
    officialReceipt: false,
    testTypes: [],
    testData: {},
    remarks: '',
    log: '',
  });

  const toggleTestType = (type) => {
    setFormData(prev => {
      const isSelected = prev.testTypes.includes(type);
      const newTestTypes = isSelected ? prev.testTypes.filter(t => t !== type) : [...prev.testTypes, type];
      const newTestData = { ...prev.testData };
      if (!isSelected) {
        if (!newTestData[type]) { newTestData[type] = defaultTestData(); 
        }
      } else {
        delete newTestData[type];
      } return { ...prev, testTypes: newTestTypes, testData: newTestData };
    });
  };

  const handleSampleRangeChange = (testType, field, value) => {
    setFormData(prev => {
      const current = { ...(prev.testData[testType] || defaultTestData()), [field]: value };
      const start = field === 'sampleRangeStart' ? parseInt(value) : parseInt(current.sampleRangeStart);
      const end = field === 'sampleRangeEnd' ? parseInt(value) : parseInt(current.sampleRangeEnd);
      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) { current.sampleCount = (end - start) + 1;
      } else {
        current.sampleCount = 0;
      }
      return {
        ...prev, testData: { ...prev.testData, [testType]: current,
        },
      };
    });
  };

  const handleTestFieldChange = (testType, field, value) => {
    setFormData(prev => ({ ...prev, testData: { ...prev.testData, [testType]: { ...(prev.testData[testType] || defaultTestData()), [field]: value,
        },
      },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.dateRequested) {
      alert("Date Requested is required.");
      return;
    }
    if (new Date(formData.dateRequested) > new Date()) {
      alert("Date Requested cannot be in the future.");
      return;
    }
    if (!formData.roa && !formData.ts) {
      setErrors({ service: "Please select either ROA or TS!" });
      alert("Please select a Service Request Form type (ROA or TS) before submitting.");
      return;
    } setErrors({ service: "" });

    const serviceTests = formData.testTypes.map(type => ({
      testType:    type,
      sampleNo1:   formData.testData[type]?.sampleRangeStart ? Number(formData.testData[type].sampleRangeStart) : null,
      sampleNo2:   formData.testData[type]?.sampleRangeEnd   ? Number(formData.testData[type].sampleRangeEnd)   : null,
      sampleCount: formData.testData[type]?.sampleCount || 0,
      specimenNo:  formData.testData[type]?.specimenNo  || null,
      amount:      Number(formData.testData[type]?.amount) || 0,
    }));

    const dataForBackend = {
      name:            formData.name.trim(),
      company:         formData.companyName.trim(),
      address:         formData.address.trim(),
      email:           formData.email.trim().toLowerCase(),
      phone:           formData.phone.replace(/\s/g, ''),
      category:        formData.category,
      serviceType:     formData.serviceType,
      status:          formData.status,
      progress:        Number(formData.progress),
      dateRequested:   formatDateForInput(formData.dateRequested) || null,
      startDate:       formatDateForInput(formData.startDate)     || null,
      dueDate:         formatDateForInput(formData.dueDate)       || null,
      dateReleased:    formatDateForInput(formData.dateReleased)  || null,
      dateClaimed:     formatDateForInput(formData.dateClaimed)   || null,
      testDate:        formatDateForInput(formData.testDate)      || null,
      releasedROA:     formatDateForInput(formData.releasedROA)   || null,
      requestForm:     formData.requestForm,
      roaV:            formData.roaV,
      roa:             formData.roa,
      ts:              formData.ts,
      officialReceipt: formData.officialReceipt,
      remarks:         formData.remarks.trim() || null,
      log:             formData.log.trim() || null,
      serviceTests,
    };

    console.log('serviceTests:', dataForBackend.serviceTests);
    onAdd(dataForBackend);

    // Reset
    setFormData({
      name: '', companyName: '', address: '', email: '', phone: '',
      category: 'Industry', serviceType: 'Material Testing', status: 'On-Hold',
      progress: 0, dateRequested: '', startDate: '', dueDate: '',
      dateReleased: '', dateClaimed: '', testDate: '', releasedROA: '',
      requestForm: 'Waiting', roaV: false, roa: false, ts: false,
      officialReceipt: false, testTypes: [], testData: {}, remarks: '', log: '',
    });
    setErrors({ service: "" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white">Add New Client</h2>
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
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    const onlyLetters = value.replace(/[^a-zA-Z.'()-\s]/g, "");
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
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Enter company name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Enter address"
              />
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    const truncated = rawValue.slice(0, 11);
                    let formatted = truncated;
                    if (truncated.length > 4) formatted = `${truncated.slice(0, 4)} ${truncated.slice(4)}`;
                    if (truncated.length > 7) formatted = `${truncated.slice(0, 4)} ${truncated.slice(4, 7)} ${truncated.slice(7)}`;
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
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                  ))}
                </select>
                {!isAdding ? (
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="mt-2 text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors">
                    <span className="text-lg">+</span>Add New Category
                  </button>
                ) : (
                  <div className="mt-3 p-3 border border-white/10 rounded-lg bg-white/5 space-y-3">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="New category name"
                        value={newcat.name}
                        onChange={(e) => setNewCat({ ...newcat, name: e.target.value })}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-white/20 rounded text-sm text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                      />
                      <input
                        type="color"
                        value={newcat.color}
                        onChange={(e) => setNewCat({ ...newcat, color: e.target.value })}
                        className="w-10 h-9 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setIsAdding(false)} className="text-xs text-gray-400 hover:text-white transition-colors">Cancel</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newcat.name.trim()) return;
                          const categoryName = newcat.name.trim();
                          const storedColors = JSON.parse(localStorage.getItem('customCategoryColors') || '{}');
                          storedColors[categoryName] = newcat.color;
                          localStorage.setItem('customCategoryColors', JSON.stringify(storedColors));
                          axios.post('/categories', { name: categoryName })
                            .then(() => {
                              setCategories(prev => [...prev, categoryName]);
                              setFormData({ ...formData, category: categoryName });
                              setNewCat({ name: '', color: '#06b6d4' });
                              setIsAdding(false);
                              window.dispatchEvent(new Event('storage'));
                            })
                            .catch(err => { console.error(err); alert("Error saving category"); });
                        }}
                        className="text-xs bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 rounded text-white font-medium transition-colors"
                      >
                        Save Category
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Service Type <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {SERVICE_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-slate-800">{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status <span className="text-red-500">*</span></label>
                {(formData.status === 'On-Hold' || formData.status === 'For Test' || formData.status === 'Awaiting ROA' || formData.status === 'For Release') ? (
                  <div className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm italic select-none">
                    {formData.status} <span className="text-xs text-gray-500">
                      {(formData.status === 'On-Hold' || formData.status === 'For Test') ? '(auto-set by Official Receipt)' : '(auto-set by Date of Test & ROA)'}
                    </span>
                  </div>
                ) : (
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status} className="bg-slate-800">{status}</option>
                    ))}
                  </select>
                )}
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
                    if (val === "") { setFormData({ ...formData, progress: "" }); return; }
                    const numValue = Number(val);
                    setFormData({ ...formData, progress: (numValue > 100 || numValue < 0) ? "" : numValue });
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date Requested <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateRequested}
                  max={today}
                  onChange={(e) => {
                    handleDateChange('dateRequested', e.target.value);
                    // Clear ROA/TS when date changes
                    setFormData(prev => ({ ...prev, roa: false, ts: false }));
                    setErrors({ service: "" });
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{ colorScheme: 'dark' }}
                />

                {/* ── ROA / TS selector — always visible once date is complete ── */}
                {(() => {
                  const dateValue = formData.dateRequested;
                  const year = dateValue ? parseInt(dateValue.split('-')[0]) : 0;
                  const isComplete = dateValue?.length === 10 && year > 1900;
                  if (!isComplete) return (
                    <p className="mt-2 text-xs text-gray-500 italic">
                      Enter Date Requested to select Service Request Form type.
                    </p>
                  );
                  return (
                    <div className={`mt-3 p-3 rounded-lg border flex flex-wrap gap-6 items-center animate-in fade-in zoom-in-95 duration-200 ${
                      errors.service ? 'bg-red-500/10 border-red-500/40' : 'bg-white/5 border-white/8'
                    }`}>
                      <label className="text-sm font-medium text-gray-300">
                        Service Request Form <span className="text-red-500">*</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.roa}
                          onChange={(e) => {
                            setFormData({ ...formData, roa: e.target.checked, ts: false });
                            if (e.target.checked) setErrors({ service: "" });
                          }}
                          className="rounded border-gray-500 bg-transparent focus:ring-offset-0 focus:ring-0"
                        />
                        <span>ROA</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.ts}
                          onChange={(e) => {
                            setFormData({ ...formData, ts: e.target.checked, roa: false });
                            if (e.target.checked) setErrors({ service: "" });
                          }}
                          className="rounded border-gray-500 bg-transparent focus:ring-offset-0 focus:ring-0"
                        />
                        <span>TS</span>
                      </label>
                      {/* ── Inline error message ── */}
                      {errors.service && (
                        <span className="text-red-400 text-xs font-medium w-full -mt-1">
                          ⚠ {errors.service}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
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
                  value={formData.dateClaimed}
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
                  value={formData.dateReleased}
                  max={today}
                  onChange={(e) => handleDateChange('dateReleased', e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          </div>

          {/* Documentation & Payment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">Documentation & Payment</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Request Form Status <span className="text-red-500">*</span></label>
                <select
                  value={formData.requestForm}
                  onChange={(e) => setFormData({ ...formData, requestForm: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {REQUEST_FORMS.map((form) => (
                    <option key={form} value={form} className="bg-slate-800">{form}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date of Test</label>
                <input
                  type="date"
                  value={formData.testDate || ''}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    let newStatus;
                    if (newDate) {
                      newStatus = formData.roaV ? 'For Release' : 'Awaiting ROA';
                    } else {
                      newStatus = formData.officialReceipt ? 'For Test' : 'On-Hold';
                    }
                    setFormData({ ...formData, testDate: newDate, status: newStatus });
                  }}
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Report of Analysis</label>
                <label
                  htmlFor="roaV"
                  className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border transition-all select-none ${
                    !formData.testDate
                      ? 'bg-white/3 border-white/5 text-gray-600 cursor-not-allowed opacity-50'
                      : formData.roaV
                        ? 'bg-green-500/10 border-green-500/40 text-green-300 cursor-pointer'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="roaV"
                    checked={formData.roaV || false}
                    disabled={!formData.testDate}
                    onChange={(e) => setFormData({ ...formData, roaV: e.target.checked, status: e.target.checked ? 'For Release' : 'Awaiting ROA' })}
                    className="w-4 h-4 rounded accent-green-400"
                  />
                  <span className="text-sm font-medium">ROA Available</span>
                  {!formData.testDate && <span className="text-xs text-gray-600 ml-auto">Requires Date of Test</span>}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Official Receipt</label>
                <label
                  htmlFor="officialReceipt"
                  className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                    formData.officialReceipt
                      ? 'bg-green-500/10 border-green-500/40 text-green-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="officialReceipt"
                    checked={formData.officialReceipt || false}
                    onChange={(e) => setFormData({ ...formData, officialReceipt: e.target.checked, status: e.target.checked ? 'For Test' : 'On-Hold' })}
                    className="w-4 h-4 rounded accent-green-400"
                  />
                  <span className="text-sm font-medium">Receipt Available</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Remarks</label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                placeholder="Additional notes or remarks"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Received By <span className="text-red-500">*</span></label>
              <textarea
                required
                value={formData.log || ''}
                onChange={(e) => setFormData({ ...formData, log: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Enter name of receiver"
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
                  title={TEST_TYPE_LABELS[type]}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              Selected: {formData.testTypes.length > 0 ? formData.testTypes.join(', ') : 'None'}
            </p>
          </div>

          {/* Per-Test Details */}
          {formData.testTypes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">
                Test Details
              </h3>
              <p className="text-xs text-gray-400 -mt-2">
                Fill in the sample and payment details for each selected test type.
              </p>

              {formData.testTypes.map((type) => {
                const td = formData.testData[type] || defaultTestData();
                return (
                  <div
                    key={type}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-pink-400" />
                      <span className="text-sm font-semibold text-white">
                        For <span className="text-pink-300">{type}</span>
                        {TEST_TYPE_LABELS?.[type] && (
                          <span className="ml-1 text-gray-400 font-normal">— {TEST_TYPE_LABELS[type]}</span>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-400 mb-1">Sample No.</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={td.sampleRangeStart || ''}
                            onChange={(e) => handleSampleRangeChange(type, 'sampleRangeStart', e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            placeholder="Start"
                          />
                          <span className="text-gray-400 font-medium shrink-0">—</span>
                          <input
                            type="number"
                            min="1"
                            value={td.sampleRangeEnd || ''}
                            onChange={(e) => handleSampleRangeChange(type, 'sampleRangeEnd', e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            placeholder="End"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Specimen No.</label>
                        <input
                          type="text"
                          value={td.specimenNo || ''}
                          onChange={(e) => handleTestFieldChange(type, 'specimenNo', e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="e.g., SP-001"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Sample Count</label>
                        <div className="w-full px-3 py-2 bg-white/3 border border-white/8 rounded-lg text-gray-300 text-sm select-none">
                          {td.sampleCount > 0 ? td.sampleCount : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Amount (₱)</label>
                        {formData.officialReceipt ? (
                          <input
                            type="number"
                            min="0"
                            value={td.amount ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") { handleTestFieldChange(type, 'amount', ""); return; }
                              const numValue = Number(val);
                              handleTestFieldChange(type, 'amount', numValue < 0 ? "" : numValue);
                            }}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            placeholder="0"
                          />
                        ) : (
                          <div className="w-full px-3 py-2 bg-white/3 border border-white/8 rounded-lg text-gray-500 text-sm italic select-none">
                            Awaiting Official Receipt
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 border border-gray-500/30 hover:border-gray-500/50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 font-semibold"
            >
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}