import { useState, useEffect, useMemo } from "react";

import { ServiceTable } from "./components/ServiceTable";
import { AddClientModal } from "./components/AddClientModal";
import { EditClientModal } from "./components/EditClientModal";
import { AnalyticsModal } from "./components/AnalyticsModal";
import { TallyModal } from "./components/TallyModal";

import Login from "./Login";

import { Plus, LogOut, BarChart3, Calculator, Calendar } from "lucide-react";

const API_URL = "http://localhost:3000";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
    return Array.from(years).sort((a, b) => b - a);
  }, [clients, customYears]);

  const filteredClients = useMemo(() => {
    return clients.filter(
      (client) => new Date(client.dateRequested).getFullYear() === selectedYear
    );
  }, [clients, selectedYear]);

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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header Section */}
      <div className="p-6 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Material Testing and Calibration Center
              </h1>
              <p className="text-gray-400">Service Monitoring System</p>
            </div>
            
            <button
              onClick={() => {
                localStorage.removeItem("isLoggedIn");
                setIsLoggedIn(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 border border-red-500/30 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Add New Client
            </button>

            <button
              onClick={() => setIsAnalyticsOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 border border-purple-500/30 transition-all"
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </button>

            <button
              onClick={() => setIsTallyOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 border border-green-500/30 transition-all"
            >
              <Calculator className="w-5 h-5" />
              Tally Sheet
            </button>

            {/* Year Selector */}
            <div className="flex items-center gap-2 ml-auto">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Service Table */}
      <div className="p-6">
        <ServiceTable
          clients={filteredClients}
          onEdit={setEditingClient}
          onDelete={handleDeleteClient}
        />
      </div>

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
    </div>
  );
}