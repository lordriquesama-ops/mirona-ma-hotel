
import bcrypt from 'bcryptjs';
import { User, Role, AuditLogEntry, RoomCategory, ServiceItem, ExpenseRecord, SystemSettings, Booking, Shift, Room, Guest, WebsiteContent, AppNotification as Notification, SyncItem } from '../types';
import { api } from './api';
import { USE_BACKEND, USE_SUPABASE, ENDPOINTS } from './config';
import { supabaseAdapter } from './supabase-adapter';
import { dualRead, dualWrite, markCacheFresh, isOnline, enqueueOfflineOp, invalidateCache } from './sync-manager';

const DB_NAME = 'MironaDB';
const DB_VERSION = 20; // Added offline_queue store

const CATEGORY_ORDER = ['platinum', 'gold', 'silver', 'safari'];

const SAFARI_ROOM_NAMES = [
    'Lion', 'Elephant', 'Leopard', 'Buffalo', 'Rhino', 
    'Zebra', 'Giraffe', 'Cheetah', 'Hippo', 'Gorilla', 
    'Eagle', 'Crane', 'Kingfisher', 'Weaver', 'Turaco'
];

const DEFAULT_USERS = [
  { id: 'admin', username: 'admin', password: 'password123', name: 'Sarah Jenkins', role: 'ADMIN' as Role, avatarColor: 'bg-purple-600' },
  { id: 'manager', username: 'manager', password: 'password123', name: 'David Okello', role: 'MANAGER' as Role, avatarColor: 'bg-teal-600' },
  { id: 'reception', username: 'reception', password: 'password123', name: 'Grace Nakato', role: 'RECEPTION' as Role, avatarColor: 'bg-orange-600' },
  { id: 'marketing', username: 'marketing', password: 'password123', name: 'Alex Muli', role: 'MARKETING' as Role, avatarColor: 'bg-pink-600' }
];

// --- SESSION MANAGEMENT ---
const SESSION_KEY = 'mirona_session';

export const getSession = (): User | null => {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
        return JSON.parse(session);
    } catch (e) {
        return null;
    }
};

export const setSession = (user: User | null) => {
    if (user) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
        sessionStorage.removeItem(SESSION_KEY);
    }
};

const DEFAULT_CATEGORIES: RoomCategory[] = [
  { id: 'platinum', name: 'Presidential', price: 50000, prefix: 'A', count: 8, color: 'bg-slate-800' },
  { id: 'gold', name: 'Suites', price: 30000, prefix: 'B', count: 12, color: 'bg-amber-700' },
  { id: 'silver', name: 'Deluxe', price: 20000, prefix: 'C', count: 10, color: 'bg-gray-500' },
  { id: 'safari', name: 'Safari', price: 10000, prefix: 'D', count: 8, color: 'bg-green-700' }
];

const DEFAULT_SERVICES: ServiceItem[] = [
  { id: '1', name: 'Continental Breakfast', price: 35000, category: 'Food', description: 'Full breakfast buffet', trackStock: false },
  { id: '2', name: 'Airport Pickup', price: 150000, category: 'Transport', description: 'One-way transfer to Entebbe', trackStock: false },
  { id: '3', name: 'Laundry (Shirt/Blouse)', price: 10000, category: 'Laundry', description: 'Wash and iron', trackStock: false },
  { id: '4', name: 'Full Body Massage', price: 120000, category: 'Spa', description: '60 minutes relaxation', trackStock: false },
  { id: '5', name: 'Soda (300ml)', price: 2000, category: 'Food', description: 'Coke, Fanta or Sprite', trackStock: true, stock: 100 },
  { id: '6', name: 'Mineral Water', price: 1500, category: 'Food', description: '500ml Bottle', trackStock: true, stock: 200 }
];

const DEFAULT_SETTINGS: SystemSettings = {
    hotelName: 'Mirona Ma Hotel',
    hotelPhone: '+256 700 000000',
    hotelEmail: 'info@mironama.com',
    websiteUrl: '',
    currency: 'UGX',
    taxRate: 0,
    receiptFooter: 'Thank you for choosing Mirona Ma Hotel. We hope to see you again soon!',
    exchangeRates: {
        'UGX': 1,
        'USD': 3700,
        'EUR': 4000,
        'GBP': 4700,
        'KES': 28
    }
};

const DEFAULT_WEBSITE_CONTENT: WebsiteContent = {
    id: 'main',
    heroTitle: 'Experience Luxury in Serenity',
    heroSubtitle: 'Discover the perfect blend of comfort, style, and hospitality at Mirona Ma Hotel.',
    aboutTitle: 'Welcome to Mirona Ma',
    aboutText: 'Located in the heart of the city, Mirona Ma Hotel offers world-class accommodation with a touch of local heritage. Whether you are traveling for business or leisure, our dedicated staff ensures a memorable stay with personalized service, exquisite dining, and modern amenities.',
    showRooms: true,
    showServices: true,
    contactText: 'We look forward to hosting you.'
};

// --- DATABASE INITIALIZATION ---
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // If upgrading to 19, we want to reset rooms and categories to apply the new counts
      if (event.oldVersion > 0 && event.oldVersion < 19) {
          if (db.objectStoreNames.contains('rooms')) db.deleteObjectStore('rooms');
          if (db.objectStoreNames.contains('room_categories')) db.deleteObjectStore('room_categories');
      }
      const stores = [
          'settings', 'bookings', 'room_categories', 'services_catalog',
          'expenses', 'shifts', 'rooms', 'website_content', 'notifications',
          'sync_queue', 'offline_queue'
      ];

      stores.forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
              db.createObjectStore(store, { keyPath: 'id' });
          }
      });

      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('username', 'username', { unique: true });
      }
      
      if (!db.objectStoreNames.contains('guests')) {
        const guestStore = db.createObjectStore('guests', { keyPath: 'id' });
        guestStore.createIndex('phone', 'phone', { unique: false });
      }

      if (!db.objectStoreNames.contains('audit_logs')) {
         db.createObjectStore('audit_logs', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      try {
        if (!USE_BACKEND) {
            await seedUsers(db);
            await seedCategories(db);
            await seedServices(db);
            await seedSettings(db);
            await seedRooms(db);
            await seedWebsiteContent(db);
        }
        resolve(db);
      } catch (err) {
        console.error("Error seeding DB:", err);
        resolve(db);
      }
    };
  });
};

// --- HELPER: GENERIC TRANSACTION ---
let dbInstance: IDBDatabase | null = null;

const getDB = async (): Promise<IDBDatabase> => {
    if (dbInstance) return dbInstance;
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };
        request.onerror = () => reject(request.error);
    });
};

const tx = async <T>(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest | void): Promise<T> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let request: IDBRequest | undefined;

        try {
            const res = callback(store);
            if (res) request = res;
        } catch (e) {
            reject(e);
        }

        transaction.oncomplete = () => {
            resolve(request?.result);
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

const getAll = async <T>(storeName: string): Promise<T[]> => {
    return tx<T[]>(storeName, 'readonly', store => store.getAll());
};

const put = async <T>(storeName: string, item: T): Promise<T> => {
    return tx<T>(storeName, 'readwrite', store => store.put(item)).then(() => item);
};

const remove = async (storeName: string, id: string | number): Promise<void> => {
    return tx<void>(storeName, 'readwrite', store => store.delete(id));
};

const clearObjectStore = async (storeName: string): Promise<void> => {
    return tx<void>(storeName, 'readwrite', store => store.clear());
};

const count = async (db: IDBDatabase, storeName: string): Promise<number> => {
    return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
    });
};

// --- SEEDING LOGIC ---
const seedUsers = async (db: IDBDatabase) => {
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    
    for (const u of DEFAULT_USERS) {
        // Only seed if user doesn't exist
        const req = store.get(u.id);
        await new Promise<void>((resolve) => {
            req.onsuccess = () => {
                if (!req.result) {
                    // Hash the password for the seeded user
                    bcrypt.hash(u.password, 10).then((hashedPassword) => {
                        try {
                            const userReq = store.put({ ...u, password: hashedPassword });
                            userReq.onsuccess = () => resolve();
                            userReq.onerror = () => resolve();
                        } catch (error) {
                            console.warn('Transaction closed, skipping put:', error);
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            };
            req.onerror = () => resolve();
        });
    }
};

const seedCategories = async (db: IDBDatabase) => {
    if (await count(db, 'room_categories') === 0) {
        const tx = db.transaction('room_categories', 'readwrite');
        DEFAULT_CATEGORIES.forEach(c => tx.objectStore('room_categories').add(c));
    }
};

const seedServices = async (db: IDBDatabase) => {
    if (await count(db, 'services_catalog') === 0) {
        const tx = db.transaction('services_catalog', 'readwrite');
        DEFAULT_SERVICES.forEach(s => tx.objectStore('services_catalog').add(s));
    }
};

const seedSettings = async (db: IDBDatabase) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.get('config');
    req.onsuccess = () => {
        if (!req.result) store.add({ id: 'config', ...DEFAULT_SETTINGS });
    };
};

const seedWebsiteContent = async (db: IDBDatabase) => {
    const tx = db.transaction('website_content', 'readwrite');
    const store = tx.objectStore('website_content');
    const req = store.get('main');
    req.onsuccess = () => {
        if (!req.result) store.add(DEFAULT_WEBSITE_CONTENT);
    };
};

const seedRooms = async (db: IDBDatabase) => {
    if (await count(db, 'rooms') === 0) {
        const cats = await new Promise<RoomCategory[]>((resolve) => {
            const tx = db.transaction('room_categories', 'readonly');
            const req = tx.objectStore('room_categories').getAll();
            req.onsuccess = () => resolve(req.result);
        });

        const tx = db.transaction('rooms', 'readwrite');
        const store = tx.objectStore('rooms');

        cats.forEach(cat => {
             for (let i = 1; i <= cat.count; i++) {
                 let roomNum = `${cat.prefix}${i}`;
                 if (cat.id === 'safari' && SAFARI_ROOM_NAMES[i-1]) {
                     roomNum = SAFARI_ROOM_NAMES[i-1];
                 }
                 
                 store.add({
                     id: roomNum,
                     name: roomNum,
                     categoryId: cat.id,
                     categoryName: cat.name,
                     price: cat.price,
                     status: 'Available',
                     color: cat.color
                 });
             }
        });
    }
};

// --- EXPORTED METHODS ---
export const getNotifications = async (): Promise<Notification[]> => getAll('notifications');
export const addNotification = async (notification: Notification) => put('notifications', notification);
export const markNotificationRead = async (id: string) => {
    const db = await getDB();
    const transaction = db.transaction('notifications', 'readwrite');
    const store = transaction.objectStore('notifications');
    const req = store.get(id);
    req.onsuccess = () => {
        const notif = req.result as Notification;
        if (notif) {
            notif.read = true;
            store.put(notif);
        }
    };
};
export const clearAllNotifications = async () => {
    const db = await getDB();
    const transaction = db.transaction('notifications', 'readwrite');
    transaction.objectStore('notifications').clear();
};

export const authenticateUser = async (username: string, password: string): Promise<User | undefined> => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        try {
            return await supabaseAdapter.signIn(username, password);
        } catch (error) {
            console.error('Supabase auth failed:', error);
            return undefined;
        }
    }

    // Fallback to IndexedDB/Backend
    const users = await getAll<User>('users');
    const user = users.find(u => u.username === username);
    if (user) {
        // Check if it's a bcrypt hash
        const isHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
        
        if (isHash) {
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid) {
                const { password: _, ...userWithoutPassword } = user;
                return userWithoutPassword as User;
            }
        } else {
            // Plain text fallback (for migration)
            if (user.password === password) {
                // Migrate to hash immediately
                const hashedPassword = await bcrypt.hash(password, 10);
                user.password = hashedPassword;
                await put('users', user);
                
                const { password: _, ...userWithoutPassword } = user;
                return userWithoutPassword as User;
            }
        }
    }
    return undefined;
};

export const getUsers = async (): Promise<User[]> => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        try {
            const users = await supabaseAdapter.getUsers();
            // Sanitize users before returning (remove passwords)
            return users.map(({ password, ...u }) => u as User);
        } catch (error) {
            console.error('Supabase getUsers failed:', error);
            // Fallback to IndexedDB
        }
    }
    
    // Fallback to IndexedDB
    const users = await getAll<User>('users');
    // Sanitize users before returning (remove passwords)
    return users.map(({ password, ...u }) => u as User);
};

export const addUser = async (user: User) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        if (!isOnline()) {
            console.log('📴 Offline – queuing user add:', user.username);
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await put('users', { ...user, password: hashedPassword });
            await enqueueOfflineOp('users', 'UPSERT', user);
            return user;
        }
        try {
            const savedUser = await supabaseAdapter.addUser(user);
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await put('users', { ...user, password: hashedPassword });
            return savedUser;
        } catch (error: any) {
            if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
                console.warn('⚠️ Supabase unreachable – queuing user add:', user.username);
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await put('users', { ...user, password: hashedPassword });
                await enqueueOfflineOp('users', 'UPSERT', user);
                return user;
            }
            console.error('❌ Supabase addUser failed:', error.message);
            throw error;
        }
    }
    
    // Fallback to IndexedDB
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const userToSave = { ...user, password: hashedPassword };
    await put('users', userToSave);
    await queueSync('users', 'CREATE', userToSave);
};

export const updateUser = async (user: User) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        if (!isOnline()) {
            console.log('📴 Offline – queuing user update:', user.username);
            await put('users', user);
            await enqueueOfflineOp('users', 'UPSERT', user);
            return user;
        }
        try {
            const updatedUser = await supabaseAdapter.updateUser(user);
            if (user.password && !user.password.startsWith('$2a$')) {
                user.password = await bcrypt.hash(user.password, 10);
            } else if (!user.password) {
                const db = await getDB();
                const oldUser = await new Promise<User | undefined>((resolve) => {
                    const tx = db.transaction('users', 'readonly');
                    const req = tx.objectStore('users').get(user.id);
                    req.onsuccess = () => resolve(req.result);
                });
                if (oldUser) user.password = oldUser.password;
            }
            await put('users', user);
            return updatedUser;
        } catch (error: any) {
            if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
                console.warn('⚠️ Supabase unreachable – queuing user update:', user.username);
                await put('users', user);
                await enqueueOfflineOp('users', 'UPSERT', user);
                return user;
            }
            console.error('❌ Supabase updateUser failed:', error.message);
            throw error;
        }
    }
    
    // Fallback to IndexedDB
    // If password is provided, hash it. Otherwise keep old password.
    if (user.password && !user.password.startsWith('$2a$')) { // Simple check if it's already hashed
        user.password = await bcrypt.hash(user.password, 10);
    } else if (!user.password) {
        // Get old user to keep password
        const db = await getDB();
        const oldUser = await new Promise<User | undefined>((resolve) => {
            const tx = db.transaction('users', 'readonly');
            const req = tx.objectStore('users').get(user.id);
            req.onsuccess = () => resolve(req.result);
        });
        if (oldUser) {
            user.password = oldUser.password;
        }
    }
    await put('users', user);
    await queueSync('users', 'UPDATE', user);
};
export const deleteUser = async (id: string) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        if (!isOnline()) {
            console.log('📴 Offline – queuing user delete:', id);
            await remove('users', id);
            await enqueueOfflineOp('users', 'DELETE', { id });
            return;
        }
        try {
            await supabaseAdapter.deleteUser(id);
            await remove('users', id);
            return;
        } catch (error: any) {
            if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
                console.warn('⚠️ Supabase unreachable – queuing user delete:', id);
                await remove('users', id);
                await enqueueOfflineOp('users', 'DELETE', { id });
                return;
            }
            console.error('❌ Supabase deleteUser failed:', error.message);
            throw error;
        }
    }
    
    // Fallback to IndexedDB
    await remove('users', id);
    await queueSync('users', 'DELETE', { id });
};

export const getRoomCategories = async (): Promise<RoomCategory[]> => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        try {
            return await supabaseAdapter.getCategories();
        } catch (error) {
            console.error('Supabase getCategories failed:', error);
            return [];
        }
    }
    
    // Fallback to IndexedDB/Backend
    const cats = await getAll<RoomCategory>('room_categories');
    return cats.sort((a, b) => {
        const idxA = CATEGORY_ORDER.indexOf(a.id);
        const idxB = CATEGORY_ORDER.indexOf(b.id);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
};

export const updateRoomCategory = async (category: RoomCategory) => {
    await put('room_categories', category);
    // Sync to Supabase if enabled
    if (USE_SUPABASE) {
        await supabaseAdapter.updateCategory(category); // throws on error
    }
    const rooms = await getRooms();
    const affectedRooms = rooms.filter(r => r.categoryId === category.id);
    for (const room of affectedRooms) {
        room.categoryName = category.name;
        room.price = category.price;
        room.color = category.color;
        await put('rooms', room);
    }
};

export const getRooms = async (): Promise<Room[]> => {
    // Use dual-read strategy for consistency
    if (USE_SUPABASE) {
        return dualRead(
            // Supabase read
            () => supabaseAdapter.getRooms(),
            // IndexedDB write (cache)
            async (rooms) => {
                for (const room of rooms) {
                    await put('rooms', room);
                }
            },
            // IndexedDB read (fallback)
            async () => {
                const rooms = await getAll<Room>('rooms');
                return rooms.sort((a, b) => {
                    const idxA = CATEGORY_ORDER.indexOf(a.categoryId);
                    const idxB = CATEGORY_ORDER.indexOf(b.categoryId);
                    if (idxA !== idxB) return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
                    return a.id.localeCompare(b.id, undefined, { numeric: true });
                });
            },
            'rooms',
            () => clearObjectStore('rooms')
        );
    }
    
    // Fallback to IndexedDB only
    const rooms = await getAll<Room>('rooms');
    return rooms.sort((a, b) => {
        const idxA = CATEGORY_ORDER.indexOf(a.categoryId);
        const idxB = CATEGORY_ORDER.indexOf(b.categoryId);
        if (idxA !== idxB) return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
};

export const updateRoom = async (room: Room) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        if (!isOnline()) {
            console.log('📴 Offline – queuing room update:', room.id);
            await put('rooms', room);
            await enqueueOfflineOp('rooms', 'UPSERT', room);
            invalidateCache('rooms');
            return room;
        }
        try {
            const updatedRoom = await supabaseAdapter.updateRoom(room);
            invalidateCache('rooms');
            await put('rooms', updatedRoom);
            return updatedRoom;
        } catch (error: any) {
            if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
                console.warn('⚠️ Supabase unreachable – queuing room update:', room.id);
                await put('rooms', room);
                await enqueueOfflineOp('rooms', 'UPSERT', room);
                invalidateCache('rooms');
                return room;
            }
            console.error('❌ Supabase updateRoom failed:', error.message);
            throw error;
        }
    }
    
    // Fallback to IndexedDB/Backend
    await put('rooms', room);
    
    // Sync to backend API immediately
    if (USE_BACKEND && navigator.onLine) {
        try {
            await api.put(`${ENDPOINTS.ROOMS}/${room.id}`, room);
            console.log('✅ Room updated in PostgreSQL:', room.id);
        } catch (error: any) {
            console.error('❌ Room sync failed:', error.message);
            await queueSync('rooms', 'UPDATE', room);
        }
    } else {
        await queueSync('rooms', 'UPDATE', room);
    }
};

export const addRoom = async (room: Room) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        if (!isOnline()) {
            console.log('📴 Offline – queuing room add:', room.id);
            await put('rooms', room);
            await enqueueOfflineOp('rooms', 'UPSERT', room);
            invalidateCache('rooms');
            return room;
        }
        try {
            const newRoom = await supabaseAdapter.addRoom(room);
            invalidateCache('rooms');
            await put('rooms', newRoom);
            return newRoom;
        } catch (error: any) {
            if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
                console.warn('⚠️ Supabase unreachable – queuing room add:', room.id);
                await put('rooms', room);
                await enqueueOfflineOp('rooms', 'UPSERT', room);
                invalidateCache('rooms');
                return room;
            }
            console.error('❌ Supabase addRoom failed:', error.message);
            throw error;
        }
    }
    
    // Fallback to IndexedDB/Backend
    await put('rooms', room);
    
    // Sync to backend API immediately
    if (USE_BACKEND && navigator.onLine) {
        try {
            await api.post(ENDPOINTS.ROOMS, room);
            console.log('✅ Room added to PostgreSQL:', room.id);
        } catch (error: any) {
            console.error('❌ Room sync failed:', error.message);
            await queueSync('rooms', 'CREATE', room);
        }
    } else {
        await queueSync('rooms', 'CREATE', room);
    }
};

export const deleteRoom = async (id: string) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        if (!isOnline()) {
            console.log('📴 Offline – queuing room delete:', id);
            await remove('rooms', id);
            await enqueueOfflineOp('rooms', 'DELETE', { id });
            invalidateCache('rooms');
            return;
        }
        try {
            await supabaseAdapter.deleteRoom(id);
            invalidateCache('rooms');
            await remove('rooms', id);
            return;
        } catch (error: any) {
            if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
                console.warn('⚠️ Supabase unreachable – queuing room delete:', id);
                await remove('rooms', id);
                await enqueueOfflineOp('rooms', 'DELETE', { id });
                invalidateCache('rooms');
                return;
            }
            console.error('❌ Supabase deleteRoom failed:', error.message);
            throw error;
        }
    }
    
    // Fallback to IndexedDB/Backend
    await remove('rooms', id);
    
    // Sync to backend API immediately
    if (USE_BACKEND && navigator.onLine) {
        try {
            await api.delete(`${ENDPOINTS.ROOMS}/${id}`);
            console.log('✅ Room deleted from PostgreSQL:', id);
        } catch (error: any) {
            console.error('❌ Room deletion sync failed:', error.message);
            await queueSync('rooms', 'DELETE', { id });
        }
    } else {
        await queueSync('rooms', 'DELETE', { id });
    }
};
export const checkRoomExists = async (id: string): Promise<boolean> => {
    const db = await getDB();
    return new Promise((resolve) => {
        const tx = db.transaction('rooms', 'readonly');
        const req = tx.objectStore('rooms').get(id);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
    });
};

export const getBookings = async (): Promise<Booking[]> => {
    // Use dual-read strategy for consistency
    if (USE_SUPABASE) {
        return dualRead(
            // Supabase read
            () => supabaseAdapter.getBookings(),
            // IndexedDB write (cache)
            async (bookings) => {
                for (const booking of bookings) {
                    await put('bookings', booking);
                }
            },
            // IndexedDB read (fallback)
            () => getAll<Booking>('bookings'),
            'bookings',
            () => clearObjectStore('bookings')
        );
    }
    
    // Fallback to IndexedDB only
    return getAll('bookings');
};

export const saveBooking = async (booking: Booking) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        if (!isOnline()) {
            // Offline: save to IndexedDB and queue for later sync
            console.log('📴 Offline – saving booking to IndexedDB queue:', booking.id);
            await put('bookings', booking);
            await enqueueOfflineOp('bookings', 'UPSERT', booking);
            invalidateCache('bookings');
            return booking;
        }
        try {
            const savedBooking = await supabaseAdapter.saveBooking(booking);
            console.log('✅ Booking saved to Supabase:', savedBooking.id);
            // Update local cache with the Supabase-returned record
            await put('bookings', savedBooking);
            
            // CRM: Update Guest Profile automatically (non-blocking)
            try {
                await upsertGuestFromBooking(savedBooking);
            } catch (guestError) {
                console.warn('⚠️ Guest update failed (non-critical):', guestError);
            }
            
            return savedBooking;
        } catch (error: any) {
            // Network error mid-request – fall back to offline mode
            if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
                console.warn('⚠️ Supabase unreachable – queuing booking for sync:', booking.id);
                await put('bookings', booking);
                await enqueueOfflineOp('bookings', 'UPSERT', booking);
                invalidateCache('bookings');
                return booking;
            }
            console.error('❌ Supabase saveBooking failed:', error.message);
            throw error;
        }
    }

    // Fallback to IndexedDB/Backend
    const oldBooking = await tx<Booking>('bookings', 'readonly', store => store.get(booking.id));
    const isNew = !oldBooking;
    
    // Save to IndexedDB (local cache)
    await put('bookings', booking);
    
    // Sync to backend API immediately
    if (USE_BACKEND && navigator.onLine) {
        try {
            if (isNew) {
                await api.post(ENDPOINTS.BOOKINGS, booking);
                console.log('✅ Booking saved to PostgreSQL:', booking.id);
            } else {
                await api.put(`${ENDPOINTS.BOOKINGS}/${booking.id}`, booking);
                console.log('✅ Booking updated in PostgreSQL:', booking.id);
            }
        } catch (error: any) {
            console.error('❌ Direct API sync failed, queuing for later:', error.message);
            // Queue for background sync if direct call fails
            await queueSync('bookings', isNew ? 'CREATE' : 'UPDATE', booking);
        }
    } else {
        // Queue for later sync
        await queueSync('bookings', isNew ? 'CREATE' : 'UPDATE', booking);
    }
    
    // CRM: Update Guest Profile automatically
    await upsertGuestFromBooking(booking);
    
    // If guest info changed, update the old guest's stats too
    if (oldBooking && (oldBooking.phone !== booking.phone || oldBooking.identification !== booking.identification)) {
        await upsertGuestFromBooking(oldBooking);
    }
};
export const deleteBooking = async (id: string) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        if (!isOnline()) {
            console.log('📴 Offline – queuing booking delete:', id);
            await remove('bookings', id);
            await enqueueOfflineOp('bookings', 'DELETE', { id });
            invalidateCache('bookings');
            return;
        }
        try {
            await supabaseAdapter.deleteBooking(id);
            await remove('bookings', id);
            console.log('✅ Booking deleted from Supabase:', id);
            return;
        } catch (error: any) {
            if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
                console.warn('⚠️ Supabase unreachable – queuing booking delete:', id);
                await remove('bookings', id);
                await enqueueOfflineOp('bookings', 'DELETE', { id });
                invalidateCache('bookings');
                return;
            }
            console.error('❌ Supabase deleteBooking failed:', error.message);
            throw error;
        }
    }
    
    // Fallback to IndexedDB
    const booking = await tx<Booking>('bookings', 'readonly', store => store.get(id));
    await remove('bookings', id);
    await queueSync('bookings', 'DELETE', { id });
    if (booking) {
        await upsertGuestFromBooking(booking);
    }
};

export const checkRoomAvailability = async (
    roomId: string,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
): Promise<boolean> => {
    if (USE_SUPABASE) {
        try {
            return await supabaseAdapter.checkRoomAvailability(roomId, checkIn, checkOut, excludeBookingId);
        } catch (error: any) {
            console.error('❌ Supabase checkRoomAvailability failed:', error.message);
            // Fall through to local check
        }
    }
    // Local IndexedDB fallback
    const bookings = await getAll<Booking>('bookings');
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const conflict = bookings.find(b => {
        if (b.roomNumber !== roomId) return false;
        if (b.status === 'CANCELLED' || b.status === 'CHECKED_OUT') return false;
        if (excludeBookingId && b.id === excludeBookingId) return false;
        const bStart = new Date(b.checkIn || '');
        const bEnd = new Date(b.checkOut || '');
        return start < bEnd && end > bStart;
    });
    return !conflict;
};

export const uploadImage = async (file: File, path: string): Promise<string> => {
    if (USE_SUPABASE) {
        return supabaseAdapter.uploadImage(file, path);
    }
    // Fallback: convert to base64 for local use
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const getGuests = async (): Promise<Guest[]> => {
    // Use dual-read strategy for consistency
    if (USE_SUPABASE) {
        return dualRead(
            // Supabase read
            () => supabaseAdapter.getGuests(),
            // IndexedDB write (cache)
            async (guests) => {
                for (const guest of guests) {
                    await put('guests', guest);
                }
            },
            // IndexedDB read (fallback)
            () => getAll<Guest>('guests'),
            'guests',
            () => clearObjectStore('guests')
        );
    }
    
    // Fallback to IndexedDB only
    return getAll('guests');
};

export const saveGuest = async (guest: Guest) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        if (!isOnline()) {
            console.log('📴 Offline – queuing guest save:', guest.id);
            await put('guests', guest);
            await enqueueOfflineOp('guests', 'UPSERT', guest);
            invalidateCache('guests');
            return guest;
        }
        try {
            const savedGuest = await supabaseAdapter.upsertGuest(guest);
            await put('guests', savedGuest);
            return savedGuest;
        } catch (error: any) {
            if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
                console.warn('⚠️ Supabase unreachable – queuing guest save:', guest.id);
                await put('guests', guest);
                await enqueueOfflineOp('guests', 'UPSERT', guest);
                invalidateCache('guests');
                return guest;
            }
            console.error('❌ Supabase saveGuest failed:', error.message);
            // Non-blocking – don't throw from guest saves
            return guest;
        }
    }
    
    // Fallback to IndexedDB
    const isNew = !(await tx<Guest>('guests', 'readonly', store => store.get(guest.id)));
    await put('guests', guest);
    await queueSync('guests', isNew ? 'CREATE' : 'UPDATE', guest);
};

export const deleteGuest = async (id: string) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        if (!isOnline()) {
            console.log('📴 Offline – queuing guest delete:', id);
            await remove('guests', id);
            await enqueueOfflineOp('guests', 'DELETE', { id });
            invalidateCache('guests');
            return;
        }
        try {
            await supabaseAdapter.deleteGuest(id);
            await remove('guests', id);
            return;
        } catch (error: any) {
            if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
                console.warn('⚠️ Supabase unreachable – queuing guest delete:', id);
                await remove('guests', id);
                await enqueueOfflineOp('guests', 'DELETE', { id });
                invalidateCache('guests');
                return;
            }
            console.error('❌ Supabase deleteGuest failed:', error.message);
            throw error;
        }
    }
    
    // Fallback to IndexedDB
    await remove('guests', id);
    await queueSync('guests', 'DELETE', { id });
};
export const upsertGuestFromBooking = async (booking: Booking) => {
    if (!booking.guestName) return;

    // Only create/update guest if we have a reliable identifier (phone or ID)
    // Name-only matching causes duplicates - skip it
    const hasIdentifier = booking.phone || booking.identification;
    if (!hasIdentifier) {
        console.log(`⏭️ Skipping guest upsert for "${booking.guestName}": no phone or ID`);
        return;
    }

    console.log(`👤 Upserting guest: ${booking.guestName}`);

    const allBookings = await getBookings();

    // Match bookings by phone OR identification only (no name fallback)
    const guestBookings = allBookings.filter(b => {
        if (booking.phone && b.phone === booking.phone) return true;
        if (booking.identification && b.identification === booking.identification) return true;
        return false;
    });

    const activeBookings = guestBookings.filter(b => b.status !== 'CANCELLED');
    const totalSpent = activeBookings.reduce((sum, b) => sum + (b.paidAmount || b.amount || 0), 0);
    const visits = activeBookings.length;
    const lastVisit = activeBookings.length > 0
        ? activeBookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : new Date().toISOString();

    const guests = await getGuests();
    const existing = guests.find(g =>
        (booking.phone && g.phone === booking.phone) ||
        (booking.identification && g.identification === booking.identification)
    );

    if (existing) {
        existing.totalSpent = totalSpent;
        existing.visits = visits;
        existing.lastVisit = lastVisit;
        existing.name = booking.guestName;
        if (booking.email) existing.email = booking.email;
        if (booking.phone) existing.phone = booking.phone;
        if (booking.identification) {
            existing.identification = booking.identification;
            existing.identificationType = booking.identificationType || existing.identificationType;
        }
        existing.isVip = totalSpent > 1000000;
        await saveGuest(existing);
    } else {
        const newGuest: Guest = {
            id: booking.phone || booking.identification || `g-${Date.now()}`,
            name: booking.guestName,
            phone: booking.phone || '',
            email: booking.email || '',
            identification: booking.identification || '',
            identificationType: booking.identificationType || 'National ID',
            visits,
            totalSpent,
            lastVisit,
            isVip: totalSpent > 1000000
        };
        await saveGuest(newGuest);
    }
};

export const getExpenses = async (): Promise<ExpenseRecord[]> => getAll('expenses');
export const addExpense = async (expense: ExpenseRecord) => {
    await put('expenses', expense);
    await queueSync('expenses', 'CREATE', expense);
};
export const deleteExpense = async (id: string) => {
    await remove('expenses', id);
    await queueSync('expenses', 'DELETE', { id });
};

export const getServices = async (): Promise<ServiceItem[]> => {
    // Use dual-read strategy for consistency
    if (USE_SUPABASE) {
        return dualRead(
            // Supabase read
            () => supabaseAdapter.getServices(),
            // IndexedDB write (cache)
            async (services) => {
                for (const service of services) {
                    await put('services_catalog', service);
                }
            },
            // IndexedDB read (fallback)
            () => getAll<ServiceItem>('services_catalog'),
            'services',
            () => clearObjectStore('services_catalog')
        );
    }
    
    // Fallback to IndexedDB only
    return getAll('services_catalog');
};

export const addService = async (service: ServiceItem) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        try {
            const savedService = await supabaseAdapter.addService(service);
            console.log('✅ Service saved to Supabase:', savedService.id);
            return savedService;
        } catch (error: any) {
            console.error('❌ Supabase addService failed:', error.message);
            throw error;
        }
    }
    
    // Fallback to IndexedDB
    const isNew = !(await tx<ServiceItem>('services_catalog', 'readonly', store => store.get(service.id)));
    await put('services_catalog', service);
    await queueSync('services_catalog', isNew ? 'CREATE' : 'UPDATE', service);
};

export const deleteService = async (id: string) => {
    // Use Supabase if enabled
    if (USE_SUPABASE) {
        try {
            await supabaseAdapter.deleteService(id);
            console.log('✅ Service deleted from Supabase:', id);
            return;
        } catch (error: any) {
            console.error('❌ Supabase deleteService failed:', error.message);
            throw error;
        }
    }
    
    // Fallback to IndexedDB
    await remove('services_catalog', id);
    await queueSync('services_catalog', 'DELETE', { id });
};
export const updateServiceStock = async (serviceId: string, quantityUsed: number) => {
    const services = await getServices();
    const item = services.find(s => s.id === serviceId);
    if (item && item.trackStock && item.stock !== undefined) {
        item.stock = Math.max(0, item.stock - quantityUsed);
        await addService(item);
    }
};
export const restoreServiceStock = async (serviceName: string, quantityToRestore: number) => {
    const items = await getServices();
    const item = items.find(s => s.name === serviceName);
    if (item && item.trackStock && item.stock !== undefined) {
        item.stock = item.stock + quantityToRestore;
        await addService(item);
    }
};

export const getSettings = async (): Promise<SystemSettings> => {
    const result = await tx<SystemSettings>('settings', 'readonly', store => store.get('config'));
    return result || DEFAULT_SETTINGS;
};
export const updateSettings = async (settings: SystemSettings) => {
    const data = { id: 'config', ...settings };
    await put('settings', data);
    await queueSync('settings', 'UPDATE', data);
};

export const getWebsiteContent = async (): Promise<WebsiteContent> => {
    // Try Supabase first
    if (USE_SUPABASE) {
        try {
            const data = await supabaseAdapter.getWebsiteContent();
            if (data) {
                // Cache locally too
                await put('website_content', data);
                return data;
            }
        } catch (error) {
            console.warn('Supabase getWebsiteContent failed, falling back to IndexedDB:', error);
        }
    }
    const result = await tx<WebsiteContent>('website_content', 'readonly', store => store.get('main'));
    return result || DEFAULT_WEBSITE_CONTENT;
};

export const updateWebsiteContent = async (content: WebsiteContent) => {
    // Save to Supabase first
    if (USE_SUPABASE) {
        await supabaseAdapter.updateWebsiteContent(content); // throws on error
    }
    // Also cache locally
    await put('website_content', content);
};

export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
    if (USE_SUPABASE) {
        try {
            const { data, error } = await (await import('./supabase')).supabase
                .from('audit_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(500);
            if (error) throw error;
            return (data || []).map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                userName: r.user_name,
                userRole: r.user_role,
                action: r.action,
                details: r.details,
                timestamp: r.timestamp
            }));
        } catch (err) {
            console.warn('Supabase getAuditLogs failed, falling back to IndexedDB:', err);
        }
    }
    const logs = await getAll<AuditLogEntry>('audit_logs');
    return logs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const logAction = async (user: User, action: string, details: string) => {
    const entry: AuditLogEntry = {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action,
        details,
        timestamp: new Date().toISOString()
    };

    // Write to Supabase (non-blocking, fire-and-forget)
    if (USE_SUPABASE) {
        (await import('./supabase')).supabase
            .from('audit_logs')
            .insert({
                user_id: entry.userId,
                user_name: entry.userName,
                user_role: entry.userRole,
                action: entry.action,
                details: entry.details,
                timestamp: entry.timestamp
            })
            .then(({ error }) => {
                if (error) console.warn('Supabase audit log failed:', error.message);
            });
        return; // Don't wait - audit logs are non-critical
    }

    // Fallback: IndexedDB
    const db = await getDB();
    const transaction = db.transaction('audit_logs', 'readwrite');
    const store = transaction.objectStore('audit_logs');
    
    return new Promise<void>((resolve, reject) => {
        const request = store.add(entry);
        request.onsuccess = async () => {
            const id = request.result;
            const fullEntry = { ...entry, id };
            await queueSync('audit_logs', 'CREATE', fullEntry);
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
};

export const getShifts = async (): Promise<Shift[]> => getAll('shifts');
export const saveShift = async (shift: Shift) => {
    const isNew = !(await tx<Shift>('shifts', 'readonly', store => store.get(shift.id)));
    await put('shifts', shift);
    await queueSync('shifts', isNew ? 'CREATE' : 'UPDATE', shift);
};

export const exportDatabase = async (): Promise<string> => {
    const data: any = {};
    const stores = ['users', 'settings', 'bookings', 'room_categories', 'services_catalog', 'expenses', 'rooms', 'guests', 'shifts', 'website_content', 'notifications'];
    for (const storeName of stores) {
        data[storeName] = await getAll(storeName);
    }
    return JSON.stringify(data, null, 2);
};

// --- SYNC LOGIC ---
const queueSync = async (storeName: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', data: any) => {
    if (!USE_BACKEND) return;

    const syncItem: SyncItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        storeName,
        operation,
        data,
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        retryCount: 0
    };
    await put('sync_queue', syncItem);
    
    // Attempt immediate sync if online
    if (navigator.onLine) {
        syncData().catch(err => console.error("Immediate sync failed:", err));
    }
};

export const getPendingSyncCount = async (): Promise<number> => {
    const items = await getAll<SyncItem>('sync_queue');
    return items.filter(i => i.status === 'PENDING' || i.status === 'FAILED').length;
};

export const syncData = async (): Promise<void> => {
    if (!USE_BACKEND || !navigator.onLine) return;

    const pendingItems = await getAll<SyncItem>('sync_queue');
    const itemsToSync = pendingItems
        .filter(i => i.status === 'PENDING' || i.status === 'FAILED')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (itemsToSync.length === 0) return;

    console.log(`Starting sync of ${itemsToSync.length} items...`);

    for (const item of itemsToSync) {
        try {
            item.status = 'SYNCING';
            await put('sync_queue', item);

            // Map store names to API endpoints
            const endpointMap: { [key: string]: string } = {
                'bookings': ENDPOINTS.BOOKINGS,
                'rooms': ENDPOINTS.ROOMS,
                'room_categories': ENDPOINTS.CATEGORIES,
                'guests': ENDPOINTS.GUESTS,
                'users': ENDPOINTS.STAFF,
                'expenses': ENDPOINTS.FINANCE.EXPENSES,
                'services_catalog': ENDPOINTS.FINANCE.SERVICES,
                'settings': ENDPOINTS.SETTINGS,
                'audit_logs': ENDPOINTS.LOGS,
                'shifts': ENDPOINTS.SHIFTS
            };

            const endpoint = endpointMap[item.storeName];
            if (!endpoint) {
                console.warn(`No endpoint mapped for store: ${item.storeName}`);
                await remove('sync_queue', item.id);
                continue;
            }

            // Perform API call based on operation
            if (item.operation === 'DELETE') {
                await api.delete(`${endpoint}/${item.data.id || item.data}`);
            } else if (item.operation === 'CREATE') {
                await api.post(endpoint, item.data);
            } else if (item.operation === 'UPDATE') {
                await api.put(`${endpoint}/${item.data.id}`, item.data);
            }

            // Success: remove from queue
            await remove('sync_queue', item.id);
            console.log(`Synced ${item.operation} on ${item.storeName} successfully.`);
        } catch (error: any) {
            console.error(`Sync failed for item ${item.id}:`, error);
            item.status = 'FAILED';
            item.retryCount += 1;
            item.lastError = error.message;
            await put('sync_queue', item);
            
            // If it's a network error, stop processing the queue
            if (!navigator.onLine) break;
        }
    }
};

export const importDatabase = async (jsonString: string) => {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    for (const storeName of Object.keys(data)) {
        if (!db.objectStoreNames.contains(storeName)) {
            console.warn(`Skipping unknown store during import: ${storeName}`);
            continue;
        }
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await new Promise<void>((resolve) => {
            store.clear().onsuccess = () => resolve();
        });
        for (const item of data[storeName]) {
            store.add(item);
        }
    }
};

// --- SYNC INDEXEDDB TO SUPABASE ---
/**
 * Sync existing IndexedDB data to Supabase
 * This runs once on app start to push local data to cloud
 */
export const syncIndexedDBToSupabase = async (): Promise<void> => {
    if (!USE_SUPABASE) {
        console.log('⚠️ Supabase disabled, skipping IndexedDB sync');
        return;
    }

    console.log('🔄 Starting IndexedDB → Supabase sync...');
    
    try {
        let totalSynced = 0;
        let totalSkipped = 0;
        let totalErrors = 0;

        // 1. SYNC ROOMS
        console.log('📦 Syncing rooms...');
        try {
            const localRooms = await getAll<Room>('rooms');
            const supabaseRooms = await supabaseAdapter.getRooms();
            
            for (const room of localRooms) {
                try {
                    const exists = supabaseRooms.find(r => r.id === room.id);
                    if (!exists) {
                        await supabaseAdapter.addRoom(room);
                        console.log(`   ✅ Synced room: ${room.id}`);
                        totalSynced++;
                    } else {
                        totalSkipped++;
                    }
                } catch (error: any) {
                    console.error(`   ❌ Failed to sync room ${room.id}:`, error.message);
                    totalErrors++;
                }
            }
        } catch (error) {
            console.error('❌ Failed to sync rooms:', error);
        }

        // 2. SYNC GUESTS
        console.log('📦 Syncing guests...');
        try {
            const localGuests = await getAll<Guest>('guests');
            const supabaseGuests = await supabaseAdapter.getGuests();
            
            for (const guest of localGuests) {
                try {
                    const exists = supabaseGuests.find(g => g.id === guest.id);
                    if (!exists) {
                        await supabaseAdapter.upsertGuest(guest);
                        console.log(`   ✅ Synced guest: ${guest.name}`);
                        totalSynced++;
                    } else {
                        totalSkipped++;
                    }
                } catch (error: any) {
                    console.error(`   ❌ Failed to sync guest ${guest.name}:`, error.message);
                    totalErrors++;
                }
            }
        } catch (error) {
            console.error('❌ Failed to sync guests:', error);
        }

        // 3. SYNC SERVICES
        console.log('📦 Syncing services...');
        try {
            const localServices = await getAll<ServiceItem>('services_catalog');
            const supabaseServices = await supabaseAdapter.getServices();
            
            for (const service of localServices) {
                try {
                    const exists = supabaseServices.find(s => s.id === service.id);
                    if (!exists) {
                        await supabaseAdapter.addService(service);
                        console.log(`   ✅ Synced service: ${service.name}`);
                        totalSynced++;
                    } else {
                        totalSkipped++;
                    }
                } catch (error: any) {
                    console.error(`   ❌ Failed to sync service ${service.name}:`, error.message);
                    totalErrors++;
                }
            }
        } catch (error) {
            console.error('❌ Failed to sync services:', error);
        }

        // 4. SYNC BOOKINGS
        console.log('📦 Syncing bookings...');
        try {
            const localBookings = await getAll<Booking>('bookings');
            const supabaseBookings = await supabaseAdapter.getBookings();
            
            for (const booking of localBookings) {
                try {
                    // Check if booking exists (match by guest name, check-in date, and room)
                    const exists = supabaseBookings.find(b => 
                        b.guestName === booking.guestName && 
                        b.checkIn === booking.checkIn &&
                        b.roomNumber === booking.roomNumber
                    );
                    
                    if (!exists) {
                        // Create new booking (let Supabase generate UUID)
                        const newBooking = { ...booking, id: 'NEW' };
                        await supabaseAdapter.saveBooking(newBooking);
                        console.log(`   ✅ Synced booking: ${booking.guestName}`);
                        totalSynced++;
                    } else {
                        totalSkipped++;
                    }
                } catch (error: any) {
                    console.error(`   ❌ Failed to sync booking for ${booking.guestName}:`, error.message);
                    totalErrors++;
                }
            }
        } catch (error) {
            console.error('❌ Failed to sync bookings:', error);
        }

        // 5. CREATE GUESTS FROM ALL BOOKINGS
        console.log('📦 Creating guests from bookings...');
        try {
            const allBookings = await supabaseAdapter.getBookings();
            const guestMap = new Map<string, { booking: Booking; bookings: Booking[] }>();
            
            // Group bookings by guest identifier
            for (const booking of allBookings) {
                if (!booking.guestName) continue;
                
                const guestKey = booking.phone || booking.identification || booking.guestName.toLowerCase();
                
                if (!guestMap.has(guestKey)) {
                    guestMap.set(guestKey, { booking, bookings: [] });
                }
                guestMap.get(guestKey)!.bookings.push(booking);
            }
            
            // Create/update guest records
            for (const [key, { booking, bookings }] of guestMap.entries()) {
                try {
                    const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');
                    const totalSpent = activeBookings.reduce((sum, b) => sum + (b.paidAmount || b.amount || 0), 0);
                    const visits = activeBookings.length;
                    const lastVisit = activeBookings.length > 0
                        ? activeBookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
                        : new Date().toISOString();
                    
                    const guest: Guest = {
                        id: booking.phone || booking.identification || `g-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                        name: booking.guestName,
                        phone: booking.phone || '',
                        email: booking.email || '',
                        identification: booking.identification || '',
                        identificationType: booking.identificationType || 'National ID',
                        visits: visits,
                        totalSpent: totalSpent,
                        lastVisit: lastVisit,
                        isVip: totalSpent > 1000000
                    };
                    
                    await supabaseAdapter.upsertGuest(guest);
                    console.log(`   ✅ Created/updated guest: ${guest.name} (${visits} visits, ${totalSpent} spent)`);
                    totalSynced++;
                } catch (error: any) {
                    console.error(`   ❌ Failed to create guest from ${booking.guestName}:`, error.message);
                    totalErrors++;
                }
            }
            
            console.log(`   📊 Processed ${guestMap.size} unique guests`);
        } catch (error) {
            console.error('❌ Failed to create guests from bookings:', error);
        }

        // SUMMARY
        console.log('═══════════════════════════════════════════');
        console.log('✅ IndexedDB → Supabase sync completed!');
        console.log(`   Synced: ${totalSynced} records`);
        console.log(`   Skipped: ${totalSkipped} records (already exist)`);
        console.log(`   Errors: ${totalErrors} records`);
        console.log('═══════════════════════════════════════════');

        if (totalErrors > 0) {
            console.warn('⚠️ Some records failed to sync. Check errors above.');
            console.warn('💡 Make sure you ran PRODUCTION_SAFE_MIGRATION.sql first!');
        }
    } catch (error) {
        console.error('❌ IndexedDB → Supabase sync failed:', error);
    }
};
