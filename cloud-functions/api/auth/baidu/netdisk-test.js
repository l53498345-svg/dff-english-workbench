export default async function onRequest(context) {
  return new Response(
    JSON.stringify({
      ok: true,
      stage: "netdisk_test_ready",
      message: "Baidu Netdisk test endpoint is ready."
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8"
      }
    }
  );
}
