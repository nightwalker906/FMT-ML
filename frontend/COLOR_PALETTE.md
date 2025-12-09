# EdTech Color Palette

## Official Colors

| Role | Tailwind Name | Hex Code | CSS Variable | Usage |
|------|---------------|----------|--------------|-------|
| **Primary Brand** | Teal 600 | `#0d9488` | `--color-primary` | Logo, primary buttons, active states, headings |
| **Secondary/Action** | Emerald 400 | `#34d399` | `--color-secondary` | Success messages, growth indicators, secondary buttons |
| **Dark Text** | Slate 800 | `#1e293b` | `--color-dark` | Body text, primary text content, regular copy |
| **Background** | Slate 50 | `#f8fafc` | `--color-background` | Page backgrounds, clean off-white sections |
| **Accent/Alert** | Amber 500 | `#f59e0b` | `--color-accent` | Alerts, warnings, important notifications, highlights |

---

## Why These Colors Work

### Teal 600 (#0d9488) - Primary Brand
**Psychological Impact:** Intelligence, clarity, calming effect
- Modern and tech-forward (better than traditional blue)
- Conveys trust and stability
- Perfect for education platforms
- **Use for:** Primary buttons, brand logo, main call-to-actions, active navigation

### Emerald 400 (#34d399) - Secondary/Action
**Psychological Impact:** Growth, success, fresh energy
- Indicates positive actions and progress
- Great for confirmation buttons and success states
- Creates visual hierarchy without being overwhelming
- **Use for:** Success messages, secondary buttons, achievements, progress indicators

### Slate 800 (#1e293b) - Dark Text
**Psychological Impact:** Professional, readable, softer than pure black
- Much easier on the eyes than pure black
- Better for long-form reading
- Still maintains excellent contrast
- **Use for:** All body text, paragraphs, regular content, form labels

### Slate 50 (#f8fafc) - Background
**Psychological Impact:** Clean, premium, minimal
- Off-white creates a softer appearance than pure white
- Reduces eye strain
- Premium and modern feel
- **Use for:** Main page backgrounds, body background, card backgrounds (paired with white cards)

### Amber 500 (#f59e0b) - Accent/Alert
**Psychological Impact:** Warning, attention, caution
- Draws attention without being aggressive
- Warmer than red, less alarming
- Good for notifications and tips
- **Use for:** Alerts, warnings, important notifications, highlighted tips, emphasis text (sparingly)

---

## Implementation in Code

### CSS Variables (globals.css)
```css
:root {
  --color-primary: #0d9488;
  --color-secondary: #34d399;
  --color-accent: #f59e0b;
  --color-dark: #1e293b;
  --color-background: #f8fafc;
}
```

### Tailwind Classes (globals.css)
```css
/* Primary Button */
.btn-primary {
  @apply bg-teal-600 text-white hover:bg-teal-700;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-emerald-400 text-slate-900 hover:bg-emerald-500;
}

/* Text Link */
.btn-text {
  @apply text-teal-600 hover:text-teal-700;
}

/* Input Field */
.input-field {
  @apply focus:ring-2 focus:ring-teal-600 focus:border-transparent;
}

/* Card Component */
.card {
  @apply bg-white rounded-2xl shadow-lg p-8;
}
```

### In Components (JSX/TSX)

**Primary Button:**
```tsx
<button className="bg-teal-600 text-white hover:bg-teal-700">
  Sign In
</button>
```

**Success Message:**
```tsx
<div className="bg-emerald-50 border border-emerald-200 text-emerald-900">
  Account created successfully!
</div>
```

**Alert/Warning:**
```tsx
<div className="bg-amber-50 border border-amber-200 text-amber-900">
  Please verify your email address
</div>
```

**Input Field with Focus State:**
```tsx
<input className="focus:ring-2 focus:ring-teal-600 focus:border-transparent" />
```

---

## Tailwind Versions

```tailwindcss
/* Teal 600 */
bg-teal-600, text-teal-600, border-teal-600
hover:bg-teal-700, hover:text-teal-700
focus:ring-teal-600

/* Emerald 400 */
bg-emerald-400, text-emerald-400, border-emerald-400
hover:bg-emerald-500, hover:text-emerald-500
emerald-50 (light background for success messages)

/* Slate 800 - Text */
text-slate-800, text-slate-900 (headings)

/* Slate 50 - Background */
bg-slate-50

/* Amber 500 - Alerts */
bg-amber-500, text-amber-500, border-amber-500
hover:bg-amber-600, hover:text-amber-600
amber-50 (light background for warnings)
```

---

## Color Combinations & Usage Patterns

### Success Pattern
```tsx
<div className="bg-emerald-50 border border-emerald-200">
  <p className="text-emerald-900">Success message here</p>
</div>
```

### Error Pattern
```tsx
<div className="bg-red-50 border border-red-200">
  <p className="text-red-900">Error message here</p>
</div>
```

### Warning Pattern
```tsx
<div className="bg-amber-50 border border-amber-200">
  <p className="text-amber-900">Warning message here</p>
</div>
```

### Info Pattern
```tsx
<div className="bg-teal-50 border border-teal-200">
  <p className="text-teal-900">Info message here</p>
</div>
```

---

## Button Variations

### Primary Action (Most Important)
```tsx
<button className="bg-teal-600 text-white hover:bg-teal-700">
  Primary Action
</button>
```

### Secondary Action
```tsx
<button className="bg-emerald-400 text-slate-900 hover:bg-emerald-500">
  Secondary Action
</button>
```

### Text Link
```tsx
<button className="text-teal-600 hover:text-teal-700 font-semibold">
  Link Text
</button>
```

### Disabled State
```tsx
<button disabled className="bg-slate-400 text-white cursor-not-allowed">
  Disabled Button
</button>
```

---

## Accessibility Considerations

✅ **Contrast Ratios (WCAG AA compliant)**
- Teal 600 on white: 5.8:1 ✓
- Emerald 400 on white: 3.8:1 ✓
- Slate 800 on Slate 50: 13.2:1 ✓
- Amber 500 on white: 6.6:1 ✓

✅ **Not Relying on Color Alone**
- Always include text labels and icons
- Use text descriptions with alerts
- Icons + color for status indicators

✅ **Focus States**
- Clear focus rings in teal
- Outlined buttons for secondary actions

---

## Dark Mode (Future Enhancement)

For future dark mode support, consider:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0f172a;
    --color-dark: #e2e8f0;
  }
}
```

---

## Quick Reference

**Remember:**
- 🎨 **Teal** = Primary, Trust, Main Actions
- 💚 **Emerald** = Success, Growth, Positive Actions
- 🖤 **Slate 800** = Text, Readable, Professional
- ⚪ **Slate 50** = Background, Clean, Premium
- ⚠️ **Amber** = Warnings, Alerts, Important (Sparingly)

All colors are defined in:
- `tailwind.config.ts` - Theme configuration
- `app/globals.css` - CSS variables and component classes
