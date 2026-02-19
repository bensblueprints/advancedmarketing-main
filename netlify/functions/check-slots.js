const GHL_API_KEY = "pit-c30f5d43-c6a6-4003-b61a-301dd8109d10";
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const CALENDAR_ID = "p6LcssokpBTsKfh07bzu";
const TIMEZONE = "Asia/Bangkok"; // +07:00

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: "Method not allowed" };
  }

  try {
    // Query next 7 days of availability
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    const url = `${GHL_API_BASE}/calendars/${CALENDAR_ID}/free-slots?startDate=${startMs}&endDate=${endMs}&timezone=${TIMEZONE}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-04-15",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GHL free-slots error:", response.status, errorText);
      throw new Error(`GHL API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Free slots response:", JSON.stringify(data, null, 2));

    // Format slots into human-readable text for the voice agent
    const formatted = formatSlots(data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        available_slots: formatted,
        raw: data,
      }),
    };
  } catch (error) {
    console.error("check-slots error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function formatSlots(data) {
  // GHL returns { "YYYY-MM-DD": { "slots": ["ISO_STRING", ...] }, ... }
  // Filter out non-date keys like "traceId"
  const dateKeys = Object.keys(data).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();

  if (dateKeys.length === 0) {
    return "No available slots found for the next 7 days.";
  }

  const lines = [];
  for (const day of dateKeys) {
    const dayData = data[day];
    const daySlots = dayData?.slots || (Array.isArray(dayData) ? dayData : []);
    if (!Array.isArray(daySlots) || daySlots.length === 0) continue;

    const date = new Date(day + "T00:00:00");
    const dayName = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });

    // Format times to 12-hour
    const times = daySlots.map((slot) => {
      const timeStr = typeof slot === "string" && slot.includes("T")
        ? slot.split("T")[1].substring(0, 5)
        : slot;
      const [h, m] = timeStr.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
    });

    lines.push(`${dayName}: ${times.join(", ")}`);
  }

  return lines.length > 0
    ? lines.join("\n")
    : "No available slots found for the next 7 days.";
}
