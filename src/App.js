import { useState, useEffect, useMemo } from "react";

import { ServiceTable } from "./components/ServiceTable";
import { AddClientModal } from "./components/AddClientModal";
import { EditClientModal } from "./components/EditClientModal";
import { AnalyticsModal } from "./components/AnalyticsModal";
import { TallyModal } from "./components/TallyModal";

import Login from './Login'

import {
  Plus,
  LogOut,
  Activity,
  BarChart3,
  Calculator,
  Calendar,
} from "lucide-react";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [loading, setLoading] = useState(false); // Add this
  const [error, setError] = useState(null);      // Add this

  const [clients, setClients] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isTallyOpen, setIsTallyOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customYears, setCustomYears] = useState([]);
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  

  // Generate service number
  const generateServiceNo = () => {
    const year = new Date().getFullYear();
    const count = clients.length + 1;
    return `${year}-${String(count).padStart(4, '0')}`;
  };

  // Function to get sample data
  const getSampleData = () => {
    return [
      // 2026 Data (10 records)
      {
        id: '1',
        serviceNo: '2026-0001',
        name: 'ABC Construction Corp.',
        address: '123 Main St, Batangas City',
        email: 'contact@abc-construction.com',
        phone: '+63 917 123 4567',
        category: 'Industry',
        serviceType: 'Both',
        status: 'Ongoing',
        progress: 65,
        dateRequested: '2026-01-10',
        dateReleased: '',
        dateClaimed: '',
        startDate: '2026-01-10',
        dueDate: '2026-02-15',
        requestForm: 'Signed',
        testTypes: ['CT', 'CTT', 'MO'],
        amount: 45000,
        signatories: 'John Doe, Jane Smith',
        laboratory: 'Main Lab',
        remarks: 'Priority project',
      },
      {
        id: '2',
        serviceNo: '2026-0002',
        name: 'Private High School Inc.',
        address: '456 Education Ave, Lipa City',
        email: 'admin@privatehigh.edu',
        phone: '+63 918 234 5678',
        category: 'Private HEIs',
        serviceType: 'Calibration',
        status: 'Pending',
        progress: 10,
        dateRequested: '2026-01-20',
        dateReleased: '',
        dateClaimed: '',
        startDate: '2026-01-20',
        dueDate: '2026-02-28',
        requestForm: 'Waiting',
        testTypes: ['FTIR', 'UC'],
        amount: 28000,
        signatories: '',
        laboratory: 'Lab 2',
        remarks: '',
      },
      {
        id: '3',
        serviceNo: '2026-0003',
        name: 'BatStateU Main Campus',
        address: 'Pablo Borbon Campus, Batangas City',
        email: 'research@batstateu.edu.ph',
        phone: '+63 43 425 0139',
        category: 'BatStateU College',
        serviceType: 'Material Testing',
        status: 'Completed',
        progress: 100,
        dateRequested: '2026-01-05',
        dateReleased: '2026-01-25',
        dateClaimed: '2026-01-28',
        startDate: '2026-01-05',
        dueDate: '2026-01-30',
        requestForm: 'Signed',
        testTypes: ['HT', 'FT', 'TB', 'BT'],
        amount: 52000,
        signatories: 'Dr. Santos, Engr. Cruz',
        laboratory: 'Main Lab',
        remarks: 'Completed ahead of schedule',
      },
      {
        id: '4',
        serviceNo: '2026-0004',
        name: 'XYZ Manufacturing Inc.',
        address: '789 Industrial Park, Tanauan City',
        email: 'quality@xyz-mfg.com',
        phone: '+63 919 345 6789',
        category: 'Industry',
        serviceType: 'Material Testing',
        status: 'Completed',
        progress: 100,
        dateRequested: '2026-02-01',
        dateReleased: '2026-02-20',
        dateClaimed: '2026-02-22',
        startDate: '2026-02-01',
        dueDate: '2026-02-25',
        requestForm: 'Signed',
        testTypes: ['CT', 'RE', 'UC'],
        amount: 38000,
        signatories: 'Engr. Reyes',
        laboratory: 'Main Lab',
        remarks: 'Regular client',
      },
      {
        id: '5',
        serviceNo: '2026-0005',
        name: 'San Lorenzo Senior High',
        address: 'Brgy. San Lorenzo, Batangas City',
        email: 'principal@slshs.edu.ph',
        phone: '+63 920 456 7890',
        category: 'Senior High',
        serviceType: 'Calibration',
        status: 'Ongoing',
        progress: 45,
        dateRequested: '2026-02-10',
        dateReleased: '',
        dateClaimed: '',
        startDate: '2026-02-10',
        dueDate: '2026-03-15',
        requestForm: 'Signed',
        testTypes: ['FTIR', 'O'],
        amount: 15000,
        signatories: 'Prof. Garcia',
        laboratory: 'Lab 2',
        remarks: '',
      },
      {
        id: '6',
        serviceNo: '2026-0006',
        name: 'Tech Solutions Corp.',
        address: '321 Tech Drive, Calamba City',
        email: 'info@techsolutions.ph',
        phone: '+63 921 567 8901',
        category: 'Industry',
        serviceType: 'Both',
        status: 'Ongoing',
        progress: 80,
        dateRequested: '2026-03-05',
        dateReleased: '',
        dateClaimed: '',
        startDate: '2026-03-05',
        dueDate: '2026-04-10',
        requestForm: 'Signed',
        testTypes: ['FTIR', 'CTT', 'MO', 'NTA'],
        amount: 65000,
        signatories: 'Dr. Lee, Engr. Tan',
        laboratory: 'Main Lab',
        remarks: 'Complex testing required',
      },
      {
        id: '7',
        serviceNo: '2026-0007',
        name: 'Mr. Juan Dela Cruz',
        address: 'Poblacion, Lipa City',
        email: 'juan.delacruz@gmail.com',
        phone: '+63 922 678 9012',
        category: 'Private Individual',
        serviceType: 'Material Testing',
        status: 'Completed',
        progress: 100,
        dateRequested: '2026-03-15',
        dateReleased: '2026-03-25',
        dateClaimed: '2026-03-26',
        startDate: '2026-03-15',
        dueDate: '2026-03-30',
        requestForm: 'Signed',
        testTypes: ['CT', 'FT'],
        amount: 12000,
        signatories: 'Engr. Bautista',
        laboratory: 'Lab 2',
        remarks: 'Personal construction project',
      },
      {
        id: '8',
        serviceNo: '2026-0008',
        name: 'BatStateU Instrument Services',
        address: 'Pablo Borbon Campus, Batangas City',
        email: 'is@batstateu.edu.ph',
        phone: '+63 43 425 0140',
        category: 'BatStateU IS',
        serviceType: 'Calibration',
        status: 'Pending',
        progress: 5,
        dateRequested: '2026-03-20',
        dateReleased: '',
        dateClaimed: '',
        startDate: '2026-03-20',
        dueDate: '2026-04-20',
        requestForm: 'Waiting',
        testTypes: ['FD', 'O'],
        amount: 22000,
        signatories: '',
        laboratory: 'Lab 2',
        remarks: '',
      },
      {
        id: '9',
        serviceNo: '2026-0009',
        name: 'Quality Foods Manufacturing',
        address: 'LIMA Technology Center, Malvar',
        email: 'qc@qualityfoods.ph',
        phone: '+63 923 789 0123',
        category: 'Industry',
        serviceType: 'Material Testing',
        status: 'Ongoing',
        progress: 55,
        dateRequested: '2026-04-01',
        dateReleased: '',
        dateClaimed: '',
        startDate: '2026-04-01',
        dueDate: '2026-05-01',
        requestForm: 'Signed',
        testTypes: ['FTIR', 'NTA', 'O'],
        amount: 42000,
        signatories: 'Dr. Aquino',
        laboratory: 'Main Lab',
        remarks: 'Food safety testing',
      },
      {
        id: '10',
        serviceNo: '2026-0010',
        name: 'University of the East',
        address: 'Caloocan Campus, Metro Manila',
        email: 'research@ue.edu.ph',
        phone: '+63 924 890 1234',
        category: 'Private HEIs',
        serviceType: 'Both',
        status: 'Completed',
        progress: 100,
        dateRequested: '2026-04-10',
        dateReleased: '2026-05-05',
        dateClaimed: '2026-05-08',
        startDate: '2026-04-10',
        dueDate: '2026-05-10',
        requestForm: 'Signed',
        testTypes: ['CT', 'HT', 'UC', 'FTIR'],
        amount: 48000,
        signatories: 'Dr. Martinez, Engr. Lopez',
        laboratory: 'Main Lab',
        remarks: 'Research project',
      },
      // 2025 Data (10 records)
      {
        id: '11',
        serviceNo: '2025-0001',
        name: 'Stellar Construction Group',
        address: '555 Builder St, Batangas City',
        email: 'ops@stellarconstruction.com',
        phone: '+63 925 901 2345',
        category: 'Industry',
        serviceType: 'Material Testing',
        status: 'Completed',
        progress: 100,
        dateRequested: '2025-01-15',
        dateReleased: '2025-02-10',
        dateClaimed: '2025-02-12',
        startDate: '2025-01-15',
        dueDate: '2025-02-15',
        requestForm: 'Signed',
        testTypes: ['CT', 'CTT', 'RE'],
        amount: 35000,
        signatories: 'Engr. Villanueva',
        laboratory: 'Main Lab',
        remarks: '',
      },
      {
        id: '12',
        serviceNo: '2025-0002',
        name: 'St. Michaels Academy',
        address: '777 School Road, Tanauan City',
        email: 'registrar@stmichaels.edu',
        phone: '+63 926 012 3456',
        category: 'Private HEIs',
        serviceType: 'Calibration',
        status: 'Completed',
        progress: 100,
        dateRequested: '2025-02-01',
        dateReleased: '2025-02-28',
        dateClaimed: '2025-03-02',
        startDate: '2025-02-01',
        dueDate: '2025-03-05',
        requestForm: 'Signed',
        testTypes: ['FTIR', 'FD'],
        amount: 25000,
        signatories: 'Prof. Mendoza',
        laboratory: 'Lab 2',
        remarks: 'Annual calibration',
      },
      {
        id: '13',
        serviceNo: '2025-0003',
        name: 'BatStateU Engineering',
        address: 'Alangilan Campus, Batangas City',
        email: 'engineering@batstateu.edu.ph',
        phone: '+63 43 425 0141',
        category: 'BatStateU College',
        serviceType: 'Both',
        status: 'Completed',
        progress: 100,
        dateRequested: '2025-02-15',
        dateReleased: '2025-03-15',
        dateClaimed: '2025-03-18',
        startDate: '2025-02-15',
        dueDate: '2025-03-20',
        requestForm: 'Signed',
        testTypes: ['CT', 'HT', 'FT', 'TB', 'BT'],
        amount: 58000,
        signatories: 'Dr. Ramos, Engr. Flores',
        laboratory: 'Main Lab',
        remarks: 'Thesis research',
      },
      {
        id: '14',
        serviceNo: '2025-0004',
        name: 'Phoenix Industrial Corp.',
        address: '888 Factory Ave, Sto. Tomas',
        email: 'qaqc@phoenixind.ph',
        phone: '+63 927 123 4567',
        category: 'Industry',
        serviceType: 'Material Testing',
        status: 'Completed',
        progress: 100,
        dateRequested: '2025-03-10',
        dateReleased: '2025-04-05',
        dateClaimed: '2025-04-08',
        startDate: '2025-03-10',
        dueDate: '2025-04-10',
        requestForm: 'Signed',
        testTypes: ['CT', 'UC', 'RE'],
        amount: 41000,
        signatories: 'Engr. Torres',
        laboratory: 'Main Lab',
        remarks: 'Quality control',
      },
      {
        id: '15',
        serviceNo: '2025-0005',
        name: 'Lakeside Senior High',
        address: 'Lakefront Ave, Taal',
        email: 'admin@lakesideshs.edu.ph',
        phone: '+63 928 234 5678',
        category: 'Senior High',
        serviceType: 'Calibration',
        status: 'Completed',
        progress: 100,
        dateRequested: '2025-03-25',
        dateReleased: '2025-04-20',
        dateClaimed: '2025-04-22',
        startDate: '2025-03-25',
        dueDate: '2025-04-25',
        requestForm: 'Signed',
        testTypes: ['O', 'FD'],
        amount: 18000,
        signatories: 'Prof. Santiago',
        laboratory: 'Lab 2',
        remarks: 'Lab equipment calibration',
      },
      {
        id: '16',
        serviceNo: '2025-0006',
        name: 'Mega Pharma Industries',
        address: 'Pharmacity Complex, Lipa',
        email: 'rd@megapharma.ph',
        phone: '+63 929 345 6789',
        category: 'Industry',
        serviceType: 'Both',
        status: 'Completed',
        progress: 100,
        dateRequested: '2025-04-05',
        dateReleased: '2025-05-10',
        dateClaimed: '2025-05-12',
        startDate: '2025-04-05',
        dueDate: '2025-05-15',
        requestForm: 'Signed',
        testTypes: ['FTIR', 'NTA', 'O', 'MO'],
        amount: 72000,
        signatories: 'Dr. Castillo, Engr. Rivera',
        laboratory: 'Main Lab',
        remarks: 'Pharmaceutical testing',
      },
      {
        id: '17',
        serviceNo: '2025-0007',
        name: 'Ms. Maria Santos',
        address: 'Barangay Kumintang, Batangas City',
        email: 'maria.santos@yahoo.com',
        phone: '+63 930 456 7890',
        category: 'Private Individual',
        serviceType: 'Material Testing',
        status: 'Completed',
        progress: 100,
        dateRequested: '2025-05-01',
        dateReleased: '2025-05-20',
        dateClaimed: '2025-05-21',
        startDate: '2025-05-01',
        dueDate: '2025-05-25',
        requestForm: 'Signed',
        testTypes: ['CT', 'CTT'],
        amount: 10000,
        signatories: 'Engr. Cruz',
        laboratory: 'Lab 2',
        remarks: 'Residential project',
      },
      {
        id: '18',
        serviceNo: '2025-0008',
        name: 'BatStateU IS - Equipment Lab',
        address: 'Pablo Borbon Campus, Batangas City',
        email: 'equipment@batstateu.edu.ph',
        phone: '+63 43 425 0142',
        category: 'BatStateU IS',
        serviceType: 'Calibration',
        status: 'Completed',
        progress: 100,
        dateRequested: '2025-05-15',
        dateReleased: '2025-06-10',
        dateClaimed: '2025-06-12',
        startDate: '2025-05-15',
        dueDate: '2025-06-15',
        requestForm: 'Signed',
        testTypes: ['FD', 'O'],
        amount: 20000,
        signatories: 'Engr. Gonzales',
        laboratory: 'Lab 2',
        remarks: 'Annual equipment check',
      },
      {
        id: '19',
        serviceNo: '2025-0009',
        name: 'Green Earth Chemicals',
        address: 'Eco Industrial Park, Rosario',
        email: 'lab@greenearth.ph',
        phone: '+63 931 567 8901',
        category: 'Industry',
        serviceType: 'Material Testing',
        status: 'Completed',
        progress: 100,
        dateRequested: '2025-06-01',
        dateReleased: '2025-06-28',
        dateClaimed: '2025-06-30',
        startDate: '2025-06-01',
        dueDate: '2025-07-05',
        requestForm: 'Signed',
        testTypes: ['FTIR', 'NTA', 'MO'],
        amount: 45000,
        signatories: 'Dr. Lim',
        laboratory: 'Main Lab',
        remarks: 'Chemical analysis',
      },
      {
        id: '20',
        serviceNo: '2025-0010',
        name: 'De La Salle Lipa',
        address: 'DLSL Campus, Lipa City',
        email: 'research@dlsl.edu.ph',
        phone: '+63 932 678 9012',
        category: 'Private HEIs',
        serviceType: 'Both',
        status: 'Completed',
        progress: 100,
        dateRequested: '2025-07-10',
        dateReleased: '2025-08-05',
        dateClaimed: '2025-08-08',
        startDate: '2025-07-10',
        dueDate: '2025-08-10',
        requestForm: 'Signed',
        testTypes: ['CT', 'HT', 'UC', 'FTIR', 'TB'],
        amount: 55000,
        signatories: 'Dr. Velasco, Engr. Pascual',
        laboratory: 'Main Lab',
        remarks: 'Engineering research',
      },
    ];
  };


  // Load clients from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('clients');
    if (saved) {
      setClients(JSON.parse(saved));
    } else {
      const sampleData = getSampleData();
      setClients(sampleData);
      localStorage.setItem('clients', JSON.stringify(sampleData));
    }

    // Load custom years
    const savedYears = localStorage.getItem('customYears');
    if (savedYears) {
      setCustomYears(JSON.parse(savedYears));
    }
  }, []);

  // Save clients to localStorage whenever they change
  useEffect(() => {
    if (clients.length > 0) {
      localStorage.setItem('clients', JSON.stringify(clients));
    }
  }, [clients]);

  // Save custom years to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customYears', JSON.stringify(customYears));
  }, [customYears]);

  const handleAddClient = (client) => {
    const newClient = {
      ...client,
      id: Date.now().toString(),
      serviceNo: generateServiceNo(),
    };
    setClients([...clients, newClient]);
    setIsAddModalOpen(false);
  };

  const handleEditClient = (updatedClient) => {
    setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
    setEditingClient(null);
  };

  const handleDeleteClient = (id) => {
    const client = clients.find(c => c.id === id);
    if (client?.doNotDelete) {
      alert('This record is protected and cannot be deleted. Please uncheck "DO NOT DELETE" first if you need to remove it.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this client?')) {
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const handleCompleteClient = (id) => {
    const today = new Date().toISOString().split('T')[0];
    setClients(clients.map(c => 
      c.id === id ? { 
        ...c, 
        status: 'Completed', 
        progress: 100,
        dateReleased: c.dateReleased || today,
        dateClaimed: c.dateClaimed || today,
      } : c
    ));
  };

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

  const handleAddYear = () => {
    const year = parseInt(newYearInput);
    if (!isNaN(year) && year >= 2000 && year <= 2100) {
      if (!customYears.includes(year) && !availableYears.includes(year)) {
        setCustomYears([...customYears, year]);
        setNewYearInput('');
        setIsAddYearModalOpen(false);
      } else {
        alert('This year already exists!');
      }
    } else {
      alert('Please enter a valid year between 2000 and 2100');
    }
  };

if (!isLoggedIn) {
  return (
    <Login 
      onLoginSuccess={() => {
        localStorage.setItem('isLoggedIn', 'true'); // Save the note
        setIsLoggedIn(true);
      }} 
    />
  );
}

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img src="/MTCCORIG.png" className="w-12 h-12"/>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Service Monitoring System
                </h1>
                <p className="text-blue-200 text-sm mt-1">
                  Material Testing & Calibration Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTallyOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 font-semibold"
              >
                <Calculator className="w-5 h-5" />
                Tally
              </button>
              <button
                onClick={() => setIsAnalyticsOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/50 transition-all duration-300 hover:scale-105 font-semibold"
              >
                <BarChart3 className="w-5 h-5" />
                Analytics
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Client
              </button>
              <button
              onClick={() => {
              localStorage.removeItem('isLoggedIn'); // Delete the note
              window.location.reload(); // Refresh to show Login again
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-red-600 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all duration-300 hover:scale-105 font-semibold"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Year Filter */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <label htmlFor="year-filter" className="text-white font-semibold">Filter by Year:</label>
          <select
            id="year-filter"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 hover:bg-white/20 transition-all"
          >
            {availableYears.map(year => (
              <option key={year} value={year} className="bg-slate-800">{year}</option>
            ))}
          </select>
          <button
            onClick={() => setIsAddYearModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300 hover:scale-105 font-semibold"
          >
            <Calendar className="w-4 h-4" />
            Add Year
          </button>
          <span className="text-blue-200 text-sm">
            Showing {filteredClients.length} of {clients.length} total services
          </span>
        </div>

        {/* Service Table */}
        <ServiceTable
          clients={filteredClients}
          onEdit={setEditingClient}
          onDelete={handleDeleteClient}
          onComplete={handleCompleteClient}
        />
      </main>

      {/* Modals */}
      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddClient}
      />

      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSave={handleEditClient}
        />
      )}

      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        clients={clients}
        customYears={customYears}
      />

      <TallyModal
        isOpen={isTallyOpen}
        onClose={() => setIsTallyOpen(false)}
        clients={clients}
        customYears={customYears}
      />

      {/* Add Year Modal */}
      {isAddYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Add New Year</h2>
            <p className="text-blue-200 text-sm mb-6">Enter a year to track services for</p>
            <input
              type="number"
              value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddYear();
                }
              }}
              placeholder="Enter year (e.g., 2027)"
              className="px-4 py-3 border border-white/20 rounded-lg w-full mb-6 bg-white/10 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 backdrop-blur-xl"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsAddYearModalOpen(false);
                  setNewYearInput('');
                }}
                className="px-6 py-3 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 border border-gray-500/30 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddYear}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all font-semibold"
              >
                Add Year
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}