// Zod schemas mirroring the Hevy OpenAPI request bodies (https://api.hevyapp.com/docs.json).
// These double as MCP tool input schemas. The MCP SDK expects a ZodRawShape (a plain
// object of Zod types), so tool definitions spread `.shape` from these objects.

import { z } from "zod";

export const setTypeEnum = z
  .enum(["warmup", "normal", "failure", "dropset"])
  .describe("The type of the set.");

export const rpeEnum = z
  .union([
    z.literal(6),
    z.literal(7),
    z.literal(7.5),
    z.literal(8),
    z.literal(8.5),
    z.literal(9),
    z.literal(9.5),
    z.literal(10),
  ])
  .describe("Rating of Perceived Exertion (one of 6, 7, 7.5, 8, 8.5, 9, 9.5, 10).");

// ---- Workout sets/exercises -------------------------------------------------

export const workoutSetSchema = z.object({
  type: setTypeEnum.default("normal"),
  weight_kg: z.number().nullish().describe("Weight in kilograms."),
  reps: z.number().int().nullish().describe("Number of repetitions."),
  distance_meters: z.number().int().nullish().describe("Distance in meters."),
  duration_seconds: z.number().int().nullish().describe("Duration in seconds."),
  custom_metric: z.number().nullish().describe("Custom metric (e.g. floors, steps)."),
  rpe: rpeEnum.nullish(),
});

export const workoutExerciseSchema = z.object({
  exercise_template_id: z
    .string()
    .describe("The exercise template ID (from list_exercise_templates), e.g. 'D04AC939'."),
  superset_id: z.number().int().nullish().describe("Superset ID, or null if not part of a superset."),
  notes: z.string().nullish().describe("Notes for this exercise."),
  sets: z.array(workoutSetSchema).describe("The sets performed for this exercise."),
});

export const workoutSchema = z.object({
  title: z.string().describe("The title of the workout, e.g. 'Friday Leg Day'."),
  description: z.string().nullish().describe("A description for the workout."),
  start_time: z.string().describe("ISO 8601 start time, e.g. '2024-08-14T12:00:00Z'."),
  end_time: z.string().describe("ISO 8601 end time, e.g. '2024-08-14T12:30:00Z'."),
  is_private: z.boolean().default(false).describe("Whether the workout is private."),
  exercises: z.array(workoutExerciseSchema).describe("The exercises performed."),
});

// ---- Routine sets/exercises -------------------------------------------------

export const repRangeSchema = z
  .object({
    start: z.number().nullish().describe("Starting rep count for the range."),
    end: z.number().nullish().describe("Ending rep count for the range."),
  })
  .describe("Optional target rep range for the set.");

export const routineSetSchema = z.object({
  type: setTypeEnum.default("normal"),
  weight_kg: z.number().nullish().describe("Weight in kilograms."),
  reps: z.number().int().nullish().describe("Number of repetitions."),
  distance_meters: z.number().int().nullish().describe("Distance in meters."),
  duration_seconds: z.number().int().nullish().describe("Duration in seconds."),
  custom_metric: z.number().nullish().describe("Custom metric."),
  rep_range: repRangeSchema.nullish(),
});

export const routineExerciseSchema = z.object({
  exercise_template_id: z
    .string()
    .describe("The exercise template ID (from list_exercise_templates)."),
  superset_id: z.number().int().nullish().describe("Superset ID, or null."),
  rest_seconds: z.number().int().nullish().describe("Rest time in seconds between sets."),
  notes: z.string().nullish().describe("Notes for this exercise."),
  sets: z.array(routineSetSchema).describe("The planned sets for this exercise."),
});

export const createRoutineSchema = z.object({
  title: z.string().describe("The title of the routine."),
  folder_id: z.number().nullish().describe("The routine folder ID to place this in, or null."),
  notes: z.string().nullish().describe("Additional notes for the routine."),
  exercises: z.array(routineExerciseSchema).describe("The exercises in the routine."),
});

// PUT routine has no folder_id (folder is managed separately).
export const updateRoutineSchema = z.object({
  title: z.string().describe("The title of the routine."),
  notes: z.string().nullish().describe("Additional notes for the routine."),
  exercises: z.array(routineExerciseSchema).describe("The exercises in the routine."),
});

// ---- Custom exercise template ----------------------------------------------

export const muscleGroupEnum = z.enum([
  "abdominals", "shoulders", "biceps", "triceps", "forearms", "quadriceps",
  "hamstrings", "calves", "glutes", "abductors", "adductors", "lats",
  "upper_back", "traps", "lower_back", "chest", "cardio", "neck", "full_body", "other",
]);

export const createExerciseSchema = z.object({
  title: z.string().describe("The title of the exercise template, e.g. 'Bench Press'."),
  exercise_type: z
    .enum([
      "weight_reps", "reps_only", "bodyweight_reps", "bodyweight_assisted_reps",
      "duration", "weight_duration", "distance_duration", "short_distance_weight",
    ])
    .describe("How the exercise is measured."),
  equipment_category: z
    .enum([
      "none", "barbell", "dumbbell", "kettlebell", "machine", "plate",
      "resistance_band", "suspension", "other",
    ])
    .describe("The equipment used."),
  muscle_group: muscleGroupEnum.describe("The primary muscle group."),
  other_muscles: z.array(muscleGroupEnum).nullish().describe("Secondary muscle groups."),
});

// ---- Body measurements ------------------------------------------------------

const bodyMeasurementFields = {
  weight_kg: z.number().nullish(),
  lean_mass_kg: z.number().nullish(),
  fat_percent: z.number().nullish(),
  neck_cm: z.number().nullish(),
  shoulder_cm: z.number().nullish(),
  chest_cm: z.number().nullish(),
  left_bicep_cm: z.number().nullish(),
  right_bicep_cm: z.number().nullish(),
  left_forearm_cm: z.number().nullish(),
  right_forearm_cm: z.number().nullish(),
  abdomen: z.number().nullish(),
  waist: z.number().nullish(),
  hips: z.number().nullish(),
  left_thigh: z.number().nullish(),
  right_thigh: z.number().nullish(),
  left_calf: z.number().nullish(),
  right_calf: z.number().nullish(),
};

// POST requires a date; PUT targets an existing date (date comes from the path).
export const createBodyMeasurementSchema = z.object({
  date: z.string().describe("The measurement date in YYYY-MM-DD format."),
  ...bodyMeasurementFields,
});

export const updateBodyMeasurementShape = bodyMeasurementFields;

// ---- Shared pagination ------------------------------------------------------

export const paginationShape = (maxPageSize: number) => ({
  page: z.number().int().min(1).default(1).describe("Page number (>= 1)."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(maxPageSize)
    .optional()
    .describe(`Items per page (max ${maxPageSize}).`),
});
