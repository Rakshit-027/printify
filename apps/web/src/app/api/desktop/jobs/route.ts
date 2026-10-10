import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // In production, we'd check the Authorization header for the device token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mock returning a queued job occasionally (for the Electron app to poll)
    // 20% chance to return a new job
    if (Math.random() > 0.8) {
      return NextResponse.json({
        jobs: [
          {
            id: `JOB-${Math.floor(Math.random() * 10000)}`,
            orderId: "ORD-104921",
            documentName: "Physics_Assignment.pdf",
            downloadUrl: "https://example.com/mock-download-link", // Mock signed URL
            settings: {
              paperSize: "A4",
              isColor: false,
              isDuplex: true,
              copies: 2
            },
            status: "QUEUED"
          }
        ]
      }, { status: 200 });
    }

    // Most of the time, return empty array (no new jobs)
    return NextResponse.json({ jobs: [] }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
