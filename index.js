require('dotenv').config(); // Must run before any module that reads process.env at require time (e.g. utils/logger)
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const z = require('zod');
const note = require("./models/note");
const user = require("./models/user");
const auth = require("./middlewares/auth");
const logger = require("./utils/logger");
const AppError = require("./utils/appError");
const { PrismaClient } = require("./generated/prisma");
const prisma = new PrismaClient();
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY;

app.use(express.json());

// Request logging middleware - logs every request with status and response time
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
        if (res.statusCode >= 500) logger.error(message);
        else if (res.statusCode >= 400) logger.warn(message);
        else logger.http(message);
    });
    next();
});

// Async Wrapper to catch database errors clean without try/catch boilerplate
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// --- VALIDATION SCHEMAS ---
const RegisterSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(50),
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters")
    })
});

const LoginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required")
    })
});

const UpdateUserSchema = z.object({
    body: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid User ID format"),
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        password: z.string().min(8).optional()
    })
});

const NoteSchema = z.object({
    body: z.object({
        title: z.string().min(1, "Title is required").max(200),
        content: z.string().min(1, "Content cannot be empty")
    })
});

const QueryNoteSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default("1"),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default("10"),
        sort: z.string().optional().default("createdAt"),
        order: z.enum(["asc", "desc"]).optional().default("desc"),
        filter: z.record(z.string()).optional().default({})
    })
});

// Generic Validation Middleware
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
        const validationError = new AppError("Validation Error", 400);
        validationError.details = result.error.issues.map(err => ({ field: err.path[1], message: err.message }));
        return next(validationError);
    }
    // Assign converted/sanitized values back safely
    // (req.query/req.params are read-only getters in Express 5, so plain assignment is silently ignored)
    if (result.data.body) req.body = result.data.body;
    if (result.data.query) Object.defineProperty(req, 'query', { value: result.data.query, writable: true, configurable: true, enumerable: true });
    if (result.data.params) Object.defineProperty(req, 'params', { value: result.data.params, writable: true, configurable: true, enumerable: true });
    next();
};

// --- USER ROUTES ---

// Route for registering a new user
app.post("/api/v1/users/register", validate(RegisterSchema), catchAsync(async (req, res) => {
    const { name, email, password } = req.body;

    const existingUser = await user.findOne({ email });
    if (existingUser) {
        throw new AppError("User already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = new user({ name, email, password: hashedPassword }); // Fixed key naming alignment
    await newUser.save();

    res.status(201).json({
        success: true,
        data: { name: newUser.name, email: newUser.email },
        message: "User Registered Successfully"
    });
}));

// Route for logging in a user
app.post("/api/v1/users/login", validate(LoginSchema), catchAsync(async (req, res) => {
    const { email, password } = req.body;

    const existingUser = await user.findOne({ email });
    if (!existingUser) {
        throw new AppError("Invalid email or password", 401); // Secure generic message
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordValid) {
        throw new AppError("Invalid email or password", 401);
    }

    const payload = { id: existingUser._id.toString(), email: existingUser.email, role: existingUser.role || 'user' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    res.status(200).json({
        success: true,
        data: { name: existingUser.name, email: existingUser.email, token },
        message: "User Logged In Successfully"
    });
}));

// Route for updating a user
app.put("/api/v1/users", auth.protect, validate(UpdateUserSchema), catchAsync(async (req, res) => {
    const { id, name, email, password } = req.body;
    const currentUserId = req.user.id;

    // Prevent modification of other profiles unless checking ownership properly
    if (id !== currentUserId) {
        throw new AppError("Unauthorized profile modification attempt", 403);
    }

    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (email) updatedFields.email = email;
    if (password) updatedFields.password = await bcrypt.hash(password, SALT_ROUNDS);

    const updatedUser = await user.findOneAndUpdate({ _id: id }, updatedFields, { new: true }).select("-password");
    if (!updatedUser) {
        throw new AppError("User Not Found", 404);
    }
    res.status(200).json({ success: true, updatedUser, message: "User Updated Successfully" });
}));

// Route for deleting a user
app.delete("/api/v1/users", auth.protect, catchAsync(async (req, res) => {
    const currentUserId = req.user.id; // Avoid route parameters missing entirely from endpoints
    const deletedUser = await user.findOneAndDelete({ _id: currentUserId });
    if (!deletedUser) {
        throw new AppError("User Not Found", 404);
    }
    res.status(200).json({ success: true, message: "User Account Deleted Successfully" });
}));

// --- NOTE ROUTES ---

// Route for creating a new note
app.post("/api/v1/notes", auth.protect, validate(NoteSchema), catchAsync(async (req, res) => {
    const { title, content } = req.body;
    const userId = parseInt(req.user.id, 10);

    const newNote = await prisma.note.create({
        data: {
            title,
            content,
            userId
        }
    });
    res.status(201).json({ success: true, data: newNote, message: "Note Created Successfully" });
}));

// Route for getting all notes with pagination and search
app.get("/api/v1/notes", auth.protect, validate(QueryNoteSchema), catchAsync(async (req, res) => {
    const owner = req.user.id;
    const { page, limit, sort, order, filter } = req.query;
    const skip = (page - 1) * limit;

    // Whitelist query keys to avoid NoSQL injection attempts through filter object
    const queryConditions = { owner };
    if (filter.title) queryConditions.title = { $regex: filter.title, $options: 'i' };
    if (filter.content) queryConditions.content = { $regex: filter.content, $options: 'i' };

    const notes = await note.find(queryConditions)
        .sort({ [sort]: order === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit);

    res.status(200).json({ success: true, count: notes.length, page, limit, notes, message: "Notes Fetched Successfully" });
}));

// Route for getting a note by id
app.get("/api/v1/notes/:id", auth.protect, catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(req.user.id, 10);
    const cacheKey = `note:${id}`;

    // Try to get note from Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
        const parsedNote = JSON.parse(cached);
        // Enforce ownership validation on cached item
        if (parsedNote.userId !== userId) {
            throw new AppError("Note Not Found", 404);
        }
        return res.status(200).json({ success: true, note: parsedNote, fromCache: true, message: "Note Fetched Successfully" });
    }

    // Cache miss - query DB
    const currentNote = await prisma.note.findUnique({
        where: { id: parseInt(id, 10) }
    });
    if (!currentNote || currentNote.userId !== userId) {
        throw new AppError("Note Not Found", 404);
    }

    // Store in cache for 5 minutes (300 seconds TTL)
    await redis.set(cacheKey, JSON.stringify(currentNote), 'EX', 300);

    res.status(200).json({ success: true, note: currentNote, fromCache: false, message: "Note Fetched Successfully" });
}));

// Route for updating a note by id
app.put("/api/v1/notes/:id", auth.protect, validate(NoteSchema), catchAsync(async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const owner = req.user.id;

    const updatedNote = await note.findOneAndUpdate({ _id: id, owner }, { title, content }, { new: true });
    if (!updatedNote) {
        throw new AppError("Note Not Found", 404);
    }
    res.status(200).json({ success: true, updatedNote, message: "Note Updated Successfully" });
}));

// Route for deleting a note by id
app.delete("/api/v1/notes/:id", auth.protect, catchAsync(async (req, res) => {
    const { id } = req.params;
    const owner = req.user.id;
    const deletedNote = await note.findOneAndDelete({ _id: id, owner });
    if (!deletedNote) {
        throw new AppError("Note Not Found", 404);
    }
    res.status(200).json({ success: true, message: "Note Deleted Successfully" });
}));

// Route for basic health check
app.get("/", (req, res) => {
    res.status(200).send("API Server Running");
});

// Catch-all for unknown routes - forwarded to the central error handler
app.use((req, res, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// Global Central Error Interceptor Middleware - every error in the app lands here
app.use((err, req, res, next) => {
    logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });

    let status = err.status || 500;
    let message = err.message || "Internal Server Error";

    // Translate common Mongoose errors into proper client errors
    if (err.name === "CastError") {
        status = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    } else if (err.code === 11000) {
        status = 409;
        message = "Duplicate field value";
    } else if (err.name === "ValidationError") {
        status = 400;
    }

    const dev = process.env.NODE_ENV !== "production";
    res.status(status).json({
        success: false,
        message,
        ...(err.details && { errors: err.details }),
        ...(dev ? { stack: err.stack } : {})
    });
});

// Connecting to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => {
        logger.info('MongoDB Connected');
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        logger.error('Database connection crash:', err);
        process.exit(1);
    });