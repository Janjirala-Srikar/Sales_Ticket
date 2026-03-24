# Landing Page Component Structure

## Overview
The LandingPage has been successfully broken down into 8 separate, modular components based on different sections. Each component has its own JSX file and corresponding CSS file.

## Component Breakdown

### 1. **HeroSection** 
- **File**: `src/components/Landing/HeroSection.jsx`
- **CSS**: `src/components/Landing/HeroSection.css`
- **Content**: 
  - Navigation bar (fixed)
  - Hero section with eyebrow, heading, subheading
  - Action buttons
  - Dashboard preview with metrics cards
  - Logo/Integration strip
  - Ticker with scrolling announcements

### 2. **ProblemSection**
- **File**: `src/components/Landing/ProblemSection.jsx`
- **CSS**: `src/components/Landing/ProblemSection.css`
- **Content**:
  - Section heading "The Problem"
  - Two-column grid layout
  - Ticket cards showing what support agents see
  - "Dead zone" showing what doesn't reach other teams

### 3. **SignalSection**
- **File**: `src/components/Landing/SignalSection.jsx`
- **CSS**: `src/components/Landing/SignalSection.css`
- **Content**:
  - Section heading "Four Signal Types"
  - 2x2 grid of signal cards
  - Each card shows: Expansion, Churn Risk, Competitor, Feature Gap
  - Includes examples and descriptions

### 4. **FlowSection**
- **File**: `src/components/Landing/FlowSection.jsx`
- **CSS**: `src/components/Landing/FlowSection.css`
- **Content**:
  - Section heading "How It Works"
  - 5-step horizontal flow diagram
  - Numbered circles with descriptions
  - Connecting line between steps

### 5. **AlertSection**
- **File**: `src/components/Landing/AlertSection.jsx`
- **CSS**: `src/components/Landing/AlertSection.css`
- **Content**:
  - Section heading "The Output"
  - Slack mockup interface showing notifications
  - Feature list with benefits
  - Two-column layout for mockup and description

### 6. **RolesSection**
- **File**: `src/components/Landing/RolesSection.jsx`
- **CSS**: `src/components/Landing/RolesSection.css`
- **Content**:
  - Section heading "Built for every revenue team"
  - 3-column grid of role cards
  - Cards for: Account Executives, Customer Success, Product Management
  - Each card includes title, description, and benefits list

### 7. **StatsSection**
- **File**: `src/components/Landing/StatsSection.jsx`
- **CSS**: `src/components/Landing/StatsSection.css`
- **Content**:
  - 3-column stats grid
  - Large numbers with descriptions
  - Stats: ARR Range, Speed (<60 sec), Zero workflow changes

### 8. **CtaFooter**
- **File**: `src/components/Landing/CtaFooter.jsx`
- **CSS**: `src/components/Landing/CtaFooter.css`
- **Content**:
  - Call-to-action section with email subscription form
  - Footer with company info and copyright

## Main File
- **File**: `src/LandingPage.jsx`
- **Purpose**: Main page component that imports and renders all 8 sections
- **CSS**: `src/LandingPage.css` (contains global animations and utility classes)

## Global Styles & Animations
All sections share:
- **Animations**: `fadeUp`, `ticker`, `float` (defined in LandingPage.css)
- **CSS Variables**: Colors, typography, spacing, shadows (from project's design system)
- **Responsive Design**: All components have mobile breakpoints at 900px

## Responsive Behavior
All components automatically adapt at 900px breakpoint:
- Grids convert to single columns
- Padding adjusts for mobile
- Navigation and footer stack vertically
- Flow steps stack vertically (removing connecting line)

## How It All Works Together
1. **LandingPage.jsx** imports all 8 component files
2. Each component imports its own CSS file
3. Components share global styles from **LandingPage.css**
4. All sections are displayed in order from top to bottom
5. Navigation links anchor to specific section IDs (#how, #signals, #teams, #cta)

## File Structure
```
client/src/
├── LandingPage.jsx (main component)
├── LandingPage.css (global animations & utilities)
└── components/
    └── Landing/
        ├── HeroSection.jsx / HeroSection.css
        ├── ProblemSection.jsx / ProblemSection.css
        ├── SignalSection.jsx / SignalSection.css
        ├── FlowSection.jsx / FlowSection.css
        ├── AlertSection.jsx / AlertSection.css
        ├── RolesSection.jsx / RolesSection.css
        ├── StatsSection.jsx / StatsSection.css
        └── CtaFooter.jsx / CtaFooter.css
```

## Notes
- All CSS is scoped to prevent conflicts
- Each component is self-contained and reusable
- Responsive design is consistent across all sections
- Animations are defined globally for performance
- All original functionality and styling is preserved
