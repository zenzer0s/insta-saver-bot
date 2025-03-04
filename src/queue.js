const { REQUEST_STATUS } = require("./constants");
const ContentRequest = require("./models/ContentRequest");
const { log, waitFor } = require("./utils");
const { sendRequestedData } = require("./telegramActions");
const { scrapWithFastDl } = require("./apis");
const Metrics = require("./models/Metrics");
const { Op } = require("sequelize");

// In-memory queue implementation
class SimpleQueue {
  constructor() {
    this.jobs = [];
    this.processing = false;
    this.concurrency = 5;
    this.activeJobs = 0;
  }

  async add(job) {
    this.jobs.push(job);
    log(`Job added to queue: ${job.id}`);
    this.processQueue();
  }

  async processQueue() {
    if (this.processing) return;
    
    this.processing = true;
    
    try {
      while (this.jobs.length > 0 && this.activeJobs < this.concurrency) {
        const job = this.jobs.shift();
        this.activeJobs++;
        
        // Process the job asynchronously
        this.processJob(job).finally(() => {
          this.activeJobs--;
          if (this.activeJobs === 0 && this.jobs.length === 0) {
            this.processing = false;
          }
        });
      }
    } catch (error) {
      log("Error processing queue:", error);
    } finally {
      if (this.jobs.length === 0 && this.activeJobs === 0) {
        this.processing = false;
      }
    }
  }

  async processJob(jobData) {
    const { id, requestUrl, retryCount } = jobData;

    log(`Processing job: ${id}`);

    // Mark the job as PROCESSING in the database
    await ContentRequest.update(
      { 
        status: REQUEST_STATUS.PROCESSING,
        updatedAt: new Date()
      },
      { 
        where: { id: id }
      }
    );

    try {
      const result = await scrapWithFastDl(requestUrl);

      if (!result.success) {
        const newRetryCount = retryCount + 1;

        if (newRetryCount <= 5) {
          await ContentRequest.update(
            {
              status: REQUEST_STATUS.PENDING,
              updatedAt: new Date(),
              retryCount: newRetryCount
            },
            { where: { id: id } }
          );
        } else {
          await ContentRequest.destroy({ where: { id: id } });
          log(`Request document deleted: ${id}`);
        }

        log(`Job ${id} failed. Retry count: ${newRetryCount}`);
        log("Scraping failed");
      } else {
        await waitFor(500);

        // Send requested data
        await sendRequestedData({ ...result.data, ...jobData });

        // Delete document after successful processing
        await ContentRequest.destroy({ where: { id: id } });
        log(`Request document deleted: ${id}`);

        // Find or create metrics record
        const [metrics, created] = await Metrics.findOrCreate({
          where: { id: '1' },
          defaults: {
            id: '1',
            totalRequests: 1,
            [`mediaProcessed_${result.data?.mediaType}`]: 1,
            lastUpdated: new Date()
          }
        });

        if (!created) {
          await metrics.increment('totalRequests');
          await metrics.increment(`mediaProcessed_${result.data?.mediaType}`);
          metrics.lastUpdated = new Date();
          await metrics.save();
        }
        
        log(`Job ${id} completed successfully.`);
      }
    } catch (error) {
      log(`Error processing job ${id}:`, error);

      const newRetryCount = retryCount + 1;

      if (newRetryCount <= 5) {
        await ContentRequest.update(
          {
            status: REQUEST_STATUS.PENDING,
            updatedAt: new Date(),
            retryCount: newRetryCount
          },
          { where: { id: id } }
        );
      } else {
        await ContentRequest.destroy({ where: { id: id } });
        log(`Request document deleted: ${id}`);
      }

      log(`Updated request ${id} for retry. Retry count: ${newRetryCount}`);
    }
  }
}

const requestQueue = new SimpleQueue();

// Fetch pending requests from SQLite and add them to the queue
const fetchPendingRequests = async () => {
  try {
    const pendingRequests = await ContentRequest.findAll({
      where: {
        status: REQUEST_STATUS.PENDING,
        retryCount: { [Op.lt]: 5 }
      },
      order: [['requestedAt', 'ASC']]
    });

    log(`Fetched ${pendingRequests.length} pending requests from DB.`);
    
    for (const request of pendingRequests) {
      // Check if the job is already in the queue
      const jobData = {
        id: request.id.toString(),
        messageId: request.messageId,
        shortCode: request.shortCode,
        requestUrl: request.requestUrl,
        requestedBy: {
          userName: request.requestedBy_userName,
          firstName: request.requestedBy_firstName
        },
        retryCount: request.retryCount,
        chatId: request.chatId,
      };
      
      await requestQueue.add(jobData);
    }
  } catch (error) {
    log("Error fetching pending requests:", error);
  }
};

// Initialize the queue
const initQueue = async () => {
  try {
    await fetchPendingRequests(); // Load pending requests
    log("Queue initialized with pending requests.");

    // Use polling to check for new requests periodically
    setInterval(fetchPendingRequests, 5000); // Check for new requests every 5 seconds
  } catch (error) {
    log("Error initializing queue:", error);
  }
};

module.exports = { initQueue, requestQueue };
