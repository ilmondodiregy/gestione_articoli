import React from 'react';
import { LayoutDashboard, Package, TrendingUp, Settings, History, Box } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dash', fullLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Items', fullLabel: 'Magazzino', icon: Package },
    { id: 'movements', label: 'Storico', fullLabel: 'Storico', icon: History },
    { id: 'analytics', label: 'Analisi', fullLabel: 'Analisi & AI', icon: TrendingUp },
    { id: 'settings', label: 'Sync', fullLabel: 'Cloud Sync', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Top Header & Desktop Navigation */}
      <header className="bg-slate-900 text-white shadow-lg flex-none z-30 relative">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            {/* Branding */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl shadow-inner shadow-indigo-400/20">
                    <Box className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight leading-none">Magazzino<span className="text-indigo-400">Pro</span></h1>
                    <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase hidden sm:block">PWA Edition</span>
                </div>
            </div>

            {/* Desktop Tabs (Affiancati in alto) */}
            <nav className="hidden md:flex items-center h-full ml-8 gap-1">
                {navItems.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`
                                h-full px-5 flex items-center gap-2.5 border-b-[3px] transition-all duration-200 text-sm font-medium relative group
                                ${isActive 
                                    ? 'border-indigo-500 text-white bg-slate-800/50' 
                                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'}
                            `}
                        >
                            <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'group-hover:text-white'}`} />
                            {item.fullLabel}
                        </button>
                    )
                })}
            </nav>

             {/* User / Action Area */}
             <div className="flex items-center gap-4">
                 <div className="hidden sm:block text-right">
                     <p className="text-xs font-bold text-white">Admin</p>
                     <p className="text-[10px] text-indigo-300">Online</p>
                 </div>
                 <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold shadow-lg ring-2 ring-slate-800">
                     MP
                 </div>
             </div>
        </div>
      </header>

      {/* Main Content Scrollable Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50 relative scroll-smooth">
         <div className="max-w-7xl mx-auto p-4 pb-24 md:p-8 md:pb-8 h-full flex flex-col">
            {children}
         </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Affiancati in basso - PWA Style) */}
      <nav className="md:hidden flex-none bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around items-center h-16">
              {navItems.map(item => {
                   const isActive = activeTab === item.id;
                   return (
                      <button
                          key={item.id}
                          onClick={() => onTabChange(item.id)}
                          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:bg-slate-50 ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                           <div className={`relative p-1 rounded-xl transition-all ${isActive ? 'bg-indigo-50' : 'bg-transparent'}`}>
                                <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                           </div>
                           <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
                      </button>
                   )
              })}
          </div>
      </nav>
    </div>
  );
};