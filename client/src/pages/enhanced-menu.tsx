import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, ChevronDown, ChevronUp, Search, ArrowUp, ArrowDown, FileSpreadsheet, Download, CheckCircle2, AlertCircle } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EnhancedMenuItemForm } from "@/components/enhanced-menu-item-form";
import { 
  type MenuCategory, 
  type MenuItem, 
  type MenuItemVariant, 
  type MenuItemAddOn,
  insertMenuCategorySchema,
  insertMenuItemSchema,
  insertMenuItemVariantSchema,
  insertMenuItemAddOnSchema
} from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function EnhancedMenu() {
  const [selectedProperty, setSelectedProperty] = useState<number>(0);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  
  const { toast } = useToast();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu-categories"],
  });

  const { data: menuItems, isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const filteredCategories = categories?.filter(
    (cat) => {
      // Property filter
      if (selectedProperty !== 0 && cat.propertyId !== selectedProperty && cat.propertyId !== null) {
        return false;
      }
      // Category filter (for tabs)
      if (selectedCategoryFilter !== null && cat.id !== selectedCategoryFilter) {
        return false;
      }
      return true;
    }
  );

  const filteredItems = menuItems?.filter(
    (item) => {
      // Property filter
      if (selectedProperty !== 0 && item.propertyId !== selectedProperty && item.propertyId !== null) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchDesc = item.description ? item.description.toLowerCase().includes(query) : false;
        if (!matchName && !matchDesc) {
          return false;
        }
      }
      return true;
    }
  );

  const toggleItemExpanded = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Reorder categories mutation
  const reorderCategoriesMutation = useMutation({
    mutationFn: async (updates: { id: number; displayOrder: number }[]) => {
      return await apiRequest("/api/menu-categories/reorder", "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-categories"] });
    },
  });

  // Swap two items mutation
  const swapItemsMutation = useMutation({
    mutationFn: async (payload: { id1: number; id2: number; order1: number; order2: number }) => {
      return await apiRequest("/api/menu-items/swap", "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Success",
        description: "Menu items reordered successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to reorder items: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Move item up or down within category
  const moveItem = (categoryId: number, itemId: number, direction: 'up' | 'down') => {
    if (!menuItems) return;
    
    const categoryItems = menuItems
      .filter(item => item.categoryId === categoryId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    
    const currentIndex = categoryItems.findIndex(item => item.id === itemId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categoryItems.length) return;
    
    const currentItem = categoryItems[currentIndex];
    const targetItem = categoryItems[targetIndex];
    
    // Swap the two items
    swapItemsMutation.mutate({
      id1: currentItem.id,
      id2: targetItem.id,
      order1: currentItem.displayOrder,
      order2: targetItem.displayOrder
    });
  };

  // Bulk import functions
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  function parseCSV(csvText: string): { items: any[]; errors: string[] } {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { items: [], errors: ['CSV file must have headers and at least one data row'] };
    const items: any[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 3) {
        errors.push(`Row ${i + 1}: Only found ${values.length} columns. Need at least 3 (name, category, price). Check if using comma separator.`);
        continue;
      }
      const [name, categoryName, price, description, isVeg, isAvailable, variants, addOns] = values;
      
      // Build specific missing fields message
      const missingFields: string[] = [];
      if (!name || name.trim() === '') missingFields.push('name');
      if (!categoryName || categoryName.trim() === '') missingFields.push('category');
      if (!price || price.trim() === '') missingFields.push('price');
      
      if (missingFields.length > 0) {
        errors.push(`Row ${i + 1}: Missing ${missingFields.join(', ')}. Found: name="${name || ''}", category="${categoryName || ''}", price="${price || ''}"`);
        continue;
      }
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice)) {
        errors.push(`Row ${i + 1}: Invalid price "${price}"`);
        continue;
      }
      // Find categoryId by matching category name (case-insensitive)
      const matchedCategory = categories?.find(c => 
        c.name.toLowerCase().trim() === categoryName.toLowerCase().trim()
      );
      if (!matchedCategory) {
        errors.push(`Row ${i + 1}: Category "${categoryName}" not found. Available: ${categories?.map(c => c.name).join(', ')}`);
        continue;
      }
      items.push({
        name, 
        category: categoryName,
        categoryId: matchedCategory.id,
        price: parsedPrice, 
        description: description || '',
        isVeg: isVeg?.toLowerCase() === 'true',
        isAvailable: isAvailable?.toLowerCase() !== 'false',
        variants: variants || '', 
        addOns: addOns || ''
      });
    }
    return { items, errors };
  }

  function generateCSVTemplate() {
    const headers = ['name', 'category', 'price', 'description', 'isVeg', 'isAvailable', 'variants', 'addOns'];
    
    // If we have existing menu items, export them as template examples
    if (menuItems && menuItems.length > 0 && categories && categories.length > 0) {
      const rows = menuItems.map(item => {
        const category = categories.find(c => c.id === item.categoryId);
        return [
          item.name || '',
          category?.name || 'Uncategorized',
          item.price?.toString() || '0',
          item.description || '',
          item.isVeg ? 'true' : 'false',
          item.isAvailable !== false ? 'true' : 'false',
          '', // Variants would need separate fetch
          ''  // Add-ons would need separate fetch
        ];
      });
      
      // Sort by category for easy understanding
      rows.sort((a, b) => a[1].localeCompare(b[1]));
      
      return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    }
    
    // Fallback: Sample rows with one item from each common category
    const sampleRows = [
      ['Masala Omelette', 'Breakfast', '80', 'Spiced egg omelette with onions', 'false', 'true', '', ''],
      ['Aloo Paratha', 'Breakfast', '60', 'Stuffed potato flatbread', 'true', 'true', '', 'Extra Butter:20'],
      ['Paneer Tikka', 'Starters', '280', 'Grilled cottage cheese cubes', 'true', 'true', 'Half:150,Full:280', 'Extra Sauce:30'],
      ['Chicken Lollipop', 'Starters', '320', 'Crispy fried chicken wings', 'false', 'true', '', ''],
      ['Butter Chicken', 'Main Course', '350', 'Creamy tomato chicken curry', 'false', 'true', 'Half:200,Full:350', 'Extra Gravy:50'],
      ['Dal Makhani', 'Main Course', '220', 'Slow cooked black lentils', 'true', 'true', '', ''],
      ['Veg Biryani', 'Rice & Biryani', '250', 'Fragrant rice with vegetables', 'true', 'true', '', 'Extra Raita:40'],
      ['Chicken Biryani', 'Rice & Biryani', '320', 'Aromatic rice with chicken', 'false', 'true', 'Half:180,Full:320', 'Extra Raita:40'],
      ['Butter Naan', 'Breads', '50', 'Soft buttered flatbread', 'true', 'true', '', ''],
      ['Tandoori Roti', 'Breads', '30', 'Whole wheat bread from tandoor', 'true', 'true', '', ''],
      ['Fresh Lime Soda', 'Beverages', '60', 'Sweet or salted lime drink', 'true', 'true', 'Sweet:60,Salted:60', ''],
      ['Masala Chai', 'Beverages', '30', 'Indian spiced tea', 'true', 'true', '', ''],
      ['Gulab Jamun', 'Desserts', '80', 'Sweet milk dumplings in syrup', 'true', 'true', '2pcs:80,4pcs:150', ''],
      ['Ice Cream', 'Desserts', '100', 'Vanilla or chocolate', 'true', 'true', 'Single:60,Double:100', '']
    ];
    return [headers.join(','), ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      setParsedItems(result.items);
      setParseErrors(result.errors);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csvContent = generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'menu_items_template.csv';
    link.click();
  };

  const resetBulkImport = () => {
    setParsedItems([]);
    setParseErrors([]);
    setImportResult(null);
  };

  const bulkImportMutation = useMutation({
    mutationFn: async (data: { items: any[]; propertyId: number }) => {
      return await apiRequest("/api/menu-items/bulk-import", "POST", data);
    },
    onSuccess: (result: any) => {
      setImportResult(result);
      toast({ title: "Import Complete", description: `${result.created} items imported successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu-categories"] });
    },
    onError: (error: any) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleBulkImport = () => {
    if (parsedItems.length === 0) {
      toast({ title: "No items to import", description: "Please upload a CSV file first", variant: "destructive" });
      return;
    }
    bulkImportMutation.mutate({ items: parsedItems, propertyId: selectedProperty });
  };

  // Handle category drag end
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) return;

    // Use the full unfiltered list sorted by current displayOrder to ensure all items get updated
    const allCategories = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const oldIndex = allCategories.findIndex(cat => cat.id === active.id);
    const newIndex = allCategories.findIndex(cat => cat.id === over.id);

    const reordered = arrayMove(allCategories, oldIndex, newIndex);
    const updates = reordered.map((cat, idx) => ({
      id: cat.id,
      displayOrder: idx,
    }));

    reorderCategoriesMutation.mutate(updates);
  };


  if (categoriesLoading || itemsLoading) {
    return (
      <div className="p-4 md:p-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-menu-management">
            Menu Management
          </h1>
          <p className="text-muted-foreground">
            Manage categories, items, variants, and add-ons for your restaurant menu
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsBulkImportOpen(true)} data-testid="button-bulk-import">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import CSV
        </Button>
      </div>

      {/* Filters Section */}
      <div className="mb-6 space-y-4">
        {/* Property Filter */}
        {properties && properties.length > 1 && (
          <div>
            <Label>Filter by Property</Label>
            <Select
              value={selectedProperty.toString()}
              onValueChange={(val) => setSelectedProperty(parseInt(val))}
            >
              <SelectTrigger data-testid="select-property-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Properties</SelectItem>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id.toString()}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Search Bar */}
        <div>
          <Label>Search Menu Items</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-menu"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        {categories && categories.length > 0 && (
          <div>
            <Label className="mb-2 block">Quick Category Filter</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedCategoryFilter === null ? "default" : "outline"}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedCategoryFilter(null)}
                data-testid="badge-category-all"
              >
                All Categories ({categories.length})
              </Badge>
              {categories
                ?.filter((cat) => selectedProperty === 0 || cat.propertyId === selectedProperty || cat.propertyId === null)
                .map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategoryFilter === cat.id ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    data-testid={`badge-category-${cat.id}`}
                  >
                    {cat.name} ({filteredItems?.filter((item) => item.categoryId === cat.id).length || 0})
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Category Button */}
      <div className="mb-6">
        <Button
          onClick={() => {
            setSelectedCategory(null);
            setShowCategoryForm(true);
          }}
          data-testid="button-add-category"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Category
        </Button>
      </div>

      {/* Categories List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleCategoryDragEnd}
      >
        <SortableContext
          items={filteredCategories?.map(cat => cat.id) || []}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {filteredCategories?.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                items={filteredItems?.filter((item) => item.categoryId === category.id) || []}
                onEditCategory={(cat) => {
                  setSelectedCategory(cat);
                  setShowCategoryForm(true);
                }}
                onAddItem={() => {
                  setSelectedCategory(category);
                  setSelectedItem(null);
                  setShowItemForm(true);
                }}
                onEditItem={(item) => {
                  setSelectedCategory(category);
                  setSelectedItem(item);
                  setShowItemForm(true);
                }}
                expandedItems={expandedItems}
                toggleItemExpanded={toggleItemExpanded}
                onMoveItem={moveItem}
              />
            ))}

            {(!filteredCategories || filteredCategories.length === 0) && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    No categories yet. Create your first category to start building your menu!
                  </p>
                  <Button
                    onClick={() => {
                      setSelectedCategory(null);
                      setShowCategoryForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Category
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Category Form Dialog */}
      <CategoryFormDialog
        open={showCategoryForm}
        onOpenChange={setShowCategoryForm}
        category={selectedCategory}
        properties={properties || []}
        defaultPropertyId={selectedProperty || properties?.[0]?.id}
      />

      {/* Item Form Dialog */}
      <EnhancedMenuItemForm
        open={showItemForm}
        onClose={() => setShowItemForm(false)}
        menuItem={selectedItem || undefined}
        categories={categories || []}
        properties={properties || []}
        onSave={async (itemData, variants, addOns) => {
          try {
            let itemId: number;
            
            if (selectedItem) {
              // Update existing item
              itemId = selectedItem.id;
              await apiRequest(`/api/menu-items/${selectedItem.id}`, "PATCH", {
                ...itemData,
                categoryId: selectedCategory?.id || itemData.categoryId,
              });
              
              // Delete existing variants and add-ons, then recreate
              await apiRequest(`/api/menu-items/${selectedItem.id}/variants`, "DELETE");
              await apiRequest(`/api/menu-items/${selectedItem.id}/add-ons`, "DELETE");
              
              // Create new variants one by one
              for (const variant of variants) {
                await apiRequest(`/api/menu-items/${selectedItem.id}/variants`, "POST", variant);
              }
              
              // Create new add-ons one by one
              for (const addOn of addOns) {
                await apiRequest(`/api/menu-items/${selectedItem.id}/add-ons`, "POST", addOn);
              }
            } else {
              // Create new item
              const response = await apiRequest("/api/menu-items", "POST", {
                ...itemData,
                categoryId: selectedCategory?.id || itemData.categoryId,
              });
              const result = await response.json();
              itemId = result.id;
              
              // Create variants one by one
              for (const variant of variants) {
                await apiRequest(`/api/menu-items/${result.id}/variants`, "POST", variant);
              }
              
              // Create add-ons one by one
              for (const addOn of addOns) {
                await apiRequest(`/api/menu-items/${result.id}/add-ons`, "POST", addOn);
              }
            }
            
            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
            queryClient.invalidateQueries({ queryKey: [`/api/menu-items/${itemId}/variants`] });
            queryClient.invalidateQueries({ queryKey: [`/api/menu-items/${itemId}/add-ons`] });
          } catch (error: any) {
            toast({
              title: "Error saving item",
              description: error.message,
              variant: "destructive",
            });
            throw error;
          }
        }}
      />

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkImportOpen} onOpenChange={(open) => {
        if (!open) resetBulkImport();
        setIsBulkImportOpen(open);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Bulk Import Menu Items
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to add multiple menu items at once
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Property Selection */}
              {properties && properties.length > 1 && (
                <div>
                  <Label>Select Property</Label>
                  <Select
                    value={selectedProperty.toString()}
                    onValueChange={(val) => setSelectedProperty(parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Properties</SelectItem>
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id.toString()}>
                          {prop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Download Template */}
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>

              {/* File Upload */}
              <div>
                <Label>Upload CSV File</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  data-testid="input-csv-file"
                />
              </div>

              {/* Parse Errors */}
              {parseErrors.length > 0 && !importResult && (
                <Alert className="border-amber-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Some rows have errors</AlertTitle>
                  <AlertDescription>
                    <ul className="text-sm list-disc pl-4 mt-2">
                      {parseErrors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {parseErrors.length > 5 && <li>...and {parseErrors.length - 5} more errors</li>}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              {parsedItems.length > 0 && !importResult && (
                <Alert className="border-green-500">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle>{parsedItems.length} items ready to import</AlertTitle>
                  <AlertDescription>
                    <ul className="text-sm mt-2">
                      {parsedItems.slice(0, 5).map((item, i) => (
                        <li key={i}>{item.name} - {item.category} - ₹{item.price}</li>
                      ))}
                      {parsedItems.length > 5 && <li>...and {parsedItems.length - 5} more items</li>}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Import Result */}
              {importResult && (
                <Alert className={importResult.failed > 0 ? "border-amber-500" : "border-green-500"}>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Import Complete</AlertTitle>
                  <AlertDescription>
                    <p>{importResult.created} items imported successfully</p>
                    {importResult.failed > 0 && <p className="text-amber-600">{importResult.failed} items failed</p>}
                  </AlertDescription>
                </Alert>
              )}

              {/* CSV Format Help */}
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">CSV Format:</p>
                <p>name, category, price, description, isVeg (true/false), isAvailable (true/false), variants, addOns</p>
                <p className="text-xs mt-1">Variants format: Name:Price,Name:Price (e.g., Half:150,Full:250)</p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetBulkImport(); setIsBulkImportOpen(false); }}>
              Cancel
            </Button>
            {importResult ? (
              <Button onClick={() => { resetBulkImport(); setIsBulkImportOpen(false); }}>
                Done
              </Button>
            ) : (
              <Button
                onClick={handleBulkImport}
                disabled={parsedItems.length === 0 || bulkImportMutation.isPending}
              >
                {bulkImportMutation.isPending ? "Importing..." : `Import ${parsedItems.length} Items`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Category Section Component
function CategorySection({
  category,
  items,
  onEditCategory,
  onAddItem,
  onEditItem,
  expandedItems,
  toggleItemExpanded,
  onMoveItem,
}: {
  category: MenuCategory;
  items: MenuItem[];
  onEditCategory: (cat: MenuCategory) => void;
  onAddItem: () => void;
  onEditItem: (item: MenuItem) => void;
  expandedItems: Set<number>;
  toggleItemExpanded: (id: number) => void;
  onMoveItem: (categoryId: number, itemId: number, direction: 'up' | 'down') => void;
}) {
  const { toast } = useToast();

  const deleteCategory = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/menu-categories/${category.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-categories"] });
      toast({ title: "Category deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {category.name}
              {!category.isActive && <Badge variant="secondary">Inactive</Badge>}
              <Badge variant="outline">{items.length} items</Badge>
            </CardTitle>
            {category.startTime && category.endTime && (
              <p className="text-sm text-muted-foreground mt-1">
                {category.startTime} - {category.endTime}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditCategory(category)}
              data-testid={`button-edit-category-${category.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (items.length > 0) {
                  toast({
                    title: "Cannot delete category",
                    description: "Remove all items first",
                    variant: "destructive",
                  });
                } else {
                  deleteCategory.mutate();
                }
              }}
              data-testid={`button-delete-category-${category.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={onAddItem}
          data-testid={`button-add-item-${category.id}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item to {category.name}
        </Button>

        {/* Items List */}
        <div className="space-y-2">
          {items.map((item, index) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => onEditItem(item)}
              isExpanded={expandedItems.has(item.id)}
              onToggleExpand={() => toggleItemExpanded(item.id)}
              onMoveUp={() => onMoveItem(category.id, item.id, 'up')}
              onMoveDown={() => onMoveItem(category.id, item.id, 'down')}
              isFirst={index === 0}
              isLast={index === items.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


// Item Card Component with Variants and Add-ons
function ItemCard({
  item,
  onEdit,
  isExpanded,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  item: MenuItem;
  onEdit: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const { toast } = useToast();

  const { data: variants } = useQuery<MenuItemVariant[]>({
    queryKey: [`/api/menu-items/${item.id}/variants`],
    enabled: item.hasVariants,
  });

  const { data: addOns } = useQuery<MenuItemAddOn[]>({
    queryKey: [`/api/menu-items/${item.id}/add-ons`],
  });

  const deleteItem = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/menu-items/${item.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: "Item deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleAvailability = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      return await apiRequest(`/api/menu-items/${item.id}`, "PATCH", {
        isAvailable,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ 
        title: item.isAvailable ? "Item marked unavailable" : "Item marked available",
        description: item.isAvailable ? "Item is now hidden from customer menu" : "Item is now visible to customers"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating availability",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-[80px]">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Order:</span>
              <Input
                type="number"
                min="0"
                value={item.displayOrder}
                className="h-8 w-16 text-center"
                disabled
                data-testid={`text-order-${item.id}`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  {item.foodType === "non-veg" ? "🔴" : "🟢"}
                </span>
                <span className="font-semibold">{item.name}</span>
                {!item.isAvailable && <Badge variant="secondary" className="text-xs">Unavailable</Badge>}
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {item.hasVariants ? (
                  <Badge variant="outline" className="text-xs">
                    {variants?.length || 0} Variants
                  </Badge>
                ) : (
                  <span className="text-sm font-bold">₹{item.price}</span>
                )}
                {addOns && addOns.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {addOns.length} Add-ons
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <Switch
                  checked={item.isAvailable}
                  onCheckedChange={(checked) => toggleAvailability.mutate(checked)}
                  data-testid={`switch-availability-${item.id}`}
                />
                <span className="text-xs text-muted-foreground">
                  {item.isAvailable ? "Available" : "Hidden"}
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={onEdit} data-testid={`button-edit-item-${item.id}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteItem.mutate()} data-testid={`button-delete-item-${item.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button size="sm" variant="ghost" data-testid={`button-expand-item-${item.id}`}>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="mt-3 space-y-3">
            {/* Variants */}
            {item.hasVariants && variants && variants.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-2">Variants:</p>
                <div className="space-y-1">
                  {variants.map((variant) => (
                    <div key={variant.id} className="flex items-center justify-between text-sm">
                      <span>{variant.variantName}</span>
                      <span className="font-semibold">
                        ₹{variant.discountedPrice || variant.actualPrice}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {addOns && addOns.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-2">Add-ons:</p>
                <div className="space-y-1">
                  {addOns.map((addOn) => (
                    <div key={addOn.id} className="flex items-center justify-between text-sm">
                      <span>{addOn.addOnName}</span>
                      <span className="font-semibold">+₹{addOn.addOnPrice}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

// Category Form Dialog
function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  properties,
  defaultPropertyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: MenuCategory | null;
  properties: any[];
  defaultPropertyId?: number;
}) {
  const [formData, setFormData] = useState({
    propertyId: category?.propertyId !== undefined ? category.propertyId : (defaultPropertyId || null),
    name: category?.name || "",
    imageUrl: category?.imageUrl || "",
    startTime: category?.startTime || "",
    endTime: category?.endTime || "",
    displayOrder: category?.displayOrder || 0,
    isActive: category?.isActive ?? true,
  });

  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (category) {
        return await apiRequest(`/api/menu-categories/${category.id}`, "PATCH", data);
      } else {
        return await apiRequest("/api/menu-categories", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-categories"] });
      toast({ title: category ? "Category updated" : "Category created" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error saving category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add New Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Property</Label>
            <Select
              value={formData.propertyId?.toString() || "0"}
              onValueChange={(val) =>
                setFormData({ ...formData, propertyId: val === "0" ? null : parseInt(val) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Properties</SelectItem>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id.toString()}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Category Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Breakfast, Main Course"
              required
            />
          </div>

          <div>
            <Label>Image URL (optional)</Label>
            <Input
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
            <Label>Active</Label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

