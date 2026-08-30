export default async function onRequest(context) {
  const requestUrl = new URL(context.request.url);

  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription =
    requestUrl.searchParams.get("error_description");

  if (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        stage: "baidu_authorization",
        error,
        errorDescription: errorDescription || ""
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json; charset=utf-8"
        }
      }
    );
  }

  if (!code) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: "Missing Baidu authorization code"
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json; charset=utf-8"
        }
      }
    );
  }

  const appKey = context.env.BAIDU_APP_KEY;
  const secretKey = context.env.BAIDU_SECRET_KEY;

  if (!appKey || !secretKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: "Baidu server environment variables are missing"
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json; charset=utf-8"
        }
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      stage: "callback_ready",
      message:
        "Baidu OAuth callback received successfully. Token exchange is intentionally not enabled yet."
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
}
