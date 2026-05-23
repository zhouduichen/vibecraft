import QRCode from 'qrcode';

export async function makeShareQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 150,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111111',
      light: '#ffffff',
    },
  });
}
