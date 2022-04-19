import * as settings from './settings.js'

// Vector class
export class Vector2D {
	constructor(x=0,y=0, angle='none', norm='none') {
		if (angle != 'none' && norm != 'none'){
			this.x = Math.sin(angle) * norm
			this.y = Math.sin(angle) * norm
		} else {
			this.x = x
			this.y = y
		}
	}

	// Set function
	reset() {
		this.x = 0;
		this.y = 0;
	}

	norm() {
		return Math.sqrt(this.dot(this))
	}

	angle() {
		return Math.atan2(this.y,this.x)
	}

	dot(vector) {
		return this.x * vector.x + this.y * vector.y
	}

	distance(vector) {
		return Math.sqrt((this.x - vector.x)**2 + (this.y - vector.y)**2)
	}

	add(vector) {
		this.x += vector.x
		this.y += vector.y
	}

	sub(vector) {
		this.x -= vector.x
		this.y -= vector.y
	}

	returnMult(value) {
		return new Vector2D(this.x*value, this.y*value)
	}

	normalize(){
        let n = this.norm()
        if (n != 0){
			return this.returnMult(1./n)
		}

		return this
	}
}
// Player and Ball classes 
// Extend the Pixi.Sprite in order to use them on the window

// Player Class
export class Player extends PIXI.Sprite {
	constructor(fname, lname, initialX, initialY, action, team, img)  {
		// Informations
		super(img) // Sprite creation
		this.fname = fname // First name
		this.lname = lname // Last name
		this.team = team // Team ID (1 or 2)

		// Position
		this.initX = initialX // Initial X position (start of match, after resets)
		this.initY = initialY // Initial Y position (start of match, after resets)
		this.x = initialX // Actual X position (start of match, after resets)
		this.y = initialY // Actual Y position (in real time)
		this.anchor.set(0.5,0.5) //Set x y center of the sprite
		this.speed = new Vector2D() //Vector speed
		this.action = action // Player's order
		this.directLine = new PIXI.Graphics()

		// Utilitaries
		this.interactive = true
		this.buttonMode = true
		this.on('mousedown',clickPlayer)
	}

	// Reset function
	resetPos() {
		this.x = this.initX;
		this.y = this.initY;
		this.speed.reset()
	}

	// Creates the player's next action
	next(ball) {
		// MAJ Speed and Position
		this.speed.add(this.action.acceleration)
		this.x += this.speed.x	
		this.y += this.speed.y

		// Stay in Stadium
		if (this.x - this.width/2 < 0 || this.x + this.width/2 > settings.FIELDWIDTH
                || this.y - this.height/2< 0 || this.y + this.height/2 > settings.FIELDHEIGTH) {
			this.x = Math.max(this.width/2, Math.min(settings.FIELDWIDTH - this.width/2, this.x))
			this.y = Math.max(this.height/2, Math.min(settings.FIELDHEIGTH - this.height/2, this.y))
		}

		//If the player doesn't shoot, return a (0,0) shooting vector
		if (this.action.shoot.norm() == 0) {
			return new Vector2D()
		}

		//If the player doesn't touch the ball, return a (0,0) shooting vector
		if ((new Vector2D(this.x,this.y)).distance(new Vector2D(ball.x,ball.y)) > (settings.PLAYER_RADIUS + settings.BALL_RADIUS)){
            return new Vector2D()
		}
		return new Vector2D(this.speed.x, this.speed.y)
		//return this.rd_angle(this.action.shoot, (this.speed.angle() - this.action.shoot.angle())*(this.speed.norm()==0 ? 0 : 0), (new Vector2D(this.x,this.y)).distance(new Vector2D(ball.x,ball.y))/(PLAYER_RADIUS + BALL_RADIUS))
	}

	rd_angle(shoot,dangle,dist) {
		dangle = Math.abs((dangle+Math.PI*2) % (Math.PI*2) - Math.PI)
		let dangle_factor = this.eliss(1.-Math.max(dangle-Math.PI/2.0)/Math.PI/2.0,5)
		let norm_factor = this.eliss(shoot.norm()/maxPlayerShoot,4)
		let dist_fact = this.eliss(dist,10)
		let angle_prc = (1-(1.-dangle_factor)*(1.-norm_factor)*(1.-0.5*dist_fact))*shootRandomAngle*Math.PI/2.
		let norm_prc = 1-0.3*dist_fact*dangle_factor

		return new Vector2D(undefined, undefined, shoot.angle()+2*(Math.random()-.5)*angle_prc, shoot.norm()*norm_prc)
	}

	eliss(x,alpha) {
		return (Math.exp(alpha*x)-1)/(Math.exp(alpha)-1)
	}

}

// Ball class
export class Ball extends PIXI.Sprite {
	constructor(initX, initY, img, name) {
		super(img)
		this.name = name // nitial X position (start of match, after resets)
		this.initX = initX // nitial X position (start of match, after resets)
		this.initY = initY // The player initial X position (start of match, after resets)
		this.x = initX // The player initial X position (start of match, after resets)
		this.y = initY // The player initial X position (start of match, after resets)
		this.anchor.set(0.5,0.5) //Set x y center of the sprite
		this.speed = new Vector2D() //Vector speed
		this.acceleration = new Vector2D() //Vector acceleration
		this.directLine = new PIXI.Graphics() // The ball's direction vector on-screen
		// inPossesion : Refers to the team in possesion of the ball
		// 0 - No team is in possesion (at start of match and resets)
		// 1 - Blue team
		// 2 - Red team
		this.inPossesion = 0 
	}

	// Creates the ball's new movement
	next(sum_shoots) {
		let speed_tmp = new Vector2D()
		// Stay in Stadium
		if (this.x < 0 || this.x > settings.FIELDWIDTH
			|| this.y < 0 || this.y > settings.FIELDHEIGTH){
			this.x = Math.max(0, Math.min(settings.FIELDWIDTH, this.x))
			this.y = Math.max(0, Math.min(settings.FIELDHEIGTH, this.y))
			this.speed = new Vector2D()
		}
		
		if (sum_shoots.norm() > 0) {
			let u_s = sum_shoots.normalize()
			let u_t = new Vector2D(-u_s.y, u_s.x)
			let speed_abs = Math.abs(this.speed.dot(u_s))
            let speed_ortho = this.speed.dot(u_t)
			speed_tmp = new Vector2D(speed_abs * u_s.x - speed_ortho * u_s.y, speed_abs * u_s.y + speed_ortho * u_s.x)
			speed_tmp.add(sum_shoots)
		}

		if (this.x < 0 || this.x + this.width > settings.FIELDWIDTH
			|| this.y < 0 || this.y + this.height > settings.FIELDHEIGTH){
			this.x = Math.max(0, Math.min(settings.FIELDWIDTH - this.width, this.x))
			this.y = Math.max(0, Math.min(settings.FIELDHEIGTH - this.height, this.y))
			this.speed = new Vector2D()
		}
		this.acceleration = speed_tmp
		this.speed.add(this.acceleration)
		this.x += this.speed.x
		this.y += this.speed.y
	}

	// Function returning if the ball is inside a goal
	insideGoal() {
		return (this.x < 0 || this.x > settings.FIELDWIDTH) && (Math.abs(this.y - settings.FIELDHEIGTH / 2) < settings.GOALHEIGTH);
	}

	// Reset the ball's position
	resetPos() {
		this.x = this.initX;
		this.y = this.initY;
		this.acceleration
	}
}

// Team class
export class Team {
	constructor(id, name, capacity) {
		this.id = id // The team's ID (1 or 2)
		this.name = name // The team's name
		this.capacity = capacity // The number of players allowed in the team
		this.players = new Array() // List of players
	}

	// Function used to add a player to a team
	addPlayer(player) {
		if (this.players.length < this.capacity) {
			this.players.push(player)
			//this.capacity += 1
			console.log("The player has been succesfully added to the team.")
		}
		else {
			console.log("The player could not be added. Max capacity reached.")
		}
	}

	// Fonction used to remove a player from a team
	removePlayer(index) {
		if (index > this.players.length - 1) {
			this.players.splice(index, 1)
			console.log("The player has been succesfully removed from the team.")
		}
		else {
			console.log("No match for index in players. No player was removed.")
		}
	}

	// Reset the players' positions
	resetPos() {
		for (let i = 0; i < this.players.length; i++) {
			this.players[i].resetPos()
		}
	}
}


// SoccerAction represents 2 vectors => acceleration and shoot 
// We give for a player a SoccerAction each time it's his next move
export class SoccerAction {
	constructor(acceleration= 'none', shoot = 'none', name = 'none') {
		this.acceleration = acceleration
		this.shoot = shoot
		this.name = name
	}

	set_name(name) {
		this.name = name
	}

	eq(action2) {
		return (action2.acceleration.x == this.acceleration.x) && (action2.shoot.x == this.shoot.x) && (action2.acceleration.y == this.acceleration.y) && (action2.shoot.y == this.shoot.y)
	}

	add(action2) {
		this.acceleration.add(action2.acceleration)
		this.shoot.add(action2.shoot)
	}

	sub(action2) {
		this.acceleration.add(action2.acceleration)
		this.shoot.add(action2.shoot)
	}

	str() {
		return 'Acceleration =>  x : ' + this.acceleration.x + ' y : ' + this.acceleration.y + 'Shoot =>  x : ' + this.shoot.x + ' y : ' + this.shoot.y
	}
}

function clickPlayer() {
    document.getElementById('form-order').style.visibility = "visible";
    document.getElementById('name').innerHTML = "Name : " + this.fname
    document.getElementById('Team').innerHTML = "Team : " + this.team
    document.getElementById('x').innerHTML = "X : " + this.x
    document.getElementById('y').innerHTML = "Y : " + this.y
}