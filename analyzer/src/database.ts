import { Client } from "pg";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

export interface ProfileData {
  fullName: string | null;
  jobTitle: string | null;
  location: string | null;
  linkedinLink: string | null;
  email: string | null;
  phoneNumber: string | null;
  highSchool: string | null;
  HSGraduationYear: string | null;
  NAFAcademy: string | null;
  NAFTrackCertified: string | null;
  city: string | null;
  currentJob: string | null;
  universityGradYear: string | null;
  university: string | null;
  degree: string | null;
  internshipCompany1: string | null;
  internshipEndDate1: string | null;
}

export interface unconfirmedAnalyzerRecord {
  analyzer_id?: number;
  profile_url: string;
  confidence_percentage: number;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  high_school: string | null;
  hs_graduation_year: string | null;
  naf_academy: boolean;
  naf_track_certified: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  birthdate: string | null;
  gender: string | null;
  ethnicity: string | null;
  military_branch_served: string | null;
  current_job: string[];
  university_grad_year: string | null;
  university: string | null;
  degree: string | null;
  school_district: string | null;
  internship_company1: string | null;
  internship_end_date1: string | null;
  internship_company2: string | null;
  internship_end_date2: string | null;
  university2: string | null;
  degree2: string | null;
}

export interface CrawlerProfile {
  crawler_id: number;
  profile_url: string;
  json: ProfileData;
  created_at: Date;
}

class DatabaseService {
  private client: Client;
  private isConnected = false;

  constructor() {
    this.client = new Client({
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || "5432", 10),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    });
  }

  async connect() {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        this.isConnected = true;
        console.log("Connected to PostgreSQL");
      } catch (error) {
        console.error("Connection error:", error);
        throw error;
      }
    }
    return this;
  }

  async disconnect() {
    if (this.isConnected) {
      try {
        await this.client.end();
        this.isConnected = false;
        console.log("Disconnected from PostgreSQL");
      } catch (error) {
        console.error("Disconnection error:", error);
        throw error;
      }
    }
  }

  async fetchProfiles(limit = 1, offset = 0): Promise<CrawlerProfile[]> {
    try {
      const result = await this.client.query<CrawlerProfile>(
        `SELECT crawler_id, profile_url, json, created_at
         FROM crawler_data
         ORDER BY crawler_id
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return result.rows;
    } catch (error) {
      console.error("Error fetching profiles:", error);
      throw error;
    }
  }

  async fetchProfileById(id: number): Promise<CrawlerProfile | null> {
    try {
      const result = await this.client.query<CrawlerProfile>(
        `SELECT * FROM crawler_data 
         WHERE crawler_id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error fetching profile by ID:", error);
      throw error;
    }
  }

  async insertUnconfirmedAnalyzerRecord(
    record: unconfirmedAnalyzerRecord
  ): Promise<number | null> {
    try {
      const result = await this.client.query<{ analyzer_id: number }>(
        `INSERT INTO unconfirmed_alumni (
          profile_url,
          confidence_percentage,
          full_name,
          email,
          phone_number,
          high_school,
          hs_graduation_year,
          naf_academy,
          naf_track_certified,
          address,
          city,
          state,
          zip_code,
          birthdate,
          gender,
          ethnicity,
          military_branch_served,
          current_job,
          university_grad_year,
          university,
          degree,
          school_district,
          internship_company1,
          internship_end_date1,
          internship_company2,
          internship_end_date2,
          university2,
          degree2
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING analyzer_id`,
        [
          record.profile_url,
          record.confidence_percentage,
          record.full_name,
          record.email,
          record.phone_number,
          record.high_school,
          record.hs_graduation_year,
          record.naf_academy,
          record.naf_track_certified,
          record.address || null,
          record.city || null,
          record.state || null,
          record.zip_code || null,
          record.birthdate || null,
          record.gender || null,
          record.ethnicity || null,
          record.military_branch_served || null,
          record.current_job,
          record.university_grad_year || null,
          record.university || null,
          record.degree || null,
          record.school_district || null,
          record.internship_company1 || null,
          record.internship_end_date1 || null,
          record.internship_company2 || null,
          record.internship_end_date2 || null,
          record.university2 || null,
          record.degree2 || null,
        ]
      );
      return result.rows[0]?.analyzer_id;
    } catch (error) {
      console.error("Error inserting unconfirmed_alumni record:", error);
      return null;
    }
  }
}

const dbService = new DatabaseService();

export const withDatabase = async <T>(
  fn: (db: DatabaseService) => Promise<T>
): Promise<T> => {
  try {
    await dbService.connect();
    return await fn(dbService);
  } finally {
    await dbService.disconnect();
  }
};

export const profileFetcher = {
  fetchProfiles: (limit = 1, offset = 0) =>
    withDatabase((db) => db.fetchProfiles(limit, offset)),
  fetchProfileById: (id: number) =>
    withDatabase((db) => db.fetchProfileById(id)),
};
