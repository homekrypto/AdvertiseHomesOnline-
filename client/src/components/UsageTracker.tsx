import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Home, Users } from "lucide-react";

interface UsageTrackerProps {
  showSeats?: boolean;
  organizationId?: string;
}

interface ListingUsage {
  current: number;
  limit: number;
  percentage: number;
  canCreateMore: boolean;
  tier: string;
}

interface SeatUsage {
  current: number;
  limit: number;
  percentage: number;
  canAddMore: boolean;
}

export function UsageTracker({ showSeats = false, organizationId }: UsageTrackerProps) {
  const { data: listingUsage, isLoading: listingLoading } = useQuery<ListingUsage>({
    queryKey: ["/api/usage/listings"],
    retry: false,
  });

  const { data: seatUsage, isLoading: seatLoading } = useQuery<SeatUsage>({
    queryKey: ["/api/usage/seats", organizationId],
    enabled: showSeats && !!organizationId,
    retry: false,
  });

  const getUsageColor = (percentage: number) => {
    if (percentage < 70) return "text-green-600";
    if (percentage < 90) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 70) return "bg-green-500";
    if (percentage < 90) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTierBadgeColor = (tier: string) => {
    const colors = {
      agent: "bg-green-100 text-green-800",
      agency: "bg-blue-100 text-blue-800",
      expert: "bg-purple-100 text-purple-800",
      admin: "bg-red-100 text-red-800"
    };
    return colors[tier as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (listingLoading || (showSeats && seatLoading)) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
        {showSeats && <div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Listing Usage */}
      <Card data-testid="card-listing-usage">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              <CardTitle className="text-lg">Property Listings</CardTitle>
            </div>
            <Badge className={getTierBadgeColor(listingUsage?.tier || "")}>
              {listingUsage?.tier?.toUpperCase()}
            </Badge>
          </div>
          <CardDescription>
            Current usage of your listing allocation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" data-testid="text-current-listings">
                {listingUsage?.current || 0}
              </span>
              <span className="text-muted-foreground">
                / {listingUsage?.limit === -1 ? "Unlimited" : listingUsage?.limit || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {listingUsage?.canCreateMore ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <span className={`font-medium ${getUsageColor(listingUsage?.percentage || 0)}`}>
                {listingUsage?.percentage?.toFixed(1)}%
              </span>
            </div>
          </div>
          
          {listingUsage?.limit !== -1 && (
            <div className="space-y-2">
              <Progress 
                value={listingUsage?.percentage || 0} 
                className="h-2"
                data-testid="progress-listings"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Used</span>
                <span>Available: {(listingUsage?.limit || 0) - (listingUsage?.current || 0)}</span>
              </div>
            </div>
          )}

          {!listingUsage?.canCreateMore && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                You've reached your listing limit. Upgrade your plan to add more listings.
              </p>
              <Button size="sm" className="mt-2" data-testid="button-upgrade-listings">
                Upgrade Plan
              </Button>
            </div>
          )}

          {listingUsage?.percentage && listingUsage.percentage > 80 && listingUsage?.canCreateMore && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                You're approaching your listing limit. Consider upgrading soon.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seat Usage - Only shown for organizations */}
      {showSeats && seatUsage && (
        <Card data-testid="card-seat-usage">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <CardTitle className="text-lg">Team Seats</CardTitle>
            </div>
            <CardDescription>
              Current team member allocation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" data-testid="text-current-seats">
                  {seatUsage.current}
                </span>
                <span className="text-muted-foreground">
                  / {seatUsage.limit}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {seatUsage.canAddMore ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
                <span className={`font-medium ${getUsageColor(seatUsage.percentage)}`}>
                  {seatUsage.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={seatUsage.percentage} 
                className="h-2"
                data-testid="progress-seats"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Occupied</span>
                <span>Available: {seatUsage.limit - seatUsage.current}</span>
              </div>
            </div>

            {!seatUsage.canAddMore && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  You've reached your seat limit. Upgrade your plan to add more team members.
                </p>
                <Button size="sm" className="mt-2" data-testid="button-upgrade-seats">
                  Upgrade Plan
                </Button>
              </div>
            )}

            {seatUsage.percentage > 80 && seatUsage.canAddMore && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  You're approaching your seat limit. Consider upgrading soon.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}