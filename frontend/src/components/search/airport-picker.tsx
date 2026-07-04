"use client";

import { Search as SearchIcon, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Airport, CountryOption } from "@/lib/airports";

interface AirportPickerProps {
  label: string;
  countries: CountryOption[];
  country: string;
  onCountryChange: (country: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  results: Airport[];
  showResults: boolean;
  onSelect: (airport: Airport) => void;
  onSearchFocus: () => void;
  selectedAirport?: Airport;
  disabled?: boolean;
}

export function AirportPicker({
  label,
  countries,
  country,
  onCountryChange,
  search,
  onSearchChange,
  results,
  showResults,
  onSelect,
  onSearchFocus,
  selectedAirport,
  disabled = false,
}: AirportPickerProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Country / Region</Label>
        <Select
          value={country}
          onValueChange={(value) => value && onCountryChange(value)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Select country first" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name} ({c.airportCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Airport</Label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={country ? "Search code or city..." : "Select a country first"}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onSearchFocus}
            disabled={disabled || !country}
          />
        </div>
      </div>

      {selectedAirport && (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
          <span className="font-medium">{selectedAirport.code}</span>
          <span className="text-muted-foreground"> — {selectedAirport.name}, {selectedAirport.city}</span>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background">
          {results.map((airport) => (
            <button
              key={airport.code}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
              onClick={() => onSelect(airport)}
            >
              <div className="font-medium">{airport.code}</div>
              <div className="text-xs text-muted-foreground">
                {airport.name} · {airport.city}
              </div>
            </button>
          ))}
        </div>
      )}

      {country && showResults && search && results.length === 0 && (
        <p className="text-xs text-muted-foreground">No airports found in {country} for &quot;{search}&quot;</p>
      )}
    </div>
  );
}
