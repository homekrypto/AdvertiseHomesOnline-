import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch?: (searchTerm: string, filters?: SearchFilters) => void;
  className?: string;
}

interface SearchFilters {
  location: string;
  priceRange: string;
}

export default function SearchBar({ onSearch, className = "" }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onSearch) {
      onSearch(searchTerm, { location: searchTerm, priceRange });
    } else {
      // Default behavior - navigate to properties page with search
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (priceRange && priceRange !== 'any') {
        const [min, max] = priceRange.split('-');
        if (min) params.append('minPrice', min);
        if (max && max !== 'plus') params.append('maxPrice', max);
      }
      
      window.location.href = `/properties?${params.toString()}`;
    }
  };

  return (
    <div className={`max-w-4xl mx-auto bg-white rounded-lg p-6 shadow-lg ${className}`}>
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <Input
              type="text"
              placeholder="Enter city, neighborhood, or ZIP"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              data-testid="search-location"
            />
          </div>
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="px-4 py-3" data-testid="search-price-range">
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Price</SelectItem>
              <SelectItem value="0-500000">$0 - $500K</SelectItem>
              <SelectItem value="500000-1000000">$500K - $1M</SelectItem>
              <SelectItem value="1000000-plus">$1M+</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            type="submit"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium"
            data-testid="button-search"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </form>
    </div>
  );
}
