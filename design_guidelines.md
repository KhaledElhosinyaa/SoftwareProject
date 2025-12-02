# BU Examination QR Masking System - Design Guidelines

## Design Approach

**Selected Approach:** Design System-Based (Material Design principles)
**Justification:** This is a utility-focused educational administration tool requiring clarity, efficiency, and data-heavy displays. Material Design provides strong visual feedback, excellent form patterns, and robust table/data visualization components perfect for exam management systems.

**Core Principles:**
- Clarity over decoration - information must be immediately scannable
- Hierarchical structure - clear user role separation through layout
- Task-oriented design - each screen optimized for its specific workflow
- Trust and reliability - professional administrative aesthetic

---

## Typography System

**Font Stack:** Inter (primary), system-ui fallback via Google Fonts CDN

**Hierarchy:**
- Page Titles: text-3xl md:text-4xl font-bold
- Section Headers: text-2xl font-semibold
- Card/Component Titles: text-xl font-semibold
- Body Text: text-base font-normal
- Labels/Meta: text-sm font-medium
- Captions/Helper Text: text-xs

---

## Layout & Spacing System

**Tailwind Spacing Units:** Standardize on 4, 6, 8, 12, 16, 24 (as in p-4, mb-6, gap-8, etc.)

**Container Strategy:**
- Dashboard layouts: max-w-7xl mx-auto px-4 md:px-8
- Forms and modals: max-w-2xl
- Data tables: Full-width with horizontal scroll on mobile

**Grid Patterns:**
- Admin dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Exam listings: Single column stack with proper spacing between items

---

## Component Library

### Authentication Pages (Login/Register)
- Centered card layout on neutral background
- Single-column form with max-w-md
- Logo/university branding at top
- Form fields stacked with mb-4
- Primary action button full-width
- Role selector as radio group with visual cards for each role type
- Error messages positioned directly below relevant fields

### Navigation & Header
**Persistent Top Navigation:**
- Fixed header with university branding left, user menu right
- Role badge clearly displayed next to user name
- Logout action in dropdown menu
- Navigation items: horizontal on desktop, hamburger menu on mobile
- Active route indication with underline or background treatment

### Student Portal Components

**Dashboard:**
- Welcome section with student name and current academic term
- Active exams displayed as prominent cards
- Each exam card shows: course name, date/time, status badge, action button
- Card layout: p-6 rounded-lg border with hover elevation
- Empty state with instructional illustration when no active exams

**QR Scanner Interface:**
- Full-width camera viewport with rounded corners
- Overlay guides showing scan area
- Instructions positioned above camera: "Position QR code within the frame"
- Status indicators for: camera loading, scanning, success, error
- Confirmation modal on successful claim with exam details and assigned QR code
- Retry button if scan fails

### Admin Portal Components

**Admin Dashboard:**
- Statistics row at top: Total Exams, Active Sessions, QR Codes Generated, Pending Reveals (4-column grid)
- Each stat card: Large number display, label below, subtle icon
- Quick actions section with primary tasks as button cards
- Recent activity feed in sidebar or bottom section

**Create Exam Form:**
- Progressive disclosure: Basic details → QR generation → Review
- Form sections clearly separated with section headers
- Input fields: Course name, date picker, duration selector (hours/minutes)
- Generate QR codes: Number input with validation, generate button
- Real-time preview of QR count estimation

**QR Code Management:**
- Grid display of generated codes (6-8 per row on desktop)
- Each QR: Image, code value below, status badge
- Bulk actions toolbar: Select all, download PDF, view assignments
- PDF preview modal showing printable layout before download
- Print layout: 4x4 QR grid per page with exam header and page numbers

**Reveal Mapping Interface:**
- Data table with sorting and filtering
- Columns: Student Name, Student Email, QR Code (monospace), Mark, Timestamp
- Search bar above table for quick filtering
- Export CSV button prominently positioned (top-right)
- Summary statistics: Total submissions, average mark, grading completion percentage

### Marker Portal Components

**Marking Dashboard:**
- Two-column layout: QR input/scanner left, mark entry form right
- Alternative input methods: manual QR code entry or webcam scan
- Mark entry form: QR display (read-only), score input (0-100 validation), submit button
- Submitted marks table below with recent entries
- Each entry row: QR code, score, timestamp, edit/delete actions

**Mark Entry List:**
- Filterable table showing all marks for assigned exams
- Grouping by exam session
- Status indicators: Submitted, Pending Review
- Inline editing capability for corrections

---

## Shared UI Patterns

**Cards:** Rounded-lg border with p-6, shadow-sm with hover:shadow-md transition

**Buttons:**
- Primary: Full rounded, px-6 py-3, text-base font-semibold
- Secondary: Outlined variant
- Danger: For delete/critical actions
- Icon buttons: Rounded-full p-2 for compact actions

**Tables:**
- Striped rows for readability
- Sticky headers on scroll
- Responsive: Card layout on mobile, table on desktop
- Row hover states for interactivity

**Modals:**
- Centered overlay with max-w-lg to max-w-4xl depending on content
- Header with title and close button
- Content section with appropriate padding
- Footer with action buttons (right-aligned)

**Form Inputs:**
- Consistent height (h-11) for all text inputs
- Label above input with mb-2
- Placeholder text for guidance
- Error state with border treatment and error message below
- Success state with checkmark icon

**Status Badges:**
- Rounded-full px-3 py-1 text-sm
- Distinct visual treatment for: Active, Completed, Pending, Claimed, Unclaimed

---

## Icons
**Library:** Heroicons (via CDN)
**Usage:** 
- Navigation: 24px icons
- Cards/buttons: 20px icons  
- Inline with text: 16px icons
- All icons should have consistent stroke width

---

## Images

**University Branding:**
- Logo in header (max-h-8 to h-12)
- Optional: Large hero image on login page showing university campus/examination hall (w-full max-h-96 object-cover with overlay for form placement)

**Empty States:**
- Illustration placeholders for "No exams yet", "No marks entered", "Scan your first QR"
- Use placeholder comments for custom illustrations

**QR Codes:**
- Generated dynamically, display at appropriate sizes (128px-256px depending on context)

---

## Responsive Behavior

**Breakpoints Strategy:**
- Mobile-first approach
- Key breakpoints: md (768px), lg (1024px)
- Navigation: Hamburger menu below md
- Tables: Horizontal scroll on mobile, full display on desktop
- Multi-column grids collapse to single column on mobile
- Camera scanner: Full-width on mobile, constrained on desktop