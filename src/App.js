import { useState, useEffect, useMemo } from "react";

import { ServiceTable } from "./components/ServiceTable";
import { AddClientModal } from "./components/AddClientModal";
import { EditClientModal } from "./components/EditClientModal";
import { AnalyticsModal } from "./components/AnalyticsModal";
import { TallyModal } from "./components/TallyModal";

import Login from "./Login";

import {
  Plus,
  LogOut,
  Activity,
  BarChart3,
  Calculator,
  Calendar,
} from "lucide-react";

const API_URL = "http://localhost:3000";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
    );
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isTallyOpen, setIsTallyOpen] = useState(false);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customYears, setCustomYears] = useState([]);
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState("");

  // Load clients from backend - ONLY when logged in
  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return; // Don't fetch if not logged in
    }

    const fetchClients = async () => {
      try {
        console.log("Fetching clients from:", `${API_URL}/clients`);
        const res = await fetch(`${API_URL}/clients`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("Received clients:", data);
        
        // Convert testTypes from JSON string to array if needed
        const processed = data.map((c) => ({
          ...c,
          testTypes: Array.isArray(c.testTypes)
            ? c.testTypes
            : JSON.parse(c.testTypes || "[]"),
        }));
        setClients(processed);
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err);
        setLoading(false);
      }
    };
    
    fetchClients();
  }, [isLoggedIn]);

  // Load custom years from localStorage
  useEffect(() => {
    const savedYears = localStorage.getItem("customYears");
    if (savedYears) {
      setCustomYears(JSON.parse(savedYears));
    }
  }, []);

  // Save custom years to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("customYears", JSON.stringify(customYears));
  }, [customYears]);

  const saveClientToBackend = async (client, method = "POST") => {
    const url = method === "POST" ? `${API_URL}/clients` : `${API_URL}/clients/${client.id}`;
    const body = { ...client, testTypes: JSON.stringify(client.testTypes) };
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const generateServiceNo = () => {
    const year = new Date().getFullYear();
    const count = clients.length + 1;
    return `${year}-${String(count).padStart(4, "0")}`;
  };

  const handleAddClient = async (client) => {
    if (!client.dateRequested) {
      alert("Date Requested is required");
      return;
    }
    
    const newClient = { ...client, serviceNo: generateServiceNo() };
    await saveClientToBackend(newClient, "POST");
    setClients([...clients, newClient]);
    setIsAddModalOpen(false);
  };

  const handleEditClient = async (updatedClient) => {
    await saveClientToBackend(updatedClient, "PUT");
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    setEditingClient(null);
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      await fetch(`${API_URL}/clients/${id}`, { method: "DELETE" });
      setClients(clients.filter((c) => c.id !== id));
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set(customYears);
    clients.forEach((c) => {
      const year = new Date(c.dateRequested).getFullYear();
      if (!isNaN(year)) years.add(year);
    });
    const yearArray = Array.from(years).sort((a, b) => b - a);
    return yearArray.length > 0 ? yearArray : [new Date().getFullYear()];
  }, [clients, customYears]);

  const filteredClients = useMemo(() => {
    return clients.filter(
      (client) => new Date(client.dateRequested).getFullYear() === selectedYear
    );
  }, [clients, selectedYear]);

  const handleAddYear = () => {
    const year = parseInt(newYearInput);
    if (!isNaN(year) && year >= 2000 && year <= 2100) {
      if (!customYears.includes(year) && !availableYears.includes(year)) {
        setCustomYears([...customYears, year]);
        setNewYearInput("");
        setIsAddYearModalOpen(false);
      } else {
        alert("This year already exists!");
      }
    } else {
      alert("Please enter a valid year between 2000 and 2100");
    }
  };

  if (!isLoggedIn) {
    return (
      <Login
        onLoginSuccess={() => {
          localStorage.setItem("isLoggedIn", "true");
          setIsLoggedIn(true);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-red-500 text-xl">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/MTCCORIG.png"
                className="w-12 h-12 transition-transform duration-300 hover:scale-110 hover:rotate-6 cursor-pointer"
                alt="MTCC Logo"
              />
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
                  localStorage.removeItem("isLoggedIn");
                  setIsLoggedIn(false);
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
          <label htmlFor="year-filter" className="text-white font-semibold">
            Filter by Year:
          </label>
          <select
            id="year-filter"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 hover:bg-white/20 transition-all"
          >
            {availableYears.map((year) => (
              <option key={year} value={year} className="bg-slate-800">
                {year}
              </option>
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
      />

      <TallyModal
        isOpen={isTallyOpen}
        onClose={() => setIsTallyOpen(false)}
        clients={filteredClients}
        selectedYear={selectedYear}
      />

      {/* Add Year Modal */}
      {isAddYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Add New Year</h2>
            <p className="text-blue-200 text-sm mb-6">
              Enter a year to track services for
            </p>
            <input
              type="number"
              value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
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
                  setNewYearInput("");
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