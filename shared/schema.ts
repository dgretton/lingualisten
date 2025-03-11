import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Define schemas for our language learning app
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  content: text("content").notNull(),
  audioUrl: text("audio_url").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
});

export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctOption: integer("correct_option").notNull(),
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  userName: text("user_name").notNull(),
  contactInfo: text("contact_info"),
  contactMethod: text("contact_method"),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  answers: jsonb("answers").$type<{
    questionId: number;
    selectedOption: number;
    isCorrect: boolean;
  }[]>().notNull(),
  createdAt: integer("created_at").notNull(),
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
});

export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessments.$inferSelect;

// Create schema for API requests
export const generateContentSchema = z.object({
  prompt: z.string().min(3).max(500),
  userName: z.string().min(1),
});

export const submitAnswersSchema = z.object({
  topicId: z.number(),
  userName: z.string(),
  answers: z.array(
    z.object({
      questionId: z.number(),
      selectedOption: z.number(),
    })
  ),
});

export const shareResultsSchema = z.object({
  assessmentId: z.number(),
  contactMethod: z.enum(["email", "sms"]),
  contactInfo: z.string(),
});
