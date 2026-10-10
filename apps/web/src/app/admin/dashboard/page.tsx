"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserPlus, Store } from "lucide-react";

export default function AdminDashboard() {
  const [vendorCode, setVendorCode] = useState("");
  const [shopName, setShopName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");

  const [vendors, setVendors] = useState([
    { code: "DEMO123", name: "Campus Print Shop", email: "vendor1@printify.com", status: "Active" },
    { code: "SNK456", name: "QuickPrint Station", email: "vendor2@printify.com", status: "Active" },
  ]);

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setMessage("");

    // Simulate API call to create Vendor in Prisma
    setTimeout(() => {
      setVendors(prev => [{
        code: vendorCode,
        name: shopName,
        email: userEmail,
        status: "Active"
      }, ...prev]);
      
      setVendorCode("");
      setShopName("");
      setUserEmail("");
      setIsCreating(false);
      setMessage("Vendor account successfully created and assigned!");
      setTimeout(() => setMessage(""), 4000);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <ShieldCheck className="w-10 h-10 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
            <p className="text-gray-500">Manage vendors and platform settings.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Vendor Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-purple-50/50 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900">Assign New Vendor</h2>
              </div>
              
              <form onSubmit={handleCreateVendor} className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Owner Email</label>
                  <input 
                    type="email" 
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="vendor@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Must be a registered user.</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Vendor Code</label>
                  <input 
                    type="text" 
                    required
                    value={vendorCode}
                    onChange={(e) => setVendorCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SHOP2026"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                  />
                  <p className="text-xs text-gray-400 mt-1">Unique shortcode for the QR link.</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Shop Name</label>
                  <input 
                    type="text" 
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Main Street Prints"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {message && (
                  <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                    {message}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-full bg-purple-600 hover:bg-purple-700 h-12 rounded-xl text-lg font-bold shadow-md mt-4"
                >
                  {isCreating ? "Assigning..." : "Assign Vendor"}
                </Button>
              </form>
            </div>
          </div>

          {/* Vendors List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center space-x-2">
                  <Store className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-900">Active Vendors</h2>
                </div>
                <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                  {vendors.length} Total
                </span>
              </div>
              
              <div className="divide-y divide-gray-100">
                {vendors.map((vendor, idx) => (
                  <div key={idx} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{vendor.name}</h3>
                      <p className="text-gray-500 text-sm">{vendor.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-3 py-1 bg-purple-100 text-purple-800 font-mono font-bold rounded-lg text-sm mb-1">
                        {vendor.code}
                      </div>
                      <p className="text-xs font-semibold text-green-600 uppercase flex justify-end items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                        {vendor.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
