import { useState, useEffect } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Property {
  id: number;
  name: string;
}

interface PropertyScopePickerProps {
  availableProperties: Property[];
  selectedPropertyId: number | null;
  onPropertyChange: (propertyId: number | null) => void;
  allowAll?: boolean;
  isSuperAdmin?: boolean;
  className?: string;
}

export function PropertyScopePicker({
  availableProperties,
  selectedPropertyId,
  onPropertyChange,
  allowAll = true,
  isSuperAdmin = false,
  className,
}: PropertyScopePickerProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (availableProperties.length === 1 && !isSuperAdmin && selectedPropertyId !== availableProperties[0].id) {
      onPropertyChange(availableProperties[0].id);
    }
  }, [availableProperties, selectedPropertyId, onPropertyChange, isSuperAdmin]);

  const selectedProperty = availableProperties.find(
    (p) => p.id === selectedPropertyId
  );

  const displayLabel = selectedProperty?.name || "All Properties";

  const handleSelect = (value: string) => {
    if (value === "all") {
      onPropertyChange(null);
    } else {
      onPropertyChange(parseInt(value, 10));
    }
    setSheetOpen(false);
  };

  if (availableProperties.length === 0) {
    return null;
  }

  if (availableProperties.length === 1 && !isSuperAdmin) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Building2 className="h-4 w-4 text-muted-foreground hidden sm:block" />
      
      {/* Desktop: Select dropdown */}
      <div className="hidden md:block">
        <Select
          value={selectedPropertyId?.toString() || "all"}
          onValueChange={handleSelect}
        >
          <SelectTrigger
            className="w-[180px] h-8"
            data-testid="select-property-filter"
          >
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {allowAll && (
              <SelectItem value="all" data-testid="select-property-all">
                All Properties
              </SelectItem>
            )}
            {availableProperties.map((property) => (
              <SelectItem
                key={property.id}
                value={property.id.toString()}
                data-testid={`select-property-${property.id}`}
              >
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: Sheet/Bottom drawer */}
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2"
              data-testid="button-property-filter-mobile"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="max-w-[100px] truncate text-xs">
                {displayLabel}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[50vh]">
            <SheetHeader className="pb-4">
              <SheetTitle>Select Property</SheetTitle>
            </SheetHeader>
            <div className="space-y-1 overflow-y-auto">
              {allowAll && (
                <button
                  onClick={() => handleSelect("all")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors",
                    selectedPropertyId === null
                      ? "bg-primary text-primary-foreground"
                      : "hover-elevate"
                  )}
                  data-testid="button-property-all-mobile"
                >
                  <span>All Properties</span>
                  {selectedPropertyId === null && (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              )}
              {availableProperties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => handleSelect(property.id.toString())}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors",
                    selectedPropertyId === property.id
                      ? "bg-primary text-primary-foreground"
                      : "hover-elevate"
                  )}
                  data-testid={`button-property-${property.id}-mobile`}
                >
                  <span>{property.name}</span>
                  {selectedPropertyId === property.id && (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
