/**
 * Data Cache Utility
 * 
 * This utility provides caching for frequently accessed data to reduce API calls
 * and improve application performance.
 */
import { env } from '../env';

interface CacheItem<T> {
  data: T;
  expiry: number;
}

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  [key: string]: any;
}

interface SchoolSettings {
  schoolName: string;
  schoolbadge: string;
  theme: string;
  [key: string]: any;
}

interface AcademicYear {
  id: string;
  year: string;
  current: boolean;
  [key: string]: any;
}

interface UserStats {
  teachers: number;
  students: number;
  sheikis: number;
  staff: number;
  [key: string]: any;
}

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  [key: string]: any;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  image?: string;
  createdAt: string;
  [key: string]: any;
}

class DataCache {
  private cache: {
    [key: string]: CacheItem<any>;
  } = {};

  // Default expiry times in milliseconds
  private DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private SHORT_EXPIRY = 2 * 60 * 1000;   // 2 minutes
  private LONG_EXPIRY = 30 * 60 * 1000;   // 30 minutes

  /**
   * Get data from cache or fetch it if not available
   */
  private async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    expiryMs: number = this.DEFAULT_EXPIRY
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache[key];

    // Return cached data if available and not expired
    if (cached && cached.expiry > now) {
      console.log(`🧠 Cache hit: ${key}`);
      return cached.data;
    }

    // Fetch fresh data
    console.log(`🔄 Cache miss: ${key}, fetching fresh data...`);
    try {
      const data = await fetchFn();
      
      // Store in cache
      this.cache[key] = {
        data,
        expiry: now + expiryMs
      };
      
      return data;
    } catch (error) {
      console.error(`Error fetching data for ${key}:`, error);
      
      // If we have stale data, return it as fallback
      if (cached) {
        console.log(`⚠️ Using stale cached data for ${key}`);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Invalidate specific cache entries
   */
  public invalidate(...keys: string[]) {
    keys.forEach(key => {
      delete this.cache[key];
      console.log(`🗑️ Invalidated cache: ${key}`);
    });
  }

  /**
   * Clear all cached data
   */
  public clearAll() {
    this.cache = {};
    console.log('🧹 All cache cleared');
  }

  /**
   * Get user data by ID
   */
  public async getUserData(userId: string): Promise<UserData> {
    const key = `user_${userId}`;
    
    return this.getOrFetch(key, async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data?.user || data.data || data;
    });
  }

  /**
   * Get school settings
   */
  public async getSchoolSettings(): Promise<SchoolSettings> {
    const key = 'school_settings';
    
    return this.getOrFetch(key, async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/settings/view`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch school settings: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data?.settings || data.data || data;
    }, this.LONG_EXPIRY); // School settings change rarely, use longer expiry
  }

  /**
   * Get current academic year
   */
  public async getCurrentAcademicYear(): Promise<AcademicYear> {
    const key = 'current_academic_year';
    
    return this.getOrFetch(key, async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/academic-years/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch current academic year: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data?.academicYear || data.academicYear || data;
    }, this.LONG_EXPIRY);
  }

  /**
   * Get user role stats
   */
  public async getUserStats(): Promise<UserStats> {
    const key = 'user_stats';
    
    return this.getOrFetch(key, async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/user-role-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user stats: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || data;
    }, this.SHORT_EXPIRY); // Stats may change more frequently, use shorter expiry
  }

  /**
   * Handle user login (clear relevant caches)
   */
  public handleLogin() {
    this.clearAll(); // Clear all cache on login
  }

  /**
   * Handle user logout (clear all caches)
   */
  public handleLogout() {
    this.clearAll(); // Clear all cache on logout
  }

  /**
   * Get recent notices
   */
  public async getRecentNotices(): Promise<NoticeItem[]> {
    const key = 'notices_recent';
    
    return this.getOrFetch(key, async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/notices?page=1&pageSize=4`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notices: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data?.notices || [];
    }, this.SHORT_EXPIRY); // Notices may change frequently
  }

  /**
   * Get recent news
   */
  public async getRecentNews(): Promise<NewsItem[]> {
    const key = 'news_recent';
    
    return this.getOrFetch(key, async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/News?page=1&pageSize=3`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data?.news || [];
    }, this.DEFAULT_EXPIRY); // 5 minutes cache
  }

  /**
   * Get teacher class assignments
   */
  public async getTeacherClassAssignments(): Promise<any[]> {
    const key = 'teacher_class_assignments';
    
    return this.getOrFetch(key, async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/teacher-class-assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch teacher class assignments: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different response structures
      if (data?.status?.returnCode === '00' && data?.data) {
        return data.data;
      } else if (data?.assignmentsList) {
        return data.assignmentsList;
      } else if (data && Array.isArray(data)) {
        return data;
      } else if (data?.data && Array.isArray(data.data)) {
        return data.data;
      }
      
      return [];
    }, this.DEFAULT_EXPIRY);
  }
}

// Create and export a singleton instance
const dataCache = new DataCache();
export default dataCache;
