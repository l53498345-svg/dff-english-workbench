export default function onRequest(context) {
  const appKeyExists = Boolean(context.env.BAIDU_APP_KEY);
  const secretKeyExists = Boolean(context.env.BAIDU_SECRET_KEY);

  return new Response(
    JSON.stringify({
      ok: appKeyExists && secretKeyExists,
      baiduAppKeyConfigured: appKeyExists,
      baiduSecretKeyConfigured: secretKeyExists,
      message:
        appKeyExists && secretKeyExists
          ? "Baidu environment variables are configured"
          : "Baidu environment variables are missing"
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8"
      }
    }
  );
}
