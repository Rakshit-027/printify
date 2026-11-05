import { Platform } from 'react-native';
import { StorageService } from './storage';
import { DEFAULT_SERVER_URL } from '../constants/serverConfig';

export interface VendorUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  vendorId?: string;
  vendor?: {
    id: string;
    name: string;
    slug: string;
    contactPhone?: string;
    address?: string;
    allowCashOnDesk?: boolean;
    allowOnlinePayment?: boolean;
  };
}

export interface RegisterVendorData {
  email: string;
  password: string;
  fullName: string;
  vendorName: string;
  vendorSlug: string;
  contactPhone: string;
  address: string;
  otp?: string;
}

export interface OrderItem {
  id: string;
  paperSize: string;
  colorMode: string;
  duplexMode: string;
  copies: number;
  totalSides: number;
  totalSheets: number;
  document?: {
    originalName: string;
    pageCount: number;
    mimeType: string;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  trackingToken: string;
  customerName?: string;
  customerPhone?: string;
  customerNotes?: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmountMinor: number;
  createdAt: string;
  items: OrderItem[];
}

export interface DocumentInfo {
  itemId?: string;
  documentId?: string;
  filename: string;
  mimeType: string;
  pageCount?: number;
  paperSize?: string;
  colorMode?: string;
  duplexMode?: string;
  copies?: number;
  downloadUrl: string;
}

export class ApiError extends Error {
  status?: number;
  isHttpError: boolean;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isHttpError = typeof status === 'number';
  }
}

class ApiService {
  private async getHeaders(): Promise<HeadersInit> {
    const token = await StorageService.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      // Also pass cookie simulation if needed by Next.js session
      headers['x-session-token'] = token;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = await StorageService.getApiBaseUrl();
    const headers = await this.getHeaders();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl.replace(/\/+$/, '')}${cleanEndpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ApiError(data.error || data.message || `Request failed (${response.status})`, response.status);
      }

      return data as T;
    } catch (err: any) {
      // Do not attempt alternative host if this was a valid HTTP response with an error status (e.g. 401 Unauthorized, 400 Bad Request)
      if (err instanceof ApiError && err.isHttpError) {
        throw err;
      }

      // Smart Fallback for Android device ONLY on actual network connection drops (e.g. adb reverse disconnection)
      const isNetworkError = err?.message?.includes('Network request failed') || err?.message?.includes('Failed to fetch');
      if (Platform.OS === 'android' && isNetworkError) {
        const altHost = url.includes('localhost') || url.includes('127.0.0.1')
          ? DEFAULT_SERVER_URL
          : 'http://localhost:8080';
        try {
          const fallbackUrl = `${altHost}${cleanEndpoint}`;
          const fallbackRes = await fetch(fallbackUrl, {
            ...options,
            headers: {
              ...headers,
              ...(options.headers || {}),
            },
          });
          const fallbackData = await fallbackRes.json().catch(() => ({}));
          if (fallbackRes.ok) {
            await StorageService.setApiBaseUrl(altHost);
            return fallbackData as T;
          }
        } catch {}
      }

      console.warn(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  async login(email: string, password: string): Promise<{ user: VendorUser; token?: string }> {
    const res = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.token) {
      await StorageService.setAuthToken(res.token);
    }
    if (res.user) {
      await StorageService.setVendorData(res.user);
    }
    return res;
  }

  async registerVendor(data: RegisterVendorData): Promise<{ user: VendorUser; token?: string }> {
    const res = await this.request<any>('/api/auth/register-vendor', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.token) {
      await StorageService.setAuthToken(res.token);
    }
    if (res.user) {
      await StorageService.setVendorData(res.user);
    }
    return res;
  }

  async sendOtp(email: string): Promise<{ success: boolean; message: string; mock?: boolean }> {
    return this.request<{ success: boolean; message: string; mock?: boolean }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  }

  async verifyOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
    });
  }

  async getCurrentUser(): Promise<VendorUser | null> {
    try {
      const token = await StorageService.getAuthToken();
      if (!token) {
        // No saved token: definitely not logged in, clear any stale vendor data
        await StorageService.clearAuthSession();
        return null;
      }

      const res = await this.request<{ authenticated: boolean; user: VendorUser }>('/api/auth/me');
      if (res && res.authenticated && res.user) {
        await StorageService.setVendorData(res.user);
        return res.user;
      }

      // Server returned not authenticated (invalid/expired session)
      await StorageService.clearAuthSession();
      return null;
    } catch (err: any) {
      // If unauthorized (401/403), wipe stored credentials
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized') || err?.message?.includes('403')) {
        await StorageService.clearAuthSession();
        return null;
      }

      // Check if token exists before trusting any cache
      const token = await StorageService.getAuthToken();
      if (!token) {
        await StorageService.clearAuthSession();
        return null;
      }

      // Pure network timeout with existing token: return cached user
      console.warn('Session check network warning:', err?.message);
      return await StorageService.getVendorData();
    }
  }

  async getOrders(statusTab: string = 'ALL'): Promise<Order[]> {
    const query = statusTab !== 'ALL' ? `?status=${encodeURIComponent(statusTab)}` : '';
    const res = await this.request<{ success: boolean; orders: Order[] }>(`/api/vendor/orders${query}`);
    return res.orders || [];
  }

  async updateOrderStatus(
    orderId: string,
    actionOrPayload: string | { status: string; paymentStatus?: string }
  ): Promise<any> {
    let payload: { status: string; paymentStatus?: string };

    if (typeof actionOrPayload === 'object') {
      payload = actionOrPayload;
    } else {
      switch (actionOrPayload) {
        case 'MARK_CASH_COLLECTED':
        case 'APPROVE_CASH':
          payload = { status: 'CONFIRMED', paymentStatus: 'CASH_COLLECTED' };
          break;
        case 'APPROVE':
          payload = { status: 'CONFIRMED' };
          break;
        case 'REJECT':
          payload = { status: 'REJECTED' };
          break;
        case 'MARK_READY':
          payload = { status: 'READY_FOR_PICKUP' };
          break;
        case 'MARK_COMPLETED':
          payload = { status: 'COMPLETED' };
          break;
        default:
          payload = { status: actionOrPayload };
      }
    }

    return await this.request<any>(`/api/vendor/orders/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getOrderDocuments(orderId: string): Promise<DocumentInfo[]> {
    const res = await this.request<{ success: boolean; documents: DocumentInfo[] }>(
      `/api/vendor/orders/${orderId}/document`
    );
    return res.documents || [];
  }

  async getPricing(): Promise<PricingRule[]> {
    const res = await this.request<{ success: boolean; pricing: PricingRule[] }>('/api/vendor/pricing');
    return res.pricing || [];
  }

  async updatePricing(pricing: PricingRule[]): Promise<{ success: boolean }> {
    return await this.request<{ success: boolean }>('/api/vendor/pricing', {
      method: 'PUT',
      body: JSON.stringify(pricing),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    await StorageService.clearAuthSession();
  }

  /**
   * Register the device's FCM push token with the server.
   * Should be called once after login/startup whenever an FCM token is available.
   * Uses fire-and-forget — errors are silently logged.
   */
  async registerFcmToken(token: string): Promise<void> {
    try {
      await this.request('/api/vendor/fcm-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      console.log('[Print2Me] FCM token registered with server');
    } catch (err: any) {
      console.warn('[Print2Me] FCM token registration failed (non-critical):', err?.message);
    }
  }

  async getSubscription(): Promise<{ subscription: VendorSubscription; plans: SubscriptionPlanItem[] } | null> {
    try {
      const res = await this.request<{ success: boolean; subscription: VendorSubscription; plans: SubscriptionPlanItem[] }>('/api/vendor/subscription');
      if (res && res.subscription) {
        return { subscription: res.subscription, plans: res.plans || [] };
      }
      return null;
    } catch (err: any) {
      console.warn('Subscription fetch note:', err?.message);
      return null;
    }
  }

  async validateCoupon(couponCode: string, planCode: string, billingCycle: string = 'MONTHLY'): Promise<any> {
    return await this.request('/api/vendor/subscription/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ couponCode, planCode, billingCycle }),
    });
  }

  async checkoutSubscription(planCode: string, billingCycle: string = 'MONTHLY', couponCode?: string): Promise<any> {
    return await this.request('/api/vendor/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ planCode, billingCycle, couponCode }),
    });
  }

  async verifySubscription(payload: {
    planCode: string;
    billingCycle: string;
    couponCode?: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }): Promise<any> {
    return await this.request('/api/vendor/subscription/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export interface SubscriptionPlanItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  priceMonthlyMinor: number;
  priceYearlyMinor: number;
  deviceLimit?: number;
  quotaLimit?: number;
  features?: any;
}

export interface VendorSubscription {
  planCode: string;
  isActive: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  daysRemaining: number;
  plan?: {
    name: string;
    code: string;
    description?: string;
    pricePerMonthMinor?: number;
  };
}

export interface PricingRule {
  paper_size: string;
  color_mode: string;
  is_duplex: boolean;
  price_per_side_minor: number;
  sheet_charge_minor: number;
  minimum_order_minor: number;
  version: number;
}

export const Api = new ApiService();
