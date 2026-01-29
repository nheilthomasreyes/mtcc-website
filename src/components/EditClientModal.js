import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { TEST_TYPE_LABELS } from "./types";

const CATEGORIES = [
  'BatStateU College',
  'Private HEIs',
  'Industry',
  'Private Individual',
  'Senior High',
  'BatStateU IS',
];

const SERVICE_TYPES = [
  'Material Testing',
  'Calibration',
  'Both',
];

const STATUSES = ['Pending', 'Ongoing', 'Completed', 'Cancelled'];

const REQUEST_FORMS = ['Signed', 'Waiting', 'N/A'];

{/*CHANGED TB - TS*/}
const TEST_TYPES = ['FTIR', 'CT', 'CTT', 'MO', 'HT', 'FT', 'TS', 'BT', 'RE', 'UC', 'FD', 'NTA', 'O'];

{/*EDITED UP TO LINE 51*/}
export function EditClientModal({ client, onClose, onSave }) {
  const today=new Date().toISOString().split('T')[0];
  const handleDateChange=(field,value) => {
    if (value > today) {
      setFormData(prev => ({...prev,[field]:''}));
    } else {
      setFormData(prev => ({...prev, [field]: value}));
    }
  }
  
  const [formData, setFormData] = useState(client);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (new Date(formData.dateRequested) > new Date()) {  
      alert("Date Requested cannot be in the future");
      return;
    }
  
    onSave(formData);
  
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

                {/*ALL CLIENT INFORMATION IS EDITED UP TO LINE 109*/}
                <label className="block text-sm font-medium text-gray-300 mb-2">Client Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const value=e.target.value;
                    const regex=/[^a-zA-Z.'()-\s]/g;
                    const onlyLetters=value.replace(regex, "");
                    setFormData({...formData, name: onlyLetters});
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Enter address"
                />
              </div>
            </div>
          </div>
          
          {/*ALL CONTACT INFORMATION IS EDITED UP TO LINE 150*/}
          {/* Contact Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
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
                  required
                  value={formData.phone}
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

                {/*ONLY LINE 159 IS EDITED HERE*/}
                <label className="block text-sm font-medium text-gray-300 mb-2">Category <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-800">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>

                {/*ONLY LINE 176 IS EDITED HERE*/}
                <label className="block text-sm font-medium text-gray-300 mb-2">Service Type <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.serviceType}
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

                {/*ONLY LINE 193 IS EDITED HERE*/}
                <label className="block text-sm font-medium text-gray-300 mb-2">Status <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.status}
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

                {/*EDITED UP TO LINE 241*/}
                <label className="block text-sm font-medium text-gray-300 mb-2">Progress (%) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={formData.progress || ''}
                  onChange={(e) => {
                    const val=e.target.value;
                    if(val === "" ){
                      setFormData({...formData, progress:""});
                      return;
                    }
                    
                    const numValue=Number(val);
                    if (numValue > 100) {
                      setFormData({...formData, progress: ""});
                    } else {
                      setFormData({...formData, progress: numValue});
                    }
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Laboratory</label>
                <input
                  type="text"
                  value={formData.laboratory || ''}
                  onChange={(e) => setFormData({ ...formData, laboratory: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="e.g., Main Lab"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>

                {/*EDITED UP TO LINE 315*/}
                <label className="block text-sm font-medium text-gray-300 mb-2">Date Requested <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={formData.dateRequested}
                  max={today}                  
                  onChange={(e) => handleDateChange('dateRequested', e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{colorScheme: 'dark'}}
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
                  style={{colorScheme: 'dark'}}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date Claimed</label>
                <input
                  type="date"
                  value={formData.dateClaimed}
                  max={today}
                  onChange={(e) => handleDateChange('dateClaimed', e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{colorScheme: 'dark'}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{colorScheme: 'dark'}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Due Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{colorScheme: 'dark'}}
                />
              </div>
            </div>
          </div>

          {/* Request Form and Amount */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2">Documentation & Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                
                {/*EDITED UP TO LINE 370*/}
                <label className="block text-sm font-medium text-gray-300 mb-2">Request Form Status <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.requestForm}
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
                  value={formData.dateOfTest || ''}
                  onChange={(e) => setFormData({ ...formData, dateOfTest: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{colorScheme: 'dark'}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Report of Analysis Date</label>
                <input
                  type="date"
                  value={formData.reportOfAnalysis || ''}
                  onChange={(e) => setFormData({ ...formData, reportOfAnalysis: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{colorScheme: 'dark'}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Released of ROA Date</label>
                <input
                  type="date"
                  value={formData.releasedOfROA || ''}
                  onChange={(e) => setFormData({ ...formData, releasedOfROA: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  style={{colorScheme: 'dark'}}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sample No.</label>
                <input
                  type="text"
                  value={formData.sampleNo || ''}
                  onChange={(e) => setFormData({ ...formData, sampleNo: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="e.g., S-001"
                />
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
                <input
                  type="number"
                  min="0"
                  value={formData.sampleCount || ''}
                  onChange={(e) => setFormData({ ...formData, sampleCount: Number(e.target.value) || undefined })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>

                {/*EDITED UP TO LINE 434*/}
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (₱) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div> 
                <label className="block text-sm font-medium text-gray-300 mb-2">Official Receipt</label>
                  <div className="flex items-center gap-3 pt-3">
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
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Signatories</label>
              <input
                type="text"
                value={formData.signatories || ''}
                onChange={(e) => setFormData({ ...formData, signatories: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="e.g., John Doe, Jane Smith"
              />
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 border border-gray-500/30 hover:border-gray-500/50 transition-all"
            >
              <X className="w-4 h-4" />
              Exit
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
