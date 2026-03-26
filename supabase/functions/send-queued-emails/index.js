import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Resend configuration
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@globalaccess.com";
const RESEND_FROM_NAME = Deno.env.get("RESEND_FROM_NAME") || "Global Access Shipping";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

if (!RESEND_API_KEY) {
  console.warn("RESEND_API_KEY not configured - emails will not be sent");
}

// Status colors and labels (from backend)
const STATUS_COLORS = {
  pending: "#FBBF24",
  picked_up: "#60A5FA",
  in_transit: "#3B82F6",
  out_for_delivery: "#8B5CF6",
  delivered: "#10B981",
  failed_delivery: "#EF4444",
};

const STATUS_LABELS = {
  pending: "Pending",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  failed_delivery: "Failed Delivery",
};

const STATUS_MESSAGES = {
  pending: "Your shipment is pending pickup and will be collected soon.",
  picked_up: "Your package has been picked up and is on its way!",
  in_transit: "Your package is in transit.",
  out_for_delivery:
    "Great news! Your package is out for delivery today!",
  delivered: "Your package has been delivered successfully!",
  failed_delivery: "We were unable to deliver your package.",
};

// Email template generators
function generateWelcomeEmail(data) {
  const roleMessages = {
    customer:
      "You can now create shipments, track packages, and manage your deliveries all in one place.",
    driver:
      "You can now view your assigned deliveries, update shipment statuses, and manage your routes.",
    admin:
      "You have full access to manage users, shipments, and monitor all operations.",
  };

  const roleMessage = roleMessages[data.role] || roleMessages.customer;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Global Access</title>
        <style>
            body { font-family: 'segoe-ui', 'helvetica', sans-serif; margin: 0; padding: 20px; background-color: #F8F9FA; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0A2463 0%, #0D4A8F 100%); color: white; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 30px; }
            .content p { color: #333; line-height: 1.6; }
            .button { display: inline-block; background-color: #0A2463; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
            .footer { background-color: #F8F9FA; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #DDD; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Global Access Shipping</h1>
            </div>
            <div class="content">
                <p>Hi <strong>${data.name}</strong>,</p>
                <p>Your account has been successfully created! ${roleMessage}</p>
                <p>You can now log in to your account and start managing your shipments.</p>
                <a href="${Deno.env.get("FRONTEND_URL") || "https://globalaccess.com"}/dashboard" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
                <p>&copy; 2026 Global Access Shipping. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateShipmentCreatedEmail(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shipment Created</title>
        <style>
            body { font-family: 'segoe-ui', 'helvetica', sans-serif; margin: 0; padding: 20px; background-color: #F8F9FA; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0A2463 0%, #0D4A8F 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .tracking-box { background-color: #F0F5FF; border-left: 4px solid #0A2463; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .tracking-number { font-size: 24px; font-weight: bold; color: #0A2463; font-family: monospace; }
            .label { color: #999; font-size: 12px; text-transform: uppercase; }
            .footer { background-color: #F8F9FA; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #DDD; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Shipment Created</h1>
            </div>
            <div class="content">
                <p>Hi <strong>${data.recipient_name}</strong>,</p>
                <p>Your shipment has been created successfully!</p>
                <div class="tracking-box">
                    <div class="label">Tracking Number</div>
                    <div class="tracking-number">${data.tracking_number}</div>
                </div>
                <p><strong>From:</strong> ${data.sender_name}</p>
                <p><strong>Status:</strong> Pending</p>
                <p>You can track your shipment status at any time using your tracking number.</p>
            </div>
            <div class="footer">
                <p>&copy; 2026 Global Access Shipping. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateShipmentUpdateEmail(data) {
  const statusLabel = STATUS_LABELS[data.status] || data.status;
  const statusColor = STATUS_COLORS[data.status] || "#999";
  const statusMessage = STATUS_MESSAGES[data.status] || "Your shipment status has been updated.";

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shipment Update</title>
        <style>
            body { font-family: 'segoe-ui', 'helvetica', sans-serif; margin: 0; padding: 20px; background-color: #F8F9FA; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0A2463 0%, #0D4A8F 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .status-badge { display: inline-block; background-color: ${statusColor}; color: white; padding: 10px 20px; border-radius: 20px; font-weight: 600; margin: 20px 0; }
            .tracking-box { background-color: #F0F5FF; border-left: 4px solid #0A2463; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .tracking-number { font-size: 20px; font-weight: bold; color: #0A2463; font-family: monospace; }
            .label { color: #999; font-size: 12px; text-transform: uppercase; }
            .footer { background-color: #F8F9FA; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #DDD; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Shipment Status Update</h1>
            </div>
            <div class="content">
                <p>Hi <strong>${data.recipient_name}</strong>,</p>
                <p>${statusMessage}</p>
                <div class="status-badge">${statusLabel}</div>
                <div class="tracking-box">
                    <div class="label">Tracking Number</div>
                    <div class="tracking-number">${data.tracking_number}</div>
                </div>
                <p>You can view detailed tracking information at any time using your tracking number.</p>
            </div>
            <div class="footer">
                <p>&copy; 2026 Global Access Shipping. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

async function sendEmailViaResend(
  toEmail,
  subject,
  htmlContent
) {
  try {
    if (!RESEND_API_KEY) {
      return {
        success: false,
        error: "RESEND_API_KEY not configured",
      };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
        to: toEmail,
        subject: subject,
        html: htmlContent,
        reply_to: "support@globalaccess.com",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMsg = errorData?.message || `API error: ${response.status}`;
      return {
        success: false,
        error: errorMsg,
      };
    }

    const responseData = await response.json();
    return { 
      success: true,
      messageId: responseData.id 
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Resend API error:", errorMsg);
    return {
      success: false,
      error: `Exception: ${errorMsg}`,
    };
  }
}

serve(async (req) => {
  try {
    // Validate environment
    if (!RESEND_API_KEY) {
      console.warn("Warning: RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending emails from queue (max 10 per invocation)
    const { data: pendingEmails, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lt("retry_count", 3)
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch pending emails",
          details: error.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No pending emails to process",
          processed: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const results = [];

    for (const email of pendingEmails) {
      try {
        let subject = "";
        let htmlContent = "";

        // Generate email content based on type
        switch (email.email_type) {
          case "welcome":
            subject = "Welcome to Global Access Shipping!";
            htmlContent = generateWelcomeEmail(email.template_data);
            break;
          case "shipment_created":
            subject = `New Shipment Created - ${email.template_data.tracking_number}`;
            htmlContent = generateShipmentCreatedEmail(email.template_data);
            break;
          case "shipment_update":
            const statusLabel =
              STATUS_LABELS[email.template_data.status] ||
              email.template_data.status;
            subject = `Shipment Update: ${statusLabel} - ${email.template_data.tracking_number}`;
            htmlContent = generateShipmentUpdateEmail(email.template_data);
            break;
          default:
            console.warn(`Unknown email type: ${email.email_type}`);
            const { error: unknownError } = await supabase
              .from("email_queue")
              .update({
                status: "failed",
                error_message: "Unknown email type",
              })
              .eq("id", email.id);

            if (unknownError) {
              console.error("Error updating email status:", unknownError);
            }

            results.push({
              id: email.id,
              email: email.recipient_email,
              type: email.email_type,
              success: false,
              error: "Unknown email type",
            });
            continue;
        }

        // Send email via Resend
        const sendResult = await sendEmailViaResend(
          email.recipient_email,
          subject,
          htmlContent
        );

        if (sendResult.success) {
          // Mark as sent
          const { error: updateError } = await supabase
            .from("email_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", email.id);

          if (updateError) {
            console.error(
              `Error marking email ${email.id} as sent:`,
              updateError
            );
            results.push({
              id: email.id,
              email: email.recipient_email,
              type: email.email_type,
              success: false,
              error: "Failed to update status",
            });
          } else {
            sentCount++;
            results.push({
              id: email.id,
              email: email.recipient_email,
              type: email.email_type,
              success: true,
            });
          }
        } else {
          // Mark as retrying and increment retry count
          const newRetryCount = (email.retry_count || 0) + 1;
          const { error: updateError } = await supabase
            .from("email_queue")
            .update({
              status: newRetryCount >= 3 ? "failed" : "retrying",
              error_message: sendResult.error || "Email sending failed",
              retry_count: newRetryCount,
            })
            .eq("id", email.id);

          if (updateError) {
            console.error(
              `Error updating email ${email.id} status:`,
              updateError
            );
          }

          results.push({
            id: email.id,
            email: email.recipient_email,
            type: email.email_type,
            success: false,
            error: sendResult.error || "Email sending failed",
            retryCount: newRetryCount,
          });
        }
      } catch (emailError) {
        console.error(`Error processing email ${email.id}:`, emailError);

        // Mark as failed
        const errorMsg =
          emailError instanceof Error ? emailError.message : String(emailError);
        const newRetryCount = (email.retry_count || 0) + 1;
        const { error: updateError } = await supabase
          .from("email_queue")
          .update({
            status: newRetryCount >= 3 ? "failed" : "retrying",
            error_message: errorMsg,
            retry_count: newRetryCount,
          })
          .eq("id", email.id);

        if (updateError) {
          console.error("Error updating email status:", updateError);
        }

        results.push({
          id: email.id,
          email: email.recipient_email,
          type: email.email_type,
          success: false,
          error: errorMsg,
          retryCount: newRetryCount,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${pendingEmails.length} emails, sent: ${sentCount}`,
        processed: pendingEmails.length,
        sent: sentCount,
        failed: pendingEmails.length - sentCount,
        results: results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    console.error("Fatal error:", errorMsg);
    return new Response(
      JSON.stringify({
        error: "Failed to process emails",
        details: errorMsg,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
