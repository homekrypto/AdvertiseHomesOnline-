// import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navigation() {
  // Temporarily disable auth to fix infinite loop
  const user = null;
  const isAuthenticated = false;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary flex items-center" data-testid="logo">
              <Home className="h-6 w-6 mr-2" />
              AdvertiseHomes.Online
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/properties" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-browse">
              Browse Properties
            </Link>
            {isAuthenticated && user && ['agent', 'agency', 'expert'].includes(user.role) && (
              <Link href="/agent/dashboard" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-dashboard">
                Dashboard
              </Link>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-admin">
                Admin
              </Link>
            )}
            <Link href="/subscribe" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-pricing">
              Pricing
            </Link>
          </div>
          
          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {user?.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover"
                      data-testid="user-avatar"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary text-sm font-medium">
                        {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium" data-testid="user-name">
                    {user?.firstName || 'User'}
                  </span>
                  {user?.role && user.role !== 'free' && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize" data-testid="user-role">
                      {user.role}
                    </span>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Button 
                  variant="ghost"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-signin"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-get-started"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <div className="space-y-4">
              <Link href="/properties" className="block text-muted-foreground hover:text-foreground transition-colors">
                Browse Properties
              </Link>
              {isAuthenticated && user && ['agent', 'agency', 'expert'].includes(user.role) && (
                <Link href="/agent/dashboard" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              )}
              {isAuthenticated && user?.role === 'admin' && (
                <Link href="/admin/dashboard" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Admin
                </Link>
              )}
              <Link href="/subscribe" className="block text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              
              <div className="pt-4 border-t border-border">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 mb-4">
                      {user?.profileImageUrl ? (
                        <img 
                          src={user.profileImageUrl} 
                          alt="Profile" 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary text-sm font-medium">
                            {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {user?.firstName || 'User'}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={() => window.location.href = '/api/logout'}
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => window.location.href = '/api/login'}
                    >
                      Sign In
                    </Button>
                    <Button 
                      size="sm"
                      className="w-full"
                      onClick={() => window.location.href = '/api/login'}
                    >
                      Get Started
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
