import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type MenuItem, type MenuItemVariant, type MenuItemAddOn } from "@shared/schema";

const menuItemFormSchema = z.object({
  propertyId: z.number(),
  categoryId: z.number().optional().nullable(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  foodType: z.enum(["veg", "non-veg"]).default("veg"),
  actualPrice: z.string().optional(),
  discountedPrice: z.string().optional(),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().default(true),
  hasVariants: z.boolean().default(false),
  hasAddOns: z.boolean().default(false),
  variants: z.array(z.object({
    variantName: z.string().min(1),
    actualPrice: z.string().min(1),
    discountedPrice: z.string().optional(),
    displayOrder: z.number().default(0),
  })).default([]),
  addOns: z.array(z.object({
    addOnName: z.string().min(1),
    addOnPrice: z.string().min(1),
    displayOrder: z.number().default(0),
  })).default([]),
});

type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

interface EnhancedMenuItemFormProps {
  open: boolean;
  onClose: () => void;
  menuItem?: MenuItem;
  categories?: any[];
  properties?: any[];
  onSave: (data: any, variants: any[], addOns: any[]) => Promise<void>;
}

export function EnhancedMenuItemForm({
  open,
  onClose,
  menuItem,
  categories,
  properties,
  onSave,
}: EnhancedMenuItemFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [showAddOns, setShowAddOns] = useState(false);

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      propertyId: 0,
      categoryId: null,
      name: "",
      description: "",
      foodType: "veg",
      actualPrice: "",
      discountedPrice: "",
      imageUrl: "",
      isAvailable: true,
      hasVariants: false,
      hasAddOns: false,
      variants: [],
      addOns: [],
    },
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const {
    fields: addOnFields,
    append: appendAddOn,
    remove: removeAddOn,
  } = useFieldArray({
    control: form.control,
    name: "addOns",
  });

  // Load menu item data if editing
  useEffect(() => {
    if (menuItem && open) {
      // Fetch existing variants and add-ons
      const loadExistingData = async () => {
        try {
          const [variantsResponse, addOnsResponse] = await Promise.all([
            menuItem.hasVariants 
              ? fetch(`/api/menu-items/${menuItem.id}/variants`).then(r => r.json())
              : Promise.resolve([]),
            menuItem.hasAddOns
              ? fetch(`/api/menu-items/${menuItem.id}/add-ons`).then(r => r.json())
              : Promise.resolve([])
          ]);

          form.reset({
            propertyId: menuItem.propertyId,
            categoryId: menuItem.categoryId,
            name: menuItem.name,
            description: menuItem.description || "",
            foodType: (menuItem.foodType as "veg" | "non-veg") || "veg",
            actualPrice: menuItem.actualPrice || "",
            discountedPrice: menuItem.discountedPrice || "",
            imageUrl: menuItem.imageUrl || "",
            isAvailable: menuItem.isAvailable,
            hasVariants: menuItem.hasVariants,
            hasAddOns: menuItem.hasAddOns,
            variants: variantsResponse.map((v: any) => ({
              variantName: v.variantName,
              actualPrice: v.actualPrice,
              discountedPrice: v.discountedPrice || "",
              displayOrder: v.displayOrder,
            })),
            addOns: addOnsResponse.map((a: any) => ({
              addOnName: a.addOnName,
              addOnPrice: a.addOnPrice,
              displayOrder: a.displayOrder,
            })),
          });
          setShowVariants(menuItem.hasVariants || variantsResponse.length > 0);
          setShowAddOns(menuItem.hasAddOns || addOnsResponse.length > 0);
        } catch (error) {
          console.error("Error loading existing data:", error);
          // Fallback to empty arrays if fetch fails
          form.reset({
            propertyId: menuItem.propertyId,
            categoryId: menuItem.categoryId,
            name: menuItem.name,
            description: menuItem.description || "",
            foodType: (menuItem.foodType as "veg" | "non-veg") || "veg",
            actualPrice: menuItem.actualPrice || "",
            discountedPrice: menuItem.discountedPrice || "",
            imageUrl: menuItem.imageUrl || "",
            isAvailable: menuItem.isAvailable,
            hasVariants: menuItem.hasVariants,
            hasAddOns: menuItem.hasAddOns,
            variants: [],
            addOns: [],
          });
          setShowVariants(menuItem.hasVariants);
          setShowAddOns(menuItem.hasAddOns);
        }
      };

      loadExistingData();
    } else if (!menuItem && open) {
      // New item - reset to defaults
      form.reset({
        propertyId: properties?.[0]?.id || 0,
        categoryId: null,
        name: "",
        description: "",
        foodType: "veg",
        actualPrice: "",
        discountedPrice: "",
        imageUrl: "",
        isAvailable: true,
        hasVariants: false,
        hasAddOns: false,
        variants: [],
        addOns: [],
      });
      setShowVariants(false);
      setShowAddOns(false);
    }
  }, [menuItem, open, form, properties]);

  const handleSubmit = async (data: MenuItemFormData) => {
    setIsSaving(true);
    try {
      // Sanitize item data - convert empty strings to null for optional fields
      const itemData = {
        ...data,
        propertyId: data.propertyId === 0 ? null : data.propertyId, // Convert "All Properties" (0) to null
        actualPrice: data.actualPrice === "" ? null : data.actualPrice,
        discountedPrice: data.discountedPrice === "" ? null : data.discountedPrice,
        description: data.description === "" ? null : data.description,
        imageUrl: data.imageUrl === "" ? null : data.imageUrl,
        categoryId: data.categoryId === 0 ? null : data.categoryId,
        hasVariants: data.variants.length > 0,
        hasAddOns: data.addOns.length > 0,
        price: data.actualPrice || data.variants[0]?.actualPrice || "0",
      };
      
      // Sanitize variants - convert empty strings to null
      const sanitizedVariants = data.variants.map(v => ({
        ...v,
        discountedPrice: v.discountedPrice === "" ? null : v.discountedPrice,
      }));
      
      // Sanitize add-ons (already clean, but for consistency)
      const sanitizedAddOns = data.addOns.map(a => ({
        ...a,
      }));
      
      await onSave(itemData, sanitizedVariants, sanitizedAddOns);
      form.reset();
      setShowVariants(false);
      setShowAddOns(false);
      onClose();
    } catch (error) {
      console.error("Error saving menu item:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-primary">
            {menuItem ? "Edit Item" : "Add Menu Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Property Selection */}
          <div>
            <Label>Property *</Label>
            <Select
              value={form.watch("propertyId")?.toString()}
              onValueChange={(val) => form.setValue("propertyId", parseInt(val))}
            >
              <SelectTrigger data-testid="select-property">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">
                  🌍 All Properties
                </SelectItem>
                {properties?.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id.toString()}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.watch("propertyId") === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                This item will be available in all properties
              </p>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <Label>Category</Label>
            <Select
              value={form.watch("categoryId")?.toString() || ""}
              onValueChange={(val) => form.setValue("categoryId", val ? parseInt(val) : null)}
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  ?.filter((cat) => form.watch("propertyId") === 0 || cat.propertyId === form.watch("propertyId"))
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                      {cat.startTime && ` (${cat.startTime} - ${cat.endTime})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Name */}
          <div>
            <Label>Name of the dish *</Label>
            <Input
              {...form.register("name")}
              placeholder="e.g., Combo 1"
              data-testid="input-item-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label>Description of the dish</Label>
            <Textarea
              {...form.register("description")}
              placeholder="Choice of Stuffed Paratha (2 Nos.) served with Curd, Pickle & Tea or Milk Coffee"
              rows={3}
              data-testid="input-description"
            />
          </div>

          {/* Food Type */}
          <div>
            <Label>Food Type</Label>
            <RadioGroup
              value={form.watch("foodType")}
              onValueChange={(val) => form.setValue("foodType", val as "veg" | "non-veg")}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="veg" id="veg" data-testid="radio-veg" />
                <Label htmlFor="veg" className="cursor-pointer">
                  🟢 Veg
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non-veg" id="non-veg" data-testid="radio-non-veg" />
                <Label htmlFor="non-veg" className="cursor-pointer">
                  🔴 Non-Veg
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Price Fields (only if no variants) */}
          {!showVariants && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Actual Price (₹) *</Label>
                <Input
                  {...form.register("actualPrice")}
                  type="number"
                  step="0.01"
                  placeholder="100"
                  data-testid="input-actual-price"
                />
              </div>
              <div>
                <Label>Discounted Price (₹)</Label>
                <Input
                  {...form.register("discountedPrice")}
                  type="number"
                  step="0.01"
                  placeholder="₹"
                  data-testid="input-discounted-price"
                />
              </div>
            </div>
          )}

          {/* Add Variant Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary/10"
            onClick={() => {
              setShowVariants(true);
              if (variantFields.length === 0) {
                appendVariant({
                  variantName: "",
                  actualPrice: "",
                  discountedPrice: "",
                  displayOrder: 0,
                });
              }
            }}
            data-testid="button-add-variant"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>

          {/* Variants Section */}
          {showVariants && (
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Price Variants *</Label>
              {variantFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Variant Name</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVariant(index)}
                      data-testid={`button-remove-variant-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    {...form.register(`variants.${index}.variantName`)}
                    placeholder="Aloo Paratha Combo"
                    data-testid={`input-variant-name-${index}`}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Actual Price (in ₹)</Label>
                      <Input
                        {...form.register(`variants.${index}.actualPrice`)}
                        type="number"
                        step="0.01"
                        placeholder="300"
                        data-testid={`input-variant-actual-price-${index}`}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Discounted Price (in ₹)</Label>
                      <Input
                        {...form.register(`variants.${index}.discountedPrice`)}
                        type="number"
                        step="0.01"
                        placeholder="₹"
                        data-testid={`input-variant-discounted-price-${index}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => appendVariant({
                  variantName: "",
                  actualPrice: "",
                  discountedPrice: "",
                  displayOrder: variantFields.length,
                })}
                data-testid="button-add-more-variant"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More +
              </Button>
            </div>
          )}

          {/* Add-Ons Button (appears if clicked or has add-ons) */}
          {(!showAddOns && !showVariants) && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-green-500 text-green-600 hover:bg-green-50"
              onClick={() => {
                setShowAddOns(true);
                if (addOnFields.length === 0) {
                  appendAddOn({
                    addOnName: "",
                    addOnPrice: "",
                    displayOrder: 0,
                  });
                }
              }}
              data-testid="button-add-addon"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add-Ons! Click Here 🎉
            </Button>
          )}

          {/* Add-Ons Section */}
          {showAddOns && (
            <div className="space-y-3 border border-green-500 rounded-lg p-4 bg-green-50/50">
              <div className="text-sm text-green-700 font-medium">
                NEW Add-Ons! Click Here 🎉
                <br />
                <span className="font-normal">
                  Provide your customers with the option to add add-ons and make their next meal super delicious!
                </span>
              </div>
              <Label className="text-lg font-semibold">Add-Ons</Label>
              {addOnFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 bg-background space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Add-On</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAddOn(index)}
                      data-testid={`button-remove-addon-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Add-On Name</Label>
                      <Input
                        {...form.register(`addOns.${index}.addOnName`)}
                        placeholder="Masala Tea"
                        data-testid={`input-addon-name-${index}`}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Price (in ₹)</Label>
                      <Input
                        {...form.register(`addOns.${index}.addOnPrice`)}
                        type="number"
                        step="0.01"
                        placeholder="1"
                        data-testid={`input-addon-price-${index}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => appendAddOn({
                  addOnName: "",
                  addOnPrice: "",
                  displayOrder: addOnFields.length,
                })}
                data-testid="button-add-more-addon"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More +
              </Button>
            </div>
          )}

          {/* Form Actions */}
          <DialogFooter className="gap-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-green-500 text-white hover:bg-green-600"
              data-testid="button-save"
            >
              {isSaving ? "Saving..." : "SAVE"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={() => {
                form.reset();
                setShowVariants(false);
                setShowAddOns(false);
                onClose();
              }}
              data-testid="button-delete"
            >
              DELETE
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
