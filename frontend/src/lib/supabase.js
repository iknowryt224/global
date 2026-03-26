import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Auth helpers
export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabaseAuthRetry(() => supabase.auth.signOut());
  return { error };
};

const supabaseAuthRetry = async (fn, retries = 3, delayMs = 100) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = String(error?.message || error);
      if (message.includes('Lock') && message.includes('released because another request stole it')) {
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabaseAuthRetry(() => supabase.auth.getUser());
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabaseAuthRetry(() => supabase.auth.getSession());
  return { session, error };
};

// Profile helpers
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId);
  
  // Handle error where profile doesn't exist yet
  if (error?.code === 'PGRST116') {
    // Profile not found - return null instead of error
    return { data: null, error: null };
  }
  
  // If data is an array, return first item (or null if empty)
  if (Array.isArray(data)) {
    return { data: data[0] || null, error };
  }
  
  return { data, error };
};

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const getAllProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getDrivers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'driver')
    .order('name');
  return { data, error };
};

// Shipment helpers
export const createShipment = async (shipmentData) => {
  const { data, error } = await supabase
    .from('shipments')
    .insert(shipmentData)
    .select(`
      *,
      assigned_driver:profiles!shipments_assigned_driver_id_fkey(id, name)
    `)
    .single();
  return { data, error };
};

export const getShipments = async (userId, userRole, userEmail) => {
  let query = supabase
    .from('shipments')
    .select(`
      *,
      assigned_driver:profiles!shipments_assigned_driver_id_fkey(id, name),
      tracking_history:tracking_events(*)
    `)
    .order('created_at', { ascending: false });

  // RLS handles most filtering, but we can add additional filters for clarity
  if (userRole === 'driver') {
    query = query.eq('assigned_driver_id', userId);
  }

  const { data, error } = await query;
  return { data, error };
};

export const getShipment = async (shipmentId) => {
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      *,
      assigned_driver:profiles!shipments_assigned_driver_id_fkey(id, name),
      tracking_history:tracking_events(*)
    `)
    .eq('id', shipmentId)
    .single();
  
  // Sort tracking history by created_at
  if (data && data.tracking_history) {
    data.tracking_history.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  
  return { data, error };
};

export const updateShipment = async (shipmentId, updates) => {
  const { data, error } = await supabase
    .from('shipments')
    .update(updates)
    .eq('id', shipmentId)
    .select(`
      *,
      assigned_driver:profiles!shipments_assigned_driver_id_fkey(id, name)
    `)
    .single();
  return { data, error };
};

export const deleteShipment = async (shipmentId) => {
  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('id', shipmentId);
  return { error };
};

// Tracking helpers
export const addTrackingEvent = async (eventData) => {
  // First, add the tracking event
  const { data: trackingData, error: trackingError } = await supabase
    .from('tracking_events')
    .insert({
      shipment_id: eventData.shipment_id,
      status: eventData.status,
      location: eventData.location,
      notes: eventData.notes || null,
      latitude: eventData.latitude || null,
      longitude: eventData.longitude || null,
      created_by: eventData.created_by
    })
    .select()
    .single();

  if (trackingError) {
    return { data: null, error: trackingError };
  }

  // Then update the shipment status
  const { error: updateError } = await supabase
    .from('shipments')
    .update({ current_status: eventData.status })
    .eq('id', eventData.shipment_id);

  if (updateError) {
    return { data: trackingData, error: updateError };
  }

  return { data: trackingData, error: null };
};

/**
 * Get shipment with tracking events and coordinates
 */
export const getShipmentWithTracking = async (shipmentId) => {
  try {
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select(`
        *,
        assigned_driver:profiles!shipments_assigned_driver_id_fkey(id, name)
      `)
      .eq('id', shipmentId)
      .single();

    if (shipmentError) throw shipmentError;

    const { data: events, error: eventsError } = await supabase
      .from('tracking_events')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: true });

    if (eventsError) throw eventsError;

    return { data: { shipment, events }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Public tracking (no auth required)
export const trackShipment = async (trackingNumber) => {
  try {
    const { data, error } = await supabase
      .rpc('get_public_tracking', { p_tracking_number: trackingNumber });
    
    // Handle RPC response - the data might be wrapped or returned as JSON string
    if (error) {
      return { data: null, error };
    }
    
    // If data is null, shipment not found
    if (data === null) {
      return { data: null, error: new Error('Shipment not found') };
    }
    
    // Parse if it's a string, otherwise use as-is
    const trackingData = typeof data === 'string' ? JSON.parse(data) : data;
    
    return { data: trackingData, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Dashboard stats
export const getDashboardStats = async (userId, userRole, userEmail) => {
  let query = supabase.from('shipments').select('current_status', { count: 'exact' });

  if (userRole === 'driver') {
    query = query.eq('assigned_driver_id', userId);
  } else if (userRole === 'customer') {
    query = query.or(`created_by.eq.${userId},sender_email.eq.${userEmail},recipient_email.eq.${userEmail}`);
  }

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error };
  }

  // Count statuses
  const stats = {
    total_shipments: data?.length || 0,
    pending: 0,
    in_transit: 0,
    delivered: 0,
    failed: 0
  };

  data?.forEach(item => {
    if (item.current_status === 'pending') stats.pending++;
    else if (['picked_up', 'in_transit', 'out_for_delivery'].includes(item.current_status)) stats.in_transit++;
    else if (item.current_status === 'delivered') stats.delivered++;
    else if (item.current_status === 'failed_delivery') stats.failed++;
  });

  return { data: stats, error: null };
};

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to shipment changes for a user
 * @param {string} userId - User ID
 * @param {string} userRole - User role (admin, customer, driver)
 * @param {function} onShipmentChange - Callback when shipment changes
 * @returns {function} Unsubscribe function
 */
export const subscribeToShipments = (userId, userRole, onShipmentChange) => {
  let channel;
  
  if (userRole === 'admin') {
    // Admins see all shipment changes
    channel = supabase
      .channel('shipments-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          console.log('Shipment change (admin):', payload);
          onShipmentChange(payload);
        }
      )
      .subscribe();
  } else if (userRole === 'driver') {
    // Drivers see changes to their assigned shipments
    channel = supabase
      .channel('shipments-driver')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: `assigned_driver_id=eq.${userId}`
        },
        (payload) => {
          console.log('Shipment change (driver):', payload);
          onShipmentChange(payload);
        }
      )
      .subscribe();
  } else {
    // Customers see changes to shipments they created
    channel = supabase
      .channel('shipments-customer')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: `created_by=eq.${userId}`
        },
        (payload) => {
          console.log('Shipment change (customer):', payload);
          onShipmentChange(payload);
        }
      )
      .subscribe();
  }

  // Return unsubscribe function
  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
};

/**
 * Subscribe to tracking events for a specific shipment
 * @param {string} shipmentId - Shipment ID
 * @param {function} onTrackingEvent - Callback when new tracking event
 * @returns {function} Unsubscribe function
 */
export const subscribeToTrackingEvents = (shipmentId, onTrackingEvent) => {
  const channel = supabase
    .channel(`tracking-${shipmentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'tracking_events',
        filter: `shipment_id=eq.${shipmentId}`
      },
      (payload) => {
        console.log('New tracking event:', payload);
        onTrackingEvent(payload);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribe to shipment status changes for a specific shipment
 * @param {string} shipmentId - Shipment ID
 * @param {function} onStatusChange - Callback when status changes
 * @returns {function} Unsubscribe function
 */
export const subscribeToShipmentStatus = (shipmentId, onStatusChange) => {
  const channel = supabase
    .channel(`shipment-status-${shipmentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shipments',
        filter: `id=eq.${shipmentId}`
      },
      (payload) => {
        console.log('Shipment status change:', payload);
        onStatusChange(payload);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};
