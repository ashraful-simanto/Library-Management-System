const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

app.use(express());
app.use(express.json());
app.use(cors());

// mongDB things
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.e4khssl.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("LMS").collection("users");

    const borrowCollection = client.db("LMS").collection("borrow");

    const bookCollection = client.db("LMS").collection("books");

    const categoryCollection = client.db("LMS").collection("CategoryBook");

    app.get("/categories", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });
    app.post("/books", async (req, res) => {
      const book = req.body;
      console.log(book);
      const result = await bookCollection.insertOne(book);
      res.send(result);
    });

    app.post("/user", async (req, res) => {
      const data = req.body;
      const result = await userCollection.insertOne(data);
      res.send(result);
    });

    app.get("/allBooks", async (req, res) => {
      const result = await bookCollection.find().toArray();
      res.send(result);
    });

    app.post("/borrow", async (req, res) => {
      const { userEmail, bookId } = req.body;

      console.log(userEmail, bookId);

      const book = await bookCollection.findOne({
        _id: new ObjectId(bookId),
      });

      if (!book) {
        return res.status(404).send({ message: "Book not found" });
      }

      if (book.quantity <= 0) {
        return res.status(400).send({ message: "Book not available" });
      }

      const borrowDate = new Date().toISOString().split("T")[0];

      const expiryDateObj = new Date();
      expiryDateObj.setDate(expiryDateObj.getDate() + 20);
      const expiryDate = expiryDateObj.toISOString().split("T")[0];

      const borrowData = {
        userEmail,
        bookId,
        bookName: book.name,
        borrowDate,
        expiryDate, // after 20 days
        status: "borrowed",
      };

      const newQuantity = book.quantity - 1;

      const borrowResult = await borrowCollection.insertOne(borrowData);

      await bookCollection.updateOne(
        { _id: new ObjectId(bookId) },
        {
          $set: {
            quantity: newQuantity,
          },
        },
      );

      res.send(borrowResult);
    });

    app.delete("/borrow/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        bookId: id,
      };
      const result= await borrowCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/borrow/:email", async (req, res) => {
      const email = req.params.email;
      console.log("borrow email", email);
      const result = await borrowCollection
        .find({ userEmail: email })
        .toArray();
      res.send(result);
    });

    app.get("/books", async (req, res) => {
      const category = req.query.category;
      console.log("category is ", category);
      const query = {
        category: category,
      };
      const result = await bookCollection.find(query).toArray();

      res.send(result);
    });

    app.get("/books/:_id", async (req, res) => {
      const id = req.params._id;
      console.log(id);

      const query = { _id: new ObjectId(id) };

      const book = await bookCollection.findOne(query);

      res.send(book);
    });

    // Send a ping to confirm a successful connection
    await client.db("LMS").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server running successfully");
});

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });
