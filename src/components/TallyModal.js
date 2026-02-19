import { useMemo, useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { startOfQuarter, endOfQuarter, isWithinInterval } from 'date-fns';
import { TEST_TYPE_LABELS } from "./types";
import ExcelJS from 'exceljs';
import axios from 'axios';

const TEST_HEADERS = ['FTIR', 'CN', 'CT', 'FT', 'BT', 'TS', 'HT', 'MO', 'CTT'];
const SAMPLES_TEST_HEADERS = ['FTIR', 'Material Testing', 'CT', 'FT', 'BT', 'TS', 'HT', 'MO', 'CTT'];

// Material Testing test types (all except FTIR and C)
const MATERIAL_TESTING_TYPES = ['CT', 'FT', 'BT', 'TS', 'HT', 'MO', 'CTT'];

export function TallyModal({ isOpen, onClose, customYears }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  const [reportType, setReportType] = useState('service'); // 'service' or 'samples'

  const [dbCategories, setDbCategories] = useState([]);
  const [allClients, setAllClients] = useState([]);

  useEffect(() => {
  if (isOpen) {
    Promise.all([
      axios.get('http://192.168.103.84:5000/categories'),
      axios.get('http://192.168.103.84:5000/clients')
    ])
      .then(([categoriesRes, clientsRes]) => {
        const saved = categoriesRes.data.map(cat => cat.company);
        setDbCategories(saved);
        setAllClients(clientsRes.data);
        console.log('Fetched all clients for TallyModal:', clientsRes.data.length);
      })
      .catch(err => console.error("Error fetching data:", err));
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
    
    // Add custom years if provided
    if (customYears && Array.isArray(customYears)) {
      customYears.forEach(year => years.add(year));
    }
    
    // Extract years from ALL clients
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
    
    console.log('Available years:', yearArray);
    console.log('Total clients in database:', allClients.length);
    
    return yearArray.length > 0 ? yearArray : [new Date().getFullYear()];
  }, [allClients, customYears]);

  // Helper function to parse testTypes (handles string or array)
  const parseTestTypes = (testTypes) => {
    if (!testTypes) return [];
    if (Array.isArray(testTypes)) return testTypes;
    if (typeof testTypes === 'string') {
      // Remove quotes and split by comma
      return testTypes
        .replace(/^"|"$/g, '') // Remove leading/trailing quotes
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
    }
    return [];
  };

  // Filter clients by selected year (using ALL clients from database)
  const yearFilteredClients = useMemo(() => {
    return allClients.filter(client => {
      if (!client.dateRequested) return false;
      
      const date = new Date(client.dateRequested);
      const year = date.getFullYear();
      
      return year === selectedYear;
    }).map(client => ({
      ...client,
      testTypes: parseTestTypes(client.testTypes)
    }));
  }, [allClients, selectedYear]);

  // WHOLE YEAR SUMMARY DATA (used when "All Quarters" is selected)
  const wholeYearData = useMemo(() => {
    const categories = allCategories;

    const data = categories.map(categoryName => {
      const categoryClients = yearFilteredClients.filter(c =>
        c.category === categoryName
      );

      // FIXED: Unique clients by name (case-insensitive)
      const uniqueClientNames = new Set(
        categoryClients.map(c => c.name?.toLowerCase().trim()).filter(Boolean)
      );
      const uniqueClients = uniqueClientNames.size;

      // Service requests = total number of rows (each row is a service request)
      const serviceRequests = categoryClients.length;

      const totalIncome = categoryClients.reduce((sum, c) => sum + (c.amount || 0), 0);
      
      // FIXED: Total samples = sum of all sampleCount values
      const totalSamples = categoryClients.reduce((sum, c) => sum + (c.sampleCount || 0), 0);

      const getTestTypeCount = (testType) =>
        categoryClients.filter(c => c.testTypes.includes(testType)).length;

      const getSampleCountByTestType = (testType) =>
        categoryClients.reduce((sum, c) => {
          if (c.testTypes.includes(testType)) return sum + (c.sampleCount || 0);
          return sum;
        }, 0);

      // FIXED: Material Testing should count samples that have ANY material testing test type
      const materialTestingSamples = categoryClients.reduce((sum, c) => {
        const hasMaterialTestingType = c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type));
        if (hasMaterialTestingType) {
          return sum + (c.sampleCount || 0);
        }
        return sum;
      }, 0);

      const materialTestingCount = categoryClients.filter(c => 
        c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type))
      ).length;

      return {
        category: categoryName,
        // service fields
        noOfClient: uniqueClients,
        noOfServices: serviceRequests,
        income: totalIncome,
        bioTech: 0,
        materialTesting: materialTestingCount,
        // samples fields
        totalSamples,
        materialTestingSamples,
        // shared test type fields (service = count, samples = sample count)
        service: {
          ftir: getTestTypeCount('FTIR'),
          c: getTestTypeCount('CN'),
          ct: getTestTypeCount('CT'),
          ft: getTestTypeCount('FT'),
          bt: getTestTypeCount('BT'),
          is: getTestTypeCount('TS'),
          ht: getTestTypeCount('HT'),
          mo: getTestTypeCount('MO'),
          ctt: getTestTypeCount('CTT'),
        },
        samples: {
          ftir: getSampleCountByTestType('FTIR'),
          ct: getSampleCountByTestType('CT'),
          ft: getSampleCountByTestType('FT'),
          bt: getSampleCountByTestType('BT'),
          is: getSampleCountByTestType('TS'),
          ht: getSampleCountByTestType('HT'),
          mo: getSampleCountByTestType('MO'),
          ctt: getSampleCountByTestType('CTT'),
        },
      };
    });

    const serviceTotals = {
      category: 'Total Income',
      noOfClient: data.reduce((s, d) => s + d.noOfClient, 0),
      noOfServices: data.reduce((s, d) => s + d.noOfServices, 0),
      income: data.reduce((s, d) => s + d.income, 0),
      bioTech: 0,
      materialTesting: data.reduce((s, d) => s + d.materialTesting, 0),
      ftir: data.reduce((s, d) => s + d.service.ftir, 0),
      c: data.reduce((s, d) => s + d.service.c, 0),
      ct: data.reduce((s, d) => s + d.service.ct, 0),
      ft: data.reduce((s, d) => s + d.service.ft, 0),
      bt: data.reduce((s, d) => s + d.service.bt, 0),
      is: data.reduce((s, d) => s + d.service.is, 0),
      ht: data.reduce((s, d) => s + d.service.ht, 0),
      mo: data.reduce((s, d) => s + d.service.mo, 0),
      ctt: data.reduce((s, d) => s + d.service.ctt, 0),
    };

    const samplesTotals = {
      category: 'Total Samples',
      totalSamples: data.reduce((s, d) => s + d.totalSamples, 0),
      ftir: data.reduce((s, d) => s + d.samples.ftir, 0),
      materialTesting: data.reduce((s, d) => s + d.materialTestingSamples, 0),
      ct: data.reduce((s, d) => s + d.samples.ct, 0),
      ft: data.reduce((s, d) => s + d.samples.ft, 0),
      bt: data.reduce((s, d) => s + d.samples.bt, 0),
      is: data.reduce((s, d) => s + d.samples.is, 0),
      ht: data.reduce((s, d) => s + d.samples.ht, 0),
      mo: data.reduce((s, d) => s + d.samples.mo, 0),
      ctt: data.reduce((s, d) => s + d.samples.ctt, 0),
    };

    return { data, serviceTotals, samplesTotals };
  }, [yearFilteredClients, allCategories]);

  // SERVICE TALLY DATA
  const serviceTallyDataByQuarter = useMemo(() => {
    const categories = allCategories;
    const quarters = [1, 2, 3, 4];

    const quarterlyResults = quarters.map(quarter => {
      const getQuarterlyData = (categoryName) => {
        const start = startOfQuarter(new Date(selectedYear, (quarter - 1) * 3, 1));
        const end = endOfQuarter(new Date(selectedYear, (quarter - 1) * 3, 1));
        
        const categoryClients = yearFilteredClients.filter(c => {
          const matchCategory = c.category === categoryName
          const date = new Date(c.dateRequested);
          return matchCategory && isWithinInterval(date, { start, end });
        });

        // FIXED: Unique clients by name (case-insensitive)
        const uniqueClientNames = new Set(
          categoryClients.map(c => c.name?.toLowerCase().trim()).filter(Boolean)
        );
        const uniqueClients = uniqueClientNames.size;

        // Service requests = total number of rows
        const serviceRequests = categoryClients.length;

        const totalIncome = categoryClients.reduce((sum, c) => sum + (c.amount || 0), 0);

        const getTestTypeCount = (testType) => {
          return categoryClients.filter(c => c.testTypes.includes(testType)).length;
        };

        // FIXED: Material Testing count based on test types, not serviceType field
        const materialTestingCount = categoryClients.filter(c => 
          c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type))
        ).length;

        return {
          category: categoryName,
          noOfClient: uniqueClients,
          noOfServices: serviceRequests,
          income: totalIncome,
          bioTech: 0,
          materialTesting: materialTestingCount,
          ftir: getTestTypeCount('FTIR'),
          c: getTestTypeCount('CN'),
          ct: getTestTypeCount('CT'),
          ft: getTestTypeCount('FT'),
          bt: getTestTypeCount('BT'),
          is: getTestTypeCount('TS'),
          ht: getTestTypeCount('HT'),
          mo: getTestTypeCount('MO'),
          ctt: getTestTypeCount('CTT'),
        };
      };

      const data = categories.map(getQuarterlyData);
      
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
        is: data.reduce((sum, d) => sum + d.is, 0),
        ht: data.reduce((sum, d) => sum + d.ht, 0),
        mo: data.reduce((sum, d) => sum + d.mo, 0),
        ctt: data.reduce((sum, d) => sum + d.ctt, 0),
      };

      return { quarter, data, totals };
    });

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
      is: quarterlyResults.reduce((sum, q) => sum + q.totals.is, 0),
      ht: quarterlyResults.reduce((sum, q) => sum + q.totals.ht, 0),
      mo: quarterlyResults.reduce((sum, q) => sum + q.totals.mo, 0),
      ctt: quarterlyResults.reduce((sum, q) => sum + q.totals.ctt, 0),
    };

    return { quarterlyResults, grandTotals };
  }, [yearFilteredClients, selectedYear, allCategories]);

  // SAMPLES TALLY DATA
  const samplesTallyDataByQuarter = useMemo(() => {
    const categories = allCategories;
    const quarters = [1, 2, 3, 4];

    const quarterlyResults = quarters.map(quarter => {
      const getQuarterlyData = (categoryName) => {
        const start = startOfQuarter(new Date(selectedYear, (quarter - 1) * 3, 1));
        const end = endOfQuarter(new Date(selectedYear, (quarter - 1) * 3, 1));
        
        const categoryClients = yearFilteredClients.filter(c => {
          const matchCategory = c.category === categoryName
          const date = new Date(c.dateRequested);
          return matchCategory && isWithinInterval(date, { start, end });
        });

        // FIXED: Total samples = sum of all sampleCount values
        const totalSamples = categoryClients.reduce((sum, c) => {
          return sum + (c.sampleCount || 0);
        }, 0);

        // Count samples per test type
        const getSampleCountByTestType = (testType) => {
          return categoryClients.reduce((sum, c) => {
            if (c.testTypes.includes(testType)) {
              return sum + (c.sampleCount || 0);
            }
            return sum;
          }, 0);
        };

        // FIXED: Material Testing samples = samples that have ANY material testing test type
        const materialTestingSamples = categoryClients.reduce((sum, c) => {
          const hasMaterialTestingType = c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type));
          if (hasMaterialTestingType) {
            return sum + (c.sampleCount || 0);
          }
          return sum;
        }, 0);

        return {
          category: categoryName,
          totalSamples: totalSamples,
          ftir: getSampleCountByTestType('FTIR'),
          materialTesting: materialTestingSamples,
          ct: getSampleCountByTestType('CT'),
          ft: getSampleCountByTestType('FT'),
          bt: getSampleCountByTestType('BT'),
          is: getSampleCountByTestType('TS'),
          ht: getSampleCountByTestType('HT'),
          mo: getSampleCountByTestType('MO'),
          ctt: getSampleCountByTestType('CTT'),
        };
      };

      const data = categories.map(getQuarterlyData);
      
      const totals = {
        category: 'Total Samples',
        totalSamples: data.reduce((sum, d) => sum + d.totalSamples, 0),
        ftir: data.reduce((sum, d) => sum + d.ftir, 0),
        materialTesting: data.reduce((sum, d) => sum + d.materialTesting, 0),
        ct: data.reduce((sum, d) => sum + d.ct, 0),
        ft: data.reduce((sum, d) => sum + d.ft, 0),
        bt: data.reduce((sum, d) => sum + d.bt, 0),
        is: data.reduce((sum, d) => sum + d.is, 0),
        ht: data.reduce((sum, d) => sum + d.ht, 0),
        mo: data.reduce((sum, d) => sum + d.mo, 0),
        ctt: data.reduce((sum, d) => sum + d.ctt, 0),
      };

      return { quarter, data, totals };
    });

    const grandTotals = {
      category: 'Grand Total',
      totalSamples: quarterlyResults.reduce((sum, q) => sum + q.totals.totalSamples, 0),
      ftir: quarterlyResults.reduce((sum, q) => sum + q.totals.ftir, 0),
      materialTesting: quarterlyResults.reduce((sum, q) => sum + q.totals.materialTesting, 0),
      ct: quarterlyResults.reduce((sum, q) => sum + q.totals.ct, 0),
      ft: quarterlyResults.reduce((sum, q) => sum + q.totals.ft, 0),
      bt: quarterlyResults.reduce((sum, q) => sum + q.totals.bt, 0),
      is: quarterlyResults.reduce((sum, q) => sum + q.totals.is, 0),
      ht: quarterlyResults.reduce((sum, q) => sum + q.totals.ht, 0),
      mo: quarterlyResults.reduce((sum, q) => sum + q.totals.mo, 0),
      ctt: quarterlyResults.reduce((sum, q) => sum + q.totals.ctt, 0),
    };

    return { quarterlyResults, grandTotals };
  }, [yearFilteredClients, selectedYear, allCategories]);

  // Select the appropriate data based on report type
  const tallyDataByQuarter = reportType === 'service' ? serviceTallyDataByQuarter : samplesTallyDataByQuarter;

  // Filter quarters based on selection
  const displayedQuarters = useMemo(() => {
    if (selectedQuarter === 'all') {
      return tallyDataByQuarter.quarterlyResults;
    }
    return tallyDataByQuarter.quarterlyResults.filter(q => q.quarter === parseInt(selectedQuarter));
  }, [tallyDataByQuarter.quarterlyResults, selectedQuarter]);

  // Recalculate grand totals based on displayed quarters
  const displayedGrandTotals = useMemo(() => {
    if (selectedQuarter === 'all') {
      return tallyDataByQuarter.grandTotals;
    }
    
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
        ftir: filteredQuarter.totals.ftir,
        c: filteredQuarter.totals.c,
        ct: filteredQuarter.totals.ct,
        ft: filteredQuarter.totals.ft,
        bt: filteredQuarter.totals.bt,
        is: filteredQuarter.totals.is,
        ht: filteredQuarter.totals.ht,
        mo: filteredQuarter.totals.mo,
        ctt: filteredQuarter.totals.ctt,
      };
    } else {
      return {
        category: 'Grand Total',
        totalSamples: filteredQuarter.totals.totalSamples,
        ftir: filteredQuarter.totals.ftir,
        materialTesting: filteredQuarter.totals.materialTesting,
        ct: filteredQuarter.totals.ct,
        ft: filteredQuarter.totals.ft,
        bt: filteredQuarter.totals.bt,
        is: filteredQuarter.totals.is,
        ht: filteredQuarter.totals.ht,
        mo: filteredQuarter.totals.mo,
        ctt: filteredQuarter.totals.ctt,
      };
    }
  }, [displayedQuarters, selectedQuarter, tallyDataByQuarter.grandTotals, reportType]);

  const getCategoryColor = (category) => {
    // Check localStorage first
    const customColors = JSON.parse(localStorage.getItem('customCategoryColors') || '{}');
    if (customColors[category]) {
      return customColors[category];
    }
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

  const exportToExcel = async () => {

  // FIX 4 & 5: Read custom colors once; removed dead 'customStoredColors'
  const customCategoryColors = JSON.parse(
    localStorage.getItem('customCategoryColors') || '{}'
  );

  try {
    const workbook = new ExcelJS.Workbook();
    const quarterText = selectedQuarter === 'all' ? 'All Quarters' : `Q${selectedQuarter}`;
    const reportName = reportType === 'service' ? 'Services' : 'Samples';
    const ws = workbook.addWorksheet(`${reportName} ${selectedYear} ${quarterText}`);

    // === LOAD AND ADD LOGO ===
    const logoResponse = await fetch('/BSULOGO.png'); // FIX 7: absolute path
    const logoBlob = await logoResponse.blob();
    const logoBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(logoBlob);
    });

    const logoId = workbook.addImage({ base64: logoBase64, extension: 'png' });

    const categories = allCategories;

    // ── Shared helper: apply cell color from customCategoryColors or fallback map ──
    const applyCategoryFill = (cell, categoryName, categoryColors) => {
      const hex = customCategoryColors[categoryName]; // FIX 4: use pre-read object
      if (hex) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${hex.replace('#', '')}` },
        };
      } else if (categoryColors[categoryName]) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: categoryColors[categoryName] },
        };
      }
    };

    // ── Shared helper: safely merge only when range spans >1 row ──
    // FIX 3: guard covers both service and samples quarterly blocks
    const safeMerge = (ws, startRow, endRow, col) => {
      if (endRow > startRow) {
        ws.mergeCells(`${col}${startRow}:${col}${endRow}`);
      }
    };

    // ── Shared border style ──
    const thinBorder = {
      top:    { style: 'thin' },
      left:   { style: 'thin' },
      bottom: { style: 'thin' },
      right:  { style: 'thin' },
    };

    ws.getRow(1).height = 15;

    // ════════════════════════════════════════════════════════════
    // SERVICE TALLY REPORT
    // ════════════════════════════════════════════════════════════
    if (reportType === 'service') {
      const categoryColors = {
        'BatStateU College':  'FFF4CCCC',
        'Private HEIs':       'FFD9EAD3',
        'Private Individual': 'FFCFE2F3',
        'Industry':           'FFFCE5CD',
        'Senior High':        'FFEAD1DC',
        'BatStateU IS':       'FFD0E0E3',
      };

      const testTypeColors = {
        9:  'F2DCDB',
        10: 'F2DCDB',
        11: 'DAEEF3',
        12: 'DAEEF3',
        13: 'DAEEF3',
        14: 'DAEEF3',
        15: 'FFF2CC',
        16: 'FFF2CC',
        17: 'FFF2CC',
      };

      // Header block
      ws.mergeCells('B2:Q9');
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

      ws.mergeCells('B10:Q10');
      const titleCell = ws.getCell('B10');
      titleCell.value = `${selectedYear} MATERIAL TESTING SERVICES OFFER - ${quarterText}`;
      titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF000000' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F9438' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.border = thinBorder;
      ws.getRow(10).height = 25;

      ws.getRow(11).values = ['', 'Period', 'Types Of Client', 'No. of Unique\nClient',
        'No. of Service\nRequest', 'Income', 'Bio Tech\nTesting', 'Material\nTesting',
        'FTIR', 'CN', 'Universal Testing Machine', '', '', '',
        'Non-Destructive Testing', '', ''];
      ws.getRow(12).values = ['', '', '', '', '', '', '', '', '', '', 'CT', 'FT', 'BT', 'TS', 'HT', 'MO', 'CTT'];

      ws.mergeCells('B11:B12'); ws.mergeCells('C11:C12'); ws.mergeCells('D11:D12');
      ws.mergeCells('E11:E12'); ws.mergeCells('F11:F12'); ws.mergeCells('G11:G12');
      ws.mergeCells('H11:H12'); ws.mergeCells('I11:I12'); ws.mergeCells('J11:J12');
      ws.mergeCells('K11:N11'); ws.mergeCells('O11:Q11');

      for (let col = 2; col <= 17; col++) {
        for (let row = 11; row <= 12; row++) {
          const cell = ws.getCell(row, col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F6228' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = thinBorder;
        }
      }

      // ── Helper: write one service data row ──
      const writeServiceDataRow = (ws, rowNum, row) => {
        const excelRow = ws.getRow(rowNum);
        excelRow.values = ['', '', row.category,
          row.noOfClient, row.noOfServices, row.income,
          row.bioTech, row.materialTesting,
          row.ftir, row.c, row.ct, row.ft, row.bt, row.is, row.ht, row.mo, row.ctt];

        for (let col = 2; col <= 17; col++) {
          const cell = excelRow.getCell(col);
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = thinBorder;
          if (col === 3) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            applyCategoryFill(cell, row.category, categoryColors); // FIX 4
          }
          if (col === 6) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '"₱"#,##0.00';
          }
          if (testTypeColors[col]) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: testTypeColors[col] } };
          }
          if (typeof cell.value === 'number' && col !== 6) cell.numFmt = '#,##0';
        }
      };

      // ── Helper: write one service total row ──
      const writeServiceTotalRow = (ws, rowNum, totals, label) => {
        const totalRow = ws.getRow(rowNum);
        totalRow.values = ['', '', label,
          totals.noOfClient, totals.noOfServices, totals.income,
          totals.bioTech, totals.materialTesting,
          totals.ftir, totals.c, totals.ct, totals.ft, totals.bt,
          totals.is, totals.ht, totals.mo, totals.ctt];

        for (let col = 2; col <= 17; col++) {
          const cell = totalRow.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '000000' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9D9D9' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = thinBorder;
          if (col === 3) cell.alignment = { horizontal: 'left', vertical: 'middle' };
          if (col === 6) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '"₱"#,##0.00';
          }
          if (typeof cell.value === 'number' && col !== 6) cell.numFmt = '#,##0';
        }
      };

      // ── Helper: write period label cells (label + start date + end date) ──
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

      // ── Whole Year Summary (All Quarters only) ──
      if (selectedQuarter === 'all') {
        const yearStartRow = currentRow;

        // FIX 1 & 6: correct field name + amount fallback
        const yearData = categories.map(categoryName => {
          const categoryClients = yearFilteredClients.filter(c =>
            c.category === categoryName
          );
          const uniqueClients = new Set(
            categoryClients.map(c => c.name?.toLowerCase().trim()).filter(Boolean)
          ).size;
          // FIX 6: added || 0
          const totalIncome = categoryClients.reduce((sum, c) => sum + (c.amount || 0), 0);
          const getCount = (type) => categoryClients.filter(c => c.testTypes.includes(type)).length;
          return {
            category: categoryName,
            noOfClient: uniqueClients,
            noOfServices: categoryClients.length,
            income: totalIncome,
            bioTech: 0,
            // FIX 1: was 'mmaterialTesting'
            materialTesting: categoryClients.filter(c =>
              c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type))
            ).length,
            ftir: getCount('FTIR'), c: getCount('CN'), ct: getCount('CT'),
            ft: getCount('FT'), bt: getCount('BT'), is: getCount('TS'),
            ht: getCount('HT'), mo: getCount('MO'), ctt: getCount('CTT'),
          };
        });

        yearData.forEach(row => { writeServiceDataRow(ws, currentRow, row); currentRow++; });

        // FIX 2: materialTesting now sums correctly because yearData rows have correct field
        const yearTotals = {
          noOfClient:      yearData.reduce((s, d) => s + d.noOfClient, 0),
          noOfServices:    yearData.reduce((s, d) => s + d.noOfServices, 0),
          income:          yearData.reduce((s, d) => s + d.income, 0),
          bioTech:         0,
          materialTesting: yearData.reduce((s, d) => s + d.materialTesting, 0),
          ftir: yearData.reduce((s, d) => s + d.ftir, 0),
          c:    yearData.reduce((s, d) => s + d.c, 0),
          ct:   yearData.reduce((s, d) => s + d.ct, 0),
          ft:   yearData.reduce((s, d) => s + d.ft, 0),
          bt:   yearData.reduce((s, d) => s + d.bt, 0),
          is:   yearData.reduce((s, d) => s + d.is, 0),
          ht:   yearData.reduce((s, d) => s + d.ht, 0),
          mo:   yearData.reduce((s, d) => s + d.mo, 0),
          ctt:  yearData.reduce((s, d) => s + d.ctt, 0),
        };

        writeServiceTotalRow(ws, currentRow, yearTotals, 'Total Income');
        currentRow++;

        // Period label: merge body rows, then two date rows below
        safeMerge(ws, yearStartRow, currentRow - 3, 'B'); // FIX 3
        writePeriodCells(
          ws,
          ws.getCell(`B${yearStartRow}`),
          ws.getCell(`B${currentRow - 2}`),
          ws.getCell(`B${currentRow - 1}`),
          `\n${selectedYear}`,
          new Date(selectedYear, 0, 1).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          new Date(selectedYear, 11, 31).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        );
      }

      // ── Quarterly blocks ──
      displayedQuarters.forEach((qData) => {
        const startRow = currentRow;

        qData.data.forEach(row => { writeServiceDataRow(ws, currentRow, row); currentRow++; });
        writeServiceTotalRow(ws, currentRow, qData.totals, 'Total Income');
        currentRow++;

        // FIX 3: safe merge for quarterly block
        safeMerge(ws, startRow, currentRow - 3, 'B');

        const qStart = startOfQuarter(new Date(selectedYear, (qData.quarter - 1) * 3, 1));
        const qEnd   = endOfQuarter(new Date(selectedYear, (qData.quarter - 1) * 3, 1));
        writePeriodCells(
          ws,
          ws.getCell(`B${startRow}`),
          ws.getCell(`B${currentRow - 2}`),
          ws.getCell(`B${currentRow - 1}`),
          `Quarter ${qData.quarter}`,
          qStart.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          qEnd.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        );
      });

      // FIX 8: Write Grand Total row to Excel
      writeServiceTotalRow(ws, currentRow, displayedGrandTotals, 'Grand Total');
      // Style grand total row distinctly
      for (let col = 2; col <= 17; col++) {
        const cell = ws.getRow(currentRow).getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F6228' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      }
      currentRow++;

      ws.getColumn(1).width = 3;  ws.getColumn(2).width = 12; ws.getColumn(3).width = 22;
      ws.getColumn(4).width = 12; ws.getColumn(5).width = 12; ws.getColumn(6).width = 15;
      ws.getColumn(7).width = 10; ws.getColumn(8).width = 13; ws.getColumn(9).width = 8;
      ws.getColumn(10).width = 6; ws.getColumn(11).width = 8; ws.getColumn(12).width = 8;
      ws.getColumn(13).width = 8; ws.getColumn(14).width = 8; ws.getColumn(15).width = 8;
      ws.getColumn(16).width = 8; ws.getColumn(17).width = 8;

    // ════════════════════════════════════════════════════════════
    // SAMPLES TALLY REPORT
    // ════════════════════════════════════════════════════════════
    } else {
      const categoryColors = {
        'BatStateU College':  'FFF4CCCC',
        'Private HEIs':       'FFD9EAD3',
        'Private Individual': 'FFCFE2F3',
        'Industry':           'FFFCE5CD',
        'Senior High':        'FFEAD1DC',
        'BatStateU IS':       'FFD0E0E3',
      };

      const testTypeColors = {
        5:  'F2DCDB',
        6:  'F2DCDB',
        7:  'DAEEF3',
        8:  'DAEEF3',
        9:  'DAEEF3',
        10: 'DAEEF3',
        11: 'FFF2CC',
        12: 'FFF2CC',
        13: 'FFF2CC',
      };

      // Header block
      ws.mergeCells('B2:M9');
      const headerCell = ws.getCell('B2');
      headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F9438' } };
      headerCell.border = thinBorder;
      ws.addImage(logoId, { tl: { col: 1.3, row: 2 }, br: { col: 2.9, row: 8.3 }, editAs: 'oneCell' });
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

      ws.mergeCells('B10:M10');
      const titleCell = ws.getCell('B10');
      titleCell.value = `${selectedYear} MATERIAL TESTING SAMPLES TALLY - ${quarterText}`;
      titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF000000' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F9438' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.border = thinBorder;
      ws.getRow(10).height = 25;

      ws.getRow(11).values = ['', 'Period', 'Types Of Client', 'Sample Total\nPer Client Type',
        'FTIR', 'Material\nTesting', 'Universal Testing Machine', '', '', '',
        'Non-Destructive Testing', '', ''];
      ws.getRow(12).values = ['', '', '', '', '', '', 'CT', 'FT', 'BT', 'TS', 'HT', 'MO', 'CTT'];

      ws.mergeCells('B11:B12'); ws.mergeCells('C11:C12'); ws.mergeCells('D11:D12');
      ws.mergeCells('E11:E12'); ws.mergeCells('F11:F12');
      ws.mergeCells('G11:J11'); ws.mergeCells('K11:M11');

      for (let col = 2; col <= 13; col++) {
        for (let row = 11; row <= 12; row++) {
          const cell = ws.getCell(row, col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F6228' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = thinBorder;
        }
      }

      // ── Helper: write one samples data row ──
      const writeSamplesDataRow = (ws, rowNum, row) => {
        const excelRow = ws.getRow(rowNum);
        excelRow.values = ['', '', row.category,
          row.totalSamples, row.ftir, row.materialTesting,
          row.ct, row.ft, row.bt, row.is, row.ht, row.mo, row.ctt];

        for (let col = 2; col <= 13; col++) {
          const cell = excelRow.getCell(col);
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = thinBorder;
          if (col === 3) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            applyCategoryFill(cell, row.category, categoryColors); // FIX 4
          }
          if (testTypeColors[col]) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: testTypeColors[col] } };
          }
          if (typeof cell.value === 'number') cell.numFmt = '#,##0';
        }
      };

      // ── Helper: write one samples total row ──
      const writeSamplesTotalRow = (ws, rowNum, totals, label) => {
        const totalRow = ws.getRow(rowNum);
        totalRow.values = ['', '', label,
          totals.totalSamples, totals.ftir, totals.materialTesting,
          totals.ct, totals.ft, totals.bt, totals.is, totals.ht, totals.mo, totals.ctt];

        for (let col = 2; col <= 13; col++) {
          const cell = totalRow.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '000000' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9D9D9' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = thinBorder;
          if (col === 3) cell.alignment = { horizontal: 'left', vertical: 'middle' };
          if (typeof cell.value === 'number') cell.numFmt = '#,##0';
        }
      };

      // ── Helper: write period label cells ──
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

      // ── Whole Year Summary (All Quarters only) ──
      if (selectedQuarter === 'all') {
        const yearStartRow = currentRow;

        const yearData = categories.map(categoryName => {
          const categoryClients = yearFilteredClients.filter(c =>
            c.category === categoryName
          );
          const totalSamples = categoryClients.reduce((sum, c) => sum + (c.sampleCount || 0), 0);
          const getSampleCount = (type) =>
            categoryClients.reduce((sum, c) => c.testTypes.includes(type) ? sum + (c.sampleCount || 0) : sum, 0);
          const materialTestingSamples = categoryClients.reduce((sum, c) => {
            const has = c.testTypes.some(type => MATERIAL_TESTING_TYPES.includes(type));
            return has ? sum + (c.sampleCount || 0) : sum;
          }, 0);
          return {
            category: categoryName,
            totalSamples,
            ftir: getSampleCount('FTIR'),
            materialTesting: materialTestingSamples,
            ct: getSampleCount('CT'), ft: getSampleCount('FT'),
            bt: getSampleCount('BT'), is: getSampleCount('TS'),
            ht: getSampleCount('HT'), mo: getSampleCount('MO'), ctt: getSampleCount('CTT'),
          };
        });

        yearData.forEach(row => { writeSamplesDataRow(ws, currentRow, row); currentRow++; });

        const yearTotals = {
          totalSamples:    yearData.reduce((s, d) => s + d.totalSamples, 0),
          ftir:            yearData.reduce((s, d) => s + d.ftir, 0),
          materialTesting: yearData.reduce((s, d) => s + d.materialTesting, 0),
          ct:  yearData.reduce((s, d) => s + d.ct, 0),
          ft:  yearData.reduce((s, d) => s + d.ft, 0),
          bt:  yearData.reduce((s, d) => s + d.bt, 0),
          is:  yearData.reduce((s, d) => s + d.is, 0),
          ht:  yearData.reduce((s, d) => s + d.ht, 0),
          mo:  yearData.reduce((s, d) => s + d.mo, 0),
          ctt: yearData.reduce((s, d) => s + d.ctt, 0),
        };

        writeSamplesTotalRow(ws, currentRow, yearTotals, 'Total Samples');
        currentRow++;

        safeMerge(ws, yearStartRow, currentRow - 3, 'B'); // FIX 3
        writePeriodCells(
          ws,
          ws.getCell(`B${yearStartRow}`),
          ws.getCell(`B${currentRow - 2}`),
          ws.getCell(`B${currentRow - 1}`),
          `\n${selectedYear}`,
          new Date(selectedYear, 0, 1).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          new Date(selectedYear, 11, 31).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        );
      }

      // ── Quarterly blocks ──
      displayedQuarters.forEach((qData) => {
        const startRow = currentRow;

        qData.data.forEach(row => { writeSamplesDataRow(ws, currentRow, row); currentRow++; });
        writeSamplesTotalRow(ws, currentRow, qData.totals, 'Total Samples');
        currentRow++;

        // FIX 3: safe merge — was unguarded crash in original samples code
        safeMerge(ws, startRow, currentRow - 3, 'B');

        const qStart = startOfQuarter(new Date(selectedYear, (qData.quarter - 1) * 3, 1));
        const qEnd   = endOfQuarter(new Date(selectedYear, (qData.quarter - 1) * 3, 1));
        writePeriodCells(
          ws,
          ws.getCell(`B${startRow}`),
          ws.getCell(`B${currentRow - 2}`),
          ws.getCell(`B${currentRow - 1}`),
          `Quarter ${qData.quarter}`,
          qStart.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          qEnd.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        );
      });

      // FIX 8: Write Grand Total row to Excel
      writeSamplesTotalRow(ws, currentRow, displayedGrandTotals, 'Grand Total');
      for (let col = 2; col <= 13; col++) {
        const cell = ws.getRow(currentRow).getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F6228' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      }
      currentRow++;

      ws.getColumn(1).width = 3;  ws.getColumn(2).width = 12; ws.getColumn(3).width = 22;
      ws.getColumn(4).width = 18; ws.getColumn(5).width = 8;  ws.getColumn(6).width = 13;
      ws.getColumn(7).width = 8;  ws.getColumn(8).width = 8;  ws.getColumn(9).width = 8;
      ws.getColumn(10).width = 8; ws.getColumn(11).width = 8; ws.getColumn(12).width = 8;
      ws.getColumn(13).width = 8;
    }

    // ── Write file ──
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <div className="flex items-center gap-4 flex-1">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {reportType === 'service' ? 'Service Tally Report' : 'Samples Tally Report'}
              </h2>
              <p className="text-blue-200 text-sm mt-1">
                {reportType === 'service' 
                  ? 'Quarterly breakdown by category and test types' 
                  : 'Sample count breakdown by client type and test types'}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-auto mr-4">
              <label htmlFor="report-type-filter" className="text-white font-semibold">Report:</label>
              <select
                id="report-type-filter"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 hover:bg-white/20 transition-all"
              >
                <option value="service" className="bg-slate-800">Service Tally</option>
                <option value="samples" className="bg-slate-800">Samples Tally</option>
              </select>

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
              
              <label htmlFor="tally-quarter-filter" className="text-white font-semibold">Quarter:</label>
              <select
                id="tally-quarter-filter"
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 hover:bg-white/20 transition-all"
              >
                <option value="all" className="bg-slate-800">All Quarters</option>
                <option value="1" className="bg-slate-800">Q1</option>
                <option value="2" className="bg-slate-800">Q2</option>
                <option value="3" className="bg-slate-800">Q3</option>
                <option value="4" className="bg-slate-800">Q4</option>
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
          {reportType === 'service' ? (
            // SERVICE TALLY TABLES
            <>
              {/* ─── WHOLE YEAR SUMMARY TABLE (only when All Quarters) ─── */}
              {selectedQuarter === 'all' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/50">
                    Whole Year Summary — {selectedYear}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 border-b border-rose-500/50">
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border-r border-white/10">Type of Client</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10">No. of Unique Client</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10">No. of Service Request</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase border-r border-white/10">Income</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10">Bio Tech</th>
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
                        {wholeYearData.data.map((row, index) => (
                          <tr key={index} className="hover:bg-white/5 transition-colors">
                            <td className={`px-4 py-3 text-sm font-semibold text-white border-r border-white/10 ${
                                !getCategoryColor(row.category).startsWith('#') ? getCategoryColor(row.category) : ''
                              }`}
                              style={{
                                backgroundColor: getCategoryColor(row.category).startsWith('#') 
                                  ? `${getCategoryColor(row.category)}44` // Adding '44' adds transparency (approx 25%)
                                  : undefined
                              }}
                            >
                              {row.category}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-300 border-r border-white/10">{row.noOfClient}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-300 border-r border-white/10">{row.noOfServices}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-green-300 border-r border-white/10">
                              ₱{row.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-300 border-r border-white/10">{row.bioTech}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-300 border-r border-white/10">{row.materialTesting}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.service.ftir}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.service.c}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.service.ct}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.service.ft}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.service.bt}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.service.is}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.service.ht}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.service.mo}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300">{row.service.ctt}</td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-gradient-to-r from-rose-500/30 to-pink-500/30 border-t-2 border-rose-500/60">
                          <td className="px-4 py-4 text-sm font-bold text-white border-r border-white/10">{wholeYearData.serviceTotals.category}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-white border-r border-white/10">{wholeYearData.serviceTotals.noOfClient}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-white border-r border-white/10">{wholeYearData.serviceTotals.noOfServices}</td>
                          <td className="px-4 py-4 text-right text-sm font-bold text-green-300 border-r border-white/10">
                            ₱{wholeYearData.serviceTotals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-white border-r border-white/10">{wholeYearData.serviceTotals.bioTech}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-white border-r border-white/10">{wholeYearData.serviceTotals.materialTesting}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.serviceTotals.ftir}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.serviceTotals.c}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.serviceTotals.ct}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.serviceTotals.ft}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.serviceTotals.bt}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.serviceTotals.is}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.serviceTotals.ht}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.serviceTotals.mo}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300">{wholeYearData.serviceTotals.ctt}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── QUARTERLY TABLES ─── */}
              {displayedQuarters.map(({ quarter, data, totals }) => (
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
                          <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10">Bio Tech</th>
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
                            <td className={`px-4 py-3 text-sm font-semibold text-white border-r border-white/10 ${
                                !getCategoryColor(row.category).startsWith('#') ? getCategoryColor(row.category) : ''
                              }`}
                              style={{
                                backgroundColor: getCategoryColor(row.category).startsWith('#') 
                                  ? `${getCategoryColor(row.category)}44` // Adding '44' adds transparency (approx 25%)
                                  : undefined
                              }}
                            >
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
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.is}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.ht}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.mo}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300">{row.ctt}</td>
                          </tr>
                        ))}
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
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.is}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.ht}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.mo}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300">{totals.ctt}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 p-6">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Grand Total - {selectedYear} {selectedQuarter !== 'all' ? `(Q${selectedQuarter})` : ''}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-green-200">Total Clients</p>
                    <p className="text-3xl font-bold text-white">{displayedGrandTotals.noOfClient}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-green-200">Total Services</p>
                    <p className="text-3xl font-bold text-white">{displayedGrandTotals.noOfServices}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-green-200">Total Income</p>
                    <p className="text-3xl font-bold text-white">
                      ₱{displayedGrandTotals.income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-green-200">Material Testing Services</p>
                    <p className="text-3xl font-bold text-white">{displayedGrandTotals.materialTesting}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // SAMPLES TALLY TABLES
            <>
              {/* ─── WHOLE YEAR SUMMARY TABLE (only when All Quarters) ─── */}
              {selectedQuarter === 'all' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/50">
                    Whole Year Summary — {selectedYear}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 border-b border-rose-500/50">
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border-r border-white/10">Type of Client</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10">Sample Total Per Client Type</th>
                          {SAMPLES_TEST_HEADERS.map((type) => (
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
                        {wholeYearData.data.map((row, index) => (
                          <tr key={index} className="hover:bg-white/5 transition-colors">
                            <td className={`px-4 py-3 text-sm font-semibold text-white border-r border-white/10 ${
                                !getCategoryColor(row.category).startsWith('#') ? getCategoryColor(row.category) : ''
                              }`}
                              style={{
                                backgroundColor: getCategoryColor(row.category).startsWith('#') 
                                  ? `${getCategoryColor(row.category)}44` // Adding '44' adds transparency (approx 25%)
                                  : undefined
                              }}
                            >
                              {row.category}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-300 border-r border-white/10">{row.totalSamples}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.samples.ftir}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.materialTestingSamples}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.samples.ct}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.samples.ft}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.samples.bt}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.samples.is}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.samples.ht}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.samples.mo}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300">{row.samples.ctt}</td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-gradient-to-r from-rose-500/30 to-pink-500/30 border-t-2 border-rose-500/60">
                          <td className="px-4 py-4 text-sm font-bold text-white border-r border-white/10">{wholeYearData.samplesTotals.category}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-white border-r border-white/10">{wholeYearData.samplesTotals.totalSamples}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.samplesTotals.ftir}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.samplesTotals.materialTesting}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.samplesTotals.ct}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.samplesTotals.ft}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.samplesTotals.bt}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.samplesTotals.is}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.samplesTotals.ht}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{wholeYearData.samplesTotals.mo}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300">{wholeYearData.samplesTotals.ctt}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── QUARTERLY TABLES ─── */}
              {displayedQuarters.map(({ quarter, data, totals }) => (
                <div key={quarter} className="space-y-4">
                  <h3 className={`text-xl font-bold text-white px-4 py-2 rounded-lg bg-gradient-to-r ${getQuarterColor(quarter)} border`}>
                    Quarter {quarter} - {selectedYear}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className={`bg-gradient-to-r ${getQuarterColor(quarter)} border-b`}>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border-r border-white/10">Type of Client</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-white/10">Sample Total Per Client Type</th>
                          {SAMPLES_TEST_HEADERS.map((type) => (
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
                            <td className={`px-4 py-3 text-sm font-semibold text-white border-r border-white/10 ${
                                !getCategoryColor(row.category).startsWith('#') ? getCategoryColor(row.category) : ''
                              }`}
                              style={{
                                backgroundColor: getCategoryColor(row.category).startsWith('#') 
                                  ? `${getCategoryColor(row.category)}44` // Adding '44' adds transparency (approx 25%)
                                  : undefined
                              }}
                            >
                              {row.category}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-300 border-r border-white/10">{row.totalSamples}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.ftir}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.materialTesting}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.ct}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.ft}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.bt}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.is}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.ht}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300 border-r border-white/10">{row.mo}</td>
                            <td className="px-4 py-3 text-center text-sm text-pink-300">{row.ctt}</td>
                          </tr>
                        ))}
                        <tr className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-t-2 border-amber-500/50">
                          <td className="px-4 py-4 text-sm font-bold text-white border-r border-white/10">{totals.category}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-white border-r border-white/10">{totals.totalSamples}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.ftir}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.materialTesting}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.ct}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.ft}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.bt}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.is}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.ht}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300 border-r border-white/10">{totals.mo}</td>
                          <td className="px-4 py-4 text-center text-sm font-bold text-pink-300">{totals.ctt}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 p-6">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Grand Total - {selectedYear} {selectedQuarter !== 'all' ? `(Q${selectedQuarter})` : ''}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-green-200">Total Samples</p>
                    <p className="text-3xl font-bold text-white">{displayedGrandTotals.totalSamples}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-green-200">FTIR Samples</p>
                    <p className="text-3xl font-bold text-white">{displayedGrandTotals.ftir}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-green-200">CT Samples</p>
                    <p className="text-3xl font-bold text-white">{displayedGrandTotals.ct}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-green-200">FT Samples</p>
                    <p className="text-3xl font-bold text-white">{displayedGrandTotals.ft}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-green-200">BT Samples</p>
                    <p className="text-3xl font-bold text-white">{displayedGrandTotals.bt}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}