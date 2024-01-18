import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";

const app = express();
const port = 3000;
const API_URL = "https://secrets-api.appbrewery.com";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "library",
  password: "root",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let books = [
  { id: 1, title: "Buy milk", rating: 4.5, review: "great", isbn: 9783247887436 },
  { id: 2, title: "Finish homework", rating: 4, review: "regular", isbn: 9780127887436 },
];

let bookCovers = [];

async function getBookCover() {
    try {
        const result = await db.query(
            'SELECT books.id, books.title, books.isbn, covers.cover_url FROM books LEFT JOIN covers ON books.id = covers.book_id WHERE covers.cover_url IS NULL;'
        );
        const booksWithoutCovers = result.rows;
        for (const book of booksWithoutCovers) {
            const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${books.isbn}-L.jpg`);
            const imageData = response.request.res.responseUrl;
            await db.query('INSERT INTO covers (book_id, cover_url) VALUES ($1, $2);', [book.id, imageData]);
    }
    } catch (error) {
        console.error('Error fetching book cover:', error.message);
    }
    }

await getBookCover()

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books ORDER BY id ASC");
    books = result.rows;
    const covers = await db.query("SELECT * FROM covers ORDER BY id ASC");
    bookCovers = covers.rows;
    res.render("index.ejs", {
      books: books,
      covers: bookCovers,
    });
  } catch (err) {
    console.log(err);
  }
});

app.get("/add", async (req, res) => {
    res.render("add.ejs");
    });

app.post("/add", async (req, res) => {
  const title = req.body.title;
  const rating = req.body.rating;
  const isbn = req.body.isbn;
  const review = req.body.review;
  try {
    await db.query("INSERT INTO books (title, rating, review, isbn) VALUES ($1, $2, $3, $4)", [title, rating, review, isbn]);
    await getBookCover();
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.get("/update", async (req, res) => {
    res.render("update.ejs");
  });

app.post("/update", async (req, res) => {
  const item = req.body.updatedItemTitle;
  const id = req.body.updatedItemId;

  try {
    await db.query("UPDATE items SET title = ($1) WHERE id = $2", [item, id]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", async (req, res) => {
  const id = req.body.deleteItemId;
  try {
    await db.query("DELETE FROM items WHERE id = $1", [id]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
