# MediaServe Mobile App & GitHub Hosting Guide

COP Akweteyman Worship Center (AKWC) Media Production Management System

---

## 1. Running as an Android & iOS App

There are **two ways** to run MediaServe on mobile devices:

### Option A: Progressive Web App (PWA) — Already Active & Installed!
The application is now fully configured as a **Progressive Web App (PWA)** with a standalone manifest, service worker caching, and high-resolution icons.

#### On Android:
1. Open the app link in **Google Chrome**.
2. Tap the **"Install App"** button at the top right, or tap the Chrome three-dot menu `⋮` and tap **"Install app"** or **"Add to Home Screen"**.
3. MediaServe will install as an app with its own gold broadcast icon, launch full-screen, and appear in the Android app drawer just like any Google Play app.

#### On iPhone / iPad (iOS):
1. Open the app link in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up at the bottom).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **"Add"** in the top right.
5. MediaServe will appear on your iPhone home screen and run in standalone mode without any browser URL bars!

---

### Option B: Native App Store & Google Play App (Using Capacitor)
If you want to compile native `.apk` files for Android or submit to the **Google Play Store** and **Apple App Store**, you can use **Capacitor**:

```bash
# 1. Install Capacitor CLI & Core
npm install @capacitor/core @capacitor/cli

# 2. Initialize Capacitor
npx cap init "MediaServe" "com.akwc.mediaserve" --web-dir dist

# 3. Add Android and iOS platforms
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios

# 4. Build your web app and sync native platforms
npm run build
npx cap sync

# 5. Open in Android Studio to build APK
npx cap open android

# 6. Open in Xcode (Mac) to build iOS app
npx cap open ios
```

---

## 2. Hosting on GitHub & GitHub Pages

### Step 1: Push Code to a GitHub Repository
Open a terminal in your project directory:

```bash
# 1. Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit of AKWC MediaServe"

# 2. Create a new repository on GitHub (e.g. named 'mediaserve')
# 3. Link remote and push:
git remote add origin https://github.com/<your-github-username>/mediaserve.git
git branch -M main
git push -u origin main
```

---

### Step 2: Enable Free GitHub Pages Hosting
We have already created the automated workflow file at `.github/workflows/deploy.yml`!

1. Go to your repository on GitHub.
2. Click **Settings** → **Pages** (under Code and automation).
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. Every time you push changes to `main`, GitHub Actions will automatically build and deploy your app to:
   ```
   https://<your-github-username>.github.io/mediaserve/
   ```

*(Note: If hosting on a subpath like `/mediaserve/` on GitHub Pages, set `base: '/mediaserve/'` in `vite.config.ts`)*.

---

### Step 3: Alternative 1-Click Free Hosting with Custom Domain
You can also connect your GitHub repository to:
* **Vercel** (`vercel.com`) — Connects in 10 seconds, gives you free HTTPS and fast global CDN.
* **Netlify** (`netlify.com`) — Free hosting with automated GitHub sync on every commit.
* **Cloudflare Pages** (`pages.cloudflare.com`) — Zero cost, unlimited bandwidth.
