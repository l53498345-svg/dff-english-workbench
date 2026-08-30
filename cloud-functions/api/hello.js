export default function onRequest(context) {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "dff English backend is running"
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8"
      }
    }
  );
}
