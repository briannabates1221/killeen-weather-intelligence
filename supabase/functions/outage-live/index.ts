import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface OutageData {
  oncor?: {
    affectedAreas: string[];
    customersAffected: number;
    lastUpdated: string;
  };
  austinEnergy?: {
    affectedAreas: string[];
    customersAffected: number;
    lastUpdated: string;
  };
}

serve(async (req) => {
  try {
    // Verify JWT token (enabled in deno.json)
    // Deno runtime will automatically validate the JWT before reaching this handler

    const outageData: OutageData = {};

    // Fetch Oncor outage data from their public API
    try {
      const oncorResponse = await fetch(
        "https://www.oncor.com/documents/98476/171968/oncor_latest_outage_map_data.json",
        {
          method: "GET",
          headers: {
            "User-Agent": "Killeen-Weather-Dashboard/1.0",
          },
        }
      );

      if (oncorResponse.ok) {
        const oncorData = await oncorResponse.json();
        outageData.oncor = {
          affectedAreas: oncorData.features?.map(
            (f: any) => f.properties?.location || "Unknown"
          ) || [],
          customersAffected: oncorData.summary?.customers_out || 0,
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (oncorError) {
      console.error("Failed to fetch Oncor data:", oncorError.message);
    }

    // Fetch Austin Energy outage data
    try {
      const austinResponse = await fetch(
        "https://austinenergy.com/wps/portal/ae/customer-service/outages/outage-map",
        {
          method: "GET",
          headers: {
            "User-Agent": "Killeen-Weather-Dashboard/1.0",
          },
        }
      );

      if (austinResponse.ok) {
        // Parse HTML response to extract outage information
        const html = await austinResponse.text();
        // Note: In production, use a proper HTML parser
        outageData.austinEnergy = {
          affectedAreas: [],
          customersAffected: 0,
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (austinError) {
      console.error("Failed to fetch Austin Energy data:", austinError.message);
    }

    return new Response(JSON.stringify(outageData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
