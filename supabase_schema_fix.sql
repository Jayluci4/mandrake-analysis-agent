-- AIDEV-NOTE: Fixed database schema updates - handles missing user_id column
-- Run these SQL commands in your Supabase SQL editor

-- First, add user_id to conversations table if it doesn't exist
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for user_id on conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Update existing conversations to set user_id from auth context (if needed)
-- This assumes you're logged in as the user who owns these conversations
UPDATE public.conversations 
SET user_id = auth.uid() 
WHERE user_id IS NULL;

-- Now create the sessions table for tracking user sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type VARCHAR(50) CHECK (agent_type IN ('analysis', 'research')),
  model VARCHAR(50),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  query_count INTEGER DEFAULT 0,
  follow_up_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create model_switches table for tracking when users switch models
CREATE TABLE IF NOT EXISTS public.model_switches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id VARCHAR(255) REFERENCES sessions(session_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_model VARCHAR(50),
  to_model VARCHAR(50),
  switched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create error_logs table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  error_type VARCHAR(50),
  error_message TEXT,
  error_details JSONB,
  error_context JSONB,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update conversations table with session tracking columns (safe additions)
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS query_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS initial_query TEXT,
ADD COLUMN IF NOT EXISTS model_switched BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS previous_model VARCHAR(50),
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50),
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Check if messages table has user_id, if not add it
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update messages table with tracking columns
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS query_number INTEGER,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS error_details JSONB,
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

-- Enable Row Level Security for new tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions table
CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for model_switches table
CREATE POLICY "Users can view own model switches" ON public.model_switches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own model switches" ON public.model_switches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for error_logs table
CREATE POLICY "Users can view own errors" ON public.error_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own errors" ON public.error_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for conversations table to use user_id
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for messages table to use user_id
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
CREATE POLICY "Users can insert own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS set_sessions_updated_at ON public.sessions;
CREATE TRIGGER set_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT SELECT ON public.sessions TO authenticated;
GRANT INSERT ON public.sessions TO authenticated;
GRANT UPDATE ON public.sessions TO authenticated;

GRANT SELECT ON public.model_switches TO authenticated;
GRANT INSERT ON public.model_switches TO authenticated;

GRANT SELECT ON public.error_logs TO authenticated;
GRANT INSERT ON public.error_logs TO authenticated;

-- Create a simple view to check if everything is working
CREATE OR REPLACE VIEW public.user_session_summary AS
SELECT 
  s.user_id,
  COUNT(DISTINCT s.session_id) as total_sessions,
  COUNT(DISTINCT c.id) as total_conversations,
  MAX(s.last_activity) as last_active
FROM sessions s
LEFT JOIN conversations c ON s.user_id = c.user_id
WHERE s.user_id = auth.uid()
GROUP BY s.user_id;

-- Grant access to the view
GRANT SELECT ON public.user_session_summary TO authenticated;

-- Final check: Show current user's ID to verify auth is working
SELECT auth.uid() as current_user_id;