import React from 'react';
import { Globe, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-primary text-on-dark pt-16 pb-12 border-t border-black-elevated">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
          <div>
            <span className="font-display text-3xl font-bold tracking-tight text-on-dark">Uber</span>
            <p className="mt-2 text-body-sm text-hairline-mid max-w-sm">
              RideMesh distributed logistics engine powering urban mobility, ride-hailing, and driver dispatch at scale.
            </p>
          </div>

          <div className="flex items-center gap-6 text-body-sm font-medium">
            <button className="flex items-center gap-2 rounded-pill bg-black-elevated px-4 py-2 hover:bg-canvas/10 transition-colors">
              <Globe className="h-4 w-4" />
              <span>English (US)</span>
            </button>
            <button className="flex items-center gap-2 rounded-pill bg-black-elevated px-4 py-2 hover:bg-canvas/10 transition-colors">
              <MapPin className="h-4 w-4" />
              <span>Hyderabad</span>
            </button>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-black-elevated text-body-sm">
          <div>
            <h4 className="font-display text-body-md-strong text-on-dark mb-4">Company</h4>
            <ul className="space-y-2.5 text-hairline-mid">
              <li><a href="#" className="hover:text-on-dark transition-colors">About us</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Our offerings</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Newsroom</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Investors</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Careers</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-body-md-strong text-on-dark mb-4">Products</h4>
            <ul className="space-y-2.5 text-hairline-mid">
              <li><a href="#" className="hover:text-on-dark transition-colors">Ride</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Drive</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Deliver</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Eat</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Uber Freight</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-body-md-strong text-on-dark mb-4">Global citizenship</h4>
            <ul className="space-y-2.5 text-hairline-mid">
              <li><a href="#" className="hover:text-on-dark transition-colors">Safety</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Diversity and Inclusion</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Sustainability</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-body-md-strong text-on-dark mb-4">Travel</h4>
            <ul className="space-y-2.5 text-hairline-mid">
              <li><a href="#" className="hover:text-on-dark transition-colors">Reserve</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Airports</a></li>
              <li><a href="#" className="hover:text-on-dark transition-colors">Cities</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom fine print */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-caption text-mute gap-4">
          <p>© 2026 Uber Technologies Inc. / RideMesh Distributed Platform.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-on-dark transition-colors">Privacy</a>
            <a href="#" className="hover:text-on-dark transition-colors">Accessibility</a>
            <a href="#" className="hover:text-on-dark transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
