export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      trainings: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          default_rest_seconds: number;
          rounds: number;
          is_favorite: boolean;
          alert_sound: string | null;
          alert_seconds_before_end: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          default_rest_seconds?: number;
          rounds?: number;
          is_favorite?: boolean;
          alert_sound?: string | null;
          alert_seconds_before_end?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          description?: string;
          default_rest_seconds?: number;
          rounds?: number;
          is_favorite?: boolean;
          alert_sound?: string | null;
          alert_seconds_before_end?: number;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      exercises: {
        Row: {
          id: string;
          training_id: string;
          name: string;
          type: 'exercise' | 'rest';
          sets: number | null;
          reps: number | null;
          weight: number | null;
          rest_seconds: number | null;
          set_duration_seconds: number | null;
          duration_seconds: number | null;
          position: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          training_id: string;
          name: string;
          type?: 'exercise' | 'rest';
          sets?: number | null;
          reps?: number | null;
          weight?: number | null;
          rest_seconds?: number | null;
          set_duration_seconds?: number | null;
          duration_seconds?: number | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          type?: 'exercise' | 'rest';
          sets?: number | null;
          reps?: number | null;
          weight?: number | null;
          rest_seconds?: number | null;
          set_duration_seconds?: number | null;
          duration_seconds?: number | null;
          position?: number;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      workout_logs: {
        Row: {
          id: string;
          user_id: string;
          training_id: string | null;
          training_name: string;
          completed_at: string;
          duration_seconds: number;
          sets_completed: number;
          exercises_completed: number;
          rounds_completed: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          training_id?: string | null;
          training_name: string;
          completed_at: string;
          duration_seconds: number;
          sets_completed?: number;
          exercises_completed?: number;
          rounds_completed?: number;
          created_at?: string;
        };
        Update: never;
      };
    };
  };
}
