import mongoose from "mongoose";

export default async () => {
    try {
        await mongoose.connect(process.env.DB ?? "mongodb://localhost:27017/quickchat");

		const db = mongoose.connection.db;

		if(!db)
			throw new Error("Connection to MongoDB failed");

		const collections = await db.listCollections().toArray();
		const collectionsRequired = ["users"];

		for(let i = 0; i < collectionsRequired.length; i++) {
			if (!collections.some(col => col.name === collectionsRequired[i])) {
				await db.createCollection(collectionsRequired[i]);
				console.log(`📂 Created '${collectionsRequired[i]}' collection`);
			}
		}

		console.log("✅ MongoDB Connected");
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
};