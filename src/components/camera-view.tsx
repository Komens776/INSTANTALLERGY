
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertTriangle, CameraOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraViewProps {
  onCapture: (dataUri: string) => void;
  onClose: () => void;
}

export function CameraView({ onCapture, onClose }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera not supported on this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err: any) {
        console.error("Error accessing camera:", err);
        setHasPermission(false);
        let title = "Camera Error";
        let description = "Could not access the camera. Please try again.";
        if (err.name === "NotAllowedError") {
          title = "Camera Access Denied";
          description = "Please enable camera permissions in your browser settings to use this feature.";
        } else if (err.name === "NotFoundError") {
          title = "No Camera Found";
          description = "We couldn't find a camera on your device.";
        } else if (err.name === "AbortError" || err.name === "OverconstrainedError" || err.name === "NotReadableError") {
          title = "Camera Issue";
          description = "Your camera might be in use by another application. Please close other apps and try again.";
        }
        toast({ variant: 'destructive', title, description });
      }
    };
    
    startCamera();

    return () => {
      stopCamera();
    };
  }, [toast, stopCamera]);
  
  const handleCapture = () => {
    if (videoRef.current && hasPermission) {
      const canvas = document.createElement("canvas");
      // Set canvas dimensions to match the video's actual rendered size for an accurate capture
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');
        onCapture(dataUri);
        stopCamera();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted border">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-4 text-center">
             <CameraOff className="h-12 w-12 mb-4" />
             <h3 className="text-lg font-semibold">Camera Access Required</h3>
             <p className="text-sm text-muted-foreground">
                Please allow camera access in your browser settings and ensure no other application is using it. You may need to refresh the page.
             </p>
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-center">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleCapture} disabled={hasPermission !== true}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
          Capture Photo
        </Button>
      </div>
    </div>
  );
}
