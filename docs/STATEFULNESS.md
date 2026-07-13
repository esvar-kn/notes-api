# Notes API — Statefulness & Scaling Analysis

When scaling the Notes API to run 3 instances behind a load balancer, any state kept locally within the application memory or local filesystem will cause issues. Below are the specific areas in the current implementation (`index.js` and `utils/logger.js`) where state is stored locally, why it will break, and how to address it.

---

## 1. In-Memory Rate Limiting (`index.js`)

### Current Code
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                 // limit each IP to 100 requests per window
    message: { success: false, message: 'Too many requests, try again later.' }
});
app.use('/api/', apiLimiter);
```

### Why it Breaks
By default, `express-rate-limit` uses a local `MemoryStore` to track client request counts. When scaling to 3 load-balanced instances:
- **Inconsistent rate limits:** A client's requests are spread across 3 instances. The client could theoretically send up to 300 requests in 15 minutes (100 to each instance) instead of the intended limit of 100.
- **Erratic behavior:** If client requests are distributed dynamically (e.g. least connections or round-robin), their IP hit count on a single instance might not increment linearly, leading to unpredictable, hard-to-debug "Too many requests" errors when one instance fills up before others.

### Solution
Configure `express-rate-limit` to use a external shared cache store. Since Redis is already connected to our API, we can use the `rate-limit-redis` package to store hit counters centrally in Redis.

---

## 2. In-Process/Local Logging to Files (`utils/logger.js`)

### Current Code
```javascript
const logger = winston.createLogger({
    // ...
    transports: [
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: fileFormat(),
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: fileFormat()
        }),
    ],
});
```

### Why it Breaks
The `winston` logger writes error logs to `logs/error.log` and general logs to `logs/combined.log` on the local file system.
- **Log fragmentation:** If the 3 instances run in isolated containers or distinct physical nodes, logs will be split across three separate local filesystems. To debug a user request, an engineer would have to fetch and search log files across three independent servers.
- **File lock & race conditions:** If the instances share a single mounted volume containing the log files, concurrent writes from multiple processes will cause log interleaving, race conditions, file locks, or output corruption.

### Solution
In a containerized or horizontally scaled environment, application instances should treat logs as event streams. They should write log output directly to `stdout`/`stderr` (using `Console` transport), and a log shipper or daemon (e.g., Fluentd, Filebeat, or AWS CloudWatch agent) running on the host/cluster should capture and aggregate those streams into a centralized log management platform (like Elasticsearch, Loki, or Datadog).

---

## 3. Database Connection Pools (`index.js`)

### Current Code
```javascript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const redis = new Redis(process.env.REDIS_URL);
```

### Why it Breaks
Each of the 3 instances will initialize its own database connection pools (via `pg.Pool` / Prisma) and its own persistent TCP connection to Redis.
- **Connection limit exhaustion:** If the database (PostgreSQL) is configured with a low max connection limit (e.g., 100 connections), and each of the 3 API instances has a default pool size of 20 connections, we will consume 60 connections just for general traffic. Scaling further could easily saturate the database's max allowed connections.

### Solution
- Carefully tune pool sizes (e.g., specify `max: 10` or lower on each client pool).
- If connection exhaustion remains an issue, introduce a connection pooler like **PgBouncer** in front of PostgreSQL to manage and reuse connections efficiently across all instances.
