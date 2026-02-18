const GHL_API_KEY = "pit-c30f5d43-c6a6-4003-b61a-301dd8109d10";
const GHL_LOCATION_ID = "UBmPAwAYktetwRC3MC0Z";
const GHL_PIPELINE_ID = "WvKfOYShxBDIMYpAs9un";
const GHL_NEW_LEAD_STAGE = "88d86bfe-25fc-457e-bb94-098867ff4519";
const GHL_API_BASE = "https://services.leadconnectorhq.com";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const payload = JSON.parse(event.body);
    console.log("ElevenLabs webhook received:", JSON.stringify(payload, null, 2));

    // Extract data from ElevenLabs conversation
    const conversationData = extractConversationData(payload);
    console.log("Extracted data:", JSON.stringify(conversationData, null, 2));

    if (!conversationData.name && !conversationData.email && !conversationData.phone) {
      console.log("No contact info extracted, skipping GHL creation");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No contact info to process" }),
      };
    }

    // Create contact in GHL
    const contact = await createGHLContact(conversationData);
    console.log("GHL contact created:", JSON.stringify(contact, null, 2));

    // Create opportunity in pipeline
    if (contact && contact.contact && contact.contact.id) {
      const opportunity = await createGHLOpportunity(contact.contact.id, conversationData);
      console.log("GHL opportunity created:", JSON.stringify(opportunity, null, 2));
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Contact created successfully",
        contactId: contact?.contact?.id,
      }),
    };
  } catch (error) {
    console.error("Webhook error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function extractConversationData(payload) {
  const data = {
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessType: "",
    goals: "",
    notes: "",
    source: "ElevenLabs Voice Agent",
  };

  // Handle ElevenLabs conversation data format
  // The payload may contain collected data or transcript
  if (payload.data) {
    // Direct data fields from agent data collection
    if (payload.data.name) data.name = payload.data.name;
    if (payload.data.first_name) data.firstName = payload.data.first_name;
    if (payload.data.last_name) data.lastName = payload.data.last_name;
    if (payload.data.email) data.email = payload.data.email;
    if (payload.data.phone) data.phone = payload.data.phone;
    if (payload.data.business_type) data.businessType = payload.data.business_type;
    if (payload.data.goals) data.goals = payload.data.goals;
    if (payload.data.business_name) data.notes += `Business: ${payload.data.business_name}\n`;
  }

  // Handle analysis/collection fields
  if (payload.analysis) {
    if (payload.analysis.data_collection) {
      const dc = payload.analysis.data_collection;
      if (dc.name && !data.name) data.name = dc.name;
      if (dc.email && !data.email) data.email = dc.email;
      if (dc.phone && !data.phone) data.phone = dc.phone;
      if (dc.business_type && !data.businessType) data.businessType = dc.business_type;
      if (dc.goals && !data.goals) data.goals = dc.goals;
    }
    if (payload.analysis.transcript_summary) {
      data.notes += `Summary: ${payload.analysis.transcript_summary}\n`;
    }
  }

  // Handle transcript
  if (payload.transcript) {
    const transcript = Array.isArray(payload.transcript)
      ? payload.transcript.map((t) => `${t.role}: ${t.message}`).join("\n")
      : payload.transcript;
    data.notes += `\nTranscript:\n${transcript}`;

    // Try to extract info from transcript text if not already found
    if (!data.name) data.name = extractFromText(transcript, /(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (!data.email) data.email = extractFromText(transcript, /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (!data.phone) data.phone = extractFromText(transcript, /(\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  }

  // Split name into first/last if we have full name but not split
  if (data.name && !data.firstName) {
    const parts = data.name.trim().split(/\s+/);
    data.firstName = parts[0] || "";
    data.lastName = parts.slice(1).join(" ") || "";
  }

  return data;
}

function extractFromText(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : "";
}

async function createGHLContact(data) {
  const contactPayload = {
    locationId: GHL_LOCATION_ID,
    firstName: data.firstName || data.name || "Voice Lead",
    lastName: data.lastName || "",
    email: data.email || undefined,
    phone: data.phone || undefined,
    source: "ElevenLabs Voice Agent",
    tags: ["voice-agent-lead", "website-visitor"],
  };

  if (data.businessType) {
    contactPayload.tags.push(data.businessType.toLowerCase().replace(/\s+/g, "-"));
  }

  // Remove undefined fields
  Object.keys(contactPayload).forEach((key) => {
    if (contactPayload[key] === undefined) delete contactPayload[key];
  });

  const response = await fetch(`${GHL_API_BASE}/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify(contactPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GHL contact creation failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function createGHLOpportunity(contactId, data) {
  const opportunityPayload = {
    pipelineId: GHL_PIPELINE_ID,
    locationId: GHL_LOCATION_ID,
    name: `${data.firstName || "Voice"} ${data.lastName || "Lead"} - Voice Agent`,
    stageId: GHL_NEW_LEAD_STAGE,
    contactId: contactId,
    status: "open",
    source: "ElevenLabs Voice Agent",
  };

  const response = await fetch(`${GHL_API_BASE}/opportunities/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify(opportunityPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GHL opportunity creation failed: ${response.status} ${errorText}`);
  }

  return response.json();
}
