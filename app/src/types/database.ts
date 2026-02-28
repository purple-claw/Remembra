// Firebase database types (Firestore is schemaless, but we keep type references for code clarity)
// This file preserves backward compatibility with imports that referenced database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
