# Simple Offline Setup Guide

## What This Does
Downloads Tailwind CSS to your computer so the UI stays perfect even when offline.

## Steps

### 1. Download Tailwind CSS
Run this command (requires internet):
```bash
download-tailwind.bat
```

This downloads Tailwind CSS (~3MB) to `public/tailwind.min.css`

### 2. That's It!
Your app now works offline. The UI will stay exactly the same.

## How It Works

**Before:**
- index.html loads: `<script src="https://cdn.tailwindcss.com"></script>`
- Requires internet
- UI breaks offline

**After:**
- index.html loads: `<link rel="stylesheet" href="/tailwind.min.css">`
- File is local
- UI works offline

## Testing

1. Run `dev.bat` or `preview.bat`
2. Open the app
3. Disconnect internet
4. Refresh page
5. UI should look exactly the same!

## File Locations

- Tailwind CSS: `websiste/public/tailwind.min.css`
- HTML reference: `websiste/index.html` (line 12)
- Service worker cache: `websiste/service-worker.js` (includes tailwind.min.css)

## Troubleshooting

**If download fails:**
- Check internet connection
- Try running as administrator
- Manually download from: https://cdn.tailwindcss.com/3.4.1/tailwind.min.css
- Save to: `websiste/public/tailwind.min.css`

**If UI still breaks offline:**
- Make sure `public/tailwind.min.css` exists
- Check file size (should be ~3MB)
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
