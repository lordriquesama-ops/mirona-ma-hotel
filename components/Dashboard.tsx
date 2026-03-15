
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, YAxis, BarChart, Bar, LineChart, Line } from 'recharts';
import { MoreVerticalIcon, TicketIcon, UserIcon, CalendarIcon, TrendingUpIcon, CheckIcon, WalletIcon, SparklesIcon, LogOutIcon, CheckCircleIcon, BellIcon, GlobeIcon, MessageSquareIcon, LayoutIcon, EyeIcon, AlertTriangleIcon } from './Icons';
import { Role } from '../types';
import { getBookings, getRoomCategories, getRooms, getExpenses, getSettings, getWebsiteContent } from '../services/db';
import { getTaxBreakdown } from '../utils/finance';

interface DashboardProps {
  role: Role;
  onNavigate: (page: string) => void;
}

// Compact KPI Card
const KPI = ({ title, value, subtext, icon: Icon, warning, colorClass = "bg-teal-50 text-teal-600" }: any) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all duration-200">
    <div>
       <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">{title}</h3>
       <div className="text-xl font-bold text-gray-800 data-value">{value}</div>
       <div className={`text-[9px] font-bold mt-0.5 ${warning ? 'text-red-500' : 'text-gray-400'}`}>
          {warning || subtext}
       </div>
    </div>
    <div className={`p-2.5 rounded-lg ${colorClass} bg-opacity-10`}>
        {Icon && <Icon className="w-5 h-5" />}
    </div>
  </div>
);

// Unified Card Container
const Card = ({ title, children, action, className = '' }: any) => (
  <div className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col ${className}`}>
    <div className="flex justify-between items-center mb-4 shrink-0">
      <h3 className="text-gray-800 font-bold text-sm tracking-tight">{title}</h3>
      {action}
    </div>
    <div className="flex-1 w-full relative min-w-0">{children}</div>
  </div>
);

// Action Button Pill
const ActionPill = ({ label, icon: Icon, onClick, colorClass }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95 ${colorClass}`}
    >
        <Icon className="w-3.5 h-3.5" />
        {label}
    </button>
);

// Guest List Item
const GuestListItem = ({ name, room, type, status, overdue }: any) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all mb-1.5">
        <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-sm ${type === 'in' ? 'bg-blue-600' : 'bg-orange-500'}`}>
                {name.charAt(0)}
            </div>
            <div>
                <div className="font-bold text-xs text-gray-800 truncate w-28 flex items-center gap-1">
                    {name}
                    {overdue && <AlertTriangleIcon className="w-3 h-3 text-red-500" />}
                </div>
                <div className="text-[9px] text-gray-400 font-medium">Room {room || 'N/A'}</div>
            </div>
        </div>
        <div className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${type === 'in' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
            {status}
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ role, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({
    arrivals: 0,
    departures: 0,
    inHouse: 0,
    totalRooms: 0,
    occupancyRate: 0,
    revenueToday: 0,
    revenueMonth: 0,
    profitToday: 0,
    profitMonth: 0,
    overdueCount: 0,
    dirtyRooms: 0,
    cleanRooms: 0,
    webBookings: 0,
    webConversion: 0
  });
  
  const [todaysArrivals, setTodaysArrivals] = useState<any[]>([]);
  const [todaysDepartures, setTodaysDepartures] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [bookingSourcesData, setBookingSourcesData] = useState<any[]>([]);
  const [greeting, setGreeting] = useState('');
  const [dirtyRoomList, setDirtyRoomList] = useState<any[]>([]);
  const [webContent, setWebContent] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
    setIsMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const fetchDashboardData = async () => {
    try {
        const [bookings, categories, rooms, expenses, settings, website] = await Promise.all([
            getBookings(),
            getRoomCategories(),
            getRooms(),
            getExpenses(),
            getSettings(),
            getWebsiteContent()
        ]);

        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        // Count actual rooms from database instead of using category counts
        const totalRooms = rooms.length;
        const taxRate = settings.taxRate || 0;
        
        let revenueToday = 0;
        let revenueMonth = 0;
        let arrivalsCount = 0;
        let departuresCount = 0;
        let webBookingsCount = 0;
        let overdueCount = 0;

        const tArrivals: any[] = [];
        const tDepartures: any[] = [];

        bookings.forEach(b => {
            const bStatus = b.status;
            const isCancelled = bStatus === 'CANCELLED';
            const bDate = new Date(b.date);
            const bDateStr = b.date ? b.date.split('T')[0] : '';

            if (b.notes?.includes('Booked via Website')) {
                webBookingsCount++;
            }

            // Operational
            if (b.checkIn <= today && !isCancelled && bStatus !== 'CHECKED_IN' && bStatus !== 'CHECKED_OUT') {
                arrivalsCount++;
                tArrivals.push(b);
            }
            if (b.checkOut === today && !isCancelled && bStatus === 'CHECKED_IN') {
                departuresCount++;
                tDepartures.push(b);
            }

            if ((bStatus === 'PENDING' || bStatus === 'CONFIRMED') && b.checkIn < today && !isCancelled) {
                overdueCount++;
            }

            // REVENUE RECOGNITION: Only CHECKED_OUT guests, count actual amount paid
            const isCheckedOut = bStatus === 'CHECKED_OUT';
            const totalPaid = b.paidAmount || 0;
            
            // Revenue = actual amount paid (including partial payments)
            if (isCheckedOut && totalPaid > 0) {
                const chargesTotal = b.charges ? b.charges.reduce((sum, c) => sum + c.amount, 0) : 0;
                const totalGross = getTaxBreakdown(b.amount, taxRate).grandTotal;
                const paymentRatio = totalGross > 0 ? totalPaid / totalGross : (totalPaid > 0 ? 1 : 0);
                
                // Calculate revenue based on what was actually paid
                const roomOnlyRevenue = (b.amount - chargesTotal) * paymentRatio;
                
                // Room revenue is recognized on the check-out date
                const checkOutDateStr = b.checkOut || '';
                const checkOutDateObj = new Date(checkOutDateStr);

                if (checkOutDateStr === today) revenueToday += roomOnlyRevenue;
                if (checkOutDateObj.getMonth() === currentMonth && checkOutDateObj.getFullYear() === currentYear) revenueMonth += roomOnlyRevenue;

                // Service charges also recognized on check-out date (proportional to payment)
                if (b.charges) {
                    b.charges.forEach(c => {
                        const chargeAmount = c.amount * paymentRatio;
                        const checkOutDate = b.checkOut || '';
                        const checkOutDateObj = new Date(checkOutDate);
                        
                        if (checkOutDate === today) revenueToday += chargeAmount;
                        if (checkOutDateObj.getMonth() === currentMonth && checkOutDateObj.getFullYear() === currentYear) revenueMonth += chargeAmount;
                    });
                }
            }
        });

        // Apply Tax to final sums
        const grossRevenueToday = getTaxBreakdown(revenueToday, taxRate).grandTotal;
        const grossRevenueMonth = getTaxBreakdown(revenueMonth, taxRate).grandTotal;

        const expensesToday = expenses
            .filter(e => e.date === today)
            .reduce((sum, e) => sum + e.amount, 0);
        
        const expensesMonth = expenses
            .filter(e => {
                const eDate = new Date(e.date);
                return eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear;
            })
            .reduce((sum, e) => sum + e.amount, 0);
        
        const dirtyList = rooms.filter(r => r.status === 'Cleaning');
        const occupiedRoomsCount = rooms.filter(r => r.status === 'Occupied').length;
        
        setStats({
            arrivals: arrivalsCount,
            departures: departuresCount,
            inHouse: occupiedRoomsCount,
            totalRooms,
            occupancyRate: totalRooms > 0 ? Math.round((occupiedRoomsCount / totalRooms) * 100) : 0,
            revenueToday: grossRevenueToday,
            revenueMonth: grossRevenueMonth,
            profitToday: grossRevenueToday - expensesToday,
            profitMonth: grossRevenueMonth - expensesMonth,
            overdueCount: overdueCount,
            dirtyRooms: dirtyList.length,
            cleanRooms: rooms.filter(r => r.status === 'Available').length,
            webBookings: webBookingsCount,
            webConversion: webBookingsCount // Show actual count instead of mock percentage
        });

        setTodaysArrivals(tArrivals);
        setTodaysDepartures(tDepartures);
        setDirtyRoomList(dirtyList);
        setRecentActivity([...bookings].sort((a,b) => Number(b.id) - Number(a.id)).slice(0,5));
        setWebContent(website);

        // Chart Data - Last 7 days revenue (real data from bookings)
        // Revenue is spread across each day of the stay (daily rate)
        const chart = [];
        console.log('📊 Building revenue chart for last 7 days...');
        console.log(`   Total bookings: ${bookings.length}`);
        console.log(`   Checked-out bookings: ${bookings.filter(b => b.status === 'CHECKED_OUT').length}`);
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            let dayRev = 0;
            let dayBookings = 0;
            
            bookings.forEach(b => {
                // Only CHECKED_OUT bookings, count actual amount paid (including partial)
                const isCheckedOut = b.status === 'CHECKED_OUT';
                const totalPaid = b.paidAmount || 0;
                const totalGross = getTaxBreakdown(b.amount, taxRate).grandTotal;
                const paymentRatio = totalGross > 0 ? totalPaid / totalGross : (totalPaid > 0 ? 1 : 0);

                // Count bookings created on this date
                const bookingDate = b.date ? b.date.split('T')[0] : '';
                if (bookingDate === dateStr) {
                    dayBookings++;
                }

                // Revenue recognized on check-out date (proportional to payment)
                if (isCheckedOut && totalPaid > 0) {
                    const checkOutDate = b.checkOut || '';
                    
                    if (checkOutDate === dateStr) {
                        // Calculate room revenue (excluding service charges)
                        const chargesTotal = b.charges ? b.charges.reduce((sum, c) => sum + c.amount, 0) : 0;
                        const roomRevenue = (b.amount - chargesTotal) * paymentRatio;
                        dayRev += roomRevenue;
                        console.log(`   ${dateStr}: ${b.guestName} - Room revenue on checkout: ${roomRevenue.toFixed(2)} (${(paymentRatio * 100).toFixed(0)}% paid)`);
                        
                        // Service charges also recognized on checkout (proportional)
                        if (b.charges) {
                            const chargesRevenue = b.charges.reduce((sum, c) => sum + c.amount, 0) * paymentRatio;
                            dayRev += chargesRevenue;
                            console.log(`   ${dateStr}: ${b.guestName} - Service charges: ${chargesRevenue.toFixed(2)}`);
                        }
                    }
                }
            });
            
            const grossRev = getTaxBreakdown(dayRev, taxRate).grandTotal;
            console.log(`   ${dateStr} (${d.toLocaleDateString('en-GB', {weekday:'short'})}): Revenue = ${grossRev.toFixed(2)}, Bookings = ${dayBookings}`);
            
            // Always add all 7 days to show the full week, even if zero
            chart.push({ 
                name: d.toLocaleDateString('en-GB', {weekday:'short'}), 
                revenue: grossRev,
                bookings: dayBookings
            });
        }
        
        console.log('📊 Chart data:', chart);
        console.log('📊 Chart has data?', chart.some(d => d.revenue > 0 || d.bookings > 0));
        setChartData(chart);

        setOccupancyData([
            { name: 'Occupied', value: occupiedRoomsCount, color: '#0d4a6b' },
            { name: 'Available', value: Math.max(0, totalRooms - occupiedRoomsCount), color: '#e2e8f0' }
        ]);

        // Booking Sources (Room Categories)
        const categoryCounts: {[key: string]: number} = {};
        bookings.filter(b => b.status !== 'CANCELLED').forEach(b => {
            if (b.roomType) {
                categoryCounts[b.roomType] = (categoryCounts[b.roomType] || 0) + 1;
            }
        });
        
        const CHART_COLORS = ['#0d4a6b', '#0d9488', '#f59e0b', '#ef4444', '#6366f1'];
        const sources = Object.keys(categoryCounts).map((key, index) => ({
            name: key,
            value: categoryCounts[key],
            color: CHART_COLORS[index % CHART_COLORS.length]
        }));
        setBookingSourcesData(sources);

        setLoading(false);
    } catch (err) {
        console.error(err);
        setLoading(false);
    }
  };

  const isMarketing = role === 'MARKETING';
  const isReception = role === 'RECEPTION';
  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  if (loading) return <div className="p-8 text-center text-gray-400">Initializing Dashboard...</div>;

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      
      {/* HEADER & QUICK ACTIONS TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
              <h2 className="text-lg font-bold text-gray-800">
                  {greeting}, <span className="text-teal-600">{role === 'ADMIN' ? 'Administrator' : role.charAt(0) + role.slice(1).toLowerCase()}</span>
              </h2>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                  Overview for {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
              {isMarketing ? (
                  <>
                      <ActionPill label="Preview Site" icon={EyeIcon} onClick={() => window.open('/website', '_blank')} colorClass="bg-teal-600 text-white hover:bg-teal-700" />
                      <ActionPill label="Edit Content" icon={LayoutIcon} onClick={() => onNavigate('website')} colorClass="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" />
                  </>
              ) : (
                  <>
                      <ActionPill label="New Booking" icon={TicketIcon} onClick={() => onNavigate('bookings')} colorClass="bg-teal-600 text-white hover:bg-teal-700" />
                      <ActionPill label="Check In/Out" icon={CheckCircleIcon} onClick={() => onNavigate('bookings')} colorClass="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" />
                  </>
              )}
          </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isMarketing ? (
            <>
                <KPI title="Web Visitors" value="1,248" subtext="+12% from last week" icon={GlobeIcon} colorClass="bg-blue-100 text-blue-700"/>
                <KPI title="Conversion" value="3.4%" subtext="Industry Avg: 2.1%" icon={TrendingUpIcon} colorClass="bg-emerald-100 text-emerald-700"/>
                <KPI title="Web Bookings" value={stats.webBookings} subtext="Direct Reservations" icon={TicketIcon} colorClass="bg-teal-100 text-teal-700"/>
                <KPI title="Inquiries" value="14" subtext="Pending response" icon={MessageSquareIcon} colorClass="bg-indigo-100 text-indigo-700"/>
            </>
        ) : isAdminOrManager ? (
            <>
                <KPI title="Gross Revenue" value={`UGX ${stats.revenueMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subtext="This Month" icon={TrendingUpIcon} colorClass="bg-teal-100 text-teal-700"/>
                <KPI title="Net Profit" value={`UGX ${stats.profitMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subtext="This Month" icon={WalletIcon} warning={stats.profitMonth < 0 ? "Deficit" : undefined} colorClass="bg-emerald-100 text-emerald-700"/>
                <KPI title="Arrivals Today" value={stats.arrivals} subtext={stats.overdueCount > 0 ? `${stats.overdueCount} Overdue` : "Checking in"} warning={stats.overdueCount > 0 ? "Overdue" : undefined} icon={UserIcon} colorClass="bg-blue-100 text-blue-700"/>
                <KPI title="Occupancy" value={`${stats.occupancyRate}%`} subtext={`${stats.inHouse} Rooms`} icon={TicketIcon} colorClass="bg-indigo-100 text-indigo-700"/>
            </>
        ) : (
            <>
                <KPI title="Arrivals" value={stats.arrivals} subtext={stats.overdueCount > 0 ? `${stats.overdueCount} Overdue` : "Checking in"} warning={stats.overdueCount > 0 ? "Overdue" : undefined} icon={UserIcon} colorClass="bg-blue-100 text-blue-700"/>
                <KPI title="Departures" value={stats.departures} subtext="Checking out" icon={LogOutIcon} colorClass="bg-orange-100 text-orange-700"/>
                <KPI title="Occupancy" value={`${stats.occupancyRate}%`} subtext={`${stats.inHouse} Rooms`} icon={TicketIcon} colorClass="bg-indigo-100 text-indigo-700"/>
                <KPI title="Overdue" value={stats.overdueCount} subtext="Pending Arrival" warning={stats.overdueCount > 0 ? "Action" : undefined} icon={AlertTriangleIcon} colorClass="bg-red-100 text-red-700"/>
            </>
        )}
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {isMarketing ? (
            /* MARKETING SPECIFIC VIEW */
            <>
                <Card title="Traffic vs Conversion" className="lg:col-span-2 min-h-[300px]">
                    <div className="w-full h-[250px] relative">
                        {isMounted && (
                            <ResponsiveContainer id="chart-traffic" width="99%" height="100%" minWidth={0} minHeight={0}>
                                <LineChart data={chartData}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}}/>
                                    <Tooltip contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                                    <Line type="monotone" dataKey="bookings" stroke="#0d4a6b" strokeWidth={3} dot={{r: 4, fill:'#0d4a6b'}} name="Bookings" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Card>

                <Card title="Live Website Content" className="min-h-[300px]">
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Hero Headline</div>
                            <div className="text-sm font-bold text-gray-800 line-clamp-1">{webContent?.heroTitle}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
                                <div className="text-[10px] font-bold text-teal-600 uppercase mb-1">Room Showcase</div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${webContent?.showRooms ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <span className="text-xs font-bold text-teal-800">{webContent?.showRooms ? 'Active' : 'Hidden'}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                <div className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Amenities</div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${webContent?.showServices ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <span className="text-xs font-bold text-indigo-800">{webContent?.showServices ? 'Active' : 'Hidden'}</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => onNavigate('website')}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
                        >
                            <LayoutIcon className="w-4 h-4" /> Manage Content
                        </button>
                    </div>
                </Card>

                <Card title="Recent Web Bookings" className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recentActivity.filter(b => b.notes?.includes('Booked via Website')).slice(0, 4).map(b => (
                            <GuestListItem key={b.id} name={b.guestName} room={b.roomType} type="in" status="Web" />
                        ))}
                    </div>
                </Card>
            </>
        ) : isAdminOrManager ? (
            /* ADMIN / MANAGER VIEW */
            <>
                <Card title="Revenue Trend (Gross)" className="lg:col-span-2 min-h-[300px]">
                    <div className="w-full h-[250px] relative">
                        {isMounted && (
                            <ResponsiveContainer id="chart-revenue" width="99%" height="100%" minWidth={0} minHeight={0}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0d4a6b" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#0d4a6b" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}}/>
                                    <Tooltip contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                                    <Area type="monotone" dataKey="revenue" stroke="#0d4a6b" strokeWidth={3} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Card>

                <Card title="Booking Sources" className="min-h-[300px]">
                    <div className="relative w-full h-[180px]">
                        {isMounted && (
                            <ResponsiveContainer id="chart-booking-sources" width="99%" height="100%" minWidth={0} minHeight={0}>
                                <PieChart>
                                    <Pie data={bookingSourcesData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" cornerRadius={4}>
                                        {bookingSourcesData.map((e, i) => <Cell key={i} fill={e.color} stroke="none"/>)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [value, 'Bookings']} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                            <div className="text-2xl font-bold text-gray-800">{bookingSourcesData.reduce((a, b) => a + b.value, 0)}</div>
                            <div className="text-[8px] text-gray-400 font-bold uppercase">Total</div>
                        </div>
                    </div>
                    <div className="mt-4 space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                        {bookingSourcesData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-gray-600 font-medium">{item.name}</span>
                                </div>
                                <span className="font-bold text-gray-800">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Room Status" className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-center flex-1">
                            <div className="text-2xl font-bold text-teal-700">{stats.occupancyRate}%</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase">Occupancy</div>
                        </div>
                        <div className="w-px h-8 bg-gray-100"></div>
                        <div className="text-center flex-1">
                            <div className="text-2xl font-bold text-gray-800">{stats.inHouse}</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase">In-House</div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="text-xs font-bold text-blue-700">Occupied</span>
                            <span className="text-xs font-bold text-blue-800">{stats.inHouse}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-xs font-bold text-gray-500">Available</span>
                            <span className="text-xs font-bold text-gray-800">{Math.max(0, stats.totalRooms - stats.inHouse)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                            <span className="text-xs font-bold text-orange-700">Cleaning</span>
                            <span className="text-xs font-bold text-orange-800">{stats.dirtyRooms}</span>
                        </div>
                    </div>
                </Card>

                <div className="lg:col-span-2">
                    <Card title="Recent Activity">
                        <div className="flex flex-col gap-3">
                            {recentActivity.map(b => (
                                <div key={b.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${b.status === 'CHECKED_IN' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                        <div>
                                            <div className="font-bold text-sm text-gray-800 flex items-center gap-1">
                                                {b.guestName}
                                                {(b.status === 'PENDING' || b.status === 'CONFIRMED') && b.checkIn < new Date().toISOString().split('T')[0] && (
                                                    <AlertTriangleIcon className="w-3 h-3 text-red-500" />
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400">Room {b.roomNumber || '?'} • {b.status.replace('_', ' ')}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-xs font-mono text-gray-500">{b.date.split('T')[0]}</div>
                                        {b.status === 'CHECKED_IN' && b.paidAmount !== undefined && (
                                            <div className="text-[9px] font-bold text-teal-600 mt-1">
                                                Paid: {(b.paidAmount / 1000).toLocaleString()}k
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </>
        ) : (
            /* RECEPTION VIEW */
            <>
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Incoming (Arrivals)" className="h-[400px]">
                        <div className="overflow-y-auto h-full pr-2 space-y-2">
                            {todaysArrivals.length > 0 ? todaysArrivals.map(b => (
                                <GuestListItem 
                                    key={b.id} 
                                    name={b.guestName} 
                                    room={b.roomNumber} 
                                    type="in" 
                                    status={b.checkIn < new Date().toISOString().split('T')[0] ? "Overdue" : "Arrival"} 
                                    overdue={b.checkIn < new Date().toISOString().split('T')[0]}
                                />
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl">
                                    <CheckCircleIcon className="w-10 h-10 mb-2 opacity-50" />
                                    <span className="text-xs font-bold uppercase">All Arrivals Cleared</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card title="Outgoing (Departures)" className="h-[400px]">
                        <div className="overflow-y-auto h-full pr-2 space-y-2">
                            {todaysDepartures.length > 0 ? todaysDepartures.map(b => (
                                <GuestListItem key={b.id} name={b.guestName} room={b.roomNumber} type="out" status="Depart" />
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl">
                                    <LogOutIcon className="w-10 h-10 mb-2 opacity-50" />
                                    <span className="text-xs font-bold uppercase">No Departures Left</span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="Housekeeping Watchlist" className="bg-orange-50 border-orange-100">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-xs font-bold text-orange-700 uppercase">Dirty Rooms</div>
                            <div className="bg-white text-orange-600 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">{dirtyRoomList.length}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {dirtyRoomList.slice(0, 9).map(r => (
                                <div key={r.id} className="bg-white border border-orange-200 text-orange-800 rounded-lg p-2 text-center font-bold text-sm shadow-sm">
                                    {r.name}
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card title="Occupancy Gauge">
                        <div className="relative w-full h-[150px]">
                            {isMounted && (
                                <ResponsiveContainer id="chart-occupancy-gauge" width="99%" height="100%" minWidth={0} minHeight={0}>
                                    <PieChart>
                                        <Pie data={occupancyData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" cornerRadius={4}>
                                            {occupancyData.map((e, i) => <Cell key={i} fill={e.color} stroke="none"/>)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                <div className="text-xl font-bold text-gray-800">{stats.occupancyRate}%</div>
                            </div>
                        </div>
                    </Card>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
