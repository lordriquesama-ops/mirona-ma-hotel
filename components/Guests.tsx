
import React, { useState, useEffect } from 'react';
import { getGuests, saveGuest, deleteGuest, logAction, getBookings, upsertGuestFromBooking } from '../services/db';
import { Booking, Guest, User } from '../types';
import { UserIcon, SearchIcon, PhoneIcon, MailIcon, StarIcon, PencilIcon, SortIcon, UserGroupIcon, TrashIcon, AlertTriangleIcon, RefreshCwIcon, BuildingIcon } from './Icons';

interface GuestsProps {
    user: User;
}

type SortKey = 'name' | 'visits' | 'totalSpent' | 'lastVisit';

const Guests: React.FC<GuestsProps> = ({ user }) => {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [filterInHouse, setFilterInHouse] = useState(false);
    
    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'lastVisit', direction: 'desc' });

    // Edit/Create State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

    // Delete Modal State
    const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);

    useEffect(() => {
        loadGuests();
    }, []);

    const loadGuests = async () => {
        try {
            const [fetchedGuests, fetchedBookings] = await Promise.all([
                getGuests(),
                getBookings()
            ]);
            setGuests(fetchedGuests || []);
            setActiveBookings(fetchedBookings.filter(b => b.status === 'CHECKED_IN'));
            setLoading(false);
        } catch (err) {
            console.error("Failed to load guests", err);
            setLoading(false);
        }
    };

    const handleEditClick = (guest: Guest) => {
        if (user.role === 'RECEPTION') return;
        setEditingGuest({...guest});
        setIsEditModalOpen(true);
    };

    const confirmDelete = (guest: Guest) => {
        if (user.role === 'RECEPTION') return;
        setGuestToDelete(guest);
    };

    const executeDelete = async () => {
        if (!guestToDelete) return;
        if (user.role === 'RECEPTION') return;
        
        try {
            await deleteGuest(guestToDelete.id);
            setGuests(prev => prev.filter(g => g.id !== guestToDelete.id));
            
            await logAction(user, 'DELETE_GUEST', `Deleted guest profile: ${guestToDelete.name}`);
            setGuestToDelete(null);
        } catch (err) {
            console.error("Failed to delete guest", err);
            alert("Error deleting guest.");
        }
    };

    const handleSaveGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!editingGuest) return;
        if (user.role === 'RECEPTION') return;

        try {
            const guestToSave = { ...editingGuest };
            
            // If new guest (no ID), generate one
            if (!guestToSave.id) {
                guestToSave.id = `g-${Date.now()}`;
            }

            await saveGuest(guestToSave);
            
            const action = editingGuest.id ? 'UPDATE_GUEST' : 'CREATE_GUEST';
            await logAction(user, action, `${action === 'CREATE_GUEST' ? 'Added' : 'Updated'} guest profile: ${guestToSave.name}`);
            
            if (editingGuest.id) {
                setGuests(prev => prev.map(g => g.id === guestToSave.id ? guestToSave : g));
            } else {
                setGuests(prev => [...prev, guestToSave]);
            }
            
            setIsEditModalOpen(false);
        } catch (err) {
            console.error("Failed to save guest", err);
            alert("Error saving guest details.");
        }
    };

    const handleSyncFromBookings = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            const allBookings = await getBookings();
            // Process in sequence to avoid IndexedDB conflicts
            for (const booking of allBookings) {
                await upsertGuestFromBooking(booking);
            }
            await loadGuests();
            await logAction(user, 'SYNC_GUESTS', 'Manually synced guest directory from bookings');
            alert(`Sync complete! Processed ${allBookings.length} bookings.`);
        } catch (err) {
            console.error("Sync failed", err);
            alert("Failed to sync guest data.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const isGuestInHouse = (guest: Guest) => {
        return activeBookings.some(b => 
            (guest.phone && b.phone === guest.phone) || 
            (guest.identification && b.identification === guest.identification) ||
            (b.guestName.toLowerCase() === guest.name.toLowerCase())
        );
    };

    const processedGuests = guests
        .filter(g => {
            const matchesSearch = 
                g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.phone.includes(searchTerm) ||
                g.identification.includes(searchTerm) ||
                (g.email && g.email.toLowerCase().includes(searchTerm.toLowerCase()));
            
            if (filterInHouse) {
                return matchesSearch && isGuestInHouse(g);
            }
            return matchesSearch;
        })
        .sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const SortIndicator = ({ active }: { active: boolean }) => {
        if (!active) return <SortIcon className="w-3 h-3 text-gray-300 opacity-50" />;
        return <SortIcon className={`w-3 h-3 text-teal-600 ${sortConfig.direction === 'desc' ? 'transform rotate-180' : ''}`} />;
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading guest directory...</div>;

    const totalGuests = guests.length;
    const vipCount = guests.filter(g => g.isVip).length;
    const inHouseCount = guests.filter(isGuestInHouse).length;
    const canEdit = user.role !== 'RECEPTION';

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <UserIcon className="w-6 h-6 text-teal-600" />
                        Guest Directory
                    </h2>
                    <p className="text-sm text-gray-500">Manage persistent guest profiles and CRM data</p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                    <button 
                        onClick={handleSyncFromBookings}
                        disabled={isSyncing}
                        className={`bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 hover:bg-gray-50 transition-colors ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className={`p-2 bg-teal-50 text-teal-600 rounded-lg ${isSyncing ? 'animate-spin' : ''}`}>
                            <RefreshCwIcon className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <div className="text-[10px] font-bold text-gray-400 uppercase">Sync Data</div>
                            <div className="text-xs font-bold text-gray-800 leading-none">{isSyncing ? 'Syncing...' : 'From Bookings'}</div>
                        </div>
                    </button>
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <UserGroupIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">Total Guests</div>
                            <div className="text-lg font-bold text-gray-800 leading-none">{totalGuests}</div>
                        </div>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <StarIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">VIP Members</div>
                            <div className="text-lg font-bold text-gray-800 leading-none">{vipCount}</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setFilterInHouse(!filterInHouse)}
                        className={`px-4 py-2 rounded-xl shadow-sm border flex items-center gap-3 transition-all ${filterInHouse ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-gray-100 text-gray-800 hover:bg-gray-50'}`}
                    >
                        <div className={`p-2 rounded-lg ${filterInHouse ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'}`}>
                            <BuildingIcon className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <div className={`text-[10px] font-bold uppercase ${filterInHouse ? 'text-teal-100' : 'text-gray-400'}`}>In-House</div>
                            <div className="text-lg font-bold leading-none">{inHouseCount}</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search by Name, Phone, Email or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                </div>
            </div>

            {/* Guest Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th onClick={() => handleSort('name')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group">
                                    <div className="flex items-center gap-1">Guest Profile <SortIndicator active={sortConfig.key === 'name'} /></div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Info</th>
                                <th onClick={() => handleSort('visits')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none">
                                    <div className="flex items-center gap-1">Visits <SortIndicator active={sortConfig.key === 'visits'} /></div>
                                </th>
                                <th onClick={() => handleSort('totalSpent')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none">
                                    <div className="flex items-center gap-1">Total Spent <SortIndicator active={sortConfig.key === 'totalSpent'} /></div>
                                </th>
                                <th onClick={() => handleSort('lastVisit')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none">
                                    <div className="flex items-center gap-1">Last Stay <SortIndicator active={sortConfig.key === 'lastVisit'} /></div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {processedGuests.map(guest => (
                                <tr key={guest.id} className="hover:bg-gray-50/50 group transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0 border border-teal-100">
                                                    {guest.name.charAt(0)}
                                                </div>
                                                {guest.isVip && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                                                        <StarIcon className="w-2 h-2 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-gray-800 text-sm">{guest.name}</div>
                                                    {isGuestInHouse(guest) && (
                                                        <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 text-[9px] font-bold rounded uppercase tracking-wider">In-House</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400">{guest.identificationType}: {guest.identification || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            {guest.phone && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <PhoneIcon className="w-3 h-3 text-gray-400" /> {guest.phone}
                                                </div>
                                            )}
                                            {guest.email && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <MailIcon className="w-3 h-3 text-gray-400" /> {guest.email}
                                                </div>
                                            )}
                                            {!guest.phone && !guest.email && <span className="text-xs text-gray-300 italic">No contact info</span>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-medium text-gray-700">{guest.visits}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className={`text-sm font-bold font-mono ${guest.totalSpent > 1000000 ? 'text-teal-600' : 'text-gray-700'}`}>
                                            {(guest.totalSpent/1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}k
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm text-gray-600">
                                            {guest.lastVisit ? new Date(guest.lastVisit).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: '2-digit'}) : '-'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        {canEdit ? (
                                            <>
                                                <button 
                                                    onClick={() => handleEditClick(guest)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Profile"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => confirmDelete(guest)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                                                    title="Delete Profile"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">View Only</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {processedGuests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400 text-sm">
                                        No guests found matching "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EDIT GUEST MODAL */}
            {isEditModalOpen && editingGuest && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-teal-600 p-6 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <PencilIcon className="w-5 h-5" />
                                Edit Guest Profile
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-teal-100 hover:text-white">✕</button>
                        </div>
                        
                        <form onSubmit={handleSaveGuest} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Guest Name <span className="text-red-500">*</span></label>
                                <input 
                                    required
                                    type="text" 
                                    value={editingGuest.name}
                                    onChange={(e) => setEditingGuest({...editingGuest, name: e.target.value})}
                                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                                    <input 
                                        type="tel" 
                                        value={editingGuest.phone}
                                        onChange={(e) => setEditingGuest({...editingGuest, phone: e.target.value})}
                                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                                    <input 
                                        type="email" 
                                        value={editingGuest.email}
                                        onChange={(e) => setEditingGuest({...editingGuest, email: e.target.value})}
                                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Identification</label>
                                <div className="flex gap-2">
                                    <select 
                                        className="w-1/3 mt-1 p-2 border rounded-lg bg-white text-xs font-bold text-gray-600 focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={editingGuest.identificationType}
                                        onChange={(e) => setEditingGuest({...editingGuest, identificationType: e.target.value})}
                                    >
                                        <option>National ID</option>
                                        <option>Passport</option>
                                        <option>Driving License</option>
                                        <option>Other</option>
                                    </select>
                                    <input 
                                        className="w-2/3 mt-1 p-2 border rounded-lg text-gray-600 focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={editingGuest.identification}
                                        onChange={(e) => setEditingGuest({...editingGuest, identification: e.target.value})}
                                        placeholder="ID Number"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Notes</label>
                                <textarea 
                                    value={editingGuest.notes || ''}
                                    onChange={(e) => setEditingGuest({...editingGuest, notes: e.target.value})}
                                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    rows={3}
                                    placeholder="Preferences, allergies, special requests..."
                                ></textarea>
                            </div>

                            <div className="flex items-center gap-2 pt-2 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                <input 
                                    type="checkbox" 
                                    id="isVip"
                                    checked={editingGuest.isVip}
                                    onChange={(e) => setEditingGuest({...editingGuest, isVip: e.target.checked})}
                                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 accent-amber-600"
                                />
                                <label htmlFor="isVip" className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                    <StarIcon className="w-4 h-4" /> Mark as VIP Guest
                                </label>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-sm">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {guestToDelete && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-red-100">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangleIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Guest Profile?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete <span className="font-bold text-gray-800">{guestToDelete.name}</span>? 
                                This action will remove their history and stats permanently.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setGuestToDelete(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={executeDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Guests;
