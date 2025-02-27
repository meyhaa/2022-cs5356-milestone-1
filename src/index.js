const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 8080;

// CS5356 TODO #2
// Uncomment this next line after you've created serviceAccountKey.json
const serviceAccount = require("./../config/serviceAccountKey.json");
const userFeed = require("./app/user-feed");
const authMiddleware = require("./app/auth-middleware");

// CS5356 TODO #2
// Uncomment this next block after you've created serviceAccountKey.json
admin.initializeApp({credential: admin.credential.cert(serviceAccount),
});

// use cookies
app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
// set the view engine to ejs
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/static", express.static("static/"));

// use res.render to load up an ejs view file
// index page
app.get("/", function (req, res) {
  res.render("pages/index");
});

app.get("/sign-in", function (req, res) {
  res.render("pages/sign-in");
});

app.get("/sign-up", function (req, res) {
  res.render("pages/sign-up");
});

app.get("/dashboard", authMiddleware, async function (req, res) {
  const feed = await userFeed.get();
  res.render("pages/dashboard", { user: req.user, feed });
});

app.post("/sessionLogin", async (req, res) => {
  // CS5356 TODO #4
  // Get the ID token from the request body
  const idToken = req.body.idToken;

  // Setting cookie expiration to be 2 days 
  const expiresIn = 60 * 60 * 24 * 2 * 1000;
  
  // Create a session cookie using the Firebase Admin SDK
  admin.auth().createSessionCookie(idToken, { expiresIn })
  .then(
    sessionCookie => {
      const options = { maxAge: expiresIn, httpOnly: true};
      // Set that cookie with the name 'session'
      res.cookie("session", sessionCookie, options);
      // And then return a 200 status code instead of a 501
      res.status(200).send(JSON.stringify({status: "success"}));  
    }, 
    error => {
      console.log("error", error);
      res.status(401).send("Unauthorized Request!!");
      res.redirect("/sign-up");
    }
  );
  //res.status(501).send();
});

app.get("/sessionLogout", (req, res) => {
  res.clearCookie("session");
  res.redirect("/sign-in");
});

app.post("/dog-messages", authMiddleware, async (req, res) => {
  // CS5356 TODO #5

  try{
    // Get the message that was submitted from the request body
    const userMessage = req.body.message.toString();
    // Get the user object from the request body
    const user = req.user
    // Add the message to the userFeed so its associated with the user
    await userFeed.add(user, userMessage); 
    // Refresh the dashboard 
    res.redirect("/dashboard"); 
  } catch(err) {
    res.status(500).send({message: err});
  }
});

app.listen(port);
console.log("Server started at http://localhost:" + port);
