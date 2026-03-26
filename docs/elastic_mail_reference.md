# Elastic Mail Integration Reference
# Preserved from old FastAPI backend for future implementation

## Environment Variables Needed
```
ELASTIC_EMAIL_API_KEY=your_api_key
ELASTIC_EMAIL_FROM_EMAIL=noreply@globalaccess.com
ELASTIC_EMAIL_FROM_NAME=Global Access Shipping
```

## API Endpoint
URL: https://api.elasticemail.com/v4/emails/transactional
Method: POST
Headers:
  - X-ElasticEmail-ApiKey: {API_KEY}
  - Content-Type: application/json

## Request Body Structure
```json
{
  "Recipients": {
    "To": ["recipient@email.com"]
  },
  "Content": {
    "From": "Global Access Shipping <noreply@globalaccess.com>",
    "Subject": "Shipment Update - GA-XXXXXX",
    "Body": [
      {
        "ContentType": "HTML",
        "Content": "<html>...</html>",
        "Charset": "utf-8"
      }
    ]
  }
}
```

## Email Template (HTML)
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'IBM Plex Sans', Arial, sans-serif; margin: 0; padding: 20px; background-color: #F8F9FA; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background-color: #0A2463; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-family: 'Manrope', sans-serif; font-weight: 800; }
        .content { padding: 30px; }
        .status-badge { display: inline-block; background-color: {STATUS_COLOR}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
        .tracking-number { font-family: 'JetBrains Mono', monospace; font-size: 18px; letter-spacing: 2px; color: #0A2463; }
        .details { background-color: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { background-color: #0A2463; color: white; padding: 20px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>GLOBAL ACCESS</h1>
            <p>Shipping Updates</p>
        </div>
        <div class="content">
            <p>Hello {RECIPIENT_NAME},</p>
            <p>Your shipment status has been updated:</p>
            <p><span class="status-badge">{STATUS_TEXT}</span></p>
            <div class="details">
                <p><strong>Tracking Number:</strong></p>
                <p class="tracking-number">{TRACKING_NUMBER}</p>
                <p>{DETAILS_MESSAGE}</p>
            </div>
            <p>Track your shipment anytime at our website.</p>
        </div>
        <div class="footer">
            <p>Global Access Shipping - Delivering Worldwide</p>
        </div>
    </div>
</body>
</html>
```

## Status Colors
```javascript
const statusColors = {
  pending: "#FBBF24",
  picked_up: "#60A5FA", 
  in_transit: "#3B82F6",
  out_for_delivery: "#8B5CF6",
  delivered: "#10B981",
  failed_delivery: "#EF4444"
}
```

## Status Messages
```javascript
const statusMessages = {
  pending: "Your shipment is pending pickup.",
  picked_up: "Your package has been picked up and is on its way!",
  in_transit: "Your package is in transit at {LOCATION}.",
  out_for_delivery: "Your package is out for delivery today!",
  delivered: "Your package has been delivered successfully!",
  failed_delivery: "Delivery attempt failed. Reason: {NOTES}"
}
```

## Implementation Notes
- Email is sent on:
  1. Shipment creation (to recipient)
  2. Status update (to recipient)
- Consider using Supabase Edge Functions for serverless email sending
- Alternative: Create a simple FastAPI endpoint just for email sending
