const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(__dirname + "/uploads"));
// DB Connection

mongoose.connect(
  "mongodb+srv://meenakshisunder183017:DMLab1%40pacr.org@sundar.qhyhwwt.mongodb.net/BlogsDB"
);

// Token Generator
const generateLoginToken = async (email) => {
  try {
    const token = await jwt.sign(email, process.env.Login_Secretkey);
    return token;
  } catch (error) {
    console.log("Error Occured:", error);
  }
};

// BCRYPT CONFIG

const salt = bcrypt.genSaltSync(10);
const secret = "asdfe45we45w345wegw345werjktjwertkj";

// Register API Endpoint

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    // console.log(e);
    res.status(400).json(e);
  }
});

// Login

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    // logged in
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("wrong credentials");
  }
});

// // Profile
// app.get("/profile", (req, res) => {
//   const { token } = req.cookies;
//   console.log(req.cookies);
//   jwt.verify(token, secret, {}, (err, info) => {
//     if (err) throw err;
//     res.json(info);
//   });
// });

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.listen(4000);

// Create Post

app.post("/post/:id", uploadMiddleware.single("file"), async (req, res) => {
  const { id } = req.params;
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { title, summary, content } = req.body;
  const postDoc = await Post.create({
    title,
    summary,
    content,
    cover: newPath,
    author: id,
  });
  res.json(postDoc);
});

//Update Post

app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }

  const { id, title, summary, content } = req.body;
  const postDoc = await Post.findById(id);
  await postDoc.updateOne({
    title,
    summary,
    content,
    cover: newPath ? newPath : postDoc.cover,
  });

  res.json(postDoc);
});

// Get Post

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

// Delete Post

app.delete("/post/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPost = await Post.findByIdAndDelete(id);
    if (!deletedPost) {
      return res.status(404).send({ error: "Post not found" });
    }

    res
      .status(200)
      .send({ message: "Post deleted successfully", data: deletedPost });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).send({ error: "Failed to delete post" });
  }
});

// app.get("/", (req, res) => {
//   res.json("Hi Im working");
// });

// mongodb+srv://meenakshisunder183017:DMLab1%40pacr.org@sundar.qhyhwwt.mongodb.net/?retryWrites=true&w=majority&appName=Sundar
