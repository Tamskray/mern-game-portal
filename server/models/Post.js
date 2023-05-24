import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  rubric: { type: String, required: true },
  content: { type: String, required: true },
  creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  likes: { type: Map, of: Boolean },
  // comments: { type: Array, default: [] },
  comments: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      default: [],
      ref: "Comment",
    },
  ],
  date: { type: Date, default: Date.now },
  //   imageTitle
});

export default mongoose.model("Post", postSchema);