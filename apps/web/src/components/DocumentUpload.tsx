"use client";

import React, { useState, useCallback } from "react";
import { UploadCloud, File, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentUploadProps {
  onUploadSuccess: (fileId: string, metadata: { name: string; size: number }) => void;
}

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type (PDF, JPG, PNG)
    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      alert("Invalid file type. Please upload a PDF, JPG, or PNG.");
      return;
    }
    // Validate size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("File is too large. Maximum size is 50MB.");
      return;
    }
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setProgress(0);
  };

  const uploadFile = () => {
    if (!selectedFile) return;
    setUploading(true);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          // Simulate successful backend return
          setTimeout(() => {
            onUploadSuccess("mock-file-id-123", {
              name: selectedFile.name,
              size: selectedFile.size,
            });
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <label
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 
            ${dragActive ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className={`w-12 h-12 mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-400">PDF, JPG or PNG (MAX. 50MB)</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf,.jpg,.jpeg,.png" 
            onChange={handleChange} 
          />
        </label>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                <File className="w-6 h-6" />
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatSize(selectedFile.size)}
                </p>
              </div>
            </div>
            {!uploading && progress !== 100 && (
              <button 
                onClick={removeFile}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {progress === 100 && (
              <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
            )}
          </div>
          
          {(uploading || progress > 0) && (
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
          
          {!uploading && progress === 0 && (
            <Button 
              onClick={uploadFile}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
            >
              Confirm & Upload
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
