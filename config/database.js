
import mongoose from "mongoose";

export const connectDatabase = async () => {
  try {
    const databaseName = process.env.DATABASE_NAME || 'ToursAndTravels';
    const connectionString = `${process.env.DATABASE_URI}/${databaseName}`;

    await mongoose.connect(connectionString);

    console.log(`Your DB connected to database: ${databaseName}`);
  } catch (error) {
    console.log("Database connection error:", error);
    process.exit(1);
  }
};