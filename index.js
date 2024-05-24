import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { Server } from "socket.io";
import session from "express-session";



const app = express();



const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));


app.use(session({
    secret: 'thisissecretkeyverystrong', 
    resave: false,
    saveUninitialized: true,
}));

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
                if (role == "host") {
                    res.render("index2.ejs");

                } else {
                    res.redirect("/player");
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
    setTimeout(() => {
        res.redirect("/");
    }, 3000)


});

app.get("/player", (req, res) => {
    db.query("SELECT * FROM questions", (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Internal Server Error');
            return;
        }

        let rows = JSON.stringify(result.rows);
        rows = JSON.parse(rows);


        if (rows.length === 0) {
            res.status(404).send('No questions found');
            return;
        }

        let value;
        let options1;
        let options2;
        let options3;
        let options4;

        for (let i = 0; i < rows.length; i++) {
            value = rows[i].questions;
            options1 = rows[i].option1;
            options2 = rows[i].option2;
            options3 = rows[i].option3;
            options4 = rows[i].option4;


        }

        console.log("value", value);


        res.render("player.ejs", {
            question: value,
            option1: options1,
            option1: options1,
            option1: options1,
            option1: options1,

        });
    });
});


app.get("/list", (req, res) => {
    var val = '';
    db.query('select * from = questions', (err, results) => {
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



// socket code init

let RoomIDs = [];

const io = new Server(server);
io.on('connection', (socket) => {
    // console.log('a user connected');

    socket.on('joinroom', (roomid) =>{
        socket.join(roomid);
        if(!RoomIDs.includes(roomid)){
            RoomIDs.push(roomid);
        }else{
            console.log("room already exists");
        }
        console.log(RoomIDs)
    })


    socket.on('disconnect', () => {
        // console.log('user disconnected');
    });

// socket code end  



});
app.post("/upload", (req, res) => {
    const { NofQuestion } = req.body;
    const totalQuestions = parseInt(NofQuestion, 10);
    
    if (!isNaN(totalQuestions) && totalQuestions > 0) {
        req.session.totalQuestions = totalQuestions;
        req.session.currentQuestionIndex = 0;
        res.redirect("/enter-question");
    } else {
        res.status(400).send("Invalid number of questions");
    }
});

app.get("/enter-question", (req, res) => {
    const { totalQuestions, currentQuestionIndex } = req.session;

    if (currentQuestionIndex < totalQuestions) {
        res.render("index3.ejs", { questionNumber: currentQuestionIndex + 1 });
    } else {
        res.redirect("/next-task"); 
    }
});

app.post("/submit-question", (req, res) => {
    const { question, option1, option2, option3, option4, correctans } = req.body;
    const { totalQuestions, currentQuestionIndex } = req.session;

    db.query(
        `INSERT INTO questions (questions, option1, option2, option3, option4, correctans) VALUES ($1, $2, $3, $4, $5, $6)`,
        [question, option1, option2, option3, option4, correctans],
        (err) => {
            if (!err) {
                console.log(`Question ${currentQuestionIndex + 1} successfully registered`);
                req.session.currentQuestionIndex++;

                if (req.session.currentQuestionIndex < totalQuestions) {
                    res.redirect("/enter-question");
                } else {
                    res.redirect("/next-task"); 
                }
            } else {
                console.error(err);
                res.status(500).send("An error occurred while processing your request");
            }
        }
    );
});

app.get("/next-task", (req, res) => {
    res.render("room.ejs")
});

app.get("/join", (req, res) =>{
    res.send(RoomIDs)
})

