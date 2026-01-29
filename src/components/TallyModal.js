import { useMemo, useState } from 'react';
import { X, Download } from 'lucide-react';
import { startOfQuarter, endOfQuarter, isWithinInterval } from 'date-fns';
import { TEST_TYPE_LABELS } from "./types";
import * as XLSX from 'xlsx';Z

{/*ALL LINES WITH TS ARE EDITED (TB - TS)*/}
const TEST_HEADERS = ['FTIR', 'C', 'CT', 'FT', 'BT', 'TS', 'HT', 'MO', 'CTT'];

export function TallyModal({ isOpen, onClose, clients, customYears }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
  const yearFilteredClients = useMemo(() => {
    return clients.filter(client => {
      const year = new Date(client.dateRequested).getFullYear();
      return year === selectedYear;
    });
  }, [clients, selectedYear]);

  const tallyDataByQuarter = useMemo(() => {
    const categories = ['BatStateU College', 'University Linkage', 'Private HEIs', 'Private Individual', 'Industry', 'Senior High', 'BatStateU IS'];
    const quarters = [1, 2, 3, 4];

    const quarterlyResults = quarters.map(quarter => {
      const getQuarterlyData = (categoryName) => {
        const start = startOfQuarter(new Date(selectedYear, (quarter - 1) * 3, 1));
        const end = endOfQuarter(new Date(selectedYear, (quarter - 1) * 3, 1));
        
        const categoryClients = yearFilteredClients.filter(c => {
          const matchCategory = c.category === categoryName || 
            (categoryName === 'University Linkage' && c.category === 'BatStateU IS'); // Map if needed
          const date = new Date(c.dateRequested);
          return matchCategory && isWithinInterval(date, { start, end });
        });

        const uniqueClients = new Set(categoryClients.map(c => c.id)).size;
        const totalIncome = categoryClients.reduce((sum, c) => sum + c.amount, 0);

        const getTestTypeCount = (testType) => {
          return categoryClients.filter(c => c.testTypes.includes(testType)).length;
        };

        return {
          category: categoryName,
          noOfClient: uniqueClients,
          noOfServices: categoryClients.length,
          income: totalIncome,
          bioTech: 0, // Placeholder
          materialTesting: categoryClients.filter(c => c.serviceType === 'Material Testing' || c.serviceType === 'Both').length,
          ftir: getTestTypeCount('FTIR'),
          c: 0, // Not in test types
          ct: getTestTypeCount('CT'),
          ft: getTestTypeCount('FT'),
          bt: getTestTypeCount('BT'),
          ts: getTestTypeCount('TS'),
          ht: getTestTypeCount('HT'),
          mo: getTestTypeCount('MO'),
          ctt: getTestTypeCount('CTT'),
        };
      };

      const data = categories.map(getQuarterlyData);
      
      // Calculate totals for the quarter
      const totals = {
        category: 'Total Income',
        noOfClient: data.reduce((sum, d) => sum + d.noOfClient, 0),
        noOfServices: data.reduce((sum, d) => sum + d.noOfServices, 0),
        income: data.reduce((sum, d) => sum + d.income, 0),
        bioTech: data.reduce((sum, d) => sum + d.bioTech, 0),
        materialTesting: data.reduce((sum, d) => sum + d.materialTesting, 0),
        ftir: data.reduce((sum, d) => sum + d.ftir, 0),
        c: data.reduce((sum, d) => sum + d.c, 0),
        ct: data.reduce((sum, d) => sum + d.ct, 0),
        ft: data.reduce((sum, d) => sum + d.ft, 0),
        bt: data.reduce((sum, d) => sum + d.bt, 0),
        ts: data.reduce((sum, d) => sum + d.ts, 0),
        ht: data.reduce((sum, d) => sum + d.ht, 0),
        mo: data.reduce((sum, d) => sum + d.mo, 0),
        ctt: data.reduce((sum, d) => sum + d.ctt, 0),
      };

      return { quarter, data, totals };
    });

    // Calculate grand totals
    const grandTotals = {
      category: 'Grand Total',
      noOfClient: quarterlyResults.reduce((sum, q) => sum + q.totals.noOfClient, 0),
      noOfServices: quarterlyResults.reduce((sum, q) => sum + q.totals.noOfServices, 0),
      income: quarterlyResults.reduce((sum, q) => sum + q.totals.income, 0),
      bioTech: quarterlyResults.reduce((sum, q) => sum + q.totals.bioTech, 0),
      materialTesting: quarterlyResults.reduce((sum, q) => sum + q.totals.materialTesting, 0),
      ftir: quarterlyResults.reduce((sum, q) => sum + q.totals.ftir, 0),
      c: quarterlyResults.reduce((sum, q) => sum + q.totals.c, 0),
      ct: quarterlyResults.reduce((sum, q) => sum + q.totals.ct, 0),
      ft: quarterlyResults.reduce((sum, q) => sum + q.totals.ft, 0),
      bt: quarterlyResults.reduce((sum, q) => sum + q.totals.bt, 0),
      ts: quarterlyResults.reduce((sum, q) => sum + q.totals.ts, 0),
      ht: quarterlyResults.reduce((sum, q) => sum + q.totals.ht, 0),
      mo: quarterlyResults.reduce((sum, q) => sum + q.totals.mo, 0),
      ctt: quarterlyResults.reduce((sum, q) => sum + q.totals.ctt, 0),
    };

    return { quarterlyResults, grandTotals };
  }, [yearFilteredClients, selectedYear]);

  const getCategoryColor = (category) => {
    const colors = {
      'BatStateU College': 'bg-red-500/20 border-red-500/50',
      'University Linkage': 'bg-yellow-500/20 border-yellow-500/50',
      'Private HEIs': 'bg-green-500/20 border-green-500/50',
      'Private Individual': 'bg-blue-500/20 border-blue-500/50',
      'Industry': 'bg-orange-500/20 border-orange-500/50',
      'Senior High': 'bg-purple-500/20 border-purple-500/50',
      'BatStateU IS': 'bg-indigo-500/20 border-indigo-500/50',
    };
    return colors[category] || 'bg-gray-500/20 border-gray-500/50';
  };

  const getQuarterColor = (quarter) => {
    const colors = [
      'from-blue-500/20 to-cyan-500/20 border-blue-500/50',  // Q1 - Blue
      'from-yellow-500/20 to-amber-500/20 border-yellow-500/50',  // Q2 - Yellow/Orange
      'from-green-500/20 to-emerald-500/20 border-green-500/50',  // Q3 - Green
      'from-purple-500/20 to-indigo-500/20 border-purple-500/50',  // Q4 - Purple/Blue
    ];
    return colors[quarter - 1] || colors[0];
  };

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Create worksheet data
      const wsData = [];
      
      // Header rows
      wsData.push(['Republic of the Philippines']);
      wsData.push(['BATANGAS STATE UNIVERSITY']);
      wsData.push(['Alangilan Campus, Batangas City, Philippine 4200']);
      wsData.push(['Science, Technology, Engineering and Environment Research (STEER) Hub']);
      wsData.push(['MATERIAL TESTING AND CALIBRATION CENTER']);
      wsData.push([`Service Report of the Year ${selectedYear}`]);
      wsData.push(['SUMMARY: REVENUE OFFICER']);
      wsData.push([]);
      
      // Table header
      wsData.push([
        'Types Of Client',
        'No. of Client',
        'No. of Services',
        'Income',
        'Big Tech Material Testing',
        'Material Testing As Per NSCP 2015',
        'FTIR',
        'C',
        'CT',
        'FT',
        'BT',
        'TS',
        'HT',
        'MO',
        'CTT',
        'TEMPLATE'
      ]);

      // Add data for each quarter
      tallyDataByQuarter.quarterlyResults.forEach(({ quarter, data, totals }) => {
        wsData.push([`${quarter}/4/2025`, ...Array(15).fill('')]); // Quarter header
        
        data.forEach(row => {
          wsData.push([
            row.category,
            row.noOfClient,
            row.noOfServices,
            row.income,
            row.bioTech,
            row.materialTesting,
            row.ftir,
            row.c,
            row.ct,
            row.ft,
            row.bt,
            row.ts,
            row.ht,
            row.mo,
            row.ctt,
            '' // TEMPLATE column
          ]);
        });

        // Monthly Report row (empty)
        wsData.push([
          'Monthly Report',
          ...Array(15).fill('')
        ]);

        // Total Income row
        wsData.push([
          totals.category,
          totals.noOfClient,
          totals.noOfServices,
          `₱${totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          totals.bioTech,
          totals.materialTesting,
          `₱${totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          `₱${totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          `₱${totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          `₱${totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          `₱${totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          `₱${totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          `₱${totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          `₱${totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          `₱${totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          '' // TEMPLATE column
        ]);
      });

      // Grand Total row
      wsData.push([
        tallyDataByQuarter.grandTotals.category,
        tallyDataByQuarter.grandTotals.noOfClient,
        tallyDataByQuarter.grandTotals.noOfServices,
        `₱${tallyDataByQuarter.grandTotals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        ...Array(12).fill('')
      ]);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 25 }, // Types Of Client
        { wch: 12 }, // No. of Client
        { wch: 12 }, // No. of Services
        { wch: 15 }, // Income
        { wch: 20 }, // Big Tech
        { wch: 25 }, // Material Testing
        { wch: 10 }, // FTIR
        { wch: 8 },  // C
        { wch: 8 },  // CT
        { wch: 8 },  // FT
        { wch: 8 },  // BT
        { wch: 8 },  // TS
        { wch: 8 },  // HT
        { wch: 8 },  // MO
        { wch: 10 }, // CTT
        { wch: 12 }  // TEMPLATE
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, ws, `Tally ${selectedYear}`);

      // Generate file and download
      XLSX.writeFile(workbook, `Service_Tally_Report_${selectedYear}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <div className="flex items-center gap-4 flex-1">
            <div>
              <h2 className="text-2xl font-bold text-white">Service Tally Report</h2>
              <p className="text-blue-200 text-sm mt-1">Quarterly breakdown by category and test types</p>
            </div>
            <div className="flex items-center gap-3 ml-auto mr-4">
              <label htmlFor="tally-year-filter" className="text-white font-semibold">Year:</label>
              <select
                id="tally-year-filter"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 hover:bg-white/20 transition-all"
              >
                {availableYears.map(year => (
                  <option key={year} value={year} className="bg-slate-800">{year}</option>
                ))}
              </select>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300 font-semibold"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {tallyDataByQuarter.quarterlyResults.map(({ quarter, data, totals }) => (
            <div key={quarter} className="space-y-4">
              <h3 className={`text-xl font-bold text-white px-4 py-2 rounded-lg bg-gradient-to-r ${getQuarterColor(quarter)} border`}>
                Quarter {quarter} - {selectedYear}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  
                  {/*EDITED UP TO LINE 345*/}
                  <thead>
                    <tr className={`bg-gradient-to-r ${getQuarterColor(quarter)} border-b`}>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border-r border-white/10">Type of Client</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10">No. of Client</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10">No. of Services</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase border-r border-white/10">Income</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10">Big Tech</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10">Material Testing</th>
                      {TEST_HEADERS.map((type) => (
                        <th 
                          key={type}
                          className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10"
                          title={TEST_TYPE_LABELS[type] || type} 
                        >
                          {type}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.map((row, index) => (
                      <tr key={index} className="hover:bg-white/5 transition-colors">
                        <td className={`px-4 py-3 text-sm font-semibold text-white border-r border-white/10 ${getCategoryColor(row.category)}`}>
                          {row.category}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-300 border-r border-white/10">{row.noOfClient}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-300 border-r border-white/10">{row.noOfServices}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-green-300 border-r border-white/10">
                          ₱{row.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-300 border-r border-white/10">{row.bioTech}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-300 border-r border-white/10">{row.materialTesting}</td>
                        <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.ftir}</td>
                        <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.c}</td>
                        <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.ct}</td>
                        <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.ft}</td>
                        <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.bt}</td>
                        <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.ts}</td>
                        <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.ht}</td>
                        <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.mo}</td>
                        <td className="px-4 py-3 text-center text-sm text-pink-300">{row.ctt}</td>
                      </tr>
                    ))}

                    {/* Total Income Row */}
                    <tr className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-t-2 border-amber-500/50">
                      <td className="px-4 py-4 text-sm font-bold text-white border-r border-white/10">{totals.category}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-white border-r border-white/10">{totals.noOfClient}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-white border-r border-white/10">{totals.noOfServices}</td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-green-300 border-r border-white/10">
                        ₱{totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-white border-r border-white/10">{totals.bioTech}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-white border-r border-white/10">{totals.materialTesting}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.ftir}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.c}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.ct}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.ft}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.bt}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.ts}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.ht}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.mo}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-pink-300">{totals.ctt}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Grand Total */}
          <div className="rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Grand Total - {selectedYear}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-green-200">Total Clients</p>
                <p className="text-3xl font-bold text-white">{tallyDataByQuarter.grandTotals.noOfClient}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-green-200">Total Services</p>
                <p className="text-3xl font-bold text-white">{tallyDataByQuarter.grandTotals.noOfServices}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-green-200">Total Income</p>
                <p className="text-3xl font-bold text-white">
                  ₱{tallyDataByQuarter.grandTotals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-green-200">Material Testing Services</p>
                <p className="text-3xl font-bold text-white">{tallyDataByQuarter.grandTotals.materialTesting}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
