
import React, { useState, useEffect } from 'react';
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area } from 'recharts';
import { getBookings, getExpenses, getRoomCategories, getServices, getSettings } from '../services/db';
import { DownloadIcon, TrendingUpIcon, MoneyIcon, CalendarIcon, TagIcon, PrinterIcon, SearchIcon, SparklesIcon, DatabaseIcon } from './Icons';
import FinancialAudit from './FinancialAudit';
import { SystemSettings, User } from '../types';
import { getTaxBreakdown } from '../utils/finance';

type TimeRange = '30_DAYS' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM';

interface ReportsProps {
  user: User;
}

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30_DAYS');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const [reportData, setReportData] = useState<{
    totalRevenue: number;
    roomRevenue: number;
    serviceRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    timelineStats: any[];
    categoryStats: any[];
    serviceCategoryStats: any[];
    revenueSplit: any[];
    startDate: string;
    endDate: string;
  }>({
    totalRevenue: 0,
    roomRevenue: 0,
    serviceRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    timelineStats: [],
    categoryStats: [],
    serviceCategoryStats: [],
    revenueSplit: [],
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    calculateReports();
    setIsMounted(true);
  }, [timeRange, customStart, customEnd]);

  const calculateReports = async () => {
    setLoading(true);
    try {
        const [bookings, expenses, categories, services, sysSettings] = await Promise.all([
            getBookings(),
            getExpenses(),
            getRoomCategories(),
            getServices(),
            getSettings()
        ]);
        
        setSettings(sysSettings);
        const taxRate = sysSettings.taxRate || 0;

        const validBookings = bookings.filter(b => b.status !== 'CANCELLED');
        
        // 1. Determine Date Boundaries
        const now = new Date();
        let start = new Date();
        let end = new Date();
        let granularity: 'DAY' | 'MONTH' = 'DAY';
        
        if (timeRange === '30_DAYS') {
            start.setDate(now.getDate() - 30);
            granularity = 'DAY';
        } else if (timeRange === 'THIS_MONTH') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            granularity = 'DAY';
        } else if (timeRange === 'THIS_YEAR') {
            start = new Date(now.getFullYear(), 0, 1);
            granularity = 'MONTH';
        } else if (timeRange === 'CUSTOM') {
            if (!customStart || !customEnd) {
                setLoading(false);
                return; 
            }
            start = new Date(customStart);
            end = new Date(customEnd);
            end.setHours(23, 59, 59, 999); // End of day
            
            // Auto-detect granularity based on duration
            const diffDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
            granularity = diffDays > 60 ? 'MONTH' : 'DAY';
        }

        // Helper to get map key (strip time, keep only date)
        const getPeriodKey = (dateStr: string) => {
            // Extract just the date part (YYYY-MM-DD) from datetime strings
            const dateOnly = dateStr.split('T')[0]; // Remove time portion
            const d = new Date(dateOnly);
            if (granularity === 'DAY') {
                return dateOnly; // YYYY-MM-DD
            } else {
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            }
        };

        const getDisplayLabel = (key: string) => {
            const [y, m, d] = key.split('-').map(Number);
            const date = new Date(y, m - 1, d || 1);
            if (granularity === 'DAY') {
                // Show day and month (e.g., "12 Mar" or "1 Mar")
                return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            } else {
                // Show month and year (e.g., "Mar 2025")
                return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            }
        };

        // Ledger for Aggregation
        const periodLedger: {[key: string]: { revenue: number, expense: number, guests: string[] }} = {};

        // 2. Filter & Aggregate Data
        let totalRevenue = 0;
        let roomRevenue = 0;
        let serviceRevenue = 0;
        let totalExpenses = 0;
        
        const serviceCatMap: {[key: string]: number} = {};
        const categoryCounts: {[key: string]: number} = {};

        // PROCESS BOOKINGS
        validBookings.forEach(b => {
            console.log('🔍 Booking:', {
                guest: b.guestName,
                bookingDate: b.date,
                checkInDate: b.checkIn,
                checkOutDate: b.checkOut,
                status: b.status,
                amount: b.amount,
                paidAmount: b.paidAmount
            });
            
            // REVENUE RECOGNITION: Only CHECKED_OUT, count actual amount paid (including partial)
            const isCheckedOut = b.status === 'CHECKED_OUT';
            const totalPaid = b.paidAmount || 0;
            const totalGross = getTaxBreakdown(b.amount, taxRate).grandTotal;
            const paymentRatio = totalGross > 0 ? totalPaid / totalGross : (totalPaid > 0 ? 1 : 0);
            
            // Revenue recognized when checked out (proportional to payment received)
            if (isCheckedOut && totalPaid > 0) {
                const checkOutDate = b.checkOut || '';
                const checkOutDateObj = new Date(checkOutDate);
                
                // Only process if checkout date is within report range
                if (checkOutDateObj >= start && checkOutDateObj <= end) {
                    // Calculate room revenue (excluding service charges)
                    const chargesSubtotal = b.charges ? b.charges.reduce((sum, c) => sum + c.amount, 0) : 0;
                    const roomSubtotal = b.amount - chargesSubtotal;
                    const grossRoomRevenue = Math.round(getTaxBreakdown(roomSubtotal, taxRate).grandTotal * paymentRatio);
                    
                    roomRevenue += grossRoomRevenue;
                    
                    // Add to Ledger on checkout date
                    const key = getPeriodKey(checkOutDate);
                    if (!periodLedger[key]) periodLedger[key] = { revenue: 0, expense: 0, guests: [] };
                    periodLedger[key].revenue += grossRoomRevenue;
                    
                    // Track guest on checkout date
                    if (!periodLedger[key].guests.includes(b.guestName)) {
                        periodLedger[key].guests.push(b.guestName);
                    }
                    
                    // Service charges also recognized on checkout date (proportional)
                    if (b.charges) {
                        b.charges.forEach(charge => {
                            const grossServiceAmt = Math.round(getTaxBreakdown(charge.amount, taxRate).grandTotal * paymentRatio);
                            
                            // Categorize
                            const catalogItem = services.find(s => s.name === charge.description);
                            const catName = catalogItem ? catalogItem.category : 'Other';
                            serviceCatMap[catName] = (serviceCatMap[catName] || 0) + grossServiceAmt;
                            
                            // Add to Ledger on checkout date
                            periodLedger[key].revenue += grossServiceAmt;
                        });
                    }
                    
                    // Occupancy Counts
                    if (b.roomType) {
                        categoryCounts[b.roomType] = (categoryCounts[b.roomType] || 0) + 1;
                    }
                }
            }
        });

        // PROCESS EXPENSES
        expenses.forEach(e => {
            if (!e.date) return;
            const eDateObj = new Date(e.date);
            if (eDateObj >= start && eDateObj <= end) {
                totalExpenses += e.amount;
                const key = getPeriodKey(e.date);
                if (!periodLedger[key]) periodLedger[key] = { revenue: 0, expense: 0, guests: [] };
                periodLedger[key].expense += e.amount;
            }
        });

        serviceRevenue = Object.values(serviceCatMap).reduce((a, b) => a + b, 0);
        totalRevenue = roomRevenue + serviceRevenue;
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // 3. Flatten Timeline and fill missing dates
        const sortedKeys = Object.keys(periodLedger).sort();
        console.log('📊 Report Date Keys:', sortedKeys);
        
        // Generate all dates in range (fill gaps)
        const allDates: string[] = [];
        const currentDate = new Date(start);
        while (currentDate <= end) {
            const key = currentDate.toISOString().split('T')[0];
            allDates.push(key);
            if (granularity === 'DAY') {
                currentDate.setDate(currentDate.getDate() + 1);
            } else {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }
        
        // Create timeline stats (ascending for graphs) - FILTER OUT EMPTY DATES
        const timelineStats = allDates
            .map(key => {
                const entry = periodLedger[key] || { revenue: 0, expense: 0, guests: [] };
                const stats = {
                    date: key,
                    name: getDisplayLabel(key),
                    revenue: entry.revenue,
                    expense: entry.expense,
                    profit: entry.revenue - entry.expense,
                    margin: entry.revenue > 0 ? ((entry.revenue - entry.expense)/entry.revenue * 100).toFixed(1) : 0,
                    guests: entry.guests || [],
                    guestCount: (entry.guests || []).length
                };
                console.log('📅 Timeline entry:', stats);
                return stats;
            })
            .filter(stat => stat.revenue > 0 || stat.expense > 0 || stat.guestCount > 0); // Only show dates with activity

        // 4. Stats Formatting
        const serviceCategoryStats = Object.keys(serviceCatMap).map(key => ({
            name: key,
            value: serviceCatMap[key]
        })).sort((a, b) => b.value - a.value);

        const categoryStats = Object.keys(categoryCounts).map(key => ({
            name: key,
            value: categoryCounts[key]
        }));
        
        // Define Distinct Palette for Charts
        const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#6366f1', '#14b8a6'];
        
        const coloredCategoryStats = categoryStats.map((stat, index) => {
            return {
                ...stat,
                color: CHART_COLORS[index % CHART_COLORS.length]
            };
        });

        setReportData({
            totalRevenue,
            roomRevenue,
            serviceRevenue,
            totalExpenses,
            netProfit,
            profitMargin,
            timelineStats,
            categoryStats: coloredCategoryStats,
            serviceCategoryStats,
            revenueSplit: [
                { name: 'Room Revenue', value: roomRevenue, color: '#0f766e' },
                { name: 'Services', value: serviceRevenue, color: '#f59e0b' }
            ],
            startDate: start.toLocaleDateString(),
            endDate: end.toLocaleDateString()
        });
        setLoading(false);

    } catch (err) {
        console.error("Error generating reports", err);
        setLoading(false);
    }
  };

  const handlePrint = () => {
      window.print();
  };

  const handleDownload = () => {
      const headers = "Period,Arrivals,Gross Revenue,Expense,Net Profit,Margin (%)\n";
      const rows = reportData.timelineStats.map(row => 
          `${row.name},${row.guestCount},${row.revenue},${row.expense},${row.profit},${row.margin}`
      ).join("\n");
      
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Generating analytics...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* HEADER SECTION (HIDDEN ON PRINT) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div>
           <h2 className="text-xl font-bold text-gray-800 font-serif">Financial Reports</h2>
           <p className="text-sm text-gray-500">Performance analytics and P&L statements (Gross Revenue)</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
             {/* Time Range Selector */}
             <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex overflow-x-auto w-full sm:w-auto">
                <button 
                    onClick={() => setTimeRange('30_DAYS')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${timeRange === '30_DAYS' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    30 Days
                </button>
                <button 
                    onClick={() => setTimeRange('THIS_MONTH')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${timeRange === 'THIS_MONTH' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    This Month
                </button>
                <button 
                    onClick={() => setTimeRange('THIS_YEAR')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${timeRange === 'THIS_YEAR' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    This Year
                </button>
                <button 
                    onClick={() => setTimeRange('CUSTOM')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${timeRange === 'CUSTOM' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Custom
                </button>
             </div>

             {/* Custom Date Inputs */}
             {timeRange === 'CUSTOM' && (
                 <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                     <input 
                        type="date" 
                        value={customStart} 
                        onChange={e => setCustomStart(e.target.value)}
                        className="text-xs border-none focus:ring-0 text-gray-600 font-medium bg-transparent"
                     />
                     <span className="text-gray-300 self-center">-</span>
                     <input 
                        type="date" 
                        value={customEnd} 
                        onChange={e => setCustomEnd(e.target.value)}
                        className="text-xs border-none focus:ring-0 text-gray-600 font-medium bg-transparent"
                     />
                 </div>
             )}

            <div className="flex gap-2">
                <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors text-xs font-bold uppercase shadow-sm"
                    title="Download as CSV"
                >
                    <DownloadIcon className="w-4 h-4" /> CSV
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors text-xs font-bold uppercase shadow-sm"
                    title="Download as PDF"
                >
                    <DownloadIcon className="w-4 h-4 text-red-500" /> PDF
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 transition-colors text-xs font-bold uppercase shadow-sm"
                >
                    <PrinterIcon className="w-4 h-4" /> Print Report
                </button>
                <button 
                    onClick={() => setShowAudit(true)}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-black transition-colors text-xs font-bold uppercase shadow-sm"
                >
                    <DatabaseIcon className="w-4 h-4 text-teal-400" /> Integrity Audit
                </button>
            </div>
        </div>
      </div>

      {/* PRINT HEADER (VISIBLE ONLY ON PRINT) */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold uppercase font-serif tracking-widest mb-1">{settings?.hotelName || 'HOTEL MANAGEMENT SYSTEM'}</h1>
          <h2 className="text-lg font-bold text-gray-600">Financial Performance Report</h2>
          <p className="text-sm text-gray-500">Period: {reportData.startDate} to {reportData.endDate}</p>
          <div className="text-xs text-gray-400 mt-2">Generated on {new Date().toLocaleString()}</div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group print:border print:border-gray-300">
             <div className="relative z-10">
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Gross Revenue</p>
                 <h3 className="text-xl font-bold text-teal-800 font-mono">UGX {reportData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
             </div>
             <div className="p-3 bg-teal-50 text-teal-600 rounded-full z-10 print:hidden">
                 <MoneyIcon className="w-6 h-6" />
             </div>
          </div>

           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group print:border print:border-gray-300">
             <div className="relative z-10">
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Services (Gross)</p>
                 <h3 className="text-xl font-bold text-amber-600 font-mono">UGX {reportData.serviceRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
             </div>
             <div className="p-3 bg-amber-50 text-amber-600 rounded-full z-10 print:hidden">
                 <TagIcon className="w-6 h-6" />
             </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group print:border print:border-gray-300">
             <div className="relative z-10">
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Expenses</p>
                 <h3 className="text-xl font-bold text-red-600 font-mono">UGX {reportData.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
             </div>
             <div className="p-3 bg-red-50 text-red-600 rounded-full z-10 print:hidden">
                 <TrendingUpIcon className="w-6 h-6 rotate-180" />
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group print:border print:border-gray-300">
             <div className="relative z-10">
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Net Profit</p>
                 <h3 className={`text-xl font-bold font-mono ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                     UGX {reportData.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </h3>
                 <p className={`text-xs font-medium mt-1 ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                     {reportData.profitMargin.toFixed(1)}% Margin
                 </p>
             </div>
             <div className={`p-3 rounded-full z-10 print:hidden ${reportData.netProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                 <TrendingUpIcon className="w-6 h-6" />
             </div>
          </div>
      </div>

      {/* Key Insights Summary */}
      <div className="bg-teal-900 text-white p-6 rounded-2xl shadow-lg border border-teal-800 flex flex-col md:flex-row gap-8 items-center print:hidden">
          <div className="flex-1">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-teal-400" />
                  Performance Insights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-teal-100">
                  <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0"></div>
                      <p>
                          <span className="font-bold text-white">Revenue Mix:</span> Room bookings contribute <span className="text-teal-300 font-bold">{((reportData.roomRevenue / Math.max(1, reportData.totalRevenue)) * 100).toFixed(1)}%</span> of total gross revenue.
                      </p>
                  </div>
                  <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0"></div>
                      <p>
                          <span className="font-bold text-white">Profitability:</span> The current net profit margin is <span className={`font-bold ${reportData.profitMargin >= 20 ? 'text-green-400' : 'text-orange-300'}`}>{reportData.profitMargin.toFixed(1)}%</span>.
                      </p>
                  </div>
                  <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0"></div>
                      <p>
                          <span className="font-bold text-white">Top Service:</span> <span className="text-teal-300 font-bold">{reportData.serviceCategoryStats[0]?.name || 'N/A'}</span> is the highest performing ancillary category.
                      </p>
                  </div>
                  <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0"></div>
                      <p>
                          <span className="font-bold text-white">Efficiency:</span> Total expenses are <span className="text-teal-300 font-bold">{((reportData.totalExpenses / Math.max(1, reportData.totalRevenue)) * 100).toFixed(1)}%</span> of gross revenue.
                      </p>
                  </div>
              </div>
          </div>
          <div className="shrink-0 bg-teal-800/50 p-4 rounded-xl border border-teal-700 text-center min-w-[140px]">
              <div className="text-3xl font-bold text-teal-400">{reportData.timelineStats.reduce((sum, day) => sum + day.guestCount, 0)}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-teal-200">Total Arrivals</div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        
        {/* Main Financial Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 font-serif">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    Performance Trend (Gross)
                </h3>
            </div>
            <div className="w-full h-[320px] relative">
                {isMounted && (
                    <ResponsiveContainer id="report-timeline" width="99%" height="100%" minWidth={0} minHeight={0}>
                        <ComposedChart data={reportData.timelineStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date"
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#94a3b8', fontSize: 10}} 
                                interval={reportData.timelineStats.length > 15 ? 2 : 0}
                                tickFormatter={(value) => {
                                    const [y, m, d] = value.split('-').map(Number);
                                    const date = new Date(y, m - 1, d || 1);
                                    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                                }}
                            />
                            <YAxis yAxisId="left" hide />
                            <YAxis yAxisId="right" orientation="right" hide />
                            
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px'}}
                                formatter={(value: any, name: string) => {
                                    if (name === 'Profit Margin') return [`${value}%`, name];
                                    return [`UGX ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                                }}
                            />
                            <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                            
                            <Bar yAxisId="left" name="Gross Revenue" dataKey="revenue" fill="#0f766e" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar yAxisId="left" name="Expense" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                            <Line yAxisId="left" type="monotone" name="Net Profit" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={false} />
                            
                            {/* Only show Margin line on long term views */}
                            {timeRange !== '30_DAYS' && (
                                <Area yAxisId="right" type="monotone" name="Profit Margin" dataKey="margin" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>

        {/* Occupancy Donut (Booking Sources) - Moved here to be adjacent to Performance Trend */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-6 font-serif">Booking Sources</h3>
            <div className="w-full h-[250px] relative">
                {isMounted && (
                    <ResponsiveContainer id="report-sources" width="99%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                            <Pie
                                data={reportData.categoryStats}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {reportData.categoryStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [value, 'Bookings']} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
                
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4 text-center pointer-events-none">
                    <div className="text-3xl font-bold text-gray-800">
                        {reportData.categoryStats.reduce((a, b) => a + b.value, 0)}
                    </div>
                    <div className="text-xs text-gray-400 font-medium uppercase">Bookings</div>
                </div>
            </div>
        </div>

        {/* Daily Arrivals & Revenue Chart */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 font-serif">
                        <TrendingUpIcon className="w-4 h-4 text-teal-600" />
                        Daily Arrivals & Revenue
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Correlation between guest check-ins and generated revenue</p>
                </div>
            </div>
            <div className="w-full h-[350px] relative">
                {isMounted && (
                    <ResponsiveContainer id="report-arrivals-revenue" width="99%" height="100%" minWidth={0} minHeight={0}>
                        <ComposedChart data={reportData.timelineStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date"
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#94a3b8', fontSize: 10}}
                                tickFormatter={(value) => {
                                    const [y, m, d] = value.split('-').map(Number);
                                    const date = new Date(y, m - 1, d || 1);
                                    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                                }}
                            />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} label={{ value: 'Revenue (UGX)', angle: -90, position: 'insideLeft', style: {fontSize: '10px', fill: '#94a3b8'} }} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} label={{ value: 'Guest Count', angle: 90, position: 'insideRight', style: {fontSize: '10px', fill: '#94a3b8'} }} />
                            
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px'}}
                                formatter={(value: any, name: string) => {
                                    if (name === 'Arrivals') return [value, name];
                                    return [`UGX ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                                }}
                            />
                            <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                            
                            <Bar yAxisId="left" name="Daily Revenue" dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={30} />
                            <Line yAxisId="right" type="monotone" name="Arrivals" dataKey="guestCount" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
      </div>

      {/* SERVICE REVENUE BREAKDOWN (Hidden on Print if needed, or styled simpler) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
           {/* Revenue Split */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-2 font-serif">Revenue Mix (Gross)</h3>
                <p className="text-xs text-gray-500 mb-6">Room bookings vs Ancillary services</p>
                <div className="w-full h-[200px] relative">
                    {isMounted && (
                        <ResponsiveContainer id="report-mix" width="99%" height="100%" minWidth={0} minHeight={0}>
                            <PieChart>
                                <Pie
                                    data={reportData.revenueSplit}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {reportData.revenueSplit.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`UGX ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
           </div>

           {/* Service Category Performance */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-2 font-serif">Service Performance (Gross)</h3>
                <p className="text-xs text-gray-500 mb-6">Revenue breakdown by service category</p>
                <div className="w-full h-[200px] relative">
                    {isMounted && (
                        <ResponsiveContainer id="report-services" width="99%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart layout="vertical" data={reportData.serviceCategoryStats} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{fontSize: 11, fill: '#64748b'}} width={70} />
                                <Tooltip formatter={(value: number) => [`UGX ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']} cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
           </div>
      </div>
      
      {/* DETAILED LEDGER TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:border-t-2 print:border-black print:rounded-none">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center print:border-b-2 print:border-black">
              <div>
                <h3 className="font-bold text-gray-800 font-serif">Financial Ledger</h3>
                <p className="text-xs text-gray-500">Breakdown of performance for: <span className="text-teal-600 font-bold uppercase">{reportData.startDate} - {reportData.endDate}</span></p>
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100 print:bg-gray-100 print:text-black">
                      <tr>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Period</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Total Guests</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Gross Revenue</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Total Expenses</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Net Profit</th>
                          {timeRange !== '30_DAYS' && <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Margin</th>}
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center print:hidden">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 print:divide-gray-300">
                      {[...reportData.timelineStats].reverse().map((day) => {
                          const isToday = day.date === new Date().toISOString().split('T')[0];
                          return (
                          <tr key={day.date} className="hover:bg-gray-50/50">
                              <td className="p-4 text-sm font-medium text-gray-700">
                                  {day.name} 
                                  <span className="text-xs text-gray-400 ml-1 print:hidden">({day.date})</span>
                                  {isToday && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100">Today</span>}
                              </td>
                              <td className="p-4 text-sm text-gray-600">
                                  {day.guestCount > 0 ? (
                                      <div className="flex items-center gap-2">
                                          <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded-lg text-xs font-bold border border-teal-100">
                                              {day.guestCount} {day.guestCount === 1 ? 'Guest' : 'Guests'}
                                          </span>
                                      </div>
                                  ) : (
                                      <span className="text-gray-300 italic text-xs">No arrivals</span>
                                  )}
                              </td>
                              <td className="p-4 text-sm font-mono text-gray-800 text-right">
                                  {day.revenue > 0 ? `UGX ${day.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="p-4 text-sm font-mono text-red-600 text-right">
                                  {day.expense > 0 ? `(UGX ${day.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : '-'}
                              </td>
                              <td className={`p-4 text-sm font-mono font-bold text-right ${day.profit >= 0 ? 'text-green-600 print:text-black' : 'text-orange-600 print:text-black'}`}>
                                  UGX {day.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              {timeRange !== '30_DAYS' && (
                                <td className="p-4 text-sm font-mono text-gray-600 text-right">{day.margin}%</td>
                              )}
                              <td className="p-4 text-center print:hidden">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                                      day.profit > 0 ? 'bg-green-50 text-green-600 border-green-100' :
                                      day.profit < 0 ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                      'bg-gray-50 text-gray-400 border-gray-200'
                                  }`}>
                                      {day.profit > 0 ? 'Profit' : day.profit < 0 ? 'Loss' : 'Neutral'}
                                  </span>
                              </td>
                          </tr>
                      )})}
                  </tbody>
                  {/* Footer Totals for Print */}
                  <tfoot className="hidden print:table-footer-group bg-gray-100 font-bold border-t-2 border-black">
                      <tr>
                          <td className="p-4 text-sm uppercase">Total</td>
                          <td className="p-4 text-sm">{reportData.timelineStats.reduce((sum, day) => sum + day.guestCount, 0)} Guests</td>
                          <td className="p-4 text-sm text-right">UGX {reportData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-4 text-sm text-right">UGX {reportData.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-4 text-sm text-right">UGX {reportData.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          {timeRange !== '30_DAYS' && <td className="p-4 text-sm text-right">{reportData.profitMargin.toFixed(1)}%</td>}
                      </tr>
                  </tfoot>
              </table>
          </div>
      </div>

      {/* AUDIT MODAL */}
      {showAudit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:hidden">
              <div className="relative w-full max-w-4xl">
                  <button 
                    onClick={() => setShowAudit(false)}
                    className="absolute -top-12 right-0 text-white hover:text-teal-400 font-bold flex items-center gap-2 transition-colors"
                  >
                      ✕ Close Audit
                  </button>
                  <FinancialAudit />
              </div>
          </div>
      )}
      
      {/* Print Footer Signature Area */}
      <div className="hidden print:flex mt-12 justify-between px-8">
          <div className="text-center">
              <div className="border-t border-black w-48 pt-2">Prepared By</div>
          </div>
          <div className="text-center">
              <div className="border-t border-black w-48 pt-2">Approved By</div>
          </div>
      </div>
    </div>
  );
};

export default Reports;
