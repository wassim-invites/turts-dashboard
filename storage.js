exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // Netlify Blobs REST API — uses env vars Netlify injects automatically
  const siteId = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token  = process.env.NETLIFY_TOKEN   || process.env.TOKEN;
  const store  = "turts-dashboard";
  const base   = `https://api.netlify.com/api/v1/sites/${siteId}/blobs/${store}`;

  const authHeader = { Authorization: `Bearer ${token}` };

  try {
    const params = event.queryStringParameters || {};
    const method = event.httpMethod;

    // GET /storage?key=foo
    if (method === "GET" && params.key) {
      const key = encodeURIComponent(params.key);
      const r = await fetch(`${base}/${key}`, { headers: authHeader });
      if (r.status === 404) return { statusCode: 404, headers, body: JSON.stringify({ error: "not found" }) };
      if (!r.ok) throw new Error(`blob get ${r.status}`);
      const value = await r.text();
      return { statusCode: 200, headers, body: JSON.stringify({ key: params.key, value }) };
    }

    // POST /storage  body: { key, value }
    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");
      if (!body.key || body.value === undefined) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "key and value required" }) };
      }
      const key = encodeURIComponent(body.key);
      const r = await fetch(`${base}/${key}`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "text/plain" },
        body: String(body.value),
      });
      if (!r.ok) throw new Error(`blob put ${r.status}`);
      return { statusCode: 200, headers, body: JSON.stringify({ key: body.key, value: body.value }) };
    }

    // DELETE /storage?key=foo
    if (method === "DELETE" && params.key) {
      const key = encodeURIComponent(params.key);
      const r = await fetch(`${base}/${key}`, { method: "DELETE", headers: authHeader });
      if (!r.ok) throw new Error(`blob delete ${r.status}`);
      return { statusCode: 200, headers, body: JSON.stringify({ deleted: params.key }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "method not allowed" }) };

  } catch (err) {
    console.error("Storage error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
