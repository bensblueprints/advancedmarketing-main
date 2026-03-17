const GHL_API_KEY = "pit-c30f5d43-c6a6-4003-b61a-301dd8109d10";
const GHL_LOCATION_ID = "UBmPAwAYktetwRC3MC0Z";
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const RESEND_API_KEY = "re_TqppzRWt_LdZL9X1dzPPB4bpS4riMeNHV";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { email, phone, smsOptIn } = body;

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Email is required" }),
      };
    }

    // Search for existing contact by email
    const searchRes = await fetch(
      `${GHL_API_BASE}/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          Version: "2021-07-28",
        },
      }
    );
    const searchData = await searchRes.json();
    const existing = searchData.contacts && searchData.contacts.find(
      (c) => c.email && c.email.toLowerCase() === email.toLowerCase()
    );

    let contactId;

    if (existing) {
      // Update existing contact with phone if provided
      const updatePayload = {
        tags: [...new Set([...(existing.tags || []), "newsletter"])],
      };
      if (phone && smsOptIn) {
        updatePayload.phone = phone;
      }

      const updateRes = await fetch(`${GHL_API_BASE}/contacts/${existing.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(updatePayload),
      });
      const updateData = await updateRes.json();
      contactId = existing.id;
      console.log("Updated existing contact:", contactId);
    } else {
      // Create new contact
      const contactPayload = {
        locationId: GHL_LOCATION_ID,
        email,
        tags: ["newsletter"],
        source: "Website Newsletter Popup",
      };
      if (phone && smsOptIn) {
        contactPayload.phone = phone;
      }

      const createRes = await fetch(`${GHL_API_BASE}/contacts/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(contactPayload),
      });
      const createData = await createRes.json();
      contactId = createData.contact && createData.contact.id;
      console.log("Created new contact:", contactId);
    }

    // Send welcome email via Resend (only on initial email signup, not SMS step)
    if (!phone) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Advanced Marketing <hello@advancedmarketing.co>",
            to: [email],
            subject: "Welcome to Advanced Marketing",
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#333;">
              <img src="https://advancedmarketing.co/logo.png" alt="Advanced Marketing" style="height:40px;margin-bottom:24px;">
              <h1 style="font-size:24px;color:#111;margin-bottom:16px;">You're in.</h1>
              <p style="font-size:16px;line-height:1.6;margin-bottom:24px;">Thanks for subscribing to Advanced Marketing insights. You'll get actionable marketing strategies, AI automation tips, and growth tactics delivered straight to your inbox.</p>
              <p style="font-size:16px;line-height:1.6;margin-bottom:24px;">No fluff. No spam. Just what works.</p>
              <p style="font-size:14px;color:#666;margin-top:32px;border-top:1px solid #eee;padding-top:16px;">Advanced Marketing Limited<br>
              <a href="https://advancedmarketing.co" style="color:#c9a962;">advancedmarketing.co</a></p>
            </div>`,
          }),
        });
        console.log("Welcome email sent to:", email);
      } catch (emailErr) {
        console.error("Welcome email failed:", emailErr);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, contactId }),
    };
  } catch (err) {
    console.error("newsletter-signup error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
