'use strict';

var fs                   = require('fs');
var path                 = require("path");
var cors                 = require('cors');
const express            = require('express');

const celery             = require('celery-node');
const Datastore          = require('nedb');
const orderDB            = require("./dataOrder.js");
const UserDB             = require("./dataUser.js");

const bcrypt             = require('bcrypt');
const passport           = require('passport');
const flash              = require('express-flash');
const session            = require('express-session');
const SQLiteStore        = require('connect-sqlite3')(session)
const methodOverride     = require('method-override');
const initializePassport = require('./passport-config');

const zip                = require('express-zip')

const app = express();
app.use(cors());
app.use(express.json());

app.use("/dist", express.static(path.join(__dirname, "dist/")));
app.use("/public",   express.static(path.join(__dirname, "webapp/public/")));
app.use("/logsGames",   express.static(path.join(__dirname, "../logsGames/")));

function fromDir(startPath,filter){
  var files_list = [];
  var files=fs.readdirSync(startPath);
  for(var i=0;i<files.length;i++){
      var filename=path.join(startPath,files[i]);
      var stat = fs.lstatSync(filename);
      if (filename.indexOf(filter)>=0) {
          files_list.push(filename);
      };
  };
  return files_list;
}

function get_path(file){
  return path.join(path.join(__dirname, "webapp/"), file);
}

// Load Databases

console.log('Loading MongoDB Users ...');
const db2 = new Datastore({filename: './app/Data/users.db', autoload: true})
db2.loadDatabase(err => {
  if (err) console.log('Error Database Users:', err); 
  else console.log('MongoDB Users OK!');
});

const usersDB = new UserDB.default(db2)

console.log('Loading MongoDB Orders ...');
const db1 = new Datastore({filename: './app/Data/database.db', autoload: true})
db1.loadDatabase(err => {
    if (err) console.log('Error Database Orders:', err); 
    else console.log('MongoDB Orders OK!');
});


const ordersDB = new orderDB.default(db1)

// Authentication
initializePassport(
  passport,
  email => usersDB.getUserByEmail(email),
  id => usersDB.getUserByid(id)
)
  
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

app.set('view-engine', 'ejs')
 app.set('views', path.join(__dirname, 'webapp/views'));
app.use(express.urlencoded({ extended: false }))
app.use(flash())

app.use(session({
  store: new SQLiteStore,
  secret: "secretwsrhworhpwq",
  resave: false,
  saveUninitialized: false,
}))

app.use(passport.initialize())
app.use(passport.session({
  maxAge: 1000 * 60 * 60 * 24
}))
app.use(methodOverride('_method'))

//Authentication routes

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/game',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    if ((await usersDB.getUserByEmail(req.body.email)).length == 0){
      usersDB.createUser(req.body.name, req.body.email, hashedPassword)
      res.redirect('/login')
    }
    else {
      res.redirect('/register')
    }
  } catch {
    console.log('User already exist !')
  }
})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/')
})


// RabbiMQ & Celery (for the creation of a new game) 

async function Producer(req, res) {
  let client = celery.createClient(
    "amqp://guest:guest@rabbit:5672",
    "amqp://guest:guest@rabbit:5672",
    "celery"
  );

  let task = client.createTask("simple_example.create_match");
  let result = task.applyAsync();

  result.get().then(data => {
    putMatch(req, res, data)
    res.redirect('game')

    client.disconnect();
  })
  res.end(compiled({temp: temp}));
}

async function putMatch(req, res, data) {
  await usersDB.addMatch(req.session.passport.user, data)
  
}
// Other routes  

app.get('/', (req, res) => {
  res.sendFile(get_path("home.html"));
});
app.get('/game', checkAuthenticated, (req, res) => {
  res.render('index.ejs')
});
app.get('/rules', (req, res) => {
  res.sendFile(get_path("rules.html"));
});

app.get('/create', checkAuthenticated, (req, res) => {
  Producer(req, res);
  // res.redirect('game')
});

app.get('/getLogs', checkAuthenticated, (req, res) => {
  let formatForZIP = []
  
  fs.readdir('logsGames', (err, files) => {
    files.forEach(file => {
      formatForZIP.push({
        path: 'logsGames/'+file,
        name: file
      })
    });
    res.zip(formatForZIP)
  });
});

app.get('/getOrders', checkAuthenticated, (req, res) => {
    res.zip([{
      path: 'app/Data/database.db',
      name: 'database.db'
    }])
});

// Create all HTML routes
const files = fromDir(path.join(__dirname, "webapp/"),'.html');
files.forEach(file => {
  let route = file.split("/");
  route = route[route.length - 1];

  console.log("Open route:", route, file);
  app.get('/'+route, (req, res) => {
    res.sendFile(file);
  });
});


// Routes for databases

app
  .route("/db")
  .get(async (req, res) => {
    try {
      const data = await usersDB.getUserByid(req.session.passport.user);
      if (!data){
        res.status(404).send({"status": "error", "msg": "Error to get data retry"});
      }else{
        res.status(200).send({"msg": data[0].idMatches})
      }
    }
    catch(e) {
      res.send(e);
    }
  })
  .post( async (req,res) => {
    console.log(req.body)
    const {ballCoord, redCoords, blueCoords, score, actualPlayer, team, order} = req.body
    try {
    const data = ordersDB.insertData(req.session.passport.user, ballCoord, redCoords, blueCoords, score, actualPlayer, team, order)
      if (!data){
          res.status(404).send({"status": "error", "msg": "Error to put data retry"});
      }else
          res.status(201).send({"msg": "Data insert in orderDB"})
    }
    catch(e) {
      res.send(e);
    }
  })
  

app
  .route("/deleteGame/:id")
  .delete(async (req,res) => {
    const fileID = req.params.id
    try {
      const deleteGame = await usersDB.deleteGame(req.session.passport.user, fileID)
      if (deleteGame == 0){
          res.status(500).send({"status": "error", "msg": "The game was not delete"});
      }else{
        fs.unlink(`logsGames/${fileID}.txt`, function (err) {
        if (err){console.log(err)};
        // if no error, file has been deleted successfully
        console.log('File deleted!');
        res.status(200).send({"msg": "The game was deleted correctly"});;
      });}
    }
    catch (e) {
        res.status(500).send(e);
    }
  })
  

async function readTextFile(filename) {
  try {
    const data = fs.readFileSync(filename, 'utf8')
    return data
  } catch (err) {
    console.error(err)
  }
}


// Start the server

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App listening on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

