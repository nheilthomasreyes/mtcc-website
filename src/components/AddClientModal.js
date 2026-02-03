import { useState } from 'react';
import { X } from 'lucide-react';
import { TEST_TYPE_LABELS } from "./types";

const SERVICE_TYPES = ['Material Testing', 'Calibration', 'Both'];
const STATUSES = ['Pending', 'Ongoing', 'Completed', 'Cancelled'];
const REQUEST_FORMS = ['Signed', 'Waiting', 'N/A'];
const TEST_TYPES = ['FTIR', 'CT', 'CTT', 'MO', 'HT', 'FT', 'TS', 'BT', 'RE', 'UC', 'FD', 'NTA', 'O'];

export function AddClientModal({ isOpen, onClose, onAdd }) {

  const [categories, setCategories] = useState([
    'BatStateU College',
    'Private HEIs',
    'Industry',
    'Private Individual',
    'Senior High',
    'BatStateU IS',
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newcat, setNewCat] = useState({ name: '', color: '#06b6d4' });

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    category: 'Industry',
    serviceType: 'Material Testing',
    status: 'Pending',
    progress: 0,
    dateRequested: today,
    dateReleased: '',
    dateClaimed: '',
    startDate: today,
    dueDate: today,
    requestForm: 'Waiting',
    testTypes: [],
    amount: 0,
    remarks: '',
  });

  const handleDateChange = (field, value) => {
    if (value > today) {
      setFormData(prev => ({ ...prev, [field]: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const toggleTestType = (type) => {
    setFormData(prev => ({
      ...prev,
      testTypes: prev.testTypes.includes(type)
        ? prev.testTypes.filter(t => t !== type)
        : [...prev.testTypes, type],
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      email: '',
      phone: '',
      category: 'Industry',
      serviceType: 'Material Testing',
      status: 'Pending',
      progress: 0,
      dateRequested: today,
      dateReleased: '',
      dateClaimed: '',
      startDate: today,
      dueDate: today,
      requestForm: 'Waiting',
      testTypes: [],
      amount: 0,
      remarks: '',
    });
    setIsAdding(false);
    setNewCat({ name: '', color: '#06b6d4' });
  };

  const handleSaveNewCategory = () => {
    if (newcat.name.trim()) {
      setCategories([...categories, newcat.name.trim()]);
      setFormData({ ...formData, category: newcat.name.trim() });
      setNewCat({ name: '', color: '#06b6d4' });
      setIsAdding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (new Date(formData.dateRequested) > new Date()) {
      alert("Date Requested cannot be in the future");
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/clients', {  // change URL if your backend is hosted elsewhere
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const err = await response.json();
        alert("Error adding client: " + err.message);
        return;
      }

      const newClient = await response.json();

      // Optional: update local state immediately
      if (onAdd) onAdd(newClient);

      resetForm();
      onClose();

    } catch (error) {
      console.error("Failed to add client:", error);
      alert("Failed to add client. See console for details.");
    }
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

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Info */}
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
                    const onlyLetters = e.target.value.replace(/[^a-zA-Z.'()-\s]/g, "");
                    setFormData({ ...formData, name: onlyLetters });
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

          {/* Contact */}
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
                    const rawValue = e.target.value.replace(/\D/g, '').slice(0, 11);
                    let formatted = rawValue;
                    if (rawValue.length > 4) formatted = `${rawValue.slice(0,4)} ${rawValue.slice(4)}`;
                    if (rawValue.length > 7) formatted = `${rawValue.slice(0,4)} ${rawValue.slice(4,7)} ${rawValue.slice(7)}`;
                    setFormData({ ...formData, phone: formatted });
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="09XX XXX XXXX"
                />
              </div>
            </div>
          </div>

          {/* Service Details */}
          {/* (Include category, serviceType, status, progress, dates, testTypes, etc. as you had above) */}
          {/* No need to change UI structure — just the submit logic calls the backend now */}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 border border-gray-500/30 hover:border-gray-500/50 transition-all">
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
