import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
const app = express();

// At the beginning run these commands

//      npm i

//     nodemon index.js 



const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

const db = new pg.Client({
    user: 'postgres', // default user name for all users
    password: 'shin2005-89', // your own postgresql password
    database: 'quizdb', // your own database name
    host: 'localhost', // localhost defualt or any host name
    port: 5432, // default port
});

db.connect();


let errs = "";
let status = false;



// In all the querys i mentioned users that is your database -> table name
const postfunc = (username, email, role, password) => {
    db.query(`insert into ${role} (username, email, password) values ($1, $2, $3)`, [username, email, password], (err, res) => {
        if (!err) {
            console.log(`DataSuccessfully registered  into Table ${role}`);
            status = true;
        } else {
            console.log(err);
            errs = "username must be unique"
            status = false;
        }
    });
}

const checkfunc = (username, password, res, role) => {
    db.query(`SELECT * FROM ${role} WHERE username = $1 AND password = $2`, [username, password], (err, result) => {
        if (!err) {
            if (result.rows.length > 0) {
                console.log("User exists:", result.rows[0], "from " + `${role} table`);
                res.render("index2.ejs");

            } else {
                console.log("Not a member!! Register!!");
                res.send("Not a member!! Regester!!");
            }
        } else {
            console.error("Error checking user:", err);
        }
    });

}


app.get("/", (req, res) => {
    db.query("select * from player", (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const rows = JSON.stringify(result.rows);
        res.render("index.ejs", { rowss: rows });
    });

})

app.post("/login", (req, res) => {
    const { username, password, role } = req.body;
    checkfunc(username, password, res, role);



})

app.post("/submit", (req, res) => {
    const { username, password, role, email } = req.body;
    postfunc(username, email, role, password);
    res.redirect("/");
    

});

app.get("/list", (req, res) => {
    var val = '';
    db.query('select * from host', (err, results) => {
        if (!err) {
            val = JSON.stringify(results.rows);
            val = val.replace(/^"(.*)"$/, '$1');
            console.log(val);
            console.log("done")
            res.render("index.ejs", {
                data: val,
            });
        } else {
            console.log("error");
        }

    });

})

app.listen(port, () => {
    console.log(`Server is running on the port https://localhost:${port}`);
});
