const puppeteer = require("puppeteer");
const { log } = require("../utils");

// Create a singleton class for puppeteer browser
class BrowserManager {
  constructor() {
    this.browser = null;
  }

  async Open() {
    if (this.browser) {
      return this.browser;
    }

    try {
      const options = {
        headless: "new", // Use the new headless mode
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          // Additional arguments for stability
          "--disable-extensions",
          "--disable-features=IsolateOrigins",
          "--disable-site-isolation-trials",
          "--disable-web-security", // Be cautious with this in production
        ],
        // Increase timeout
        timeout: 60000,
      };

      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }

      this.browser = await puppeteer.launch(options);
      log("Browser launched successfully");
      return this.browser;
    } catch (error) {
      log("Error launching browser:", error);
      throw error;
    }
  }

  async Close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      log("Browser closed successfully");
    }
  }

  // Method to get the browser instance
  getInstance() {
    return this.browser;
  }
  
  // Method to create a new page with standard settings
  async createPage() {
    if (!this.browser) {
      await this.Open();
    }
    
    const page = await this.browser.newPage();
    
    // Set common page settings
    await page.setViewport({ width: 1280, height: 1024 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    // Set additional headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
    });
    
    return page;
  }
}

// Export a singleton instance
module.exports = new BrowserManager();
