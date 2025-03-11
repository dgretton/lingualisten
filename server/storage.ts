import { 
  users, User, InsertUser,
  topics, Topic, InsertTopic,
  questions, Question, InsertQuestion,
  assessments, Assessment, InsertAssessment 
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Topic operations
  createTopic(topic: InsertTopic): Promise<Topic>;
  getTopic(id: number): Promise<Topic | undefined>;
  getTopicWithQuestions(id: number): Promise<{topic: Topic, questions: Question[]} | undefined>;
  
  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestionsByTopicId(topicId: number): Promise<Question[]>;
  
  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: number): Promise<Assessment | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private topics: Map<number, Topic>;
  private questions: Map<number, Question>;
  private assessments: Map<number, Assessment>;
  
  private userId: number;
  private topicId: number;
  private questionId: number;
  private assessmentId: number;

  constructor() {
    this.users = new Map();
    this.topics = new Map();
    this.questions = new Map();
    this.assessments = new Map();
    
    this.userId = 1;
    this.topicId = 1;
    this.questionId = 1;
    this.assessmentId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Topic operations
  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    const id = this.topicId++;
    const topic: Topic = { ...insertTopic, id };
    this.topics.set(id, topic);
    return topic;
  }
  
  async getTopic(id: number): Promise<Topic | undefined> {
    return this.topics.get(id);
  }
  
  async getTopicWithQuestions(id: number): Promise<{topic: Topic, questions: Question[]} | undefined> {
    const topic = await this.getTopic(id);
    if (!topic) return undefined;
    
    const questions = await this.getQuestionsByTopicId(id);
    return { topic, questions };
  }
  
  // Question operations
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = this.questionId++;
    const question: Question = { ...insertQuestion, id };
    this.questions.set(id, question);
    return question;
  }
  
  async getQuestionsByTopicId(topicId: number): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(
      (question) => question.topicId === topicId,
    );
  }
  
  // Assessment operations
  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const id = this.assessmentId++;
    const assessment: Assessment = { ...insertAssessment, id };
    this.assessments.set(id, assessment);
    return assessment;
  }
  
  async getAssessment(id: number): Promise<Assessment | undefined> {
    return this.assessments.get(id);
  }
}

export const storage = new MemStorage();
