import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// List of allowed domains for URL validation (prevent SSRF attacks)
const ALLOWED_DOMAINS = [
  "oncor.com",
  "austineergy.com",
  "nws.noaa.gov",
  "weather.gov",
  // Add more allowed domains as needed
];

// URL validation function
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Reject localhost and private IP ranges
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      return false;
    }

    // Check if domain is in whitelist
    const isAllowed = ALLOWED_DOMAINS.some((domain) =>
      hostname.endsWith(domain)
    );

    return isAllowed;
  } catch {
    return false;
  }
}

serve(async (req) => {
  try {
    const { url } = await req.json();

    // Validate URL
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "URL parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!isValidUrl(url)) {
      return new Response(
        JSON.stringify({ error: "URL is not allowed for security reasons" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Call Firecrawl API with validated URL
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
