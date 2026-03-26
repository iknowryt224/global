-- Global Access Shipping - Supabase Database Setup
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE tables in correct dependency order
-- ============================================

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer', 'driver')),
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_locations table FIRST (before shipments references it)
CREATE TABLE admin_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'hub' CHECK (location_type IN ('pickup', 'delivery', 'hub', 'warehouse')),
    description TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shipments table (now can reference admin_locations)
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number TEXT UNIQUE NOT NULL,
    -- Sender info
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_phone TEXT NOT NULL,
    sender_address TEXT NOT NULL,
    sender_location_id UUID REFERENCES admin_locations(id),
    sender_latitude DECIMAL(10, 8),
    sender_longitude DECIMAL(11, 8),
    -- Recipient info
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_address TEXT NOT NULL,
    recipient_location_id UUID REFERENCES admin_locations(id),
    recipient_latitude DECIMAL(10, 8),
    recipient_longitude DECIMAL(11, 8),
    -- Package info
    package_description TEXT NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    dimensions TEXT,
    -- Status and delivery
    current_status TEXT NOT NULL DEFAULT 'pending' CHECK (current_status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery')),
    estimated_delivery TIMESTAMPTZ,
    -- Relationships
    created_by UUID NOT NULL REFERENCES profiles(id),
    assigned_driver_id UUID REFERENCES profiles(id),
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tracking_events table (references shipments)
CREATE TABLE tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery')),
    location TEXT NOT NULL,
    notes TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_created_by ON shipments(created_by);
CREATE INDEX idx_shipments_assigned_driver ON shipments(assigned_driver_id);
CREATE INDEX idx_shipments_current_status ON shipments(current_status);
CREATE INDEX idx_shipments_sender_email ON shipments(sender_email);
CREATE INDEX idx_shipments_recipient_email ON shipments(recipient_email);
CREATE INDEX idx_shipments_sender_location ON shipments(sender_location_id);
CREATE INDEX idx_shipments_recipient_location ON shipments(recipient_location_id);
CREATE INDEX idx_tracking_events_shipment ON tracking_events(shipment_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_locations_type ON admin_locations(location_type);

-- Create function to generate tracking number
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'GA' || TO_CHAR(NOW(), 'YYYYMMDD') || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate tracking number
CREATE OR REPLACE FUNCTION set_tracking_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
        NEW.tracking_number := generate_tracking_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_tracking_number
    BEFORE INSERT ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION set_tracking_number();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Create function to handle new user signup (creates profile)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
    v_role TEXT;
BEGIN
    -- Extract name from metadata or use email prefix as fallback
    v_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1),
        'User'
    );
    
    -- Extract role from metadata or default to customer
    v_role := COALESCE(
        NEW.raw_user_meta_data->>'role',
        'customer'
    );
    
    -- Validate role is one of the allowed values
    IF v_role NOT IN ('admin', 'customer', 'driver') THEN
        v_role := 'customer';
    END IF;
    
    BEGIN
        INSERT INTO profiles (id, email, name, role, phone)
        VALUES (
            NEW.id,
            NEW.email,
            v_name,
            v_role,
            COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
        );
        
        RAISE LOG 'Profile created for user %: % (%)', NEW.id, v_name, v_role;
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail - user account is still created
        RAISE LOG 'Error creating profile for user % (email: %): %', NEW.id, NEW.email, SQLERRM;
        RAISE LOG 'Raw user data: %', NEW.raw_user_meta_data;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- IMPORTANT: Disable RLS on non-auth tables to allow triggers to work properly
-- RLS will be re-enabled selectively below for specific policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_locations DISABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
-- Users can view all profiles (needed for driver lists, etc.)
CREATE POLICY "Profiles are viewable by authenticated users"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Admins can update any profile (for role changes)
CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- SHIPMENTS POLICIES
-- Admins can do everything
CREATE POLICY "Admins have full access to shipments"
    ON shipments FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Customers can view shipments they created or are sender/recipient of
CREATE POLICY "Customers can view their shipments"
    ON shipments FOR SELECT
    TO authenticated
    USING (
        created_by = auth.uid()
        OR sender_email = (SELECT email FROM profiles WHERE id = auth.uid())
        OR recipient_email = (SELECT email FROM profiles WHERE id = auth.uid())
    );

-- Customers can create shipments
CREATE POLICY "Customers can create shipments"
    ON shipments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'customer')
        )
    );

-- Drivers can view their assigned shipments
CREATE POLICY "Drivers can view assigned shipments"
    ON shipments FOR SELECT
    TO authenticated
    USING (
        assigned_driver_id = auth.uid()
    );

-- Drivers can update status of assigned shipments
CREATE POLICY "Drivers can update assigned shipments"
    ON shipments FOR UPDATE
    TO authenticated
    USING (
        assigned_driver_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'driver'
        )
    );

-- TRACKING EVENTS POLICIES
-- Anyone authenticated can view tracking events for shipments they can access
CREATE POLICY "Users can view tracking events"
    ON tracking_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM shipments s
            WHERE s.id = tracking_events.shipment_id
            AND (
                s.created_by = auth.uid()
                OR s.assigned_driver_id = auth.uid()
                OR s.sender_email = (SELECT email FROM profiles WHERE id = auth.uid())
                OR s.recipient_email = (SELECT email FROM profiles WHERE id = auth.uid())
                OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );

-- Admins and drivers can create tracking events
CREATE POLICY "Admins and drivers can create tracking events"
    ON tracking_events FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'driver')
        )
    );

-- ADMIN LOCATIONS POLICIES
-- Everyone can view locations (needed for selection in shipment forms)
CREATE POLICY "Everyone can view admin locations"
    ON admin_locations FOR SELECT
    USING (true);

-- Only admins can create locations
CREATE POLICY "Admins can create locations"
    ON admin_locations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update locations
CREATE POLICY "Admins can update locations"
    ON admin_locations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete locations
CREATE POLICY "Admins can delete locations"
    ON admin_locations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- PUBLIC TRACKING (allow anonymous access to track by tracking number)
-- Create a function for public tracking
CREATE OR REPLACE FUNCTION get_public_tracking(p_tracking_number TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'tracking_number', s.tracking_number,
        'current_status', s.current_status,
        'sender_name', s.sender_name,
        'recipient_name', s.recipient_name,
        'recipient_address', s.recipient_address,
        'package_description', s.package_description,
        'estimated_delivery', s.estimated_delivery,
        'created_at', s.created_at,
        'tracking_history', (
            SELECT json_agg(
                json_build_object(
                    'status', te.status,
                    'location', te.location,
                    'notes', te.notes,
                    'created_at', te.created_at
                ) ORDER BY te.created_at ASC
            )
            FROM tracking_events te
            WHERE te.shipment_id = s.id
        )
    ) INTO result
    FROM shipments s
    WHERE s.tracking_number = p_tracking_number;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION get_public_tracking(TEXT) TO anon;

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View for shipments with driver name
CREATE OR REPLACE VIEW shipments_with_driver AS
SELECT 
    s.*,
    p.name as assigned_driver_name
FROM shipments s
LEFT JOIN profiles p ON s.assigned_driver_id = p.id;

-- Grant access to the view
GRANT SELECT ON shipments_with_driver TO authenticated;

-- ============================================
-- EMAIL QUEUE INFRASTRUCTURE (Supabase Edge Functions)
-- ============================================

-- Email queue table to store pending emails
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_type TEXT NOT NULL CHECK (email_type IN ('welcome', 'shipment_created', 'shipment_update')),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
    template_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email queue
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_created_at ON email_queue(created_at);
CREATE INDEX idx_email_queue_email_type ON email_queue(email_type);
CREATE INDEX idx_email_queue_user_id ON email_queue(user_id);

-- Create trigger to auto-update updated_at on email_queue
CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_queue_updated_at
    BEFORE UPDATE ON email_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_email_queue_updated_at();

-- Enable RLS on email_queue
ALTER TABLE email_queue DISABLE ROW LEVEL SECURITY;

-- ============================================
-- EMAIL QUEUE TRIGGERS
-- ============================================

-- Trigger to queue welcome email when new user is created
CREATE OR REPLACE FUNCTION queue_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO email_queue (
        email_type,
        recipient_email,
        recipient_name,
        user_id,
        template_data
    ) VALUES (
        'welcome',
        NEW.email,
        NEW.name,
        NEW.id,
        jsonb_build_object(
            'name', NEW.name,
            'email', NEW.email,
            'role', NEW.role
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_welcome_email
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION queue_welcome_email();

-- Trigger to queue shipment created email
CREATE OR REPLACE FUNCTION queue_shipment_created_email()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO email_queue (
        email_type,
        recipient_email,
        recipient_name,
        shipment_id,
        template_data
    ) VALUES (
        'shipment_created',
        NEW.recipient_email,
        NEW.recipient_name,
        NEW.id,
        jsonb_build_object(
            'tracking_number', NEW.tracking_number,
            'sender_name', NEW.sender_name,
            'status', NEW.current_status,
            'recipient_name', NEW.recipient_name
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shipment_created_email
    AFTER INSERT ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION queue_shipment_created_email();

-- Trigger to queue shipment status update email
CREATE OR REPLACE FUNCTION queue_shipment_update_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_status != OLD.current_status THEN
        INSERT INTO email_queue (
            email_type,
            recipient_email,
            recipient_name,
            shipment_id,
            template_data
        ) VALUES (
            'shipment_update',
            NEW.recipient_email,
            NEW.recipient_name,
            NEW.id,
            jsonb_build_object(
                'tracking_number', NEW.tracking_number,
                'status', NEW.current_status,
                'recipient_name', NEW.recipient_name,
                'sender_name', NEW.sender_name
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shipment_update_email
    AFTER UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION queue_shipment_update_email();
