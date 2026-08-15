# TTfinder
TikTok Account Country Identification Tool  An automated OSINT tool that detects the primary country or region of any TikTok account by its username. It analyzes public profile metadata, CDN video hosting origins, and regional parameters without requiring private API access or password authentication.
# TikTok Account Country Identifier 🌍

A lightweight, automated OSINT tool and script designed to identify the primary registered country or operational region of any TikTok account using its public `@username`.

---

## 📌 Overview

This tool fetches and analyzes publicly available metadata from TikTok user profiles and video delivery endpoints without requiring private credentials, account login, or paid third-party API keys. 

It is ideal for OSINT researchers, digital marketers, and developers who need quick region detection for targeted analytics or user segmentation.

---

## ✨ Key Features

* **Username Lookup:** Detects country and region metadata directly via public profile parameters (`@username`).
* **CDN Server Analysis:** Fallback detection based on Content Delivery Network (CDN) origins of recent video uploads.
* **No Authentication Required:** Operates entirely on public Web endpoints without login credentials.
* **Fast & Lightweight:** Easy to integrate into automation scripts or Telegram bots.

---

## ⚡ Quick Start (Start with CDN)

You can include the pre-compiled browser build directly in your HTML project via CDN:

```html
<!-- Include via jsDelivr CDN -->
<script src="[https://cdn.jsdelivr.net/npm/tiktok-country-identifier/dist/index.min.js](https://cdn.jsdelivr.net/npm/tiktok-country-identifier/dist/index.min.js)"></script>

<script>
  // Quick initialization example
  TikTokRegion.getCountry('username')
    .then(data => console.log(data))
    .catch(err => console.error(err));
</script>