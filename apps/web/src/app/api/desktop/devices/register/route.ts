import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vendorCode, deviceKey } = body;

    if (!vendorCode || !deviceKey) {
      return NextResponse.json({ error: "Missing vendorCode or deviceKey" }, { status: 400 });
    }

    // Mock successful authentication
    // In production, we would check the database for the VendorDevice and validate the key
    if (vendorCode !== "DEMO123" || deviceKey !== "secret") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      deviceId: `device-${Math.floor(Math.random() * 1000)}`,
      token: "mock-jwt-token-12345"
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
