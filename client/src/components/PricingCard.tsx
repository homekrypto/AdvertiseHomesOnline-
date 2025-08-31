import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  features: string[];
  buttonText: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  popular?: boolean;
  onSelect?: () => void;
}

export default function PricingCard({
  title,
  price,
  period,
  features,
  buttonText,
  buttonVariant = "default",
  popular = false,
  onSelect,
}: PricingCardProps) {
  const handleSelect = () => {
    if (onSelect) {
      onSelect();
    } else {
      // Default behavior for non-interactive cards
      if (title === "Free Browser") return;
      window.location.href = '/api/login';
    }
  };

  return (
    <Card className={`relative ${popular ? 'border-primary shadow-lg' : 'border-border shadow-sm'}`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="tier-badge px-4 py-2">Most Popular</Badge>
        </div>
      )}
      
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold mb-2" data-testid={`pricing-title-${title.toLowerCase().replace(' ', '-')}`}>
            {title}
          </h3>
          <div className="text-3xl font-bold" data-testid={`pricing-price-${title.toLowerCase().replace(' ', '-')}`}>
            {price}
          </div>
          <div className="text-muted-foreground">{period}</div>
        </div>
        
        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => {
            const isIncluded = !feature.startsWith("Contact info hidden") && !feature.startsWith("No favorites");
            return (
              <li key={index} className="flex items-center" data-testid={`feature-${title.toLowerCase().replace(' ', '-')}-${index}`}>
                {isIncluded ? (
                  <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-red-500 mr-3 flex-shrink-0" />
                )}
                <span className={isIncluded ? "" : "text-muted-foreground"}>
                  {feature}
                </span>
              </li>
            );
          })}
        </ul>
        
        <Button 
          variant={buttonVariant}
          className="w-full"
          onClick={handleSelect}
          disabled={title === "Free Browser"}
          data-testid={`button-select-${title.toLowerCase().replace(' ', '-')}`}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}
