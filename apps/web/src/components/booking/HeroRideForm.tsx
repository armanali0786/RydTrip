import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Car, Key, ArrowRight } from 'lucide-react';
import { useBookingStore } from '../../stores/useBookingStore';
import { LocationSearchInputs } from './LocationSearchInputs';

export const HeroRideForm: React.FC<{ onSearchSubmit?: () => void }> = ({ onSearchSubmit }) => {
  const navigate = useNavigate();
  const { activeTab, setActiveTab, pickup, destination } = useBookingStore();

  const [scheduledForLater, setScheduledForLater] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !destination) return;

    if (onSearchSubmit) {
      onSearchSubmit();
    } else {
      navigate('/rider');
    }
  };

  return (
    <div className="w-full max-w-[480px] rounded-xl bg-white p-6 md:p-8 shadow-card border border-[#0e0f0c] text-[#0e0f0c]">
      {/* Mode Tabs */}
      <div className="mb-6 flex items-center justify-between gap-1.5 rounded-xl bg-[#e8ebe6] p-1.5 border border-[#0e0f0c]/10">
        <button
          type="button"
          onClick={() => setActiveTab('ride')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'ride'
              ? 'bg-[#0e0f0c] text-white shadow-sm'
              : 'text-[#454745] hover:text-[#0e0f0c] hover:bg-white/50'
          }`}
        >
          <Car className="h-4 w-4" />
          <span>Ride</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('drive')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'drive'
              ? 'bg-[#0e0f0c] text-white shadow-sm'
              : 'text-[#454745] hover:text-[#0e0f0c] hover:bg-white/50'
          }`}
        >
          <Key className="h-4 w-4" />
          <span>Drive</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reserve')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'reserve'
              ? 'bg-[#0e0f0c] text-white shadow-sm'
              : 'text-[#454745] hover:text-[#0e0f0c] hover:bg-white/50'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Reserve</span>
        </button>
      </div>

      {/* Wise-Style Headline Display Weight 900 */}
      <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-[#0e0f0c] mb-6 leading-tight">
        Go anywhere with <span className="bg-[#e2f6d5] px-2 py-0.5 rounded-lg text-[#054d28]">RydTrip</span>
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <LocationSearchInputs />

        {/* Schedule & Timing Chips */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setScheduledForLater(!scheduledForLater)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              scheduledForLater
                ? 'bg-[#0e0f0c] text-white shadow-sm'
                : 'bg-[#e8ebe6] text-[#0e0f0c] hover:bg-[#d8dcd5]'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{scheduledForLater ? 'Today 5:30 PM' : 'Pickup now'}</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-[#e8ebe6] px-4 py-2 text-xs font-bold text-[#0e0f0c] hover:bg-[#d8dcd5] transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>For me</span>
          </button>
        </div>

        {/* Wise Signature Lime-Green CTA Button (#9fe870) */}
        <div className="pt-3">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#9fe870] hover:bg-[#cdffad] active:bg-[#c5edab] text-[#0e0f0c] font-extrabold text-base shadow-sm transition-all duration-200 cursor-pointer"
          >
            <span>See prices & request ride</span>
            <ArrowRight className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};
