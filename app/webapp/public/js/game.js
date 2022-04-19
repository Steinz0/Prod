import * as settings from './settings.js'
import  {Player, Ball} from './classes.js'

let ball
let allPlayers = []
let blueTeam = []
let redTeam = []
let score = [0,0]
let play = false
let filename = 'file_data'

const Application = PIXI.Application;

const stadium = new Application({
	forceCanvas: true,
	width: 1200,
	height: 700,
	radius: 10,
	backgroundColor: 0xAAFFAA,
})

const graphics = new PIXI.Graphics();
graphics.lineStyle(15, 0xffd900, 1);
graphics.moveTo(0, 0);
graphics.lineTo(0, settings.FIELDHEIGTH);
graphics.lineTo(settings.FIELDWIDTH, settings.FIELDHEIGTH);
graphics.lineTo(settings.FIELDWIDTH, 0);
graphics.lineTo(0, 0);

// Center line
graphics.lineStyle(8, 0xffd900, 1);
graphics.moveTo(settings.FIELDWIDTH / 2, 0)
graphics.lineTo(settings.FIELDWIDTH / 2, settings.FIELDHEIGTH)

// Center circle
graphics.lineStyle(8, 0xffd900, 1);
graphics.drawCircle(settings.FIELDWIDTH / 2, settings.FIELDHEIGTH / 2, 100)

// Goal posts
graphics.lineStyle(20, 0x808080, 1);
graphics.moveTo(0, settings.FIELDHEIGTH / 2 - settings.GOALHEIGTH / 2)
graphics.lineTo(0, settings.FIELDHEIGTH / 2 + settings.GOALHEIGTH / 2)
graphics.moveTo(settings.FIELDWIDTH, settings.FIELDHEIGTH / 2 - settings.GOALHEIGTH / 2)
graphics.lineTo(settings.FIELDWIDTH, settings.FIELDHEIGTH / 2 + settings.GOALHEIGTH / 2)

stadium.stage.addChild(graphics);

// Adding to the window 
document.getElementById("mid-center").appendChild(stadium.view)

stadium.loader.baseUrl = '/public/img'
stadium.loader
	.add('blue', 'blueSquare.png')
	.add('red', 'redSquare.png')
	.add('ball', 'football.png')

stadium.loader.onProgress.add(show);
stadium.loader.onComplete.add(doneLoading);
stadium.loader.load();

const btn = document.getElementsByClassName("breplay")[0]; 
btn.addEventListener("click", onOffPlay);

const deleteB = document.getElementsByClassName("delete-button")[0]; 
deleteB.addEventListener("click", deleteGame);

const submit = document.getElementsByClassName("submit-button")[0]; 
submit.addEventListener("click", insertData);

const fileB = document.getElementsByClassName("file-button-show")[0]; 
fileB.addEventListener("click", setFilename);

const importantSnapshot = document.getElementsByClassName("button-important-snapshot")[0]; 
importantSnapshot.addEventListener("click", getimportantSnapshot);



function show(e) {
	console.log(e.progress)
}

function doneLoading() {
	createPlayer()
	ball = new Ball(settings.FIELDWIDTH / 2, settings.FIELDHEIGTH / 2, stadium.loader.resources['ball'].texture, 'ball')
	stadium.stage.addChild(ball)

	stadium.ticker.add(gameLoop)
	getDataMatches()
}

function createPlayer() {

	// Blue team creation
	let blueNames = ['Jeremy', 'Ethan']
	for (let i=0; i<settings.NUMBEROFPLAYERSBYTEAM; i++){
		// Player creation
		let player = new Player(blueNames[i], '1', 100 , 100 + (i*10), 'none', 'Blue', stadium.loader.resources['blue'].texture)

		allPlayers.push(player)
		blueTeam.push(player)
		// Adding the player to the stage
		stadium.stage.addChild(player)
		stadium.stage.addChild(player.directLine)
	}
	let redNames = ['Niko', 'Dan']
	// Red team creation
	for (let i=0; i<settings.NUMBEROFPLAYERSBYTEAM; i++){
		// Player creation
		let player = new Player(redNames[i], '1', 200 , 200 + (i*10), 'none', 'Red', stadium.loader.resources['red'].texture)

		allPlayers.push(player)
		redTeam.push(player)

		// Adding the player to the stage
		stadium.stage.addChild(player)
		stadium.stage.addChild(player.directLine)
	}
}

function gameLoop(delta) {
	if (play){
		playGameFile()
	}else{
		setSituation()
	}
	allPlayers.forEach(function (e, i) {
		drawLine(e.directLine, e.x, e.y, e.speed.x, e.speed.y)
	})
	drawLine(ball.directLine, ball.x, ball.y, ball.speed.x, ball.speed.y)
}

// Util functions
// Drawing a line using a PIXI.Graphics component, a position (x, y) and a direction (vectx, vecty)
function drawLine(obj, x, y, vectx, vecty) {
	obj.clear()
	obj.lineStyle(2, 0x000000);
    obj.moveTo(x,y);
    obj.lineTo(x + (vectx * 10), y + (vecty * 10));
}


function setFilename() {
	filename = document.querySelector('#fname').innerHTML
}
function setSituation() {
	let x = document.getElementsByClassName("slider").myRange.value
	document.getElementsByClassName("slider").myRange.disabled = false
	document.getElementsByClassName("breplay")[0].disabled = false
	let rawFile = new XMLHttpRequest()
    rawFile.open("GET", `logsGames/${filename}.txt`, false)
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                let allText = rawFile.responseText.split("\n")			
				let coords = allText.slice(1, allText.length)
				setValues(coords[x])
            }
        }
    }
    rawFile.send(null);
}

function onOffPlay() {

	const breplay = document.getElementById("breplay");

	if (play){
		play = false;
		breplay.innerText = "PLAY";
	}else{
		play = true;
		breplay.innerText = "PAUSE";
	}
}
function playGameFile() {
	if (parseInt(document.getElementsByClassName("slider").myRange.value) >= 2000){
		document.getElementsByClassName("slider").myRange.value = 0
	}
	document.getElementsByClassName("slider").myRange.value = parseInt(document.getElementsByClassName("slider").myRange.value) + 1
	setSituation()
}

function setValues(coords) {
	if (coords != undefined){
		let c = coords.split(" ")
		score = [c[0], c[1]]
		document.getElementById("redTeamScore").innerHTML = c[0]
		document.getElementById("blueTeamScore").innerHTML = c[1]

		let ball_c = c.slice(2, 6)
		let reds_c = c.slice(6, 6 + redTeam.length*4)
		let blues_c = c.slice(6 + redTeam.length*4, 6 + redTeam.length*4 + blueTeam.length*4)

		ball.position.x = ball_c[0]
		ball.position.y = ball_c[1]
		ball.speed.x = ball_c[2]
		ball.speed.y = ball_c[3]
		for (let i=0; i<redTeam.length; i++) {
			redTeam[i].position.x = reds_c[i*4]
			redTeam[i].position.y = reds_c[i*4+1]
			redTeam[i].speed.x = reds_c[i*4+2]
			redTeam[i].speed.y = reds_c[i*4+3]
		}
		for (let i=0; i<blueTeam.length; i++) {
			blueTeam[i].position.x = blues_c[i*4]
			blueTeam[i].position.y = blues_c[i*4+1]
			blueTeam[i].speed.x = blues_c[i*4+2]
			blueTeam[i].speed.y = blues_c[i*4+3]
		}
	}
}

async function getDataMatches(){
    await axios.get('http://localhost:3000/db')
    .then((data) => {

		let table = document.querySelector('#table'), rIndex;
		table.innerHTML = ''
		table.innerHTML += data.data.msg.map(item => `<tr> <td>${item}</td></tr>`).join('')

		  for (let i=0; i< table.rows.length; i++){
			table.rows[i].onclick = function() {
			rIndex = this.rowIndex;
			document.querySelector("#fname").innerHTML = this.cells[0].innerHTML;
			}
      	}
    })
    .catch((err) => {
      	console.log(err)
    })
}

async function deleteGame(){
	let fileID = document.querySelector("#fname").innerHTML
    await axios.delete('http://localhost:3000/deleteGame/'+fileID)
    .then((data) => {
        window.location.reload()
	})
    .catch((err) => {
      	console.log(err)
    })
}

async function insertData(userId){
	const ballCoord = [parseFloat(ball.position.x), parseFloat(ball.position.y)]
	const redCoords = []
	const blueCoords = []
	for (let i=0; i<redTeam.length; i++) {
		redCoords.push([parseFloat(redTeam[i].position.x), parseFloat(redTeam[i].position.y)])
		blueCoords.push([parseFloat(blueTeam[i].position.x), parseFloat(blueTeam[i].position.y)])
	}
	const actualPlayer = [parseFloat(document.querySelector('#x').innerHTML.split(' ')[2]), parseFloat(document.querySelector('#y').innerHTML.split(' ')[2])]
	const team = document.querySelector('#Team').innerHTML.split(' ')[2]
	const order = document.querySelector('#choose').value;

	const data = {
		userId: userId,
        ballCoord: ballCoord,
        redCoords: redCoords,
        blueCoords: blueCoords,
        score: [parseInt(score[0]), parseInt(score[1])],
        actualPlayer: actualPlayer,
		team: team,
        order: order
    }
	await axios.post('http://localhost:3000/db', data)
    .then((data) => {
      console.log(data)
    })
    .catch((err) => {
      console.log(err)
    })
}

function getimportantSnapshot(){
	let maxRange = parseInt(document.getElementsByClassName("slider").myRange.max)
	let randomValue = Math.floor(Math.random() * maxRange)
	console.log(randomValue)
	document.getElementsByClassName("slider").myRange.value = randomValue
}