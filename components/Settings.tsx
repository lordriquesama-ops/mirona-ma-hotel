
import React, { useState, useEffect } from 'react';
import { User, SystemSettings, Role } from '../types';
import { getSettings, updateSettings, getUsers, addUser, updateUser, deleteUser, exportDatabase, importDatabase, logAction } from '../services/db';
import { SaveIcon, UserIcon, DatabaseIcon, UploadIcon, DownloadIcon, PlusIcon } from './Icons';

interface SettingsProps {
  user: User;
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'data'>('general');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');

  // General Settings State
  const [settings, setSettings] = useState<SystemSettings>({
      hotelName: '', hotelPhone: '', hotelEmail: '', currency: '', taxRate: 0, receiptFooter: '', exchangeRates: {}
  });

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userError, setUserError] = useState('');

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

  const loadSettings = async () => {
    const s = await getSettings();
    setSettings(s);
  };

  const loadUsers = async () => {
    const u = await getUsers();
    setUsers(u);
  };

  const showNotification = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(''), 3000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await updateSettings(settings);
          await logAction(user, 'UPDATE_SETTINGS', 'Updated general system settings');
          showNotification('System settings saved successfully!');
      } catch (err) {
          console.error(err);
          showNotification('Error saving settings');
      } finally {
          setLoading(false);
      }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      setUserError('');

      if(!editingUser.username || !editingUser.name || !editingUser.role) {
          setUserError('Please fill in all required fields.');
          return;
      }

      // Password validation for new users
      if (!editingUser.id && !editingUser.password) {
          setUserError('Password is required for new users.');
          return;
      }

      // Password confirmation check
      if (editingUser.password && editingUser.password !== confirmPassword) {
          setUserError('Passwords do not match.');
          return;
      }

      const userData: User = {
          id: editingUser.id || Date.now().toString(),
          username: (editingUser.username || '').trim(),
          name: (editingUser.name || '').trim(),
          role: editingUser.role as Role,
          password: editingUser.password || '',
          avatarColor: editingUser.avatarColor || 'bg-gray-600'
      };

      try {
          if (editingUser.id) {
              await updateUser(userData);
              await logAction(user, 'UPDATE_USER', `Updated user: ${userData.username}`);
          } else {
              await addUser(userData);
              await logAction(user, 'CREATE_USER', `Created user: ${userData.username}`);
          }
          await loadUsers();
          setIsUserModalOpen(false);
          setEditingUser({});
          setConfirmPassword('');
          showNotification('User saved successfully');
      } catch (err: any) {
          console.error(err);
          setUserError(err.message || 'Error saving user');
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteUser = async (id: string) => {
      if (id === user.id) {
          alert("You cannot delete your own account.");
          return;
      }
      if (confirm('Are you sure you want to delete this user?')) {
          await deleteUser(id);
          await logAction(user, 'DELETE_USER', `Deleted user ID: ${id}`);
          loadUsers();
          showNotification('User deleted');
      }
  };

  const handleBackup = async () => {
      try {
          const json = await exportDatabase();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `mirona_backup_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await logAction(user, 'BACKUP_DATA', 'Downloaded system backup');
      } catch (err) {
          console.error(err);
          showNotification('Backup failed');
      }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!confirm('WARNING: This will overwrite all current data with the backup file. Continue?')) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = event.target?.result as string;
              await importDatabase(json);
              await logAction(user, 'RESTORE_DATA', 'Restored system from backup file');
              alert('System restored successfully! The page will now reload.');
              window.location.reload();
          } catch (err) {
              console.error(err);
              alert('Failed to restore database. Invalid file format.');
          }
      };
      reader.readAsText(file);
  };

  const openEditUser = (u: User) => {
      setEditingUser(u);
      setIsUserModalOpen(true);
  };

  const openNewUser = () => {
      setEditingUser({ role: 'RECEPTION', avatarColor: 'bg-gray-600', password: '' });
      setIsUserModalOpen(true);
  };

  // --- EXCHANGE RATES LOGIC ---
  const handleRateChange = (currency: string, rate: number) => {
      setSettings(prev => ({
          ...prev,
          exchangeRates: {
              ...prev.exchangeRates,
              [currency]: rate
          }
      }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800">System Configuration</h2>
           <p className="text-sm text-gray-500">Manage global settings, users, and data</p>
        </div>
        
        {notification && (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-bold animate-fade-in">
                {notification}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Nav */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 h-fit">
              <button 
                  onClick={() => setActiveTab('general')}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-colors ${activeTab === 'general' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                  <SaveIcon className="w-5 h-5" /> General Config
              </button>
              <button 
                  onClick={() => setActiveTab('users')}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-colors ${activeTab === 'users' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                  <UserIcon className="w-5 h-5" /> User Management
              </button>
              <button 
                  onClick={() => setActiveTab('data')}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-colors ${activeTab === 'data' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                  <DatabaseIcon className="w-5 h-5" /> Data Backup
              </button>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
              
              {/* GENERAL SETTINGS */}
              {activeTab === 'general' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-2">General Information</h3>
                      <form onSubmit={handleSaveSettings} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Hotel Name</label>
                                  <input required type="text" value={settings.hotelName} onChange={e => setSettings({...settings, hotelName: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Base Currency</label>
                                  <input required type="text" value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Contact Phone</label>
                                  <input type="text" value={settings.hotelPhone} onChange={e => setSettings({...settings, hotelPhone: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Contact Email</label>
                                  <input type="email" value={settings.hotelEmail} onChange={e => setSettings({...settings, hotelEmail: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Tax Rate (%)</label>
                                  <input type="number" value={settings.taxRate} onChange={e => setSettings({...settings, taxRate: parseFloat(e.target.value)})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Receipt Footer Message</label>
                                  <input type="text" value={settings.receiptFooter} onChange={e => setSettings({...settings, receiptFooter: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                              </div>
                          </div>
                          
                          {/* EXCHANGE RATES */}
                          <div className="pt-4 border-t border-gray-50 mt-4">
                             <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Exchange Rates (vs {settings.currency})</h4>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 {Object.keys(settings.exchangeRates || {}).filter(c => c !== settings.currency).map(currency => (
                                     <div key={currency}>
                                         <label className="text-xs font-bold text-gray-400 uppercase">{currency}</label>
                                         <input 
                                            type="number" 
                                            value={settings.exchangeRates[currency]} 
                                            onChange={e => handleRateChange(currency, parseFloat(e.target.value))} 
                                            className="w-full mt-1 p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm" 
                                         />
                                     </div>
                                 ))}
                             </div>
                          </div>

                          <div className="pt-4 flex justify-end">
                              <button type="submit" disabled={loading} className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-sm transition-all">
                                  {loading ? 'Saving...' : 'Save Changes'}
                              </button>
                          </div>
                      </form>
                  </div>
              )}

              {/* USER MANAGEMENT */}
              {activeTab === 'users' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                          <h3 className="text-lg font-bold text-gray-800">Authorized Users</h3>
                          <button onClick={openNewUser} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700">
                              <PlusIcon className="w-4 h-4" /> Add User
                          </button>
                      </div>
                      <table className="w-full text-left">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">User</th>
                                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Username</th>
                                  <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                              {users.map(u => (
                                  <tr key={u.id} className="hover:bg-gray-50/50">
                                      <td className="p-4 flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full ${u.avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
                                              {u.name.charAt(0)}
                                          </div>
                                          <span className="font-medium text-gray-800">{u.name}</span>
                                      </td>
                                      <td className="p-4">
                                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                                              u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                              u.role === 'MANAGER' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                                              'bg-orange-50 text-orange-700 border-orange-100'
                                          }`}>
                                              {u.role}
                                          </span>
                                      </td>
                                      <td className="p-4 text-sm text-gray-500">{u.username}</td>
                                      <td className="p-4 text-right space-x-2">
                                          <button onClick={() => openEditUser(u)} className="text-blue-600 hover:text-blue-800 text-xs font-bold">Edit</button>
                                          <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-800 text-xs font-bold">Delete</button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {/* DATA BACKUP */}
              {activeTab === 'data' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">
                      <div>
                          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                              <DownloadIcon className="w-5 h-5 text-teal-600" /> Export Data
                          </h3>
                          <p className="text-sm text-gray-500 mb-4">Download a full JSON backup of the database, including bookings, expenses, and settings.</p>
                          <button onClick={handleBackup} className="px-6 py-2 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 shadow-sm flex items-center gap-2">
                              Download Backup
                          </button>
                      </div>

                      <div className="border-t border-gray-100 pt-8">
                          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                              <UploadIcon className="w-5 h-5 text-red-600" /> Restore Data
                          </h3>
                          <p className="text-sm text-gray-500 mb-4">Restore the system from a previous backup file. <strong className="text-red-500">Warning: This will overwrite current data.</strong></p>
                          <input 
                              type="file" 
                              accept=".json"
                              onChange={handleRestore}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                          />
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* USER MODAL */}
      {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="bg-gray-800 p-6 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <UserIcon className="w-5 h-5" /> {editingUser.id ? 'Edit User' : 'New User'}
                      </h3>
                      <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                      {userError && (
                          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold border border-red-100 animate-shake">
                              {userError}
                          </div>
                      )}
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                          <input required type="text" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                          <input required type="text" value={editingUser.username || ''} onChange={e => setEditingUser({...editingUser, username: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                            <input type="password" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder={editingUser.id ? '(Leave blank)' : ''} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Confirm Password</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder={editingUser.id ? '(Leave blank)' : ''} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase">Role</label>
                              <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none">
                                  <option value="ADMIN">Admin</option>
                                  <option value="MANAGER">Manager</option>
                                  <option value="RECEPTION">Reception</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase">Avatar Color</label>
                              <select value={editingUser.avatarColor} onChange={e => setEditingUser({...editingUser, avatarColor: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none">
                                  <option value="bg-teal-600">Teal</option>
                                  <option value="bg-purple-600">Purple</option>
                                  <option value="bg-orange-600">Orange</option>
                                  <option value="bg-blue-600">Blue</option>
                                  <option value="bg-red-600">Red</option>
                              </select>
                          </div>
                      </div>
                      <div className="pt-2 flex justify-end gap-3">
                          <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                          <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-sm">Save User</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;