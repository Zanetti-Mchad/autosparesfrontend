// API call debugger and fixer
export function setupApiDebugger() {
  if (typeof window !== 'undefined') {
    // Log current authentication token
    const logAuthStatus = () => {
      try {
        const token = localStorage.getItem('accessToken');
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        
        console.log('🔑 Auth Status:', {
          hasToken: !!token,
          tokenLength: token ? token.length : 0,
          tokenExpiry: tokenExpiry || 'none',
          userId: userId || 'none',
          userRole: userRole || 'none',
        });
      } catch (err) {
        console.error('Error checking authentication status:', err);
      }
    };
    
    // Get the correct backend URL from environment or fallback to Railway
    // This ensures we have a proper URL even if env variables aren't loaded yet
    let backendUrl;
    try {
      const env = window.env || {};
      backendUrl = env.BACKEND_API_URL || env.NEXT_PUBLIC_BACKEND_API_URL || 'autosparesbackend-production.up.railway.app';
      
      // Strip trailing slash if present
      if (backendUrl.endsWith('/')) {
        backendUrl = backendUrl.slice(0, -1);
      }
      
      console.log(`🔌 Using backend API URL: ${backendUrl}`);
    } catch (err) {
      console.error('Failed to determine backend URL:', err);
      backendUrl = 'https://autosparesbackend-production.up.railway.app'; // Fallback
    }
    
    // Store the backend URL in window for other scripts to use
    window.CORRECTED_BACKEND_URL = backendUrl;
    
    // Monitor localStorage for token changes
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      if (key === 'accessToken' || key === 'userId' || key === 'userRole') {
        console.log(`📝 localStorage.${key} updated:`, key === 'accessToken' ? 'Token updated (hidden for security)' : value);
      }
      originalSetItem.apply(this, arguments);
      if (key === 'accessToken') {
        // Log full auth state whenever token changes
        setTimeout(logAuthStatus, 100);
      }
    };
    
    // Override fetch to fix URLs and enhance authentication
    const originalFetch = window.fetch;
    
    window.fetch = function(url, options = {}) {
      // Skip if not a string URL (might be a Request object)
      if (typeof url !== 'string') {
        return originalFetch(url, options);
      }
      
      let modifiedUrl = url;
      let wasModified = false;
      
      // Fix 1: Correct /api/v1/users/ to /api/v1/integration/users/
      if (url.includes('/api/v1/users/') && !url.includes('/integration/')) {
        modifiedUrl = url.replace('/api/v1/users/', '/api/v1/integration/users/');
        wasModified = true;
      }
      
      // Fix 2: Replace hardcoded localhost:4120 URLs with proper backend URL
      if (url.includes('http://localhost:4120')) {
        modifiedUrl = url.replace('http://localhost:4120', backendUrl);
        wasModified = true;
      }
      
      // Fix 3: Ensure authorization header is present for API calls if we have a token
      if (modifiedUrl.includes('/api/v1/') && !options.headers?.Authorization) {
        const token = localStorage.getItem('accessToken');
        if (token) {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          };
          console.log('🔒 Added missing auth token to request');
        }
      }
      
      // Log modifications when they happen
      if (wasModified) {
        console.warn('🔄 Fixed API URL:', {
          from: url,
          to: modifiedUrl
        });
      }
      
      // Enhanced logging for API calls
      const isUserApi = url.includes('/users/') || url.includes('/user-');
      const isAuthApi = url.includes('/auth/');
      
      if (isUserApi || isAuthApi || url.includes('/integration/')) {
        const authHeader = options.headers?.Authorization ? '✅ With Auth' : '❌ No Auth';
        console.log(`📡 API Call (${authHeader}):`, {
          url: modifiedUrl,
          method: options.method || 'GET',
          type: isAuthApi ? 'Auth API' : isUserApi ? 'User API' : 'Other API'
        });
      }
      
      // Use the corrected URL with enhanced logging of responses
      const startTime = Date.now();
      return originalFetch(modifiedUrl, options).then(response => {
        // Clone the response so we can inspect it AND return it
        const clonedResponse = response.clone();
        
        // Log info about the response
        const elapsed = Date.now() - startTime;
        console.log(`📥 API Response (${elapsed}ms):`, {
          url: modifiedUrl,
          status: response.status,
          ok: response.ok
        });
        
        // For failed auth responses, log more details
        if ((isUserApi || isAuthApi) && !response.ok) {
          clonedResponse.json().catch(e => ({})).then(data => {
            console.error('❌ Auth/User API error:', {
              url: modifiedUrl, 
              status: response.status,
              data
            });
            
            // If token is invalid, log auth status
            if (response.status === 401) {
              console.warn('🚨 Authentication failure detected');
              logAuthStatus();
            }
          });
        }
        
        return response;
      }).catch(error => {
        console.error('❌ Fetch error:', { url: modifiedUrl, error });
        throw error;
      });
    };
    
    // Also inject environment variables into window
    try {
      // Import environment configuration
      import('../env').then(envModule => {
        window.env = envModule.env;
        console.log('📊 Environment variables loaded into window.env');
      }).catch(err => {
        console.error('Failed to load environment variables:', err);
      });
    } catch (err) {
      console.error('Error loading environment:', err);
    }
    
    // Log initial auth status
    logAuthStatus();
    
    console.log('🛠️ Enhanced API debugger installed with auth monitoring');
  }
}
