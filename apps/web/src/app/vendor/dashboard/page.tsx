import { Button } from "@/components/ui/button";
import { Printer, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function VendorDashboard() {
  // Mock data for the dashboard
  const stats = {
    todaySales: "₹4,250",
    pendingApprovals: 3,
    queuedJobs: 5,
    completedToday: 42,
  };

  const recentOrders = [
    { id: "ORD-104921", doc: "Physics_Assignment.pdf", status: "PENDING", time: "10 mins ago", price: "₹45" },
    { id: "ORD-104920", doc: "Project_Report_v2.pdf", status: "QUEUED", time: "25 mins ago", price: "₹120" },
    { id: "ORD-104919", doc: "Resume_John.pdf", status: "COMPLETED", time: "1 hour ago", price: "₹15" },
    { id: "ORD-104918", doc: "Lecture_Notes_Ch4.pdf", status: "PRINTING", time: "1.5 hours ago", price: "₹250" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
          <Printer className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Printify Vendor</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-green-700">Agent Online</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
            VK
          </div>
        </div>
      </nav>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-500 mt-1">Welcome back, Vendor Kiosk 1.</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            View All Orders
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-500">Today's Sales</h3>
              <div className="p-2 bg-green-100 rounded-lg"><span className="text-green-700 font-bold">₹</span></div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.todaySales}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-500">Needs Approval (Cash)</h3>
              <div className="p-2 bg-orange-100 rounded-lg"><AlertCircle className="w-5 h-5 text-orange-600" /></div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingApprovals}</p>
            {stats.pendingApprovals > 0 && (
              <div className="absolute top-0 right-0 w-2 h-full bg-orange-500"></div>
            )}
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-500">Queued for Print</h3>
              <div className="p-2 bg-blue-100 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.queuedJobs}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-500">Completed</h3>
              <div className="p-2 bg-gray-100 rounded-lg"><CheckCircle className="w-5 h-5 text-gray-600" /></div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.completedToday}</p>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900">Live Orders</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{order.id}</h4>
                    <p className="text-sm text-gray-500">{order.doc}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-12">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{order.price}</p>
                    <p className="text-xs text-gray-400">{order.time}</p>
                  </div>
                  
                  <div className="w-32 flex justify-end">
                    {order.status === "PENDING" && (
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 w-full">
                        Approve Cash
                      </Button>
                    )}
                    {order.status === "QUEUED" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Queued
                      </span>
                    )}
                    {order.status === "PRINTING" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse mr-1.5"></span>
                        Printing
                      </span>
                    )}
                    {order.status === "COMPLETED" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
