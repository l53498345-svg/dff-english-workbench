function base64UrlToBytes(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function verifyState(secret, payload, signature) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signature),
    encoder.encode(payload)
  );
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export default async function onRequest(context) {
  const requestUrl = new URL(context.request.url);

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const errorDescription =
    requestUrl.searchParams.get("error_description");

  if (error) {
    return jsonResponse(
      {
        ok: false,
        stage: "baidu_authorization",
        error,
        errorDescription: errorDescription || ""
      },
      400
    );
  }

  if (!code || !state) {
    return jsonResponse(
      {
        ok: false,
        message: "Missing authorization code or OAuth state"
      },
      400
    );
  }

  const stateSecret = context.env.OAUTH_STATE_SECRET;

  if (!stateSecret) {
    return jsonResponse(
      {
        ok: false,
        message: "OAuth state secret is missing on server"
      },
      500
    );
  }

  const parts = state.split(".");

  if (parts.length !== 3) {
    return jsonResponse(
      {
        ok: false,
        message: "Invalid OAuth state format"
      },
      400
    );
  }

  const [timestampText, nonce, signature] = parts;
  const payload = timestampText + "." + nonce;

  const timestamp = Number(timestampText);
  const maxAgeMs = 10 * 60 * 1000;
  const age = Date.now() - timestamp;

  if (
    !Number.isFinite(timestamp) ||
    age < 0 ||
    age > maxAgeMs
  ) {
    return jsonResponse(
      {
        ok: false,
        message: "OAuth state has expired or is invalid"
      },
      400
    );
  }

  let stateValid = false;

  try {
    stateValid = await verifyState(
      stateSecret,
      payload,
      signature
    );
  } catch {
    stateValid = false;
  }

  if (!stateValid) {
    return jsonResponse(
      {
        ok: false,
        message: "OAuth state verification failed"
      },
      400
    );
  }

  const appKey = context.env.BAIDU_APP_KEY;
  const secretKey = context.env.BAIDU_SECRET_KEY;

  if (!appKey || !secretKey) {
    return jsonResponse(
      {
        ok: false,
        message: "Baidu server environment variables are missing"
      },
      500
    );
  }

  const redirectUri =
    "https://dffenglishworkbench.cn/api/auth/baidu/callback";

  const tokenUrl = new URL(
    "https://openapi.baidu.com/oauth/2.0/token"
  );

  tokenUrl.searchParams.set(
    "grant_type",
    "authorization_code"
  );
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set("client_id", appKey);
  tokenUrl.searchParams.set("client_secret", secretKey);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);

  let tokenResponse;

  try {
    tokenResponse = await fetch(tokenUrl.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json"
      }
    });
  } catch {
    return jsonResponse(
      {
        ok: false,
        stage: "token_exchange",
        message: "Could not contact Baidu token service"
      },
      502
    );
  }

  let tokenData;

  try {
    tokenData = await tokenResponse.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        stage: "token_exchange",
        message: "Invalid response from Baidu token service"
      },
      502
    );
  }

  if (
    !tokenResponse.ok ||
    !tokenData.access_token ||
    !tokenData.refresh_token
  ) {
    return jsonResponse(
      {
        ok: false,
        stage: "token_exchange",
        error: tokenData.error || "token_exchange_failed",
        errorDescription:
          tokenData.error_description || ""
      },
      400
    );
  }

  // 故意不把 access_token / refresh_token 返回给浏览器。
  // 下一步会把它们安全保存到服务器端存储。

  return jsonResponse({
    ok: true,
    stage: "token_exchange_success",
    accessTokenReceived: true,
    refreshTokenReceived: true,
    expiresIn: tokenData.expires_in || null,
    message:
      "Baidu tokens were received successfully and were not exposed to the browser."
  });
}
