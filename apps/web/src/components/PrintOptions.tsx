"use client";

import React, { useState } from "react";
import { Copy, Layers, Palette, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PrintSettings {
  paperSize: string;
  colorMode: "bw" | "color";
  sides: "single" | "double";
  copies: number;
}

interface PrintOptionsProps {
  onCalculatePrice: (settings: PrintSettings) => void;
  onBack: () => void;
}

export function PrintOptions({ onCalculatePrice, onBack }: PrintOptionsProps) {
  const [settings, setSettings] = useState<PrintSettings>({
    paperSize: "A4",
    colorMode: "bw",
    sides: "single",
    copies: 1,
  });

  const updateSetting = (key: keyof PrintSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Print Settings</h3>
      
      <div className="space-y-6">
        {/* Copies */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
          <div className="flex items-center space-x-3">
            <Copy className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-700">Copies</span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => updateSetting("copies", Math.max(1, settings.copies - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              -
            </button>
            <span className="text-lg font-bold w-6 text-center">{settings.copies}</span>
            <button 
              onClick={() => updateSetting("copies", settings.copies + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              +
            </button>
          </div>
        </div>

        {/* Color Mode */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
            <Palette className="w-4 h-4 text-blue-600" />
            <span>Color Mode</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateSetting("colorMode", "bw")}
              className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                settings.colorMode === "bw"
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              Black & White
            </button>
            <button
              onClick={() => updateSetting("colorMode", "color")}
              className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                settings.colorMode === "color"
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              Color
            </button>
          </div>
        </div>

        {/* Sides */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Printing Sides</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateSetting("sides", "single")}
              className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                settings.sides === "single"
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              Single-sided
            </button>
            <button
              onClick={() => updateSetting("sides", "double")}
              className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                settings.sides === "double"
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              Double-sided
            </button>
          </div>
        </div>
        
        {/* Paper Size */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-700">Paper Size</span>
          </div>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
            {settings.paperSize}
          </span>
        </div>
      </div>

      <div className="mt-8 flex space-x-3">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="w-1/3 h-14 rounded-xl border-2 text-gray-600 hover:bg-gray-50"
        >
          Back
        </Button>
        <Button 
          onClick={() => onCalculatePrice(settings)}
          className="w-2/3 h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-lg shadow-md"
        >
          Get Price Estimate
        </Button>
      </div>
    </div>
  );
}
