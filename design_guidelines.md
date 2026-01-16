# Property Management System - Design Guidelines

## Design Approach

**Selected Approach:** Design System with Brand Customization  
**Primary Reference:** Modern SaaS dashboard patterns (Linear, Notion) combined with mountain resort brand identity  
**Rationale:** This utility-focused application requires efficiency and clarity for managing complex operations, but must reflect the Hostezee mountain resort aesthetic to differentiate from generic property management systems.

---

## Core Design Elements

### A. Color Palette

**Primary Colors:**
- **Mountain Teal:** 186 65% 45% (primary actions, navigation highlights)
- **Sky Blue:** 200 80% 55% (secondary elements, status indicators)
- **Deep Forest:** 160 25% 25% (dark mode backgrounds, headers)

**Neutral Scale:**
- **Light Mode Backgrounds:** 0 0% 98% (main), 0 0% 95% (cards)
- **Dark Mode Backgrounds:** 210 15% 12% (main), 210 15% 16% (cards)
- **Text:** 210 15% 20% (light mode), 0 0% 92% (dark mode)

**Semantic Colors:**
- **Success (Available):** 142 70% 45%
- **Warning (Maintenance):** 38 90% 55%
- **Error (Occupied):** 0 70% 50%
- **Info (Cleaning):** 200 80% 55%

**Accent (Use Sparingly):**
- **Warm Terracotta:** 15 65% 60% (CTAs, important highlights)

### B. Typography

**Font Stack:**
```
Primary: 'Inter' via Google Fonts CDN
Headings: 'Poppins' (600, 700 weights)
Monospace: 'JetBrains Mono' (for data tables, numbers)
```

**Type Scale:**
- **Hero Headings:** text-4xl md:text-5xl, font-bold
- **Page Titles:** text-3xl, font-semibold
- **Section Headers:** text-xl, font-semibold
- **Card Titles:** text-lg, font-medium
- **Body Text:** text-base, font-normal
- **Captions/Labels:** text-sm, font-medium
- **Small Print:** text-xs

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- **Micro spacing:** p-2, gap-2 (tight elements)
- **Component padding:** p-4, p-6 (cards, buttons)
- **Section spacing:** p-8, py-12, py-16 (major sections)
- **Page margins:** px-6 md:px-8 lg:px-12

**Grid System:**
- **Dashboard Layout:** 2-4 column responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- **Data Tables:** Full-width with horizontal scroll on mobile
- **Sidebar Navigation:** 240px fixed width on desktop, slide-over on mobile

**Max Widths:**
- **Full Dashboard:** max-w-screen-2xl
- **Forms/Modals:** max-w-2xl
- **Content Cards:** w-full within grid constraints

---

## D. Component Library

### Navigation & Structure

**Top Navigation Bar:**
- Fixed header with property switcher dropdown (left)
- User profile and notifications (right)
- Height: h-16
- Dark background with subtle border-b
- Brand logo with mountain icon

**Sidebar Navigation:**
- Collapsible menu with icons + labels
- Active state: teal background with rounded corners
- Group sections: Dashboard, Properties, Bookings, Guests, Restaurant, Billing, Reports, Settings
- Footer: Staff status indicator

### Dashboard Cards

**Stat Cards:**
- White/dark card with shadow-sm
- Large number (text-3xl font-bold)
- Label below (text-sm text-gray-600)
- Icon in top-right corner (opacity-20, large size)
- Colored left border (4px) matching stat category
- Hover: slight lift with shadow-md transition

**Chart Cards:**
- Higher card with p-6
- Title row with period selector
- Chart area using Chart.js or similar
- Legend at bottom

### Data Display

**Tables:**
- Striped rows (alternating subtle background)
- Fixed header on scroll
- Action buttons (icon-only) in rightmost column
- Status badges with colored backgrounds
- Pagination at bottom
- Search and filter controls above table

**Room Status Grid:**
- Card layout with room number (large)
- Color-coded status banner at top
- Guest name if occupied
- Quick action buttons (Check-in, Maintenance, Clean)
- 3-4 columns on desktop, 2 on tablet, 1 on mobile

### Forms & Inputs

**Input Fields:**
- Outlined style with rounded-lg borders
- Label above input (text-sm font-medium)
- Focus: teal border and ring
- Dark mode: dark background with lighter borders
- Grouped inputs with gap-4

**Buttons:**
- **Primary:** Teal background, white text, rounded-lg, px-6 py-3
- **Secondary:** Outlined with teal border, teal text
- **Danger:** Red background for destructive actions
- **Icon Buttons:** Square with hover:bg-gray-100 transition

**Select Dropdowns:**
- Custom styled with chevron icon
- Matches input field styling
- Dropdown menu with shadow-lg

### Modals & Overlays

**Modal Dialog:**
- Centered overlay with backdrop blur
- White/dark card with rounded-xl
- Header with title and close button
- Content area with scrolling if needed
- Footer with action buttons (right-aligned)
- Max width: max-w-3xl

**Slide-over Panel:**
- Right-side panel (w-96)
- For quick edits and details
- Smooth slide-in animation

### Status Indicators

**Badges:**
- Rounded-full px-3 py-1
- Small text (text-xs font-medium)
- Colored backgrounds with darker text
- Available: green, Occupied: red, Maintenance: yellow, Cleaning: blue

**Progress Indicators:**
- Linear progress bars for loading states
- Spinner for async operations

---

## E. Restaurant & Kitchen Specific UI

**QR Menu Interface:**
- Full-screen menu with mountain imagery in header
- Category tabs at top
- Menu items as cards with image, name, price
- Add to cart button (sticky bottom bar)
- Cart summary with room auto-detection

**Kitchen Panel:**
- Kanban-style board (Pending → Preparing → Ready → Delivered)
- Order cards with room number, items, time stamp
- Drag-and-drop or button-based status updates
- Sound notification for new orders

---

## Images

**Where to Use Images:**

1. **Login/Welcome Screen:**
   - Full-screen background: Mountain landscape at sunrise/sunset (blurred overlay)
   - Login card centered with transparent backdrop

2. **Dashboard Header:**
   - Subtle mountain silhouette pattern in header background (low opacity)

3. **Empty States:**
   - Illustrated mountains for "No bookings yet" type messages
   - Friendly, minimalist illustration style

4. **Property Cards:**
   - Thumbnail images for each property (aspect-ratio-video, rounded-lg)

5. **QR Menu:**
   - Food item photos (square thumbnails, rounded-lg)
   - Header banner with resort dining area

**Image Style:**
- Natural mountain scenery with warm, inviting tones
- Professional food photography for restaurant items
- Consistent aspect ratios and border-radius throughout

**No Large Hero Image:** This is a utility dashboard, not a marketing page. Focus on functional clarity with subtle brand imagery.

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px (single column, hamburger menu, stacked cards)
- Tablet: 768px-1024px (2 columns, condensed sidebar)
- Desktop: > 1024px (full layout with sidebar)

**Mobile Optimizations:**
- Bottom navigation bar for main sections
- Swipe gestures for table rows to reveal actions
- Collapsible filters and search
- Touch-friendly button sizing (min h-12)

---

## Accessibility & Dark Mode

- Consistent dark mode across ALL components including inputs
- High contrast ratios (WCAG AA minimum)
- Focus indicators on all interactive elements (ring-2 ring-teal-500)
- Keyboard navigation support
- Screen reader labels for icon-only buttons
- Reduced motion support for animations