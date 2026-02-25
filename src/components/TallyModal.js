import { useMemo, useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { startOfQuarter, endOfQuarter, isWithinInterval } from 'date-fns';
import { TEST_TYPE_LABELS } from "./types";
import ExcelJS from 'exceljs';
import axios from 'axios';

// All test types matching AddClientModal
const ALL_TEST_TYPES = ['FTIR', 'CN', 'CT', 'FT', 'BT', 'TS', 'HT', 'MO', 'CTT', 'RE', 'UC', 'FD', 'HP', 'O'];

// Service tally headers (test type columns) — amount per test type
const TEST_HEADERS = ['FTIR', 'CN', 'CT', 'FT', 'BT', 'TS', 'HT', 'MO', 'CTT', 'RE', 'UC', 'FD', 'HP', 'O'];

// Material Testing test types (all except FTIR and CN)
const MATERIAL_TESTING_TYPES = ['CT', 'FT', 'BT', 'TS', 'HT', 'MO', 'CTT', 'RE', 'UC', 'FD', 'HP', 'O'];

 // Helper: parse testTypes (handles string or array)
  const parseTestTypes = (testTypes) => {
    if (!testTypes) return [];
    if (Array.isArray(testTypes)) return testTypes;
    if (typeof testTypes === 'string') {
      return testTypes
        .replace(/^"|"$/g, '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
    }
    return [];
  };

  // Helper: get amount for a specific test type from serviceTests array
  const getAmountForTestType = (client, testType) => {
    if (Array.isArray(client.serviceTests) && client.serviceTests.length > 0) {
      return client.serviceTests
        .filter(t => t.testType === testType)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    }
    // Fallback: if testTypes includes this type, use flat amount (legacy)
    const types = parseTestTypes(client.testTypes);
    if (types.includes(testType) && types.length > 0) {
      return (Number(client.amount) || 0) / types.length;
    }
    return 0;
  };

  // Helper: get total amount across ALL test types for a client
  const getTotalAmount = (client) => {
    if (Array.isArray(client.serviceTests) && client.serviceTests.length > 0) {
      return client.serviceTests.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    }
    return Number(client.amount) || 0;
  };

  // Helper: get sample count for a specific test type from serviceTests
  const getSampleCountForTestType = (client, testType) => {
    if (Array.isArray(client.serviceTests) && client.serviceTests.length > 0) {
      return client.serviceTests
        .filter(t => t.testType === testType)
        .reduce((sum, t) => sum + (Number(t.sampleCount) || 0), 0);
    }
    // Fallback
    const types = parseTestTypes(client.testTypes);
    if (types.includes(testType)) {
      return Number(client.sampleCount) || 0;
    }
    return 0;
  };
  
export function TallyModal({ isOpen, onClose, customYears, allClients = [] }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  const [reportType, setReportType] = useState('service'); // 'service' or 'samples'

  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    if (isOpen) {
      axios.get('http://192.168.100.182:5000/categories')
        .then((categoriesRes) => {
          const saved = categoriesRes.data.map(cat => cat.company);
          setDbCategories(saved);
        })
        .catch(err => console.error("Error fetching categories:", err));
    }
  }, [isOpen]);

  const allCategories = useMemo(() => {
    const hardcoded = [
      'BatStateU College',
      'Private HEIs',
      'Private Individual',
      'Industry',
      'Senior High',
      'BatStateU IS',
    ];
    return [...hardcoded, ...dbCategories.filter(s => !hardcoded.includes(s))];
  }, [dbCategories]);

  // Get unique years from ALL clients in database
  const availableYears = useMemo(() => {
    const years = new Set();
    if (customYears && Array.isArray(customYears)) {
      customYears.forEach(year => years.add(year));
    }
    allClients.forEach(client => {
      if (client.dateRequested) {
        const date = new Date(client.dateRequested);
        const year = date.getFullYear();
        if (!isNaN(year) && year > 1900 && year < 2100) {
          years.add(year);
        }
      }
    });
    const yearArray = Array.from(years).sort((a, b) => b - a);
    return yearArray.length > 0 ? yearArray : [new Date().getFullYear()];
  }, [allClients, customYears]);

 

  // Filter clients by selected year
  const yearFilteredClients = useMemo(() => {
    return allClients.filter(client => {
      if (!client.dateRequested) return false;
      const date = new Date(client.dateRequested);
      return date.getFullYear() === selectedYear;
    }).map(client => ({
      ...client,
      testTypes: parseTestTypes(client.testTypes)
    }));
  }, [allClients, selectedYear]);

  // ── WHOLE YEAR SUMMARY DATA ──────────────────────────────────────────────────
  const wholeYearData = useMemo(() => {
    const data = allCategories.map(categoryName => {
      const categoryClients = yearFilteredClients.filter(c => c.category === categoryName);

      const uniqueClientNames = new Set(
        categoryClients.map(c => c.name?.toLowerCase().trim()).filter(Boolean)
      );
      const uniqueClients = uniqueClientNames.size;
      const serviceRequests = categoryClients.length;
      const totalIncome = categoryClients.reduce((sum, c) => sum + getTotalAmount(c), 0);
      const totalSamples = categoryClients.reduce((sum, c) => {
        if (Array.isArray(c.serviceTests) && c.serviceTests.length > 0) {
          return sum + c.serviceTests.reduce((s, t) => s + (Number(t.sampleCount) || 0), 0);
        }
        return sum + (Number(c.sampleCount) || 0);
      }, 0);

      // Per test type: count of service requests that include this test type
      const getTestTypeCount = (testType) =>
        categoryClients.filter(c => c.testTypes.includes(testType)).length;

      // Per test type: INCOME (sum of amounts for that test type across all clients)
      const getTestTypeIncome = (testType) =>
        categoryClients.reduce((sum, c) => sum + getAmountForTestType(c, testType), 0);

      // Per test type: sample count
      const getSampleCountByTestType = (testType) =>
        categoryClients.reduce((sum, c) => sum + getSampleCountForTestType(c, testType), 0);

      const materialTestingSamples = categoryClients.reduce((sum, c) => {
        const hasMT = c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type));
        if (hasMT) {
          if (Array.isArray(c.serviceTests) && c.serviceTests.length > 0) {
            return sum + c.serviceTests
              .filter(t => MATERIAL_TESTING_TYPES.includes(t.testType))
              .reduce((s, t) => s + (Number(t.sampleCount) || 0), 0);
          }
          return sum + (Number(c.sampleCount) || 0);
        }
        return sum;
      }, 0);

      const materialTestingCount = categoryClients.filter(c =>
        c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type))
      ).length;

      // Build per-test-type objects
      const serviceByType = {};
      const incomeByType = {};
      const samplesByType = {};
      ALL_TEST_TYPES.forEach(type => {
        serviceByType[type] = getTestTypeCount(type);
        incomeByType[type] = getTestTypeIncome(type);
        samplesByType[type] = getSampleCountByTestType(type);
      });

      return {
        category: categoryName,
        noOfClient: uniqueClients,
        noOfServices: serviceRequests,
        income: totalIncome,
        bioTech: 0,
        materialTesting: materialTestingCount,
        totalSamples,
        materialTestingSamples,
        service: serviceByType,
        income_by_type: incomeByType,
        samples: samplesByType,
      };
    });

    // Service totals row
    const serviceTotals = {
      category: 'Total Income',
      noOfClient: data.reduce((s, d) => s + d.noOfClient, 0),
      noOfServices: data.reduce((s, d) => s + d.noOfServices, 0),
      income: data.reduce((s, d) => s + d.income, 0),
      bioTech: 0,
      materialTesting: data.reduce((s, d) => s + d.materialTesting, 0),
    };
    ALL_TEST_TYPES.forEach(type => {
      serviceTotals[`income_${type}`] = data.reduce((s, d) => s + (d.income_by_type[type] || 0), 0);
    });

    // Samples totals row
    const samplesTotals = {
      category: 'Total Samples',
      totalSamples: data.reduce((s, d) => s + d.totalSamples, 0),
      materialTesting: data.reduce((s, d) => s + d.materialTestingSamples, 0),
    };
    ALL_TEST_TYPES.forEach(type => {
      samplesTotals[`samples_${type}`] = data.reduce((s, d) => s + (d.samples[type] || 0), 0);
    });

    return { data, serviceTotals, samplesTotals };
  }, [yearFilteredClients, allCategories]);

  // ── SERVICE TALLY BY QUARTER ─────────────────────────────────────────────────
    const serviceTallyDataByQuarter = useMemo(() => {
      const quarters = [1, 2, 3, 4];

      const quarterlyResults = quarters.map(quarter => {
        const getQuarterlyData = (categoryName) => {
          const start = startOfQuarter(new Date(selectedYear, (quarter - 1) * 3, 1));
          const end = endOfQuarter(new Date(selectedYear, (quarter - 1) * 3, 1));

          const categoryClients = yearFilteredClients.filter(c => {
            const date = new Date(c.dateRequested);
            return c.category === categoryName && isWithinInterval(date, { start, end });
          });

          const uniqueClients = new Set(
            categoryClients.map(c => c.name?.toLowerCase().trim()).filter(Boolean)
          ).size;
          const serviceRequests = categoryClients.length;
          const totalIncome = categoryClients.reduce((sum, c) => sum + getTotalAmount(c), 0);

          const materialTestingCount = categoryClients.filter(c =>
            c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type))
          ).length;

          const incomeByType = {};
          ALL_TEST_TYPES.forEach(type => {
            incomeByType[type] = categoryClients.reduce((sum, c) => sum + getAmountForTestType(c, type), 0);
          });

          return {
            category: categoryName,
            noOfClient: uniqueClients,
            noOfServices: serviceRequests,
            income: totalIncome,
            bioTech: 0,
            materialTesting: materialTestingCount,
            income_by_type: incomeByType,
          };
        };

        const data = allCategories.map(getQuarterlyData);

        const totals = {
          category: 'Total Income',
          noOfClient: data.reduce((s, d) => s + d.noOfClient, 0),
          noOfServices: data.reduce((s, d) => s + d.noOfServices, 0),
          income: data.reduce((s, d) => s + d.income, 0),
          bioTech: 0,
          materialTesting: data.reduce((s, d) => s + d.materialTesting, 0),
          income_by_type: {},
        };
        ALL_TEST_TYPES.forEach(type => {
          totals.income_by_type[type] = data.reduce((s, d) => s + (d.income_by_type[type] || 0), 0);
        });

        return { quarter, data, totals };
      });

      const grandTotals = {
        category: 'Grand Total',
        noOfClient: quarterlyResults.reduce((s, q) => s + q.totals.noOfClient, 0),
        noOfServices: quarterlyResults.reduce((s, q) => s + q.totals.noOfServices, 0),
        income: quarterlyResults.reduce((s, q) => s + q.totals.income, 0),
        bioTech: 0,
        materialTesting: quarterlyResults.reduce((s, q) => s + q.totals.materialTesting, 0),
        income_by_type: {},
      };
      ALL_TEST_TYPES.forEach(type => {
        grandTotals.income_by_type[type] = quarterlyResults.reduce((s, q) => s + (q.totals.income_by_type[type] || 0), 0);
      });

      return { quarterlyResults, grandTotals };
    }, [yearFilteredClients, selectedYear, allCategories]);

    // ── SAMPLES TALLY BY QUARTER ─────────────────────────────────────────────────
    const samplesTallyDataByQuarter = useMemo(() => {
      const quarters = [1, 2, 3, 4];

      const quarterlyResults = quarters.map(quarter => {
        const getQuarterlyData = (categoryName) => {
          const start = startOfQuarter(new Date(selectedYear, (quarter - 1) * 3, 1));
          const end = endOfQuarter(new Date(selectedYear, (quarter - 1) * 3, 1));

          const categoryClients = yearFilteredClients.filter(c => {
            const date = new Date(c.dateRequested);
            return c.category === categoryName && isWithinInterval(date, { start, end });
          });

          const totalSamples = categoryClients.reduce((sum, c) => {
            if (Array.isArray(c.serviceTests) && c.serviceTests.length > 0) {
              return sum + c.serviceTests.reduce((s, t) => s + (Number(t.sampleCount) || 0), 0);
            }
            return sum + (Number(c.sampleCount) || 0);
          }, 0);

          const samplesByType = {};
          ALL_TEST_TYPES.forEach(type => {
            samplesByType[type] = categoryClients.reduce((sum, c) => sum + getSampleCountForTestType(c, type), 0);
          });

          const materialTestingSamples = categoryClients.reduce((sum, c) => {
            const hasMT = c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type));
            if (hasMT) {
              if (Array.isArray(c.serviceTests) && c.serviceTests.length > 0) {
                return sum + c.serviceTests
                  .filter(t => MATERIAL_TESTING_TYPES.includes(t.testType))
                  .reduce((s, t) => s + (Number(t.sampleCount) || 0), 0);
              }
              return sum + (Number(c.sampleCount) || 0);
            }
            return sum;
          }, 0);

          return {
            category: categoryName,
            totalSamples,
            materialTesting: materialTestingSamples,
            samples: samplesByType,
          };
        };

        const data = allCategories.map(getQuarterlyData);

        const totals = {
          category: 'Total Samples',
          totalSamples: data.reduce((s, d) => s + d.totalSamples, 0),
          materialTesting: data.reduce((s, d) => s + d.materialTesting, 0),
          samples: {},
        };
        ALL_TEST_TYPES.forEach(type => {
          totals.samples[type] = data.reduce((s, d) => s + (d.samples[type] || 0), 0);
        });

        return { quarter, data, totals };
      });

      const grandTotals = {
        category: 'Grand Total',
        totalSamples: quarterlyResults.reduce((s, q) => s + q.totals.totalSamples, 0),
        materialTesting: quarterlyResults.reduce((s, q) => s + q.totals.materialTesting, 0),
        samples: {},
      };
      ALL_TEST_TYPES.forEach(type => {
        grandTotals.samples[type] = quarterlyResults.reduce((s, q) => s + (q.totals.samples[type] || 0), 0);
      });

      return { quarterlyResults, grandTotals };
    }, [yearFilteredClients, selectedYear, allCategories]);

    const tallyDataByQuarter = reportType === 'service' ? serviceTallyDataByQuarter : samplesTallyDataByQuarter;

    const displayedQuarters = useMemo(() => {
      if (selectedQuarter === 'all') return tallyDataByQuarter.quarterlyResults;
      return tallyDataByQuarter.quarterlyResults.filter(q => q.quarter === parseInt(selectedQuarter));
    }, [tallyDataByQuarter.quarterlyResults, selectedQuarter]);

    const displayedGrandTotals = useMemo(() => {
      if (selectedQuarter === 'all') return tallyDataByQuarter.grandTotals;
      const filteredQuarter = displayedQuarters[0];
      if (!filteredQuarter) return tallyDataByQuarter.grandTotals;

      if (reportType === 'service') {
        return {
          category: 'Grand Total',
          noOfClient: filteredQuarter.totals.noOfClient,
          noOfServices: filteredQuarter.totals.noOfServices,
          income: filteredQuarter.totals.income,
          bioTech: filteredQuarter.totals.bioTech,
          materialTesting: filteredQuarter.totals.materialTesting,
          income_by_type: { ...filteredQuarter.totals.income_by_type },
        };
      } else {
        return {
          category: 'Grand Total',
          totalSamples: filteredQuarter.totals.totalSamples,
          materialTesting: filteredQuarter.totals.materialTesting,
          samples: { ...filteredQuarter.totals.samples },
        };
      }
    }, [displayedQuarters, selectedQuarter, tallyDataByQuarter.grandTotals, reportType]);

  const getCategoryColor = (category) => {
    const customColors = JSON.parse(localStorage.getItem('customCategoryColors') || '{}');
    if (customColors[category]) return customColors[category];
    const colors = {
      'BatStateU College': 'bg-red-500/20 border-red-500/50',
      'Private Individual': 'bg-blue-500/20 border-blue-500/50',
      'Industry': 'bg-orange-500/20 border-orange-500/50',
      'Senior High': 'bg-purple-500/20 border-purple-500/50',
      'BatStateU IS': 'bg-indigo-500/20 border-indigo-500/50',
    };
    return colors[category] || 'bg-red-500/20 border-gray-500/50';
  };

  const getQuarterColor = (quarter) => {
    const colors = [
      'from-blue-500/20 to-cyan-500/20 border-blue-500/50',
      'from-yellow-500/20 to-amber-500/20 border-yellow-500/50',
      'from-green-500/20 to-emerald-500/20 border-green-500/50',
      'from-purple-500/20 to-indigo-500/20 border-purple-500/50',
    ];
    return colors[quarter - 1] || colors[0];
  };

  // ── FORMAT HELPERS ───────────────────────────────────────────────────────────
  const formatPeso = (val) =>
    val > 0 ? `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '₱0';

  // ── EXPORT TO EXCEL ──────────────────────────────────────────────────────────
  const exportToExcel = async () => {
    const customCategoryColors = JSON.parse(localStorage.getItem('customCategoryColors') || '{}');

    try {
      const workbook = new ExcelJS.Workbook();
      const quarterText = selectedQuarter === 'all' ? 'All Quarters' : `Q${selectedQuarter}`;
      const reportName = reportType === 'service' ? 'Services' : 'Samples';
      const ws = workbook.addWorksheet(`${reportName} ${selectedYear} ${quarterText}`);

      const logoResponse = await fetch('/BSULOGO.png');
      const logoBlob = await logoResponse.blob();
      const logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(logoBlob);
      });
      const logoId = workbook.addImage({ base64: logoBase64, extension: 'png' });

      const categories = allCategories;

      const applyCategoryFill = (cell, categoryName, categoryColors) => {
        const hex = customCategoryColors[categoryName];
        if (hex) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex.replace('#', '')}` } };
        } else if (categoryColors[categoryName]) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: categoryColors[categoryName] } };
        }
      };

      const safeMerge = (ws, startRow, endRow, col) => {
        if (endRow > startRow) ws.mergeCells(`${col}${startRow}:${col}${endRow}`);
      };

      const thinBorder = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };

      ws.getRow(1).height = 15;

      // ── SERVICE TALLY EXPORT ───────────────────────────────────────────────
      if (reportType === 'service') {
        const categoryColors = {
          'BatStateU College': 'FFF4CCCC', 'Private HEIs': 'FFD9EAD3',
          'Private Individual': 'FFCFE2F3', 'Industry': 'FFFCE5CD',
          'Senior High': 'FFEAD1DC', 'BatStateU IS': 'FFD0E0E3',
        };

        // Total columns: B(Period) C(Category) D(UniqueClients) E(Services) F(Income) G(BioTech) H(MatTesting) + 14 test types
        // Columns: B=2, C=3, D=4, E=5, F=6, G=7, H=8, then I(9)..V(22) for 14 test types
        const totalCols = 22; // B through V

        // Color banding per test-type column (col index, 1-based)
        // Col 9=FTIR, 10=CN, 11=CT, 12=FT, 13=BT, 14=TS, 15=HT, 16=MO, 17=CTT (UTM group)
        // Col 18=RE, 19=UC, 20=FD, 21=HP, 22=O (NDT group)
        const serviceTestTypeColors = {
          9:  'F2DCDB', 10: 'F2DCDB',                         // FTIR, CN — light red
          11: 'DAEEF3', 12: 'DAEEF3', 13: 'DAEEF3',           // CT, FT, BT — light blue
          14: 'DAEEF3', 15: 'DAEEF3', 16: 'DAEEF3', 17: 'DAEEF3', // TS, HT, MO, CTT — light blue
          18: 'FFF2CC', 19: 'FFF2CC', 20: 'FFF2CC',           // RE, UC, FD — light yellow
          21: 'FFF2CC', 22: 'FFF2CC',                         // HP, O — light yellow
        };

        ws.mergeCells(`B2:V9`);
        const headerCell = ws.getCell('B2');
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F9438' } };
        headerCell.border = thinBorder;
        ws.addImage(logoId, { tl: { col: 2.9, row: 2 }, br: { col: 3.5, row: 8.3 }, editAs: 'oneCell' });
        headerCell.value = [
          'Republic of the Philippines',
          'BATANGAS STATE UNIVERSITY',
          'The National Engineering University',
          'Alangilan Campus, Batangas City, Philippines 4200',
          'Science, Technology, Engineering, and Environment Research (STEER) Hub',
          '',
          'MATERIAL TESTING AND CALIBRATION CENTER',
          'https://batstate-u.edu.ph/ | mtcc@g.batstate-u.edu.ph | local no. 2401',
        ].join('\n');
        headerCell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF000000' } };
        headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        for (let i = 2; i <= 9; i++) ws.getRow(i).height = 20;

        ws.mergeCells('B10:V10');
        const titleCell = ws.getCell('B10');
        titleCell.value = `${selectedYear} MATERIAL TESTING SERVICES OFFER - ${quarterText}`;
        titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF000000' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F9438' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.border = thinBorder;
        ws.getRow(10).height = 25;

        // Row 11: group headers
        ws.getRow(11).values = ['', 'Period', 'Types Of Client', 'No. of Unique\nClient',
          'No. of Service\nRequest', 'Total Income', 'Bio Tech\nTesting', 'Material\nTesting',
          ...ALL_TEST_TYPES.map(t => t)];
        // Row 12: sub-headers (only test types need no sub-header, merge row 11-12 for non-test cols)
        ws.getRow(12).values = ['', '', '', '', '', '', '', '', ...ALL_TEST_TYPES.map(() => 'Income')];

        ws.mergeCells('B11:B12'); ws.mergeCells('C11:C12'); ws.mergeCells('D11:D12');
        ws.mergeCells('E11:E12'); ws.mergeCells('F11:F12'); ws.mergeCells('G11:G12');
        ws.mergeCells('H11:H12');
        // Merge each test type col rows 11-12
        for (let col = 9; col <= 9 + ALL_TEST_TYPES.length - 1; col++) {
          ws.mergeCells(11, col, 12, col);
        }

        for (let col = 2; col <= totalCols; col++) {
          for (let row = 11; row <= 12; row++) {
            const cell = ws.getCell(row, col);
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F6228' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = thinBorder;
          }
        }

        const writeServiceDataRow = (ws, rowNum, row) => {
          const excelRow = ws.getRow(rowNum);
          const incomeValues = ALL_TEST_TYPES.map(type => row.income_by_type[type] || 0);
          excelRow.values = ['', '', row.category,
            row.noOfClient, row.noOfServices, row.income,
            row.bioTech, row.materialTesting,
            ...incomeValues];

          for (let col = 2; col <= totalCols; col++) {
            const cell = excelRow.getCell(col);
            cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = thinBorder;
            if (col === 3) {
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
              applyCategoryFill(cell, row.category, categoryColors);
            }
            if (col === 6 || col >= 9) {
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              if (typeof cell.value === 'number' && cell.value > 0) {
                cell.numFmt = '"₱"#,##0.00';
              }
            }
            if (typeof cell.value === 'number' && col !== 6 && col < 9) cell.numFmt = '#,##0';
            // Color banding for test type columns
            if (serviceTestTypeColors[col]) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: serviceTestTypeColors[col] } };
            }
          }
        };

        const writeServiceTotalRow = (ws, rowNum, totals, label) => {
          const totalRow = ws.getRow(rowNum);
          const incomeValues = ALL_TEST_TYPES.map(type => totals.income_by_type?.[type] || 0);
          totalRow.values = ['', '', label,
            totals.noOfClient, totals.noOfServices, totals.income,
            totals.bioTech, totals.materialTesting,
            ...incomeValues];

          for (let col = 2; col <= totalCols; col++) {
            const cell = totalRow.getCell(col);
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '000000' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9D9D9' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = thinBorder;
            if (col === 3) cell.alignment = { horizontal: 'left', vertical: 'middle' };
            if (col === 6 || col >= 9) {
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              if (typeof cell.value === 'number' && cell.value > 0) cell.numFmt = '"₱"#,##0.00';
            }
            if (typeof cell.value === 'number' && col !== 6 && col < 9) cell.numFmt = '#,##0';
            // Color banding for test type columns (overrides grey)
            if (serviceTestTypeColors[col]) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: serviceTestTypeColors[col] } };
            }
          }
        };

        const writePeriodCells = (ws, labelCell, startDateCell, endDateCell, label, startDate, endDate) => {
          const periodStyle = {
            font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F4E78' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } },
            border: thinBorder,
          };
          labelCell.value = label;
          Object.assign(labelCell, periodStyle);
          labelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          startDateCell.value = startDate;
          Object.assign(startDateCell, { ...periodStyle, font: { ...periodStyle.font, size: 9 } });
          startDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
          endDateCell.value = endDate;
          Object.assign(endDateCell, { ...periodStyle, font: { ...periodStyle.font, size: 9 } });
          endDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
        };

        let currentRow = 13;

        if (selectedQuarter === 'all') {
          const yearStartRow = currentRow;
          const yearData = categories.map(categoryName => {
            const categoryClients = yearFilteredClients.filter(c => c.category === categoryName);
            const uniqueClients = new Set(categoryClients.map(c => c.name?.toLowerCase().trim()).filter(Boolean)).size;
            const totalIncome = categoryClients.reduce((sum, c) => sum + getTotalAmount(c), 0);
            const incomeByType = {};
            ALL_TEST_TYPES.forEach(type => {
              incomeByType[type] = categoryClients.reduce((sum, c) => sum + getAmountForTestType(c, type), 0);
            });
            return {
              category: categoryName,
              noOfClient: uniqueClients,
              noOfServices: categoryClients.length,
              income: totalIncome,
              bioTech: 0,
              materialTesting: categoryClients.filter(c => c.testTypes.some(t => MATERIAL_TESTING_TYPES.includes(t))).length,
              income_by_type: incomeByType,
            };
          });

          yearData.forEach(row => { writeServiceDataRow(ws, currentRow, row); currentRow++; });

          const yearTotals = {
            noOfClient: yearData.reduce((s, d) => s + d.noOfClient, 0),
            noOfServices: yearData.reduce((s, d) => s + d.noOfServices, 0),
            income: yearData.reduce((s, d) => s + d.income, 0),
            bioTech: 0,
            materialTesting: yearData.reduce((s, d) => s + d.materialTesting, 0),
            income_by_type: {},
          };
          ALL_TEST_TYPES.forEach(type => {
            yearTotals.income_by_type[type] = yearData.reduce((s, d) => s + (d.income_by_type[type] || 0), 0);
          });

          writeServiceTotalRow(ws, currentRow, yearTotals, 'Total Income');
          currentRow++;

          safeMerge(ws, yearStartRow, currentRow - 3, 'B');
          writePeriodCells(
            ws, ws.getCell(`B${yearStartRow}`), ws.getCell(`B${currentRow - 2}`), ws.getCell(`B${currentRow - 1}`),
            `\n${selectedYear}`,
            new Date(selectedYear, 0, 1).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            new Date(selectedYear, 11, 31).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          );
        }

        displayedQuarters.forEach((qData) => {
          const startRow = currentRow;
          qData.data.forEach(row => { writeServiceDataRow(ws, currentRow, row); currentRow++; });
          writeServiceTotalRow(ws, currentRow, qData.totals, 'Total Income');
          currentRow++;
          safeMerge(ws, startRow, currentRow - 3, 'B');
          const qStart = startOfQuarter(new Date(selectedYear, (qData.quarter - 1) * 3, 1));
          const qEnd = endOfQuarter(new Date(selectedYear, (qData.quarter - 1) * 3, 1));
          writePeriodCells(
            ws, ws.getCell(`B${startRow}`), ws.getCell(`B${currentRow - 2}`), ws.getCell(`B${currentRow - 1}`),
            `Quarter ${qData.quarter}`,
            qStart.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            qEnd.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          );
        });

        writeServiceTotalRow(ws, currentRow, displayedGrandTotals, 'Grand Total');
        for (let col = 2; col <= totalCols; col++) {
          const cell = ws.getRow(currentRow).getCell(col);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F6228' } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        }

        ws.getColumn(1).width = 3; ws.getColumn(2).width = 12; ws.getColumn(3).width = 22;
        ws.getColumn(4).width = 12; ws.getColumn(5).width = 12; ws.getColumn(6).width = 15;
        ws.getColumn(7).width = 10; ws.getColumn(8).width = 13;
        for (let col = 9; col <= totalCols; col++) ws.getColumn(col).width = 12;

      // ── SAMPLES TALLY EXPORT ─────────────────────────────────────────────────
      } else {
        const categoryColors = {
          'BatStateU College': 'FFF4CCCC', 'Private HEIs': 'FFD9EAD3',
          'Private Individual': 'FFCFE2F3', 'Industry': 'FFFCE5CD',
          'Senior High': 'FFEAD1DC', 'BatStateU IS': 'FFD0E0E3',
        };

        // B(Period) C(Category) D(TotalSamples) E(FTIR) F(MatTesting) G..T (12 remaining types)
        // 14 test types + 4 fixed = 18 cols total (B..S = col 2..19)
        const totalCols = 19;

        ws.mergeCells(`B2:S9`);
        const headerCell = ws.getCell('B2');
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F9438' } };
        headerCell.border = thinBorder;
        ws.addImage(logoId, { tl: { col: 1.3, row: 2 }, br: { col: 2.9, row: 8.3 }, editAs: 'oneCell' });
        headerCell.value = [
          'Republic of the Philippines', 'BATANGAS STATE UNIVERSITY', 'The National Engineering University',
          'Alangilan Campus, Batangas City, Philippines 4200',
          'Science, Technology, Engineering, and Environment Research (STEER) Hub',
          '', 'MATERIAL TESTING AND CALIBRATION CENTER',
          'https://batstate-u.edu.ph/ | mtcc@g.batstate-u.edu.ph | local no. 2401',
        ].join('\n');
        headerCell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF000000' } };
        headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        for (let i = 2; i <= 9; i++) ws.getRow(i).height = 20;

        ws.mergeCells('B10:S10');
        const titleCell = ws.getCell('B10');
        titleCell.value = `${selectedYear} MATERIAL TESTING SAMPLES TALLY - ${quarterText}`;
        titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF000000' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F9438' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.border = thinBorder;
        ws.getRow(10).height = 25;

        ws.getRow(11).values = ['', 'Period', 'Types Of Client', 'Sample Total\nPer Client Type',
          'FTIR', 'Material\nTesting', ...ALL_TEST_TYPES.filter(t => !['FTIR', 'CN'].includes(t))];
        ws.getRow(12).values = ['', '', '', '', '', '', ...ALL_TEST_TYPES.filter(t => !['FTIR', 'CN'].includes(t)).map(() => '')];

        ws.mergeCells('B11:B12'); ws.mergeCells('C11:C12'); ws.mergeCells('D11:D12');
        ws.mergeCells('E11:E12'); ws.mergeCells('F11:F12');
        for (let col = 7; col <= totalCols; col++) {
          ws.mergeCells(11, col, 12, col);
        }

        for (let col = 2; col <= totalCols; col++) {
          for (let row = 11; row <= 12; row++) {
            const cell = ws.getCell(row, col);
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F6228' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = thinBorder;
          }
        }

        const mtTypes = ALL_TEST_TYPES.filter(t => !['FTIR', 'CN'].includes(t));

        // Color banding for samples columns:
        // D=4(TotalSamples) — no color
        // E=5(FTIR)         — light red
        // F=6(MatTesting)   — light red
        // G=7(CT) H=8(FT) I=9(BT) J=10(TS) K=11(HT) L=12(MO) M=13(CTT) — light blue (UTM group)
        // N=14(RE) O=15(UC) P=16(FD) Q=17(HP) R=18(O) — light yellow (NDT group)
        const samplesTestTypeColors = {
          5:  'F2DCDB', // FTIR
          6:  'F2DCDB', // Material Testing
          7:  'DAEEF3', 8:  'DAEEF3', 9:  'DAEEF3', 10: 'DAEEF3',  // CT, FT, BT, TS
          11: 'DAEEF3', 12: 'DAEEF3', 13: 'DAEEF3',                // HT, MO, CTT
          14: 'FFF2CC', 15: 'FFF2CC', 16: 'FFF2CC',                // RE, UC, FD
          17: 'FFF2CC', 18: 'FFF2CC',                              // HP, O
        };

        const writeSamplesDataRow = (ws, rowNum, row) => {
          const excelRow = ws.getRow(rowNum);
          excelRow.values = ['', '', row.category,
            row.totalSamples,
            row.samples?.['FTIR'] || 0,
            row.materialTesting || 0,
            ...mtTypes.map(type => row.samples?.[type] || 0)];
          for (let col = 2; col <= totalCols; col++) {
            const cell = excelRow.getCell(col);
            cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = thinBorder;
            if (col === 3) {
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
              applyCategoryFill(cell, row.category, categoryColors);
            }
            if (typeof cell.value === 'number') cell.numFmt = '#,##0';
            // Color banding for test type columns
            if (samplesTestTypeColors[col]) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: samplesTestTypeColors[col] } };
            }
          }
        };

        const writeSamplesTotalRow = (ws, rowNum, totals, label) => {
          const totalRow = ws.getRow(rowNum);
          totalRow.values = ['', '', label,
            totals.totalSamples,
            totals.samples?.['FTIR'] || 0,
            totals.materialTesting || 0,
            ...mtTypes.map(type => totals.samples?.[type] || 0)];
          for (let col = 2; col <= totalCols; col++) {
            const cell = totalRow.getCell(col);
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '000000' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9D9D9' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = thinBorder;
            if (col === 3) cell.alignment = { horizontal: 'left', vertical: 'middle' };
            if (typeof cell.value === 'number') cell.numFmt = '#,##0';
            // Color banding overrides grey on test type columns
            if (samplesTestTypeColors[col]) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: samplesTestTypeColors[col] } };
            }
          }
        };

        const writePeriodCells = (ws, labelCell, startDateCell, endDateCell, label, startDate, endDate) => {
          const periodStyle = {
            font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F4E78' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } },
            border: thinBorder,
          };
          labelCell.value = label;
          Object.assign(labelCell, periodStyle);
          labelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          startDateCell.value = startDate;
          Object.assign(startDateCell, { ...periodStyle, font: { ...periodStyle.font, size: 9 } });
          startDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
          endDateCell.value = endDate;
          Object.assign(endDateCell, { ...periodStyle, font: { ...periodStyle.font, size: 9 } });
          endDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
        };

        let currentRow = 12;

        if (selectedQuarter === 'all') {
          const yearStartRow = currentRow;
          const yearData = categories.map(categoryName => {
            const categoryClients = yearFilteredClients.filter(c => c.category === categoryName);
            const totalSamples = categoryClients.reduce((sum, c) => {
              if (Array.isArray(c.serviceTests) && c.serviceTests.length > 0)
                return sum + c.serviceTests.reduce((s, t) => s + (Number(t.sampleCount) || 0), 0);
              return sum + (Number(c.sampleCount) || 0);
            }, 0);
            const samplesByType = {};
            ALL_TEST_TYPES.forEach(type => {
              samplesByType[type] = categoryClients.reduce((sum, c) => sum + getSampleCountForTestType(c, type), 0);
            });
            const materialTestingSamples = categoryClients.reduce((sum, c) => {
              const hasMT = c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type));
              if (hasMT) {
                if (Array.isArray(c.serviceTests) && c.serviceTests.length > 0)
                  return sum + c.serviceTests.filter(t => MATERIAL_TESTING_TYPES.includes(t.testType)).reduce((s, t) => s + (Number(t.sampleCount) || 0), 0);
                return sum + (Number(c.sampleCount) || 0);
              }
              return sum;
            }, 0);
            return { category: categoryName, totalSamples, samples: samplesByType, materialTesting: materialTestingSamples };
          });

          yearData.forEach(row => { writeSamplesDataRow(ws, currentRow, row); currentRow++; });

          const yearTotals = {
            totalSamples: yearData.reduce((s, d) => s + d.totalSamples, 0),
            materialTesting: yearData.reduce((s, d) => s + d.materialTesting, 0),
            samples: {},
          };
          ALL_TEST_TYPES.forEach(type => {
            yearTotals.samples[type] = yearData.reduce((s, d) => s + (d.samples[type] || 0), 0);
          });

          writeSamplesTotalRow(ws, currentRow, yearTotals, 'Total Samples');
          currentRow++;

          safeMerge(ws, yearStartRow, currentRow - 3, 'B');
          writePeriodCells(
            ws, ws.getCell(`B${yearStartRow}`), ws.getCell(`B${currentRow - 2}`), ws.getCell(`B${currentRow - 1}`),
            `\n${selectedYear}`,
            new Date(selectedYear, 0, 1).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            new Date(selectedYear, 11, 31).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          );
        }

        displayedQuarters.forEach((qData) => {
          const startRow = currentRow;
          qData.data.forEach(row => { writeSamplesDataRow(ws, currentRow, row); currentRow++; });
          writeSamplesTotalRow(ws, currentRow, qData.totals, 'Total Samples');
          currentRow++;
          safeMerge(ws, startRow, currentRow - 3, 'B');
          const qStart = startOfQuarter(new Date(selectedYear, (qData.quarter - 1) * 3, 1));
          const qEnd = endOfQuarter(new Date(selectedYear, (qData.quarter - 1) * 3, 1));
          writePeriodCells(
            ws, ws.getCell(`B${startRow}`), ws.getCell(`B${currentRow - 2}`), ws.getCell(`B${currentRow - 1}`),
            `Quarter ${qData.quarter}`,
            qStart.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            qEnd.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          );
        });

        writeSamplesTotalRow(ws, currentRow, displayedGrandTotals, 'Grand Total');
        for (let col = 2; col <= totalCols; col++) {
          const cell = ws.getRow(currentRow).getCell(col);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F6228' } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        }

        ws.getColumn(1).width = 3; ws.getColumn(2).width = 12; ws.getColumn(3).width = 22;
        ws.getColumn(4).width = 18; ws.getColumn(5).width = 10; ws.getColumn(6).width = 13;
        for (let col = 7; col <= totalCols; col++) ws.getColumn(col).width = 10;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportName}_Tally_Report_${selectedYear}_${quarterText}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert(`Failed to export to Excel: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  // ── RENDER HELPERS ───────────────────────────────────────────────────────────
  const CategoryCell = ({ category }) => {
    const color = getCategoryColor(category);
    const isHex = color.startsWith('#');
    return (
      <td
        className={`px-3 py-3 text-sm font-semibold text-white border-r border-white/10 whitespace-nowrap ${!isHex ? color : ''}`}
        style={{ backgroundColor: isHex ? `${color}44` : undefined }}
      >
        {category}
      </td>
    );
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-[98vw] max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl">

        {/* ── STICKY HEADER ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <div className="flex items-center gap-4 flex-1">
            <div>
              <h2 className="text-xl font-bold text-white">
                {reportType === 'service' ? 'Service Tally Report' : 'Samples Tally Report'}
              </h2>
              <p className="text-blue-200 text-xs mt-0.5">
                {reportType === 'service'
                  ? 'Income breakdown by category and test type'
                  : 'Sample count breakdown by client type and test type'}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-auto mr-4 flex-wrap">
              <label className="text-white text-sm font-semibold">Report:</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="service" className="bg-slate-800">Service Tally</option>
                <option value="samples" className="bg-slate-800">Samples Tally</option>
              </select>
              <label className="text-white text-sm font-semibold">Year:</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                {availableYears.map(year => (
                  <option key={year} value={year} className="bg-slate-800">{year}</option>
                ))}
              </select>
              <label className="text-white text-sm font-semibold">Quarter:</label>
              <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="all" className="bg-slate-800">All Quarters</option>
                <option value="1" className="bg-slate-800">Q1</option>
                <option value="2" className="bg-slate-800">Q2</option>
                <option value="3" className="bg-slate-800">Q3</option>
                <option value="4" className="bg-slate-800">Q4</option>
              </select>
              <button onClick={exportToExcel}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-sm">
                <Download className="w-4 h-4" />Export Excel
              </button>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">

          {/* ════════════════════════════════════════════
              SERVICE TALLY
          ════════════════════════════════════════════ */}
          {reportType === 'service' && (
            <>
              {/* Whole Year Summary */}
              {selectedQuarter === 'all' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-white px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/50">
                    Whole Year Summary — {selectedYear}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 border-b border-rose-500/50">
                          <th className="px-3 py-2 text-left font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Type of Client</th>
                          <th className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Unique Clients</th>
                          <th className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Service Requests</th>
                          <th className="px-3 py-2 text-right font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Total Income</th>
                          <th className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Bio Tech</th>
                          <th className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Mat. Testing</th>
                          {TEST_HEADERS.map(type => (
                            <th key={type} className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap" title={TEST_TYPE_LABELS?.[type] || type}>
                              {type}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {wholeYearData.data.map((row, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <CategoryCell category={row.category} />
                            <td className="px-3 py-3 text-center text-gray-300 border-r border-white/10">{row.noOfClient}</td>
                            <td className="px-3 py-3 text-center text-gray-300 border-r border-white/10">{row.noOfServices}</td>
                            <td className="px-3 py-3 text-right font-semibold text-green-300 border-r border-white/10">
                              ₱{row.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-300 border-r border-white/10">{row.bioTech}</td>
                            <td className="px-3 py-3 text-center text-gray-300 border-r border-white/10">{row.materialTesting}</td>
                            {TEST_HEADERS.map(type => (
                              <td key={type} className="px-3 py-3 text-right text-pink-300 border-r border-white/10 whitespace-nowrap">
                                {row.income_by_type[type] > 0 ? formatPeso(row.income_by_type[type]) : '₱0'}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {/* Total row */}
                        <tr className="bg-gradient-to-r from-rose-500/30 to-pink-500/30 border-t-2 border-rose-500/60 font-bold">
                          <td className="px-3 py-3 text-white border-r border-white/10">Total Income</td>
                          <td className="px-3 py-3 text-center text-white border-r border-white/10">{wholeYearData.serviceTotals.noOfClient}</td>
                          <td className="px-3 py-3 text-center text-white border-r border-white/10">{wholeYearData.serviceTotals.noOfServices}</td>
                          <td className="px-3 py-3 text-right text-green-300 border-r border-white/10">
                            ₱{wholeYearData.serviceTotals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-center text-white border-r border-white/10">0</td>
                          <td className="px-3 py-3 text-center text-white border-r border-white/10">{wholeYearData.serviceTotals.materialTesting}</td>
                          {TEST_HEADERS.map(type => (
                            <td key={type} className="px-3 py-3 text-right text-pink-300 border-r border-white/10 whitespace-nowrap">
                              {(wholeYearData.serviceTotals[`income_${type}`] || 0) > 0
                                ? formatPeso(wholeYearData.serviceTotals[`income_${type}`])
                                : '₱0'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Quarterly Tables */}
              {displayedQuarters.map(({ quarter, data, totals }) => (
                <div key={quarter} className="space-y-3">
                  <h3 className={`text-lg font-bold text-white px-4 py-2 rounded-lg bg-gradient-to-r ${getQuarterColor(quarter)} border`}>
                    Quarter {quarter} - {selectedYear}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className={`bg-gradient-to-r ${getQuarterColor(quarter)} border-b`}>
                          <th className="px-3 py-2 text-left font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Type of Client</th>
                          <th className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Unique Clients</th>
                          <th className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Service Requests</th>
                          <th className="px-3 py-2 text-right font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Total Income</th>
                          <th className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Bio Tech</th>
                          <th className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Mat. Testing</th>
                          {TEST_HEADERS.map(type => (
                            <th key={type} className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap" title={TEST_TYPE_LABELS?.[type] || type}>
                              {type}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.map((row, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <CategoryCell category={row.category} />
                            <td className="px-3 py-3 text-center text-gray-300 border-r border-white/10">{row.noOfClient}</td>
                            <td className="px-3 py-3 text-center text-gray-300 border-r border-white/10">{row.noOfServices}</td>
                            <td className="px-3 py-3 text-right font-semibold text-green-300 border-r border-white/10">
                              ₱{row.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-300 border-r border-white/10">{row.bioTech}</td>
                            <td className="px-3 py-3 text-center text-gray-300 border-r border-white/10">{row.materialTesting}</td>
                            {TEST_HEADERS.map(type => (
                              <td key={type} className="px-3 py-3 text-right text-pink-300 border-r border-white/10 whitespace-nowrap">
                                {(row.income_by_type[type] || 0) > 0 ? formatPeso(row.income_by_type[type]) : '₱0'}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className={`bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-t-2 border-amber-500/50 font-bold`}>
                          <td className="px-3 py-3 text-white border-r border-white/10">Total Income</td>
                          <td className="px-3 py-3 text-center text-white border-r border-white/10">{totals.noOfClient}</td>
                          <td className="px-3 py-3 text-center text-white border-r border-white/10">{totals.noOfServices}</td>
                          <td className="px-3 py-3 text-right text-green-300 border-r border-white/10">
                            ₱{totals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-center text-white border-r border-white/10">0</td>
                          <td className="px-3 py-3 text-center text-white border-r border-white/10">{totals.materialTesting}</td>
                          {TEST_HEADERS.map(type => (
                            <td key={type} className="px-3 py-3 text-right text-pink-300 border-r border-white/10 whitespace-nowrap">
                              {(totals.income_by_type[type] || 0) > 0 ? formatPeso(totals.income_by_type[type]) : '₱0'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Grand Total Summary Card */}
              <div className="rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 p-5">
                <h3 className="text-xl font-bold text-white mb-3">
                  Grand Total — {selectedYear} {selectedQuarter !== 'all' ? `(Q${selectedQuarter})` : ''}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-xs text-green-200">Total Clients</p><p className="text-2xl font-bold text-white">{displayedGrandTotals.noOfClient}</p></div>
                  <div><p className="text-xs text-green-200">Total Services</p><p className="text-2xl font-bold text-white">{displayedGrandTotals.noOfServices}</p></div>
                  <div><p className="text-xs text-green-200">Total Income</p><p className="text-2xl font-bold text-white">₱{(displayedGrandTotals.income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-xs text-green-200">Material Testing</p><p className="text-2xl font-bold text-white">{displayedGrandTotals.materialTesting}</p></div>
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════
              SAMPLES TALLY
          ════════════════════════════════════════════ */}
          {reportType === 'samples' && (
            <>
              {/* Whole Year Summary */}
              {selectedQuarter === 'all' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-white px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/50">
                    Whole Year Summary — {selectedYear}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 border-b border-rose-500/50">
                          <th className="px-3 py-2 text-left font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Type of Client</th>
                          <th className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Total Samples</th>
                          {ALL_TEST_TYPES.map(type => (
                            <th key={type} className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap" title={TEST_TYPE_LABELS?.[type] || type}>
                              {type}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {wholeYearData.data.map((row, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <CategoryCell category={row.category} />
                            <td className="px-3 py-3 text-center text-gray-300 border-r border-white/10">{row.totalSamples || 0}</td>
                            {ALL_TEST_TYPES.map(type => (
                              <td key={type} className="px-3 py-3 text-center text-pink-300 border-r border-white/10">
                                {row.samples[type] || 0}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="bg-gradient-to-r from-rose-500/30 to-pink-500/30 border-t-2 border-rose-500/60 font-bold">
                          <td className="px-3 py-3 text-white border-r border-white/10">Total Samples</td>
                          <td className="px-3 py-3 text-center text-white border-r border-white/10">{wholeYearData.samplesTotals.totalSamples || 0}</td>
                          {ALL_TEST_TYPES.map(type => (
                            <td key={type} className="px-3 py-3 text-center text-pink-300 border-r border-white/10">
                              {wholeYearData.samplesTotals[`samples_${type}`] || 0}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Quarterly Tables */}
              {displayedQuarters.map(({ quarter, data, totals }) => (
                <div key={quarter} className="space-y-3">
                  <h3 className={`text-lg font-bold text-white px-4 py-2 rounded-lg bg-gradient-to-r ${getQuarterColor(quarter)} border`}>
                    Quarter {quarter} - {selectedYear}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className={`bg-gradient-to-r ${getQuarterColor(quarter)} border-b`}>
                          <th className="px-3 py-2 text-left font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Type of Client</th>
                          <th className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap">Total Samples</th>
                          {ALL_TEST_TYPES.map(type => (
                            <th key={type} className="px-3 py-2 text-center font-bold text-white uppercase border-r border-white/10 whitespace-nowrap" title={TEST_TYPE_LABELS?.[type] || type}>
                              {type}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.map((row, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <CategoryCell category={row.category} />
                            <td className="px-3 py-3 text-center text-gray-300 border-r border-white/10">{row.totalSamples || 0}</td>
                            {ALL_TEST_TYPES.map(type => (
                              <td key={type} className="px-3 py-3 text-center text-pink-300 border-r border-white/10">
                                {row.samples[type] || 0}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-t-2 border-amber-500/50 font-bold">
                          <td className="px-3 py-3 text-white border-r border-white/10">Total Samples</td>
                          <td className="px-3 py-3 text-center text-white border-r border-white/10">{totals.totalSamples || 0}</td>
                          {ALL_TEST_TYPES.map(type => (
                            <td key={type} className="px-3 py-3 text-center text-pink-300 border-r border-white/10">
                              {totals.samples[type] || 0}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Grand Total Summary Card */}
              <div className="rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 p-5">
                <h3 className="text-xl font-bold text-white mb-3">
                  Grand Total — {selectedYear} {selectedQuarter !== 'all' ? `(Q${selectedQuarter})` : ''}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-xs text-green-200">Total Samples</p><p className="text-2xl font-bold text-white">{displayedGrandTotals.totalSamples}</p></div>
                  <div><p className="text-xs text-green-200">FTIR Samples</p><p className="text-2xl font-bold text-white">{displayedGrandTotals.samples?.['FTIR'] || 0}</p></div>
                  <div><p className="text-xs text-green-200">Material Testing</p><p className="text-2xl font-bold text-white">{displayedGrandTotals.materialTesting || 0}</p></div>
                  <div><p className="text-xs text-green-200">CT Samples</p><p className="text-2xl font-bold text-white">{displayedGrandTotals.samples?.['CT'] || 0}</p></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}