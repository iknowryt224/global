/**
 * Email notification service for Global Access Shipping
 * Calls the backend email API to send notifications
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Send welcome email to new user after registration
 */
export const sendWelcomeEmail = async (email, name, role = 'customer') => {
  try {
    const response = await fetch(`${API_URL}/api/email/welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_email: email,
        to_name: name,
        role: role
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Send shipment created notification to recipient
 */
export const sendShipmentCreatedEmail = async (shipment) => {
  try {
    const response = await fetch(`${API_URL}/api/email/shipment-created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_email: shipment.recipient_email,
        to_name: shipment.recipient_name,
        tracking_number: shipment.tracking_number,
        status: 'pending',
        sender_name: shipment.sender_name
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to send shipment created email:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Send shipment status update notification to recipient
 */
export const sendShipmentUpdateEmail = async (shipment, status, location = null, notes = null) => {
  try {
    const response = await fetch(`${API_URL}/api/email/shipment-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_email: shipment.recipient_email,
        to_name: shipment.recipient_name,
        tracking_number: shipment.tracking_number,
        status: status,
        location: location,
        notes: notes,
        sender_name: shipment.sender_name
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to send shipment update email:', error);
    return { success: false, message: error.message };
  }
};
