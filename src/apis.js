const puppeteer = require("puppeteer");
const { Browser } = require("./config");
const { log } = require("./utils");

const scrapWithBrowser = async (url) => {
  const browser = Browser.getInstance();
  let page = null;

  try {
    log("Creating a new page for direct Instagram scraping");
    page = await browser.newPage();

    // Attempt to bypass Instagram restrictions
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    });

    log("Navigating to Instagram URL");
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Check if we're on a login page, which means we're being blocked
    const isLoginPage = await page.evaluate(() => {
      return document.querySelector('form') !== null && 
             document.querySelector('input[name="username"]') !== null;
    });

    if (isLoginPage) {
      log("Instagram is showing login page - direct scraping blocked");
      return { success: false };
    }

    // Take a screenshot for debugging (optional)
    await page.screenshot({ path: 'instagram-debug.png' });

    // Wait for content to load
    await page.waitForSelector('img', { timeout: 10000 }).catch(() => {
      log("No images found on the page");
    });

    // Try to extract what we can directly from Instagram
    const data = await page.evaluate(async () => {
      const extractedData = {
        videoSrc: null,
        images: [],
        caption: '',
        username: '',
        profilePic: ''
      };

      // Look for video - multiple selector patterns
      const videoSelectors = [
        'video',
        'video source',
        '[data-testid="videoElement"]',
        'article video'
      ];

      for (const selector of videoSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.src) {
          extractedData.videoSrc = elem.src;
          break;
        }
      }

      // Look for images - collect all that are not tiny icons
      const allImages = Array.from(document.querySelectorAll('img'));
      extractedData.images = allImages
        .filter(img => {
          // Filter out small images like icons
          const rect = img.getBoundingClientRect();
          return img.src && 
                 !img.src.includes('profile_pic') && 
                 rect.width > 100 && 
                 rect.height > 100;
        })
        .map(img => img.src);

      // Look for caption - try multiple common selectors
      const captionSelectors = [
        'article h1', 
        '[data-testid="post-caption"]',
        'article div > span',
        '.caption',
        'article div > div > span',
      ];

      for (const selector of captionSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.textContent) {
          extractedData.caption = elem.textContent.trim();
          break;
        }
      }

      // Get username - try multiple selectors
      const usernameSelectors = [
        'header h2',
        '[data-testid="user-avatar"]',
        'header a',
        'header span'
      ];

      for (const selector of usernameSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          // Extract username from element text or href
          extractedData.username = elem.textContent ? elem.textContent.trim() : '';
          if (!extractedData.username && elem.href) {
            const parts = elem.href.split('/').filter(Boolean);
            extractedData.username = parts[parts.length - 1];
          }
          if (extractedData.username) break;
        }
      }

      // Get profile picture
      const profilePicElem = document.querySelector('header img');
      if (profilePicElem && profilePicElem.src) {
        extractedData.profilePic = profilePicElem.src;
      }

      // Fetch the video content if it's a blob URL
      if (extractedData.videoSrc && extractedData.videoSrc.startsWith('blob:')) {
        const response = await fetch(extractedData.videoSrc);
        const arrayBuffer = await response.arrayBuffer();
        extractedData.videoBuffer = Array.from(new Uint8Array(arrayBuffer)); // Convert to a plain array
      }

      return extractedData;
    });

    // Log what we found for debugging
    log("Data extracted from Instagram page:");
    log(`- Video found: ${data.videoSrc ? 'Yes' : 'No'}`);
    log(`- Images found: ${data.images.length}`);
    log(`- Caption length: ${data.caption.length}`);
    log(`- Username found: ${data.username ? data.username : 'No'}`);

    // Check if we found any media
    if (!data.videoSrc && data.images.length === 0) {
      log("No media found on Instagram page");
      return { success: false };
    }

    // Format the result
    const result = {
      captionText: data.caption || '',
      mediaType: data.videoSrc ? 'GraphVideo' : 'GraphImage',
      mediaUrl: data.videoSrc || (data.images.length > 0 ? data.images[0] : ''),
      displayUrl: data.images.length > 0 ? data.images[0] : '',
      owner_userName: data.username || '',
      owner_fullName: data.username || '',
      owner_avatarUrl: data.profilePic || '',
      mediaList: null,
      mediaBuffer: data.videoBuffer ? Buffer.from(data.videoBuffer) : null // Convert back to Buffer
    };

    if (data.images.length > 1) {
      result.mediaType = 'GraphSidecar';
      result.mediaList = data.images.map(img => ({
        url: img,
        thumbnail: img
      }));
    }

    // Log caption if found
    if (result.captionText) {
      log(`Caption extracted - Length: ${result.captionText.length} chars`);
      log(`Caption preview: ${result.captionText.substring(0, 100)}...`);
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    log("Browser scraping error:", error.message);
    return { success: false };
  } finally {
    if (page) {
      await page.close();
      log("Page closed");
    }
  }
};

// Main function to download content
const scrapWithFastDl = async (url) => {
  // Try browser-based scraping
  log("Attempting browser scraping");
  const result = await scrapWithBrowser(url);

  // Validate the result more thoroughly
  if (result.success && result.data) {
    // Check that we have actual media URLs or buffers
    if (result.data.mediaUrl || result.data.mediaBuffer) {
      log("Media URL or buffer found");
      return result;
    } else {
      log("No valid media URL or buffer in the result");
      return { success: false };
    }
  }

  log("Browser scraping failed");
  return { success: false };
};

module.exports = { scrapWithFastDl };
