// src/components/ui/ChapterButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";

function ChapterButton({ bookId, bookTitle }) {
  const navigate = useNavigate();

  const handleCreateChapter = () => {
    navigate(`/books/${bookId}/chapters/create`, {
      state: { bookTitle },
    });
  };

  return <Button onClick={handleCreateChapter}>Create New Chapter</Button>;
}

export default ChapterButton;
