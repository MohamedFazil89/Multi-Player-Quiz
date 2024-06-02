import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { Server } from "socket.io";
import session from "express-session";

const app = express();
const port = 3000;

// --------------Middlewere-------------------- \\

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// -------------Session manage---------------------- \\

app.use(session({
    secret: 'thisissecretkeyverystrong',
    resave: false,
    saveUninitialized: true,
}));

// -------------Database-connect---------------------- \\


const db = new pg.Client({
    user: 'postgres',
    password: 'shin2005-89',
    database: 'quizdb',
    host: 'localhost',
    port: 5432,
});

db.connect();



// ---------------Post-function-------------------- \\
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

// --------------Login-check-function--------------------- \\


let hostname;
let playername;

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
                    playername = result.rows[0].username

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

// ----------------Routes------------------- \\



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

// ---------------login-route-------------------- \\


app.post("/login", (req, res) => {
    const { username, password, role } = req.body;
    checkfunc(username, password, res, role);



})

// -----------------submit-route------------------ \\


app.post("/submit", (req, res) => {
    const { username, password, role, email } = req.body;
    postfunc(username, email, role, password, res);
    setTimeout(() => {
        res.redirect("/");
    }, 3000)


});

// --------------player-route--------------------- \\


app.get("/player", (req, res) => {
    res.render("player.ejs")
});



// ----------------list-data-in-db------------------- \\

app.get("/list", (req, res) => {
    var val = '';
    db.query('select * from questions', (err, results) => {
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

// ---------------server-port-------------------- \\



const server = app.listen(port, () => {
    console.log(`Server is running on the port https://localhost:${port}`);
});



// ---------------Web-Socket-function-Init-------------------- \\

let RoomIDs = [];


db.query(`Select * from ROOMID`, (err, result) => {
    if (err) {
        console.log(err);
    } else {
        RoomIDs = result.rows;

    }
    console.log(RoomIDs)

})

// -------------PostID---------------------- \\


// let update_arr_state = false;
let playerstatus = false;

// POST FUNC
let poststatus = false;
function postid(id, host, callback) {
    db.query(`SELECT * FROM ROOMID WHERE host = $1 OR IDs = $2`, [host, id], (err, result) => {
        if (err) {
            console.error(err);
            if (callback) callback(err, null);
            return;
        }

        if (result.rows.length > 0) {
            console.log('ID exists');
            poststatus = true;
            if (callback) callback(null, 'host exists');
        } else {
            db.query(`INSERT INTO ROOMID (IDs, host) VALUES ($1, $2)`, [id, host], (err, res) => {
                if (!err) {
                    console.log('Data successfully registered into Table ROOMID');
                    poststatus = true;
                    if (callback) callback(null, 'Data successfully registered');

                } else {
                    console.error(err);
                    if (callback) callback(err, null);
                }
            });
        }
    });
}


// ------------------CheckID----------------- \\

// CHECK ROOM ID FUNC
function checkid(roomid, callback) {
    db.query(`SELECT * FROM ROOMID WHERE IDs = $1`, [roomid], (err, result) => {
        if (err) {
            console.error(err);
            callback(false);
        } else {
            if (result.rows.length > 0) {
                console.log("room id exists");
                callback(true);
            } else {
                console.log("room id does not exist");
                callback(false);
            }
        }
    });
}



// ---------------Socket-Connections-Code-------------------- \\

let NumofPlayer = 0;
let connectedPlayers = [];
let roomids;


const io = new Server(server);
io.on('connection', (socket) => {
    // console.log('a user connected');

    socket.on('hostConnect',(value) =>{
        console.log("host connected");
        console.log(value);
    })

    socket.on('createroom', (roomid) => {
        if (!RoomIDs.includes(roomid)) {
            // RoomIDs.push(roomid);
            socket.join(roomid);
            console.log(hostname);
            postid(roomid, hostname);
            // update_arr_state = true;
        } else {
            console.log("room already exists");
            // update_arr_state = false;


        }
       
        console.log(RoomIDs);
    })

    socket.on('joinRooms',  (roomid) => {
        // console.log(roomid)
        checkid(roomid, (status) => {
            if (status) {
                roomids = roomid
                socket.join(roomid);
                console.log(`Socket ${socket.id} joined room ${roomid}`);
                console.log(++NumofPlayer)
                playerstatus = true;
            } else {
                console.log("room does not exist");
                console.log("status:", status)
                // console.log(RoomIDs);

            }

        });
    })




    socket.on('playerConnect', (value) =>{
        connectedPlayers.push(socket.id);
        console.log(value);
        io.emit('updatePlayerList', connectedPlayers);

    })

    socket.on('disconnect', () => {
        // console.log('user disconnected');
        connectedPlayers = connectedPlayers.filter(playerId => playerId !== socket.id);
        io.emit('updatePlayerList', connectedPlayers);


    });

    // socket code end  
});

// ---------------Routes-------------------- \\

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

// ------------Question-loop-logic----------------------- \\

app.get("/enter-question", (req, res) => {
    const { totalQuestions, currentQuestionIndex } = req.session;

    if (currentQuestionIndex < totalQuestions) {
        res.render("index3.ejs", { questionNumber: currentQuestionIndex + 1 });
    } else {
        res.redirect("/next-task");
    }
});


// -------------Submit-Routes---------------------- \\


app.post("/submit-question", (req, res) => {
    const { question, option1, option2, option3, option4, correctans } = req.body;
    const { totalQuestions, currentQuestionIndex } = req.session;

    db.query(
        `INSERT INTO questions (host, questions, option1, option2, option3, option4, correctans) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [hostname,question, option1, option2, option3, option4, correctans],
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

// --------------Room-id-page-for-host--------------------- \\


app.get("/next-task", (req, res) => {
    res.render("room.ejs");
});

// ---------------Join-Route-------------------- \\


app.get("/join", (req, res) => {
    if (poststatus) {
        res.render("host.ejs", { playerlist: connectedPlayers });
    } else {
        res.send("Room id not avalable");
    }
})

// --------------Player-Join-Route--------------------- \\


// Update the route handler for main.ejs to fetch questions
app.get("/joinRoom", async (req, res) => {
    console.log(roomids);
    if (playerstatus) {
        // Fetch questions from the database
        const hostq = await db.query('select host from roomid where ids = $1',[roomids])
        console.log(hostq.rows[0].host)
        db.query('SELECT * FROM questions where host = $1',[hostq.rows[0].host], (err, results) => {
            if (err) {
                console.error("Error fetching questions:", err);
                res.status(500).send("An error occurred while fetching questions");
                return;
            }
            
            const questions = results.rows;
            
            // Render main.ejs and pass the questions data
            res.render("main.ejs", { questions });
        });
    } else {
        res.send("Room not available");
    }
});

// --------------Part-1-End-------------------- \\


// logic for question render in main page 


app.post("/submit-quiz", (req, res) => {
    const submittedAnswers = req.body; // Object containing submitted answers from the form
    console.log("Submitted Answers:", submittedAnswers); // Debugging: Log submitted answers
    let score = 0;

    // Retrieve the correct answers from the database
    db.query('SELECT * FROM questions', (err, results) => {
        if (err) {
            console.error("Error fetching questions:", err);
            res.status(500).send("An error occurred while fetching questions");
            return;
        }

        const correctAnswers = results.rows;

        // Compare the user's answers with the correct answers
        correctAnswers.forEach((question, index) => {
            const correctAnswer = question.correctans;
            const userAnswer = submittedAnswers[`answer${index}`];
            console.log(`Question ${index + 1}: Correct Answer - ${correctAnswer}, User Answer - ${userAnswer}`); // Debugging: Log correct and user answers
            if (correctAnswer === userAnswer) {
                score++;
            }
        });

        // Calculate the total number of questions
        const totalQuestions = correctAnswers.length;

        // Render the feedback page with the user's score
        res.render("quiz-feedback.ejs", { score, totalQuestions });
    });
});



