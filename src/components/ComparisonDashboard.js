import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, FileText, TestTube } from "lucide-react";


export function ComparisonDashboard({ clients, selectedYear, customYears }) {
  const comparisonYear = selectedYear - 1;

  const comparisonData = useMemo(() => {
    // Helper function to get month name
    const getMonthName = (monthIndex) => {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
    };

    const getRevenue = (client) => {
      if (Array.isArray(client.serviceTests) && client.serviceTests.length > 0) {
        return client.serviceTests.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      }
      return Number(client.amount) || 0;
    };

    // Helper to count unique customers by email (falls back to name)
    const countUniqueCustomers = (clientList) => {
      return new Set(
        clientList.map(c =>
          (c.email?.trim().toLowerCase()) || (c.name?.trim().toLowerCase())
        )
      ).size;
    };

    // Filter clients by year
    const currentYearClients = clients.filter(c => {
      const year = new Date(c.dateRequested).getFullYear();
      return year === selectedYear;
    });

    const previousYearClients = clients.filter(c => {
      const year = new Date(c.dateRequested).getFullYear();
      return year === comparisonYear;
    });

    // Monthly services comparison
    const monthlyServicesData = [];
    for (let month = 0; month < 12; month++) {
      const currentMonthClients = currentYearClients.filter(c => {
        const date = new Date(c.dateRequested);
        return date.getMonth() === month;
      });

      const previousMonthClients = previousYearClients.filter(c => {
        const date = new Date(c.dateRequested);
        return date.getMonth() === month;
      });

      monthlyServicesData.push({
        month: getMonthName(month),
        [selectedYear]: currentMonthClients.length,
        [comparisonYear]: previousMonthClients.length,
      });
    }

    // Monthly customers comparison (unique clients)
    const monthlyCustomersData = [];
    for (let month = 0; month < 12; month++) {
      const currentMonthClients = currentYearClients.filter(c => {
        const date = new Date(c.dateRequested);
        return date.getMonth() === month;
      });

      const previousMonthClients = previousYearClients.filter(c => {
        const date = new Date(c.dateRequested);
        return date.getMonth() === month;
      });

      monthlyCustomersData.push({
        month: getMonthName(month),
        [selectedYear]: countUniqueCustomers(currentMonthClients),
        [comparisonYear]: countUniqueCustomers(previousMonthClients),
      });
    }

    // Material Testing Services by month
    const monthlyMaterialTestingData = [];
    for (let month = 0; month < 12; month++) {
      const currentMonthMT = currentYearClients.filter(c => {
        const date = new Date(c.dateRequested);
        return date.getMonth() === month && (c.serviceType === 'Material Testing' || c.serviceType === 'Both');
      });

      const previousMonthMT = previousYearClients.filter(c => {
        const date = new Date(c.dateRequested);
        return date.getMonth() === month && (c.serviceType === 'Material Testing' || c.serviceType === 'Both');
      });

      monthlyMaterialTestingData.push({
        month: getMonthName(month),
        [selectedYear]: currentMonthMT.length,
        [comparisonYear]: previousMonthMT.length,
      });
    }

    // FTIR Testing Services by month
    const monthlyFTIRData = [];
    for (let month = 0; month < 12; month++) {
      const currentMonthFTIR = currentYearClients.filter(c => {
        const date = new Date(c.dateRequested);
        return date.getMonth() === month && c.testTypes && c.testTypes.includes('FTIR');
      });

      const previousMonthFTIR = previousYearClients.filter(c => {
        const date = new Date(c.dateRequested);
        return date.getMonth() === month && c.testTypes && c.testTypes.includes('FTIR');
      });

      monthlyFTIRData.push({
        month: getMonthName(month),
        [selectedYear]: currentMonthFTIR.length,
        [comparisonYear]: previousMonthFTIR.length,
      });
    }

    // Services Offer Comparison Table
    const currentYearStats = {
      totalServices: currentYearClients.length,
      totalIncome: currentYearClients.reduce((sum, c) => sum + getRevenue(c), 0),      
      totalCustomers: countUniqueCustomers(currentYearClients),
      materialTesting: currentYearClients.filter(c => c.serviceType === 'Material Testing' || c.serviceType === 'Both').length,
      calibration: currentYearClients.filter(c => c.serviceType === 'Calibration' || c.serviceType === 'Both').length,
    };

    const previousYearStats = {
      totalServices: previousYearClients.length,
      totalIncome: previousYearClients.reduce((sum, c) => sum + getRevenue(c), 0),
      totalCustomers: countUniqueCustomers(previousYearClients),
      materialTesting: previousYearClients.filter(c => c.serviceType === 'Material Testing' || c.serviceType === 'Both').length,
      calibration: previousYearClients.filter(c => c.serviceType === 'Calibration' || c.serviceType === 'Both').length,
    };

    // Individual Services by Category for current year
    const categories = ['BatStateU College', 'Private HEIs', 'Industry', 'Private Individual', 'Senior High', 'BatStateU IS'];
    const currentYearCategoryData = [];
    for (let month = 0; month < 12; month++) {
      const monthData = { month: getMonthName(month) };
      
      categories.forEach(category => {
        const monthCategoryClients = currentYearClients.filter(c => {
          const date = new Date(c.dateRequested);
          return date.getMonth() === month && c.category === category;
        });
        monthData[category] = monthCategoryClients.length;
      });

      currentYearCategoryData.push(monthData);
    }

    // Individual Services by Category for previous year
    const previousYearCategoryData = [];
    for (let month = 0; month < 12; month++) {
      const monthData = { month: getMonthName(month) };
      
      categories.forEach(category => {
        const monthCategoryClients = previousYearClients.filter(c => {
          const date = new Date(c.dateRequested);
          return date.getMonth() === month && c.category === category;
        });
        monthData[category] = monthCategoryClients.length;
      });

      previousYearCategoryData.push(monthData);
    }

    return {
      monthlyServicesData,
      monthlyCustomersData,
      monthlyMaterialTestingData,
      monthlyFTIRData,
      currentYearStats,
      previousYearStats,
      currentYearCategoryData,
      previousYearCategoryData,
    };
  }, [clients, selectedYear, comparisonYear]);

  const categoryColors = {
    'BatStateU College': '#ef4444',
    'Private HEIs': '#10b981',
    'Industry': '#f59e0b',
    'Private Individual': '#3b82f6',
    'Senior High': '#8b5cf6',
    'BatStateU IS': '#06b6d4',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-6">
        <h2 className="text-3xl font-bold text-white mb-2">Year-over-Year Comparison</h2>
        <p className="text-purple-200">Comparing {selectedYear} vs {comparisonYear} performance metrics</p>
      </div>

      {/* Services Offer Comparison Table */}
      <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          MTCC Services Offer Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm font-bold text-cyan-300 uppercase">Metric</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-cyan-300 uppercase">{comparisonYear}</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-cyan-300 uppercase">{selectedYear}</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-cyan-300 uppercase">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-white font-semibold">Total Services</td>
                <td className="px-6 py-4 text-center text-gray-300">{comparisonData.previousYearStats.totalServices}</td>
                <td className="px-6 py-4 text-center text-gray-300">{comparisonData.currentYearStats.totalServices}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${
                    comparisonData.currentYearStats.totalServices >= comparisonData.previousYearStats.totalServices
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {comparisonData.currentYearStats.totalServices >= comparisonData.previousYearStats.totalServices ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4 rotate-180" />
                    )}
                    {comparisonData.currentYearStats.totalServices - comparisonData.previousYearStats.totalServices}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-white font-semibold">Total Customers</td>
                <td className="px-6 py-4 text-center text-gray-300">{comparisonData.previousYearStats.totalCustomers}</td>
                <td className="px-6 py-4 text-center text-gray-300">{comparisonData.currentYearStats.totalCustomers}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${
                    comparisonData.currentYearStats.totalCustomers >= comparisonData.previousYearStats.totalCustomers
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {comparisonData.currentYearStats.totalCustomers >= comparisonData.previousYearStats.totalCustomers ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4 rotate-180" />
                    )}
                    {comparisonData.currentYearStats.totalCustomers - comparisonData.previousYearStats.totalCustomers}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-white font-semibold">Total Income</td>
                <td className="px-6 py-4 text-center text-gray-300">₱{comparisonData.previousYearStats.totalIncome.toLocaleString()}</td>
                <td className="px-6 py-4 text-center text-gray-300">₱{comparisonData.currentYearStats.totalIncome.toLocaleString()}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${
                    comparisonData.currentYearStats.totalIncome >= comparisonData.previousYearStats.totalIncome
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {comparisonData.currentYearStats.totalIncome >= comparisonData.previousYearStats.totalIncome ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4 rotate-180" />
                    )}
                    ₱{Math.abs(comparisonData.currentYearStats.totalIncome - comparisonData.previousYearStats.totalIncome).toLocaleString()}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-white font-semibold">Material Testing</td>
                <td className="px-6 py-4 text-center text-gray-300">{comparisonData.previousYearStats.materialTesting}</td>
                <td className="px-6 py-4 text-center text-gray-300">{comparisonData.currentYearStats.materialTesting}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${
                    comparisonData.currentYearStats.materialTesting >= comparisonData.previousYearStats.materialTesting
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {comparisonData.currentYearStats.materialTesting >= comparisonData.previousYearStats.materialTesting ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4 rotate-180" />
                    )}
                    {comparisonData.currentYearStats.materialTesting - comparisonData.previousYearStats.materialTesting}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-white font-semibold">Calibration</td>
                <td className="px-6 py-4 text-center text-gray-300">{comparisonData.previousYearStats.calibration}</td>
                <td className="px-6 py-4 text-center text-gray-300">{comparisonData.currentYearStats.calibration}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${
                    comparisonData.currentYearStats.calibration >= comparisonData.previousYearStats.calibration
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {comparisonData.currentYearStats.calibration >= comparisonData.previousYearStats.calibration ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4 rotate-180" />
                    )}
                    {comparisonData.currentYearStats.calibration - comparisonData.previousYearStats.calibration}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Services Tally - Current Year */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6">{selectedYear} MTCC Services Tally</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={comparisonData.monthlyServicesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey={selectedYear}
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ fill: '#06b6d4', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Services Tally - Previous Year */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6">{comparisonYear} MTCC Services Tally</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={comparisonData.monthlyServicesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey={comparisonYear}
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Tally Comparison */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            {comparisonYear} vs {selectedYear} MTCC Customer Tally
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData.monthlyCustomersData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend
                formatter={(value) => <span style={{ color: '#fff', fontSize: '12px' }}>{value}</span>}
              />
              <Bar dataKey={comparisonYear} name={String(comparisonYear)} fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey={selectedYear} name={String(selectedYear)} fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Material Testing Services Comparison */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TestTube className="w-5 h-5 text-green-400" />
            {comparisonYear} - {selectedYear} Material Testing Services
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData.monthlyMaterialTestingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend
                formatter={(value) => <span style={{ color: '#fff', fontSize: '12px' }}>{value}</span>}
              />
              <Bar dataKey={comparisonYear} name={String(comparisonYear)} fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey={selectedYear} name={String(selectedYear)} fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Individual Services - Current Year */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6">{selectedYear} Individual MTCC Services Tally</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={comparisonData.currentYearCategoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {Object.keys(categoryColors).map((category) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={categoryColors[category]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Individual Services - Previous Year */}
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6">{comparisonYear} Individual MTCC Services Tally</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={comparisonData.previousYearCategoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {Object.keys(categoryColors).map((category) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={categoryColors[category]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>
      </div>
  );
}