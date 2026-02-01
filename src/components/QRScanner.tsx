import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScanLine, Loader2, X } from 'lucide-react';

interface QRScannerProps {
  onSuccess?: () => void;
}

export function QRScanner({ onSuccess }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const processedTokenRef = useRef<string | null>(null);
  const isSuccessRef = useRef(false);

  useEffect(() => {
    // Check if camera is available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => setHasCamera(true))
        .catch(() => setHasCamera(false));
    } else {
      setHasCamera(false);
    }
  }, []);

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScan,
        (errorMessage) => {
          // Ignore scan errors (no QR found)
        }
      );

      setIsScanning(true);
    } catch (error: any) {
      console.error('Failed to start scanner:', error);
      toast.error('Failed to access camera');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setIsScanning(false);
  };

  const handleScan = async (decodedText: string) => {
    // Prevent multiple scans while processing or after success
    if (isProcessing || isSuccessRef.current) return;

    // Check if it's a valid QR login token
    if (!decodedText.startsWith('qr-login:')) {
      return;
    }

    const token = decodedText.replace('qr-login:', '');

    // Prevent processing the same token twice
    if (processedTokenRef.current === token) {
      return;
    }

    processedTokenRef.current = token;
    setIsProcessing(true);
    await stopScanning();

    try {
      const loadingToastId = toast.loading('Validating QR code...');

      const { data, error } = await supabase.functions.invoke('qr-login', {
        body: { action: 'validate', token },
      });

      toast.dismiss(loadingToastId);

      if (error) throw error;

      if (data.success && data.tokenHash) {
        const loginToastId = toast.loading('Logging you in...');

        // Use the token hash to verify the OTP
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: 'magiclink',
        });

        toast.dismiss(loginToastId);

        if (verifyError) throw verifyError;

        isSuccessRef.current = true;
        toast.success(`Logged in as ${data.email}`);
        setIsOpen(false);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('QR validation failed:', error);
      toast.error(error.message || 'Failed to validate QR code');
      // Reset to allow retry with a different QR code
      processedTokenRef.current = null;
      setIsProcessing(false);
      // Only restart scanning if not successful
      if (!isSuccessRef.current) {
        startScanning();
      }
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsProcessing(false);
    processedTokenRef.current = null;
    isSuccessRef.current = false;
    // Delay to allow dialog to render
    setTimeout(startScanning, 500);
  };

  const handleClose = () => {
    stopScanning();
    setIsOpen(false);
    setIsProcessing(false);
    processedTokenRef.current = null;
  };

  // Only show on mobile devices
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (!isMobile || !hasCamera) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleOpen}
        className="w-full gap-2"
      >
        <ScanLine className="h-4 w-4" />
        Scan QR Code to Login
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle>Scan QR Code</DialogTitle>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Point your camera at the QR code displayed on the admin screen.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <div id="qr-reader" className="w-full" />
            
            {isProcessing && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Processing...</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 pt-0">
            <p className="text-xs text-center text-muted-foreground">
              Make sure the QR code is well-lit and fully visible in the frame.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}