import { LayoutDashboard, LineChart, Package, ScanText, Wallet, Boxes, History, MapPin } from 'lucide-react';

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/mrdashboard', label: 'MR Dashboard', icon: MapPin },
  { path: '/investments', label: 'Doctor Investments', icon: Wallet },
  { path: '/analytics', label: 'Analytics', icon: LineChart },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/pharmacy', label: 'Pharmacy', icon: Package },
  { path: '/ocr', label: 'OCR Processing', icon: ScanText },
  { path: '/inventory', label: 'Inventory Integration', icon: Boxes },
  { path: '/logging', label: 'Activity History', icon: History },
] as const;
