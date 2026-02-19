const GHL_API_KEY = "pit-c30f5d43-c6a6-4003-b61a-301dd8109d10";
const GHL_LOCATION_ID = "UBmPAwAYktetwRC3MC0Z";
const GHL_PIPELINE_ID = "WvKfOYShxBDIMYpAs9un";
const GHL_NEW_LEAD_STAGE = "88d86bfe-25fc-457e-bb94-098867ff4519";
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const CLICKUP_API_TOKEN = "pk_306728756_PAMBIWTJU040ZANKZR4H1ZWCEOS2GUSC";
const CLICKUP_CHAT_VIEW = "7-90182459032-8";

// Map agent IDs to their industry/page for tracking
const AGENT_INDUSTRY_MAP = {
  // Demo Receptionists
  "agent_7701khqc7xfreayvvwh5362g9kek": "Roofer",
  "agent_7401khqc7yxgf3qsqb204fnhdfd3": "Lawyer",
  "agent_3701khqc80baf96v8sewx6pgtw73": "Doctor",
  "agent_2001khqc8205fycve7a9j4f8xe30": "Aesthetician",
  "agent_2301khqc83dmee0vgfw19cp89txd": "Accountant",
  "agent_6901khqc84vkf919xy9tgbp5w2z7": "Dentist",
  "agent_1001khqc869wexxr0r8wmjw6t1ae": "Real Estate",
  "agent_2301khqc87pre5xrfg0kf7y8gvgd": "Plumber",
  "agent_6301khqc899xfmw8cc7vb7fwkpdn": "HVAC",
  "agent_4101khqc8apefvcsaerw3m2pyf9p": "Personal Trainer",
  "agent_2801khqc8cjjfgp8r59pgdqjfp07": "Restaurant",
  "agent_8701khqc8dyxebgv1sgtps4bzvxw": "Wedding Photographer",
  "agent_0901khqc8fdfev49n6myfgapnvn0": "Auto Repair",
  "agent_4101khqc8gx6fx08548rf3znj9y3": "Chiropractor",
  "agent_3301khqc8jbje09rpty38fp6gtbc": "Financial Advisor",
  // Sales Closers
  "agent_8401khqehw77f41ae3c4e9wa1nz3": "Roofer",
  "agent_1501khqehxpmfqct5d7ecjn3tjg4": "Lawyer",
  "agent_2901khqehz5kfj1r32nf41nbhj4p": "Doctor",
  "agent_9401khqej0n9fhnsk7xz8qf864hm": "Aesthetician",
  "agent_4001khqej243fp9sq6b7514e17rr": "Accountant",
  "agent_8101khqej3g7ehqt6hvbvqce6gw9": "Dentist",
  "agent_5501khqej4x9ekptwftq16zfdn86": "Real Estate",
  "agent_9101khqejac9f8w91peq0hpw9qe2": "Plumber",
  "agent_8201khqejbzjejqbqvjhqpqfjwd3": "HVAC",
  "agent_9601khqejdbtfy8swgnq57n31fc6": "Personal Trainer",
  "agent_5201khqejepqfwgbp5crtt5jqygn": "Restaurant",
  "agent_2301khqejg55f80affm5w0ytxp9f": "Wedding Photographer",
  "agent_2701khqejhv3eqwra4f6vrpjg2de": "Auto Repair",
  "agent_8201khqejkwxf5y99crxej6xg7q9": "Chiropractor",
  "agent_9501khqejnbafbbrfm72d50tmr77": "Financial Advisor",
  // AM Sales Agent
  "agent_0901khqt9q1jfazs86en39aeb0nr": "Advanced Marketing",
};

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

    // Create/upsert contact in GHL
    const contact = await createGHLContact(conversationData);
    console.log("GHL contact result:", JSON.stringify(contact, null, 2));

    const contactId = contact?.contact?.id;

    if (contactId) {
      // Create opportunity in pipeline with industry info
      try {
        const opportunity = await createGHLOpportunity(contactId, conversationData);
        console.log("GHL opportunity created:", JSON.stringify(opportunity, null, 2));
      } catch (oppErr) {
        console.error("Opportunity creation error (continuing):", oppErr.message);
      }

      // Update contact notes with transcript, recording link, and all collected data
      const fullNotes = buildContactNotes(conversationData);
      if (fullNotes) {
        await updateContactNotes(contactId, fullNotes);
        console.log("Contact notes updated with call data");
      }
    }

    // Notify ClickUp about the call
    try {
      const industry = conversationData.industry || "Unknown";
      const clickupMsg = `📞 Voice Call Completed\n• Caller: ${conversationData.firstName || "Unknown"} ${conversationData.lastName || ""}\n• Industry: ${industry}\n• Agent: ${conversationData.agentName || "Unknown"}\n• Duration: ${conversationData.callDuration || "Unknown"}\n• Email: ${conversationData.email || "N/A"}\n• Phone: ${conversationData.phone || "N/A"}\n• Recording: ${conversationData.recordingUrl || "N/A"}`;
      await notifyClickUp(clickupMsg);
    } catch (clickupErr) {
      console.error("ClickUp notification failed (non-blocking):", clickupErr.message);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Contact processed successfully",
        contactId,
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
    transcript: "",
    summary: "",
    conversationId: "",
    agentId: "",
    agentName: "",
    recordingUrl: "",
    callDuration: "",
    industry: "",
    source: "ElevenLabs Voice Agent",
  };

  // Conversation ID and agent info (top-level fields)
  if (payload.conversation_id) data.conversationId = payload.conversation_id;
  if (payload.agent_id) {
    data.agentId = payload.agent_id;
    data.industry = AGENT_INDUSTRY_MAP[payload.agent_id] || "";
  }
  if (payload.agent_name) data.agentName = payload.agent_name;
  if (payload.recording_url) data.recordingUrl = payload.recording_url;
  if (payload.call_duration_secs) data.callDuration = `${Math.round(payload.call_duration_secs / 60)} min ${payload.call_duration_secs % 60} sec`;

  // Build recording URL from conversation_id if not provided directly
  if (data.conversationId && !data.recordingUrl) {
    data.recordingUrl = `https://elevenlabs.io/app/conversational-ai/conversations/${data.conversationId}`;
  }

  // Handle ElevenLabs conversation data format
  if (payload.data) {
    if (payload.data.name) data.name = payload.data.name;
    if (payload.data.first_name) data.firstName = payload.data.first_name;
    if (payload.data.last_name) data.lastName = payload.data.last_name;
    if (payload.data.email) data.email = payload.data.email;
    if (payload.data.phone) data.phone = payload.data.phone;
    if (payload.data.business_type) data.businessType = payload.data.business_type;
    if (payload.data.goals) data.goals = payload.data.goals;
    if (payload.data.business_name) data.businessType = data.businessType || payload.data.business_name;
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
      data.summary = payload.analysis.transcript_summary;
    }
  }

  // Handle transcript
  if (payload.transcript) {
    data.transcript = Array.isArray(payload.transcript)
      ? payload.transcript.map((t) => `${t.role}: ${t.message}`).join("\n")
      : payload.transcript;

    // Try to extract info from transcript text if not already found
    if (!data.name) data.name = extractFromText(data.transcript, /(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (!data.email) data.email = extractFromText(data.transcript, /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (!data.phone) data.phone = extractFromText(data.transcript, /(\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
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

function buildContactNotes(data) {
  const lines = [];
  const timestamp = new Date().toISOString();

  lines.push(`--- Voice Call ${timestamp} ---`);

  if (data.agentName) lines.push(`Agent: ${data.agentName}`);
  if (data.industry) lines.push(`Industry/Page: ${data.industry}`);
  if (data.callDuration) lines.push(`Duration: ${data.callDuration}`);
  if (data.recordingUrl) lines.push(`Recording: ${data.recordingUrl}`);
  if (data.conversationId) lines.push(`Conversation ID: ${data.conversationId}`);

  lines.push("");

  if (data.businessType) lines.push(`Business Type: ${data.businessType}`);
  if (data.goals) lines.push(`Goals: ${data.goals}`);

  if (data.summary) {
    lines.push("");
    lines.push(`Summary: ${data.summary}`);
  }

  if (data.transcript) {
    lines.push("");
    lines.push("Transcript:");
    lines.push(data.transcript);
  }

  return lines.join("\n");
}

async function createGHLContact(data) {
  const contactPayload = {
    locationId: GHL_LOCATION_ID,
    firstName: data.firstName || data.name || "Voice Lead",
    lastName: data.lastName || "",
    email: data.email || undefined,
    phone: data.phone || undefined,
    source: data.industry ? `ElevenLabs Voice Agent - ${data.industry}` : "ElevenLabs Voice Agent",
    tags: ["voice-agent-lead", "website-visitor"],
  };

  if (data.industry) {
    contactPayload.tags.push(data.industry.toLowerCase().replace(/\s+/g, "-"));
  }
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
  const industryLabel = data.industry || data.businessType || "Voice Lead";
  const oppName = `${data.firstName || "Voice"} ${data.lastName || "Lead"} - ${industryLabel}`.trim();

  const opportunityPayload = {
    pipelineId: GHL_PIPELINE_ID,
    locationId: GHL_LOCATION_ID,
    name: oppName,
    pipelineStageId: GHL_NEW_LEAD_STAGE,
    contactId: contactId,
    status: "open",
    source: data.recordingUrl
      ? `ElevenLabs Voice Agent | Recording: ${data.recordingUrl}`
      : "ElevenLabs Voice Agent",
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
    console.error("Opportunity creation failed:", response.status, errorText);
    // Try upsert as fallback
    const upsertRes = await fetch(`${GHL_API_BASE}/opportunities/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({
        ...opportunityPayload,
        pipelineStageId: GHL_NEW_LEAD_STAGE,
      }),
    });
    if (!upsertRes.ok) {
      const upsertErr = await upsertRes.text();
      throw new Error(`GHL opportunity upsert failed: ${upsertRes.status} ${upsertErr}`);
    }
    return upsertRes.json();
  }

  return response.json();
}

async function updateContactNotes(contactId, newNotes) {
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
      const errorText = await res.text();
      console.error("Contact note creation failed:", res.status, errorText);
    }
  } catch (error) {
    console.error("Error adding contact note:", error);
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
  }
}
