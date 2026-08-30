function base64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function signState(secret, payload) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return base64Url(new Uint8Array(signature));
}

export default async function onRequest(context) {
  const appKey = context.env.BAIDU_APP_KEY;
  const stateSecret = context.env.OAUTH_STATE_SECRET;

  if (!appKey || !stateSecret) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: "OAuth environment variables are missing"
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json; charset=utf-8"
        }
      }
    );
  }

  const nonceBytes = new Uint8Array(24);
  crypto.getRandomValues(nonceBytes);

  const payload =
    Date.now().toString() + "." + base64Url(nonceBytes);

  const signature = await signState(
    stateSecret,
    payload
  );

  const state = payload + "." + signature;

  const redirectUri =
    "https://dffenglishworkbench.cn/api/auth/baidu/callback";

  const authUrl = new URL(
    "https://openapi.baidu.com/oauth/2.0/authorize"
  );

  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", appKey);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "basic,netdisk");
  authUrl.searchParams.set("state", state);

  return Response.redirect(authUrl.toString(), 302);
}
