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

let hostname;

const checkfunc = (username, password, res, role) => {
    db.query(`SELECT * FROM ${role} WHERE username = $1 AND password = $2`, [username, password], (err, result) => {
        if (!err) {
            if (result.rows.length > 0) {
                console.log("User exists:", result.rows[0], "from " + `${role} table`);
                if (role == "host") {
                    res.render("index2.ejs");
                    hostname = result.rows[0].username

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


db.query(`Select * from ROOMID`, (err, result) => {
    if (err) {
        console.log(err);
    } else {
        RoomIDs = result.rows;

        // console.log(result.rows);
    }
    console.log(RoomIDs)

})
let update_arr_state = false;
let playerstatus;

// POST FUNC
function postid(id, host, callback) {
    db.query(`SELECT * FROM ROOMID WHERE host = $1 AND IDs = $2`, [host, id], (err, result) => {
        if (err) {
            console.error(err);
            if (callback) callback(err, null);
            return;
        }

        if (result.rows.length > 0) {
            // Host already exists
            console.log('ID exists');
            if (callback) callback(null, 'host exists');
        } else {
            // Host does not exist, insert the new record
            db.query(`INSERT INTO ROOMID (IDs, host) VALUES ($1, $2)`, [id, host], (err, res) => {
                if (!err) {
                    console.log('Data successfully registered into Table ROOMID');
                    if (callback) callback(null, 'Data successfully registered');
                } else {
                    console.error(err);
                    if (callback) callback(err, null);
                }
            });
        }
    });
}



// CHECK ROOM ID FUNC

function checkid(roomid) {

    db.query(`SELECT * FROM  WHERE IDs = $1 `, [roomid], (err, result) => {
        if (!err) {
            if (result.rows.length > 0) {
                console.log("room id exist");
                return true
            } else {
                console.log("room id not exist");
                return false;
            }
        } else {
            console.error(err);
        }

    });
}








const io = new Server(server);
io.on('connection', (socket) => {
    // console.log('a user connected');

    socket.on('createroom', (roomid) => {
        if (!RoomIDs.includes(roomid)) {
            RoomIDs.push(roomid);
            socket.join(roomid);
            console.log(hostname);
            postid(roomid, hostname);
            update_arr_state = true;
        } else {
            console.log("room already exists");
            update_arr_state = false;


        }
        console.log(RoomIDs);
    })

    socket.on('joinRooms', (roomid) => {

        if (checkfunc(roomid)) {
            socket.join(roomid);
            console.log(`Socket ${socket.id} joined room ${roomid}`);
            playerstatus = true;
        } else {
            console.log("room does not exist");
            playerstatus = false;
            console.log(RoomIDs);

        }
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

app.get("/join", (req, res) => {
    if (update_arr_state == true) {
        res.render("host.ejs")
    } else {
        res.send("Room id not avalable")
    }
})

app.get("/joinRoom", (req, res) => {
    if (playerstatus) {
        res.send("joined room");
    } else {
        res.send("room not avalable")
    }
})
