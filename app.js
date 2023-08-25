const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "tasks.db");
let db = null;

// Initialize DataBase And Server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//User Register
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
        INSERT INTO 
          user (username, name, password, gender, location) 
        VALUES 
          (
            '${username}', 
            '${name}',
            '${hashedPassword}', 
            '${gender}',
            '${location}'
          )`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.send(`Created new user with ${newUserId}`);
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

// User Login
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

// Token AuthenticateToken
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

// // Profile
// app.get("/profile/", authenticateToken, async (request, response) => {
//     let { username } = request;
//     const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
//     const userDetails = await db.get(selectUserQuery);
//     response.send(userDetails);
// });

// Get Method All
app.get("/tasks/", authenticateToken, async (request, response) => {
  const getTaskQuery = `
      SELECT
        *
      FROM
        task
      ORDER BY
        id;`;
  const tasksArray = await db.all(getTaskQuery);
  response.send(tasksArray);
});

// Get Method
app.get("/tasks/:taskId/", authenticateToken, async (request, response) => {
  const taskId = request.body;
  const getTaskQuery = `
    SELECT
      *
    FROM
      task
    WHERE taskId = ${taskId}`;
  const tasksArray = await db.get(getTaskQuery);
  response.send(tasksArray);
});

// POST Method
app.post("/tasks/", authenticateToken, async (request, response) => {
  const taskDetails = request.body;
  const { title, id, description } = taskDetails;
  const addQuery = `
      INSERT INTO
      task (title, id, description)
      VALUES
        (
          '${title}',
           ${id},
          '${description}',
        );`;

  const dbResponse = await db.run(addQuery);
  const taskId = dbResponse.lastID;
  response.send({ taskId: taskId });
});

// PUT Method (Update)
app.put("/tasks/:taskId/", authenticateToken, async (request, response) => {
  const { taskId } = request.params;
  const taskDetails = request.body;
  const { title, description } = taskDetails;
  const updateTaskQuery = `
      UPDATE
      task
      SET
        title='${title}',
        description='${description}',
      WHERE
        task_id = ${taskId};`;
  await db.run(updateTaskQuery);
  response.send("task Updated Successfully");
});

// DELETE Method
app.delete("/tasks/:taskId/", authenticateToken, async (request, response) => {
  const { taskId } = request.params;
  const deleteTaskQuery = `
      DELETE FROM
      task
      WHERE
      id = ${taskId};`;
  await db.run(deleteTaskQuery);
  response.send("task Deleted Successfully");
});
