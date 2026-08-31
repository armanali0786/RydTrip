import React from 'react';
import { Globe, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-white pt-16 pb-12 border-t border-slate-800">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-display text-3xl font-black tracking-tight text-white">RydTrip</span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                Platform
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              RydTrip distributed logistics engine powering urban mobility, real-time ride-hailing, and autonomous driver dispatch at scale.
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm font-bold">
            <button className="flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 px-4 py-2.5 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span>English (US)</span>
            </button>
            <button className="flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 px-4 py-2.5 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors">
              <MapPin className="h-4 w-4 text-emerald-400" />
              <span>Hyderabad</span>
            </button>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800/80 text-sm">
          <div>
            <h4 className="font-display text-base font-bold text-white mb-4">Company</h4>
            <ul className="space-y-3 font-medium text-slate-300">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">About us</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Our offerings</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Newsroom</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Investors</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Careers</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-base font-bold text-white mb-4">Products</h4>
            <ul className="space-y-3 font-medium text-slate-300">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Ride</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Drive</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Deliver</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Eat</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">RydTrip Freight</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-base font-bold text-white mb-4">Global citizenship</h4>
            <ul className="space-y-3 font-medium text-slate-300">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Safety</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Diversity and Inclusion</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Sustainability</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-base font-bold text-white mb-4">Travel</h4>
            <ul className="space-y-3 font-medium text-slate-300">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Reserve</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Airports</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Cities</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom fine print */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs font-semibold text-slate-400 gap-4">
          <p>© 2026 RydTrip Technologies Inc. / Distributed Mobility Platform.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Accessibility</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
