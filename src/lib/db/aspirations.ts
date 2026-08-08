/**
 * Aspirations repository.
 *
 * All persistence for the public aspiration form goes through this module
 * so we can swap Supabase for another store in V2 without touching the API
 * layer or the UI.
 */
import "server-only";

import { getSupabaseAdmin } from "./client";

export type AspirationStatus = "new" | "reviewed" | "in_progress" | "done" | "archived";

export interface Aspiration {
  caseId: string;
  topic: string;
  message: string;
  anonymous: boolean;
  status: AspirationStatus;
  createdAt: string; // ISO
}

export interface CreateAspirationInput {
  caseId: string;
  topic: string;
  message: string;
  anonymous: boolean;
}

export async function insertAspiration(
  input: CreateAspirationInput,
): Promise<Aspiration> {
  const supabase = getSupabaseAdmin();

  const row = {
    case_id: input.caseId,
    topic: input.topic,
    message: input.message,
    anonymous: input.anonymous,
    status: "new" as const,
  };

  const { data, error } = await supabase
    .from("aspirations")
    .insert(row)
    .select("case_id, topic, message, anonymous, status, created_at")
    .single();

  if (error) {
    // Surface a clean error for the API layer to translate.
    throw new Error(`Failed to store aspiration: ${error.message}`);
  }

  return {
    caseId: data.case_id as string,
    topic: data.topic as string,
    message: data.message as string,
    anonymous: data.anonymous as boolean,
    status: data.status as AspirationStatus,
    createdAt: data.created_at as string,
  };
}
