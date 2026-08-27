import React from 'react';
import { ActivePlatformView, DeviceFrame } from '../types';
import { Smartphone, Monitor, Tablet, ChefHat, Bike, ShoppingBag } from 'lucide-react';

interface DeviceSimulatorToolbarProps {
  activeView: ActivePlatformView;
  onViewChange: (view: ActivePlatformView) => void;
  deviceFrame: DeviceFrame;
  onDeviceFrameChange: (frame: DeviceFrame) => void;
  activeOrdersCount: number;
  onOpenOrders: () => void;
}

export const DeviceSimulatorToolbar: React.FC<DeviceSimulatorToolbarProps> = ({
  activeView,
  onViewChange,
  deviceFrame,
  onDeviceFrameChange,
  activeOrdersCount,
  onOpenOrders,
}) => {
  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 text-xs sm:text-sm py-2 px-3 sm:px-6 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        {/* Left: View Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="view-mode-customer"
            onClick={() => onViewChange('customer')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeView === 'customer'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Bike className="w-4 h-4 text-amber-500 group-hover:text-amber-400" />
            <span>App Delivery (Cliente)</span>
          </button>

          <button
            id="view-mode-admin"
            onClick={() => onViewChange('admin')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
              activeView === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Painel do Restaurante</span>
            {activeOrdersCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {activeOrdersCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: Device Frame Simulator & Shortcuts */}
        <div className="flex items-center gap-3">
          {activeView === 'customer' && (
            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
              <button
                id="frame-fluid"
                onClick={() => onDeviceFrameChange('fluid')}
                title="Tela Cheia / Web Desktop"
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  deviceFrame === 'fluid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Desktop</span>
              </button>
              <button
                id="frame-tablet"
                onClick={() => onDeviceFrameChange('tablet')}
                title="Simulador Tablet"
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  deviceFrame === 'tablet' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tablet</span>
              </button>
              <button
                id="frame-mobile"
                onClick={() => onDeviceFrameChange('mobile')}
                title="Simulador Smartphone"
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  deviceFrame === 'mobile' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Celular</span>
              </button>
            </div>
          )}

          {activeOrdersCount > 0 && (
            <button
              id="active-delivery-orders-btn"
              onClick={onOpenOrders}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Bike className="w-3.5 h-3.5 animate-bounce" />
              <span>{activeOrdersCount} em entrega</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

