import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { Server } from "socket.io";



const app = express();



const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

const db = new pg.Client({
    user: 'postgres', 
    password: 'shin2005-89', 
    database: 'quizdb', 
    host: 'localhost', 
    port: 5432, 
});

db.connect();


let errs = "";
let status = false;



// In all the querys i mentioned users that is your database -> table name
const postfunc = (username, email, role, password, res) => {
    db.query(`insert into ${role} (username, email, password) values ($1, $2, $3)`, [username, email, password], (err, res) => {
        if (!err) {
            console.log(`DataSuccessfully registered  into Table ${role}`);
            status = true;
        } else {
            console.log(err);
            errs = "username must be unique";
            status = false;

        }
      
    });
}

const checkfunc = (username, password, res, role) => {
    db.query(`SELECT * FROM ${role} WHERE username = $1 AND password = $2`, [username, password], (err, result) => {
        if (!err) {
            if (result.rows.length > 0) {
                console.log("User exists:", result.rows[0], "from " + `${role} table`);
                if(role == "host"){
                    res.render("index2.ejs");
                }else{
                    res.render("player.ejs");
                }

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
    postfunc(username, email, role, password, res);
    res.redirect("/");
    

});

app.get("/list", (req, res) => {
    var val = '';
    db.query('select * from host', (err, results) => {
        if (!err) {
            val = JSON.stringify(results.rows);
            console.log(val);
            console.log("done");
            val = JSON.stringify(val)
            val = val.replace(/^"(.*)"$/, '$1');

            res.send(val)
            // res.render("index.ejs", {
            //     data: val,
            // });
        } else {
            console.log("error");
        }

    });

})

const server = app.listen(port, () => {
    console.log(`Server is running on the port https://localhost:${port}`);
});

const io = new Server(server);
io.on('connection', (socket) =>{
    console.log('a player connected');

    socket.on('disconnect',() =>{
        console.log('player disconnected');
    });

  



    
} );

app.post("/upload", (req, res)=>{
    const NofQuestion = req.body;
    const value = NofQuestion.NofQuestion;
    console.log(value);
    for(let i = 0; i<=value; i++){
        res.render("index3.ejs");
    }

});

app.post("/uploaded", (req, res) => {
    const { question, option1, option2, option3, option4, correctans } = req.body;
    
    db.query(`INSERT INTO QUESTIONS (questions, option1, option2, option3, option4, correctans) VALUES ($1, $2, $3, $4, $5, $6)`, [question, option1, option2, option3, option4, correctans], (err, result) => {
        if (!err) {
            console.log(`Data successfully registered into Table questions`);
        } else {
            console.error(err);
            res.status(500).send("An error occurred while processing your request");
        }
    });
});

