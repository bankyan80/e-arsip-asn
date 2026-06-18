import React, { useState, useRef } from 'react';
import { ArrowDown, RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState<'idle' | 'pulling' | 'releasing' | 'refreshing'>('idle');
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only trigger if we are at the top of the container
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setStatus('idle');
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (startY.current === null || status === 'refreshing') return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;

    // Only pull down if scrolled to top and moving downwards
    if (deltaY > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      // Apply non-linear resistance so it feels satisfying and high quality
      const distance = Math.min(Math.pow(deltaY, 0.8) * 1.5, 75);
      
      // Prevent page bounce/scroll behavior on mobile browsers
      if (e.cancelable) {
        e.preventDefault();
      }

      setPullDistance(distance);
      if (distance >= 50) {
        setStatus('releasing');
      } else {
        setStatus('pulling');
      }
    }
  };

  const handleTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;

    if (status === 'releasing') {
      setStatus('refreshing');
      setPullDistance(45); // hold loader position
      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.error('Error refreshing content:', err);
      } finally {
        // Reset state with animate transition
        setStatus('idle');
        setPullDistance(0);
      }
    } else {
      setStatus('idle');
      setPullDistance(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative flex-1 flex flex-col overflow-y-auto h-full scroll-smooth"
    >
      {/* Pull To Refresh Indicator */}
      <div 
        className="absolute left-0 right-0 z-40 flex items-center justify-center transition-all duration-150 pointer-events-none"
        style={{ 
          height: `${pullDistance}px`, 
          top: 0,
          opacity: pullDistance > 10 ? 1 : 0,
          transform: `translateY(${Math.max(0, pullDistance - 45)}px)`
        }}
      >
        <div className="bg-white px-4 py-2 rounded-full shadow-md border border-slate-200/50 flex items-center gap-2 text-xs font-display font-medium text-slate-700">
          {status === 'refreshing' || status === 'idle' ? (
            <RefreshCw className="w-3.5 h-3.5 text-[#0f2a44] animate-spin" />
          ) : (
            <ArrowDown 
              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-250 ${
                status === 'releasing' ? 'rotate-180 text-[#0f2a44]' : 'rotate-0'
              }`} 
            />
          )}
          <span>
            {status === 'pulling' && 'Tarik untuk memuat ulang...'}
            {status === 'releasing' && 'Lepas untuk memuat ulang'}
            {status === 'refreshing' && 'Memperbarui data...'}
          </span>
        </div>
      </div>

      {/* Main children content wrapper */}
      <div 
        className="flex-1 flex flex-col transition-transform duration-150"
        style={{ 
          transform: status !== 'refreshing' ? `translateY(${pullDistance * 0.45}px)` : 'translateY(15px)' 
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
