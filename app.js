// app.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => console.log("Server running on http://localhost:3000/"));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Helper function for authentication middleware
const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return response.status(401).send("Unauthorized access");

  jwt.verify(token, "SECRET_KEY", (error, user) => {
    if (error) return response.status(403).send("Invalid token");
    request.user = user;
    next();
  });
};

// API 1: Register a new user
app.post("/register", async (request, response) => {
  const { name, username, password, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const createUserQuery = `
    INSERT INTO user (name, username, password, gender)
    VALUES ('${name}', '${username}', '${hashedPassword}', '${gender}');
  `;
  await db.run(createUserQuery);
  response.status(200).send("User registered successfully");
});

// API 2: User Login
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const user = await db.get(userQuery);
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ user_id: user.user_id }, "SECRET_KEY");
    response.json({ token });
  } else {
    response.status(400).send("Invalid username or password");
  }
});

// API 3: Get tweets of the people followed by the user
app.get("/user/tweets/feed", authenticateToken, async (request, response) => {
  const { user_id } = request.user;
  const feedQuery = `
    SELECT user.username, tweet.tweet, tweet.date_time AS dateTime
    FROM tweet
    INNER JOIN follower ON tweet.user_id = follower.following_user_id
    INNER JOIN user ON tweet.user_id = user.user_id
    WHERE follower.follower_user_id = ${user_id}
    ORDER BY tweet.date_time DESC
    LIMIT 10;
  `;
  const tweets = await db.all(feedQuery);
  response.json(tweets);
});

// API 4: Get list of followers of a user
app.get("/user/followers", authenticateToken, async (request, response) => {
  const { user_id } = request.user;
  const followersQuery = `
    SELECT user.username
    FROM follower
    INNER JOIN user ON follower.follower_user_id = user.user_id
    WHERE follower.following_user_id = ${user_id};
  `;
  const followers = await db.all(followersQuery);
  response.json(followers);
});

// API 5: Get list of users followed by the logged-in user
app.get("/user/following", authenticateToken, async (request, response) => {
  const { user_id } = request.user;
  const followingQuery = `
    SELECT user.username
    FROM follower
    INNER JOIN user ON follower.following_user_id = user.user_id
    WHERE follower.follower_user_id = ${user_id};
  `;
  const following = await db.all(followingQuery);
  response.json(following);
});

// API 6: Post a tweet
app.post("/user/tweets", authenticateToken, async (request, response) => {
  const { tweet } = request.body;
  const { user_id } = request.user;
  const date_time = new Date().toISOString();
  const postTweetQuery = `
    INSERT INTO tweet (tweet, user_id, date_time)
    VALUES ('${tweet}', ${user_id}, '${date_time}');
  `;
  await db.run(postTweetQuery);
  response.status(200).send("Tweet created successfully");
});

// API 7: Delete a tweet by ID
app.delete("/tweets/:tweetId", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const { user_id } = request.user;
  const tweetQuery = `SELECT * FROM tweet WHERE tweet_id = ${tweetId} AND user_id = ${user_id};`;
  const tweet = await db.get(tweetQuery);

  if (tweet) {
    const deleteTweetQuery = `DELETE FROM tweet WHERE tweet_id = ${tweetId};`;
    await db.run(deleteTweetQuery);
    response.send("Tweet deleted successfully");
  } else {
    response.status(401).send("Invalid request");
  }
});

// More APIs for replies and likes can be added similarly...

module.exports = app;
