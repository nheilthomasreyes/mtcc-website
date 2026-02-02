import { useMemo, useState } from 'react';
import { X, Download } from 'lucide-react';
import { startOfQuarter, endOfQuarter, isWithinInterval } from 'date-fns';
import { TEST_TYPE_LABELS } from "./types";
import * as XLSX from 'xlsx-js-style';

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
    const wsData = [];
    const merges = [];

    // === 1. HEADER SECTION (Starting at B2) ===
    // Row 0: Empty row for top margin
    wsData.push(Array(17).fill(""));

    // Header text starting at B2
    const headerText = [
      "Republic of the Philippines",
      "BATANGAS STATE UNIVERSITY",
      "The National Engineering University",
      "Alangilan Campus, Batangas City, Philippines 4200",
      "Science, Technology, Engineering, and Environment Research (STEER) Hub",
      "",
      "MATERIAL TESTING AND CALIBRATION CENTER",
      "https://batstate-u.edu.ph/ | mtcc@g.batstate-u.edu.ph | local no. 2401"
    ].join("\n");
    
    // Rows 1-8: Header section (B2:B9 in Excel)
    for (let i = 0; i < 8; i++) {
      const row = ["", headerText]; // Column A empty, B has header
      for (let j = 2; j < 17; j++) {
        row.push("");
      }
      wsData.push(row);
    }
    
    // Merge B2:Q9 (rows 1-8, columns 1-16 in 0-indexed)
    merges.push({ s: { r: 1, c: 1 }, e: { r: 8, c: 16 } });

    // Row 9 (B10 in Excel): Report title
    const titleRow = ["", `${selectedYear} MTCC SERVICES OFFER`];
    for (let i = 2; i < 17; i++) titleRow.push("");
    wsData.push(titleRow);
    merges.push({ s: { r: 9, c: 1 }, e: { r: 9, c: 16 } });

    // === 2. TABLE HEADERS (Starting at B11) ===
    // Row 10 (B11 in Excel): Top-level headers
    const headerRow1 = Array(17).fill("");
    headerRow1[1] = "Period";
    headerRow1[2] = "Types Of Client";
    headerRow1[3] = "No. of Unique\nClient";
    headerRow1[4] = "No. of\nServices";
    headerRow1[5] = "Income";
    headerRow1[6] = "Bio Tech\nTesting";
    headerRow1[7] = "Material\nTesting";
    headerRow1[8] = "FTIR";
    headerRow1[9] = "C";
    headerRow1[10] = "Universal Testing Machine";
    headerRow1[13] = "Non-Destructive Testing";
    headerRow1[16] = "CTT";
    wsData.push(headerRow1);

    // Row 11 (B12 in Excel): Sub-headers
    const headerRow2 = Array(17).fill("");
    headerRow2[10] = "CT";
    headerRow2[11] = "FT";
    headerRow2[12] = "BT";
    headerRow2[13] = "TS";
    headerRow2[14] = "HT";
    headerRow2[15] = "MO";
    wsData.push(headerRow2);

    // Header merges (adjusted for B11 start - row 10 in 0-indexed)
    const headerMerges = [
      { s: { r: 10, c: 1 }, e: { r: 11, c: 1 } },   // Period
      { s: { r: 10, c: 2 }, e: { r: 11, c: 2 } },   // Types
      { s: { r: 10, c: 3 }, e: { r: 11, c: 3 } },   // Unique Client
      { s: { r: 10, c: 4 }, e: { r: 11, c: 4 } },   // Services
      { s: { r: 10, c: 5 }, e: { r: 11, c: 5 } },   // Income
      { s: { r: 10, c: 6 }, e: { r: 11, c: 6 } },   // Bio Tech
      { s: { r: 10, c: 7 }, e: { r: 11, c: 7 } },   // Material
      { s: { r: 10, c: 8 }, e: { r: 11, c: 8 } },   // FTIR
      { s: { r: 10, c: 9 }, e: { r: 11, c: 9 } },   // C
      { s: { r: 10, c: 16 }, e: { r: 11, c: 16 } }, // CTT
      { s: { r: 10, c: 10 }, e: { r: 10, c: 12 } }, // Universal Testing Machine
      { s: { r: 10, c: 13 }, e: { r: 10, c: 15 } }, // Non-Destructive Testing
    ];
    merges.push(...headerMerges);

    // === 3. DATA POPULATION ===
    let currentRow = 12; // Starting at row 13 in Excel

    tallyDataByQuarter.quarterlyResults.forEach((qData) => {
      const startRow = currentRow;
      
      // Client category rows
      qData.data.forEach((row) => {
        const rowData = [
          "", // Column A - vacant
          "", // Period (will be merged) - Column B
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
          row.ctt
        ];
        wsData.push(rowData);
        currentRow++;
      });

      // Total Income row
      const totalRow = [
        "", // Column A - vacant
        "",
        "Total Income",
        qData.totals.noOfClient,
        qData.totals.noOfServices,
        qData.totals.income,
        qData.totals.bioTech,
        qData.totals.materialTesting,
        qData.totals.ftir,
        qData.totals.c,
        qData.totals.ct,
        qData.totals.ft,
        qData.totals.bt,
        qData.totals.ts,
        qData.totals.ht,
        qData.totals.mo,
        qData.totals.ctt
      ];
      wsData.push(totalRow);
      currentRow++;

      // Period column merge
      wsData[startRow][1] = `Quarter ${qData.quarter}\n${selectedYear}`;
      merges.push({ s: { r: startRow, c: 1 }, e: { r: currentRow - 1, c: 1 } });
    });

    // === 4. CREATE WORKSHEET ===
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    // Column widths
    ws['!cols'] = [
      { wch: 3 },   // Column A - vacant/narrow
      { wch: 12 },  // Period (Column B)
      { wch: 22 },  // Types Of Client
      { wch: 12 },  // Unique Client
      { wch: 12 },  // Services
      { wch: 15 },  // Income
      { wch: 10 },  // Bio Tech
      { wch: 13 },  // Material
      { wch: 8 },   // FTIR
      { wch: 6 },   // C
      { wch: 8 },   // CT
      { wch: 8 },   // FT
      { wch: 8 },   // BT
      { wch: 8 },   // TS
      { wch: 8 },   // HT
      { wch: 8 },   // MO
      { wch: 8 },   // CTT
    ];

    // Row heights
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 15 }; // Top margin row
    // Rows 2-9 (header section) - taller for better visibility
    for (let i = 1; i <= 8; i++) {
      ws['!rows'][i] = { hpt: 20 };
    }
    // Row 10 (report title)
    ws['!rows'][9] = { hpt: 25 };

    // === 5. STYLING ===
    const thinBorder = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };

    const mediumBorder = {
      top: { style: "medium", color: { rgb: "000000" } },
      bottom: { style: "medium", color: { rgb: "000000" } },
      left: { style: "medium", color: { rgb: "000000" } },
      right: { style: "medium", color: { rgb: "000000" } }
    };

    const noBorder = {
      top: { style: "none" },
      bottom: { style: "none" },
      left: { style: "none" },
      right: { style: "none" }
    };

    const categoryColors = {
      'BatStateU College': 'F4CCCC',
      'University Linkage': 'FFF2CC',
      'Private HEIs': 'D9EAD3',
      'Private Individual': 'CFE2F3',
      'Industry': 'FCE5CD',
      'Senior High': 'EAD1DC',
      'BatStateU IS': 'D0E0E3',
    };

    // Pre-populate all cells to ensure borders on merged cells
    for (let row = 0; row < wsData.length; row++) {
      for (let col = 0; col < 17; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellRef]) {
          ws[cellRef] = { v: "", t: "s" };
        }
      }
    }

    // Apply styles to all cells
    Object.keys(ws).forEach(key => {
      if (key.startsWith('!')) return;
      
      const { r, c } = XLSX.utils.decode_cell(key);
      
      if (c > 16) return;
      
      if (!ws[key]) {
        ws[key] = { v: "", t: "s" };
      }
      const workingCell = ws[key];

      // Row 0: Top margin - no border
      if (r === 0) {
        workingCell.s = {
          border: noBorder,
          fill: { fgColor: { rgb: "FFFFFF" } }
        };
        return;
      }

      // Column A - always vacant/no border
      if (c === 0) {
        workingCell.s = {
          border: noBorder,
          fill: { fgColor: { rgb: "FFFFFF" } }
        };
        return;
      }

      // === HEADER SECTION (Rows 1-8, Columns B-Q) ===
      if (r >= 1 && r <= 8 && c >= 1) {
        workingCell.s = {
          font: { name: "Times New Roman", sz: 11, bold: true, color: { rgb: "1F4E78" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          fill: { fgColor: { rgb: "DDEBF7" } },
          border: mediumBorder
        };
        
        // Special font sizes for specific rows
        if (r === 2 && c === 1) { // BATANGAS STATE UNIVERSITY (row 2 = B3 in Excel)
          workingCell.s.font.sz = 16;
        } else if (r === 7 && c === 1) { // MATERIAL TESTING... (row 7 = B8 in Excel)
          workingCell.s.font.sz = 14;
        }
      }

      // Row 9: Report title (Columns B-Q)
      if (r === 9 && c >= 1) {
        workingCell.s = {
          font: { name: "Times New Roman", sz: 14, bold: true, color: { rgb: "1F4E78" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          fill: { fgColor: { rgb: "BDD7EE" } },
          border: mediumBorder
        };
      }

      // === TABLE HEADERS (Rows 10-11, Columns B-Q) ===
      if ((r === 10 || r === 11) && c >= 1) {
        workingCell.s = {
          font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: thinBorder
        };
      }

      // === DATA ROWS (12+, Columns B-Q) ===
      if (r >= 12 && c >= 1) {
        const rowLabel = wsData[r] ? wsData[r][2] : "";
        
        // Default data cell style
        workingCell.s = {
          font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: thinBorder
        };

        // Period column (column B, index 1)
        if (c === 1) {
          workingCell.s.font.bold = true;
          workingCell.s.font.color = { rgb: "1F4E78" };
          workingCell.s.fill = { fgColor: { rgb: "E7E6E6" } };
        }
        
        // Types of Client column (column C, index 2) - left align with category colors
        if (c === 2) {
          workingCell.s.alignment.horizontal = "left";
          
          if (categoryColors[rowLabel]) {
            workingCell.s.fill = { fgColor: { rgb: categoryColors[rowLabel] } };
          }
          
          // Total Income row - bold with darker background
          if (rowLabel === "Total Income") {
            workingCell.s.font.bold = true;
            workingCell.s.font.color = { rgb: "FFFFFF" };
            workingCell.s.fill = { fgColor: { rgb: "8B7355" } };
          }
        }
        
        // Total Income row styling for all columns
        if (rowLabel === "Total Income") {
          workingCell.s.font.bold = true;
          workingCell.s.font.color = { rgb: "FFFFFF" };
          workingCell.s.fill = { fgColor: { rgb: "8B7355" } };
        }
        
        // Income column (column F, index 5) - right align
        if (c === 5) {
          workingCell.s.alignment.horizontal = "right";
        }
        
        // Number formatting
        if (typeof workingCell.v === 'number') {
          if (c === 5) {
            workingCell.z = '"₱"#,##0.00';
          } else {
            workingCell.z = '#,##0';
          }
        }
      }
    });

    // === FIX: Apply borders to all cells in merged ranges ===
    merges.forEach(merge => {
      for (let row = merge.s.r; row <= merge.e.r; row++) {
        for (let col = merge.s.c; col <= merge.e.c; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          
          // Skip column A and row 0
          if (col === 0 || row === 0) continue;
          
          // Ensure cell exists
          if (!ws[cellRef]) {
            ws[cellRef] = { v: "", t: "s", s: {} };
          }
          
          // Apply border to merged cells
          if (row >= 12) { // Data rows only
            if (!ws[cellRef].s) {
              ws[cellRef].s = {};
            }
            ws[cellRef].s.border = thinBorder;
            
            // Preserve other styling for Period column
            if (col === 1) {
              ws[cellRef].s.font = { name: "Calibri", sz: 10, bold: true, color: { rgb: "1F4E78" } };
              ws[cellRef].s.fill = { fgColor: { rgb: "E7E6E6" } };
              ws[cellRef].s.alignment = { horizontal: "center", vertical: "center", wrapText: true };
            }
          }
        }
      }
    });

    XLSX.utils.book_append_sheet(workbook, ws, `Services ${selectedYear}`);
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