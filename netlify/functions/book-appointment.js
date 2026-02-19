const GHL_API_KEY = "pit-c30f5d43-c6a6-4003-b61a-301dd8109d10";
const GHL_LOCATION_ID = "UBmPAwAYktetwRC3MC0Z";
const GHL_PIPELINE_ID = "WvKfOYShxBDIMYpAs9un";
const GHL_NEW_LEAD_STAGE = "88d86bfe-25fc-457e-bb94-098867ff4519";
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const CALENDAR_ID = "p6LcssokpBTsKfh07bzu";
const TEAM_MEMBER_ID = "ZHEyBHu6sgN8ruE5v7KU";
const TIMEZONE = "Asia/Bangkok";
const CLICKUP_API_TOKEN = "pk_306728756_PAMBIWTJU040ZANKZR4H1ZWCEOS2GUSC";
const CLICKUP_CHAT_VIEW = "7-90182459032-8";

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
    return { statusCode: 405, headers, body: "Method not allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const { name, email, phone, business_type, goals, selected_time, industry } = body;

    console.log("book-appointment received:", JSON.stringify(body, null, 2));

    if (!name && !email && !phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "At least name, email, or phone is required" }),
      };
    }

    // Parse name into first/last
    const nameParts = (name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "Voice Lead";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Determine industry label from explicit industry param, business_type, or default
    const industryLabel = industry || business_type || "General";

    // Build contact notes with all collected data
    const noteLines = [];
    noteLines.push(`--- Strategy Call Booking ---`);
    noteLines.push(`Date: ${new Date().toISOString()}`);
    noteLines.push(`Industry/Page: ${industryLabel}`);
    if (business_type) noteLines.push(`Business Type: ${business_type}`);
    if (goals) noteLines.push(`Goals: ${goals}`);
    if (selected_time) noteLines.push(`Booked Time: ${selected_time}`);
    noteLines.push(`Source: Voice Agent Calendar Booking`);
    const contactNotes = noteLines.join("\n");

    // Step 1: Create/upsert contact in GHL
    const contactPayload = {
      locationId: GHL_LOCATION_ID,
      firstName,
      lastName,
      source: `ElevenLabs Voice Agent - ${industryLabel}`,
      tags: ["voice-agent-lead", "calendar-booking"],
    };
    if (email) contactPayload.email = email;
    if (phone) contactPayload.phone = phone;
    // Add industry tag
    contactPayload.tags.push(industryLabel.toLowerCase().replace(/\s+/g, "-"));
    if (business_type && business_type !== industry) {
      contactPayload.tags.push(business_type.toLowerCase().replace(/\s+/g, "-"));
    }

    const contactRes = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify(contactPayload),
    });

    if (!contactRes.ok) {
      const errorText = await contactRes.text();
      console.error("Contact creation failed:", contactRes.status, errorText);
      throw new Error(`Contact creation failed: ${contactRes.status}`);
    }

    const contactData = await contactRes.json();
    const contactId = contactData.contact?.id;
    console.log("Contact created/found:", contactId);

    // If contact already existed (upsert), update notes separately
    if (contactId) {
      await appendContactNotes(contactId, contactNotes);
    }

    // Step 2: Try to book appointment (if selected_time provided)
    let apptData = null;
    let appointmentBooked = false;

    if (selected_time) {
      const startTime = new Date(selected_time);
      if (!isNaN(startTime.getTime())) {
        const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

        const appointmentPayload = {
          calendarId: CALENDAR_ID,
          locationId: GHL_LOCATION_ID,
          contactId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: `Strategy Call - ${firstName} ${lastName} - ${industryLabel}`.trim(),
          appointmentStatus: "confirmed",
          assignedUserId: TEAM_MEMBER_ID,
          address: "Zoom (link will be sent via email)",
          notes: contactNotes,
        };

        console.log("Creating appointment:", JSON.stringify(appointmentPayload, null, 2));

        try {
          const apptRes = await fetch(`${GHL_API_BASE}/calendars/events/appointments`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GHL_API_KEY}`,
              "Content-Type": "application/json",
              Version: "2021-04-15",
            },
            body: JSON.stringify(appointmentPayload),
          });

          if (apptRes.ok) {
            apptData = await apptRes.json();
            appointmentBooked = true;
            console.log("Appointment created:", JSON.stringify(apptData, null, 2));
          } else {
            const errorText = await apptRes.text();
            console.error("Appointment creation failed (continuing with lead capture):", apptRes.status, errorText);
          }
        } catch (apptErr) {
          console.error("Appointment booking error (continuing with lead capture):", apptErr.message);
        }
      } else {
        console.error("Invalid selected_time format, skipping appointment but capturing lead");
      }
    } else {
      console.log("No selected_time provided, capturing lead data only");
    }

    // Step 3: Create opportunity in pipeline (always, even if booking failed)
    const oppStatus = appointmentBooked ? "Strategy Call Booked" : "Lead Captured";
    const oppName = `${firstName} ${lastName} - ${industryLabel} - ${oppStatus}`.trim();

    const oppPayload = {
      pipelineId: GHL_PIPELINE_ID,
      locationId: GHL_LOCATION_ID,
      name: oppName,
      pipelineStageId: GHL_NEW_LEAD_STAGE,
      contactId,
      status: "open",
      source: `ElevenLabs Voice Agent - ${industryLabel} - Calendar Booking`,
    };

    console.log("Creating opportunity:", JSON.stringify(oppPayload, null, 2));

    const oppRes = await fetch(`${GHL_API_BASE}/opportunities/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify(oppPayload),
    });

    let oppId = null;
    if (!oppRes.ok) {
      const errorText = await oppRes.text();
      console.error("Opportunity creation failed:", oppRes.status, errorText);
      // Try with upsert approach
      const oppRes2 = await fetch(`${GHL_API_BASE}/opportunities/upsert`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({
          ...oppPayload,
          pipelineStageId: GHL_NEW_LEAD_STAGE,
        }),
      });
      if (oppRes2.ok) {
        const oppData2 = await oppRes2.json();
        oppId = oppData2.opportunity?.id || oppData2.id;
        console.log("Opportunity upserted:", oppId);
      } else {
        console.error("Opportunity upsert also failed:", oppRes2.status, await oppRes2.text());
      }
    } else {
      const oppData = await oppRes.json();
      oppId = oppData.opportunity?.id || oppData.id;
      console.log("Opportunity created:", oppId);
    }

    // Notify ClickUp chat about the booking/lead
    try {
      const clickupMsg = appointmentBooked
        ? `📞 New Booking!\n• Name: ${firstName} ${lastName}\n• Email: ${email || "N/A"}\n• Phone: ${phone || "N/A"}\n• Industry: ${industryLabel}\n• Business: ${business_type || "N/A"}\n• Goals: ${goals || "N/A"}\n• Time: ${selected_time}\n• Status: Appointment Booked ✅`
        : `📋 New Lead Captured!\n• Name: ${firstName} ${lastName}\n• Email: ${email || "N/A"}\n• Phone: ${phone || "N/A"}\n• Industry: ${industryLabel}\n• Business: ${business_type || "N/A"}\n• Goals: ${goals || "N/A"}\n• Status: Lead Only (no appointment booked)`;
      await notifyClickUp(clickupMsg);
    } catch (clickupErr) {
      console.error("ClickUp notification failed (non-blocking):", clickupErr.message);
    }

    // Format response
    if (appointmentBooked && selected_time) {
      const startTime = new Date(selected_time);
      const formattedTime = startTime.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: TIMEZONE,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Appointment booked for ${formattedTime}. A confirmation email will be sent to ${email || "the provided contact"}.`,
          contactId,
          appointmentId: apptData?.id,
          opportunityId: oppId,
          time: formattedTime,
          industry: industryLabel,
        }),
      };
    }

    // Fallback: lead captured but appointment not booked
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Your information has been captured. Our team will reach out to schedule a strategy call with you shortly.`,
        contactId,
        appointmentId: null,
        opportunityId: oppId,
        leadCaptured: true,
        industry: industryLabel,
      }),
    };
  } catch (error) {
    console.error("book-appointment error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

async function appendContactNotes(contactId, newNotes) {
  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({ body: newNotes }),
    });

    if (!res.ok) {
      console.error("Notes creation failed:", res.status, await res.text());
    } else {
      console.log("Contact note added successfully");
    }
  } catch (error) {
    console.error("Error adding note:", error);
  }
}

async function notifyClickUp(message) {
  const res = await fetch(`https://api.clickup.com/api/v2/view/${CLICKUP_CHAT_VIEW}/comment`, {
    method: "POST",
    headers: {
      Authorization: CLICKUP_API_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment_text: message }),
  });
  if (!res.ok) {
    console.error("ClickUp notify failed:", res.status);
  } else {
    console.log("ClickUp notified successfully");
  }
}
