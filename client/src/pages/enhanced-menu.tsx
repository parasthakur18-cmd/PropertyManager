import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, ChevronDown, ChevronUp } from "lucide-react";
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
} from "@/components/ui/dialog";
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
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  const { toast } = useToast();

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
    (cat) => selectedProperty === 0 || cat.propertyId === selectedProperty
  );

  const filteredItems = menuItems?.filter(
    (item) => selectedProperty === 0 || item.propertyId === selectedProperty
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-menu-management">
          Menu Management
        </h1>
        <p className="text-muted-foreground">
          Manage categories, items, variants, and add-ons for your restaurant menu
        </p>
      </div>

      {/* Property Filter */}
      {properties && properties.length > 1 && (
        <div className="mb-6">
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

      {/* Category Form Dialog */}
      <CategoryFormDialog
        open={showCategoryForm}
        onOpenChange={setShowCategoryForm}
        category={selectedCategory}
        properties={properties || []}
        defaultPropertyId={selectedProperty || properties?.[0]?.id}
      />

      {/* Item Form Dialog */}
      <ItemFormDialog
        open={showItemForm}
        onOpenChange={setShowItemForm}
        item={selectedItem}
        category={selectedCategory}
        properties={properties || []}
      />
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
}: {
  category: MenuCategory;
  items: MenuItem[];
  onEditCategory: (cat: MenuCategory) => void;
  onAddItem: () => void;
  onEditItem: (item: MenuItem) => void;
  expandedItems: Set<number>;
  toggleItemExpanded: (id: number) => void;
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
        <div className="flex items-start justify-between">
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
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => onEditItem(item)}
              isExpanded={expandedItems.has(item.id)}
              onToggleExpand={() => toggleItemExpanded(item.id)}
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
}: {
  item: MenuItem;
  onEdit: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
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

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
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
              <Button size="sm" variant="ghost" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteItem.mutate()}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button size="sm" variant="ghost">
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
    propertyId: category?.propertyId || defaultPropertyId || properties[0]?.id || 0,
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
              value={formData.propertyId.toString()}
              onValueChange={(val) =>
                setFormData({ ...formData, propertyId: parseInt(val) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

// Item Form Dialog - Inline Implementation
function ItemFormDialog({
  open,
  onOpenChange,
  item,
  category,
  properties,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  category: MenuCategory | null;
  properties: any[];
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    propertyId: item?.propertyId || category?.propertyId || properties[0]?.id || 0,
    categoryId: item?.categoryId || category?.id || 0,
    name: item?.name || "",
    description: item?.description || "",
    price: item?.price || "0",
    actualPrice: item?.actualPrice || "",
    discountedPrice: item?.discountedPrice || "",
    imageUrl: item?.imageUrl || "",
    foodType: item?.foodType || "veg" as "veg" | "non-veg",
    isAvailable: item?.isAvailable ?? true,
  });

  // Reset form when dialog opens or category changes
  useEffect(() => {
    if (open) {
      setFormData({
        propertyId: item?.propertyId || category?.propertyId || properties[0]?.id || 0,
        categoryId: item?.categoryId || category?.id || 0,
        name: item?.name || "",
        description: item?.description || "",
        price: item?.price || "0",
        actualPrice: item?.actualPrice || "",
        discountedPrice: item?.discountedPrice || "",
        imageUrl: item?.imageUrl || "",
        foodType: item?.foodType || "veg" as "veg" | "non-veg",
        isAvailable: item?.isAvailable ?? true,
      });
    }
  }, [open, item, category, properties]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (item) {
        return await apiRequest(`/api/menu-items/${item.id}`, "PATCH", data);
      } else {
        return await apiRequest("/api/menu-items", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: item ? "Item updated" : "Item created successfully!" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error saving item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up data for database: convert empty strings and zeros to null
    const submitData = {
      ...formData,
      categoryId: formData.categoryId === 0 ? null : formData.categoryId,
      actualPrice: formData.actualPrice === "" ? null : formData.actualPrice,
      discountedPrice: formData.discountedPrice === "" ? null : formData.discountedPrice,
      description: formData.description === "" ? null : formData.description,
      imageUrl: formData.imageUrl === "" ? null : formData.imageUrl,
    };
    saveMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Property *</Label>
              <Select
                value={formData.propertyId.toString()}
                onValueChange={(val) => setFormData({ ...formData, propertyId: parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id.toString()}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category *</Label>
              <Input value={category?.name || "N/A"} disabled />
            </div>
          </div>

          <div>
            <Label>Item Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Masala Dosa"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Delicious dish description..."
              rows={3}
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

          <div>
            <Label>Food Type</Label>
            <Select
              value={formData.foodType}
              onValueChange={(val: "veg" | "non-veg") =>
                setFormData({ ...formData, foodType: val })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="veg">🟢 Vegetarian</SelectItem>
                <SelectItem value="non-veg">🔴 Non-Vegetarian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Base Price (₹) *</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="180"
                required
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAvailable: checked })
                  }
                />
                <Label>Available</Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : item ? "Update Item" : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
