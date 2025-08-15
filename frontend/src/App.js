import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import ReactQuill from "react-quill";
import "quill/dist/quill.snow.css";

function App() {
  const [socket, setSocket] = useState(null);
  const [value, setValue] = useState("");
  const [docId, setDocId] = useState("my-collab-doc");
  const [docList, setDocList] = useState([]);

  // Connect to Socket.IO server
  useEffect(() => {
    const s = io("http://localhost:3001");
    setSocket(s);
    return () => s.disconnect();
  }, []);

  // Fetch document list
  const fetchDocuments = async () => {
    const res = await fetch("http://localhost:3001/api/documents");
    const data = await res.json();
    setDocList(data.map(d => d._id));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Load selected document
  useEffect(() => {
    if (!socket || !docId) return;

    socket.emit("get-document", docId);
    socket.once("load-document", (document) => {
      setValue(document);
    });

    socket.on("receive-changes", delta => {
      // Optional: Could integrate collaborative changes here
    });

    return () => {
      socket.off("receive-changes");
    };
  }, [socket, docId]);

  // Handle editor change
  const handleChange = (content, delta, source) => {
    setValue(content);
    if (source === "user" && socket) {
      socket.emit("send-changes", delta);
    }
  };

  // Auto-save
  useEffect(() => {
    if (!socket || !docId) return;

    const interval = setInterval(() => {
      socket.emit("save-document", value);
    }, 2000);

    return () => clearInterval(interval);
  }, [socket, value, docId]);

  // Create new document
  const createDocument = () => {
    const newId = prompt("Enter new document ID:");
    if (newId) {
      setDocId(newId);
      setValue("");
    }
  };

  // Delete current document
  const deleteDocument = async () => {
    if (!docId) return;
    const confirmDelete = window.confirm(`Delete document "${docId}"?`);
    if (!confirmDelete) return;

    const res = await fetch(`http://localhost:3001/api/documents/${docId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      alert("Document deleted.");
      setValue("");
      setDocId("");
      fetchDocuments();
    } else {
      alert("Failed to delete document.");
    }
  };

  // Save As (create a new document with current content)
  const saveAsDocument = async () => {
    const newId = prompt("Enter new name for 'Save As':");
    if (!newId) return;

    const res = await fetch(`http://localhost:3001/api/documents/${newId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: value }),
    });

    if (res.ok) {
      alert("Document saved as " + newId);
      fetchDocuments();
    } else {
      alert("Save As failed.");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Collaborative Document Editor</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label><strong>Choose Document:</strong></label>
        <select
          value={docId}
          onChange={e => setDocId(e.target.value)}
          style={{ marginLeft: "0.5rem" }}
        >
          <option disabled value="">-- Select a document --</option>
          {docList.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>

        <button onClick={createDocument} style={{ marginLeft: "1rem" }}>New</button>
        <button onClick={deleteDocument} style={{ marginLeft: "0.5rem" }}>Delete</button>
        <button onClick={saveAsDocument} style={{ marginLeft: "0.5rem" }}>Save As</button>
      </div>

      <ReactQuill value={value} onChange={handleChange} theme="snow" />
    </div>
  );
}

export default App;
