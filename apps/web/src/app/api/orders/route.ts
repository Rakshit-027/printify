import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vendorCode, documentName, documentSize, settings, priceResult } = body;

    // Basic validation
    if (!vendorCode || !settings || !priceResult) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Mock successful database creation
    const publicNumber = `ORD-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    const orderId = `mock-uuid-${Date.now()}`;
    const razorpayOrderId = `order_${Math.floor(Math.random() * 100000000000000).toString(36)}`;

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    return NextResponse.json({ 
      success: true, 
      orderId, 
      publicNumber,
      razorpayOrderId
    }, { status: 201 });

  } catch (error) {
    console.error("Order creation failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
