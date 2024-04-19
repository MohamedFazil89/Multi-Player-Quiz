import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
const app = express();

const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

const db = new pg.Client({
    user: 'postgres', // default user name for all users
    password: 'shin2005-89', // your own postgresql password
    database: 'testdb', // your own database name
    host: 'localhost', // localhost defualt or any host name
    port: 5432, // default port
});

db.connect();

// In all the querys i mentioned users that is your database -> table name
const postfunc = (username, password) =>{
    db.query('insert into users values ($1, $2)', [username, password], (err, res) =>{
        if(!err){
            console.log("success");
        }else{
            console.log(err);
        }
    });
}

const checkfunc = (username, password,  res) => {
    db.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password], (err, result) => {
        if (!err) {
            if (result.rows.length > 0) {
                console.log("User exists:", result.rows[0]);
                res.render("index2.ejs");

            } else {
                console.log("Not a member!! Register!!");
                res.send("Not a member!! Regester!!")
            }
        } else {
            console.error("Error checking user:", err);
        }
    });
    
}


app.get("/", (req, res) =>{
    db.query("select * from users", (err, result) =>{
        if(err){
            console.log(err);
            res.status(500).send('Internal Server Error');
            return;
        }
        const rows = JSON.stringify(result.rows);
        res.render("index.ejs", { rowss: rows });
    });

})

app.post("/login", (req, res) =>{
   const { username, password } = req.body;
   checkfunc(username, password, res);


})

app.post("/submit", (req, res) =>{
    const { username, password } = req.body;
    postfunc(username, password);
    res.redirect("/");
});

app.get("/list", (req, res) =>{
    var val = '';
    db.query('select * from users', (err, results) =>{
        if(!err){
            val = JSON.stringify(results.rows);
            val = val.replace(/^"(.*)"$/, '$1');
            console.log("done")
            res.render("index.ejs", {
                data: val,
            })
        }else{
            console.log("error")
        }
        
    });
    
})

app.listen(port, ()=>{
    console.log(`Server is running on the port https://localhost:${port}`);
});
