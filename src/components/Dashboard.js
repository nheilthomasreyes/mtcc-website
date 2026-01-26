import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, startOfMonth, subMonths, isSameMonth } from 'date-fns';

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

export function Dashboard({ clients }) {
  const stats = useMemo(() => {
    const total = clients.length;
    const ongoing = clients.filter(c => c.status === 'Ongoing').length;
    const completed = clients.filter(c => c.status === 'Completed').length;
    const pending = clients.filter(c => c.status === 'Pending').length;
    const cancelled = clients.filter(c => c.status === 'Cancelled').length;
    const totalRevenue = clients.reduce((sum, c) => sum + c.amount, 0);
    const completedRevenue = clients
      .filter(c => c.status === 'Completed')
      .reduce((sum, c) => sum + c.amount, 0);

    // Monthly data for the last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthClients = clients.filter(c => 
        isSameMonth(new Date(c.startDate), month)
      );
      monthlyData.push({
        month: format(month, 'MMM yyyy'),
        services: monthClients.length,
        revenue: monthClients.reduce((sum, c) => sum + c.amount, 0) / 1000,
      });
    }

    // Service type distribution
    const serviceTypeData = [
      { name: 'Material Testing', value: clients.filter(c => c.serviceType === 'Material Testing').length },
      { name: 'Calibration', value: clients.filter(c => c.serviceType === 'Calibration').length },
      { name: 'Both', value: clients.filter(c => c.serviceType === 'Both').length },
    ].filter(item => item.value > 0);

    // Category distribution
    const categoryData = [
      { name: 'BatStateU College', value: clients.filter(c => c.category === 'BatStateU College').length },
      { name: 'Private HEIs', value: clients.filter(c => c.category === 'Private HEIs').length },
      { name: 'Industry', value: clients.filter(c => c.category === 'Industry').length },
      { name: 'Private Individual', value: clients.filter(c => c.category === 'Private Individual').length },
      { name: 'Senior High', value: clients.filter(c => c.category === 'Senior High').length },
      { name: 'BatStateU IS', value: clients.filter(c => c.category === 'BatStateU IS').length },
    ].filter(item => item.value > 0);

    // Status distribution for bar chart
    const statusData = [
      { status: 'Pending', count: pending, color: '#f59e0b' },
      { status: 'Ongoing', count: ongoing, color: '#3b82f6' },
      { status: 'Completed', count: completed, color: '#10b981' },
      { status: 'Cancelled', count: cancelled, color: '#ec4899' },
    ];

    return {
      total,
      ongoing,
      completed,
      pending,
      cancelled,
      totalRevenue,
      completedRevenue,
      monthlyData,
      serviceTypeData,
      categoryData,
      statusData,
    };
  }, [clients]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Services */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border border-cyan-500/20 p-6 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/50">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="space-y-2">
              <p className="text-cyan-200 text-sm font-medium">Total Services</p>
              <p className="text-4xl font-bold text-white">{stats.total}</p>
              <p className="text-cyan-300 text-xs">All active clients</p>
            </div>
          </div>
        </div>

        {/* Ongoing Services */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl border border-blue-500/20 p-6 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/50">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-2">
              <p className="text-blue-200 text-sm font-medium">Ongoing</p>
              <p className="text-4xl font-bold text-white">{stats.ongoing}</p>
              <p className="text-blue-300 text-xs">In progress services</p>
            </div>
          </div>
        </div>

        {/* Completed Services */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 p-6 hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="space-y-2">
              <p className="text-green-200 text-sm font-medium">Completed</p>
              <p className="text-4xl font-bold text-white">{stats.completed}</p>
              <p className="text-green-300 text-xs">Finished services</p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 p-6 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div className="space-y-2">
              <p className="text-amber-200 text-sm font-medium">Total Revenue</p>
              <p className="text-4xl font-bold text-white">₱{(stats.totalRevenue / 1000).toFixed(1)}K</p>
              <p className="text-amber-300 text-xs">Completed: ₱{(stats.completedRevenue / 1000).toFixed(1)}K</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Services Trend */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Monthly Service Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.monthlyData}>
              <defs>
                <linearGradient id="colorServices" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '12px',
                  color: '#fff'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="services" 
                stroke="#06b6d4" 
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorServices)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            Revenue Trend (₱K)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '12px',
                  color: '#fff'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="status" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '12px',
                  color: '#fff'
                }} 
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                {stats.statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service Type Distribution */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6 hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-pink-400" />
            Service Types
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.serviceTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.serviceTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '12px',
                  color: '#fff'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
