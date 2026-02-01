import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
import { QrCode, Loader2, Copy, Check } from 'lucide-react';

interface QRCodeGeneratorProps {
  userId: string;
  userName: string;
  onClose?: () => void;
}

export function QRCodeGenerator({ userId, userName, onClose }: QRCodeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qrData, setQrData] = useState<{ token: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateQR = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('qr-login', {
        body: { action: 'generate', userId },
      });

      if (error) throw error;

      setQrData(data);
      setIsOpen(true);
      toast.success('QR code generated successfully');
    } catch (error: any) {
      console.error('Failed to generate QR:', error);
      toast.error(error.message || 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setQrData(null);
    onClose?.();
  };

  const getQRValue = () => {
    if (!qrData) return '';
    // QR contains the token that will be validated on scan
    return `qr-login:${qrData.token}`;
  };

  const copyToken = async () => {
    if (!qrData) return;
    await navigator.clipboard.writeText(qrData.token);
    setCopied(true);
    toast.success('Token copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getTimeRemaining = () => {
    if (!qrData) return '';
    const expires = new Date(qrData.expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={generateQR}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <QrCode className="h-4 w-4" />
        )}
        QR Login
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login QR Code for {userName}</DialogTitle>
            <DialogDescription>
              Scan this QR code with the mobile app to log in as this user. 
              The code expires in 5 minutes and can only be used once.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {qrData && (
              <>
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG
                    value={getQRValue()}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p>Expires in: <span className="font-mono font-bold">{getTimeRemaining()}</span></p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToken}
                  className="gap-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'Copied!' : 'Copy Token'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}