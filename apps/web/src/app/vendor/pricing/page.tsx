"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Save } from "lucide-react";

export default function VendorPricingSettings() {
  const [pricing, setPricing] = useState({
    a4BwSingle: 2.00,
    a4BwDouble: 3.50,
    a4ColorSingle: 10.00,
    a4ColorDouble: 18.00,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handlePriceChange = (key: keyof typeof pricing, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setPricing(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setSaveMessage("");
    // Simulate API call to save vendor pricing to database
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage("Pricing updated successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <Settings className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Pricing Settings</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900">Configure Page Rates (INR)</h2>
            <p className="text-sm text-gray-500 mt-1">
              These prices will be dynamically fetched when customers scan your QR code.
            </p>
          </div>

          <div className="p-8 space-y-8">
            {/* A4 Black & White */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">A4 - Black & White</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Single-Sided Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input 
                      type="number" 
                      step="0.50"
                      value={pricing.a4BwSingle}
                      onChange={(e) => handlePriceChange("a4BwSingle", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Double-Sided Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input 
                      type="number" 
                      step="0.50"
                      value={pricing.a4BwDouble}
                      onChange={(e) => handlePriceChange("a4BwDouble", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* A4 Color */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">A4 - Color</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Single-Sided Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input 
                      type="number" 
                      step="0.50"
                      value={pricing.a4ColorSingle}
                      onChange={(e) => handlePriceChange("a4ColorSingle", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Double-Sided Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input 
                      type="number" 
                      step="0.50"
                      value={pricing.a4ColorDouble}
                      onChange={(e) => handlePriceChange("a4ColorDouble", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between border-t border-gray-100">
              <p className="text-green-600 font-medium">{saveMessage}</p>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-xl shadow-md flex items-center space-x-2 text-lg"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    <span>Save Pricing</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
