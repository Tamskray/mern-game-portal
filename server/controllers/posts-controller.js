import * as fs from "fs";
import { validationResult } from "express-validator";

import Post from "../models/Post.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";

class PostController {
  async getPosts(req, res, next) {
    const { limit, page } = req.query;
    const userId = req.params.uid;

    console.log(req._parsedUrl.pathname);

    const pageSize = limit ? parseInt(limit) : 0;
    const pageNumber = page ? parseInt(page) : 0;

    try {
      // const users = await User.find({}, "-password");
      let posts;
      let totalCount;
      let likesCount = 0;
      if (req._parsedUrl.pathname === "/") {
        console.log("all posts");
        posts = await Post.find()
          .sort({ date: -1 })
          .limit(pageSize)
          .skip(pageSize * pageNumber);

        totalCount = await Post.countDocuments();
      } else if (req._parsedUrl.pathname === `/user/${userId}`) {
        console.log("User posts");
        posts = await Post.find({ creator: userId })
          .sort({ date: -1 })
          .limit(pageSize)
          .skip(pageSize * pageNumber);

        totalCount = await Post.countDocuments({ creator: userId });

        posts.forEach((post) => {
          // console.log(post.likes.size);
          likesCount += post.likes.size;
        });

        console.log("Likes: " + likesCount);
      } else if (req._parsedUrl.pathname === "/news") {
        console.log("News");
        posts = await Post.find({ rubric: "Новини" })
          .sort({ date: -1 })
          .limit(pageSize)
          .skip(pageSize * pageNumber);

        totalCount = await Post.countDocuments({ rubric: "Новини" });
      } else if (req._parsedUrl.pathname === "/articles") {
        console.log("Articles");
        posts = await Post.find({ rubric: "Статті" })
          .sort({ date: -1 })
          .limit(pageSize)
          .skip(pageSize * pageNumber);

        totalCount = await Post.countDocuments({ rubric: "Статті" });
      } else if (req._parsedUrl.pathname === "/reviews") {
        console.log("Reviews");
        posts = await Post.find({ rubric: "Огляди" })
          .sort({ date: -1 })
          .limit(pageSize)
          .skip(pageSize * pageNumber);

        totalCount = await Post.countDocuments({ rubric: "Огляди" });
      }

      // const totalCount = await Post.countDocuments();
      res.header("Access-Control-Expose-Headers", "X-Total-Count");
      res.header("X-Total-Count", totalCount);

      res.status(200).json({ posts, likesCount });
    } catch (err) {
      res.status(404).json({ message: err.message });
    }
  }

  async getPopularPosts(req, res) {
    try {
      const popularPosts = await Post.aggregate([
        {
          $match: {
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $addFields: {
            likesCount: { $size: { $objectToArray: "$likes" } },
          },
        },
        {
          $sort: { likesCount: -1 },
        },
        {
          $limit: 5,
        },
      ]);

      const formattedPosts = popularPosts.map(
        ({ _id, title, likes, image }) => {
          return { _id, title, likes, image };
        }
      );

      res.status(200).json(formattedPosts);
    } catch (err) {
      res.status(404).json({ message: err.message });
    }
  }

  async getPostById(req, res, next) {
    const postId = req.params.pid;
    let post;
    try {
      post = await Post.findById(postId);
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Something went wrong, could not find a post" });
    }

    if (!post) {
      return res
        .status(404)
        .json({ message: "Could not find post for provided id" });
    }

    res.json(post);
  }

  async searchPosts(req, res) {
    const searchQuery = req.query.q;

    try {
      let posts;
      if (searchQuery) {
        posts = await Post.aggregate([
          {
            $search: {
              index: "default",
              autocomplete: {
                query: searchQuery,
                path: "title",
              },
            },
          },
          {
            $limit: 5,
          },
          {
            $project: {
              _id: 1,
              title: 1,
              rubric: 1,
              description: 1,
              content: 1,
              likes: 1,
              comments: 1,
              creator: 1,
              date: 1,
              image: 1,
            },
          },
        ]);

        if (
          posts.length === 0 &&
          searchQuery !== undefined &&
          searchQuery.length > 2
        ) {
          posts = "Нічого не знайдено";
        }
      } else {
        posts = "";
      }
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Error with searching posts" });
    }
  }

  // CREATE
  async createPost(req, res, next) {
    // express validation results
    // ---------

    // creator will be removed in future on client
    const { title, rubric, description, content } = req.body;

    let imagePath;
    if (req.file) {
      imagePath = req.file.path;
    } else {
      imagePath = null;
    }

    const newPost = new Post({
      title,
      rubric,
      description,
      content,
      image: imagePath,
      creator: req.userData.userId,
      //   creator: req.userData.userId,
      comments: [],
      likes: {},
      date: Date.now(),
    });

    let user;
    try {
      user = await User.findById(req.userData.userId);
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Creating post failed, please try again later" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ message: "Could not find user for provided id" });
    }

    try {
      await newPost.save();
      await User.findByIdAndUpdate(req.userData.userId, {
        $push: { posts: newPost.id },
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Creating post failed, please try again later", err });
    }

    res.status(201).json(newPost);
  }

  // UPDATE
  async updatePost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message: "Invalid inputs passed, please check your data",
        errors,
      });
    }

    const { title, rubric, description, content } = req.body;
    const postId = req.params.pid;

    let post;
    try {
      post = await Post.findById(postId);
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Something went wrong, could not find a post", err });
    }

    // if not convert to stirng. there`ll mongoose object id type, not string what we needed
    if (post.creator.toString() !== req.userData.userId) {
      return res
        .status(403)
        .json({ message: "You are not allowed to edit this post" });
    }

    if (req.file) {
      post.image &&
        fs.unlink(post.image, (err) => {
          if (err) {
            console.error("Failed to delete image:", err);
          }
        });
    }

    let imagePath;
    if (req.file) {
      imagePath = req.file.path;
    } else {
      imagePath = post.image;
    }

    console.log(imagePath);
    // console.log("req  " + req.file.path);

    post.title = title;
    post.rubric = rubric;
    post.description = description;
    post.content = content;
    post.image = imagePath;

    try {
      await post.save();
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong, could not update a post",
        err,
      });
    }

    res.status(200).json(post);
  }

  // LIKE
  async updatePostLike(req, res, next) {
    const postId = req.params.pid;
    const { userId } = req.body;

    let post;
    try {
      post = await Post.findById(postId);

      if (!post) {
        return res
          .status(404)
          .json({ message: "Could not find post for this id" });
      }
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Something went wrong, could not find a post" });
    }

    const isLiked = post.likes.get(userId);

    if (isLiked) {
      post.likes.delete(userId);
    } else {
      post.likes.set(userId, true);
    }

    try {
      await Post.findByIdAndUpdate(postId, { likes: post.likes });
    } catch (err) {
      return res.status(500).json({
        message: "Updating post likes failed, please try again later",
        err,
      });
    }

    // update post info for json output
    post = await Post.findById(postId);

    res.status(200).json({ likes: post.likes });
  }

  // DELETE
  async deletePost(req, res) {
    const postId = req.params.pid;

    let post;
    try {
      post = await Post.findById(postId);

      if (!post) {
        return res
          .status(404)
          .json({ message: "Could not find post for this id" });
      }

      await Comment.deleteMany({ postId: postId });

      console.log("asdsad " + post.creator);
      await User.findByIdAndUpdate(post.creator, { $pull: { posts: postId } });

      post.image &&
        fs.unlink(post.image, (err) => {
          if (err) {
            console.error("Failed to delete image:", err);
          }
        });

      post = await Post.findByIdAndDelete(postId);

      res.status(200).json({ message: "Post deleted succesfully" });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Something went wrong, could not find a post" });
    }
  }
}

export default new PostController();
