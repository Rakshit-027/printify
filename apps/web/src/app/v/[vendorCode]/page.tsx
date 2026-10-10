"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DocumentUpload } from "@/components/DocumentUpload";
import { PrintOptions, PrintSettings } from "@/components/PrintOptions";
import { calculatePrintPrice, PriceCalculationResult, PricingConfig, PrintJobDetails } from "@printify/pricing";

type Step = "UPLOAD" | "OPTIONS" | "SUMMARY" | "SUCCESS";

export default function VendorQRPage({
  params,
}: {
  params: { vendorCode: string };
}) {
  const [step, setStep] = useState<Step>("UPLOAD");
  const [fileMetadata, setFileMetadata] = useState<{name: string, size: number} | null>(null);
  const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);
  const [priceResult, setPriceResult] = useState<PriceCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  // Mock Vendor Config (would normally come from API)
  const mockConfig: PricingConfig = {
    bwPricePerSheet: 200,    // 2.00 INR
    colorPricePerSheet: 1000, // 10.00 INR
    duplexMultiplier: 1.5,
  };

  const handleUploadSuccess = (fileId: string, metadata: { name: string; size: number }) => {
    setFileMetadata(metadata);
    setStep("OPTIONS");
  };

  const handleCalculatePrice = (settings: PrintSettings) => {
    setPrintSettings(settings);
    setStep("SUMMARY");
    setIsCalculating(true);

    setTimeout(() => {
      const jobDetails: PrintJobDetails = {
        pages: 10,
        copies: settings.copies,
        isColor: settings.colorMode === "color",
        isDuplex: settings.sides === "double",
      };

      const result = calculatePrintPrice(jobDetails, mockConfig);
      setPriceResult(result);
      setIsCalculating(false);
    }, 800);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    
    try {
      // 1. Create order on the backend
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorCode: params.vendorCode,
          documentName: fileMetadata?.name,
          documentSize: fileMetadata?.size,
          settings: printSettings,
          priceResult: priceResult,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert("Failed to create order: " + data.error);
        setIsSubmitting(false);
        return;
      }

      // 2. Load Razorpay SDK
      const res = await loadRazorpayScript();
      if (!res) {
        alert("Razorpay SDK failed to load. Are you online?");
        setIsSubmitting(false);
        return;
      }

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: "rzp_test_mock_key_here", // Mock key
        amount: priceResult?.totalAmount, // Amount is in currency subunits (paise)
        currency: "INR",
        name: "Printify Express",
        description: `Print Job for ${fileMetadata?.name}`,
        order_id: data.razorpayOrderId,
        handler: function (response: any) {
          // On successful payment
          setOrderNumber(data.publicNumber);
          setStep("SUCCESS");
          setIsSubmitting(false);
        },
        prefill: {
          name: "Guest Customer",
          email: "guest@example.com",
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: function() {
            setIsSubmitting(false);
          }
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.open();

    } catch (error) {
      alert("Something went wrong while submitting your order.");
      setIsSubmitting(false);
    }
  };

  const formatMoney = (minorUnits: number) => {
    return "₹" + (minorUnits / 100).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all hover:scale-[1.01]">
        <div className="p-8 text-center">
          {/* Header */}
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            Printify Express
          </h1>
          <p className="text-sm font-medium text-blue-600 mb-8 uppercase tracking-widest">
            Vendor: {params.vendorCode}
          </p>
          
          <div className="space-y-4 text-left">
            {step === "UPLOAD" && (
              <>
                <DocumentUpload onUploadSuccess={handleUploadSuccess} />
                <Button variant="outline" className="w-full h-14 mt-4 text-lg font-semibold rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  View Pricing
                </Button>
              </>
            )}

            {step === "OPTIONS" && (
              <PrintOptions 
                onCalculatePrice={handleCalculatePrice} 
                onBack={() => setStep("UPLOAD")} 
              />
            )}

            {step === "SUMMARY" && (
              <div className="animate-in fade-in zoom-in-95 duration-500">
                {isCalculating ? (
                  <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center space-y-4">
                    <p className="font-semibold text-lg text-blue-900">Calculating Price...</p>
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm text-blue-700">Please wait while we generate your estimate.</p>
                  </div>
                ) : priceResult && (
                  <div className="bg-white border border-gray-200 p-6 rounded-xl space-y-4 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 text-center mb-4">Order Summary</h3>
                    
                    <div className="space-y-2 text-sm text-gray-600 border-b border-gray-100 pb-4">
                      <div className="flex justify-between">
                        <span>Document:</span>
                        <span className="font-medium text-gray-900 truncate ml-4">{fileMetadata?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Settings:</span>
                        <span className="font-medium text-gray-900">
                          {printSettings?.copies}x, {printSettings?.colorMode.toUpperCase()}, {printSettings?.sides}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>{formatMoney(priceResult.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Tax (18%)</span>
                        <span>{formatMoney(priceResult.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-xl text-gray-900 pt-2 border-t border-gray-100 mt-2">
                        <span>Total</span>
                        <span className="text-blue-600">{formatMoney(priceResult.totalAmount)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <Button variant="outline" className="h-12 border-2 text-gray-700 hover:bg-gray-50" onClick={() => setStep("OPTIONS")} disabled={isSubmitting}>
                        Back
                      </Button>
                      <Button className="h-12 bg-green-600 hover:bg-green-700 shadow-md flex items-center justify-center space-x-2" onClick={handleSubmitOrder} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span>Pay & Print</span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {step === "SUCCESS" && (
              <div className="bg-green-50 border border-green-200 p-8 rounded-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-500 shadow-sm">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-900 mb-2">Order Confirmed!</h3>
                  <p className="text-green-700">Your print job has been sent to the vendor.</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-inner border border-green-100">
                  <p className="text-sm text-gray-500 uppercase font-semibold mb-1">Order Number</p>
                  <p className="text-2xl font-mono font-bold text-gray-900">{orderNumber}</p>
                </div>
                <Button className="w-full h-12 bg-green-600 hover:bg-green-700 shadow-md text-lg" onClick={() => {
                  setStep("UPLOAD");
                  setFileMetadata(null);
                  setPrintSettings(null);
                }}>
                  Print Another Document
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex justify-between text-sm text-gray-500">
          <span>Supported: PDF, JPG, PNG</span>
          <span>Max size: 50MB</span>
        </div>
      </div>
    </div>
  );
}
