#!/bin/bash

# Kill process on port 5173 if exists
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start dev server
pnpm dev
