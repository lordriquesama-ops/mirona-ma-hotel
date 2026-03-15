# 🔧 Fix PowerShell Execution Policy Error

## The Error

```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because 
running scripts is disabled on this system.
```

This is a Windows PowerShell security restriction.

## ✅ Quick Solutions

### Solution 1: Use the Batch File (Easiest)

Just double-click or run:
```
START_DEV_SERVER.bat
```

This bypasses PowerShell entirely!

### Solution 2: Use CMD Instead of PowerShell

1. Open **Command Prompt** (not PowerShell)
   - Press `Win + R`
   - Type `cmd`
   - Press Enter

2. Navigate to your project:
   ```cmd
   cd C:\Users\lordrique\Documents\mcp1\websiste
   ```

3. Run the command:
   ```cmd
   npm run dev
   ```

### Solution 3: Fix PowerShell Policy (Permanent)

**Option A: For Current User Only (Recommended)**

1. Open PowerShell as Administrator
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)"

2. Run this command:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. Type `Y` and press Enter

4. Now `npm run dev` will work!

**Option B: Bypass for Single Command**

```powershell
powershell -ExecutionPolicy Bypass -Command "npm run dev"
```

## 🎯 Recommended Approach

**Use the batch file**: `START_DEV_SERVER.bat`

It's the simplest and doesn't require changing system settings.

## 📋 All Available Start Methods

### Method 1: Batch File (Easiest)
```
Double-click: START_DEV_SERVER.bat
```

### Method 2: Command Prompt
```cmd
cd websiste
npm run dev
```

### Method 3: PowerShell (After fixing policy)
```powershell
cd websiste
npm run dev
```

### Method 4: Git Bash (If installed)
```bash
cd websiste
npm run dev
```

## 🔍 Verify It's Working

After starting the server, you should see:
```
VITE v6.2.0  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Then open: http://localhost:5173/

## ⚠️ About Execution Policies

### What They Are
Windows PowerShell execution policies control which scripts can run:
- **Restricted**: No scripts (default on some systems)
- **RemoteSigned**: Local scripts OK, downloaded need signature
- **Unrestricted**: All scripts OK (not recommended)

### Why This Happens
- npm uses PowerShell scripts on Windows
- Your system blocks unsigned scripts
- This is a security feature

### Is It Safe to Change?
Yes, `RemoteSigned` is safe:
- ✅ Allows local scripts (like npm)
- ✅ Still protects against downloaded malicious scripts
- ✅ Recommended by Microsoft for developers

## 🎉 After Fixing

You'll be able to run:
- ✅ `npm run dev`
- ✅ `npm install`
- ✅ `npm run build`
- ✅ Any npm command

## 📞 Quick Reference

| Method | Command | Notes |
|--------|---------|-------|
| Batch File | `START_DEV_SERVER.bat` | Easiest |
| CMD | `npm run dev` | Simple |
| PowerShell | Fix policy first | Permanent |
| Git Bash | `npm run dev` | If installed |

---

**Recommended**: Use `START_DEV_SERVER.bat` - it just works! ✅
