import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { bookService } from "../services/book";
import AddBookIco from "../components/ui/AddBookIco";
const AdminBookManager = () => {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    author_id: "",
    new_author: "",
    pdf: null,
    cover_image: null,
  });

  useEffect(() => {
    fetchBooks();
    fetchCategories();
    fetchAuthors();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await bookService.getBooks();
      setBooks(response.books || []);
    } catch (error) {
      console.error("Error fetching books:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await bookService.getCategories();
      setCategories(response.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchAuthors = async () => {
    try {
      // Giả sử có API lấy authors
      const response = await fetch("/api/authors");
      const data = await response.json();
      setAuthors(data.authors || []);
    } catch (error) {
      console.error("Error fetching authors:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files[0],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = new FormData();

      // Thêm các trường cơ bản
      submitData.append("title", formData.title);
      submitData.append("description", formData.description);
      submitData.append("category_id", formData.category_id);

      // Xử lý tác giả
      if (formData.author_id) {
        submitData.append("author_id", formData.author_id);
      } else if (formData.new_author) {
        submitData.append("new_author", formData.new_author);
      }

      // Thêm files
      if (formData.pdf) submitData.append("pdf", formData.pdf);
      if (formData.cover_image)
        submitData.append("cover_image", formData.cover_image);

      if (editingBook) {
        await bookService.updateBook(editingBook.id, submitData);
        alert("✅ Book updated successfully!");
      } else {
        await bookService.createBook(submitData);
        alert("✅ Book added successfully!");
      }

      resetForm();
      fetchBooks();
    } catch (error) {
      console.error("Error saving book:", error);
      alert(
        "❌ Error saving book: " + (error.response?.data?.error || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category_id: "",
      author_id: "",
      new_author: "",
      pdf: null,
      cover_image: null,
    });
    setEditingBook(null);
    setShowAddForm(false);
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      description: book.description,
      category_id: book.category_id || "",
      author_id: (Array.isArray(book.authors_list) && book.authors_list.length > 0)
        ? book.authors_list[0].id
        : (Array.isArray(book.authors) && book.authors.length > 0)
        ? (typeof book.authors[0] === 'object' ? book.authors[0].id : "")
        : "",
      new_author: "",
      pdf: null,
      cover_image: null,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (bookId) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;

    try {
      await bookService.deleteBook(bookId);
      alert("✅ Book deleted successfully!");
      fetchBooks();
    } catch (error) {
      console.error("Error deleting book:", error);
      alert("❌ Error deleting book");
    }
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container>
      <Header>
        <Title>📚 Book Management</Title>
        <AddBookIco />
        <Button onClick={() => setShowAddForm(true)}>➕ Add New Book</Button>
      </Header>

      <SearchBox>
        <input
          type="text"
          placeholder="🔍 Search books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchBox>

      {/* Form Thêm/Chỉnh Sửa Sách */}
      {showAddForm && (
        <ModalOverlay>
          <Modal>
            <ModalHeader>
              <h3>{editingBook ? "Edit Book" : "Add New Book"}</h3>
              <CloseButton onClick={resetForm}>×</CloseButton>
            </ModalHeader>

            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <label>📖 Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>

              <FormGroup>
                <label>📝 Description</label>
                <textarea
                  name="description"
                  rows="4"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormRow>
                <FormGroup>
                  <label>📁 Category *</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup>
                  <label>✍️ Author</label>
                  <select
                    name="author_id"
                    value={formData.author_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select existing author</option>
                    {authors.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                  <small>or add new author:</small>
                  <input
                    type="text"
                    name="new_author"
                    placeholder="New author name"
                    value={formData.new_author}
                    onChange={handleInputChange}
                  />
                </FormGroup>
              </FormRow>

              <FormRow>
                <FormGroup>
                  <label>📄 File PDF</label>
                  <input
                    type="file"
                    name="pdf"
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                </FormGroup>

                <FormGroup>
                  <label>🖼️ Cover Image</label>
                  <input
                    type="file"
                    name="cover_image"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </FormGroup>
              </FormRow>

              <ButtonGroup>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? "⏳ Processing..."
                    : editingBook
                    ? "💾 Update"
                    : "➕ Add Book"}
                </Button>
              </ButtonGroup>
            </Form>
          </Modal>
        </ModalOverlay>
      )}

      {/* Danh sách sách */}
      <BookGrid>
        {filteredBooks.map((book) => (
          <BookCard key={book.id}>
            <BookImage
              src={book.cover_image || "/default-book-cover.jpg"}
              alt={book.title}
            />
            <BookInfo>
              <BookTitle>{book.title}</BookTitle>
              <BookMeta>
                <span>📁 {book.category?.name}</span>
                <span>👁️ {book.view_count} views</span>
              </BookMeta>
              <BookDescription>
                {book.description?.substring(0, 100)}...
              </BookDescription>
              <BookAuthors>
                Author:{" "}
                {Array.isArray(book.authors_list) && book.authors_list.length > 0
                  ? book.authors_list.map((a) => a.name).join(", ")
                  : Array.isArray(book.authors)
                  ? book.authors.map((a) => (typeof a === 'object' ? a.name : a)).join(", ")
                  : book.authors || "Unknown"}
              </BookAuthors>
              <ActionButtons>
                <EditButton onClick={() => handleEdit(book)}>✏️ Edit</EditButton>
                <DeleteButton onClick={() => handleDelete(book.id)}>
                  🗑️ Delete
                </DeleteButton>
              </ActionButtons>
            </BookInfo>
          </BookCard>
        ))}
      </BookGrid>

      {filteredBooks.length === 0 && (
        <EmptyState>
          <p>📚 No books yet</p>
          <Button onClick={() => setShowAddForm(true)}>
            Add first book
          </Button>
        </EmptyState>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
`;

const SearchBox = styled.div`
  margin-bottom: 2rem;

  input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: #4a90e2;
    }
  }
`;

const BookGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const BookCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`;

const BookImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const BookInfo = styled.div`
  padding: 1.5rem;
`;

const BookTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.2rem;
`;

const BookMeta = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #666;
`;

const BookDescription = styled.p`
  color: #666;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const BookAuthors = styled.div`
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 1rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button`
  background: ${(props) =>
    props.variant === "outline" ? "transparent" : "#4A90E2"};
  color: ${(props) => (props.variant === "outline" ? "#4A90E2" : "white")};
  border: 2px solid #4a90e2;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.variant === "outline" ? "#f0f8ff" : "#357abd"};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EditButton = styled.button`
  background: #f0f0f0;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background: #e0e0e0;
  }
`;

const DeleteButton = styled.button`
  background: #ffebee;
  color: #d32f2f;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background: #ffcdd2;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  padding: 0;
  max-width: 80vw;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;

  h3 {
    margin: 0;
    color: #333;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;

  &:hover {
    color: #333;
  }
`;

const Form = styled.form`
  padding: 1.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
  }

  input,
  select,
  textarea {
    width: 98%;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: #4a90e2;
    }
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: #666;
    font-size: 0.8rem;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;

  p {
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }
`;

export default AdminBookManager;
