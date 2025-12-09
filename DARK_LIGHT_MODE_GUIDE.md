╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                  ║
║                    🌓 DARK/LIGHT MODE IMPLEMENTATION GUIDE 🌓                   ║
║                                                                                  ║
║              Complete Theme System with Toggle for Entire Application             ║
║                                                                                  ║
╚════════════════════════════════════════════════════════════════════════════════╝


═════════════════════════════════════════════════════════════════════════════════
                              WHAT WAS IMPLEMENTED
═════════════════════════════════════════════════════════════════════════════════

✅ NEW FILES CREATED:

1. frontend/context/theme-context.tsx
   └─ ThemeContext with useTheme hook
   └─ ThemeProvider wrapper component
   └─ Persists theme preference to localStorage
   └─ Manages dark class on <html> element

2. frontend/components/theme-toggle.tsx
   └─ Reusable theme toggle button component
   └─ Shows Sun icon in dark mode, Moon icon in light mode
   └─ Can be placed in any navbar/header


✅ UPDATED FILES:

1. frontend/app/layout.tsx
   └─ Added ThemeProvider wrapper
   └─ Added suppressHydrationWarning to <html>
   └─ Updated body classes with dark: variants

2. frontend/tailwind.config.ts
   └─ Added darkMode: 'class'
   └─ Now supports Tailwind dark mode

3. frontend/app/dashboard/page.tsx
   └─ Imported useTheme hook
   └─ Added theme toggle button in navbar
   └─ Updated all colors with dark: variants
   └─ Complete light/dark mode styling


═════════════════════════════════════════════════════════════════════════════════
                            HOW DARK/LIGHT MODE WORKS
═════════════════════════════════════════════════════════════════════════════════

ARCHITECTURE:
──────────────

ThemeContext
└─ Provides: { theme, toggleTheme }
└─ Stores: theme preference in localStorage
└─ Manages: 'dark' class on <html> element

ThemeProvider
└─ Wraps entire app (in layout.tsx)
└─ Checks localStorage on mount
└─ Sets default to 'dark' mode

useTheme Hook
└─ Access theme state anywhere
└─ Get toggleTheme() function
└─ Subscribe to theme changes


TAILWIND DARK MODE:
───────────────────

All components use Tailwind's dark: prefix:

  ✓ Light mode: bg-white text-slate-900
  ✓ Dark mode: dark:bg-slate-900 dark:text-white

Example:
  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
    Content adapts based on theme
  </div>


LOCALSTORAGE PERSISTENCE:
──────────────────────────

When user toggles theme:
  1. ThemeProvider calls toggleTheme()
  2. Updates state: 'dark' ↔️ 'light'
  3. Saves to localStorage.setItem('theme', newTheme)
  4. Adds/removes 'dark' class from <html>
  5. Tailwind responds with dark: styles

On page reload:
  1. ThemeProvider useEffect runs on mount
  2. Checks localStorage for saved theme
  3. Applies theme without flash


═════════════════════════════════════════════════════════════════════════════════
                          USING DARK MODE IN YOUR CODE
═════════════════════════════════════════════════════════════════════════════════

OPTION 1: Using useTheme Hook
──────────────────────────────

'use client';

import { useTheme } from '@/context/theme-context';

export function MyComponent() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}


OPTION 2: Using Tailwind Dark Classes (RECOMMENDED)
─────────────────────────────────────────────────

'use client';

export function MyCard() {
  return (
    <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-4 rounded-lg">
      <h2 className="text-lg font-semibold">My Card</h2>
      <p className="text-slate-600 dark:text-slate-400">
        This adapts to light and dark modes automatically!
      </p>
    </div>
  );
}


OPTION 3: Using Theme Toggle Component
──────────────────────────────────────

In your navbar:

import { ThemeToggle } from '@/components/theme-toggle';

export function Navbar() {
  return (
    <nav className="flex items-center justify-between p-4">
      <h1>My App</h1>
      <ThemeToggle />
    </nav>
  );
}


═════════════════════════════════════════════════════════════════════════════════
                         COMMON TAILWIND DARK PATTERNS
═════════════════════════════════════════════════════════════════════════════════

BACKGROUNDS:
────────────

Light Mode              Dark Mode               Pattern
bg-white              dark:bg-slate-900       bg-{light} dark:bg-{dark}
bg-slate-50           dark:bg-slate-800
bg-slate-100          dark:bg-slate-700
bg-slate-200          dark:bg-slate-600


TEXT COLORS:
────────────

Light Mode              Dark Mode               Pattern
text-slate-900        dark:text-white         text-{dark} dark:text-{light}
text-slate-700        dark:text-slate-200
text-slate-600        dark:text-slate-400


BORDERS:
────────

Light Mode              Dark Mode               Pattern
border-slate-200      dark:border-slate-700   border-{light} dark:border-{dark}
border-teal-500       dark:border-teal-400


HOVER STATES:
─────────────

Light Mode              Dark Mode
hover:bg-slate-100    dark:hover:bg-slate-800
hover:text-slate-900  dark:hover:text-white


SHADOWS:
────────

Light Mode              Dark Mode
shadow-sm             dark:shadow-md
shadow-lg             dark:shadow-lg


═════════════════════════════════════════════════════════════════════════════════
                          UPDATING OTHER PAGES
═════════════════════════════════════════════════════════════════════════════════

To add dark mode to login, settings, messaging pages:

STEP 1: Import useTheme hook at top
─────────────────────────────────────

'use client';
import { useTheme } from '@/context/theme-context';

// Then use it:
const { theme, toggleTheme } = useTheme();


STEP 2: Update background classes
──────────────────────────────────

Replace:
  className="bg-slate-50"

With:
  className="bg-white dark:bg-slate-900"


STEP 3: Update text colors
───────────────────────────

Replace:
  className="text-slate-600"

With:
  className="text-slate-600 dark:text-slate-400"


STEP 4: Update all component colors
────────────────────────────────────

Example - Login page:

<div className="
  bg-gradient-to-br 
  from-slate-50 to-slate-100
  dark:from-slate-900 dark:to-slate-800
  min-h-screen
">
  <input className="
    bg-white dark:bg-slate-800 
    text-slate-900 dark:text-white
    border-slate-200 dark:border-slate-700
  " />
</div>


STEP 5: Add theme toggle to navbar (optional)
───────────────────────────────────────────────

import { ThemeToggle } from '@/components/theme-toggle';

<nav className="flex items-center justify-between">
  <h1>My App</h1>
  <ThemeToggle />
</nav>


═════════════════════════════════════════════════════════════════════════════════
                          QUICK COLOR REFERENCE
═════════════════════════════════════════════════════════════════════════════════

LIGHT MODE PALETTE:
─────────────────

Background:   white (#ffffff), slate-50, slate-100
Text:         slate-900, slate-800, slate-700
Borders:      slate-200, slate-300
Accents:      teal-500, teal-600
Icons:        slate-600


DARK MODE PALETTE:
──────────────────

Background:   slate-900, slate-800, slate-950
Text:         white, slate-100, slate-200
Borders:      slate-700, slate-600
Accents:      teal-400, teal-300
Icons:        slate-300, slate-400


RECOMMENDED PAIRS:
──────────────────

Use these combinations for best contrast:

Background         Light Text              Dark Text
white              slate-900, slate-800    (avoid)
slate-50           slate-900, slate-800    (avoid)
slate-900          white, slate-100        (avoid)
slate-800          white, slate-200        (avoid)


═════════════════════════════════════════════════════════════════════════════════
                          TESTING DARK/LIGHT MODE
═════════════════════════════════════════════════════════════════════════════════

1. Navigate to any page with theme toggle
2. Click the Sun/Moon icon in the navbar
3. Page should smoothly transition between themes
4. Reload the page - theme preference should persist
5. Check browser localStorage: should have key "theme" = "dark" or "light"
6. Check <html> element: should have "dark" class in dark mode


BROWSER DEVTOOLS:
──────────────────

Open DevTools (F12) → Elements tab

Light mode <html>:
  <html lang="en">

Dark mode <html>:
  <html lang="en" class="dark">

localStorage:
  Application → Local Storage → http://localhost:3000
  Key: "theme"
  Value: "dark" or "light"


═════════════════════════════════════════════════════════════════════════════════
                          TROUBLESHOOTING
═════════════════════════════════════════════════════════════════════════════════

Issue: Flash of wrong theme on page load
  → Ensure suppressHydrationWarning is on <html> tag
  → Check ThemeProvider useEffect logic
  → Verify localStorage is being checked

Issue: Dark mode not applying
  → Check darkMode: 'class' is in tailwind.config.ts
  → Verify <html> has 'dark' class
  → Make sure dark: prefix is used in className

Issue: Theme doesn't persist
  → Check browser allows localStorage
  → Verify ThemeProvider is wrapping entire app
  → Check localStorage in DevTools

Issue: Toggle button not working
  → Ensure page has 'use client' directive
  → Verify useTheme hook is imported correctly
  → Check theme context is in layout


═════════════════════════════════════════════════════════════════════════════════
                          NEXT STEPS
═════════════════════════════════════════════════════════════════════════════════

Apply dark mode to these pages:

✅ COMPLETED:
  ✓ Dashboard page

📋 TODO:
  □ Login page (/app/login/page.tsx)
  □ Settings page (/app/student/settings/page.tsx)
  □ Messages page (/app/student/messages/page.tsx)
  □ Tutors page (/app/tutors/page.tsx)
  □ All other pages

QUICK UPDATE CHECKLIST:
  □ Add 'use client' if not present
  □ Import useTheme hook
  □ Update background colors with dark: variants
  □ Update text colors with dark: variants
  □ Update border colors with dark: variants
  □ Add ThemeToggle component to navbar
  □ Test light and dark modes
  □ Check localStorage persistence


═════════════════════════════════════════════════════════════════════════════════
                          EXAMPLE: UPDATING SETTINGS PAGE
═════════════════════════════════════════════════════════════════════════════════

BEFORE:
  <div className="bg-white rounded-lg p-6">
    <h3 className="text-xl font-semibold text-gray-900">Settings</h3>
  </div>

AFTER:
  <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm dark:shadow-md">
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
      Settings
    </h3>
  </div>

The dark: prefix tells Tailwind: "use this class only when 'dark' class is on <html>"


═════════════════════════════════════════════════════════════════════════════════

✨ Your entire application now supports beautiful light and dark modes!
   Users can toggle themes and their preference is saved across sessions.

═════════════════════════════════════════════════════════════════════════════════
