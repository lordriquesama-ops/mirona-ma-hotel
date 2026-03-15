
import React, { useState, useEffect } from 'react';
import { getRooms, getBookings, updateRoom, logAction } from '../services/db';
import { User, Room, Booking } from '../types';
import { BroomIcon, SparklesIcon, CheckCircleIcon, UserIcon, AlertTriangleIcon, CheckIcon } from './Icons';

interface HousekeepingProps {
  user: User;
}

const Housekeeping: React.FC<HousekeepingProps> = ({ user }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allRooms, allBookings] = await Promise.all([
          getRooms(),
          getBookings()
      ]);
      setRooms(allRooms);
      
      // Filter for relevant bookings (Checked In or Checked Out today)
      // Only care about Checked IN (for Occupied) or Checked OUT (for Dirty/Departed)
      const relevant = allBookings.filter(b => b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT');
      setActiveBookings(relevant);
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to load housekeeping data", err);
      setLoading(false);
    }
  };

  // Helper to find guest name for a room
  const getGuestName = (roomId: string, status: string) => {
      // If room is occupied, look for CHECKED_IN
      // If room is cleaning, look for CHECKED_OUT (the guest who just left)
      const targetStatus = status === 'Occupied' ? 'CHECKED_IN' : 'CHECKED_OUT';
      
      // Sort by ID (desc) to get latest if multiple exist (edge case)
      const booking = activeBookings
        .sort((a,b) => Number(b.id) - Number(a.id))
        .find(b => b.roomNumber === roomId && b.status === targetStatus);
        
      return booking ? booking.guestName : null;
  };

  // 1. Turnover Cleaning (Dirty -> Available)
  const markAsClean = async (room: Room) => {
    try {
        const updatedRoom = { ...room, status: 'Available' as const };
        await updateRoom(updatedRoom);
        
        await logAction(user, 'HOUSEKEEPING', `Turnover Clean: Room ${room.id} is now Ready`);

        setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
    } catch (err) {
        console.error("Error updating room status", err);
    }
  };

  // 2. Daily Service (Occupied -> Occupied + Log)
  const logDailyService = async (room: Room) => {
      if(!confirm(`Confirm daily housekeeping service for Room ${room.name}? (Guest remains checked in)`)) return;
      
      try {
          // Status doesn't change, but we log the activity
          await logAction(user, 'HOUSEKEEPING', `Daily Service performed for Room ${room.id} (Occupied)`);
          alert(`Service logged for Room ${room.name}`);
      } catch (err) {
          console.error(err);
      }
  };

  const markAsMaintenance = async (room: Room) => {
    try {
        const updatedRoom = { ...room, status: 'Maintenance' as const };
        await updateRoom(updatedRoom);
        
        await logAction(user, 'HOUSEKEEPING', `Marked Room ${room.id} for Maintenance`);

        setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
    } catch (err) {
        console.error("Error updating room status", err);
    }
  };

  const markAsResolved = async (room: Room) => {
      try {
        const updatedRoom = { ...room, status: 'Cleaning' as const }; // Goes to cleaning after maintenance
        await updateRoom(updatedRoom);
        
        await logAction(user, 'HOUSEKEEPING', `Maintenance resolved for Room ${room.id}, marked as Dirty`);

        setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
    } catch (err) {
        console.error("Error updating room status", err);
    }
  };

  const dirtyRooms = rooms.filter(r => r.status === 'Cleaning');
  const occupiedRooms = rooms.filter(r => r.status === 'Occupied');
  const maintenanceRooms = rooms.filter(r => r.status === 'Maintenance');
  const availableRooms = rooms.filter(r => r.status === 'Available');

  if (loading) return <div className="p-10 text-center text-gray-400">Loading housekeeping data...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <BroomIcon className="w-6 h-6 text-teal-600" />
               Housekeeping Operations
           </h2>
           <p className="text-sm text-gray-500">Manage turnovers, daily services, and maintenance</p>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={loadData} 
                className="text-gray-500 hover:text-teal-600 font-bold text-xs flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm transition-all"
            >
                Refresh Data
            </button>
            <div className="flex gap-2 text-xs font-bold uppercase tracking-wide">
                <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg border border-orange-100">
                    To Clean: {dirtyRooms.length}
                </div>
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100">
                    In-House: {occupiedRooms.length}
                </div>
            </div>
        </div>
      </div>

      {/* PRIORITY 1: TURNOVERS (Dirty Rooms) */}
      {dirtyRooms.length > 0 && (
          <div className="space-y-4">
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide flex items-center gap-2 border-b border-orange-100 pb-2">
                  <SparklesIcon className="w-4 h-4" /> Priority: Departures / Turnovers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dirtyRooms.map(room => {
                      const guestName = getGuestName(room.id, 'Cleaning');
                      return (
                        <div key={room.id} className="bg-white rounded-xl shadow-sm border-l-4 border-orange-400 p-5 flex items-center justify-between group hover:shadow-md transition-all">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-gray-800">{room.name}</div>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-bold uppercase">
                                        Dirty
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Needs Full Clean</div>
                                {guestName && <div className="text-xs text-gray-400 mt-1 italic">Ex-Guest: {guestName}</div>}
                            </div>
                            <button 
                                onClick={() => markAsClean(room)}
                                className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm hover:bg-green-600 hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <CheckCircleIcon className="w-4 h-4" /> Mark Ready
                            </button>
                        </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* PRIORITY 2: STAY-OVERS (Occupied Rooms) */}
      <div className="space-y-4">
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide flex items-center gap-2 border-b border-blue-100 pb-2">
              <UserIcon className="w-4 h-4" /> In-House Guests (Daily Service)
          </h3>
          {occupiedRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {occupiedRooms.map(room => {
                      const guestName = getGuestName(room.id, 'Occupied');
                      return (
                        <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-blue-300 transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-bold text-gray-800 text-lg">{room.name}</div>
                                    <div className="text-xs text-blue-600 font-medium">Occupied</div>
                                    {guestName ? (
                                        <div className="text-xs text-gray-700 font-bold mt-1 truncate w-32">{guestName}</div>
                                    ) : (
                                        <div className="text-xs text-gray-400 mt-1 italic">Unknown Guest</div>
                                    )}
                                </div>
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            </div>
                            <button 
                                onClick={() => logDailyService(room)}
                                className="w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <BroomIcon className="w-3 h-3" /> Log Service
                            </button>
                        </div>
                      );
                  })}
              </div>
          ) : (
              <div className="text-sm text-gray-400 italic">No occupied rooms currently.</div>
          )}
      </div>

      {/* PRIORITY 3: MAINTENANCE ISSUES */}
      {maintenanceRooms.length > 0 && (
          <div className="space-y-4">
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide flex items-center gap-2 border-b border-red-100 pb-2">
                  <AlertTriangleIcon className="w-4 h-4" /> Maintenance Required
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {maintenanceRooms.map(room => (
                      <div key={room.id} className="bg-red-50 rounded-xl border border-red-100 p-4 flex items-center justify-between">
                          <div>
                              <div className="font-bold text-red-800">{room.name}</div>
                              <div className="text-xs text-red-600">Out of Order</div>
                          </div>
                          <button 
                              onClick={() => markAsResolved(room)}
                              className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100"
                          >
                              Resolve
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* OVERVIEW: AVAILABLE ROOMS */}
      <div className="pt-6 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Ready Rooms ({availableRooms.length})</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {availableRooms.map(room => (
                  <div key={room.id} className="bg-green-50 text-green-700 text-center py-2 rounded-lg text-xs font-bold border border-green-100 opacity-70">
                      {room.name}
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default Housekeeping;
