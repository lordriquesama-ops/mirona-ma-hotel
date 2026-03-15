
import React, { useState, useEffect } from 'react';
import { SettingsIcon, CheckIcon, SearchIcon, PlusIcon, TrashIcon, PencilIcon, SortIcon, BroomIcon, SparklesIcon, XCircleIcon, FilterIcon, ImageIcon } from './Icons';
import { logAction, getRoomCategories, updateRoomCategory, getRooms, updateRoom, addRoom, deleteRoom, checkRoomExists, uploadImage } from '../services/db';
import { RoomCategory, Room, User } from '../types';

// SVG Placeholder
const RoomImage = ({ category, color, name, status }: { category: string; color: string; name: string; status: string }) => {
  const getStatusColor = (s: string) => {
    switch(s) {
        case 'Available': return 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]';
        case 'Occupied': return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]';
        case 'Cleaning': return 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]';
        case 'Maintenance': return 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]';
        default: return 'bg-gray-400';
    }
  };

  return (
    <div className={`w-full h-28 ${color} flex items-center justify-center relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20"></div>
      <div className="text-white opacity-10 transform group-hover:scale-110 transition-transform duration-500 font-serif text-6xl font-bold select-none">
          {name.substring(0, 1)}
      </div>
      <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/70 to-transparent">
          <div className="text-white text-[9px] uppercase tracking-wider opacity-70 mb-0.5">{category}</div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ring-1 ring-white/20 ${getStatusColor(status)}`} title={status}></div>
            <div className="text-white font-bold text-sm leading-none">{name}</div>
          </div>
      </div>
    </div>
  );
};

interface RoomsProps {
  user: User;
}

const Rooms: React.FC<RoomsProps> = ({ user }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string>(user.role);
  const [sortConfig, setSortConfig] = useState('hierarchy');
  
  // Status Filtering
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Inventory Management State
  const [isInventoryMode, setIsInventoryMode] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  
  // Quick Status Update State
  const [statusModalRoom, setStatusModalRoom] = useState<Room | null>(null);
  
  // Admin Editing State (Categories)
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [editForm, setEditForm] = useState<RoomCategory[]>([]);

  // Add/Edit Room Form
  const [newRoom, setNewRoom] = useState<{id: string, name: string, categoryId: string, price: number}>({
      id: '', name: '', categoryId: '', price: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cats, persistentRooms] = await Promise.all([
          getRoomCategories(),
          getRooms()
      ]);
      setCategories(cats);
      setRooms(persistentRooms);
      
      // Init new room category
      if (cats.length > 0) {
          setNewRoom(prev => ({...prev, categoryId: cats[0].id, price: cats[0].price}));
      }
    } catch (err) {
      console.error("Failed to load room data", err);
    }
  };

  const handleStatusChange = async (roomId: string, newStatus: Room['status']) => {
    // If room is occupied, confirm action as it might break booking logic
    const currentRoom = rooms.find(r => r.id === roomId);
    if (currentRoom?.status === 'Occupied' && newStatus !== 'Occupied') {
        if (!confirm("WARNING: This room is marked Occupied. Changing status manually will NOT check out the guest or calculate charges.\n\nAre you sure you want to force this change?")) {
            return;
        }
    }

    // Optimistic Update
    const updatedRooms = rooms.map(room => 
      room.id === roomId ? { ...room, status: newStatus } : room
    );
    setRooms(updatedRooms);
    setStatusModalRoom(null); // Close modal if open

    // Persist
    const roomToUpdate = updatedRooms.find(r => r.id === roomId);
    if (roomToUpdate) {
        await updateRoom(roomToUpdate);
        await logAction(user, 'UPDATE_ROOM', `Changed room ${roomId} status to ${newStatus}`);
        
        // Reload from Supabase to ensure consistency
        await loadData();
    }
  };

  // --- ROOM INVENTORY MANAGEMENT ---
  const openAddRoomModal = () => {
      setEditingRoomId(null);
      // Smart default: Select the category corresponding to the active tab
      let defaultCatId = categories[0]?.id || '';
      if (activeTab !== 'All') {
          const activeCat = categories.find(c => c.name === activeTab);
          if (activeCat) defaultCatId = activeCat.id;
      }

      setNewRoom({ id: '', name: '', categoryId: defaultCatId, price: categories.find(c => c.id === defaultCatId)?.price || 0 });
      setIsAddRoomModalOpen(true);
  };

  const openEditRoomModal = (room: Room) => {
      setEditingRoomId(room.id);
      setNewRoom({ id: room.id, name: room.name, categoryId: room.categoryId, price: room.price });
      setIsAddRoomModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newRoom.id || !newRoom.name) return;

      const cat = categories.find(c => c.id === newRoom.categoryId);
      if (!cat) return;

      if (editingRoomId) {
          // UPDATE
          const existingRoom = rooms.find(r => r.id === editingRoomId);
          if (existingRoom) {
              const updatedRoom: Room = {
                  ...existingRoom,
                  name: newRoom.name,
                  categoryId: cat.id,
                  categoryName: cat.name,
                  price: newRoom.price, // Use custom price
                  color: cat.color
              };
              await updateRoom(updatedRoom);
              setRooms(prev => prev.map(r => r.id === editingRoomId ? updatedRoom : r));
              await logAction(user, 'UPDATE_ROOM', `Updated details for room ${updatedRoom.name}`);
              
              // Reload from Supabase to ensure consistency
              await loadData();
          }
      } else {
          // CREATE
          if (await checkRoomExists(newRoom.id)) {
              alert('Room ID already exists. Please choose a unique ID.');
              return;
          }

          const roomData: Room = {
              id: newRoom.id,
              name: newRoom.name,
              categoryId: cat.id,
              categoryName: cat.name,
              price: newRoom.price, // Use custom price
              color: cat.color,
              status: 'Available'
          };

          await addRoom(roomData);
          setRooms(prev => [...prev, roomData]);
          await logAction(user, 'CREATE_ROOM', `Added new room: ${roomData.name} (${roomData.id})`);
          
          // Reload from Supabase to ensure consistency
          await loadData();
      }

      setIsAddRoomModalOpen(false);
      setNewRoom({ id: '', name: '', categoryId: categories[0].id, price: categories[0].price });
  };

  const handleDeleteRoom = async (room: Room) => {
      if (room.status === 'Occupied') {
          alert(`Cannot delete Room ${room.name} because it is currently Occupied. Please check out or move the guest first.`);
          return;
      }

      if(!confirm(`Are you sure you want to delete Room ${room.name}? This cannot be undone.`)) return;
      
      await deleteRoom(room.id);
      setRooms(prev => prev.filter(r => r.id !== room.id));
      
      await logAction(user, 'DELETE_ROOM', `Deleted room: ${room.name} (${room.id})`);
      
      // Reload from Supabase to ensure consistency
      await loadData();
  };

  // --- CATEGORY MANAGEMENT ---
  const handleEditCategoriesClick = () => {
    setEditForm(JSON.parse(JSON.stringify(categories))); // Deep copy
    setIsEditingCategories(true);
  };

  const handleEditCategoryChange = (id: string, field: keyof RoomCategory, value: any) => {
    setEditForm(prev => prev.map(cat => 
        cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };

  const handleSaveCategories = async () => {
    try {
        // Save all changes
        for (const cat of editForm) {
            await updateRoomCategory(cat);
        }
        
        await logAction(user, 'UPDATE_PRICING', 'Updated room categories and pricing');
        
        setCategories(editForm);
        // Reload rooms to reflect price/color changes handled by db service
        const updatedRooms = await getRooms();
        setRooms(updatedRooms);
        setIsEditingCategories(false);
    } catch (err: any) {
        console.error("Failed to save categories", err);
        if (err.message?.includes('image_url column missing')) {
            alert("⚠️ Image upload failed: The database is missing the image_url column.\n\nPlease run add-category-images.sql in your Supabase SQL editor first, then try again.");
        } else {
            alert("Failed to save changes: " + (err.message || err));
        }
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesTab = activeTab === 'All' || room.categoryName === activeTab;
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || room.status === filterStatus;
    return matchesTab && matchesSearch && matchesStatus;
  });

  // Sorting Logic
  const sortedRooms = [...filteredRooms].sort((a, b) => {
    switch(sortConfig) {
      case 'hierarchy':
         const order = ['platinum', 'gold', 'silver', 'safari'];
         const idxA = order.indexOf(a.categoryId);
         const idxB = order.indexOf(b.categoryId);
         if (idxA !== idxB) return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
         return a.name.localeCompare(b.name, undefined, { numeric: true });
      case 'name-asc':
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      case 'name-desc':
        return b.name.localeCompare(a.name, undefined, { numeric: true });
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'status':
        // Custom order: Available -> Cleaning -> Maintenance -> Occupied
        const statusOrder = { 'Available': 1, 'Cleaning': 2, 'Maintenance': 3, 'Occupied': 4 };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      default:
        return 0;
    }
  });

  const uniqueCategories = ['All', ...categories.map(c => c.name)];

  const canManage = userRole === 'MANAGER' || userRole === 'ADMIN';
  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-lg font-bold text-gray-800">Room Inventory</h2>
           <p className="text-xs text-gray-500">
               {isInventoryMode ? 'Add, edit, or remove individual rooms' : 'View room availability and status'}
           </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
           {/* Toggle Inventory Mode */}
           {canManage && (
               <div className="flex items-center bg-gray-100 rounded-lg p-1 shrink-0">
                   <button 
                       onClick={() => setIsInventoryMode(false)}
                       className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${!isInventoryMode ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}
                   >
                       View Status
                   </button>
                   <button 
                       onClick={() => setIsInventoryMode(true)}
                       className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${isInventoryMode ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}
                   >
                       Manage Inventory
                   </button>
               </div>
           )}
           
           {/* Status Filter Dropdown */}
           <div className="relative shrink-0">
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <FilterIcon className="w-3.5 h-3.5" />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-7 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none cursor-pointer w-32"
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Maintenance">Maintenance</option>
              </select>
           </div>

            {/* Sorting Dropdown */}
           <div className="relative shrink-0">
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <SortIcon className="w-3.5 h-3.5" />
              </div>
              <select
                value={sortConfig}
                onChange={(e) => setSortConfig(e.target.value)}
                className="pl-7 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none cursor-pointer"
              >
                <option value="hierarchy">Hierarchy</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="price-asc">Price (Low-High)</option>
                <option value="price-desc">Price (High-Low)</option>
                <option value="status">Status Order</option>
              </select>
           </div>

           <div className="relative flex-1 md:w-40 min-w-[120px]">
              <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input 
                  type="text" 
                  placeholder="Find room..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
           </div>
           
           {canManage && (
             <button 
                onClick={handleEditCategoriesClick}
                className="bg-gray-800 text-white p-1.5 rounded-lg hover:bg-gray-700 transition-colors shadow-sm shrink-0"
                title="Manage Categories & Pricing"
             >
                <SettingsIcon className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1.5 pb-1 no-scrollbar">
        {uniqueCategories.map(cat => (
            <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    activeTab === cat 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                }`}
            >
                {cat}
            </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        
        {/* Add New Room Card (Visible in Inventory Mode) */}
        {isInventoryMode && (
            <button 
                onClick={openAddRoomModal}
                className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-4 h-full hover:bg-teal-50 hover:border-teal-300 transition-colors group min-h-[180px]"
            >
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-teal-600 mb-2 group-hover:scale-110 transition-transform">
                    <PlusIcon className="w-5 h-5" />
                </div>
                <div className="font-bold text-[10px] text-gray-400 group-hover:text-teal-700 uppercase tracking-tight">Add Room</div>
            </button>
        )}

        {sortedRooms.map((room) => (
          <div key={room.id} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 group relative">
            
            {/* Inventory Mode Overlays */}
            {isInventoryMode && (
                <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                    <button 
                        onClick={() => openEditRoomModal(room)}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transform hover:scale-110 transition-all"
                        title="Edit Room Details"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleDeleteRoom(room)}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg transform hover:scale-110 transition-all"
                        title="Delete Room"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            <RoomImage category={room.categoryName} color={room.color} name={room.name} status={room.status} />
            
            <div className="p-2">
               <div className="flex justify-between items-center">
                  <button 
                    onClick={() => !isInventoryMode && canManage && setStatusModalRoom(room)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border transition-all ${!isInventoryMode && canManage ? 'cursor-pointer hover:brightness-95 hover:shadow-sm' : ''} ${
                      room.status === 'Available' ? 'bg-green-50 text-green-600 border-green-100' :
                      room.status === 'Occupied' ? 'bg-red-50 text-red-600 border-red-100' :
                      room.status === 'Cleaning' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      'bg-orange-50 text-orange-600 border-orange-100'
                    }`}
                    title={!isInventoryMode && canManage ? "Click to change status" : ""}
                  >
                      {room.status}
                  </button>
                  <div className="text-right">
                      <div className="font-bold text-gray-800 text-[11px] data-value">{(room.price / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}k</div>
                  </div>
               </div>
            </div>
          </div>
        ))}
        
        {sortedRooms.length === 0 && !isInventoryMode && (
            <div className="col-span-full p-10 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <FilterIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No rooms match the selected filters.</p>
                <button onClick={() => {setFilterStatus('All'); setSearchTerm('');}} className="text-teal-600 font-bold text-xs mt-2 hover:underline">Clear Filters</button>
            </div>
        )}
      </div>
        
      {sortedRooms.length === 0 && !isInventoryMode && (
          <div className="p-10 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <FilterIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No rooms match the selected filters.</p>
              <button onClick={() => {setFilterStatus('All'); setSearchTerm('');}} className="text-teal-600 font-bold text-xs mt-2 hover:underline">Clear Filters</button>
          </div>
      )}

      {/* STATUS UPDATE MODAL */}
      {statusModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="bg-gray-800 p-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">
                        Update Room {statusModalRoom.name}
                    </h3>
                    <button onClick={() => setStatusModalRoom(null)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                
                <div className="p-6 space-y-3">
                    
                    {/* SAFEGUARD WARNING FOR OCCUPIED ROOMS */}
                    {statusModalRoom.status === 'Occupied' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-4">
                            <strong className="block mb-1">⚠️ Active Guest Warning</strong>
                            This room is currently occupied. Changing status here will not check out the guest or process payment. 
                            Please use the <strong>Bookings</strong> module to Check Out guests correctly.
                        </div>
                    )}

                    <p className="text-sm text-gray-500 mb-2">Select new status:</p>
                    
                    <button 
                        onClick={() => handleStatusChange(statusModalRoom.id, 'Available')}
                        className="w-full p-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 flex items-center justify-between group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-200"></div>
                            <span className="font-bold text-green-700">Available</span>
                        </div>
                        {statusModalRoom.status === 'Available' && <CheckIcon className="w-5 h-5 text-green-600"/>}
                    </button>

                    <button 
                        onClick={() => handleStatusChange(statusModalRoom.id, 'Cleaning')}
                        className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 flex items-center justify-between group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200"></div>
                            <span className="font-bold text-blue-700">Cleaning</span>
                        </div>
                        {statusModalRoom.status === 'Cleaning' && <CheckIcon className="w-5 h-5 text-blue-600"/>}
                    </button>

                    <button 
                        onClick={() => handleStatusChange(statusModalRoom.id, 'Maintenance')}
                        className="w-full p-3 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 flex items-center justify-between group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-200"></div>
                            <span className="font-bold text-orange-700">Maintenance</span>
                        </div>
                        {statusModalRoom.status === 'Maintenance' && <CheckIcon className="w-5 h-5 text-orange-600"/>}
                    </button>

                    <button 
                        onClick={() => handleStatusChange(statusModalRoom.id, 'Occupied')}
                        className="w-full p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-between group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200"></div>
                            <span className="font-bold text-red-700">Occupied</span>
                        </div>
                        {statusModalRoom.status === 'Occupied' && <CheckIcon className="w-5 h-5 text-red-600"/>}
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* ADD/EDIT ROOM MODAL */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-teal-600 p-6 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {editingRoomId ? <PencilIcon className="w-5 h-5"/> : <PlusIcon className="w-5 h-5" />} 
                        {editingRoomId ? 'Edit Room' : 'Add New Room'}
                    </h3>
                    <button onClick={() => setIsAddRoomModalOpen(false)} className="text-teal-100 hover:text-white">✕</button>
                </div>
                
                <form onSubmit={handleSaveRoom} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Room ID</label>
                        <input 
                            required 
                            type="text" 
                            disabled={!!editingRoomId} // ID is immutable during edit
                            value={newRoom.id}
                            onChange={(e) => setNewRoom({...newRoom, id: e.target.value.toUpperCase()})}
                            className={`w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${editingRoomId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                            placeholder="e.g. A21"
                        />
                        {!editingRoomId && <p className="text-[10px] text-gray-400 mt-1">Must be unique</p>}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Room Name</label>
                        <input 
                            required 
                            type="text" 
                            value={newRoom.name}
                            onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                            className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            placeholder="e.g. A21 or Lion"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                        <select 
                            value={newRoom.categoryId}
                            onChange={(e) => {
                                const catId = e.target.value;
                                const cat = categories.find(c => c.id === catId);
                                setNewRoom({...newRoom, categoryId: catId, price: cat?.price || 0});
                            }}
                            className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name} ({cat.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UGX)</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Room Price (UGX)</label>
                        <input 
                            required 
                            type="number" 
                            value={newRoom.price}
                            onChange={(e) => setNewRoom({...newRoom, price: parseInt(e.target.value)})}
                            className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                            placeholder="0"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Defaults to category price, but can be adjusted.</p>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsAddRoomModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-sm">
                            {editingRoomId ? 'Update Room' : 'Create Room'}
                        </button>
                    </div>
                </form>
             </div>
        </div>
      )}

      {/* Admin Edit Category Modal */}
      {isEditingCategories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="bg-gray-800 p-6 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <SettingsIcon className="w-6 h-6" /> Manage Categories
                    </h3>
                    <button onClick={() => setIsEditingCategories(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="space-y-6">
                        {editForm.map((cat, idx) => (
                            <div key={cat.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-3">
                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                                    <div className="flex-1 w-full">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Category Name</label>
                                        <input 
                                            type="text" 
                                            value={cat.name}
                                            onChange={(e) => handleEditCategoryChange(cat.id, 'name', e.target.value)}
                                            className="w-full mt-1 p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                    <div className="w-full md:w-32">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Count</label>
                                        <div className="w-full mt-1 p-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 text-sm">
                                            {cat.count} (Fixed)
                                        </div>
                                    </div>
                                    <div className="w-full md:w-40">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Price (UGX)</label>
                                        <input 
                                            type="number" 
                                            value={cat.price}
                                            onChange={(e) => handleEditCategoryChange(cat.id, 'price', parseInt(e.target.value))}
                                            className="w-full mt-1 p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                                        />
                                    </div>
                                    <div className={`w-8 h-8 rounded-full shrink-0 mb-1 ${cat.color} border-2 border-white shadow-sm`}></div>
                                </div>
                                {/* Category Image Upload */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Category Photo <span className="text-gray-400 font-normal normal-case">(shown on public website)</span></label>
                                    <div className="mt-1">
                                        {cat.image ? (
                                            <div className="relative group w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                                                <img 
                                                    src={cat.image} 
                                                    alt={cat.name} 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        // Hide broken image, show placeholder
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-100', 'flex', 'items-center', 'justify-center');
                                                        const msg = document.createElement('p');
                                                        msg.className = 'text-xs text-red-500 text-center p-2';
                                                        msg.textContent = '⚠️ Image failed to load. Check Supabase Storage bucket is public.';
                                                        (e.target as HTMLImageElement).parentElement!.appendChild(msg);
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <label className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100">
                                                        Replace
                                                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
                                                            try {
                                                                const url = await uploadImage(file, `categories/${cat.id}-${Date.now()}`);
                                                                handleEditCategoryChange(cat.id, 'image', url);
                                                            } catch (err) { alert('Upload failed'); }
                                                        }} />
                                                    </label>
                                                    <button type="button" onClick={() => handleEditCategoryChange(cat.id, 'image', undefined)} className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-600">Remove</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="w-full h-24 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-colors cursor-pointer">
                                                <ImageIcon className="w-6 h-6" />
                                                <span className="text-xs font-medium">Upload photo for {cat.name}</span>
                                                <span className="text-[10px]">PNG, JPG up to 5MB</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
                                                    try {
                                                        const url = await uploadImage(file, `categories/${cat.id}-${Date.now()}`);
                                                        handleEditCategoryChange(cat.id, 'image', url);
                                                    } catch (err) { alert('Upload failed. Make sure you ran add-category-images.sql in Supabase.'); }
                                                }} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsEditingCategories(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveCategories}
                        className="px-6 py-2 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 shadow-sm"
                    >
                        Save Pricing
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;
