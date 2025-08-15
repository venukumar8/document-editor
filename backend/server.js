const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const Document = require("./models/Document");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Collaborative Document Editor Backend is running.");
});

// ✅ Get all documents
app.get("/api/documents", async (req, res) => {
  try {
    const documents = await Document.find({}, { _id: 1 });
    res.json(documents);
  } catch (err) {
    res.status(500).send("Failed to fetch documents.");
  }
});

// ✅ Create a new document
app.post("/api/documents", async (req, res) => {
  try {
    const { id } = req.body;
    const exists = await Document.findById(id);
    if (exists) return res.status(400).send("Document already exists.");
    await Document.create({ _id: id, content: "" });
    res.status(201).send("Document created.");
  } catch (err) {
    res.status(500).send("Error creating document.");
  }
});

// ✅ Delete a document
app.delete("/api/documents/:id", async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.send("Document deleted.");
  } catch (err) {
    res.status(500).send("Error deleting document.");
  }
});

// Setup HTTP + WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// MongoDB connect
mongoose.connect("mongodb://localhost:27017/collabdocs", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// WebSocket events
io.on("connection", socket => {
  socket.on("get-document", async documentId => {
    const document =
      (await Document.findById(documentId)) ||
      (await Document.create({ _id: documentId, content: "" }));

    socket.join(documentId);
    socket.emit("load-document", document.content);

    socket.on("send-changes", delta => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async content => {
      await Document.findByIdAndUpdate(documentId, { content });
    });
  });
});

// Start server
server.listen(3001, () => {
  console.log("✅ Backend running on http://localhost:3001");
});
