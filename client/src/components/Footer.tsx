import { Home } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="text-2xl font-bold mb-4 flex items-center">
              <Home className="h-6 w-6 mr-2" />
              AdvertiseHomes.Online
            </div>
            <p className="text-background/80 mb-6 max-w-md">
              The most trusted platform for buying, selling, and discovering properties. 
              Connect with top agents and access powerful market insights.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-background/60 hover:text-background transition-colors" data-testid="social-facebook">
                <i className="fab fa-facebook text-xl"></i>
              </a>
              <a href="#" className="text-background/60 hover:text-background transition-colors" data-testid="social-twitter">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#" className="text-background/60 hover:text-background transition-colors" data-testid="social-instagram">
                <i className="fab fa-instagram text-xl"></i>
              </a>
              <a href="#" className="text-background/60 hover:text-background transition-colors" data-testid="social-linkedin">
                <i className="fab fa-linkedin text-xl"></i>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">For Buyers</h4>
            <ul className="space-y-2">
              <li><a href="/properties" className="text-background/80 hover:text-background transition-colors">Search Homes</a></li>
              <li><a href="#" className="text-background/80 hover:text-background transition-colors">Market Reports</a></li>
              <li><a href="#" className="text-background/80 hover:text-background transition-colors">Saved Searches</a></li>
              <li><a href="#" className="text-background/80 hover:text-background transition-colors">Mortgage Calculator</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">For Agents</h4>
            <ul className="space-y-2">
              <li><a href="/subscribe" className="text-background/80 hover:text-background transition-colors">List Properties</a></li>
              <li><a href="#" className="text-background/80 hover:text-background transition-colors">Lead Generation</a></li>
              <li><a href="#" className="text-background/80 hover:text-background transition-colors">Analytics</a></li>
              <li><a href="#" className="text-background/80 hover:text-background transition-colors">Agent Tools</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-background/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-background/60 text-sm">
            © 2025 AdvertiseHomes.Online. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-background/60 hover:text-background transition-colors text-sm">Privacy Policy</a>
            <a href="#" className="text-background/60 hover:text-background transition-colors text-sm">Terms of Service</a>
            <a href="#" className="text-background/60 hover:text-background transition-colors text-sm">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
