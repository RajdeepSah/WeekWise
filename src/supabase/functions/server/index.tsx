import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-4d2ff195/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH ENDPOINTS ====================

// Student signup
app.post("/make-server-4d2ff195/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: 'student' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (authError) {
      console.log(`Error creating user during signup: ${authError.message}`);
      return c.json({ error: authError.message }, 400);
    }

    // Store user profile in KV store
    await kv.set(`users:${authData.user.id}`, {
      id: authData.user.id,
      email,
      name,
      role: 'student',
      createdAt: new Date().toISOString()
    });

    return c.json({ 
      success: true, 
      user: { id: authData.user.id, email, name, role: 'student' }
    });
  } catch (error) {
    console.log(`Error in signup endpoint: ${error}`);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// Admin signup
app.post("/make-server-4d2ff195/admin/signup", async (c) => {
  try {
    const { email, password, name, adminSecret } = await c.req.json();
    
    // Simple admin secret validation (you can change this)
    if (adminSecret !== 'admin123') {
      return c.json({ error: 'Invalid admin secret' }, 403);
    }

    if (!email || !password || !name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Create admin user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: 'admin' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (authError) {
      console.log(`Error creating admin during admin signup: ${authError.message}`);
      return c.json({ error: authError.message }, 400);
    }

    // Store admin profile in KV store
    await kv.set(`users:${authData.user.id}`, {
      id: authData.user.id,
      email,
      name,
      role: 'admin',
      createdAt: new Date().toISOString()
    });

    return c.json({ 
      success: true, 
      user: { id: authData.user.id, email, name, role: 'admin' }
    });
  } catch (error) {
    console.log(`Error in admin signup endpoint: ${error}`);
    return c.json({ error: 'Admin signup failed' }, 500);
  }
});

// Get user profile
app.get("/make-server-4d2ff195/user", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      console.log(`Error getting user: ${error?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`users:${user.id}`);
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    return c.json({ user: userProfile });
  } catch (error) {
    console.log(`Error in get user endpoint: ${error}`);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

// ==================== SUBJECT ENDPOINTS ====================

// Create subject (admin only)
app.post("/make-server-4d2ff195/admin/subjects", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`users:${user.id}`);
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { name, description } = await c.req.json();
    if (!name) {
      return c.json({ error: 'Subject name is required' }, 400);
    }

    const subjectId = `subject_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const subject = {
      id: subjectId,
      name,
      description: description || '',
      createdAt: new Date().toISOString()
    };

    await kv.set(`subjects:${subjectId}`, subject);

    return c.json({ success: true, subject });
  } catch (error) {
    console.log(`Error creating subject: ${error}`);
    return c.json({ error: 'Failed to create subject' }, 500);
  }
});

// Get all subjects
app.get("/make-server-4d2ff195/subjects", async (c) => {
  try {
    const subjects = await kv.getByPrefix('subjects:');
    return c.json({ subjects });
  } catch (error) {
    console.log(`Error getting subjects: ${error}`);
    return c.json({ error: 'Failed to get subjects' }, 500);
  }
});

// Delete subject (admin only)
app.delete("/make-server-4d2ff195/admin/subjects/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`users:${user.id}`);
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const subjectId = c.req.param('id');
    await kv.del(`subjects:${subjectId}`);

    // Also delete all weeks for this subject
    const weeks = await kv.getByPrefix(`weeks:${subjectId}:`);
    for (const week of weeks) {
      await kv.del(`weeks:${subjectId}:${week.id}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting subject: ${error}`);
    return c.json({ error: 'Failed to delete subject' }, 500);
  }
});

// ==================== WEEK ENDPOINTS ====================

// Create week (admin only)
app.post("/make-server-4d2ff195/admin/weeks", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`users:${user.id}`);
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { subjectId, weekNumber, title, videoLinks, audioLinks, pdfLinks, questions, published } = await c.req.json();
    
    if (!subjectId || !weekNumber || !title) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const weekId = `week_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const week = {
      id: weekId,
      subjectId,
      weekNumber,
      title,
      videoLinks: videoLinks || [],
      audioLinks: audioLinks || [],
      pdfLinks: pdfLinks || [],
      questions: questions || [],
      published: published || false,
      createdAt: new Date().toISOString()
    };

    await kv.set(`weeks:${subjectId}:${weekId}`, week);

    return c.json({ success: true, week });
  } catch (error) {
    console.log(`Error creating week: ${error}`);
    return c.json({ error: 'Failed to create week' }, 500);
  }
});

// Update week (admin only)
app.put("/make-server-4d2ff195/admin/weeks/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`users:${user.id}`);
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const weekId = c.req.param('id');
    const updates = await c.req.json();

    // Find the week
    const allWeeks = await kv.getByPrefix('weeks:');
    const week = allWeeks.find(w => w.id === weekId);
    
    if (!week) {
      return c.json({ error: 'Week not found' }, 404);
    }

    const updatedWeek = { ...week, ...updates };
    await kv.set(`weeks:${week.subjectId}:${weekId}`, updatedWeek);

    return c.json({ success: true, week: updatedWeek });
  } catch (error) {
    console.log(`Error updating week: ${error}`);
    return c.json({ error: 'Failed to update week' }, 500);
  }
});

// Delete week (admin only)
app.delete("/make-server-4d2ff195/admin/weeks/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`users:${user.id}`);
    if (!userProfile || userProfile.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const weekId = c.req.param('id');

    // Find and delete the week
    const allWeeks = await kv.getByPrefix('weeks:');
    const week = allWeeks.find(w => w.id === weekId);
    
    if (!week) {
      return c.json({ error: 'Week not found' }, 404);
    }

    await kv.del(`weeks:${week.subjectId}:${weekId}`);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting week: ${error}`);
    return c.json({ error: 'Failed to delete week' }, 500);
  }
});

// Get weeks for a subject
app.get("/make-server-4d2ff195/weeks/:subjectId", async (c) => {
  try {
    const subjectId = c.req.param('subjectId');
    const weeks = await kv.getByPrefix(`weeks:${subjectId}:`);
    
    // Sort by week number
    weeks.sort((a, b) => a.weekNumber - b.weekNumber);

    return c.json({ weeks });
  } catch (error) {
    console.log(`Error getting weeks: ${error}`);
    return c.json({ error: 'Failed to get weeks' }, 500);
  }
});

// ==================== PROGRESS ENDPOINTS ====================

// Save progress
app.post("/make-server-4d2ff195/progress", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { weekId, completed } = await c.req.json();
    
    const progress = {
      userId: user.id,
      weekId,
      completed: completed || false,
      lastAccessed: new Date().toISOString()
    };

    await kv.set(`progress:${user.id}:${weekId}`, progress);

    return c.json({ success: true, progress });
  } catch (error) {
    console.log(`Error saving progress: ${error}`);
    return c.json({ error: 'Failed to save progress' }, 500);
  }
});

// Get user progress
app.get("/make-server-4d2ff195/progress", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const progress = await kv.getByPrefix(`progress:${user.id}:`);

    return c.json({ progress });
  } catch (error) {
    console.log(`Error getting progress: ${error}`);
    return c.json({ error: 'Failed to get progress' }, 500);
  }
});

Deno.serve(app.fetch);