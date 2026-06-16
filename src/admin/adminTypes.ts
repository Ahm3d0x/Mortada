/**
 * Admin Dashboard Types
 * Data model for managing packages and cards in the Mortada card game.
 * Maps to Supabase tables: packages, cards, special_cards, package_cards, package_special_cards
 */

export type AdminPlayerRole = "attacker" | "defender" | "midfielder" | "goalkeeper";

export interface AdminPackage {
  id: string;               // UUID from Supabase
  name: string;              // e.g. "ريال مدريد"
  description: string;
  image: string;             // emoji representing the package
  type: "player" | "special"; // Package type
  legend_percentage: number; // default legend % for this package (0-100)
  created_at: string;        // ISO timestamp
  updated_at: string;        // ISO timestamp
}

export interface AdminCard {
  id: string;                // UUID from Supabase
  name: string;              // Player name e.g. "كريستيانو رونالدو"
  attack: number;            // 0-15
  defense: number;           // 0-15
  role: AdminPlayerRole;
  role_arabic: string;
  is_legend: boolean;
  description: string;
  team: string;              // e.g. "البرتغال"
  avatar: string;            // emoji (fallback)
  image_url: string;         // Real card image URL (Google Drive, Imgur, etc.)
  tags: string[];            // e.g. ["captain", "speedster"]
  created_at: string;
  updated_at: string;
}

export interface AdminSpecialCard {
  id: string;                // UUID from Supabase
  name: string;              // Tactical card name e.g. "تسلل مباغت"
  effect: string;            // e.g. "offside", "wet_pitch", etc.
  effect_arabic: string;
  description: string;
  icon: string;              // emoji icon
  image_url: string;         // Real card image URL
  created_at: string;
  updated_at: string;
}

// Role labels mapping
export const ROLE_LABELS: Record<AdminPlayerRole, string> = {
  attacker: "رأس حربة",
  midfielder: "خط وسط",
  defender: "مدافع",
  goalkeeper: "حارس مرمى",
};

// Legend role labels
export const LEGEND_ROLE_LABELS: Record<AdminPlayerRole, string> = {
  attacker: "أسطورة هجوم",
  midfielder: "أسطورة خط وسط",
  defender: "أسطورة دفاع",
  goalkeeper: "أسطورة حراسة مرمى",
};

// Default avatars per role
export const DEFAULT_AVATARS: Record<AdminPlayerRole, string> = {
  attacker: "⚡",
  midfielder: "🎯",
  defender: "🛡️",
  goalkeeper: "🧤",
};

// Package export/import format
export interface PackageExport {
  version: 1;
  package: AdminPackage;
  cards?: AdminCard[];
  specialCards?: AdminSpecialCard[];
  exportedAt: string;
}
