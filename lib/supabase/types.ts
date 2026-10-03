export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_cache: {
        Row: {
          created_at: string
          key: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          actor_id: string | null
          akcja: string
          created_at: string
          id: number
          obiekt: string
          szczegoly: Json
        }
        Insert: {
          actor_id?: string | null
          akcja: string
          created_at?: string
          id?: never
          obiekt: string
          szczegoly?: Json
        }
        Update: {
          actor_id?: string | null
          akcja?: string
          created_at?: string
          id?: never
          obiekt?: string
          szczegoly?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_areas: {
        Row: {
          dane: string[]
          definicja: string | null
          id: string
          kategorie_biblioteki: string[]
          nazwa: string
          nr: number
          slowa_kluczowe: string[]
          strony: string | null
          zrodlo_url: string | null
        }
        Insert: {
          dane?: string[]
          definicja?: string | null
          id: string
          kategorie_biblioteki?: string[]
          nazwa: string
          nr: number
          slowa_kluczowe?: string[]
          strony?: string | null
          zrodlo_url?: string | null
        }
        Update: {
          dane?: string[]
          definicja?: string | null
          id?: string
          kategorie_biblioteki?: string[]
          nazwa?: string
          nr?: number
          slowa_kluczowe?: string[]
          strony?: string | null
          zrodlo_url?: string | null
        }
        Relationships: []
      }
      challenges: {
        Row: {
          id: string
          kolejnosc: number
          obszar_id: string
          tekst: string
        }
        Insert: {
          id: string
          kolejnosc?: number
          obszar_id: string
          tekst: string
        }
        Update: {
          id?: string
          kolejnosc?: number
          obszar_id?: string
          tekst?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_obszar_id_fkey"
            columns: ["obszar_id"]
            isOneToOne: false
            referencedRelation: "challenge_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          chunk: number
          chunk_type: string
          content: string
          created_at: string
          embedding: string
          id: number
          kind: string
          model: string
          ref_id: string
        }
        Insert: {
          chunk: number
          chunk_type: string
          content: string
          created_at?: string
          embedding: string
          id?: never
          kind: string
          model: string
          ref_id: string
        }
        Update: {
          chunk?: number
          chunk_type?: string
          content?: string
          created_at?: string
          embedding?: string
          id?: never
          kind?: string
          model?: string
          ref_id?: string
        }
        Relationships: []
      }
      innovation_categories: {
        Row: {
          id: string
          kolejnosc: number
          nazwa: string
          url: string | null
        }
        Insert: {
          id: string
          kolejnosc?: number
          nazwa: string
          url?: string | null
        }
        Update: {
          id?: string
          kolejnosc?: number
          nazwa?: string
          url?: string | null
        }
        Relationships: []
      }
      innovations: {
        Row: {
          autor_instytucja: string | null
          czy_dziala: string | null
          dla_kogo: string[]
          do_matchmakingu: boolean
          etykieta: string | null
          id: string
          kategoria_id: string
          kto_moze_wdrozyc: string[]
          materialy: Json
          nazwa: string
          opis_krotki: string | null
          opublikowana: boolean
          pewnosc: string | null
          problem: string | null
          program: string | null
          przyklady_zapytan: string[]
          slowa_kluczowe: string[]
          spoza_biblioteki: boolean
          sprawdzona_przez_rops: boolean
          updated_at: string
          url: string
          zrodlo: string | null
        }
        Insert: {
          autor_instytucja?: string | null
          czy_dziala?: string | null
          dla_kogo?: string[]
          do_matchmakingu?: boolean
          etykieta?: string | null
          id: string
          kategoria_id: string
          kto_moze_wdrozyc?: string[]
          materialy?: Json
          nazwa: string
          opis_krotki?: string | null
          opublikowana?: boolean
          pewnosc?: string | null
          problem?: string | null
          program?: string | null
          przyklady_zapytan?: string[]
          slowa_kluczowe?: string[]
          spoza_biblioteki?: boolean
          sprawdzona_przez_rops?: boolean
          updated_at?: string
          url: string
          zrodlo?: string | null
        }
        Update: {
          autor_instytucja?: string | null
          czy_dziala?: string | null
          dla_kogo?: string[]
          do_matchmakingu?: boolean
          etykieta?: string | null
          id?: string
          kategoria_id?: string
          kto_moze_wdrozyc?: string[]
          materialy?: Json
          nazwa?: string
          opis_krotki?: string | null
          opublikowana?: boolean
          pewnosc?: string | null
          problem?: string | null
          program?: string | null
          przyklady_zapytan?: string[]
          slowa_kluczowe?: string[]
          spoza_biblioteki?: boolean
          sprawdzona_przez_rops?: boolean
          updated_at?: string
          url?: string
          zrodlo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "innovations_kategoria_id_fkey"
            columns: ["kategoria_id"]
            isOneToOne: false
            referencedRelation: "innovation_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      instytucje: {
        Row: {
          created_at: string
          id: string
          nazwa: string
          teryt: string | null
          typ: string
          zweryfikowana: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          nazwa: string
          teryt?: string | null
          typ: string
          zweryfikowana?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          nazwa?: string
          teryt?: string | null
          typ?: string
          zweryfikowana?: boolean
        }
        Relationships: []
      }
      match_queries: {
        Row: {
          area_id: string | null
          challenge_id: string | null
          created_at: string
          id: number
          match_quality: string
        }
        Insert: {
          area_id?: string | null
          challenge_id?: string | null
          created_at?: string
          id?: never
          match_quality: string
        }
        Update: {
          area_id?: string | null
          challenge_id?: string | null
          created_at?: string
          id?: never
          match_quality?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_queries_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "challenge_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_queries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      middleman_cards: {
        Row: {
          card: Json
          created_at: string
          id: string
          innovation_id: string
          institution: Json
          owner_id: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          card: Json
          created_at?: string
          id?: string
          innovation_id: string
          institution: Json
          owner_id?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          card?: Json
          created_at?: string
          id?: string
          innovation_id?: string
          institution?: Json
          owner_id?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "middleman_cards_innovation_id_fkey"
            columns: ["innovation_id"]
            isOneToOne: false
            referencedRelation: "innovations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          przeczytane: boolean
          typ: string
          tytul: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          przeczytane?: boolean
          typ: string
          tytul: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          przeczytane?: boolean
          typ?: string
          tytul?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          cele: string[]
          id: string
          imie: string
          motywacje: string[]
          obszar_id: string
          opis: string | null
          wyzwania: string[]
        }
        Insert: {
          cele?: string[]
          id: string
          imie: string
          motywacje?: string[]
          obszar_id: string
          opis?: string | null
          wyzwania?: string[]
        }
        Update: {
          cele?: string[]
          id?: string
          imie?: string
          motywacje?: string[]
          obszar_id?: string
          opis?: string | null
          wyzwania?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "personas_obszar_id_fkey"
            columns: ["obszar_id"]
            isOneToOne: false
            referencedRelation: "challenge_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          instytucja_id: string | null
          nazwa_wyswietlana: string | null
          role: string
          updated_at: string
          wnioskowana_rola: string | null
          zgoda_rodo_at: string | null
        }
        Insert: {
          created_at?: string
          id: string
          instytucja_id?: string | null
          nazwa_wyswietlana?: string | null
          role?: string
          updated_at?: string
          wnioskowana_rola?: string | null
          zgoda_rodo_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instytucja_id?: string | null
          nazwa_wyswietlana?: string | null
          role?: string
          updated_at?: string
          wnioskowana_rola?: string | null
          zgoda_rodo_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_instytucja_id_fkey"
            columns: ["instytucja_id"]
            isOneToOne: false
            referencedRelation: "instytucje"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          id: string
          moduly: string[]
          opis: string | null
          priorytet_dla_demo: number | null
          rok: number | null
          tagi: string[]
          typ: string
          tytul: string
          url: string
        }
        Insert: {
          id: string
          moduly?: string[]
          opis?: string | null
          priorytet_dla_demo?: number | null
          rok?: number | null
          tagi?: string[]
          typ: string
          tytul: string
          url: string
        }
        Update: {
          id?: string
          moduly?: string[]
          opis?: string | null
          priorytet_dla_demo?: number | null
          rok?: number | null
          tagi?: string[]
          typ?: string
          tytul?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ai_cache_get: { Args: { p_key: string }; Returns: Json }
      ai_cache_put: {
        Args: { p_key: string; p_value: Json }
        Returns: undefined
      }
      dodaj_powiadomienie: {
        Args: {
          p_link?: string
          p_role?: string[]
          p_typ: string
          p_tytul: string
          p_user_ids?: string[]
        }
        Returns: number
      }
      is_rops: { Args: never; Returns: boolean }
      match_embeddings: {
        Args: { match_count?: number; match_kind: string; query: string }
        Returns: {
          ref_id: string
          similarity: number
        }[]
      }
      moja_rola: { Args: never; Returns: string }
      zapisz_audit: {
        Args: { p_akcja: string; p_obiekt: string; p_szczegoly?: Json }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
