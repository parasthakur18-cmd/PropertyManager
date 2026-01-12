import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, UtensilsCrossed, Search, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type MenuItem, insertMenuItemSchema } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const categories = ["Appetizers", "Main Course", "Desserts", "Beverages", "Snacks", "Breakfast"];

// CSV parsing result type
type ParseResult = {
  items: any[];
  errors: string[];
};

// CSV parsing helper function with validation
function parseCSV(csvText: string): ParseResult {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { items: [], errors: ['CSV file must have headers and at least one data row'] };
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const items: any[] = [];
  const errors: string[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const item: any = {
      name: '',
      category: '',
      price: 0,
      description: '',
      foodType: '',
      preparationTime: null,
      variants: [],
      addOns: [],
      rowErrors: [] as string[],
    };
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      
      switch (header) {
        case 'name':
        case 'item name':
        case 'item':
          item.name = value;
          break;
        case 'category':
          item.category = value;
          break;
        case 'price':
          if (!value) {
            item.rowErrors.push('Price is required');
          } else {
            const parsed = parseFloat(value);
            if (isNaN(parsed) || parsed < 0) {
              item.rowErrors.push(`Invalid price: "${value}"`);
            } else {
              item.price = parsed;
            }
          }
          break;
        case 'description':
          item.description = value;
          break;
        case 'food type':
        case 'foodtype':
        case 'type':
          item.foodType = value;
          break;
        case 'prep time':
        case 'preparation time':
        case 'preptime':
          if (value) {
            const parsed = parseInt(value);
            if (isNaN(parsed) || parsed < 0) {
              item.rowErrors.push(`Invalid prep time: "${value}"`);
            } else {
              item.preparationTime = parsed;
            }
          }
          break;
        case 'variants':
          // Format: "Small:0,Medium:20,Large:40" or "Small|0,Medium|20,Large|40"
          if (value) {
            const variantPairs = value.split(',');
            variantPairs.forEach(pair => {
              const [name, priceModifier] = pair.includes('|') ? pair.split('|') : pair.split(':');
              if (name?.trim()) {
                // Require explicit numeric modifier value
                if (priceModifier === undefined || priceModifier.trim() === '') {
                  item.rowErrors.push(`Missing price modifier for variant "${name.trim()}" (use 0 for no change)`);
                } else {
                  const modifier = parseFloat(priceModifier);
                  if (isNaN(modifier)) {
                    item.rowErrors.push(`Invalid variant price for "${name.trim()}": "${priceModifier}"`);
                  } else {
                    item.variants.push({
                      name: name.trim(),
                      priceModifier: modifier,
                    });
                  }
                }
              }
            });
          }
          break;
        case 'add-ons':
        case 'addons':
        case 'add ons':
          // Format: "Extra Cheese:30,Extra Sauce:20" or "Extra Cheese|30,Extra Sauce|20"
          if (value) {
            const addOnPairs = value.split(',');
            addOnPairs.forEach(pair => {
              const [name, price] = pair.includes('|') ? pair.split('|') : pair.split(':');
              if (name?.trim()) {
                const addOnPrice = parseFloat(price);
                if (!price || isNaN(addOnPrice) || addOnPrice < 0) {
                  item.rowErrors.push(`Invalid add-on price for "${name.trim()}": "${price || 'missing'}"`);
                } else {
                  item.addOns.push({
                    name: name.trim(),
                    price: addOnPrice,
                  });
                }
              }
            });
          }
          break;
      }
    });
    
    // Validate required fields
    if (!item.name) {
      item.rowErrors.push('Name is required');
    }
    
    // Collect errors or add valid item
    if (item.rowErrors.length > 0) {
      errors.push(`Row ${rowNum} (${item.name || 'unnamed'}): ${item.rowErrors.join(', ')}`);
    } else if (item.name) {
      delete item.rowErrors;
      items.push(item);
    }
  }
  
  return { items, errors };
}

// Helper to parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

// Generate CSV template
function generateCSVTemplate() {
  const headers = ['Name', 'Category', 'Price', 'Description', 'Food Type', 'Prep Time', 'Variants', 'Add-ons'];
  const sampleRows = [
    ['Butter Chicken', 'Main Course', '320', 'Creamy butter sauce with tender chicken', 'Non-Veg', '25', 'Half:0,Full:150', 'Extra Butter:30,Extra Gravy:20'],
    ['Paneer Tikka', 'Appetizers', '260', 'Grilled cottage cheese with spices', 'Veg', '20', 'Small:0,Large:80', 'Extra Chutney:15'],
    ['Dal Makhani', 'Main Course', '220', 'Slow cooked black lentils', 'Veg', '15', '', 'Extra Butter:25'],
    ['Mango Lassi', 'Beverages', '80', 'Sweet mango yogurt drink', 'Veg', '5', 'Regular:0,Large:30', ''],
  ];
  
  const csvContent = [headers.join(','), ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  return csvContent;
}

export default function MenuManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      propertyId: 0,
      name: "",
      description: "",
      category: "",
      price: "",
      isAvailable: true,
      preparationTime: 0,
      imageUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/menu-items", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Success",
        description: "Menu item created successfully",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/menu-items/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
      setEditingItem(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/menu-items/${id}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
      setDeletingItem(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: number; isAvailable: boolean }) => {
      return await apiRequest(`/api/menu-items/${id}`, "PATCH", { isAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Success",
        description: "Availability updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data: { items: any[]; propertyId: number | null }) => {
      return await apiRequest("/api/menu-items/bulk-import", "POST", data);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setImportResult(result);
      toast({
        title: "Import Complete",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      
      if (result.errors.length > 0) {
        toast({
          title: `${result.errors.length} row(s) have validation errors`,
          description: "Fix the errors and re-upload, or import the valid items only",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'menu_items_template.csv';
    link.click();
  };

  const handleBulkImport = () => {
    if (parsedItems.length === 0) {
      toast({
        title: "No items to import",
        description: "Please upload a CSV file first",
        variant: "destructive",
      });
      return;
    }
    bulkImportMutation.mutate({ items: parsedItems, propertyId: selectedPropertyId });
  };

  const resetBulkImport = () => {
    setParsedItems([]);
    setParseErrors([]);
    setImportResult(null);
    setSelectedPropertyId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (data: any) => {
    const submitData = {
      ...data,
      price: data.price.toString(),
      preparationTime: data.preparationTime ? parseInt(data.preparationTime) : null,
      imageUrl: data.imageUrl || null,
      description: data.description || null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    form.reset({
      propertyId: item.propertyId,
      name: item.name,
      description: item.description || "",
      category: item.category,
      price: item.price,
      isAvailable: item.isAvailable,
      preparationTime: item.preparationTime || 0,
      imageUrl: item.imageUrl || "",
    });
  };

  const handleToggleAvailability = (item: MenuItem) => {
    toggleAvailabilityMutation.mutate({
      id: item.id,
      isAvailable: !item.isAvailable,
    });
  };

  const filteredItems = menuItems?.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedItems = filteredItems?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif flex items-center gap-2" data-testid="heading-menu-management">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
            Menu Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage menu items, prices, and availability</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)} data-testid="button-bulk-import">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import CSV
          </Button>
          <Dialog open={isAddDialogOpen || !!editingItem} onOpenChange={(open) => {
            if (!open) {
              setIsAddDialogOpen(false);
              setEditingItem(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-item">
                <Plus className="h-4 w-4 mr-2" />
                Add Menu Item
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update the details below" : "Fill in the details to add a new menu item"}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-10rem)] pr-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Paneer Tikka" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g., 250.00"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                          data-testid="input-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Brief description of the item"
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preparationTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preparation Time (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 15"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          data-testid="input-prep-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Available</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          This item will be visible to customers
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-available"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingItem(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingItem
                      ? "Update Item"
                      : "Add Item"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkImportOpen} onOpenChange={(open) => {
        if (!open) {
          resetBulkImport();
        }
        setIsBulkImportOpen(open);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Bulk Import Menu Items
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to add multiple menu items with variants and add-ons at once
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* Property Selection */}
            <div className="space-y-2">
              <Label>Target Property</Label>
              <Select
                value={selectedPropertyId?.toString() || ""}
                onValueChange={(value) => setSelectedPropertyId(value ? parseInt(value) : null)}
              >
                <SelectTrigger data-testid="select-import-property">
                  <SelectValue placeholder="Select property (optional - applies to all items)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Properties</SelectItem>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Download Template */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Download CSV Template</p>
                <p className="text-sm text-muted-foreground">Get a sample file with the correct format</p>
              </div>
              <Button variant="outline" onClick={handleDownloadTemplate} data-testid="button-download-template">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="flex-1"
                  data-testid="input-csv-file"
                />
              </div>
            </div>

            {/* Parse Errors */}
            {parseErrors.length > 0 && !importResult && (
              <Alert className="border-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-destructive">
                  {parseErrors.length} row(s) have validation errors
                </AlertTitle>
                <AlertDescription>
                  <p className="text-sm mb-2">These rows will be skipped. Fix the errors in your CSV and re-upload, or proceed with valid items only.</p>
                  <ScrollArea className="h-32">
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {parseErrors.slice(0, 10).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {parseErrors.length > 10 && (
                        <li>...and {parseErrors.length - 10} more errors</li>
                      )}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview of parsed items */}
            {parsedItems.length > 0 && !importResult && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {parsedItems.length} items ready to import
                </Label>
                <ScrollArea className="h-48 border rounded-lg p-3">
                  <div className="space-y-2">
                    {parsedItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground ml-2">({item.category})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono">₹{item.price}</span>
                          {item.variants.length > 0 && (
                            <Badge variant="secondary">{item.variants.length} variants</Badge>
                          )}
                          {item.addOns.length > 0 && (
                            <Badge variant="outline">{item.addOns.length} add-ons</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <Alert className={importResult.failed > 0 ? "border-amber-500" : "border-green-500"}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Import Complete</AlertTitle>
                <AlertDescription>
                  <p>{importResult.created} items imported successfully</p>
                  {importResult.failed > 0 && (
                    <p className="text-amber-600">{importResult.failed} items failed</p>
                  )}
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                      {importResult.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>...and {importResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* CSV Format Help */}
            <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
              <p className="font-medium mb-1">CSV Format:</p>
              <p>Name, Category, Price, Description, Food Type, Prep Time, Variants, Add-ons</p>
              <p className="mt-1"><strong>Variants format:</strong> Small:0,Medium:20,Large:40</p>
              <p><strong>Add-ons format:</strong> Extra Cheese:30,Extra Sauce:20</p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetBulkImport();
                setIsBulkImportOpen(false);
              }}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            {importResult ? (
              <Button
                onClick={() => {
                  resetBulkImport();
                  setIsBulkImportOpen(false);
                }}
                data-testid="button-done-import"
              >
                Done
              </Button>
            ) : (
              <Button
                onClick={handleBulkImport}
                disabled={parsedItems.length === 0 || bulkImportMutation.isPending}
                data-testid="button-confirm-import"
              >
                {bulkImportMutation.isPending ? "Importing..." : `Import ${parsedItems.length} Items`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Menu Items by Category */}
      <div className="space-y-8">
        {groupedItems && Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-2xl font-bold font-serif mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className={!item.isAvailable ? "opacity-60" : ""} data-testid={`card-item-${item.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant="secondary" className="font-mono">₹{item.price}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.preparationTime && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Prep time: ~{item.preparationTime} min
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-3 p-2 bg-muted/50 rounded">
                      <Label htmlFor={`available-${item.id}`} className="text-sm font-medium cursor-pointer">
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </Label>
                      <Switch
                        id={`available-${item.id}`}
                        checked={item.isAvailable}
                        onCheckedChange={() => handleToggleAvailability(item)}
                        data-testid={`switch-availability-${item.id}`}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-${item.id}`}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingItem(item)}
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {(!groupedItems || Object.keys(groupedItems).length === 0) && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <UtensilsCrossed className="h-16 w-16 text-muted-foreground" />
            <h3 className="text-xl font-semibold">No menu items found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Add your first menu item to get started"}
            </p>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
