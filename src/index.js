//require("dotenv").config();
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import dotenv from "dotenv";
import connectDB from "./db/index.js"
import { app } from "./app.js";
dotenv.config({
    path: "./.env"
});

connectDB()
.then(()=>{
    app.on("error", (error)=>{
            console.error("ERROR: Failed to connect to MongoDB");
            throw error;
        })
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
})
.catch((error) => {
    console.error("MONGODB Connection Failed !!!:", error);
})

















/*
import express from "express";
const app = express();

;(async () => {
  try
  {
    await mongoose.connect(`${process.env.MONGODB_URI}/$
        {DB_NAME}`);
        app.on("error", (error)=>{
            console.error("ERROR: Failed to connect to MongoDB");
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });
  }
  catch (error) {
    console.error("ERROR:", error);
    throw error;
  }
})()*/