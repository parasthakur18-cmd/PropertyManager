import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Property } from "@shared/schema";

export function usePropertyFilter() {
  const { user } = useAuth();

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const isSuperAdmin = user?.role === "super-admin";

  const availableProperties = useMemo(() => {
    if (!properties) return [];
    return properties;
  }, [properties]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    () => {
      const saved = localStorage.getItem("selectedPropertyId");
      return saved ? parseInt(saved) : null;
    }
  );

  useEffect(() => {
    if (!isSuperAdmin && availableProperties.length > 0) {
      if (availableProperties.length === 1) {
        if (selectedPropertyId !== availableProperties[0].id) {
          setSelectedPropertyId(availableProperties[0].id);
        }
      } else if (!selectedPropertyId || !availableProperties.some(p => p.id === selectedPropertyId)) {
        setSelectedPropertyId(availableProperties[0].id);
      }
    }
  }, [availableProperties, isSuperAdmin]);

  useEffect(() => {
    if (selectedPropertyId) {
      localStorage.setItem("selectedPropertyId", selectedPropertyId.toString());
    }
  }, [selectedPropertyId]);

  const showPropertySwitcher = isSuperAdmin || availableProperties.length > 1;

  const handlePropertyChange = useCallback((id: number | null) => {
    setSelectedPropertyId(id);
  }, []);

  return {
    selectedPropertyId,
    setSelectedPropertyId: handlePropertyChange,
    availableProperties,
    showPropertySwitcher,
    isSuperAdmin,
    properties,
  };
}
