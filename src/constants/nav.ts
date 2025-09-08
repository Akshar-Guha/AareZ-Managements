import { LayoutDashboard, LineChart, Package, ScanText, Wallet, Boxes, History, MapPin } from 'lucide-react';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/mr', label: 'MR Dashboard', icon: MapPin },
  { path: '/investments', label: 'Doctor Investments', icon: Wallet },
  { path: '/analytics', label: 'Analytics', icon: LineChart },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/pharmacies', label: 'Pharmacy', icon: Package }, // Temporarily changed to Package
  { path: '/ocr', label: 'OCR Processing', icon: ScanText },
  { path: '/inventory', label: 'Inventory Integration', icon: Boxes },
  { path: '/logs', label: 'Activity History', icon: History },
] as const;
