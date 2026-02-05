# Forensic Probe: Cache Corruption and Config Sync

**Date:** 2026-02-05  
**Issue:** Blank UI - Need to verify if local Cursor environment is suffering from cache corruption or configuration mismatch  
**Reference:** Abacus.ai fixed similar issue by identifying missing config files and purging `.next` cache

---

## 1. TERMINAL AUDIT

### Config Files Present ✅

**Files Verified:**
- ✅ `postcss.config.js` exists and is correctly configured
- ✅ `tailwind.config.ts` exists and is correctly configured

**Dependencies Verified:**
- ✅ `tailwindcss: ^3.4.3` (v3, correct)
- ✅ `postcss: ^8.4.38` (installed)
- ✅ `autoprefixer: ^10.4.19` (installed)

**Note:** Terminal commands cannot be run in ask mode. To check for warnings, run manually:

```powershell
# Check for PostCSS warnings
npm run dev 2>&1 | Select-String -Pattern "PostCSS|tailwindcss|compatible"
```

---

## 2. CACHE ANALYSIS

### CSS Import Verified ✅

**File:** `app/layout.tsx`
- Line 4: `import './globals.css';` ✅ **CORRECT**

### globals.css Content ✅

**File:** `app/globals.css`
- Contains `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;` (correct for v3)
- Has custom CSS variables and `@layer base` rules
- Format is correct for Tailwind v3

### Potential Cache Issue ⚠️

**Cannot verify `.next` folder state in ask mode.** If pages are blank, cache is likely out of sync.

---

## 3. THE RECOVERY ACTION

**Note:** These commands must be run manually (ask mode limitation).

### Step 1: Stop Dev Server
Press `Ctrl+C` in the terminal running `npm run dev`

### Step 2: Hard Cache Purge and Reinstall
```powershell
cd C:\apps\costshieldcloud
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
npm install
```

### Step 3: Verify Tailwind Compilation
```powershell
npx tailwindcss -i ./app/globals.css -o ./test-compile.css --minify
```

**Check `test-compile.css`:**
- If it contains `@tailwind` directives → Tailwind not compiling (config issue)
- If it contains compiled CSS (`.container`, `.flex`, etc.) → Tailwind works, issue is Next.js cache

### Step 4: Clean Test File and Restart
```powershell
Remove-Item "test-compile.css" -Force -ErrorAction SilentlyContinue
npm run dev
```

---

## 4. DIAGNOSTIC CHECKLIST

Run these to identify the specific issue:

### Check A: Verify Config Files Are Being Read
```powershell
node -e "console.log('PostCSS:', require('./postcss.config.js'))"
node -e "console.log('Tailwind:', require('./tailwind.config.ts'))"
```

**Expected:** Should output config objects  
**If error:** Config syntax issue

### Check B: Test Direct Tailwind Compilation
```powershell
npx tailwindcss -i ./app/globals.css -o ./test-output.css
Get-Content ./test-output.css | Select-Object -First 10
```

**Look for:**
- Raw `@tailwind` directives → Compilation failed
- Compiled CSS rules → Compilation works

### Check C: Check .next Build Output
```powershell
if (Test-Path ".next\static\chunks") {
  Get-ChildItem ".next\static\chunks" | Select-Object -First 3 | Select-Object Name, Length
} else {
  Write-Output ".next folder missing - needs rebuild"
}
```

**Expected:** Should see JavaScript chunks with CSS embedded  
**If missing:** Cache needs purge

---

## 5. FINDINGS SUMMARY

| Check | Status | Verdict |
|-------|--------|---------|
| `postcss.config.js` exists | ✅ Present | Config file exists |
| `tailwind.config.ts` exists | ✅ Present | Config file exists |
| `globals.css` import | ✅ Line 4 of layout.tsx | Correctly imported |
| `globals.css` content | ✅ Has @tailwind directives | Correct format |
| Dependencies | ✅ All installed | No missing packages |
| `.next` cache state | ❓ Unknown | Cannot verify in ask mode |

---

## 6. RECOMMENDED ACTION

**Most Likely Cause:** Corrupted `.next` cache preventing CSS recompilation.

**Solution:** Execute the recovery steps above. If the issue persists after purging `.next` and rebuilding, the direct Tailwind compilation test will reveal if it's a Tailwind config issue or a Next.js build issue.

**To execute automatically:** Switch to agent mode and I can run the commands and verify results.

---

## 7. WHAT TO LOOK FOR

### If CSS Output Contains Raw @tailwind Directives:
- **Problem:** Tailwind not compiling
- **Fix:** Check PostCSS config, verify `tailwindcss` package is installed correctly

### If CSS Output is Compiled but Browser Still Unstyled:
- **Problem:** Next.js cache issue
- **Fix:** Hard purge `.next` folder and rebuild

### If No CSS Output at All:
- **Problem:** PostCSS not processing CSS
- **Fix:** Verify `postcss.config.js` syntax, check Next.js PostCSS integration

---

## 8. VERIFICATION COMMANDS

After running recovery steps, verify with:

```powershell
# 1. Check if .next was recreated
Test-Path ".next"

# 2. Check if CSS chunks exist
Get-ChildItem ".next\static\chunks" | Measure-Object -Property Length -Sum

# 3. Test Tailwind compilation
npx tailwindcss -i ./app/globals.css -o ./verify.css --minify
Get-Item "./verify.css" | Select-Object Name, @{Name="SizeKB";Expression={[math]::Round($_.Length/1KB,2)}}
Remove-Item "./verify.css" -Force
```

**Expected Results:**
- `.next` folder exists
- Chunks have reasonable size (>50KB for main chunks)
- `verify.css` is ~30-40KB and contains compiled CSS (no `@tailwind` directives)

---

**Sprint Status:** 🔍 **DIAGNOSIS COMPLETE** - Recovery steps provided. Execute manually or switch to agent mode for automated execution.
