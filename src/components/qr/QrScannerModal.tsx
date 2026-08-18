import { useState } from 'react';
import { ScanLine, X } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

export function QrScannerModal({ open, onClose, onScan }: QrScannerModalProps) {
  const [permissionDenied, setPermissionDenied] = useState(false);

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <Card className="modal-card">
        <div className="modal-header">
          <div>
            <h3>Scan attendance QR</h3>
            <p className="muted">Use the live QR displayed by your organization.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close scanner">
            <X size={18} />
          </button>
        </div>
        <div className="scanner-card">
          <Scanner
            onScan={(items) => {
              const first = items[0]?.rawValue;
              if (first) {
                onScan(first);
              }
            }}
            onError={() => setPermissionDenied(true)}
          />
        </div>
        {permissionDenied ? (
          <p className="field-error">Camera access is required to scan the attendance QR code.</p>
        ) : (
          <p className="muted inline-icon"><ScanLine size={16} /> Hold the QR inside the frame.</p>
        )}
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </Card>
    </div>
  );
}
