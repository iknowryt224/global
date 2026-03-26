import { supabase } from "./supabase";

/**
 * Get all locations
 */
export async function getLocations() {
  try {
    const { data, error } = await supabase
      .from("admin_locations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Get locations by type
 */
export async function getLocationsByType(locationType) {
  try {
    const { data, error } = await supabase
      .from("admin_locations")
      .select("*")
      .eq("location_type", locationType)
      .order("name", { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Get single location
 */
export async function getLocation(locationId) {
  try {
    const { data, error } = await supabase
      .from("admin_locations")
      .select("*")
      .eq("id", locationId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Create location (Admin only)
 */
export async function createLocation(locationData) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase
      .from("admin_locations")
      .insert([
        {
          ...locationData,
          created_by: user.id,
        },
      ])
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Update location (Admin only)
 */
export async function updateLocation(locationId, locationData) {
  try {
    const { data, error } = await supabase
      .from("admin_locations")
      .update({
        ...locationData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", locationId)
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Delete location (Admin only)
 */
export async function deleteLocation(locationId) {
  try {
    const { error } = await supabase
      .from("admin_locations")
      .delete()
      .eq("id", locationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}
