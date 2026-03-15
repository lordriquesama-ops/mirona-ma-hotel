
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { addExpense, getExpenses, deleteExpense, addService, getServices, deleteService, logAction, getBookings, getSettings } from '../services/db';
import { ServiceItem, ExpenseRecord, Booking, SystemSettings } from '../types';
import { WalletIcon, TagIcon, ReceiptIcon, PlusIcon, TrashIcon, SearchIcon, FileTextIcon, CoffeeIcon, CarIcon, ShirtIcon, ScissorsIcon, PencilIcon } from './Icons';
import { getTaxBreakdown, getRoomCost, getConsumptionDetails } from '../utils/finance';
import { SERVICE_CATEGORIES, EXPENSE_CATEGORIES } from '../constants';

interface FinancesProps {
  user: User;
}

const Finances: React.FC<FinancesProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'services' | 'receipts'>('receipts');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [receipts, setReceipts] = useState<Booking[]>([]); // Derived from bookings
  const [settings, setSettings] = useState<SystemSettings>({
      hotelName: 'Hotel Name', hotelPhone: '', hotelEmail: '', websiteUrl: '', currency: 'UGX', taxRate: 0, receiptFooter: '', exchangeRates: {}
  });

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');

  // Forms & Modals
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Booking | null>(null); // For printing

  // Expense Edit State
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState<Partial<ExpenseRecord>>({
    date: new Date().toISOString().split('T')[0],
    category: 'Supplies',
    amount: 0,
    description: ''
  });

  // Service Edit State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newService, setNewService] = useState<Partial<ServiceItem>>({
    name: '',
    price: 0,
    category: 'Food',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const [exp, svc, bks, set] = await Promise.all([getExpenses(), getServices(), getBookings(), getSettings()]);
        setExpenses(exp);
        setServices(svc);
        setSettings(set);
        // Sort bookings by newest first to act as a receipt log
        const sortedBookings = bks.sort((a, b) => Number(b.id) - Number(a.id));
        setReceipts(sortedBookings);
    } catch (err) {
        console.error("Error loading finance data", err);
    } finally {
        setLoading(false);
    }
  };

  const handleOpenExpenseModal = (expense?: ExpenseRecord) => {
      if (expense) {
          setEditingExpenseId(expense.id);
          setNewExpense({ ...expense });
      } else {
          setEditingExpenseId(null);
          setNewExpense({
            date: new Date().toISOString().split('T')[0],
            category: 'Supplies',
            amount: 0,
            description: ''
          });
      }
      setShowExpenseForm(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.description) return;
    
    // Safety check
    if (newExpense.amount < 0) {
        alert("Amount cannot be negative");
        return;
    }

    const record: ExpenseRecord = {
        id: editingExpenseId || Date.now().toString(),
        date: newExpense.date || new Date().toISOString().split('T')[0],
        category: newExpense.category as any,
        amount: Number(newExpense.amount),
        description: newExpense.description || '',
        recordedBy: user.id,
        recordedByName: user.name
    };

    await addExpense(record);
    
    if (editingExpenseId) {
        setExpenses(prev => prev.map(e => e.id === record.id ? record : e));
        await logAction(user, 'UPDATE_EXPENSE', `Updated expense: ${settings.currency} ${record.amount} for ${record.category}`);
    } else {
        setExpenses(prev => [record, ...prev]);
        await logAction(user, 'ADD_EXPENSE', `Added expense: ${settings.currency} ${record.amount} for ${record.category}`);
    }
    
    setShowExpenseForm(false);
  };

  const handleDeleteExpense = async (id: string) => {
      if(!confirm("Are you sure you want to delete this expense record?")) return;
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      await logAction(user, 'DELETE_EXPENSE', `Deleted expense record ${id}`);
  };

  const handleOpenServiceModal = (service?: ServiceItem) => {
      if (service) {
          setEditingServiceId(service.id);
          setNewService({ ...service });
      } else {
          setEditingServiceId(null);
          setNewService({ name: '', price: 0, category: 'Food', description: '' });
      }
      setShowServiceForm(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || newService.price === undefined) return;
    
    // Safety check
    if (newService.price < 0) {
        alert("Price cannot be negative");
        return;
    }

    const item: ServiceItem = {
        id: editingServiceId || Date.now().toString(),
        name: newService.name || '',
        price: Number(newService.price),
        category: newService.category as any,
        description: newService.description
    };

    await addService(item);
    
    if (editingServiceId) {
        setServices(prev => prev.map(s => s.id === item.id ? item : s));
        await logAction(user, 'UPDATE_SERVICE', `Updated service: ${item.name}`);
    } else {
        setServices(prev => [...prev, item]);
        await logAction(user, 'ADD_SERVICE', `Added service: ${item.name}`);
    }
    
    setShowServiceForm(false);
  };

  const handleDeleteService = async (id: string, name: string) => {
      if(!confirm(`Are you sure you want to remove ${name} from the catalog?`)) return;
      await deleteService(id);
      setServices(prev => prev.filter(s => s.id !== id));
      await logAction(user, 'DELETE_SERVICE', `Deleted service: ${name}`);
  };

  const handlePrintReceipt = () => {
      window.print();
  };

  const filteredReceipts = receipts.filter(r => 
      r.guestName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.id.includes(searchTerm) ||
      (r.roomNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredServices = services.filter(s => 
      s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(serviceSearchTerm.toLowerCase())
  );

  // --- SERVICE DISPLAY HELPERS ---
  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'Food': return <CoffeeIcon className="w-4 h-4" />;
          case 'Transport': return <CarIcon className="w-4 h-4" />;
          case 'Laundry': return <ShirtIcon className="w-4 h-4" />;
          case 'Spa': return <ScissorsIcon className="w-4 h-4" />;
          default: return <TagIcon className="w-4 h-4" />;
      }
  };

  const getCategoryColor = (cat: string) => {
      switch(cat) {
          case 'Food': return 'bg-orange-50 text-orange-600 border-orange-100';
          case 'Transport': return 'bg-blue-50 text-blue-600 border-blue-100';
          case 'Laundry': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
          case 'Spa': return 'bg-purple-50 text-purple-600 border-purple-100';
          default: return 'bg-gray-50 text-gray-600 border-gray-100';
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Financial Management</h2>
           <p className="text-sm text-gray-500">Manage expenses, services, and view transaction history</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-w-full">
            <button
                onClick={() => setActiveTab('receipts')}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === 'receipts' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <FileTextIcon className="w-4 h-4" /> Receipts Log
            </button>
            <button
                onClick={() => setActiveTab('expenses')}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === 'expenses' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <WalletIcon className="w-4 h-4" /> Expenses
            </button>
            <button
                onClick={() => setActiveTab('services')}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === 'services' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <TagIcon className="w-4 h-4" /> Services
            </button>
        </div>
      </div>

      {loading ? (
          <div className="text-center py-10 text-gray-400">Loading financial data...</div>
      ) : (
          <>
             {/* RECEIPTS TAB (History) */}
             {activeTab === 'receipts' && (
                 <div className="space-y-6">
                    {/* Stats & Filter */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                        <div className="flex gap-4">
                             <div className="bg-white px-5 py-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="text-gray-500 text-[10px] font-bold uppercase">Total Receipts</div>
                                <div className="text-xl font-bold text-gray-800">{receipts.length}</div>
                             </div>
                             <div className="bg-white px-5 py-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="text-gray-500 text-[10px] font-bold uppercase">Total Revenue</div>
                                <div className="text-xl font-bold text-teal-600">
                                    {settings.currency} {receipts.filter(b => b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT').reduce((a, b) => a + (b.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                             </div>
                        </div>

                        <div className="relative w-full md:w-64">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search receipt #, guest..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    {/* Receipts Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">RCT #</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Guest</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredReceipts.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50/50">
                                        <td className="p-4 text-xs font-mono text-gray-500">{r.id.substring(0,8).toUpperCase()}</td>
                                        <td className="p-4 text-sm text-gray-600">{r.checkIn}</td>
                                        <td className="p-4">
                                            <div className="text-sm font-bold text-gray-800">{r.guestName}</div>
                                            <div className="text-[10px] text-gray-400">Room {r.roomNumber}</div>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-gray-800 font-mono">
                                            {settings.currency} {r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                                                r.status === 'CONFIRMED' || r.status === 'CHECKED_IN' ? 'bg-green-50 text-green-600 border-green-100' :
                                                'bg-orange-50 text-orange-600 border-orange-100'
                                            }`}>
                                                PAID
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {r.status === 'CHECKED_OUT' ? (
                                                <button 
                                                    onClick={() => setSelectedReceipt(r)}
                                                    className="text-teal-600 hover:bg-teal-50 p-2 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 ml-auto"
                                                >
                                                    <ReceiptIcon className="w-4 h-4" /> Reprint
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-300 italic">Checkout Required</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredReceipts.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No receipts found matching your search.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                 </div>
             )}

            {/* EXPENSES TAB */}
            {activeTab === 'expenses' && (
                <div className="space-y-6">
                    {/* Actions */}
                    <div className="flex justify-end">
                        <button 
                            onClick={() => handleOpenExpenseModal()}
                            className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl hover:bg-teal-700 transition-all shadow-sm"
                        >
                            <PlusIcon className="w-5 h-5" /> Add Expense
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-1">Total Expenses (All Time)</div>
                            <div className="text-2xl font-bold text-gray-800">
                                {settings.currency} {expenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-1">Last Expense</div>
                            <div className="text-lg font-bold text-gray-800">
                                {expenses.length > 0 ? `${settings.currency} ${expenses[0].amount.toFixed(2)}` : '-'}
                            </div>
                            <div className="text-xs text-gray-400">{expenses.length > 0 ? expenses[0].category : ''}</div>
                        </div>
                    </div>

                    {/* Expense Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Description</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Recorded By</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Amount</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {expenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-gray-50/50 group">
                                        <td className="p-4 text-sm text-gray-600">{exp.date}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600 border border-gray-200">
                                                {exp.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-800 font-medium">{exp.description}</td>
                                        <td className="p-4 text-sm text-gray-500">{exp.recordedByName}</td>
                                        <td className="p-4 text-sm font-bold text-gray-800 font-mono text-right">
                                            {settings.currency} {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleOpenExpenseModal(exp)}
                                                className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                                title="Edit Record"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteExpense(exp.id)}
                                                className="text-red-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                title="Delete Record"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {expenses.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No expenses recorded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SERVICES TAB - TABULAR LAYOUT */}
            {activeTab === 'services' && (
                <div className="space-y-6">
                    {/* Header Action */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="relative w-full md:w-64">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search services..." 
                                value={serviceSearchTerm}
                                onChange={(e) => setServiceSearchTerm(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button 
                            onClick={() => handleOpenServiceModal()}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" /> Add Item
                        </button>
                    </div>

                    {/* Services Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Service Name</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Description</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Price</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredServices.map(svc => (
                                    <tr key={svc.id} className="hover:bg-gray-50/50 group">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800 text-sm">{svc.name}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(svc.category)}`}>
                                                {getCategoryIcon(svc.category)}
                                                {svc.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 max-w-xs truncate" title={svc.description}>
                                            {svc.description || '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-bold text-gray-800 font-mono text-sm">
                                                {settings.currency} {svc.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleOpenServiceModal(svc)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Item"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteService(svc.id, svc.name)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Item"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredServices.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <TagIcon className="w-12 h-12 mb-3 opacity-20" />
                                                <p className="text-sm font-medium">No services found.</p>
                                                {services.length === 0 && (
                                                    <button onClick={() => handleOpenServiceModal()} className="mt-2 text-blue-600 text-xs font-bold hover:underline">
                                                        Create your first service
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
          </>
      )}

      {/* EXPENSE FORM MODAL */}
      {showExpenseForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in print:hidden">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="bg-gray-800 p-6 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {editingExpenseId ? <PencilIcon className="w-5 h-5"/> : <WalletIcon className="w-5 h-5" />}
                          {editingExpenseId ? 'Edit Expense' : 'Record Expense'}
                      </h3>
                      <button onClick={() => setShowExpenseForm(false)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                              <input required type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                              <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as any})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none">
                                  <option>Supplies</option>
                                  <option>Utilities</option>
                                  <option>Maintenance</option>
                                  <option>Salaries</option>
                                  <option>Marketing</option>
                                  <option>Other</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Amount ({settings.currency})</label>
                          <input required type="number" min="0" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono" placeholder="0" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                          <textarea required value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" rows={3} placeholder="What was purchased?"></textarea>
                      </div>
                      <div className="pt-2 flex justify-end gap-3">
                          <button type="button" onClick={() => setShowExpenseForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                          <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-sm">
                              {editingExpenseId ? 'Save Changes' : 'Save Record'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* SERVICE FORM MODAL */}
      {showServiceForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in print:hidden">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="bg-blue-600 p-6 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <TagIcon className="w-5 h-5" /> {editingServiceId ? 'Edit Service' : 'New Service'}
                      </h3>
                      <button onClick={() => setShowServiceForm(false)} className="text-blue-200 hover:text-white">✕</button>
                  </div>
                  <form onSubmit={handleSaveService} className="p-6 space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Service Name</label>
                          <input required type="text" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Ironing" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                              <select value={newService.category} onChange={e => setNewService({...newService, category: e.target.value as any})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                  <option>Food</option>
                                  <option>Laundry</option>
                                  <option>Transport</option>
                                  <option>Spa</option>
                                  <option>Other</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase">Price ({settings.currency})</label>
                              <input required type="number" min="0" value={newService.price || ''} onChange={e => setNewService({...newService, price: parseFloat(e.target.value)})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="0" />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                          <textarea value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="Details about the service..."></textarea>
                      </div>
                      <div className="pt-2 flex justify-end gap-3">
                          <button type="button" onClick={() => setShowServiceForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm">
                              {editingServiceId ? 'Save Changes' : 'Add Service'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* RECEIPT REPRINT MODAL */}
      {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:p-0">
             
             {/* Print Controls - Hidden during print */}
             <div className="absolute top-4 right-4 flex gap-2 print:hidden z-50">
                <button onClick={() => setSelectedReceipt(null)} className="px-4 py-2 bg-gray-100 rounded text-gray-600 hover:bg-gray-200">Close</button>
                <button onClick={handlePrintReceipt} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center gap-2">
                    <ReceiptIcon className="w-4 h-4" /> Print Copy
                </button>
            </div>

             {/* THERMAL POS RECEIPT LAYOUT */}
            <div id="printable-receipt" className="bg-white w-[80mm] p-4 mx-auto shadow-2xl print:shadow-none print:w-full print:m-0 font-mono text-black border border-gray-100">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-2 font-serif text-xl font-bold">M</div>
                    <h2 className="font-bold text-lg uppercase tracking-widest">{settings.hotelName || 'MIRONA MA'}</h2>
                    <p className="text-[10px] opacity-70">{settings.hotelEmail}</p>
                    <p className="text-[10px] opacity-70">Tel: {settings.hotelPhone}</p>
                </div>

                <div className="border-b border-dashed border-black/30 my-4"></div>
                
                <div className="text-[11px] space-y-1.5 mb-4">
                    <div className="flex justify-between">
                        <span className="opacity-60">RECEIPT #:</span>
                        <span className="font-bold">{selectedReceipt.id.substring(0,8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-60">DATE:</span>
                        <span>{new Date().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-60">GUEST:</span>
                        <span className="font-bold uppercase">{selectedReceipt.guestName.substring(0,20)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-60">ISSUED BY:</span>
                        <span>{user.name.split(' ')[0].toUpperCase()}</span>
                    </div>
                    {selectedReceipt.paymentMethod && (
                         <div className="flex justify-between">
                            <span className="opacity-60">PAYMENT:</span>
                            <span className="font-bold">{selectedReceipt.paymentMethod.toUpperCase()}</span>
                        </div>
                    )}
                </div>

                <div className="border-b border-dashed border-black/30 my-4"></div>

                <div className="text-[11px] mb-4">
                    <div className="flex font-bold mb-2 border-b border-black/10 pb-1">
                        <span className="flex-1">DESCRIPTION</span>
                        <span className="w-8 text-center">QTY</span>
                        <span className="w-20 text-right">AMOUNT</span>
                    </div>
                    {/* Room Charge */}
                    <div className="flex py-1">
                        <div className="flex-1">
                            <div className="font-bold">{selectedReceipt.roomType.toUpperCase()}</div>
                            <div className="text-[9px] opacity-60">ROOM {selectedReceipt.roomNumber} | {selectedReceipt.checkIn} - {selectedReceipt.checkOut}</div>
                        </div>
                        <span className="w-8 text-center">1</span>
                        <span className="w-20 text-right font-bold">{(getRoomCost(selectedReceipt)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pl-2 text-[10px] italic">Room {selectedReceipt.roomNumber}</div>
                    <div className="pl-2 text-[10px] italic">{selectedReceipt.checkIn} to {selectedReceipt.checkOut}</div>

                    {/* Extra Services */}
                    {selectedReceipt.charges && selectedReceipt.charges.length > 0 && (
                        <>
                            <div className="my-2 border-b border-dotted border-black/10"></div>
                            {selectedReceipt.charges.map((charge, idx) => (
                                <div key={idx} className="flex py-0.5">
                                    <span className="flex-1 uppercase">{charge.description.substring(0,20)}</span>
                                    <span className="w-8 text-center">{charge.qty}</span>
                                    <span className="w-20 text-right">{charge.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <div className="border-b border-dashed border-black/30 my-4"></div>

                <div className="text-[11px] font-bold space-y-2">
                    <div className="flex justify-between">
                        <span className="opacity-60">SUBTOTAL:</span>
                        <span>{settings.currency} {getTaxBreakdown(selectedReceipt.amount, settings.taxRate).subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {settings.taxRate > 0 && (
                        <div className="flex justify-between">
                            <span className="opacity-60">TAX ({settings.taxRate}%):</span>
                            <span>{settings.currency} {getTaxBreakdown(selectedReceipt.amount, settings.taxRate).tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-black pt-2 mt-2">
                        <span>TOTAL DUE:</span>
                        <span>{settings.currency} {getTaxBreakdown(selectedReceipt.amount, settings.taxRate).grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[11px] border-t border-dashed border-black/20 pt-1 mt-1">
                        <span>TOTAL PAID:</span>
                        <span>{settings.currency} {(selectedReceipt.paidAmount || 0).toLocaleString()}</span>
                    </div>

                </div>

                <div className="mt-8 text-center space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Thank you for staying with us!</p>
                    <p className="text-[9px] opacity-60 italic">{settings.receiptFooter || 'Please come again.'}</p>
                    <div className="pt-4 opacity-30 text-[8px]">
                        POWERED BY MIRONA COMMAND CENTER
                    </div>
                </div>
            </div>

          </div>
      )}
    </div>
  );
};

export default Finances;
