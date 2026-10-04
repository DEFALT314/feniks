export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      ai_cache: {
        Row: {
          created_at: string;
          key: string;
          value: Json;
        };
        Insert: {
          created_at?: string;
          key: string;
          value: Json;
        };
        Update: {
          created_at?: string;
          key?: string;
          value?: Json;
        };
        Relationships: [];
      };
      ai_usage: {
        Row: {
          day: string;
          requests: number;
          user_id: string;
        };
        Insert: {
          day: string;
          requests?: number;
          user_id: string;
        };
        Update: {
          day?: string;
          requests?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          actor_id: string | null;
          akcja: string;
          created_at: string;
          id: number;
          obiekt: string;
          szczegoly: Json;
        };
        Insert: {
          actor_id?: string | null;
          akcja: string;
          created_at?: string;
          id?: never;
          obiekt: string;
          szczegoly?: Json;
        };
        Update: {
          actor_id?: string | null;
          akcja?: string;
          created_at?: string;
          id?: never;
          obiekt?: string;
          szczegoly?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      calls: {
        Row: {
          cel: string | null;
          created_at: string;
          demo: boolean;
          id: string;
          nazwa: string;
          obszary: string[];
          opublikowany: boolean;
          organizator: string;
          termin_do: string | null;
          termin_od: string | null;
          updated_at: string;
          updated_by: string | null;
          url: string | null;
        };
        Insert: {
          cel?: string | null;
          created_at?: string;
          demo?: boolean;
          id: string;
          nazwa: string;
          obszary?: string[];
          opublikowany?: boolean;
          organizator?: string;
          termin_do?: string | null;
          termin_od?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          url?: string | null;
        };
        Update: {
          cel?: string | null;
          created_at?: string;
          demo?: boolean;
          id?: string;
          nazwa?: string;
          obszary?: string[];
          opublikowany?: boolean;
          organizator?: string;
          termin_do?: string | null;
          termin_od?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calls_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      challenge_areas: {
        Row: {
          dane: string[];
          definicja: string | null;
          id: string;
          kategorie_biblioteki: string[];
          nazwa: string;
          nr: number;
          slowa_kluczowe: string[];
          strony: string | null;
          zrodlo_url: string | null;
        };
        Insert: {
          dane?: string[];
          definicja?: string | null;
          id: string;
          kategorie_biblioteki?: string[];
          nazwa: string;
          nr: number;
          slowa_kluczowe?: string[];
          strony?: string | null;
          zrodlo_url?: string | null;
        };
        Update: {
          dane?: string[];
          definicja?: string | null;
          id?: string;
          kategorie_biblioteki?: string[];
          nazwa?: string;
          nr?: number;
          slowa_kluczowe?: string[];
          strony?: string | null;
          zrodlo_url?: string | null;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          kolejnosc: number;
          obszar_id: string;
          tekst: string;
        };
        Insert: {
          id: string;
          kolejnosc?: number;
          obszar_id: string;
          tekst: string;
        };
        Update: {
          id?: string;
          kolejnosc?: number;
          obszar_id?: string;
          tekst?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenges_obszar_id_fkey";
            columns: ["obszar_id"];
            isOneToOne: false;
            referencedRelation: "challenge_areas";
            referencedColumns: ["id"];
          },
        ];
      };
      embeddings: {
        Row: {
          chunk: number;
          chunk_type: string;
          content: string;
          created_at: string;
          embedding: string;
          id: number;
          kind: string;
          model: string;
          ref_id: string;
        };
        Insert: {
          chunk: number;
          chunk_type: string;
          content: string;
          created_at?: string;
          embedding: string;
          id?: never;
          kind: string;
          model: string;
          ref_id: string;
        };
        Update: {
          chunk?: number;
          chunk_type?: string;
          content?: string;
          created_at?: string;
          embedding?: string;
          id?: never;
          kind?: string;
          model?: string;
          ref_id?: string;
        };
        Relationships: [];
      };
      idea_canvas: {
        Row: {
          idea_id: string;
          odpowiedz: Json;
          pole_id: string;
          updated_at: string;
        };
        Insert: {
          idea_id: string;
          odpowiedz: Json;
          pole_id: string;
          updated_at?: string;
        };
        Update: {
          idea_id?: string;
          odpowiedz?: Json;
          pole_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_canvas_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_reviews: {
        Row: {
          created_at: string;
          ekspert_id: string | null;
          id: string;
          idea_id: string;
          komentarz: string | null;
          reviewer_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          ekspert_id?: string | null;
          id?: string;
          idea_id: string;
          komentarz?: string | null;
          reviewer_id?: string;
          status: string;
        };
        Update: {
          created_at?: string;
          ekspert_id?: string | null;
          id?: string;
          idea_id?: string;
          komentarz?: string | null;
          reviewer_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_reviews_ekspert_id_fkey";
            columns: ["ekspert_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_reviews_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ideas: {
        Row: {
          autor_id: string;
          created_at: string;
          dla_kogo: string | null;
          etap: string | null;
          id: string;
          istota: string | null;
          obszar_id: string | null;
          opis: string | null;
          opublikowany_at: string | null;
          tytul: string;
          updated_at: string;
          wyslany_at: string | null;
          zgoda_publikacji_at: string | null;
        };
        Insert: {
          autor_id?: string;
          created_at?: string;
          dla_kogo?: string | null;
          etap?: string | null;
          id?: string;
          istota?: string | null;
          obszar_id?: string | null;
          opis?: string | null;
          opublikowany_at?: string | null;
          tytul: string;
          updated_at?: string;
          wyslany_at?: string | null;
          zgoda_publikacji_at?: string | null;
        };
        Update: {
          autor_id?: string;
          created_at?: string;
          dla_kogo?: string | null;
          etap?: string | null;
          id?: string;
          istota?: string | null;
          obszar_id?: string | null;
          opis?: string | null;
          opublikowany_at?: string | null;
          tytul?: string;
          updated_at?: string;
          wyslany_at?: string | null;
          zgoda_publikacji_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ideas_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ideas_obszar_id_fkey";
            columns: ["obszar_id"];
            isOneToOne: false;
            referencedRelation: "challenge_areas";
            referencedColumns: ["id"];
          },
        ];
      };
      innovation_categories: {
        Row: {
          id: string;
          kolejnosc: number;
          nazwa: string;
          url: string | null;
        };
        Insert: {
          id: string;
          kolejnosc?: number;
          nazwa: string;
          url?: string | null;
        };
        Update: {
          id?: string;
          kolejnosc?: number;
          nazwa?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      innovations: {
        Row: {
          autor_instytucja: string | null;
          czy_dziala: string | null;
          dla_kogo: string[];
          do_matchmakingu: boolean;
          etykieta: string | null;
          id: string;
          kategoria_id: string;
          kto_moze_wdrozyc: string[];
          materialy: Json;
          nazwa: string;
          opis_krotki: string | null;
          opublikowana: boolean;
          pewnosc: string | null;
          problem: string | null;
          program: string | null;
          przyklady_zapytan: string[];
          slowa_kluczowe: string[];
          spoza_biblioteki: boolean;
          sprawdzona_przez_rops: boolean;
          updated_at: string;
          url: string;
          zrodlo: string | null;
        };
        Insert: {
          autor_instytucja?: string | null;
          czy_dziala?: string | null;
          dla_kogo?: string[];
          do_matchmakingu?: boolean;
          etykieta?: string | null;
          id: string;
          kategoria_id: string;
          kto_moze_wdrozyc?: string[];
          materialy?: Json;
          nazwa: string;
          opis_krotki?: string | null;
          opublikowana?: boolean;
          pewnosc?: string | null;
          problem?: string | null;
          program?: string | null;
          przyklady_zapytan?: string[];
          slowa_kluczowe?: string[];
          spoza_biblioteki?: boolean;
          sprawdzona_przez_rops?: boolean;
          updated_at?: string;
          url: string;
          zrodlo?: string | null;
        };
        Update: {
          autor_instytucja?: string | null;
          czy_dziala?: string | null;
          dla_kogo?: string[];
          do_matchmakingu?: boolean;
          etykieta?: string | null;
          id?: string;
          kategoria_id?: string;
          kto_moze_wdrozyc?: string[];
          materialy?: Json;
          nazwa?: string;
          opis_krotki?: string | null;
          opublikowana?: boolean;
          pewnosc?: string | null;
          problem?: string | null;
          program?: string | null;
          przyklady_zapytan?: string[];
          slowa_kluczowe?: string[];
          spoza_biblioteki?: boolean;
          sprawdzona_przez_rops?: boolean;
          updated_at?: string;
          url?: string;
          zrodlo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "innovations_kategoria_id_fkey";
            columns: ["kategoria_id"];
            isOneToOne: false;
            referencedRelation: "innovation_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      instytucje: {
        Row: {
          created_at: string;
          id: string;
          nazwa: string;
          teryt: string | null;
          typ: string;
          zweryfikowana: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          nazwa: string;
          teryt?: string | null;
          typ: string;
          zweryfikowana?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          nazwa?: string;
          teryt?: string | null;
          typ?: string;
          zweryfikowana?: boolean;
        };
        Relationships: [];
      };
      match_queries: {
        Row: {
          area_id: string | null;
          challenge_id: string | null;
          created_at: string;
          id: number;
          match_quality: string;
        };
        Insert: {
          area_id?: string | null;
          challenge_id?: string | null;
          created_at?: string;
          id?: never;
          match_quality: string;
        };
        Update: {
          area_id?: string | null;
          challenge_id?: string | null;
          created_at?: string;
          id?: never;
          match_quality?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_queries_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "challenge_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_queries_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          autor_id: string | null;
          autor_nazwa: string | null;
          autor_rola: string;
          created_at: string;
          id: string;
          thread_id: string;
          tresc: string;
        };
        Insert: {
          autor_id?: string | null;
          autor_nazwa?: string | null;
          autor_rola: string;
          created_at?: string;
          id?: string;
          thread_id: string;
          tresc: string;
        };
        Update: {
          autor_id?: string | null;
          autor_nazwa?: string | null;
          autor_rola?: string;
          created_at?: string;
          id?: string;
          thread_id?: string;
          tresc?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "threads";
            referencedColumns: ["id"];
          },
        ];
      };
      middleman_cards: {
        Row: {
          card: Json;
          created_at: string;
          id: string;
          innovation_id: string;
          institution: Json;
          owner_id: string;
          status: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          card: Json;
          created_at?: string;
          id?: string;
          innovation_id: string;
          institution: Json;
          owner_id?: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          card?: Json;
          created_at?: string;
          id?: string;
          innovation_id?: string;
          institution?: Json;
          owner_id?: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "middleman_cards_innovation_id_fkey";
            columns: ["innovation_id"];
            isOneToOne: false;
            referencedRelation: "innovations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          link: string | null;
          przeczytane: boolean;
          typ: string;
          tytul: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          link?: string | null;
          przeczytane?: boolean;
          typ: string;
          tytul: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          link?: string | null;
          przeczytane?: boolean;
          typ?: string;
          tytul?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      personas: {
        Row: {
          cele: string[];
          id: string;
          imie: string;
          motywacje: string[];
          obszar_id: string;
          opis: string | null;
          wyzwania: string[];
        };
        Insert: {
          cele?: string[];
          id: string;
          imie: string;
          motywacje?: string[];
          obszar_id: string;
          opis?: string | null;
          wyzwania?: string[];
        };
        Update: {
          cele?: string[];
          id?: string;
          imie?: string;
          motywacje?: string[];
          obszar_id?: string;
          opis?: string | null;
          wyzwania?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "personas_obszar_id_fkey";
            columns: ["obszar_id"];
            isOneToOne: false;
            referencedRelation: "challenge_areas";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          instytucja_id: string | null;
          nazwa_wyswietlana: string | null;
          role: string;
          updated_at: string;
          wnioskowana_rola: string | null;
          zgoda_rodo_at: string | null;
        };
        Insert: {
          created_at?: string;
          id: string;
          instytucja_id?: string | null;
          nazwa_wyswietlana?: string | null;
          role?: string;
          updated_at?: string;
          wnioskowana_rola?: string | null;
          zgoda_rodo_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          instytucja_id?: string | null;
          nazwa_wyswietlana?: string | null;
          role?: string;
          updated_at?: string;
          wnioskowana_rola?: string | null;
          zgoda_rodo_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_instytucja_id_fkey";
            columns: ["instytucja_id"];
            isOneToOne: false;
            referencedRelation: "instytucje";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          moduly: string[];
          opis: string | null;
          priorytet_dla_demo: number | null;
          rok: number | null;
          tagi: string[];
          typ: string;
          tytul: string;
          url: string;
        };
        Insert: {
          id: string;
          moduly?: string[];
          opis?: string | null;
          priorytet_dla_demo?: number | null;
          rok?: number | null;
          tagi?: string[];
          typ: string;
          tytul: string;
          url: string;
        };
        Update: {
          id?: string;
          moduly?: string[];
          opis?: string | null;
          priorytet_dla_demo?: number | null;
          rok?: number | null;
          tagi?: string[];
          typ?: string;
          tytul?: string;
          url?: string;
        };
        Relationships: [];
      };
      test_ratings: {
        Row: {
          co_dzialalo: string | null;
          co_poprawic: string | null;
          created_at: string;
          id: string;
          ocena: number;
          test_id: string;
          user_id: string;
        };
        Insert: {
          co_dzialalo?: string | null;
          co_poprawic?: string | null;
          created_at?: string;
          id?: string;
          ocena: number;
          test_id: string;
          user_id?: string;
        };
        Update: {
          co_dzialalo?: string | null;
          co_poprawic?: string | null;
          created_at?: string;
          id?: string;
          ocena?: number;
          test_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_ratings_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      test_signups: {
        Row: {
          created_at: string;
          test_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          test_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          test_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_signups_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_signups_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tests: {
        Row: {
          created_at: string;
          id: string;
          idea_id: string;
          liczba_miejsc: number | null;
          miejsce: string | null;
          opis: string | null;
          termin: string | null;
          tytul: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          idea_id: string;
          liczba_miejsc?: number | null;
          miejsce?: string | null;
          opis?: string | null;
          termin?: string | null;
          tytul: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          idea_id?: string;
          liczba_miejsc?: number | null;
          miejsce?: string | null;
          opis?: string | null;
          termin?: string | null;
          tytul?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tests_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
        ];
      };
      thread_participants: {
        Row: {
          last_read_at: string;
          nazwa: string | null;
          rola: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          last_read_at?: string;
          nazwa?: string | null;
          rola: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          last_read_at?: string;
          nazwa?: string | null;
          rola?: string;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "thread_participants_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "threads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "thread_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      threads: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          idea_id: string | null;
          innowacja_id: string | null;
          last_message_at: string;
          temat: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          idea_id?: string | null;
          innowacja_id?: string | null;
          last_message_at?: string;
          temat: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          idea_id?: string | null;
          innowacja_id?: string | null;
          last_message_at?: string;
          temat?: string;
        };
        Relationships: [
          {
            foreignKeyName: "threads_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "threads_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: true;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "threads_innowacja_id_fkey";
            columns: ["innowacja_id"];
            isOneToOne: false;
            referencedRelation: "innovations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      idea_status: {
        Row: {
          ekspert_id: string | null;
          idea_id: string | null;
          komentarz: string | null;
          oceniony_at: string | null;
          status: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "idea_reviews_ekspert_id_fkey";
            columns: ["ekspert_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_reviews_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      ai_cache_get: { Args: { p_key: string }; Returns: Json };
      ai_cache_put: {
        Args: { p_key: string; p_value: Json };
        Returns: undefined;
      };
      ai_usage_take: { Args: { p_limit: number }; Returns: number };
      call_matching_authors: {
        Args: { p_obszary: string[] };
        Returns: {
          email: string;
          tytul: string;
          user_id: string;
        }[];
      };
      can_review_idea: { Args: { p_idea_id: string }; Returns: boolean };
      can_see_thread: { Args: { p_thread_id: string }; Returns: boolean };
      dobre_praktyki: {
        Args: { p_id?: string };
        Returns: {
          dla_kogo: string | null;
          etap: string | null;
          id: string;
          istota: string | null;
          liczba_ocen: number;
          obszar_id: string | null;
          obszar_nazwa: string | null;
          opis: string | null;
          opublikowany_at: string;
          srednia_ocena: number | null;
          tytul: string;
        }[];
      };
      dodaj_powiadomienie: {
        Args: {
          p_link?: string;
          p_role?: string[];
          p_typ: string;
          p_tytul: string;
          p_user_ids?: string[];
        };
        Returns: number;
      };
      idea_author_email: { Args: { p_idea_id: string }; Returns: string };
      idea_editable: { Args: { p_idea_id: string }; Returns: boolean };
      is_idea_author: { Args: { p_idea_id: string }; Returns: boolean };
      is_rops: { Args: never; Returns: boolean };
      is_signed_up: { Args: { p_test_id: string }; Returns: boolean };
      is_test_author: { Args: { p_test_id: string }; Returns: boolean };
      mark_thread_read: { Args: { p_thread_id: string }; Returns: undefined };
      notify_thread: { Args: { p_thread_id: string; p_tytul: string }; Returns: number };
      invite_to_thread: { Args: { p_thread_id: string; p_user_id: string }; Returns: undefined };
      contact_directory: {
        Args: never;
        Returns: { id: string; nazwa: string; rola: string }[];
      };
      match_embeddings: {
        Args: { match_count?: number; match_kind: string; query: string };
        Returns: {
          ref_id: string;
          similarity: number;
        }[];
      };
      moja_rola: { Args: never; Returns: string };
      opublikuj_pomysl: {
        Args: { p_idea_id: string; p_publikuj: boolean };
        Returns: string;
      };
      post_message: {
        Args: { p_thread_id: string; p_tresc: string };
        Returns: string;
      };
      start_thread: {
        Args: {
          p_idea_id?: string;
          p_innowacja_id?: string;
          p_temat: string;
          p_tresc: string;
          p_uczestnicy?: string[];
        };
        Returns: string;
      };
      thread_add_participant: {
        Args: { p_thread_id: string; p_user_id: string };
        Returns: undefined;
      };
      thread_reply_emails: {
        Args: { p_thread_id: string };
        Returns: {
          email: string;
          user_id: string;
        }[];
      };
      ustaw_zgode_publikacji: {
        Args: { p_idea_id: string; p_zgoda: boolean };
        Returns: string;
      };
      wyslij_pomysl: { Args: { p_idea_id: string }; Returns: string };
      zapisz_audit: {
        Args: { p_akcja: string; p_obiekt: string; p_szczegoly?: Json };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
