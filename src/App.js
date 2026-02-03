import { useState, useEffect, useMemo } from "react";

import { ServiceTable } from "./components/ServiceTable";
import { AddClientModal } from "./components/AddClientModal";
import { EditClientModal } from "./components/EditClientModal";
import { AnalyticsModal } from "./components/AnalyticsModal";
import { TallyModal } from "./components/TallyModal";

import Login from "./Login";

import { Plus, LogOut, BarChart3, Calculator, Calendar } from "lucide-react";

const API_URL = "http://localhost:5000";

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

  // Load clients from backend
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch(`${API_URL}/clients`);
        const data = await res.json();
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
        setError(err);
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

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
      {/* Header + Buttons (same as before) */}
      {/* ...copy your header code... */}

      {/* Service Table */}
      <ServiceTable
        clients={filteredClients}
        onEdit={setEditingClient}
        onDelete={handleDeleteClient}
      />

      {/* AddClientModal */}
      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddClient}
      />

      {/* EditClientModal */}
      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSave={handleEditClient}
        />
      )}
    </div>
  );
}
