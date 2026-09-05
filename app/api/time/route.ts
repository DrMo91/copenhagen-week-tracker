export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  return Response.json(
    {
      epochMs: now.getTime(),
      utc: now.toISOString(),
      timeZone: "Europe/Copenhagen",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
