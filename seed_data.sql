-- Global Access Shipping - Seed Data
-- Run this in Supabase SQL Editor after running supabase_setup.sql
-- This populates test data for development and testing

-- ============================================
-- STEP 1: CREATE TEST USERS IN SUPABASE AUTH
-- ============================================
-- Navigate to Supabase Dashboard > Authentication > Users
-- Create these test users manually:
--   1. Email: admin@globalaccess.com | Password: TestAdmin123
--   2. Email: driver@globalaccess.com | Password: TestDriver123
--   3. Email: customer@globalaccess.com | Password: TestCustomer123
--
-- The profiles will auto-create via the handle_new_user() trigger
-- Once users are created, continue with the rest of this script

-- Get the UUIDs of your newly created users from auth.users:
-- SELECT id, email FROM auth.users;
-- Then replace the UUIDs below with the actual UUIDs from your auth.users table

-- For this example, we'll use placeholder UUIDs - REPLACE THESE after creating users:
-- Admin UUID: [REPLACE_WITH_ADMIN_UUID]
-- Driver UUID: [REPLACE_WITH_DRIVER_UUID]
-- Customer UUID: [REPLACE_WITH_CUSTOMER_UUID]

-- For now, use these placeholder UUIDs (query auth.users to get real ones):
\set admin_uuid '550e8400-e29b-41d4-a716-446655440001'
\set driver_uuid '550e8400-e29b-41d4-a716-446655440002'
\set customer_uuid '550e8400-e29b-41d4-a716-446655440003'

-- ============================================
-- INSERT TEST ADMIN LOCATIONS
-- ============================================
INSERT INTO admin_locations (id, name, address, latitude, longitude, location_type, description, created_by)
VALUES 
    -- Pickup/Hub Locations
    (
        '660e8400-e29b-41d4-a716-446655440001'::uuid,
        'Main Warehouse',
        '123 Industrial Ave, New York, NY 10001',
        40.7128,
        -74.0060,
        'warehouse',
        'Primary distribution center and main warehouse',
        '550e8400-e29b-41d4-a716-446655440001'::uuid
    ),
    (
        '660e8400-e29b-41d4-a716-446655440002'::uuid,
        'Downtown Pickup Hub',
        '456 Fifth Avenue, New York, NY 10016',
        40.7489,
        -73.9680,
        'hub',
        'Downtown hub for quick pickups',
        '550e8400-e29b-41d4-a716-446655440001'::uuid
    ),
    -- Delivery Locations
    (
        '660e8400-e29b-41d4-a716-446655440003'::uuid,
        'Manhattan Delivery Center',
        '789 Park Avenue, New York, NY 10021',
        40.7693,
        -73.9722,
        'delivery',
        'East side delivery center',
        '550e8400-e29b-41d4-a716-446655440001'::uuid
    ),
    (
        '660e8400-e29b-41d4-a716-446655440004'::uuid,
        'Brooklyn Delivery Station',
        '321 Broadway, Brooklyn, NY 11206',
        40.6901,
        -73.9496,
        'delivery',
        'Brooklyn distribution point',
        '550e8400-e29b-41d4-a716-446655440001'::uuid
    ),
    (
        '660e8400-e29b-41d4-a716-446655440005'::uuid,
        'Queens Regional Hub',
        '567 Queens Boulevard, Queens, NY 11375',
        40.7282,
        -73.8648,
        'hub',
        'Queens area logistics hub',
        '550e8400-e29b-41d4-a716-446655440001'::uuid
    );

-- ============================================
-- INSERT TEST SHIPMENTS
-- ============================================
INSERT INTO shipments (
    id, 
    tracking_number, 
    sender_name, 
    sender_email, 
    sender_phone, 
    sender_address,
    sender_location_id,
    sender_latitude,
    sender_longitude,
    recipient_name, 
    recipient_email, 
    recipient_phone, 
    recipient_address,
    recipient_location_id,
    recipient_latitude,
    recipient_longitude,
    package_description, 
    weight, 
    dimensions,
    current_status, 
    created_by, 
    assigned_driver_id,
    estimated_delivery
)
VALUES 
    -- Shipment 1: In Transit
    (
        '770e8400-e29b-41d4-a716-446655440001'::uuid,
        'GA20260325000001',
        'Alice Smith',
        'alice@example.com',
        '+1-555-0101',
        '123 Industrial Ave, New York, NY 10001',
        '660e8400-e29b-41d4-a716-446655440001'::uuid,
        40.7128,
        -74.0060,
        'Bob Johnson',
        'bob@example.com',
        '+1-555-0102',
        '789 Park Avenue, New York, NY 10021',
        '660e8400-e29b-41d4-a716-446655440003'::uuid,
        40.7693,
        -73.9722,
        'Electronics Package - 2x Laptops',
        5.5,
        '30cm x 20cm x 10cm',
        'in_transit',
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        NOW() + INTERVAL '2 days'
    ),
    
    -- Shipment 2: Picked Up
    (
        '770e8400-e29b-41d4-a716-446655440002'::uuid,
        'GA20260325000002',
        'Charlie Brown',
        'charlie@example.com',
        '+1-555-0103',
        '456 Fifth Avenue, New York, NY 10016',
        '660e8400-e29b-41d4-a716-446655440002'::uuid,
        40.7489,
        -73.9680,
        'Diana Prince',
        'diana@example.com',
        '+1-555-0104',
        '321 Broadway, Brooklyn, NY 11206',
        '660e8400-e29b-41d4-a716-446655440004'::uuid,
        40.6901,
        -73.9496,
        'Office Supplies - Bulk Order',
        12.0,
        '60cm x 40cm x 40cm',
        'picked_up',
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        NOW() + INTERVAL '3 days'
    ),
    
    -- Shipment 3: Delivered
    (
        '770e8400-e29b-41d4-a716-446655440003'::uuid,
        'GA20260325000003',
        'Eve Wilson',
        'eve@example.com',
        '+1-555-0105',
        '123 Industrial Ave, New York, NY 10001',
        '660e8400-e29b-41d4-a716-446655440001'::uuid,
        40.7128,
        -74.0060,
        'Frank Miller',
        'frank@example.com',
        '+1-555-0106',
        '567 Queens Boulevard, Queens, NY 11375',
        '660e8400-e29b-41d4-a716-446655440005'::uuid,
        40.7282,
        -73.8648,
        'Furniture - 1x Desk + 2x Chairs',
        35.0,
        '180cm x 80cm x 80cm',
        'delivered',
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        NOW() - INTERVAL '1 day'
    ),
    
    -- Shipment 4: Out for Delivery
    (
        '770e8400-e29b-41d4-a716-446655440004'::uuid,
        'GA20260325000004',
        'Grace Lee',
        'grace@example.com',
        '+1-555-0107',
        '456 Fifth Avenue, New York, NY 10016',
        '660e8400-e29b-41d4-a716-446655440002'::uuid,
        40.7489,
        -73.9680,
        'Henry Davis',
        'henry@example.com',
        '+1-555-0108',
        '789 Park Avenue, New York, NY 10021',
        '660e8400-e29b-41d4-a716-446655440003'::uuid,
        40.7693,
        -73.9722,
        'Medical Supplies - Urgent',
        2.5,
        '25cm x 15cm x 10cm',
        'out_for_delivery',
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        NOW() + INTERVAL '4 hours'
    );

-- ============================================
-- INSERT TEST TRACKING EVENTS
-- ============================================
INSERT INTO tracking_events (id, shipment_id, status, location, notes, latitude, longitude, created_by)
VALUES 
    -- Shipment 1 tracking history
    (
        '880e8400-e29b-41d4-a716-446655440001'::uuid,
        '770e8400-e29b-41d4-a716-446655440001'::uuid,
        'pending',
        'Main Warehouse',
        'Package received and scanned',
        40.7128,
        -74.0060,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),
    (
        '880e8400-e29b-41d4-a716-446655440002'::uuid,
        '770e8400-e29b-41d4-a716-446655440001'::uuid,
        'picked_up',
        'Main Warehouse',
        'Package picked up by driver',
        40.7128,
        -74.0060,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),
    (
        '880e8400-e29b-41d4-a716-446655440003'::uuid,
        '770e8400-e29b-41d4-a716-446655440001'::uuid,
        'in_transit',
        'Manhattan - Midtown',
        'In transit to destination',
        40.7505,
        -73.9972,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),
    (
        '880e8400-e29b-41d4-a716-446655440004'::uuid,
        '770e8400-e29b-41d4-a716-446655440001'::uuid,
        'in_transit',
        'Upper East Side - Approaching delivery',
        'Approaching delivery location',
        40.7650,
        -73.9710,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),

    -- Shipment 2 tracking history
    (
        '880e8400-e29b-41d4-a716-446655440005'::uuid,
        '770e8400-e29b-41d4-a716-446655440002'::uuid,
        'pending',
        'Downtown Pickup Hub',
        'Large order received at hub',
        40.7489,
        -73.9680,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),
    (
        '880e8400-e29b-41d4-a716-446655440006'::uuid,
        '770e8400-e29b-41d4-a716-446655440002'::uuid,
        'picked_up',
        'Downtown Pickup Hub',
        'Driver arrived and loaded package',
        40.7489,
        -73.9680,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),

    -- Shipment 3 tracking history
    (
        '880e8400-e29b-41d4-a716-446655440007'::uuid,
        '770e8400-e29b-41d4-a716-446655440003'::uuid,
        'pending',
        'Main Warehouse',
        'Furniture package prepared',
        40.7128,
        -74.0060,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),
    (
        '880e8400-e29b-41d4-a716-446655440008'::uuid,
        '770e8400-e29b-41d4-a716-446655440003'::uuid,
        'picked_up',
        'Main Warehouse',
        'Furniture picked up',
        40.7128,
        -74.0060,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),
    (
        '880e8400-e29b-41d4-a716-446655440009'::uuid,
        '770e8400-e29b-41d4-a716-446655440003'::uuid,
        'in_transit',
        'Heading to Queens',
        'In transit through Manhattan',
        40.7489,
        -73.9680,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),
    (
        '880e8400-e29b-41d4-a716-446655440010'::uuid,
        '770e8400-e29b-41d4-a716-446655440003'::uuid,
        'delivered',
        'Queens Regional Hub',
        'Successfully delivered to customer',
        40.7282,
        -73.8648,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),

    -- Shipment 4 tracking history
    (
        '880e8400-e29b-41d4-a716-446655440011'::uuid,
        '770e8400-e29b-41d4-a716-446655440004'::uuid,
        'pending',
        'Downtown Pickup Hub',
        'Medical urgent package received',
        40.7489,
        -73.9680,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),
    (
        '880e8400-e29b-41d4-a716-446655440012'::uuid,
        '770e8400-e29b-41d4-a716-446655440004'::uuid,
        'picked_up',
        'Downtown Pickup Hub',
        'Priority pickup by driver',
        40.7489,
        -73.9680,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    ),
    (
        '880e8400-e29b-41d4-a716-446655440013'::uuid,
        '770e8400-e29b-41d4-a716-446655440004'::uuid,
        'out_for_delivery',
        'Park Avenue - Out for delivery',
        'Driver on route for final delivery',
        40.7600,
        -73.9750,
        '550e8400-e29b-41d4-a716-446655440002'::uuid
    );
